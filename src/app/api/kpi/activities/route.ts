import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDepartment,
  canViewDepartmentKpi,
  getEffectiveDepartmentScope,
  isStaffDeptKpiLimited,
  SESSION_COOKIE,
} from "@/lib/auth";
import type { SessionUser } from "@/lib/types";
import { getUserBySessionToken } from "@/lib/store";
import {
  deleteKpiActivity,
  listKpiActivities,
  upsertKpiActivity,
} from "@/lib/kpi-ops";
import type { KpiActivityFrequency, KpiActivityStatus } from "@/lib/types";

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
  return NextResponse.json({ activities: listKpiActivities(departmentId) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireDeptKpi(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (body.deleteId) {
      const existing = listKpiActivities().find(
        (a) => a.id === String(body.deleteId),
      );
      if (!existing) {
        return NextResponse.json(
          { error: "Kegiatan tidak ditemukan" },
          { status: 404 },
        );
      }
      const denied = assertDeptAccess(gate.user, existing.departmentId);
      if (denied) return denied;
      const result = deleteKpiActivity(String(body.deleteId));
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
    const result = upsertKpiActivity({
      id: body.id,
      title: String(body.title),
      departmentId,
      projectId: body.projectId || null,
      kpiFunctionId: body.kpiFunctionId || null,
      description: String(body.description || ""),
      status: (body.status || "in_progress") as KpiActivityStatus,
      frequency: (body.frequency || "daily") as KpiActivityFrequency,
      assigneeStaffId: body.assigneeStaffId || null,
      activityDate: body.activityDate || null,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ activity: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan kegiatan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
