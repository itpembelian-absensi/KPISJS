import { notFound, redirect } from "next/navigation";
import { AssessmentHistoryClient } from "@/components/AssessmentHistoryClient";
import {
  canViewDepartmentKpi,
  isStaffDeptKpiLimited,
} from "@/lib/auth";
import { listKpiActivities, listKpiAssessments, listKpiProjects } from "@/lib/kpi-ops";
import { requireUser } from "@/lib/session";
import {
  listDepartments,
  listKpiFunctions,
  listStaff,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AssessmentHistoryPage({
  params,
}: {
  params: Promise<{ functionId: string }>;
}) {
  const user = await requireUser();
  if (!canViewDepartmentKpi(user.role)) redirect("/");
  if (isStaffDeptKpiLimited(user.role)) redirect("/kpi/departments");

  const { functionId } = await params;
  const kpiFunction = listKpiFunctions().find((f) => f.id === functionId);
  if (!kpiFunction) notFound();

  const department =
    listDepartments().find((d) => d.id === kpiFunction.departmentId) ?? null;

  const assessments = listKpiAssessments(kpiFunction.departmentId)
    .filter((a) => a.kpiFunctionId === functionId)
    .sort(
      (a, b) =>
        b.periodLabel.localeCompare(a.periodLabel) ||
        b.createdAt.localeCompare(a.createdAt),
    );

  const activities = listKpiActivities(kpiFunction.departmentId)
    .filter(
      (a) => a.kpiFunctionId === functionId && a.status !== "cancelled",
    )
    .sort((a, b) => {
      const da = a.activityDate || a.createdAt;
      const db = b.activityDate || b.createdAt;
      return db.localeCompare(da);
    });

  const progressOf = (status: string) => {
    if (status === "done") return 1;
    if (status === "in_progress") return 0.5;
    return 0;
  };
  const sum = activities.reduce((s, a) => s + progressOf(a.status), 0);
  const percent =
    activities.length === 0
      ? 0
      : Math.round((sum / activities.length) * 1000) / 10;
  const done = activities.filter((a) => a.status === "done").length;
  const inProgress = activities.filter((a) => a.status === "in_progress").length;
  const planned = activities.filter((a) => a.status === "planned").length;

  return (
    <AssessmentHistoryClient
      kpiFunction={kpiFunction}
      department={department}
      assessments={assessments}
      activities={activities}
      projects={listKpiProjects(kpiFunction.departmentId)}
      autoScore={{
        percent,
        detail:
          activities.length === 0
            ? "belum ada kegiatan"
            : `${done} selesai · ${inProgress} jalan · ${planned} rencana`,
        total: activities.length,
        done,
        inProgress,
        planned,
      }}
      staff={listStaff(true)}
      canDelete
    />
  );
}
