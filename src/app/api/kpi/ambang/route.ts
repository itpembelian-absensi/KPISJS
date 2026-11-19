import { NextRequest, NextResponse } from "next/server";
import {
  canViewKpi,
  canWriteKpiAssessment,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getKpiAmbangCheck, saveKpiAmbangCheck } from "@/lib/kpi-ambang-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function viewer(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canViewKpi(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = viewer(req);
  if ("error" in gate && gate.error) return gate.error;
  const staffId = req.nextUrl.searchParams.get("staffId") || "";
  const periodLabel = req.nextUrl.searchParams.get("periodLabel") || "";
  if (!staffId || !periodLabel) {
    return NextResponse.json(
      { error: "Karyawan dan periode wajib" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    check: getKpiAmbangCheck(staffId, periodLabel),
  });
}

export async function POST(req: NextRequest) {
  const gate = viewer(req);
  if ("error" in gate && gate.error) return gate.error;
  if (!canWriteKpiAssessment(gate.user.role)) {
    return NextResponse.json(
      { error: "Hanya manager / admin yang boleh mencatat syarat ambang" },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = saveKpiAmbangCheck({
    staffId: String(body.staffId || ""),
    periodLabel: String(body.periodLabel || ""),
    kehadiran: body.kehadiran,
    alpa: body.alpa,
    sp: body.sp,
    integritas: body.integritas,
    k3: body.k3,
    notes: body.notes ? String(body.notes) : "",
    checkedBy: gate.user.name,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, check: result });
}
