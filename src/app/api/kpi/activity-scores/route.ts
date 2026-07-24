import { NextRequest, NextResponse } from "next/server";
import { canViewDepartmentKpi, SESSION_COOKIE } from "@/lib/auth";
import { computeActivityScores } from "@/lib/kpi-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewDepartmentKpi(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const departmentId = req.nextUrl.searchParams.get("departmentId");
  if (!departmentId) {
    return NextResponse.json(
      { error: "departmentId wajib" },
      { status: 400 },
    );
  }
  const periodLabel =
    req.nextUrl.searchParams.get("periodLabel") || undefined;

  return NextResponse.json({
    scores: computeActivityScores(departmentId, periodLabel),
  });
}
