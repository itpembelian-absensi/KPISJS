import { WorkReportClient } from "@/components/WorkReportClient";
import { getEffectiveDepartmentScope } from "@/lib/auth";
import { collectWorkReportPeriods } from "@/lib/work-report";
import {
  buildReportPeriodOptions,
  currentReportMonth,
} from "@/lib/report-period";
import { listKpiActivities, listKpiProjects } from "@/lib/kpi-ops";
import { requireMenu } from "@/lib/session";
import {
  listDepartments,
  listKpiFunctions,
  listStaff,
} from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkReportPage() {
  const user = await requireMenu("/kpi/work-report");

  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  const activities =
    deptScope === "all"
      ? listKpiActivities()
      : departments.flatMap((d) => listKpiActivities(d.id));
  const projects =
    deptScope === "all"
      ? listKpiProjects()
      : departments.flatMap((d) => listKpiProjects(d.id));

  const periodsFromData = collectWorkReportPeriods(activities, projects);
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
          Laporan Pekerjaan
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Satu laporan terpadu dari semua jenis kegiatan (harian, mingguan,
          bulanan) plus pending kegiatan &amp; project. Foto dan dokumen
          lampiran ditampilkan di kolom Lampiran. Bisa diexport ke Excel/PDF
          atau dikirim ringkasannya lewat WhatsApp.
        </p>
      </div>

      <WorkReportClient
        initialPeriod={
          periodOptions.includes(initialPeriod) ? initialPeriod : "all"
        }
        periodsFromData={periodsFromData}
        departments={departments}
        staff={listStaff(true)}
        functions={listKpiFunctions()}
        activities={activities}
        projects={projects}
        lockedDepartmentId={lockedDepartmentId}
      />
    </div>
  );
}
