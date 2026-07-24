import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { applyScoreTemplateToDepartment } from "@/lib/kpi-score-ops";
import {
  createTemplateFromDepartment,
  deleteKpiScoreTemplate,
  getKpiScoreTemplate,
  listKpiScoreTemplates,
  upsertKpiScoreTemplate,
} from "@/lib/kpi-score-template-ops";
import { getUserBySessionToken, listDepartments } from "@/lib/store";
import type { KpiScoreTemplateFunction } from "@/lib/types";

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
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const template = getKpiScoreTemplate(id);
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ template });
  }
  return NextResponse.json({
    templates: listKpiScoreTemplates(),
    departments: listDepartments(true),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();

    if (body.deleteId) {
      const result = deleteKpiScoreTemplate(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        templates: listKpiScoreTemplates(),
      });
    }

    if (body.applyToDepartment) {
      const departmentId = String(body.departmentId || "");
      const templateCode = String(body.templateCode || "");
      if (!departmentId || !templateCode) {
        return NextResponse.json(
          { error: "Departemen dan kode template wajib" },
          { status: 400 },
        );
      }
      const result = applyScoreTemplateToDepartment(departmentId, templateCode);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        functions: result.functions,
        indicators: result.indicators,
      });
    }

    if (body.fromDepartment) {
      const result = createTemplateFromDepartment({
        id: body.id ? String(body.id) : undefined,
        departmentId: String(body.departmentId || ""),
        code: String(body.code || ""),
        label: String(body.label || ""),
        description: body.description ? String(body.description) : undefined,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        template: result,
        templates: listKpiScoreTemplates(),
      });
    }

    if (!body.code || !body.label) {
      return NextResponse.json(
        { error: "Kode dan label template wajib" },
        { status: 400 },
      );
    }

    const functions = Array.isArray(body.functions)
      ? (body.functions as KpiScoreTemplateFunction[])
      : [];

    const result = upsertKpiScoreTemplate({
      id: body.id ? String(body.id) : undefined,
      code: String(body.code),
      label: String(body.label),
      description: String(body.description || ""),
      functions,
      active: body.active ?? true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      template: result,
      templates: listKpiScoreTemplates(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
