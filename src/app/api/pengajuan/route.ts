import { NextRequest, NextResponse } from "next/server";
import {
  canAccessMenu,
  canViewAllTickets,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getCustomerByCode } from "@/lib/customer-ops";
import { getPengajuanType, parsePengajuanPayload } from "@/lib/pengajuan";
import { createPengajuan } from "@/lib/pengajuan-ops";
import {
  getDepartmentName,
  getUserBySessionToken,
  listStaff,
} from "@/lib/store";
import type { PengajuanType } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const type = String(body?.type || "");
  const def = getPengajuanType(type);
  if (!def) {
    return NextResponse.json(
      { error: "Jenis pengajuan tidak dikenal" },
      { status: 400 },
    );
  }
  if (!canAccessMenu(user, def.href)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parsePengajuanPayload(type, body?.payload);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (def.type === "customer_ubah") {
    const master = getCustomerByCode(parsed.payload.kodeCustomer || "");
    if (!master) {
      return NextResponse.json(
        { error: "Kode customer tidak ada di master customer" },
        { status: 400 },
      );
    }
    parsed.payload.kodeCustomer = master.code;
    parsed.payload.namaCustomer = master.name;
  }

  if (def.type === "void" && parsed.payload.namaCustomer) {
    const code = parsed.payload.namaCustomer.split("—")[0]?.trim() || "";
    const master = getCustomerByCode(code);
    if (!master) {
      return NextResponse.json(
        { error: "Customer tidak ada di master customer" },
        { status: 400 },
      );
    }
    parsed.payload.namaCustomer = `${master.code} — ${master.name}`;
  }

  const note = String(body?.note || "").trim();
  if (note.length > 2000) {
    return NextResponse.json({ error: "Catatan terlalu panjang" }, { status: 400 });
  }

  const staffList = listStaff(true);
  const canPickOthers = canViewAllTickets(user.role);
  let requesterStaffId = String(body?.requesterStaffId || user.staffId || "");
  if (!canPickOthers) requesterStaffId = user.staffId || "";

  const staff = staffList.find((s) => s.id === requesterStaffId);
  if (!staff) {
    return NextResponse.json(
      { error: "Pemohon harus dipilih dari master staf" },
      { status: 400 },
    );
  }

  try {
    const pengajuan = createPengajuan({
      type: def.type as PengajuanType,
      title: def.titleFrom(parsed.payload).trim().slice(0, 180) || parsed.title,
      payload: parsed.payload,
      note,
      requesterName: staff.name,
      requesterDept: getDepartmentName(staff.departmentId),
      requesterStaffId: staff.id,
      departmentId: staff.departmentId,
    });
    return NextResponse.json({ pengajuan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Counter kode") || message.startsWith("Kode customer")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
