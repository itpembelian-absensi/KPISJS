import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { getUserBySessionToken } from "@/lib/store";
import { deleteJabatan, listJabatan, upsertJabatan } from "@/lib/jabatan-ops";

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
  return NextResponse.json({ jabatan: listJabatan(activeOnly) });
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json();
  const name = String(body.name || "");
  if (!name.trim()) {
    return NextResponse.json({ error: "Nama jabatan wajib" }, { status: 400 });
  }
  const result = upsertJabatan({
    id: body.id ? String(body.id) : undefined,
    name,
    kelompok: String(body.kelompok || ""),
    scoreMethod: String(body.scoreMethod || ""),
    indicatorCount: Number(body.indicatorCount) || 0,
    active: body.active ?? true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ jabatan: result });
}

export async function DELETE(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const id =
    req.nextUrl.searchParams.get("id") ||
    String((await req.json().catch(() => ({}))).id || "");
  if (!id) {
    return NextResponse.json({ error: "ID jabatan wajib" }, { status: 400 });
  }
  const result = deleteJabatan(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
