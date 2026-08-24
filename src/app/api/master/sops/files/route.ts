import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, canManageSop, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteSopFileUrls,
  MAX_SOP_FILES,
  saveSopFiles,
} from "@/lib/sop-files";
import {
  appendSopAttachments,
  getSop,
  removeSopAttachment,
  replaceSopAttachment,
} from "@/lib/sop-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireSop(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canAccessSop(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireSop(req);
    if ("error" in gate && gate.error) return gate.error;

    const form = await req.formData();
    const sopId = String(form.get("sopId") || "");
    const removeUrl = form.get("removeUrl");
    const replaceUrl = form.get("replaceUrl");
    if (!sopId) {
      return NextResponse.json({ error: "sopId wajib" }, { status: 400 });
    }

    const existing = getSop(sopId);
    if (!existing) {
      return NextResponse.json({ error: "SOP tidak ditemukan" }, { status: 404 });
    }
    if (!canManageSop(gate.user, existing.departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof removeUrl === "string" && removeUrl) {
      const result = removeSopAttachment(sopId, removeUrl);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deleteSopFileUrls([removeUrl]);
      return NextResponse.json({ sop: result });
    }

    const files = form.getAll("files").filter((f): f is File => {
      return (
        typeof f === "object" &&
        f !== null &&
        "arrayBuffer" in f &&
        typeof (f as File).arrayBuffer === "function" &&
        Number((f as File).size) > 0
      );
    });
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada file yang diunggah" },
        { status: 400 },
      );
    }

    // Ganti file: unggah baru dulu, lalu ganti di DB, hapus file lama di disk
    if (typeof replaceUrl === "string" && replaceUrl) {
      if (files.length !== 1) {
        return NextResponse.json(
          { error: "Ganti file hanya untuk 1 file sekaligus" },
          { status: 400 },
        );
      }
      const saved = await saveSopFiles(sopId, files);
      if (saved.error) {
        deleteSopFileUrls(saved.attachments.map((a) => a.url));
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      const result = replaceSopAttachment(
        sopId,
        replaceUrl,
        saved.attachments,
        MAX_SOP_FILES,
      );
      if ("error" in result) {
        deleteSopFileUrls(saved.attachments.map((a) => a.url));
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deleteSopFileUrls([replaceUrl]);
      return NextResponse.json({ sop: result });
    }

    if (existing.attachments.length + files.length > MAX_SOP_FILES) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_SOP_FILES} lampiran (sudah ${existing.attachments.length})`,
        },
        { status: 400 },
      );
    }

    const saved = await saveSopFiles(sopId, files);
    if (saved.error) {
      deleteSopFileUrls(saved.attachments.map((a) => a.url));
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const result = appendSopAttachments(sopId, saved.attachments, MAX_SOP_FILES);
    if ("error" in result) {
      deleteSopFileUrls(saved.attachments.map((a) => a.url));
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ sop: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunggah file SOP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
