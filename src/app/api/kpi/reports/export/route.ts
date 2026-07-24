import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  buildKpiReport,
  kpiByAgentSheetRows,
  kpiSummarySheetRows,
  listRepeatTickets,
  repeatIssueSheetRows,
} from "@/lib/reports";
import { getUserBySessionToken, listTickets } from "@/lib/store";

export const runtime = "nodejs";

function requireReportUser(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!["admin", "manager", "it_staff"].includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireReportUser(req);
  if ("error" in gate && gate.error) return gate.error;

  const type = req.nextUrl.searchParams.get("type") || "kpi";
  const period = req.nextUrl.searchParams.get("period") || "all";
  const departmentId = req.nextUrl.searchParams.get("departmentId") || "all";
  const periodYm = period === "all" ? "all" : period;
  const deptKey = departmentId === "all" ? "all" : departmentId;

  const wb = XLSX.utils.book_new();
  let filename = "laporan.xlsx";

  if (type === "repeat") {
    const repeats = listRepeatTickets(periodYm, deptKey);
    const sheet = XLSX.utils.aoa_to_sheet(
      repeatIssueSheetRows(repeats, listTickets()),
    );
    XLSX.utils.book_append_sheet(wb, sheet, "Repeat Issue");
    filename =
      periodYm === "all"
        ? `laporan-repeat-issue-${deptKey}.xlsx`
        : `laporan-repeat-issue-${periodYm}-${deptKey}.xlsx`;
  } else {
    const bundle = buildKpiReport(periodYm, deptKey);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(kpiSummarySheetRows(bundle)),
      "Ringkasan KPI",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(kpiByAgentSheetRows(bundle)),
      "Per Handler",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(
        repeatIssueSheetRows(bundle.repeatTickets, listTickets()),
      ),
      "Repeat Issue",
    );
    filename =
      periodYm === "all"
        ? `laporan-kpi-${deptKey}.xlsx`
        : `laporan-kpi-${periodYm}-${deptKey}.xlsx`;
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
