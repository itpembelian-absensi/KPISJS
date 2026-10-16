import { WaReportSummaryClient } from "@/components/WaReportSummaryClient";
import { getEffectiveDepartmentScope } from "@/lib/auth";
import {
  buildReportPeriodOptions,
  currentReportMonth,
} from "@/lib/report-period";
import { requireMenu } from "@/lib/session";
import { listDepartments } from "@/lib/store";
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

  const periodOptions = ["all", ...buildReportPeriodOptions(periodsFromData)];
  const initialPeriod = currentReportMonth();
  const lockedDepartmentId =
    deptScope !== "all" && departments.length === 1
      ? departments[0].id
      : null;

  return (
    <div className="space-y-5">
      <div>
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
          Detail bukti laporan WhatsApp per hari per user. Dapat dilihat
          dalam format accordion atau tabel, dan di-export ke Excel.
        </p>
      </div>

      <WaReportSummaryClient
        initialPeriod={
          periodOptions.includes(initialPeriod) ? initialPeriod : "all"
        }
        periodsFromData={periodsFromData}
        departments={departments}
        lockedDepartmentId={lockedDepartmentId}
      />
    </div>
  );
}
