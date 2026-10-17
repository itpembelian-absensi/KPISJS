import { NextRequest, NextResponse } from "next/server";
import { canViewKpi, SESSION_COOKIE } from "@/lib/auth";
import {
  listAttendancePeriods,
  listAttendanceRecords,
  listAttendanceSummaries,
  summarizeDisciplineByRange,
} from "@/lib/attendance-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewKpi(user.role) && user.role !== "admin" && user.role !== "it_staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  const periodLabel =
    req.nextUrl.searchParams.get("periodLabel") || undefined;
  const staffId = req.nextUrl.searchParams.get("staffId") || undefined;
  const detail = req.nextUrl.searchParams.get("detail") === "1";
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";

  if (from && to) {
    if (from > to) {
      return NextResponse.json(
        { error: "Tanggal awal tidak boleh setelah tanggal akhir." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      periods: listAttendancePeriods(),
      summaries: summarizeDisciplineByRange({ departmentId, from, to }),
      records: [],
      range: { from: from.slice(0, 10), to: to.slice(0, 10) },
    });
  }

  return NextResponse.json({
    periods: listAttendancePeriods(),
    summaries: listAttendanceSummaries({ departmentId, periodLabel }),
    records: detail
      ? listAttendanceRecords({ staffId, periodLabel, limit: 200 })
      : [],
  });
}
