import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getUserBySessionToken,
  listDepartments,
  upsertDepartment,
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
  return NextResponse.json({ departments: listDepartments(activeOnly) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Kode dan nama wajib" }, { status: 400 });
    }
    const result = upsertDepartment({
      id: body.id,
      code: String(body.code),
      name: String(body.name),
      description: String(body.description || ""),
      active: body.active ?? true,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ department: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan departemen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
