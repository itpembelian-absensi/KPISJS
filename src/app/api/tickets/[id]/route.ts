import { NextRequest, NextResponse } from "next/server";
import {
  canAccessTicket,
  canAssignTickets,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  getTicket,
  getUserBySessionToken,
  listAgents,
  updateTicket,
  deleteTicket,
} from "@/lib/store";
import type { TicketPriority, TicketStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ticket = getTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  }
  if (!canAccessTicket(user.role, user.staffId, ticket.requesterStaffId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agents = listAgents();
  const assignee = agents.find((a) => a.id === ticket.assigneeId) ?? null;
  const related = ticket.relatedTicketId
    ? getTicket(ticket.relatedTicketId)
    : null;
  return NextResponse.json({ ticket, assignee, related, agents });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = getTicket(id);
  if (!existing) {
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  }
  if (!canAccessTicket(user.role, user.staffId, existing.requesterStaffId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const canAssign = canAssignTickets(user.role);

  // Penilaian kepuasan hanya oleh pemohon tiket (bukan proses IT)
  if (body.satisfaction != null) {
    const score = Number(body.satisfaction);
    const isRequester =
      Boolean(user.staffId) && existing.requesterStaffId === user.staffId;
    const isDone =
      existing.status === "resolved" || existing.status === "closed";

    if (!isRequester) {
      return NextResponse.json(
        { error: "Hanya pemohon tiket yang boleh memberi penilaian" },
        { status: 403 },
      );
    }
    if (!isDone) {
      return NextResponse.json(
        { error: "Penilaian hanya untuk tiket yang sudah selesai" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "Nilai harus 1–5" },
        { status: 400 },
      );
    }

    const ticket = updateTicket(id, {
      satisfaction: score,
      comment: typeof body.comment === "string" ? body.comment : undefined,
    });
    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ticket });
  }

  if (!canAssign) {
    return NextResponse.json(
      { error: "Forbidden — update proses hanya untuk IT" },
      { status: 403 },
    );
  }

  const ticket = updateTicket(id, {
    status: body.status as TicketStatus | undefined,
    assigneeId: body.assigneeId,
    priority: body.priority as TicketPriority | undefined,
    resolution: body.resolution,
    rootCause: body.rootCause,
    scheduledStart: body.scheduledStart,
    scheduledEnd: body.scheduledEnd,
    comment: body.comment,
    actorId: body.actorId || user.itMemberId || undefined,
  });

  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAssignTickets(user.role)) {
    return NextResponse.json(
      { error: "Hanya Admin / IT Staf yang boleh menghapus tiket" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const existing = getTicket(id);
  if (!existing) {
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  }

  const result = deleteTicket(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, code: existing.code });
}
