import { NextRequest, NextResponse } from "next/server";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import { deliverMeetingReminders } from "@/lib/meeting-wa-send";
import type { ReminderRow } from "@/lib/meeting-wa";
import { listMeetingNotes } from "@/lib/meeting-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/meetings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const itemIds = Array.isArray(body?.itemIds)
    ? [...new Set(body.itemIds.map((id: unknown) => String(id)).filter(Boolean))]
    : [];
  if (itemIds.length === 0) {
    return NextResponse.json({ error: "Tidak ada bahasan yang dipilih." }, { status: 400 });
  }
  if (itemIds.length > 100) {
    return NextResponse.json(
      { error: "Terlalu banyak bahasan sekaligus. Batas 100." },
      { status: 400 },
    );
  }

  const scope = getEffectiveDepartmentScope(user);
  const meetings = listMeetingNotes(scope === "all" ? undefined : scope);
  const wanted = new Set(itemIds);
  const rows: ReminderRow[] = [];
  for (const meeting of meetings) {
    for (const item of meeting.items) {
      if (wanted.has(item.id)) rows.push({ item, meeting });
    }
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "Bahasan tidak ditemukan." }, { status: 404 });
  }

  const delivery = await deliverMeetingReminders(rows);
  return NextResponse.json(delivery);
}
