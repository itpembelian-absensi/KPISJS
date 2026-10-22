import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  deliverMeetingReminders,
  deliverySummary,
  openReminderRows,
} from "@/lib/meeting-wa-send";
import { getUserBySessionToken } from "@/lib/store";
import {
  getWaScheduleView,
  recordWaScheduleRun,
  saveWaSchedule,
  type WaScheduleScope,
} from "@/lib/wa-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageMaster(user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

function readScope(value: unknown, fallback: WaScheduleScope): WaScheduleScope {
  if (value === "overdue" || value === "open") return value;
  return fallback;
}

export async function GET(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  return NextResponse.json(getWaScheduleView());
}

export async function POST(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (body.action === "send-now") {
    const current = getWaScheduleView();
    const scope = readScope(body.scope, current.scope);
    const rows = openReminderRows(scope);
    const delivery =
      rows.length === 0
        ? { sent: [], failed: [], skipped: [] }
        : await deliverMeetingReminders(rows);
    const summary = deliverySummary(delivery, rows.length === 0);
    const lastRun = recordWaScheduleRun({
      source: "manual",
      summary,
      sent: delivery.sent.length,
      failed: delivery.failed.length,
      skipped: delivery.skipped.length,
    });
    return NextResponse.json({ ...delivery, summary, lastRun, scope });
  }

  const saved = saveWaSchedule({
    enabled: body.enabled === true,
    time: String(body.time || ""),
    days: Array.isArray(body.days) ? body.days.map((day: unknown) => Number(day)) : [],
    scope: String(body.scope || "open"),
  });
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }
  return NextResponse.json(getWaScheduleView());
}
