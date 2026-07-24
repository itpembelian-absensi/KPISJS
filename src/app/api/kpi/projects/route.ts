import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDepartment,
  canViewDepartmentKpi,
  getEffectiveDepartmentScope,
  isStaffDeptKpiLimited,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getUserBySessionToken } from "@/lib/store";
import {
  deleteKpiProject,
  listKpiProjects,
  upsertKpiProject,
} from "@/lib/kpi-ops";
import type { KpiProjectStatus, SessionUser } from "@/lib/types";

export const runtime = "nodejs";

function requireDeptKpi(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canViewDepartmentKpi(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

function assertDeptAccess(user: SessionUser, departmentId: string) {
  if (!canAccessDepartment(user, departmentId)) {
    return NextResponse.json(
      { error: "Tidak punya akses ke departemen ini" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const gate = requireDeptKpi(req);
  if ("error" in gate && gate.error) return gate.error;
  let departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  const scope = getEffectiveDepartmentScope(gate.user);
  if (scope !== "all") {
    if (scope.length === 1) departmentId = scope[0];
    else if (departmentId && !scope.includes(departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (isStaffDeptKpiLimited(gate.user.role)) {
    departmentId = gate.user.departmentId || undefined;
  }
  return NextResponse.json({ projects: listKpiProjects(departmentId) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireDeptKpi(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (body.deleteId) {
      const existing = listKpiProjects().find((p) => p.id === String(body.deleteId));
      if (!existing) {
        return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
      }
      const denied = assertDeptAccess(gate.user, existing.departmentId);
      if (denied) return denied;
      const result = deleteKpiProject(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    if (!body.title || !body.departmentId) {
      return NextResponse.json(
        { error: "Judul dan departemen wajib" },
        { status: 400 },
      );
    }
    const departmentId = String(body.departmentId);
    const denied = assertDeptAccess(gate.user, departmentId);
    if (denied) return denied;
    const result = upsertKpiProject({
      id: body.id,
      title: String(body.title),
      departmentId,
      kpiFunctionId: body.kpiFunctionId || null,
      description: String(body.description || ""),
      status: (body.status || "planned") as KpiProjectStatus,
      ownerStaffId: body.ownerStaffId || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      progressPercent: Number(body.progressPercent ?? 0),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ project: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
