import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  applyScoreTemplateToDepartment,
  deleteKpiScoreIndicator,
  listKpiScoreIndicators,
  listScoreTemplateCodes,
  upsertKpiScoreIndicator,
} from "@/lib/kpi-score-ops";
import { getUserBySessionToken, listDepartments, listKpiFunctions } from "@/lib/store";
import type { KpiScoreMetricType } from "@/lib/types";

export const runtime = "nodejs";

function requireMaster(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageMaster(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  return NextResponse.json({
    indicators: listKpiScoreIndicators(departmentId),
    functions: listKpiFunctions(true, departmentId),
    departments: listDepartments(true),
    templates: listScoreTemplateCodes(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();

    if (body.applyTemplate) {
      const departmentId = String(body.departmentId || "");
      const templateCode = String(body.templateCode || "MTR");
      if (!departmentId) {
        return NextResponse.json(
          { error: "Departemen wajib" },
          { status: 400 },
        );
      }
      const result = applyScoreTemplateToDepartment(
        departmentId,
        templateCode,
      );
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        functionCount: result.functions,
        indicatorCount: result.indicators,
        indicators: listKpiScoreIndicators(departmentId),
        functions: listKpiFunctions(true, departmentId),
      });
    }

    if (body.deleteId) {
      const result = deleteKpiScoreIndicator(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    if (!body.name || !body.departmentId || !body.kpiFunctionId || !body.metricType) {
      return NextResponse.json(
        { error: "Nama, departemen, fungsi, dan tipe hitung wajib" },
        { status: 400 },
      );
    }

    const result = upsertKpiScoreIndicator({
      id: body.id,
      departmentId: String(body.departmentId),
      kpiFunctionId: String(body.kpiFunctionId),
      name: String(body.name),
      description: String(body.description || ""),
      weightPercent: Number(body.weightPercent ?? 100),
      metricType: body.metricType as KpiScoreMetricType,
      config: body.config && typeof body.config === "object" ? body.config : {},
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active ?? true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ indicator: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan aturan skor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
