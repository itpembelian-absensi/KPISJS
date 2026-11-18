import { randomUUID } from "crypto";
import { getDb } from "./db";
import type {
  MeetingItem,
  MeetingItemSession,
  MeetingItemStatus,
  MeetingNote,
} from "./types";

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
    sessions: [],
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

function mapNote(
  row: NoteRow,
  items: MeetingItem[],
  linkedItems: MeetingItem[] = [],
): MeetingNote {
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
    linkedItems,
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
  /** Id bahasan yang masih berjalan. Tidak dibuat ulang. */
  continuedFromId?: string;
  /** Catatan khusus tanggal meeting ini. */
  sessionNote?: string;
  /** Unggahan Excel: perbarui PIC, jadwal, dan status pada bahasan yang sama. */
  mergeIntoExisting?: boolean;
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
  const items = rows.map(mapItem);
  attachSessions(items);
  for (const item of items) {
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
  const noteIds = notes.map((n) => n.id);
  const items = loadItems(noteIds);
  const byId = new Map<string, MeetingItem>();
  for (const list of items.values()) {
    for (const item of list) byId.set(item.id, item);
  }
  const links = loadLinkedItemIds(noteIds);
  return notes
    .map((row) =>
      mapNote(
        row,
        items.get(row.id) ?? [],
        (links.get(row.id) ?? [])
          .map((itemId) => byId.get(itemId))
          .filter((item): item is MeetingItem => Boolean(item)),
      ),
    )
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
  const linkIds = loadLinkedItemIds([row.id]).get(row.id) ?? [];
  return mapNote(
    row,
    loadItems([row.id]).get(row.id) ?? [],
    loadItemsByIds(linkIds),
  );
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
    continuedFromId: string;
    sessionNote: string;
    mergeIntoExisting: boolean;
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
      continuedFromId: String(raw.continuedFromId || "").trim(),
      sessionNote: String(raw.sessionNote || "").trim(),
      mergeIntoExisting: Boolean(raw.mergeIntoExisting),
    });
  }
  return cleaned;
}

type SessionRow = {
  id: string;
  item_id: string;
  meeting_id: string;
  session_date: string;
  status: string;
  note: string;
  hidden?: number | null;
};

function mapSession(row: SessionRow): MeetingItemSession {
  const status: MeetingItemStatus = STATUSES.has(row.status as MeetingItemStatus)
    ? (row.status as MeetingItemStatus)
    : "open";
  return {
    id: row.id,
    meetingId: row.meeting_id || "",
    sessionDate: row.session_date || "",
    status,
    note: row.note || "",
    hidden: Number(row.hidden || 0) === 1,
  };
}

function loadSessions(itemIds: string[]): Map<string, MeetingItemSession[]> {
  const grouped = new Map<string, MeetingItemSession[]>();
  if (itemIds.length === 0) return grouped;
  const placeholders = itemIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT * FROM meeting_item_sessions
       WHERE item_id IN (${placeholders})
       ORDER BY session_date, created_at`,
    )
    .all(...itemIds) as SessionRow[];
  for (const row of rows) {
    const list = grouped.get(row.item_id) ?? [];
    list.push(mapSession(row));
    grouped.set(row.item_id, list);
  }
  return grouped;
}

function attachSessions(items: MeetingItem[]) {
  const sessions = loadSessions(items.map((item) => item.id));
  for (const item of items) {
    item.sessions = sessions.get(item.id) ?? [];
  }
}

function loadLinkedItemIds(meetingIds: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  if (meetingIds.length === 0) return grouped;
  const placeholders = meetingIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT s.meeting_id AS host_id, s.item_id AS item_id
       FROM meeting_item_sessions s
       JOIN meeting_items i ON i.id = s.item_id
       WHERE s.meeting_id IN (${placeholders})
         AND i.meeting_id != s.meeting_id
       ORDER BY s.session_date, s.created_at`,
    )
    .all(...meetingIds) as Array<{ host_id: string; item_id: string }>;
  for (const row of rows) {
    const list = grouped.get(row.host_id) ?? [];
    if (!list.includes(row.item_id)) list.push(row.item_id);
    grouped.set(row.host_id, list);
  }
  return grouped;
}

function loadItemsByIds(itemIds: string[]): MeetingItem[] {
  if (itemIds.length === 0) return [];
  const placeholders = itemIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT * FROM meeting_items WHERE id IN (${placeholders})`)
    .all(...itemIds) as ItemRow[];
  const items = rows.map(mapItem);
  attachSessions(items);
  const order = new Map(itemIds.map((id, index) => [id, index]));
  items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return items;
}

function sessionId(itemId: string, meetingId: string): string {
  return `${itemId}:${meetingId}`;
}

function appendUniqueText(current: string, next: string): string {
  const add = next.trim();
  if (!add) return current;
  if (!current.trim()) return add;
  if (current.includes(add)) return current;
  return `${current.trim()}\n${add}`;
}

function recordSession(
  db: ReturnType<typeof getDb>,
  itemId: string,
  meetingId: string,
  sessionDate: string,
  status: MeetingItemStatus,
  note: string,
  createdAt: string,
) {
  db.prepare(
      `INSERT INTO meeting_item_sessions (
        id, item_id, meeting_id, session_date, status, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        note = CASE
          WHEN excluded.note != '' THEN excluded.note
          ELSE meeting_item_sessions.note
        END`,
    )
    .run(sessionId(itemId, meetingId), itemId, meetingId, sessionDate, status, note, createdAt);
}

function applyImportedContinuation(
  db: ReturnType<typeof getDb>,
  hostMeetingId: string,
  meetingDate: string,
  item: {
    continuedFromId: string;
    problemDetail: string;
    detail: string;
    departmentIds: string[];
    ownerStaffIds: string[];
    ownerName: string;
    startDate: string;
    dueDate: string;
    status: MeetingItemStatus;
    sessionNote: string;
    mergeIntoExisting: boolean;
  },
  now: string,
): { sourceId: string; sourceMeetingId: string } | null {
  const source = db
    .prepare(
      `SELECT id, meeting_id, problem_detail, detail, department_ids_json,
              owner_staff_id, owner_staff_ids_json, owner_name, start_date, due_date
       FROM meeting_items WHERE id = ?`,
    )
    .get(item.continuedFromId) as
    | {
        id: string;
        meeting_id: string;
        problem_detail: string | null;
        detail: string | null;
        department_ids_json: string | null;
        owner_staff_id: string | null;
        owner_staff_ids_json: string | null;
        owner_name: string | null;
        start_date: string | null;
        due_date: string | null;
      }
    | undefined;
  if (!source) {
    throw new Error("Bahasan yang masih berjalan tidak ditemukan");
  }
  if (source.meeting_id === hostMeetingId && !item.mergeIntoExisting) return null;

  const latest = db
    .prepare(
      `SELECT session_date FROM meeting_item_sessions
       WHERE item_id = ? AND meeting_id != ? AND COALESCE(hidden, 0) = 0
       ORDER BY session_date DESC
       LIMIT 1`,
    )
    .get(source.id, hostMeetingId) as { session_date: string } | undefined;
  const isLatest = !latest || meetingDate >= latest.session_date;
  if (isLatest && item.mergeIntoExisting) {
    const departmentIds =
      item.departmentIds.length > 0
        ? item.departmentIds
        : parseDepartmentIds(source.department_ids_json, "");
    const ownerStaffIds =
      item.ownerStaffIds.length > 0
        ? item.ownerStaffIds
        : parseDepartmentIds(source.owner_staff_ids_json, source.owner_staff_id || "");
    db.prepare(
      `UPDATE meeting_items SET
        problem_detail = ?, detail = ?, department_ids_json = ?,
        owner_staff_id = ?, owner_staff_ids_json = ?, owner_name = ?,
        start_date = ?, due_date = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      appendUniqueText(source.problem_detail || "", item.problemDetail),
      appendUniqueText(source.detail || "", item.detail),
      JSON.stringify(departmentIds),
      ownerStaffIds[0] || "",
      JSON.stringify(ownerStaffIds),
      item.ownerStaffIds.length > 0
        ? item.ownerName || source.owner_name || ""
        : source.owner_name || "",
      item.startDate || source.start_date || "",
      item.dueDate || source.due_date || "",
      item.status,
      now,
      source.id,
    );
  } else if (isLatest) {
    db.prepare(
      "UPDATE meeting_items SET status = ?, updated_at = ? WHERE id = ?",
    ).run(item.status, now, source.id);
  }
  recordSession(
    db,
    source.id,
    hostMeetingId,
    meetingDate,
    item.status,
    item.sessionNote,
    now,
  );
  return { sourceId: source.id, sourceMeetingId: source.meeting_id };
}

export function saveMeetingNote(
  input: MeetingInput,
  actor: { id: string; name: string },
): { meeting?: MeetingNote; meetings?: MeetingNote[]; error?: string } {
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
    const ownedInput = draftItems.filter((item) => !item.continuedFromId);
    const continuedInput = draftItems.filter((item) => item.continuedFromId);
    const items = ownedInput.map((item) =>
      owned.has(item.id) ? item : { ...item, id: randomUUID() },
    );

    const keep = items.map((item) => item.id);
    const removedItems =
      keep.length === 0
        ? (db.prepare("SELECT id FROM meeting_items WHERE meeting_id = ?").all(id) as Array<{
            id: string;
          }>)
        : (db
            .prepare(
              `SELECT id FROM meeting_items
               WHERE meeting_id = ? AND id NOT IN (${keep.map(() => "?").join(", ")})`,
            )
            .all(id, ...keep) as Array<{ id: string }>);
    for (const row of removedItems) {
      db.prepare("DELETE FROM meeting_item_sessions WHERE item_id = ?").run(row.id);
    }
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
      recordSession(db, item.id, id, meetingDate, item.status, "", now);
    });

    const touchedMeetings = new Set<string>();
    const keepContinued = new Set<string>();
    for (const item of continuedInput) {
      const linked = applyImportedContinuation(db, id, meetingDate, item, now);
      if (!linked || linked.sourceMeetingId === id) continue;
      keepContinued.add(linked.sourceId);
      touchedMeetings.add(linked.sourceMeetingId);
    }

    const staleLinks = db
      .prepare(
        `SELECT s.item_id AS item_id
         FROM meeting_item_sessions s
         JOIN meeting_items i ON i.id = s.item_id
         WHERE s.meeting_id = ? AND i.meeting_id != ?`,
      )
      .all(id, id) as Array<{ item_id: string }>;
    for (const row of staleLinks) {
      if (!keepContinued.has(row.item_id)) {
        db.prepare("DELETE FROM meeting_item_sessions WHERE id = ?").run(
          sessionId(row.item_id, id),
        );
      }
    }

    return { id, touched: [...touchedMeetings] };
  });

  try {
    const saved = tx();
    const meeting = getMeetingNote(saved.id);
    if (!meeting) return { error: "Notulen gagal dimuat ulang" };
    const meetings = [
      meeting,
      ...saved.touched
        .filter((meetingId) => meetingId !== meeting.id)
        .map((meetingId) => getMeetingNote(meetingId))
        .filter((note): note is MeetingNote => Boolean(note)),
    ];
    return { meeting, meetings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan notulen";
    return { error: message };
  }
}

/** Tambah bahasan ke notulen yang sudah ada, tanpa menghapus bahasan lama. */
export function addImportedBahasan(
  meetingId: string,
  items: MeetingItemInput[],
): { meeting?: MeetingNote; meetings?: MeetingNote[]; error?: string } {
  const host = getMeetingNote(meetingId);
  if (!host) return { error: "Notulen tidak ditemukan" };
  const draft = cleanItems(items);
  const now = new Date().toISOString();
  const db = getDb();
  const tx = db.transaction(() => {
    const touched = new Set<string>();
    const maxRow = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS n FROM meeting_items WHERE meeting_id = ?",
      )
      .get(meetingId) as { n: number };
    let order = Number(maxRow.n) + 1;
    const insert = db.prepare(
      `INSERT INTO meeting_items (
        id, meeting_id, topic, problem_detail, detail, owner_staff_id,
        owner_staff_ids_json, department_ids_json, owner_name,
        start_date, due_date, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of draft) {
      if (item.continuedFromId) {
        const linked = applyImportedContinuation(
          db,
          meetingId,
          host.meetingDate,
          item,
          now,
        );
        if (linked && linked.sourceMeetingId !== meetingId) {
          touched.add(linked.sourceMeetingId);
        }
        continue;
      }
      insert.run(
        item.id,
        meetingId,
        item.topic,
        item.problemDetail,
        item.detail,
        item.ownerStaffIds[0] || "",
        JSON.stringify(item.ownerStaffIds),
        JSON.stringify(item.departmentIds),
        item.ownerName,
        item.startDate,
        item.dueDate,
        item.status,
        order,
        now,
        now,
      );
      order += 1;
      recordSession(db, item.id, meetingId, host.meetingDate, item.status, "", now);
    }
    db.prepare("UPDATE meeting_notes SET updated_at = ? WHERE id = ?").run(now, meetingId);
    return [...touched];
  });
  try {
    const touched = tx();
    const meeting = getMeetingNote(meetingId);
    if (!meeting) return { error: "Notulen gagal dimuat ulang" };
    const meetings = [
      meeting,
      ...touched
        .map((id) => getMeetingNote(id))
        .filter((note): note is MeetingNote => Boolean(note)),
    ];
    return { meeting, meetings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan bahasan";
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

export function updateMeetingItem(
  itemId: string,
  input: {
    topic: string;
    problemDetail: string;
    detail: string;
    departmentIds: string[];
    ownerStaffIds: string[];
    ownerName: string;
    startDate: string;
    dueDate: string;
    status: string;
  },
): { meetings?: MeetingNote[]; error?: string } {
  const topic = input.topic.trim();
  if (!topic) return { error: "Topik bahasan wajib diisi" };
  if (!STATUSES.has(input.status as MeetingItemStatus)) {
    return { error: "Status tidak valid" };
  }
  const startDate = input.startDate.slice(0, 10);
  const dueDate = input.dueDate.slice(0, 10);
  if (startDate && dueDate && startDate > dueDate) {
    return {
      error: "Jadwal / Target selesai tidak boleh sebelum tanggal awal pembahasan.",
    };
  }
  const db = getDb();
  const row = db
    .prepare("SELECT meeting_id FROM meeting_items WHERE id = ?")
    .get(itemId) as { meeting_id: string } | undefined;
  if (!row) return { error: "Bahasan tidak ditemukan" };

  const departmentIds: string[] = Array.from(
    new Set(input.departmentIds.map((id) => id.trim()).filter(Boolean)),
  );
  const requestedOwners: string[] = Array.from(
    new Set(input.ownerStaffIds.map((id) => id.trim()).filter(Boolean)),
  );
  const ownerRows =
    requestedOwners.length === 0
      ? []
      : (db
          .prepare(
            `SELECT id, name FROM staff WHERE id IN (${requestedOwners.map(() => "?").join(", ")})`,
          )
          .all(...requestedOwners) as Array<{ id: string; name: string }>);
  const nameById = new Map(ownerRows.map((person) => [person.id, person.name]));
  const ownerStaffIds = requestedOwners.filter((id) => nameById.has(id));
  const ownerName = ownerStaffIds.length
    ? ownerStaffIds
        .map((id) => nameById.get(id) || "")
        .filter(Boolean)
        .join(", ")
    : input.ownerName.trim();
  const now = new Date().toISOString();
  const status = input.status as MeetingItemStatus;
  db.prepare(
    `UPDATE meeting_items SET
      topic = ?, problem_detail = ?, detail = ?,
      owner_staff_id = ?, owner_staff_ids_json = ?, department_ids_json = ?,
      owner_name = ?, start_date = ?, due_date = ?, status = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    topic,
    input.problemDetail.trim(),
    input.detail.trim(),
    ownerStaffIds[0] || "",
    JSON.stringify(ownerStaffIds),
    JSON.stringify(departmentIds),
    ownerName,
    startDate,
    dueDate,
    status,
    now,
    itemId,
  );
  const latest = db
    .prepare(
      `SELECT id FROM meeting_item_sessions
       WHERE item_id = ? AND COALESCE(hidden, 0) = 0
       ORDER BY session_date DESC, created_at DESC
       LIMIT 1`,
    )
    .get(itemId) as { id: string } | undefined;
  if (latest) {
    db.prepare("UPDATE meeting_item_sessions SET status = ? WHERE id = ?").run(
      status,
      latest.id,
    );
  }
  const hosts = db
    .prepare(
      "SELECT DISTINCT meeting_id FROM meeting_item_sessions WHERE item_id = ?",
    )
    .all(itemId) as Array<{ meeting_id: string }>;
  const meetingIds = new Set<string>([
    row.meeting_id,
    ...hosts.map((host) => host.meeting_id),
  ]);
  const meetings = [...meetingIds]
    .map((id) => getMeetingNote(id))
    .filter((note): note is MeetingNote => Boolean(note));
  if (meetings.length === 0) return { error: "Notulen tidak ditemukan" };
  return { meetings };
}

/** Catat bahasan ini dibahas lagi pada tanggal yang diberikan, tanpa membuat notulen baru. */
export function markItemDiscussedOn(
  itemId: string,
  date: string,
): { meetings?: MeetingNote[]; date?: string; error?: string } {
  const day = String(date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Tanggal tidak valid" };
  const db = getDb();
  const row = db
    .prepare("SELECT meeting_id, status FROM meeting_items WHERE id = ?")
    .get(itemId) as { meeting_id: string; status: string } | undefined;
  if (!row) return { error: "Bahasan tidak ditemukan" };
  const status: MeetingItemStatus = STATUSES.has(row.status as MeetingItemStatus)
    ? (row.status as MeetingItemStatus)
    : "open";
  const existing = db
    .prepare(
      `SELECT id, hidden FROM meeting_item_sessions
       WHERE item_id = ? AND substr(session_date, 1, 10) = ?
       ORDER BY hidden ASC
       LIMIT 1`,
    )
    .get(itemId, day) as { id: string; hidden: number } | undefined;
  if (existing?.hidden) {
    db.prepare(
      "UPDATE meeting_item_sessions SET hidden = 0, status = ? WHERE id = ?",
    ).run(status, existing.id);
  } else if (!existing) {
    db.prepare(
      `INSERT INTO meeting_item_sessions (
        id, item_id, meeting_id, session_date, status, note, created_at, hidden
      ) VALUES (?, ?, ?, ?, ?, '', ?, 0)`,
    ).run(
      `${itemId}:date:${day}`,
      itemId,
      row.meeting_id,
      day,
      status,
      new Date().toISOString(),
    );
  }
  const meetings = meetingsTouchingItem(row.meeting_id, itemId);
  if (meetings.length === 0) return { error: "Notulen tidak ditemukan" };
  return { meetings, date: day };
}

/** Ubah atau sembunyikan satu tanggal pembahasan. toDate kosong berarti hapus. */
export function reviseItemDiscussionDate(
  itemId: string,
  fromDate: string,
  toDate: string,
): { meetings?: MeetingNote[]; error?: string } {
  const from = String(fromDate || "").slice(0, 10);
  const to = String(toDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return { error: "Tanggal tidak valid" };
  const removing = to.length === 0;
  if (!removing && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { error: "Tanggal tidak valid" };
  if (!removing && to === from) return { error: "Tanggal tidak berubah" };

  const db = getDb();
  const row = db
    .prepare("SELECT meeting_id, status FROM meeting_items WHERE id = ?")
    .get(itemId) as { meeting_id: string; status: string } | undefined;
  if (!row) return { error: "Bahasan tidak ditemukan" };

  const visible = db
    .prepare(
      `SELECT id FROM meeting_item_sessions
       WHERE item_id = ? AND substr(session_date, 1, 10) = ? AND COALESCE(hidden, 0) = 0`,
    )
    .all(itemId, from) as Array<{ id: string }>;

  if (!removing) {
    const clash = db
      .prepare(
        `SELECT id FROM meeting_item_sessions
         WHERE item_id = ? AND substr(session_date, 1, 10) = ? AND COALESCE(hidden, 0) = 0`,
      )
      .get(itemId, to) as { id: string } | undefined;
    if (clash) return { error: "Tanggal itu sudah tercatat" };
  }

  const status: MeetingItemStatus = STATUSES.has(row.status as MeetingItemStatus)
    ? (row.status as MeetingItemStatus)
    : "open";
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    if (visible.length === 0) {
      const meeting = db
        .prepare("SELECT meeting_date FROM meeting_notes WHERE id = ?")
        .get(row.meeting_id) as { meeting_date: string } | undefined;
      const meetingDay = String(meeting?.meeting_date || "").slice(0, 10);
      if (meetingDay !== from) throw new Error("Tanggal pembahasan tidak ditemukan");
      db.prepare(
        `INSERT INTO meeting_item_sessions (
          id, item_id, meeting_id, session_date, status, note, created_at, hidden
        ) VALUES (?, ?, ?, ?, ?, '', ?, 1)
        ON CONFLICT(id) DO UPDATE SET hidden = 1`,
      ).run(
        sessionId(itemId, row.meeting_id),
        itemId,
        row.meeting_id,
        from,
        status,
        now,
      );
      if (!removing) {
        db.prepare(
          `INSERT INTO meeting_item_sessions (
            id, item_id, meeting_id, session_date, status, note, created_at, hidden
          ) VALUES (?, ?, ?, ?, ?, '', ?, 0)
          ON CONFLICT(id) DO UPDATE SET session_date = excluded.session_date, hidden = 0`,
        ).run(
          `${itemId}:date:${to}`,
          itemId,
          row.meeting_id,
          to,
          status,
          now,
        );
      }
      return;
    }

    for (const session of visible) {
      if (removing) {
        db.prepare("UPDATE meeting_item_sessions SET hidden = 1 WHERE id = ?").run(session.id);
        continue;
      }
      if (session.id.includes(":date:")) {
        const nextId = `${itemId}:date:${to}`;
        const occupied = db
          .prepare("SELECT id, hidden FROM meeting_item_sessions WHERE id = ?")
          .get(nextId) as { id: string; hidden: number } | undefined;
        if (occupied && occupied.id !== session.id) {
          db.prepare("DELETE FROM meeting_item_sessions WHERE id = ?").run(session.id);
          db.prepare(
            "UPDATE meeting_item_sessions SET session_date = ?, hidden = 0 WHERE id = ?",
          ).run(to, occupied.id);
        } else {
          db.prepare(
            "UPDATE meeting_item_sessions SET id = ?, session_date = ?, hidden = 0 WHERE id = ?",
          ).run(nextId, to, session.id);
        }
        continue;
      }
      db.prepare(
        "UPDATE meeting_item_sessions SET session_date = ?, hidden = 0 WHERE id = ?",
      ).run(to, session.id);
    }
  });

  try {
    tx();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: message || "Gagal mengubah tanggal" };
  }

  const meetings = meetingsTouchingItem(row.meeting_id, itemId);
  if (meetings.length === 0) return { error: "Notulen tidak ditemukan" };
  return { meetings };
}

function meetingsTouchingItem(ownerMeetingId: string, itemId: string): MeetingNote[] {
  const hosts = getDb()
    .prepare("SELECT DISTINCT meeting_id FROM meeting_item_sessions WHERE item_id = ?")
    .all(itemId) as Array<{ meeting_id: string }>;
  const meetingIds = new Set<string>([
    ownerMeetingId,
    ...hosts.map((host) => host.meeting_id),
  ]);
  return [...meetingIds]
    .map((id) => getMeetingNote(id))
    .filter((note): note is MeetingNote => Boolean(note));
}

export function updateMeetingItemStatus(
  itemId: string,
  status: string,
): { meeting?: MeetingNote; meetings?: MeetingNote[]; error?: string } {
  if (!STATUSES.has(status as MeetingItemStatus)) {
    return { error: "Status tidak valid" };
  }
  const row = getDb()
    .prepare("SELECT meeting_id FROM meeting_items WHERE id = ?")
    .get(itemId) as { meeting_id: string } | undefined;
  if (!row) return { error: "Bahasan tidak ditemukan" };
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    "UPDATE meeting_items SET status = ?, updated_at = ? WHERE id = ?",
  ).run(status, now, itemId);
  const latest = db
    .prepare(
      `SELECT id FROM meeting_item_sessions
       WHERE item_id = ? AND COALESCE(hidden, 0) = 0
       ORDER BY session_date DESC, created_at DESC
       LIMIT 1`,
    )
    .get(itemId) as { id: string } | undefined;
  if (latest) {
    db.prepare("UPDATE meeting_item_sessions SET status = ? WHERE id = ?").run(
      status,
      latest.id,
    );
  }
  const hosts = db
    .prepare(
      "SELECT DISTINCT meeting_id FROM meeting_item_sessions WHERE item_id = ?",
    )
    .all(itemId) as Array<{ meeting_id: string }>;
  const meetingIds = new Set<string>([
    row.meeting_id,
    ...hosts.map((host) => host.meeting_id),
  ]);
  const meetings = [...meetingIds]
    .map((id) => getMeetingNote(id))
    .filter((note): note is MeetingNote => Boolean(note));
  const meeting = meetings.find((note) => note.id === row.meeting_id) ?? meetings[0];
  if (!meeting) return { error: "Notulen tidak ditemukan" };
  return { meeting, meetings };
}

export function deleteMeetingNote(id: string): { ok?: boolean; error?: string } {
  const current = getMeetingNote(id);
  if (!current) return { error: "Notulen tidak ditemukan" };
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM meeting_item_sessions
       WHERE meeting_id = ?
          OR item_id IN (SELECT id FROM meeting_items WHERE meeting_id = ?)`,
    ).run(id, id);
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
