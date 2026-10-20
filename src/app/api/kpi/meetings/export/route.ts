import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getCompanyName } from "@/lib/branding";
import { listMeetingNotes } from "@/lib/meeting-ops";
import { buildMeetingReportPdf } from "@/lib/meeting-report-pdf";
import {
  buildMeetingReport,
  meetingReportSheetRows,
  type MeetingReportStatus,
} from "@/lib/meeting-report";
import { getUserBySessionToken, listDepartments } from "@/lib/store";

export const runtime = "nodejs";

const STATUSES = new Set<MeetingReportStatus>([
  "all",
  "open",
  "in_progress",
  "overdue",
  "done",
]);

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/meetings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";
  let departmentId = req.nextUrl.searchParams.get("departmentId") || "all";
  const rawStatus = req.nextUrl.searchParams.get("status") || "all";
  const status: MeetingReportStatus = STATUSES.has(rawStatus as MeetingReportStatus)
    ? (rawStatus as MeetingReportStatus)
    : "all";
  const query = (req.nextUrl.searchParams.get("q") || "").slice(0, 200);
  const scope = getEffectiveDepartmentScope(user);

  if (scope !== "all") {
    if (scope.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (departmentId !== "all" && !scope.includes(departmentId)) {
      return NextResponse.json(
        { error: "Departemen di luar akses Anda" },
        { status: 403 },
      );
    }
  }

  const meetings = listMeetingNotes(scope === "all" ? undefined : scope);
  const departments = listDepartments(true);
  const report = buildMeetingReport(meetings, departments, {
    from,
    to,
    departmentId,
    status,
    query,
  });

  const fromKey = from.slice(0, 10) || "awal";
  const toKey = to.slice(0, 10) || "akhir";
  const deptKey = departmentId === "all" ? "semua" : departmentId.slice(0, 12);

  if (format === "pdf") {
    const buffer = await buildMeetingReportPdf({
      report,
      companyName: getCompanyName() || "PT SAHABAT JAYA SUKSES",
      generatedAt: new Date().toLocaleString("id-ID"),
    });
    const filename = `laporan-meeting-notulen-${fromKey}-${toKey}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const sheets = meetingReportSheetRows(report);
  const wb = XLSX.utils.book_new();
  const noteSheet = XLSX.utils.aoa_to_sheet(sheets.notes);
  noteSheet["!cols"] = [
    { wch: 16 },
    { wch: 10 },
    { wch: 36 },
    { wch: 22 },
    { wch: 36 },
    { wch: 24 },
    { wch: 48 },
    { wch: 16 },
    { wch: 22 },
  ];
  const itemSheet = XLSX.utils.aoa_to_sheet(sheets.items);
  itemSheet["!cols"] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 22 },
    { wch: 36 },
    { wch: 42 },
    { wch: 42 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, noteSheet, "Notulen");
  XLSX.utils.book_append_sheet(wb, itemSheet, "Bahasan");

  const filename = `laporan-meeting-notulen-${fromKey}-${toKey}-${deptKey}.xlsx`;
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
