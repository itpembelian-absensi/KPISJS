import { NextRequest, NextResponse } from "next/server";
import {
  canAssessDepartmentAggregate,
  canAssessTargetStaff,
  canViewKpi,
  canWriteKpiAssessment,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getUserBySessionToken, listKpiFunctions, listStaff, listAdminStaffIds } from "@/lib/store";
import {
  deleteKpiAssessment,
  listKpiAssessments,
  upsertKpiAssessment,
} from "@/lib/kpi-ops";

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
        { error: "Hanya manager / penilai / admin yang boleh memberi penilaian" },
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
  return NextResponse.json({ assessments: listKpiAssessments(departmentId) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireKpiAssessor(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (body.deleteId) {
      const result = deleteKpiAssessment(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    if (!body.departmentId || !body.periodLabel || !body.kpiFunctionId) {
      return NextResponse.json(
        { error: "Departemen, periode, dan fungsi KPI wajib" },
        { status: 400 },
      );
    }

    const departmentId = String(body.departmentId);
    const kpiFunctionId = String(body.kpiFunctionId);
    const staffId = body.staffId ? String(body.staffId) : null;

    const fn = listKpiFunctions(true).find(
      (f) => f.id === kpiFunctionId && f.departmentId === departmentId,
    );
    if (!fn) {
      return NextResponse.json(
        { error: "Fungsi KPI tidak valid untuk departemen tersebut" },
        { status: 400 },
      );
    }

    if (staffId) {
      const member = listStaff(true).find((s) => s.id === staffId);
      if (!member) {
        return NextResponse.json(
          { error: "Karyawan tidak ditemukan" },
          { status: 400 },
        );
      }
      if (member.departmentId !== departmentId) {
        return NextResponse.json(
          {
            error:
              "Karyawan harus berasal dari departemen yang dinilai",
          },
          { status: 400 },
        );
      }
      if (listAdminStaffIds().includes(staffId)) {
        return NextResponse.json(
          { error: "Akun admin tidak masuk dalam penilaian KPI" },
          { status: 400 },
        );
      }
      if (!canAssessTargetStaff(gate.user, member)) {
        return NextResponse.json(
          {
            error:
              "Anda tidak berhak menilai karyawan ini. Dept sendiri selalu boleh; dept lain hanya staf yang diizinkan admin.",
          },
          { status: 403 },
        );
      }
    } else if (!canAssessDepartmentAggregate(gate.user, departmentId)) {
      return NextResponse.json(
        {
          error:
            "Penilaian agregat departemen hanya untuk departemen Anda sendiri. Untuk dept lain, pilih karyawan yang diizinkan.",
        },
        { status: 403 },
      );
    }

    const result = upsertKpiAssessment({
      id: body.id,
      departmentId,
      periodLabel: String(body.periodLabel),
      kpiFunctionId,
      staffId,
      score: Number(body.score),
      targetScore: Number(body.targetScore ?? 100),
      notes: String(body.notes || ""),
      assessedByName: String(body.assessedByName || gate.user.name),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ assessment: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan penilaian";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
