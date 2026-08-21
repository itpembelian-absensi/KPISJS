import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getUserBySessionToken,
  listPendingPasswordResets,
  rejectPasswordResetRequest,
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
  return NextResponse.json({ requests: listPendingPasswordResets() });
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id || action !== "reject") {
    return NextResponse.json(
      { error: "ID permintaan dan aksi reject wajib" },
      { status: 400 },
    );
  }

  const result = rejectPasswordResetRequest(id, gate.user?.id ?? "");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
