/**
 * Import hasil pecahan Master SOP PDF ke database SOP IT.
 * Prasyarat: py scripts/split-master-sop-pdf.py sudah dijalankan.
 *
 * npx tsx scripts/import-split-sops.ts
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";
import { listSops, upsertSop, appendSopAttachments } from "../src/lib/sop-ops";
import {
  deleteSopFileUrls,
  ensureSopUploadDir,
  publicUrlForSopFile,
} from "../src/lib/sop-files";
import type { SopAttachment, SopStep } from "../src/lib/types";

const SPLIT_DIR = path.join("d:\\KPI\\SOP IT\\_split");
const MASTER_PDF =
  "d:\\KPI\\SOP IT\\Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (3).pdf";
const MANIFEST = path.join(SPLIT_DIR, "manifest.json");

type ManifestItem = {
  code: string;
  title: string;
  pemilik: string;
  purpose: string;
  materials: string;
  qualifications: string;
  steps: SopStep[];
  notes: string;
  pdf: string;
  missingFromPdf?: boolean;
};

async function buildPdfFromText(
  outPath: string,
  title: string,
  code: string,
  text: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.font("Helvetica-Bold").fontSize(12).text("PT SAHABAT JAYA SUKSES");
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Kode: ${code}`);
    doc.text("STANDARD OPERATING PROCEDURE — Draft (rekonstruksi)");
    doc.moveDown(0.5);
    doc.fontSize(11).text(title, { underline: true });
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666")
      .text(
        "Catatan: SOP ini tidak ditemukan pada isi PDF rev(3) (lompat 003→005). Teks disusun ulang dari Word rev(2) / daftar induk.",
      );
    doc.fillColor("#000").moveDown(0.5);
    const body = text.replace(/\r/g, "").slice(0, 12000);
    doc.font("Helvetica").fontSize(9).text(body, { align: "left" });
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}

function copyAttachment(sopId: string, srcFile: string, originalName: string) {
  const dir = ensureSopUploadDir(sopId);
  const ext = path.extname(srcFile) || ".pdf";
  const filename = `${randomUUID()}${ext}`;
  fs.copyFileSync(srcFile, path.join(dir, filename));
  const att: SopAttachment = {
    label: originalName,
    url: publicUrlForSopFile(sopId, filename),
    originalName,
    mimeType: "application/pdf",
    kind: "file",
  };
  return att;
}

async function ensurePdf(item: ManifestItem): Promise<string> {
  if (item.pdf && fs.existsSync(item.pdf) && fs.statSync(item.pdf).size > 1000) {
    return item.pdf;
  }
  const txt = path.join(SPLIT_DIR, `IT-SOP-2026-${item.code.slice(-3)}.txt`);
  const out = path.join(SPLIT_DIR, `IT-SOP-2026-${item.code.slice(-3)}.pdf`);
  const text = fs.existsSync(txt)
    ? fs.readFileSync(txt, "utf8")
    : `${item.title}\n\n${item.purpose}\n\n${item.notes}`;
  await buildPdfFromText(out, item.title, item.code, text);
  return out;
}

async function importOne(item: ManifestItem) {
  const existing = listSops().find(
    (s) => s.code.toLowerCase() === item.code.toLowerCase(),
  );
  const oldUrls =
    existing?.attachments
      .filter((a) => a.kind === "file" || a.url.startsWith("/uploads/sops/"))
      .map((a) => a.url) ?? [];

  const result = upsertSop({
    id: existing?.id,
    departmentId: existing?.departmentId || "dep-it",
    code: item.code,
    title: item.title,
    divisionLabel: "DIVISI IT",
    documentType: "STANDARD OPERATING PROCEDURE",
    effectiveDate: "",
    revision: "00 – Draft Internal",
    revisionDate: "2026-08-11",
    purpose: item.purpose,
    materials: item.materials,
    qualifications: item.qualifications,
    notes: item.notes,
    steps: item.steps,
    attachments: [],
    active: false,
  });
  if ("error" in result) {
    throw new Error(`${item.code}: ${result.error}`);
  }

  if (oldUrls.length) deleteSopFileUrls(oldUrls);

  const pdfPath = await ensurePdf(item);
  const originalName = `${item.code.replace(/\//g, "-")} – ${item.title.slice(0, 80)}.pdf`;
  const att = copyAttachment(result.id, pdfPath, originalName);
  const withFile = appendSopAttachments(result.id, [att]);
  if ("error" in withFile) {
    throw new Error(`${item.code} attach: ${withFile.error}`);
  }
  return withFile;
}

async function updateMaster() {
  const code = "IT-SOP/2026/MASTER";
  const existing = listSops().find(
    (s) => s.code.toLowerCase() === code.toLowerCase(),
  );
  const oldUrls =
    existing?.attachments
      .filter((a) => a.kind === "file" || a.url.startsWith("/uploads/sops/"))
      .map((a) => a.url) ?? [];

  const result = upsertSop({
    id: existing?.id,
    departmentId: existing?.departmentId || "dep-it",
    code,
    title:
      "Master SOP Information Technology – PT Sahabat Jaya Sukses (DRAFT)",
    divisionLabel: "DIVISI IT",
    documentType: "MASTER STANDARD OPERATING PROCEDURE",
    effectiveDate: "",
    revision: "00 – Draft Internal (rev 3 PDF)",
    revisionDate: "2026-08-11",
    purpose:
      "Dokumen induk 27 SOP Divisi IT. Dipecah ke entri IT-SOP/2026/001–027 (Draft). File PDF master lengkap terlampir.",
    materials: "PDF Master rev(3); pecahan per SOP di menu SOP IT.",
    qualifications: "IT Manager / Management Representative",
    notes:
      "STATUS DRAFT. SOP 004 tidak ada di body PDF rev(3) — dipulihkan dari Word. Jangan aktifkan sebelum pengesahan.",
    steps: [
      {
        order: 1,
        title: "Review & koreksi",
        body: "Perbaiki P0 (judul/keputusan) lalu revisi master.",
      },
      {
        order: 2,
        title: "Pengesahan",
        body: "Tanda tangan lintas divisi + Direksi.",
      },
      {
        order: 3,
        title: "Aktivasi",
        body: "Aktifkan 001–027 di sistem setelah disahkan.",
      },
    ],
    attachments: [],
    active: false,
  });
  if ("error" in result) throw new Error(result.error);
  if (oldUrls.length) deleteSopFileUrls(oldUrls);
  if (!fs.existsSync(MASTER_PDF)) {
    console.warn("Master PDF tidak ditemukan, skip lampiran master");
    return result;
  }
  const att = copyAttachment(
    result.id,
    MASTER_PDF,
    "Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (3).pdf",
  );
  return appendSopAttachments(result.id, [att]);
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error("manifest.json belum ada. Jalankan split-master-sop-pdf.py dulu.");
    process.exit(1);
  }
  const items = JSON.parse(
    fs.readFileSync(MANIFEST, "utf8"),
  ) as ManifestItem[];

  console.log(`Import ${items.length} SOP...`);
  let ok = 0;
  for (const item of items) {
    const sop = await importOne(item);
    console.log(
      `  OK ${sop.code} | ${sop.title.slice(0, 60)} | file=${sop.attachments.length} | active=${sop.active}`,
    );
    ok++;
  }
  const master = await updateMaster();
  if (master && !("error" in master)) {
    console.log(`  OK MASTER | attachments=${master.attachments.length}`);
  }
  console.log(`Selesai: ${ok}/${items.length} SOP + MASTER (semua Draft/Off).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
