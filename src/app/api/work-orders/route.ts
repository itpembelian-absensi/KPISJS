import { NextRequest, NextResponse } from "next/server";
import { canManageWorkOrders, SESSION_COOKIE } from "@/lib/auth";
import { getUserBySessionToken } from "@/lib/store";
import { createWorkOrder, listWorkOrders } from "@/lib/work-orders";
import type { WorkOrderPriority } from "@/lib/types";

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

export async function GET(req: NextRequest) {
  const gate = requireWorkOrderUser(req);
  if ("error" in gate && gate.error) return gate.error;
  const status = req.nextUrl.searchParams.get("status") || "all";
  const kpiFunctionId = req.nextUrl.searchParams.get("kpiFunctionId") || undefined;
  const assigneeId = req.nextUrl.searchParams.get("assigneeId") || undefined;
  return NextResponse.json({
    workOrders: listWorkOrders({
      status: status as "all",
      kpiFunctionId,
      assigneeId,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireWorkOrderUser(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    if (!body.title || !body.kpiFunctionId) {
      return NextResponse.json(
        { error: "Judul dan fungsi KPI wajib" },
        { status: 400 },
      );
    }
    const result = createWorkOrder({
      title: String(body.title),
      description: String(body.description || ""),
      kpiFunctionId: String(body.kpiFunctionId),
      priority: (body.priority || "medium") as WorkOrderPriority,
      requesterName:
        String(body.requesterName || "") || gate.user.name,
      requesterStaffId: body.requesterStaffId ?? gate.user.staffId,
      assigneeId: body.assigneeId || null,
      dueDate: body.dueDate || null,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ workOrder: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membuat perintah kerja";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
