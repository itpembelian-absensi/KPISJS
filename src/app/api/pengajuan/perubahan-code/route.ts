import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, SESSION_COOKIE } from "@/lib/auth";
import { previewPerubahanNumber } from "@/lib/jenis-data-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/pengajuan/perubahan")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jenis = req.nextUrl.searchParams.get("jenis")?.trim() ?? "";
  if (!jenis) return NextResponse.json({ code: "" });

  try {
    return NextResponse.json({ code: previewPerubahanNumber(jenis) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nomor perubahan tidak bisa dibuat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
