import { NextRequest, NextResponse } from "next/server";
import {
  canAssignWorkOrders,
  canManageWorkOrders,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getUserBySessionToken } from "@/lib/store";
import {
  deleteWorkOrder,
  getWorkOrder,
  updateWorkOrder,
} from "@/lib/work-orders";
import type { WorkOrderPriority, WorkOrderStatus } from "@/lib/types";

export const runtime = "nodejs";

function requireWorkOrderUser(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageWorkOrders(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = requireWorkOrderUser(req);
  if ("error" in gate && gate.error) return gate.error;
  const { id } = await params;
  const workOrder = getWorkOrder(id);
  if (!workOrder) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ workOrder });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = requireWorkOrderUser(req);
    if ("error" in gate && gate.error) return gate.error;
    const { id } = await params;
    const body = await req.json();

    if (
      (body.assigneeId !== undefined || body.status !== undefined) &&
      !canAssignWorkOrders(gate.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workOrder = updateWorkOrder(id, {
      status: body.status as WorkOrderStatus | undefined,
      assigneeId: body.assigneeId,
      priority: body.priority as WorkOrderPriority | undefined,
      dueDate: body.dueDate,
      resultNotes: body.resultNotes,
      comment: body.comment,
      actorId: gate.user.itMemberId ?? undefined,
      actorName: gate.user.name,
    });
    if (!workOrder) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ workOrder });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui tugas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = requireWorkOrderUser(req);
  if ("error" in gate && gate.error) return gate.error;
  if (!canAssignWorkOrders(gate.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const result = deleteWorkOrder(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
