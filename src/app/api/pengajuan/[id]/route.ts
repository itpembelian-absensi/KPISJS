import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, SESSION_COOKIE } from "@/lib/auth";
import { canSeePengajuanItem } from "@/lib/pengajuan-approval-view";
import { getPengajuanType } from "@/lib/pengajuan";
import {
  getPengajuan,
  reviewPengajuan,
  unapprovePengajuan,
} from "@/lib/pengajuan-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const current = getPengajuan(id);
  if (!current) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  const def = getPengajuanType(current.type);
  if (
    !def ||
    !canAccessMenu(user, def.href) ||
    !canSeePengajuanItem(user, current)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  if (action === "done") {
    return NextResponse.json(
      { error: "Aksi tidak berlaku. Pengajuan berakhir pada persetujuan terakhir." },
      { status: 400 },
    );
  }
  if (action === "unapprove") {
    const result = unapprovePengajuan({
      id: current.id,
      actorUserId: user.id,
      actorRole: user.role,
      actorStaffId: user.staffId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ pengajuan: result.pengajuan });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  const result = reviewPengajuan({
    id: current.id,
    action,
    actorUserId: user.id,
    actorName: user.name || user.username,
    actorRole: user.role,
    actorStaffId: user.staffId,
    note: String(body?.note || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ pengajuan: result.pengajuan });
}
