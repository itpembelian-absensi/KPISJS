import { randomUUID } from "crypto";
import { getDb } from "./db";
import type { MeetingItem, MeetingItemStatus, MeetingNote } from "./types";

const STATUSES = new Set<MeetingItemStatus>(["open", "in_progress", "done"]);

type NoteRow = {
  id: string;
  department_id: string;
  department_ids_json?: string | null;
  department_name: string | null;
  department_code: string | null;
  title: string;
  meeting_date: string;
  meeting_time: string;
  attendees: string;
  attendee_staff_ids_json?: string | null;
  external_attendees?: string | null;
  summary: string;
  created_by_user_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  meeting_id: string;
  topic: string;
  problem_detail?: string | null;
  detail: string;
  owner_staff_id?: string | null;
  owner_staff_ids_json?: string | null;
  department_ids_json?: string | null;
  owner_name: string;
  start_date?: string | null;
  due_date: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapItem(row: ItemRow): MeetingItem {
  const status: MeetingItemStatus = STATUSES.has(row.status as MeetingItemStatus)
    ? (row.status as MeetingItemStatus)
    : "open";
  const ownerStaffIds = parseDepartmentIds(
    row.owner_staff_ids_json,
    row.owner_staff_id || "",
  ).filter((id) => id !== "*");
  return {
    id: row.id,
    meetingId: row.meeting_id,
    topic: row.topic,
    problemDetail: row.problem_detail || "",
    detail: row.detail || "",
    departmentIds: parseDepartmentIds(row.department_ids_json, ""),
    ownerStaffIds,
    ownerStaffId: ownerStaffIds[0] || "",
    ownerName: row.owner_name || "",
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    status,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeItemDepartmentIds(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const ids = [...new Set(list.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.includes("*")) return ["*"];
  return ids;
}

function parseDepartmentIds(raw: string | null | undefined, fallback: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) {
      const ids = [...new Set(parsed.map((value) => String(value).trim()).filter(Boolean))];
      if (ids.includes("*")) return ["*"];
      if (ids.length > 0) return ids;
    }
  } catch {
    /* pakai fallback */
  }
  return fallback ? [fallback] : [];
}

function mapNote(row: NoteRow, items: MeetingItem[]): MeetingNote {
  const departmentIds = parseDepartmentIds(
    row.department_ids_json,
    row.department_id,
  );
  return {
    id: row.id,
    departmentId: departmentIds.includes("*") ? "*" : departmentIds[0] || row.department_id,
    departmentIds,
    departmentName: row.department_name || "",
    departmentCode: row.department_code || "",
    title: row.title,
    meetingDate: row.meeting_date,
    meetingTime: row.meeting_time || "",
    attendees: row.attendees || "",
    attendeeStaffIds: parseDepartmentIds(row.attendee_staff_ids_json, "").filter(
      (id) => id !== "*",
    ),
    externalAttendees: row.external_attendees || "",
    summary: row.summary || "",
    createdByUserId: row.created_by_user_id || "",
    createdByName: row.created_by_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export type MeetingItemInput = {
  id?: string;
  topic: string;
  problemDetail?: string;
  detail?: string;
  departmentIds?: string[];
  ownerStaffId?: string;
  ownerStaffIds?: string[];
  ownerName?: string;
  startDate?: string;
  dueDate?: string;
  status?: string;
};

export type MeetingInput = {
  id?: string;
  departmentId?: string;
  departmentIds?: string[];
  title: string;
  meetingDate: string;
  meetingTime?: string;
  attendees?: string;
  attendeeStaffIds?: string[];
  externalAttendees?: string;
  summary?: string;
  items?: MeetingItemInput[];
};

function loadItems(meetingIds: string[]): Map<string, MeetingItem[]> {
  const grouped = new Map<string, MeetingItem[]>();
  if (meetingIds.length === 0) return grouped;
  const placeholders = meetingIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT * FROM meeting_items
       WHERE meeting_id IN (${placeholders})
       ORDER BY sort_order, created_at`,
    )
    .all(...meetingIds) as ItemRow[];
  for (const row of rows) {
    const item = mapItem(row);
    const list = grouped.get(item.meetingId) ?? [];
    list.push(item);
    grouped.set(item.meetingId, list);
  }
  return grouped;
}

export function meetingMatchesScope(
  departmentIds: string[],
  scope: string[],
): boolean {
  if (departmentIds.includes("*")) return true;
  return departmentIds.some((id) => scope.includes(id));
}

export function listMeetingNotes(departmentIds?: string[]): MeetingNote[] {
  const db = getDb();
  const notes = db
    .prepare(
      `SELECT n.*, d.name AS department_name, d.code AS department_code
       FROM meeting_notes n
       LEFT JOIN departments d ON d.id = n.department_id
       ORDER BY n.meeting_date DESC, n.created_at DESC`,
    )
    .all() as NoteRow[];
  const items = loadItems(notes.map((n) => n.id));
  return notes
    .map((row) => mapNote(row, items.get(row.id) ?? []))
    .filter((note) =>
      departmentIds ? meetingMatchesScope(note.departmentIds, departmentIds) : true,
    );
}

export function getMeetingNote(id: string): MeetingNote | null {
  const row = getDb()
    .prepare(
      `SELECT n.*, d.name AS department_name, d.code AS department_code
       FROM meeting_notes n
       LEFT JOIN departments d ON d.id = n.department_id
       WHERE n.id = ?`,
    )
    .get(id) as NoteRow | undefined;
  if (!row) return null;
  return mapNote(row, loadItems([row.id]).get(row.id) ?? []);
}

function cleanItems(items: MeetingItemInput[] | undefined) {
  const cleaned: Array<{
    id: string;
    topic: string;
    problemDetail: string;
    detail: string;
    departmentIds: string[];
    ownerStaffIds: string[];
    ownerName: string;
    startDate: string;
    dueDate: string;
    status: MeetingItemStatus;
  }> = [];
  for (const raw of items ?? []) {
    const topic = String(raw.topic || "").trim();
    if (!topic) continue;
    const status = STATUSES.has(raw.status as MeetingItemStatus)
      ? (raw.status as MeetingItemStatus)
      : "open";
    const start = String(raw.startDate || "").slice(0, 10);
    const due = String(raw.dueDate || "").slice(0, 10);
    cleaned.push({
      id: raw.id && raw.id.length > 0 ? raw.id : randomUUID(),
      topic,
      problemDetail: String(raw.problemDetail || "").trim(),
      detail: String(raw.detail || "").trim(),
      departmentIds: normalizeItemDepartmentIds(raw.departmentIds),
      ownerStaffIds: [
        ...new Set(
          [
            ...(Array.isArray(raw.ownerStaffIds) ? raw.ownerStaffIds : []),
            raw.ownerStaffId || "",
          ]
            .map((id) => String(id).trim())
            .filter((id) => id && id !== "*"),
        ),
      ],
      ownerName: String(raw.ownerName || "").trim(),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : "",
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : "",
      status,
    });
  }
  return cleaned;
}

export function saveMeetingNote(
  input: MeetingInput,
  actor: { id: string; name: string },
): { meeting?: MeetingNote; error?: string } {
  const title = input.title.trim();
  const meetingDate = input.meetingDate.slice(0, 10);
  const requested = [
    ...(input.departmentIds ?? []),
    ...(input.departmentId ? [input.departmentId] : []),
  ];
  const departmentIds = [...new Set(requested.map((id) => id.trim()).filter(Boolean))];
  if (departmentIds.includes("*")) {
    departmentIds.splice(0, departmentIds.length, "*");
  }
  if (!title) return { error: "Judul notulen wajib diisi" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    return { error: "Tanggal meeting tidak valid" };
  }
  if (departmentIds.length === 0) return { error: "Pilih minimal satu departemen" };

  if (!departmentIds.includes("*")) {
    const known = getDb()
      .prepare(
        `SELECT id FROM departments WHERE id IN (${departmentIds.map(() => "?").join(", ")})`,
      )
      .all(...departmentIds) as Array<{ id: string }>;
    if (known.length !== departmentIds.length) {
      return { error: "Ada departemen yang tidak ditemukan" };
    }
  }
  const departmentId = departmentIds[0];
  const departmentIdsJson = JSON.stringify(departmentIds);
  const attendeeStaffIds = [
    ...new Set(
      (input.attendeeStaffIds ?? [])
        .map((id) => String(id).trim())
        .filter((id) => id && id !== "*"),
    ),
  ];
  const knownStaff =
    attendeeStaffIds.length === 0
      ? []
      : (getDb()
          .prepare(
            `SELECT id, name FROM staff WHERE id IN (${attendeeStaffIds.map(() => "?").join(", ")})`,
          )
          .all(...attendeeStaffIds) as Array<{ id: string; name: string }>);
  if (knownStaff.length !== attendeeStaffIds.length) {
    return { error: "Ada peserta karyawan yang tidak ditemukan" };
  }
  const externalAttendees = String(input.externalAttendees || "")
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .join(", ");
  const staffNameById = new Map(knownStaff.map((row) => [row.id, row.name]));
  const attendees = attendeeStaffIds
    .map((id) => staffNameById.get(id) || "")
    .filter(Boolean)
    .join(", ");

  const draftItems = cleanItems(input.items);
  const itemDepartmentIds = [
    ...new Set(
      draftItems.flatMap((item) => item.departmentIds).filter((id) => id !== "*"),
    ),
  ];
  if (itemDepartmentIds.length > 0) {
    const knownItemDepts = getDb()
      .prepare(
        `SELECT id FROM departments WHERE id IN (${itemDepartmentIds.map(() => "?").join(", ")})`,
      )
      .all(...itemDepartmentIds) as Array<{ id: string }>;
    if (knownItemDepts.length !== itemDepartmentIds.length) {
      return { error: "Ada departemen pada bahasan yang tidak ditemukan" };
    }
  }
  const invalidSchedule = draftItems.find(
    (item) => item.startDate && item.dueDate && item.startDate > item.dueDate,
  );
  if (invalidSchedule) {
    return {
      error: `Jadwal / Target selesai "${invalidSchedule.topic}" tidak boleh sebelum tanggal awal pembahasan`,
    };
  }
  const now = new Date().toISOString();
  const db = getDb();
  const existingId = input.id?.trim() || "";

  const tx = db.transaction(() => {
    let id = existingId;
    if (id) {
      const current = db
        .prepare("SELECT id FROM meeting_notes WHERE id = ?")
        .get(id) as { id: string } | undefined;
      if (!current) throw new Error("Notulen tidak ditemukan");
      db.prepare(
        `UPDATE meeting_notes SET
          department_id = ?, department_ids_json = ?, title = ?, meeting_date = ?,
          meeting_time = ?, attendees = ?, attendee_staff_ids_json = ?,
          external_attendees = ?, summary = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        departmentId,
        departmentIdsJson,
        title,
        meetingDate,
        String(input.meetingTime || "").trim(),
        attendees,
        JSON.stringify(attendeeStaffIds),
        externalAttendees,
        String(input.summary || "").trim(),
        now,
        id,
      );
    } else {
      id = randomUUID();
      db.prepare(
        `INSERT INTO meeting_notes (
          id, department_id, department_ids_json, title, meeting_date, meeting_time,
          attendees, attendee_staff_ids_json, external_attendees, summary,
          created_by_user_id, created_by_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        departmentId,
        departmentIdsJson,
        title,
        meetingDate,
        String(input.meetingTime || "").trim(),
        attendees,
        JSON.stringify(attendeeStaffIds),
        externalAttendees,
        String(input.summary || "").trim(),
        actor.id,
        actor.name,
        now,
        now,
      );
    }

    const owned = new Set(
      (
        db
          .prepare("SELECT id FROM meeting_items WHERE meeting_id = ?")
          .all(id) as Array<{ id: string }>
      ).map((row) => row.id),
    );
    const items = draftItems.map((item) =>
      owned.has(item.id) ? item : { ...item, id: randomUUID() },
    );

    const keep = items.map((item) => item.id);
    if (keep.length === 0) {
      db.prepare("DELETE FROM meeting_items WHERE meeting_id = ?").run(id);
    } else {
      db.prepare(
        `DELETE FROM meeting_items
         WHERE meeting_id = ? AND id NOT IN (${keep.map(() => "?").join(", ")})`,
      ).run(id, ...keep);
    }

    const upsert = db.prepare(
      `INSERT INTO meeting_items (
        id, meeting_id, topic, problem_detail, detail, owner_staff_id,
        owner_staff_ids_json, department_ids_json, owner_name,
        start_date, due_date, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        meeting_id = excluded.meeting_id,
        topic = excluded.topic,
        problem_detail = excluded.problem_detail,
        detail = excluded.detail,
        owner_staff_id = excluded.owner_staff_id,
        owner_staff_ids_json = excluded.owner_staff_ids_json,
        department_ids_json = excluded.department_ids_json,
        owner_name = excluded.owner_name,
        start_date = excluded.start_date,
        due_date = excluded.due_date,
        status = excluded.status,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at`,
    );
    const ownerIds = [
      ...new Set(items.flatMap((item) => item.ownerStaffIds)),
    ];
    const ownerRows =
      ownerIds.length === 0
        ? []
        : (db
            .prepare(
              `SELECT id, name FROM staff WHERE id IN (${ownerIds.map(() => "?").join(", ")})`,
            )
            .all(...ownerIds) as Array<{ id: string; name: string }>);
    const ownerNameById = new Map(ownerRows.map((row) => [row.id, row.name]));
    items.forEach((item, index) => {
      const ownerStaffIds = item.ownerStaffIds.filter((staffId) =>
        ownerNameById.has(staffId),
      );
      const ownerName = ownerStaffIds.length
        ? ownerStaffIds.map((staffId) => ownerNameById.get(staffId) || "").filter(Boolean).join(", ")
        : item.ownerName;
      upsert.run(
        item.id,
        id,
        item.topic,
        item.problemDetail,
        item.detail,
        ownerStaffIds[0] || "",
        JSON.stringify(ownerStaffIds),
        JSON.stringify(item.departmentIds),
        ownerName,
        item.startDate,
        item.dueDate,
        item.status,
        index,
        now,
        now,
      );
    });
    return id;
  });

  try {
    const id = tx();
    const meeting = getMeetingNote(id);
    if (!meeting) return { error: "Notulen gagal dimuat ulang" };
    return { meeting };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan notulen";
    return { error: message };
  }
}

export function meetingAccessByItem(
  itemId: string,
): { meetingId: string; departmentIds: string[] } | null {
  const row = getDb()
    .prepare(
      `SELECT i.meeting_id, n.department_id, n.department_ids_json
       FROM meeting_items i
       JOIN meeting_notes n ON n.id = i.meeting_id
       WHERE i.id = ?`,
    )
    .get(itemId) as
    | {
        meeting_id: string;
        department_id: string;
        department_ids_json?: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    meetingId: row.meeting_id,
    departmentIds: parseDepartmentIds(row.department_ids_json, row.department_id),
  };
}

export function updateMeetingItemStatus(
  itemId: string,
  status: string,
): { meeting?: MeetingNote; error?: string } {
  if (!STATUSES.has(status as MeetingItemStatus)) {
    return { error: "Status tidak valid" };
  }
  const row = getDb()
    .prepare("SELECT meeting_id FROM meeting_items WHERE id = ?")
    .get(itemId) as { meeting_id: string } | undefined;
  if (!row) return { error: "Bahasan tidak ditemukan" };
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "UPDATE meeting_items SET status = ?, updated_at = ? WHERE id = ?",
    )
    .run(status, now, itemId);
  const meeting = getMeetingNote(row.meeting_id);
  if (!meeting) return { error: "Notulen tidak ditemukan" };
  return { meeting };
}

export function deleteMeetingNote(id: string): { ok?: boolean; error?: string } {
  const current = getMeetingNote(id);
  if (!current) return { error: "Notulen tidak ditemukan" };
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM meeting_items WHERE meeting_id = ?").run(id);
    db.prepare("DELETE FROM meeting_notes WHERE id = ?").run(id);
  });
  tx();
  return { ok: true };
}

/** Tampilkan menu Notulen untuk user yang punya allowlist kustom. */
export function seedMeetingMenuIfMissing() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, role, allowed_menus_json FROM users
       WHERE allowed_menus_json IS NOT NULL AND trim(allowed_menus_json) != ''`,
    )
    .all() as Array<{ id: string; role: string; allowed_menus_json: string }>;
  const roles = new Set(["admin", "it_staff", "manager", "staff", "assessor"]);
  const update = db.prepare(
    "UPDATE users SET allowed_menus_json = ? WHERE id = ?",
  );
  for (const row of rows) {
    if (!roles.has(row.role)) continue;
    let menus: unknown;
    try {
      menus = JSON.parse(row.allowed_menus_json);
    } catch {
      continue;
    }
    if (!Array.isArray(menus) || menus.includes("/kpi/meetings")) continue;
    update.run(JSON.stringify([...menus, "/kpi/meetings"]), row.id);
  }
}
