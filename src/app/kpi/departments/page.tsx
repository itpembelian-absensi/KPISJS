import { DepartmentKpiWorkspace } from "@/components/DepartmentKpiWorkspace";
import {
  getEffectiveDepartmentScope,
  isAssessmentUnrestricted,
  isStaffDeptKpiLimited,
} from "@/lib/auth";
import {
  ensureDisciplineKpiFunctions,
  listAttendanceSummaries,
} from "@/lib/attendance-ops";
import { requireMenu } from "@/lib/session";
import {
  listAgents,
  listDepartments,
  listKpiFunctions,
  listStaff,
  listTickets,
  listUsers,
  listAdminStaffIds,
} from "@/lib/store";
import {
  listKpiActivities,
  listKpiAssessments,
  listKpiProjects,
} from "@/lib/kpi-ops";
import { listKpiIndicatorActuals, syncTicketScoreActuals } from "@/lib/kpi-indicator-actuals-ops";
import {
  ensureDepartmentScoreRules,
  listKpiScoreIndicators,
} from "@/lib/kpi-score-ops";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function DepartmentKpiPage() {
  const user = await requireMenu("/kpi/departments");

  const staffLimited = isStaffDeptKpiLimited(user.role);
  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  if (!staffLimited) {
    ensureDisciplineKpiFunctions();
    ensureDepartmentScoreRules();
    syncTicketScoreActuals();
  }

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  const defaultDepartmentId =
    deptScope !== "all"
      ? departments[0]?.id || ""
      : user.role === "admin" || user.role === "it_staff"
        ? departments.find((d) => d.code === "IT")?.id || departments[0]?.id || ""
        : user.departmentId || departments[0]?.id || "";

  const deptId = defaultDepartmentId;

  const managerStaffIds = listUsers()
    .filter((u) => u.active && u.role === "manager" && u.staffId)
    .map((u) => u.staffId as string);
  const adminStaffIds = listAdminStaffIds();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Multi-department KPI
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          KPI Departemen
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          {staffLimited
            ? "Input project dan kegiatan untuk departemen Anda."
            : "Kerangka fungsi, project, kegiatan, penilaian, dan kedisiplinan (absensi/lembur dari Excel) sesuai standar masing-masing departemen."}
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-ink-muted">Memuat workspace KPI...</p>
        }
      >
        <DepartmentKpiWorkspace
          departments={departments}
          functions={listKpiFunctions(true)}
          projects={
            staffLimited ? listKpiProjects(deptId) : listKpiProjects()
          }
          activities={
            staffLimited ? listKpiActivities(deptId) : listKpiActivities()
          }
          assessments={staffLimited ? [] : listKpiAssessments()}
          disciplineSummaries={
            staffLimited ? [] : listAttendanceSummaries()
          }
          scoreIndicators={staffLimited ? [] : listKpiScoreIndicators()}
          indicatorActuals={staffLimited ? [] : listKpiIndicatorActuals()}
          tickets={staffLimited ? [] : listTickets()}
          agents={staffLimited ? [] : listAgents()}
          staff={listStaff(true)}
          defaultDepartmentId={defaultDepartmentId}
          assessorName={user.name}
          staffLimited={staffLimited}
          managerStaffIds={managerStaffIds}
          adminStaffIds={adminStaffIds}
          assessmentUnrestricted={isAssessmentUnrestricted(user.role)}
          assessorHomeDepartmentId={user.departmentId}
          assessmentExtraStaffIds={user.assessmentStaffIds ?? []}
        />
      </Suspense>
    </div>
  );
}
