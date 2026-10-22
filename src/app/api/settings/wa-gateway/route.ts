import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getGowaPublicConfig,
  saveGowaConfig,
  testGowaConnection,
} from "@/lib/gowa";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageMaster(user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function GET(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  return NextResponse.json(getGowaPublicConfig());
}

export async function POST(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  if (body.action === "test") {
    const result = await testGowaConnection();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }
  const error = saveGowaConfig({
    host: String(body.host || ""),
    username: String(body.username || ""),
    password: body.password == null ? "" : String(body.password),
    deviceId: String(body.deviceId || ""),
  });
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(getGowaPublicConfig());
}
