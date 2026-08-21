import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, listMenuCatalog, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteUser,
  getUserBySessionToken,
  listDepartments,
  listPendingPasswordResets,
  listStaff,
  listUsers,
  upsertUser,
} from "@/lib/store";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

function requireMaster(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canManageMaster(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

function parseStringArray(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  return value.filter((x): x is string => typeof x === "string");
}

export async function GET(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  return NextResponse.json({
    users: listUsers(),
    staff: listStaff(true),
    departments: listDepartments(true),
    menuCatalog: listMenuCatalog(),
    passwordResetRequests: listPendingPasswordResets(),
  });
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json();
  if (!body.username || !body.role) {
    return NextResponse.json(
      { error: "Username dan role wajib" },
      { status: 400 },
    );
  }
  const result = upsertUser({
    id: body.id,
    username: String(body.username),
    password: body.password ? String(body.password) : undefined,
    role: body.role as UserRole,
    staffId: body.staffId || null,
    active: body.active ?? true,
    allowedMenus: parseStringArray(body.allowedMenus),
    departmentScope: parseStringArray(body.departmentScope),
    assessmentStaffIds: parseStringArray(body.assessmentStaffIds),
    actorId: gate.user?.id,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ user: result });
}

export async function DELETE(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;

  const id =
    req.nextUrl.searchParams.get("id") ||
    String((await req.json().catch(() => ({}))).id || "");
  if (!id) {
    return NextResponse.json({ error: "ID user wajib" }, { status: 400 });
  }

  const result = deleteUser(id, gate.user?.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
