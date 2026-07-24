import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getUserBySessionToken,
  deleteKpiFunction,
  listDepartments,
  listKpiFunctions,
  upsertKpiFunction,
} from "@/lib/store";

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
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  return NextResponse.json({
    kpiFunctions: listKpiFunctions(activeOnly, departmentId),
    departments: listDepartments(true),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (body.deleteId) {
      const result = deleteKpiFunction(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }
    if (
      !body.name ||
      !body.departmentId ||
      body.weightPercent === undefined ||
      body.weightPercent === ""
    ) {
      return NextResponse.json(
        { error: "Departemen, nama, dan bobot wajib diisi" },
        { status: 400 },
      );
    }
    const result = upsertKpiFunction({
      id: body.id,
      departmentId: String(body.departmentId),
      name: String(body.name),
      weightPercent: Number(body.weightPercent),
      focus: String(body.focus || ""),
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      active: body.active ?? true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ kpiFunction: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan fungsi KPI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
