import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { deleteDisciplineData } from "@/lib/attendance-ops";
import type { DisciplineDeleteUnit } from "@/lib/discipline-period";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

const UNITS = new Set<DisciplineDeleteUnit>(["day", "week", "month", "period"]);

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

  const scope = body.scope === "staff" || body.scope === "all" ? body.scope : "";
  const unit = String(body.unit || "") as DisciplineDeleteUnit;
  const anchor = String(body.anchor || "");
  if (!scope) {
    return NextResponse.json(
      { error: "Pilih cakupan: satu staf atau semua staf." },
      { status: 400 },
    );
  }
  if (!UNITS.has(unit)) {
    return NextResponse.json(
      { error: "Satuan hapus harus hari, minggu, bulan, atau periode." },
      { status: 400 },
    );
  }

  const result = deleteDisciplineData({
    scope,
    staffId: body.staffId ? String(body.staffId) : undefined,
    unit,
    anchor,
    assessedByName: user.name,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result });
}
