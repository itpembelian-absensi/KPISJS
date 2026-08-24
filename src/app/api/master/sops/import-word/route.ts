import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, canManageSop, SESSION_COOKIE } from "@/lib/auth";
import { MAX_SOP_FILE_BYTES } from "@/lib/sop-files";
import { importSopsFromWord } from "@/lib/sop-word-import";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessSop(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const departmentId = String(form.get("departmentId") || "").trim();
    if (!departmentId) {
      return NextResponse.json(
        { error: "Pilih departemen dulu sebelum impor Word" },
        { status: 400 },
      );
    }
    if (!canManageSop(user, departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const preview = String(form.get("preview") || "") === "1";
    const file = form.get("file");
    if (
      !file ||
      typeof file !== "object" ||
      !("arrayBuffer" in file) ||
      typeof (file as File).arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { error: "File Word (.docx) wajib diunggah" },
        { status: 400 },
      );
    }
    const word = file as File;
    const name = (word.name || "").toLowerCase();
    const mime = word.type || "";
    if (!name.endsWith(".docx") && mime !== DOCX) {
      return NextResponse.json(
        {
          error:
            "Unggah file .docx (Word modern). File .doc lama: buka di Word lalu Simpan sebagai .docx.",
        },
        { status: 400 },
      );
    }
    if (word.size > MAX_SOP_FILE_BYTES) {
      return NextResponse.json(
        { error: `File terlalu besar (max ${MAX_SOP_FILE_BYTES / (1024 * 1024)}MB)` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await word.arrayBuffer());
    const result = await importSopsFromWord({
      buffer,
      filename: word.name || "master-sop.docx",
      departmentId,
      createdBy: user.id,
      preview,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (result.preview) {
      return NextResponse.json({
        preview: true,
        count: result.drafts.length,
        drafts: result.drafts.map((d) => ({
          code: d.code,
          title: d.title,
          purpose: d.purpose.slice(0, 220),
          steps: d.steps.length,
        })),
        warnings: result.warnings,
      });
    }
    return NextResponse.json({
      preview: false,
      created: result.created,
      updated: result.updated,
      count: result.sops.length,
      sops: result.sops,
      warnings: result.warnings,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengimpor Word SOP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
