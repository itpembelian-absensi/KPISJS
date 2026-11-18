import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteMajuGroup,
  listMajuGroups,
  majuGroupUsage,
  upsertMajuGroup,
} from "@/lib/kpi-maju-ops";
import { getUserBySessionToken } from "@/lib/store";

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
  const groups = listMajuGroups().map((group) => ({
    ...group,
    functionCount: majuGroupUsage(group.code),
  }));
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (body.deleteId) {
      const result = deleteMajuGroup(String(body.deleteId));
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }
    const result = upsertMajuGroup({
      id: typeof body.id === "string" ? body.id : undefined,
      code: String(body.code || ""),
      name: String(body.name || ""),
      subtitle: String(body.subtitle || ""),
      weightPercent: Number(body.weightPercent),
      sortOrder: body.sortOrder,
      active: body.active !== false,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      group: { ...result, functionCount: majuGroupUsage(result.code) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan grup MAJU";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
