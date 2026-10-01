import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, SESSION_COOKIE } from "@/lib/auth";
import {
  getCustomerCodeStart,
  previewCustomerCode,
  setCustomerCodeStart,
} from "@/lib/customer-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/pengajuan/customer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ code: "", start: getCustomerCodeStart() });
  }

  try {
    return NextResponse.json({
      code: previewCustomerCode(name),
      start: getCustomerCodeStart(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kode tidak bisa dibuat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang dapat mengatur counter awal" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const start = Number(body?.start);
  try {
    const saved = setCustomerCodeStart(start);
    return NextResponse.json({ start: saved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Counter awal tidak valid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
