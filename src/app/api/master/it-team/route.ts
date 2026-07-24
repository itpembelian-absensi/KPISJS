import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getUserBySessionToken,
  listItTeam,
  listStaff,
  upsertItMember,
} from "@/lib/store";
import type { ItMemberType } from "@/lib/types";

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
  return NextResponse.json({
    itTeam: listItTeam(),
    staff: listStaff(true),
  });
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json();
  if (!body.staffId || !body.type) {
    return NextResponse.json(
      { error: "Staf dan tipe IT wajib" },
      { status: 400 },
    );
  }
  const result = upsertItMember({
    id: body.id,
    staffId: String(body.staffId),
    type: body.type as ItMemberType,
    active: body.active ?? true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ itMember: result });
}
