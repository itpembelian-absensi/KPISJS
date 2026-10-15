import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, SESSION_COOKIE } from "@/lib/auth";
import {
  listApprovalChain,
  listApprovalChainUsers,
  saveApprovalChain,
} from "@/lib/pengajuan-approval";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

const HREF = "/master/approval-pengajuan";

function requireAdmin(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== "admin" || !canAccessMenu(user, HREF)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireAdmin(req);
  if ("error" in gate && gate.error) return gate.error;
  return NextResponse.json({
    levels: listApprovalChain(),
    users: listApprovalChainUsers(),
  });
}

export async function PUT(req: NextRequest) {
  const gate = requireAdmin(req);
  if ("error" in gate && gate.error) return gate.error;
  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.levels) ? body.levels : null;
  if (!raw) {
    return NextResponse.json({ error: "Data tingkat tidak valid" }, { status: 400 });
  }
  const levels = raw.map((level: { label?: unknown; userIds?: unknown }) => ({
    label: String(level?.label || ""),
    userIds: Array.isArray(level?.userIds)
      ? level.userIds.filter((id: unknown): id is string => typeof id === "string")
      : [],
  }));
  const result = saveApprovalChain(levels);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    levels: result.levels,
    users: listApprovalChainUsers(),
  });
}
