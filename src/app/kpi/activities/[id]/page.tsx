import { notFound, redirect } from "next/navigation";
import { ActivityDetailClient } from "@/components/ActivityDetailClient";
import {
  canViewDepartmentKpi,
  isStaffDeptKpiLimited,
} from "@/lib/auth";
import {
  getKpiActivity,
  listKpiProjects,
} from "@/lib/kpi-ops";
import { requireUser } from "@/lib/session";
import { listKpiFunctions, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canViewDepartmentKpi(user.role)) redirect("/");

  const { id } = await params;
  const activity = getKpiActivity(id);
  if (!activity) notFound();

  if (
    isStaffDeptKpiLimited(user.role) &&
    user.departmentId !== activity.departmentId
  ) {
    redirect("/kpi/departments");
  }

  const project = activity.projectId
    ? listKpiProjects().find((p) => p.id === activity.projectId) ?? null
    : null;
  const kpiFunction = activity.kpiFunctionId
    ? listKpiFunctions().find((f) => f.id === activity.kpiFunctionId) ?? null
    : null;
  const assignee = activity.assigneeStaffId
    ? listStaff().find((s) => s.id === activity.assigneeStaffId) ?? null
    : null;

  return (
    <ActivityDetailClient
      activity={activity}
      project={project}
      kpiFunction={kpiFunction}
      assignee={assignee}
    />
  );
}
