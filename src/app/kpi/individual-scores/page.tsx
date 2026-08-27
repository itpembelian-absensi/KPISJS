import {
  getEffectiveDepartmentScope,
  isStaffDeptKpiLimited,
} from "@/lib/auth";
import { listAttendanceSummaries } from "@/lib/attendance-ops";
import { disciplinePeriodFromDate } from "@/lib/discipline-period";
import { listKpiActivities, listKpiAssessments } from "@/lib/kpi-ops";
import { listKpiIndicatorActuals, syncActivityScoreActuals, syncTicketScoreActuals } from "@/lib/kpi-indicator-actuals-ops";
import {
  ensureDepartmentScoreRules,
  listKpiScoreIndicators,
} from "@/lib/kpi-score-ops";
import { requireMenu } from "@/lib/session";
import {
  listAdminStaffIds,
  listAgents,
  listDepartments,
  listItTeam,
  listKpiFunctions,
  listStaff,
  listTickets,
  listUsers,
} from "@/lib/store";
import { IndividualScoreReportClient } from "@/components/IndividualScoreReportClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function IndividualScoresPage() {
  const user = await requireMenu("/kpi/individual-scores");

  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  ensureDepartmentScoreRules();
  syncTicketScoreActuals();
  syncActivityScoreActuals();

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  const staffLimited = isStaffDeptKpiLimited(user.role);
  const lockedDepartmentId =
    staffLimited && user.departmentId
      ? user.departmentId
      : deptScope !== "all" && departments.length === 1
        ? departments[0].id
        : null;
  const lockedStaffId = staffLimited ? user.staffId : null;

  const deptIds = new Set(departments.map((d) => d.id));
  const staff = listStaff(true).filter((s) => deptIds.has(s.departmentId));
  const assessments = listKpiAssessments().filter((a) =>
    deptIds.has(a.departmentId),
  );
  const activities = listKpiActivities().filter((a) =>
    deptIds.has(a.departmentId),
  );
  const discipline = listAttendanceSummaries().filter((d) => {
    const s = staff.find((x) => x.id === d.staffId);
    return Boolean(s);
  });
  const managerStaffIds = listUsers()
    .filter((u) => u.active && u.role === "manager" && u.staffId)
    .map((u) => u.staffId as string);

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
          Laporan Skor Individu
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Nilai / skor KPI per karyawan dalam satu periode. Sumber skor:
          capaian indikator (tiket, kegiatan, absensi otomatis), penilaian
          manual, atau rata-rata kegiatan fungsi. Manager IT memakai agregat
          tiket tim (anak buah).
        </p>
      </div>

      <IndividualScoreReportClient
        departments={departments}
        staff={staff}
        functions={listKpiFunctions(true)}
        indicators={listKpiScoreIndicators()}
        actuals={listKpiIndicatorActuals()}
        assessments={assessments}
        disciplineSummaries={discipline}
        activities={activities}
        tickets={listTickets()}
        agents={listAgents()}
        itTeam={listItTeam(true)}
        managerStaffIds={managerStaffIds}
        adminStaffIds={listAdminStaffIds()}
        lockedDepartmentId={lockedDepartmentId}
        lockedStaffId={lockedStaffId}
        initialPeriod={disciplinePeriodFromDate(
          new Date().toISOString().slice(0, 10),
        )}
      />
    </div>
  );
}
