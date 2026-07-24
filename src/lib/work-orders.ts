import { randomUUID } from "crypto";
import { getDb, getMeta, setMeta } from "./db";
import { listAgents, listKpiFunctions } from "./store";
import type {
  WorkOrder,
  WorkOrderEvent,
  WorkOrderPriority,
  WorkOrderStatus,
} from "./types";

type WorkOrderRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  kpi_function_id: string;
  priority: string;
  status: string;
  requester_name: string;
  requester_staff_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  result_notes: string | null;
  events_json: string;
};

function mapWorkOrder(row: WorkOrderRow): WorkOrder {
  let events: WorkOrderEvent[] = [];
  try {
    events = JSON.parse(row.events_json || "[]");
  } catch {
    events = [];
  }
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    kpiFunctionId: row.kpi_function_id,
    priority: row.priority as WorkOrderPriority,
    status: row.status as WorkOrderStatus,
    requesterName: row.requester_name,
    requesterStaffId: row.requester_staff_id,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    resultNotes: row.result_notes,
    events,
  };
}

function nextWorkOrderNumber(): number {
  const raw = getMeta("next_work_order_number");
  const current = raw ? Number(raw) : 1;
  return Number.isFinite(current) && current > 0 ? current : 1;
}

function bumpWorkOrderNumber(used: number) {
  setMeta("next_work_order_number", String(used + 1));
}

function insertWorkOrder(wo: WorkOrder) {
  getDb()
    .prepare(
      `INSERT INTO work_orders (
        id, code, title, description, kpi_function_id, priority, status,
        requester_name, requester_staff_id, assignee_id, due_date,
        created_at, updated_at, started_at, completed_at, result_notes, events_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      wo.id,
      wo.code,
      wo.title,
      wo.description,
      wo.kpiFunctionId,
      wo.priority,
      wo.status,
      wo.requesterName,
      wo.requesterStaffId,
      wo.assigneeId,
      wo.dueDate,
      wo.createdAt,
      wo.updatedAt,
      wo.startedAt,
      wo.completedAt,
      wo.resultNotes,
      JSON.stringify(wo.events),
    );
}

function updateWorkOrderRow(wo: WorkOrder) {
  getDb()
    .prepare(
      `UPDATE work_orders SET
        title = ?, description = ?, kpi_function_id = ?, priority = ?, status = ?,
        requester_name = ?, requester_staff_id = ?, assignee_id = ?, due_date = ?,
        updated_at = ?, started_at = ?, completed_at = ?, result_notes = ?, events_json = ?
       WHERE id = ?`,
    )
    .run(
      wo.title,
      wo.description,
      wo.kpiFunctionId,
      wo.priority,
      wo.status,
      wo.requesterName,
      wo.requesterStaffId,
      wo.assigneeId,
      wo.dueDate,
      wo.updatedAt,
      wo.startedAt,
      wo.completedAt,
      wo.resultNotes,
      JSON.stringify(wo.events),
      wo.id,
    );
}

export function listWorkOrders(filters?: {
  status?: WorkOrderStatus | "all" | "active" | "done_group";
  kpiFunctionId?: string;
  assigneeId?: string;
}): WorkOrder[] {
  // Ensure schema + seed via kpi list side-effect
  listKpiFunctions();
  let rows = getDb()
    .prepare("SELECT * FROM work_orders ORDER BY created_at DESC")
    .all() as WorkOrderRow[];
  let list = rows.map(mapWorkOrder);

  if (filters?.status && filters.status !== "all") {
    if (filters.status === "active") {
      list = list.filter((w) =>
        ["open", "in_progress", "pending"].includes(w.status),
      );
    } else if (filters.status === "done_group") {
      list = list.filter((w) => ["done", "cancelled"].includes(w.status));
    } else {
      list = list.filter((w) => w.status === filters.status);
    }
  }
  if (filters?.kpiFunctionId) {
    list = list.filter((w) => w.kpiFunctionId === filters.kpiFunctionId);
  }
  if (filters?.assigneeId === "unassigned") {
    list = list.filter((w) => !w.assigneeId);
  } else if (filters?.assigneeId) {
    list = list.filter((w) => w.assigneeId === filters.assigneeId);
  }
  return list;
}

export function getWorkOrder(id: string): WorkOrder | null {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM work_orders WHERE id = ? OR code = ?")
    .get(id, id) as WorkOrderRow | undefined;
  return row ? mapWorkOrder(row) : null;
}

export function createWorkOrder(input: {
  title: string;
  description: string;
  kpiFunctionId: string;
  priority: WorkOrderPriority;
  requesterName: string;
  requesterStaffId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
}): WorkOrder | { error: string } {
  const title = input.title.trim();
  if (!title) return { error: "Judul wajib diisi" };

  const fn = listKpiFunctions().find((f) => f.id === input.kpiFunctionId);
  if (!fn || !fn.active) return { error: "Fungsi KPI tidak valid" };

  const num = nextWorkOrderNumber();
  const year = new Date().getFullYear();
  const code = `WO-${year}-${String(num).padStart(4, "0")}`;
  const now = new Date().toISOString();

  const agents = listAgents();
  const assignee = input.assigneeId
    ? agents.find((a) => a.id === input.assigneeId)
    : undefined;

  const events: WorkOrderEvent[] = [
    {
      id: randomUUID(),
      at: now,
      type: "created",
      message: `Perintah kerja dibuat · ${fn.name}`,
    },
  ];

  if (assignee) {
    events.push({
      id: randomUUID(),
      at: now,
      type: "assigned",
      message: `Ditugaskan ke ${assignee.name}`,
      actorId: assignee.id,
      actorName: assignee.name,
    });
  }

  const wo: WorkOrder = {
    id: randomUUID(),
    code,
    title,
    description: input.description.trim(),
    kpiFunctionId: fn.id,
    priority: input.priority,
    status: "open",
    requesterName: input.requesterName.trim(),
    requesterStaffId: input.requesterStaffId ?? null,
    assigneeId: assignee?.id ?? null,
    dueDate: input.dueDate || null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    resultNotes: null,
    events,
  };

  insertWorkOrder(wo);
  bumpWorkOrderNumber(num);
  return wo;
}

export function updateWorkOrder(
  id: string,
  patch: {
    status?: WorkOrderStatus;
    assigneeId?: string | null;
    priority?: WorkOrderPriority;
    dueDate?: string | null;
    resultNotes?: string | null;
    comment?: string;
    actorId?: string;
    actorName?: string;
  },
): WorkOrder | null {
  const wo = getWorkOrder(id);
  if (!wo) return null;

  const now = new Date().toISOString();
  const agents = listAgents();
  const actor = patch.actorId
    ? agents.find((a) => a.id === patch.actorId)
    : undefined;
  const actorName = actor?.name ?? patch.actorName;

  if (patch.assigneeId !== undefined) {
    const agent = patch.assigneeId
      ? agents.find((a) => a.id === patch.assigneeId)
      : null;
    wo.assigneeId = agent?.id ?? null;
    wo.events.push({
      id: randomUUID(),
      at: now,
      type: "assigned",
      message: agent
        ? `Ditugaskan ke ${agent.name}`
        : "Assignment dibersihkan",
      actorId: actor?.id,
      actorName,
    });
  }

  if (patch.status && patch.status !== wo.status) {
    const prev = wo.status;
    wo.status = patch.status;
    if (
      (patch.status === "in_progress" || patch.status === "pending") &&
      !wo.startedAt
    ) {
      wo.startedAt = now;
    }
    if (patch.status === "done") {
      wo.completedAt = now;
      wo.events.push({
        id: randomUUID(),
        at: now,
        type: "completed",
        message: "Tugas diselesaikan",
        actorId: actor?.id,
        actorName,
      });
    } else if (patch.status === "cancelled") {
      wo.events.push({
        id: randomUUID(),
        at: now,
        type: "cancelled",
        message: "Tugas dibatalkan",
        actorId: actor?.id,
        actorName,
      });
    } else {
      wo.events.push({
        id: randomUUID(),
        at: now,
        type: "status_changed",
        message: `Status: ${prev} → ${patch.status}`,
        actorId: actor?.id,
        actorName,
      });
    }
  }

  if (patch.priority) wo.priority = patch.priority;
  if (patch.dueDate !== undefined) wo.dueDate = patch.dueDate;
  if (patch.resultNotes !== undefined) wo.resultNotes = patch.resultNotes;

  if (patch.comment) {
    wo.events.push({
      id: randomUUID(),
      at: now,
      type: "comment",
      message: patch.comment,
      actorId: actor?.id,
      actorName,
    });
  }

  wo.updatedAt = now;
  updateWorkOrderRow(wo);
  return wo;
}

export function deleteWorkOrder(id: string): { ok: true } | { error: string } {
  listKpiFunctions();
  const existing = getDb()
    .prepare("SELECT id FROM work_orders WHERE id = ? OR code = ?")
    .get(id, id) as { id: string } | undefined;
  if (!existing) return { error: "Tugas tidak ditemukan" };
  getDb().prepare("DELETE FROM work_orders WHERE id = ?").run(existing.id);
  return { ok: true };
}
