import { NextRequest, NextResponse } from "next/server";
import { canAssignTickets, canViewAllTickets, SESSION_COOKIE } from "@/lib/auth";
import {
  createTicket,
  getDepartmentName,
  getUserBySessionToken,
  listStaff,
  listTickets,
} from "@/lib/store";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const ownOnly = !canViewAllTickets(user.role);
  const tickets = listTickets({
    status: (searchParams.get("status") as TicketStatus | "all" | "active") || "all",
    priority: (searchParams.get("priority") as TicketPriority | "all") || "all",
    assigneeId: searchParams.get("assigneeId") || "all",
    q: searchParams.get("q") || undefined,
    requesterStaffId: ownOnly ? user.staffId ?? undefined : undefined,
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  }

  const staffList = listStaff(true);
  const canPickOthers = canViewAllTickets(user.role);
  let requesterStaffId = String(body.requesterStaffId || user.staffId || "");

  if (!canPickOthers) {
    requesterStaffId = user.staffId || "";
  }

  const staff = staffList.find((s) => s.id === requesterStaffId);
  if (!staff) {
    return NextResponse.json(
      { error: "Pemohon harus dipilih dari master staf" },
      { status: 400 },
    );
  }

  const requesterDept = getDepartmentName(staff.departmentId);

  const ticket = createTicket({
    title: String(body.title),
    description: String(body.description || ""),
    category: (body.category || "other") as TicketCategory,
    priority: (body.priority || "medium") as TicketPriority,
    requesterName: staff.name,
    requesterDept,
    requesterStaffId: staff.id,
    assigneeId: canAssignTickets(user.role) ? (body.assigneeId ?? null) : null,
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
