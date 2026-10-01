import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, canSeePengajuan, SESSION_COOKIE } from "@/lib/auth";
import { getPengajuanType } from "@/lib/pengajuan";
import { appendPengajuanPhotos, getPengajuan } from "@/lib/pengajuan-ops";
import {
  deletePengajuanPhotoFiles,
  MAX_PENGAJUAN_PHOTOS,
  savePengajuanPhotoFiles,
} from "@/lib/pengajuan-photos";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const pengajuanId = String(form.get("pengajuanId") || "");
    if (!pengajuanId) {
      return NextResponse.json({ error: "pengajuanId wajib" }, { status: 400 });
    }

    const existing = getPengajuan(pengajuanId);
    if (!existing) {
      return NextResponse.json(
        { error: "Pengajuan tidak ditemukan" },
        { status: 404 },
      );
    }

    const def = getPengajuanType(existing.type);
    if (!def?.photos || !canAccessMenu(user, def.href)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canSeePengajuan(user, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = form.getAll("photos").filter((f): f is File => {
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
        { error: "Tidak ada foto yang diunggah" },
        { status: 400 },
      );
    }
    if (existing.photoUrls.length + files.length > MAX_PENGAJUAN_PHOTOS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_PENGAJUAN_PHOTOS} foto (sudah ${existing.photoUrls.length})`,
        },
        { status: 400 },
      );
    }

    const saved = await savePengajuanPhotoFiles(existing.id, files);
    if (saved.error) {
      deletePengajuanPhotoFiles(saved.urls);
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const result = appendPengajuanPhotos(
      existing.id,
      saved.urls,
      MAX_PENGAJUAN_PHOTOS,
    );
    if ("error" in result) {
      deletePengajuanPhotoFiles(saved.urls);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ pengajuan: result.pengajuan });
  } catch {
    return NextResponse.json({ error: "Gagal unggah foto" }, { status: 500 });
  }
}
