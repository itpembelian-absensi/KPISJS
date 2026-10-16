import { WaReportSummaryClient } from "@/components/WaReportSummaryClient";
import { getEffectiveDepartmentScope } from "@/lib/auth";
import {
  buildReportPeriodOptions,
  currentReportMonth,
} from "@/lib/report-period";
import { requireMenu } from "@/lib/session";
import { listDepartments, listManagementContacts } from "@/lib/store";
import { listKpiWaReports } from "@/lib/wa-report-ops";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WaReportSummaryPage() {
  const user = await requireMenu("/kpi/wa-report-summary");

  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  // Collect periods from existing report data
  const reports = listKpiWaReports(undefined, undefined, user);
  const periodsFromData = [
    ...new Set(
      reports
        .map((r) => (r.reportDate || r.createdAt || "").slice(0, 7))
        .filter((p) => /^\d{4}-\d{2}$/.test(p)),
    ),
  ];

  const periodOptions = buildReportPeriodOptions(periodsFromData);
  const initialTo = currentReportMonth();
  const yearStart = `${initialTo.slice(0, 4)}-01`;
  const initialFrom = periodOptions.includes(yearStart) ? yearStart : initialTo;
  const lockedDepartmentId =
    deptScope !== "all" && departments.length === 1
      ? departments[0].id
      : null;
  const managementContacts = listManagementContacts();

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Laporan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Laporan Bukti Lapor WhatsApp
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Ringkasan bukti laporan WhatsApp per user. Setiap tampilan bisa
          dicetak, diekspor ke Excel, atau diekspor ke PDF.
        </p>
      </div>

      <WaReportSummaryClient
        initialFrom={initialFrom}
        initialTo={periodOptions.includes(initialTo) ? initialTo : initialFrom}
        periodsFromData={periodsFromData}
        departments={departments}
        lockedDepartmentId={lockedDepartmentId}
        managementContacts={managementContacts}
      />
    </div>
  );
}
