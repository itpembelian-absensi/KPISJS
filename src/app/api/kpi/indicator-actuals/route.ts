import { NextRequest, NextResponse } from "next/server";
import {
  canViewKpi,
  canWriteKpiAssessment,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  listKpiIndicatorActuals,
  upsertKpiIndicatorActualsBatch,
} from "@/lib/kpi-indicator-actuals-ops";
import { listAttendanceSummaries } from "@/lib/attendance-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireKpiViewer(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canViewKpi(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

function requireKpiAssessor(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canWriteKpiAssessment(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Hanya manager / admin yang boleh input capaian indikator" },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireKpiViewer(req);
  if ("error" in gate && gate.error) return gate.error;

  const departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  const staffId = req.nextUrl.searchParams.get("staffId") || undefined;
  const periodLabel =
    req.nextUrl.searchParams.get("periodLabel") || undefined;

  return NextResponse.json({
    actuals: listKpiIndicatorActuals({
      departmentId,
      staffId,
      periodLabel,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireKpiAssessor(req);
    if ("error" in gate && gate.error) return gate.error;
    const { user } = gate;

    const body = await req.json();
    const departmentId = String(body.departmentId || "");
    const staffId = String(body.staffId || "");
    const periodLabel = String(body.periodLabel || "");
    const items = Array.isArray(body.items) ? body.items : [];

    if (!departmentId || !staffId || !periodLabel) {
      return NextResponse.json(
        { error: "Departemen, karyawan, dan periode wajib" },
        { status: 400 },
      );
    }

    const disc = listAttendanceSummaries().find(
      (s) => s.staffId === staffId && s.periodLabel === periodLabel,
    );

    const result = upsertKpiIndicatorActualsBatch({
      departmentId,
      staffId,
      periodLabel,
      items: items.map(
        (it: {
          indicatorId?: string;
          actualValue?: number | string | null;
          targetOverride?: number | string | null;
          notes?: string;
        }) => ({
          indicatorId: String(it.indicatorId || ""),
          actualValue:
            it.actualValue == null || it.actualValue === ""
              ? null
              : Number(it.actualValue),
          targetOverride:
            it.targetOverride == null || it.targetOverride === ""
              ? null
              : Number(it.targetOverride),
          notes: it.notes ? String(it.notes) : "",
        }),
      ),
      updatedBy: user.name,
      disciplineScore: disc?.disciplineScore ?? null,
      syncAssessments: true,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      actuals: result.actuals,
      functionScores: result.functionScores,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal simpan capaian" },
      { status: 500 },
    );
  }
}
