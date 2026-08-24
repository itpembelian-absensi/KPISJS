import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const CONVERT_TIMEOUT_MS = 90_000;

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Konversi Word ke PDF melebihi waktu"));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

function findSoffice(): string | null {
  const candidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/usr/bin/libreoffice",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function convertWithWord(src: string, dst: string) {
  const script = path.join(os.tmpdir(), `sop-docx2pdf-${randomUUID()}.ps1`);
  fs.writeFileSync(
    script,
    [
      "$ErrorActionPreference = 'Stop'",
      "$src = $args[0]",
      "$dst = $args[1]",
      "$word = $null",
      "$doc = $null",
      "$missing = [Type]::Missing",
      "try {",
      "  $word = New-Object -ComObject Word.Application",
      "  $word.Visible = $false",
      "  $word.DisplayAlerts = 0",
      "  $word.AutomationSecurity = 3",
      "  $doc = $word.Documents.Open($src, $false, $true, $false, $missing, $missing, $true)",
      "  try { $doc.ExportAsFixedFormat($dst, 17) } catch { $doc.SaveAs2($dst, 17) }",
      "} finally {",
      "  if ($null -ne $doc) { try { $doc.Close($false) } catch {} }",
      "  if ($null -ne $word) { try { $word.Quit() } catch {} }",
      "  [GC]::Collect()",
      "  [GC]::WaitForPendingFinalizers()",
      "}",
    ].join("\r\n"),
    "utf8",
  );
  try {
    const { code, stderr } = await runCommand(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        src,
        dst,
      ],
      CONVERT_TIMEOUT_MS,
    );
    if (code !== 0 || !fs.existsSync(dst) || fs.statSync(dst).size < 80) {
      throw new Error(stderr.trim() || `Word gagal membuat PDF (kode ${code})`);
    }
  } finally {
    try {
      fs.unlinkSync(script);
    } catch {
      /* ignore */
    }
  }
}

async function convertWithLibreOffice(src: string, dst: string) {
  const soffice = findSoffice();
  if (!soffice) {
    throw new Error("LibreOffice tidak ditemukan");
  }
  const outDir = path.dirname(dst);
  const { code, stderr } = await runCommand(
    soffice,
    [
      "--headless",
      "--norestore",
      "--nolockcheck",
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      src,
    ],
    CONVERT_TIMEOUT_MS,
  );
  const produced = path.join(outDir, `${path.parse(src).name}.pdf`);
  if (code !== 0 || !fs.existsSync(produced) || fs.statSync(produced).size < 80) {
    throw new Error(stderr.trim() || `LibreOffice gagal membuat PDF (kode ${code})`);
  }
  if (produced !== dst) {
    fs.renameSync(produced, dst);
  }
}

/**
 * Konversi .docx → PDF dengan layout Word asli (Microsoft Word / LibreOffice).
 */
export async function convertDocxToPdf(docx: Buffer): Promise<Buffer> {
  return enqueue(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sop-docx2pdf-"));
    const src = path.join(dir, "source.docx");
    const dst = path.join(dir, "source.pdf");
    fs.writeFileSync(src, docx);
    try {
      const errors: string[] = [];
      if (process.platform === "win32") {
        try {
          await convertWithWord(src, dst);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
      if (!fs.existsSync(dst) || fs.statSync(dst).size < 80) {
        try {
          await convertWithLibreOffice(src, dst);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
      if (!fs.existsSync(dst) || fs.statSync(dst).size < 80) {
        throw new Error(
          errors.filter(Boolean).join(" | ") ||
            "Tidak bisa membuat PDF dari Word. Install Microsoft Word atau LibreOffice di server.",
        );
      }
      return fs.readFileSync(dst);
    } finally {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });
}
