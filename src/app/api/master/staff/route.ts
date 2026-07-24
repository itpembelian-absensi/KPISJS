import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteStaff,
  getUserBySessionToken,
  listDepartments,
  listStaff,
  upsertStaff,
} from "@/lib/store";

export const runtime = "nodejs";

function requireMaster(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canManageMaster(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  return NextResponse.json({
    staff: listStaff(activeOnly),
    departments: listDepartments(true),
  });
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json();
  if (!body.employeeCode || !body.name || !body.departmentId) {
    return NextResponse.json(
      { error: "Kode karyawan, nama, dan departemen wajib" },
      { status: 400 },
    );
  }
  const staff = upsertStaff({
    id: body.id,
    employeeCode: String(body.employeeCode),
    name: String(body.name),
    email: String(body.email || ""),
    phone: String(body.phone || ""),
    departmentId: String(body.departmentId),
    position: String(body.position || "Staff"),
    active: body.active ?? true,
  });
  return NextResponse.json({ staff });
}

export async function DELETE(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;

  const id =
    req.nextUrl.searchParams.get("id") ||
    String((await req.json().catch(() => ({}))).id || "");
  if (!id) {
    return NextResponse.json({ error: "ID staf wajib" }, { status: 400 });
  }

  const result = deleteStaff(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
