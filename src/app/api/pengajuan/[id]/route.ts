import { NextRequest, NextResponse } from "next/server";
import {
  canAccessMenu,
  canCompletePengajuan,
  canReviewPengajuan,
  canSeePengajuan,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getPengajuanType } from "@/lib/pengajuan";
import { getPengajuan, reviewPengajuan } from "@/lib/pengajuan-ops";
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
  if (!def || !canAccessMenu(user, def.href) || !canSeePengajuan(user, current)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  if (action !== "approve" && action !== "reject" && action !== "done") {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }
  if (
    (action === "approve" || action === "reject") &&
    !canReviewPengajuan(user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (action === "done" && !canCompletePengajuan(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = reviewPengajuan({
    id: current.id,
    action,
    actorName: user.name || user.username,
    actorStaffId: user.staffId,
    allowSelfReview: user.role === "admin",
    note: String(body?.note || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ pengajuan: result.pengajuan });
}
