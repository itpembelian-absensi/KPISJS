import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { setDisciplineViolation } from "@/lib/attendance-ops";
import { isViolationLevel } from "@/lib/discipline-score";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageMaster(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const staffId = String(body.staffId || "");
  const periodLabel = String(body.periodLabel || "");
  const violationLevel = String(body.violationLevel || "");
  if (!isViolationLevel(violationLevel)) {
    return NextResponse.json(
      { error: "Tingkat pelanggaran tidak dikenal." },
      { status: 400 },
    );
  }

  const result = setDisciplineViolation({
    staffId,
    periodLabel,
    violationLevel,
    assessedByName: user.name,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, summary: result.summary });
}
