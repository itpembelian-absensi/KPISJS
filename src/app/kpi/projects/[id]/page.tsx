import { notFound, redirect } from "next/navigation";
import { ProjectDetailClient } from "@/components/ProjectDetailClient";
import {
  canViewDepartmentKpi,
  isStaffDeptKpiLimited,
} from "@/lib/auth";
import {
  getKpiProject,
  listKpiActivities,
} from "@/lib/kpi-ops";
import { requireUser } from "@/lib/session";
import {
  listDepartments,
  listKpiFunctions,
  listStaff,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; functionId?: string }>;
}) {
  const user = await requireUser();
  if (!canViewDepartmentKpi(user.role)) redirect("/");

  const { id } = await params;
  const q = await searchParams;
  const project = getKpiProject(id);
  if (!project) notFound();

  if (
    isStaffDeptKpiLimited(user.role) &&
    user.departmentId !== project.departmentId
  ) {
    redirect("/kpi/departments");
  }

  const department =
    listDepartments().find((d) => d.id === project.departmentId) ?? null;
  const kpiFunction = project.kpiFunctionId
    ? listKpiFunctions().find((f) => f.id === project.kpiFunctionId) ?? null
    : null;
  const owner = project.ownerStaffId
    ? listStaff().find((s) => s.id === project.ownerStaffId) ?? null
    : null;

  let activities = listKpiActivities(project.departmentId).filter(
    (a) => a.projectId === project.id,
  );
  if (q.functionId) {
    activities = activities.filter((a) => a.kpiFunctionId === q.functionId);
  }

  const backHref =
    q.from === "assessment" && q.functionId
      ? `/kpi/assessments/${q.functionId}`
      : "/kpi/departments?tab=project";

  return (
    <ProjectDetailClient
      project={project}
      department={department}
      kpiFunction={kpiFunction}
      owner={owner}
      activities={activities}
      backHref={backHref}
    />
  );
}
