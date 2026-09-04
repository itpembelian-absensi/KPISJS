import { randomUUID } from "crypto";
import { SESSION_DAYS } from "./auth";
import { boolToInt, getDb, getMeta, intToBool, setMeta } from "./db";
import {
  defaultEmployeeExcelPath,
  parseEmployeeExcel,
  resolveDepartmentFromAttendance,
} from "./excel-import";
import { detectRepeat } from "./kpi";
import { templateForDepartmentCode } from "./kpi-templates";
import { PRIORITY_LABEL, slaDeadline } from "./sla";
import {
  deleteTicketUploadFolder,
  MAX_TICKET_PHOTOS,
  type TicketPhotoKind,
} from "./ticket-photos";
import {
  createSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./password";
import type {
  Agent,
  AppData,
  Department,
  ItMember,
  ItMemberType,
  ItServer,
  ItServerLog,
  SessionUser,
  StaffMember,
  Ticket,
  TicketCategory,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  UserAccount,
  UserRole,
  KpiFunction,
  PasswordResetRequest,
  PasswordResetStatus,
} from "./types";
import { USER_ROLES } from "./types";

type DeptRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: number;
};

type KpiFunctionRow = {
  id: string;
  department_id: string | null;
  name: string;
  weight_percent: number;
  focus: string;
  sort_order: number;
  active: number;
};

type StaffRow = {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  department_id: string;
  position: string;
  active: number;
};

type ItRow = {
  id: string;
  staff_id: string;
  type: ItMemberType;
  active: number;
};

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  staff_id: string | null;
  active: number;
  allowed_menus_json?: string | null;
  department_scope_json?: string | null;
  assessment_staff_ids_json?: string | null;
  created_at: string;
  updated_at: string;
};

type PasswordResetRow = {
  id: string;
  user_id: string;
  username: string;
  status: PasswordResetStatus;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

function mapPasswordReset(row: PasswordResetRow): PasswordResetRequest {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

function parseJsonStringArray(raw: string | null | undefined): string[] | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

type TicketRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester_name: string;
  requester_dept: string;
  requester_staff_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  satisfaction: number | null;
  is_repeat: number;
  related_ticket_id: string | null;
  root_cause: string | null;
  resolution: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  photo_urls_json?: string | null;
  work_photo_urls_json?: string | null;
  events_json: string;
};

function parseTicketPhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

function mapDepartment(row: DeptRow): Department {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    active: intToBool(row.active),
  };
}

function mapKpiFunction(row: KpiFunctionRow): KpiFunction {
  return {
    id: row.id,
    departmentId: row.department_id || "",
    name: row.name,
    weightPercent: Number(row.weight_percent),
    focus: row.focus,
    sortOrder: Number(row.sort_order),
    active: intToBool(row.active),
  };
}

function seedKpiFunctionsIfEmpty() {
  ensureDepartmentKpiTemplates();
}

/** Tampilkan menu SOP untuk user yang punya allowlist kustom (fitur baru per-departemen). */
function seedSopMenuIfMissing() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, role, allowed_menus_json FROM users
       WHERE allowed_menus_json IS NOT NULL AND trim(allowed_menus_json) != ''`,
    )
    .all() as Array<{ id: string; role: string; allowed_menus_json: string }>;
  const sopRoles = new Set([
    "admin",
    "it_staff",
    "manager",
    "staff",
    "assessor",
  ]);
  const update = db.prepare(
    "UPDATE users SET allowed_menus_json = ? WHERE id = ?",
  );
  for (const row of rows) {
    if (!sopRoles.has(row.role)) continue;
    let menus: unknown;
    try {
      menus = JSON.parse(row.allowed_menus_json);
    } catch {
      continue;
    }
    if (!Array.isArray(menus) || menus.includes("/master/sops")) continue;
    update.run(JSON.stringify([...menus, "/master/sops"]), row.id);
  }
}

/** Menu Logo Perusahaan untuk Admin/IT yang punya allowlist kustom. */
function seedBrandingMenuIfMissing() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, role, allowed_menus_json FROM users
       WHERE allowed_menus_json IS NOT NULL AND trim(allowed_menus_json) != ''`,
    )
    .all() as Array<{ id: string; role: string; allowed_menus_json: string }>;
  const update = db.prepare(
    "UPDATE users SET allowed_menus_json = ? WHERE id = ?",
  );
  for (const row of rows) {
    if (row.role !== "admin" && row.role !== "it_staff") continue;
    let menus: unknown;
    try {
      menus = JSON.parse(row.allowed_menus_json);
    } catch {
      continue;
    }
    if (!Array.isArray(menus) || menus.includes("/master/branding")) continue;
    update.run(JSON.stringify([...menus, "/master/branding"]), row.id);
  }
}

/** Menu Backup & Restore untuk Admin/IT yang punya allowlist kustom. */
function seedBackupMenuIfMissing() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, role, allowed_menus_json FROM users
       WHERE allowed_menus_json IS NOT NULL AND trim(allowed_menus_json) != ''`,
    )
    .all() as Array<{ id: string; role: string; allowed_menus_json: string }>;
  const update = db.prepare(
    "UPDATE users SET allowed_menus_json = ? WHERE id = ?",
  );
  for (const row of rows) {
    if (row.role !== "admin" && row.role !== "it_staff") continue;
    let menus: unknown;
    try {
      menus = JSON.parse(row.allowed_menus_json);
    } catch {
      continue;
    }
    if (!Array.isArray(menus) || menus.includes("/master/backup")) continue;
    update.run(JSON.stringify([...menus, "/master/backup"]), row.id);
  }
}

/** Pastikan setiap departemen aktif punya template fungsi KPI */
export function ensureDepartmentKpiTemplates() {
  const db = getDb();

  const depts = db
    .prepare("SELECT id, code FROM departments WHERE active = 1")
    .all() as Array<{ id: string; code: string }>;

  const insert = db.prepare(
    `INSERT INTO kpi_functions (id, department_id, name, weight_percent, focus, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );

  const tx = db.transaction(() => {
    for (const dept of depts) {
      const count = db
        .prepare(
          "SELECT COUNT(*) AS c FROM kpi_functions WHERE department_id = ?",
        )
        .get(dept.id) as { c: number };
      if (count.c > 0) continue;

      const template = templateForDepartmentCode(dept.code);
      for (const item of template) {
        insert.run(
          randomUUID(),
          dept.id,
          item.name,
          item.weightPercent,
          item.focus,
          item.sortOrder,
        );
      }
    }
  });
  tx();
}

function mapStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    departmentId: row.department_id,
    position: row.position,
    active: intToBool(row.active),
  };
}

function mapIt(row: ItRow): ItMember {
  return {
    id: row.id,
    staffId: row.staff_id,
    type: row.type,
    active: intToBool(row.active),
  };
}

function mapUser(row: UserRow): UserAccount {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    staffId: row.staff_id,
    active: intToBool(row.active),
    allowedMenus: parseJsonStringArray(row.allowed_menus_json),
    departmentScope: parseJsonStringArray(row.department_scope_json),
    assessmentStaffIds: parseJsonStringArray(row.assessment_staff_ids_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTicket(row: TicketRow): Ticket {
  let events: TicketEvent[] = [];
  try {
    events = JSON.parse(row.events_json) as TicketEvent[];
  } catch {
    events = [];
  }
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    requesterName: row.requester_name,
    requesterDept: row.requester_dept,
    requesterStaffId: row.requester_staff_id,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    firstResponseAt: row.first_response_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    satisfaction: row.satisfaction,
    isRepeat: intToBool(row.is_repeat),
    relatedTicketId: row.related_ticket_id,
    rootCause: row.root_cause,
    resolution: row.resolution,
    scheduledStart: row.scheduled_start ?? null,
    scheduledEnd: row.scheduled_end ?? null,
    photoUrls: parseTicketPhotoUrls(row.photo_urls_json),
    workPhotoUrls: parseTicketPhotoUrls(row.work_photo_urls_json),
    events,
  };
}

function hoursAgoIso(now: number, h: number) {
  return new Date(now - h * 60 * 60 * 1000).toISOString();
}

function nextTicketNumber(): number {
  const raw = getMeta("next_ticket_number");
  return raw ? Number(raw) : 1;
}

function bumpTicketNumber(current: number) {
  setMeta("next_ticket_number", String(current + 1));
}

function insertTicket(ticket: Ticket) {
  getDb()
    .prepare(
      `INSERT INTO tickets (
        id, code, title, description, category, priority, status,
        requester_name, requester_dept, requester_staff_id, assignee_id,
        created_at, updated_at, first_response_at, resolved_at, closed_at,
        satisfaction, is_repeat, related_ticket_id, root_cause, resolution,
        scheduled_start, scheduled_end, photo_urls_json, work_photo_urls_json, events_json
      ) VALUES (
        @id, @code, @title, @description, @category, @priority, @status,
        @requester_name, @requester_dept, @requester_staff_id, @assignee_id,
        @created_at, @updated_at, @first_response_at, @resolved_at, @closed_at,
        @satisfaction, @is_repeat, @related_ticket_id, @root_cause, @resolution,
        @scheduled_start, @scheduled_end, @photo_urls_json, @work_photo_urls_json, @events_json
      )`,
    )
    .run({
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      requester_name: ticket.requesterName,
      requester_dept: ticket.requesterDept,
      requester_staff_id: ticket.requesterStaffId,
      assignee_id: ticket.assigneeId,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      first_response_at: ticket.firstResponseAt,
      resolved_at: ticket.resolvedAt,
      closed_at: ticket.closedAt,
      satisfaction: ticket.satisfaction,
      is_repeat: boolToInt(ticket.isRepeat),
      related_ticket_id: ticket.relatedTicketId,
      root_cause: ticket.rootCause,
      resolution: ticket.resolution,
      scheduled_start: ticket.scheduledStart,
      scheduled_end: ticket.scheduledEnd,
      photo_urls_json: JSON.stringify(ticket.photoUrls ?? []),
      work_photo_urls_json: JSON.stringify(ticket.workPhotoUrls ?? []),
      events_json: JSON.stringify(ticket.events),
    });
}

function updateTicketRow(ticket: Ticket) {
  getDb()
    .prepare(
      `UPDATE tickets SET
        title = @title,
        description = @description,
        category = @category,
        priority = @priority,
        status = @status,
        requester_name = @requester_name,
        requester_dept = @requester_dept,
        requester_staff_id = @requester_staff_id,
        assignee_id = @assignee_id,
        updated_at = @updated_at,
        first_response_at = @first_response_at,
        resolved_at = @resolved_at,
        closed_at = @closed_at,
        satisfaction = @satisfaction,
        is_repeat = @is_repeat,
        related_ticket_id = @related_ticket_id,
        root_cause = @root_cause,
        resolution = @resolution,
        scheduled_start = @scheduled_start,
        scheduled_end = @scheduled_end,
        photo_urls_json = @photo_urls_json,
        work_photo_urls_json = @work_photo_urls_json,
        events_json = @events_json
      WHERE id = @id`,
    )
    .run({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      requester_name: ticket.requesterName,
      requester_dept: ticket.requesterDept,
      requester_staff_id: ticket.requesterStaffId,
      assignee_id: ticket.assigneeId,
      updated_at: ticket.updatedAt,
      first_response_at: ticket.firstResponseAt,
      resolved_at: ticket.resolvedAt,
      closed_at: ticket.closedAt,
      satisfaction: ticket.satisfaction,
      is_repeat: boolToInt(ticket.isRepeat),
      related_ticket_id: ticket.relatedTicketId,
      root_cause: ticket.rootCause,
      resolution: ticket.resolution,
      scheduled_start: ticket.scheduledStart,
      scheduled_end: ticket.scheduledEnd,
      photo_urls_json: JSON.stringify(ticket.photoUrls ?? []),
      work_photo_urls_json: JSON.stringify(ticket.workPhotoUrls ?? []),
      events_json: JSON.stringify(ticket.events),
    });
}

function itTeamToAgents(itTeam: ItMember[], staff: StaffMember[]): Agent[] {
  return itTeam
    .filter((m) => m.active)
    .map((m) => {
      const s = staff.find((x) => x.id === m.staffId);
      const role: Agent["role"] =
        m.type === "it_manager" ? "IT Manager" : "IT Staff";
      return {
        id: m.id,
        name: s?.name ?? "Unknown",
        role,
        email: s?.email ?? "",
        active: Boolean(s?.active && m.active),
        staffId: m.staffId,
      };
    })
    .filter((a) => a.active);
}

function seedIfEmpty() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const data = buildSeedData();
  const tx = db.transaction(() => {
    const insertDept = db.prepare(
      `INSERT INTO departments (id, code, name, description, active)
       VALUES (@id, @code, @name, @description, @active)`,
    );
    for (const d of data.departments) {
      insertDept.run({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        active: boolToInt(d.active),
      });
    }

    const insertStaff = db.prepare(
      `INSERT INTO staff (
        id, employee_code, name, email, phone, department_id, position, active
      ) VALUES (
        @id, @employee_code, @name, @email, @phone, @department_id, @position, @active
      )`,
    );
    for (const s of data.staff) {
      insertStaff.run({
        id: s.id,
        employee_code: s.employeeCode,
        name: s.name,
        email: s.email,
        phone: s.phone,
        department_id: s.departmentId,
        position: s.position,
        active: boolToInt(s.active),
      });
    }

    const insertIt = db.prepare(
      `INSERT INTO it_team (id, staff_id, type, active)
       VALUES (@id, @staff_id, @type, @active)`,
    );
    for (const m of data.itTeam) {
      insertIt.run({
        id: m.id,
        staff_id: m.staffId,
        type: m.type,
        active: boolToInt(m.active),
      });
    }

    const insertUser = db.prepare(
      `INSERT INTO users (
        id, username, password_hash, role, staff_id, active, created_at, updated_at
      ) VALUES (
        @id, @username, @password_hash, @role, @staff_id, @active, @created_at, @updated_at
      )`,
    );
    for (const u of data.users) {
      insertUser.run({
        id: u.id,
        username: u.username,
        password_hash: u.passwordHash,
        role: u.role,
        staff_id: u.staffId,
        active: boolToInt(u.active),
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      });
    }

    for (const t of data.tickets) insertTicket(t);
    setMeta("next_ticket_number", String(data.nextTicketNumber));
    setMeta("seeded_at", new Date().toISOString());
  });

  tx();
}

function buildSeedData(): AppData {
  const now = Date.now();
  const hoursAgo = (h: number) => hoursAgoIso(now, h);
  const ts = new Date().toISOString();

  const departments: Department[] = [
    {
      id: "dep-it",
      code: "IT",
      name: "Information Technology",
      description: "Divisi IT & sistem informasi",
      active: true,
    },
    {
      id: "dep-fin",
      code: "FIN",
      name: "Finance",
      description: "Keuangan & accounting",
      active: true,
    },
    {
      id: "dep-hrd",
      code: "HRD",
      name: "Human Resources",
      description: "SDM & administrasi karyawan",
      active: true,
    },
    {
      id: "dep-wh",
      code: "WH",
      name: "Warehouse",
      description: "Gudang & inventory",
      active: true,
    },
    {
      id: "dep-mkt",
      code: "MKT",
      name: "Marketing",
      description: "Pemasaran & penjualan",
      active: true,
    },
    {
      id: "dep-ops",
      code: "OPS",
      name: "Operations",
      description: "Operasional produksi",
      active: true,
    },
    {
      id: "dep-mtr",
      code: "MTR",
      name: "Mekanik",
      description: "Perawatan & perbaikan kendaraan / alat berat",
      active: true,
    },
  ];

  const staff: StaffMember[] = [
    {
      id: "st-admin",
      employeeCode: "EMP-001",
      name: "Admin SJS",
      email: "admin@sjs.local",
      phone: "08110000001",
      departmentId: "dep-it",
      position: "System Administrator",
      active: true,
    },
    {
      id: "st-andi",
      employeeCode: "EMP-002",
      name: "Andi Wijaya",
      email: "andi@sjs.local",
      phone: "08110000002",
      departmentId: "dep-it",
      position: "IT Manager",
      active: true,
    },
    {
      id: "st-budi",
      employeeCode: "EMP-003",
      name: "Budi Santoso",
      email: "budi@sjs.local",
      phone: "08110000003",
      departmentId: "dep-it",
      position: "IT Support",
      active: true,
    },
    {
      id: "st-siti",
      employeeCode: "EMP-004",
      name: "Siti Rahayu",
      email: "siti@sjs.local",
      phone: "08110000004",
      departmentId: "dep-it",
      position: "IT Support",
      active: true,
    },
    {
      id: "st-rina",
      employeeCode: "EMP-005",
      name: "Rina Finance",
      email: "rina@sjs.local",
      phone: "08110000005",
      departmentId: "dep-fin",
      position: "Staff Finance",
      active: true,
    },
    {
      id: "st-dewi",
      employeeCode: "EMP-006",
      name: "Dewi Sales",
      email: "dewi@sjs.local",
      phone: "08110000006",
      departmentId: "dep-mkt",
      position: "Manager Marketing",
      active: true,
    },
    {
      id: "st-agus",
      employeeCode: "EMP-007",
      name: "Agus Warehouse",
      email: "agus@sjs.local",
      phone: "08110000007",
      departmentId: "dep-wh",
      position: "Staff Warehouse",
      active: true,
    },
    {
      id: "st-hrd",
      employeeCode: "EMP-008",
      name: "HRD Admin",
      email: "hrd@sjs.local",
      phone: "08110000008",
      departmentId: "dep-hrd",
      position: "Staff HRD",
      active: true,
    },
  ];

  const itTeam: ItMember[] = [
    { id: "ag-3", staffId: "st-andi", type: "it_manager", active: true },
    { id: "ag-1", staffId: "st-budi", type: "it_staff", active: true },
    { id: "ag-2", staffId: "st-siti", type: "it_staff", active: true },
  ];

  const users: UserAccount[] = [
    {
      id: "usr-admin",
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      staffId: "st-admin",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "usr-manager",
      username: "manager",
      passwordHash: hashPassword("manager123"),
      role: "manager",
      staffId: "st-dewi",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "usr-staff",
      username: "staff",
      passwordHash: hashPassword("staff123"),
      role: "staff",
      staffId: "st-rina",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "usr-it",
      username: "itstaff",
      passwordHash: hashPassword("itstaff123"),
      role: "it_staff",
      staffId: "st-budi",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "usr-andi",
      username: "andi",
      passwordHash: hashPassword("andi123"),
      role: "manager",
      staffId: "st-andi",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "usr-siti",
      username: "siti",
      passwordHash: hashPassword("siti123"),
      role: "it_staff",
      staffId: "st-siti",
      active: true,
      allowedMenus: null,
      departmentScope: null,
      assessmentStaffIds: null,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const agents = itTeamToAgents(itTeam, staff);
  const mkEvent = (
    type: TicketEvent["type"],
    message: string,
    at: string,
    actor?: Agent,
  ): TicketEvent => ({
    id: randomUUID(),
    at,
    type,
    message,
    actorId: actor?.id,
    actorName: actor?.name,
  });

  const tickets: Ticket[] = [
    {
      id: "tk-1",
      code: "SJS-2026-0001",
      title: "Printer lantai 2 tidak bisa print",
      description:
        "Printer HP LaserJet di lantai 2 offline, user tidak bisa cetak dokumen.",
      category: "printer",
      priority: "medium",
      status: "in_progress",
      requesterName: "Rina Finance",
      requesterDept: "Finance",
      requesterStaffId: "st-rina",
      assigneeId: "ag-1",
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(2),
      firstResponseAt: hoursAgo(2.5),
      resolvedAt: null,
      closedAt: null,
      satisfaction: null,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: null,
      resolution: null,
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat", hoursAgo(3)),
        mkEvent("assigned", "Ditugaskan ke Budi Santoso", hoursAgo(2.5), agents[1]),
        mkEvent("status_changed", "Status: Dikerjakan", hoursAgo(2), agents[1]),
      ],
    },
    {
      id: "tk-2",
      code: "SJS-2026-0002",
      title: "Tidak bisa login email Outlook",
      description: "Password rejected, sudah coba reset via self-service gagal.",
      category: "email",
      priority: "high",
      status: "open",
      requesterName: "Dewi Sales",
      requesterDept: "Marketing",
      requesterStaffId: "st-dewi",
      assigneeId: null,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      satisfaction: null,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: null,
      resolution: null,
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [mkEvent("created", "Tiket dibuat — menunggu antrian", hoursAgo(1))],
    },
    {
      id: "tk-3",
      code: "SJS-2026-0003",
      title: "Internet mati di gudang",
      description: "Switch gudang tidak nyala, seluruh PC offline.",
      category: "network",
      priority: "critical",
      status: "resolved",
      requesterName: "Agus Warehouse",
      requesterDept: "Warehouse",
      requesterStaffId: "st-agus",
      assigneeId: "ag-2",
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(4.5),
      firstResponseAt: hoursAgo(5.8),
      resolvedAt: hoursAgo(4.5),
      closedAt: null,
      satisfaction: 5,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: "Kabel power switch longgar",
      resolution: "Kabel diganti, switch di-reboot, koneksi normal.",
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat", hoursAgo(6)),
        mkEvent("assigned", "Ditugaskan ke Siti Rahayu", hoursAgo(5.8), agents[2]),
        mkEvent("resolved", "Selesai dalam ~1.5 jam", hoursAgo(4.5), agents[2]),
        mkEvent("rated", "User satisfaction: 5/5", hoursAgo(4.4)),
      ],
    },
    {
      id: "tk-4",
      code: "SJS-2026-0004",
      title: "Printer lantai 2 error paper jam berulang",
      description:
        "Printer yang sama sering paper jam lagi setelah dibersihkan minggu lalu.",
      category: "printer",
      priority: "medium",
      status: "resolved",
      requesterName: "Rina Finance",
      requesterDept: "Finance",
      requesterStaffId: "st-rina",
      assigneeId: "ag-1",
      createdAt: hoursAgo(48),
      updatedAt: hoursAgo(40),
      firstResponseAt: hoursAgo(47),
      resolvedAt: hoursAgo(40),
      closedAt: hoursAgo(39),
      satisfaction: 3,
      isRepeat: true,
      relatedTicketId: "tk-1",
      rootCause: "Roller aus — perbaikan sementara saja",
      resolution: "Bersihkan roller; rekomendasi ganti sparepart.",
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat (indikasi repeat issue)", hoursAgo(48)),
        mkEvent("assigned", "Ditugaskan ke Budi Santoso", hoursAgo(47), agents[1]),
        mkEvent("resolved", "Selesai — tapi masalah berulang", hoursAgo(40), agents[1]),
        mkEvent("rated", "User satisfaction: 3/5", hoursAgo(39.5)),
      ],
    },
    {
      id: "tk-5",
      code: "SJS-2026-0005",
      title: "Akses ERP untuk karyawan baru",
      description: "Setup user ERP + email untuk karyawan baru HRD: Maya Putri.",
      category: "access",
      priority: "high",
      status: "resolved",
      requesterName: "HRD Admin",
      requesterDept: "Human Resources",
      requesterStaffId: "st-hrd",
      assigneeId: "ag-2",
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(28),
      firstResponseAt: hoursAgo(29.5),
      resolvedAt: hoursAgo(28),
      closedAt: hoursAgo(27),
      satisfaction: 5,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: null,
      resolution: "Email, ERP, WiFi, fingerprint dibuat H+0.",
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat", hoursAgo(30)),
        mkEvent("assigned", "Ditugaskan ke Siti Rahayu", hoursAgo(29.5), agents[2]),
        mkEvent("resolved", "Setup selesai H+0", hoursAgo(28), agents[2]),
      ],
    },
    {
      id: "tk-6",
      code: "SJS-2026-0006",
      title: "PC accounting lambat & sering hang",
      description: "PC desktop accounting sering freeze saat buka Excel besar.",
      category: "hardware",
      priority: "low",
      status: "pending",
      requesterName: "Rina Finance",
      requesterDept: "Finance",
      requesterStaffId: "st-rina",
      assigneeId: "ag-1",
      createdAt: hoursAgo(20),
      updatedAt: hoursAgo(18),
      firstResponseAt: hoursAgo(19),
      resolvedAt: null,
      closedAt: null,
      satisfaction: null,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: null,
      resolution: null,
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat", hoursAgo(20)),
        mkEvent("assigned", "Ditugaskan ke Budi Santoso", hoursAgo(19), agents[1]),
        mkEvent("status_changed", "Menunggu sparepart RAM", hoursAgo(18), agents[1]),
      ],
    },
    {
      id: "tk-7",
      code: "SJS-2026-0007",
      title: "VPN tidak connect dari rumah",
      description: "Error timeout saat connect VPN.",
      category: "network",
      priority: "high",
      status: "resolved",
      requesterName: "Dewi Sales",
      requesterDept: "Marketing",
      requesterStaffId: "st-dewi",
      assigneeId: "ag-3",
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(65),
      firstResponseAt: hoursAgo(71),
      resolvedAt: hoursAgo(65),
      closedAt: hoursAgo(64),
      satisfaction: 4,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: "Sertifikat VPN expired",
      resolution: "Renew cert + update config client.",
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [
        mkEvent("created", "Tiket dibuat", hoursAgo(72)),
        mkEvent("assigned", "Ditugaskan ke Andi Wijaya", hoursAgo(71), agents[0]),
        mkEvent("resolved", "VPN normal kembali", hoursAgo(65), agents[0]),
      ],
    },
    {
      id: "tk-8",
      code: "SJS-2026-0008",
      title: "Antivirus expired di 5 PC marketing",
      description: "License antivirus expired, warning muncul di desktop.",
      category: "security",
      priority: "high",
      status: "open",
      requesterName: "Dewi Sales",
      requesterDept: "Marketing",
      requesterStaffId: "st-dewi",
      assigneeId: null,
      createdAt: hoursAgo(0.5),
      updatedAt: hoursAgo(0.5),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      satisfaction: null,
      isRepeat: false,
      relatedTicketId: null,
      rootCause: null,
      resolution: null,
      scheduledStart: null,
      scheduledEnd: null,
      photoUrls: [],
      workPhotoUrls: [],
      events: [mkEvent("created", "Tiket dibuat — antrian baru", hoursAgo(0.5))],
    },
  ];

  return {
    departments,
    staff,
    itTeam,
    users,
    sessions: [],
    tickets,
    nextTicketNumber: 9,
  };
}

function migrateOrphanKpiFunctions() {
  const db = getDb();
  const it = db
    .prepare("SELECT id FROM departments WHERE code = 'IT' LIMIT 1")
    .get() as { id: string } | undefined;
  if (!it) return;
  db.prepare(
    `UPDATE kpi_functions
     SET department_id = ?
     WHERE department_id IS NULL OR trim(department_id) = ''`,
  ).run(it.id);
}

function ensureDb() {
  getDb();
  seedIfEmpty();
  migrateOrphanKpiFunctions();
  seedKpiFunctionsIfEmpty();
  seedSopMenuIfMissing();
  seedBrandingMenuIfMissing();
  seedBackupMenuIfMissing();
}

export function readData(): AppData {
  ensureDb();
  return {
    departments: listDepartments(),
    staff: listStaff(),
    itTeam: listItTeam(),
    users: (getDb().prepare("SELECT * FROM users").all() as UserRow[]).map(
      mapUser,
    ),
    sessions: (
      getDb().prepare("SELECT * FROM sessions").all() as Array<{
        id: string;
        token: string;
        user_id: string;
        created_at: string;
        expires_at: string;
      }>
    ).map((s) => ({
      id: s.id,
      token: s.token,
      userId: s.user_id,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    })),
    tickets: (getDb().prepare("SELECT * FROM tickets").all() as TicketRow[]).map(
      mapTicket,
    ),
    nextTicketNumber: nextTicketNumber(),
  };
}

export function resetSeed() {
  const db = getDb();
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM tickets;
    DELETE FROM work_orders;
    DELETE FROM kpi_assessments;
    DELETE FROM kpi_activities;
    DELETE FROM kpi_projects;
    DELETE FROM attendance_period_summaries;
    DELETE FROM attendance_records;
    DELETE FROM users;
    DELETE FROM it_team;
    DELETE FROM staff;
    DELETE FROM departments;
    DELETE FROM kpi_functions;
    DELETE FROM meta;
  `);
  seedIfEmpty();
  seedKpiFunctionsIfEmpty();
  return readData();
}

export function listDepartments(activeOnly = false): Department[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      activeOnly
        ? "SELECT * FROM departments WHERE active = 1 ORDER BY code"
        : "SELECT * FROM departments ORDER BY code",
    )
    .all() as DeptRow[];
  return rows.map(mapDepartment);
}

export function listKpiFunctions(
  activeOnly = false,
  departmentId?: string,
): KpiFunction[] {
  ensureDb();
  let sql = "SELECT * FROM kpi_functions";
  const where: string[] = [];
  const params: string[] = [];
  if (activeOnly) where.push("active = 1");
  if (departmentId) {
    where.push("department_id = ?");
    params.push(departmentId);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY sort_order, name";
  const rows = getDb().prepare(sql).all(...params) as KpiFunctionRow[];
  return rows.map(mapKpiFunction);
}

export function getKpiFunction(id: string): KpiFunction | null {
  ensureDb();
  const row = getDb()
    .prepare("SELECT * FROM kpi_functions WHERE id = ?")
    .get(id) as KpiFunctionRow | undefined;
  return row ? mapKpiFunction(row) : null;
}

export function upsertKpiFunction(
  input: Partial<KpiFunction> & {
    name: string;
    weightPercent: number;
    departmentId: string;
  },
): KpiFunction | { error: string } {
  ensureDb();
  const name = input.name.trim();
  const departmentId = input.departmentId?.trim();
  const weightPercent = Number(input.weightPercent);
  const focus = (input.focus ?? "").trim();
  const sortOrder = Number(input.sortOrder ?? 0);

  if (!name) return { error: "Nama fungsi wajib diisi" };
  if (!departmentId) return { error: "Departemen wajib dipilih" };
  if (!Number.isFinite(weightPercent) || weightPercent < 0 || weightPercent > 100) {
    return { error: "Bobot harus antara 0–100%" };
  }

  const dept = getDb()
    .prepare("SELECT id FROM departments WHERE id = ?")
    .get(departmentId) as { id: string } | undefined;
  if (!dept) return { error: "Departemen tidak ditemukan" };

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM kpi_functions WHERE id = ?")
      .get(input.id) as KpiFunctionRow | undefined;
    if (existing) {
      const duplicate = getDb()
        .prepare(
          `SELECT id FROM kpi_functions
           WHERE department_id = ? AND lower(name) = lower(?) AND id != ?`,
        )
        .get(departmentId, name, input.id) as { id: string } | undefined;
      if (duplicate) {
        return { error: `Fungsi "${name}" sudah ada di departemen ini` };
      }

      getDb()
        .prepare(
          `UPDATE kpi_functions
           SET department_id = ?, name = ?, weight_percent = ?, focus = ?, sort_order = ?, active = ?
           WHERE id = ?`,
        )
        .run(
          departmentId,
          name,
          weightPercent,
          focus || existing.focus,
          Number.isFinite(sortOrder) ? sortOrder : existing.sort_order,
          boolToInt(input.active ?? intToBool(existing.active)),
          input.id,
        );
      return mapKpiFunction(
        getDb()
          .prepare("SELECT * FROM kpi_functions WHERE id = ?")
          .get(input.id) as KpiFunctionRow,
      );
    }
  }

  const duplicate = getDb()
    .prepare(
      `SELECT id FROM kpi_functions
       WHERE department_id = ? AND lower(name) = lower(?)`,
    )
    .get(departmentId, name) as { id: string } | undefined;
  if (duplicate) {
    return { error: `Fungsi "${name}" sudah ada di departemen ini` };
  }

  const maxOrder = getDb()
    .prepare(
      "SELECT COALESCE(MAX(sort_order), 0) AS m FROM kpi_functions WHERE department_id = ?",
    )
    .get(departmentId) as { m: number };

  const item: KpiFunction = {
    id: randomUUID(),
    departmentId,
    name,
    weightPercent,
    focus,
    sortOrder:
      Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : maxOrder.m + 1,
    active: input.active ?? true,
  };

  getDb()
    .prepare(
      `INSERT INTO kpi_functions (id, department_id, name, weight_percent, focus, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.id,
      item.departmentId,
      item.name,
      item.weightPercent,
      item.focus,
      item.sortOrder,
      boolToInt(item.active),
    );
  return item;
}

export function deleteKpiFunction(
  id: string,
): { ok: true } | { error: string } {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT * FROM kpi_functions WHERE id = ?")
    .get(id) as KpiFunctionRow | undefined;
  if (!existing) return { error: "Fungsi KPI tidak ditemukan" };

  const woCount = getDb()
    .prepare("SELECT COUNT(*) AS c FROM work_orders WHERE kpi_function_id = ?")
    .get(id) as { c: number };
  if (woCount.c > 0) {
    return {
      error: `Tidak bisa dihapus: masih dipakai ${woCount.c} perintah kerja. Nonaktifkan saja, atau ubah perintah terkait dulu.`,
    };
  }

  const assessCount = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM kpi_assessments WHERE kpi_function_id = ?",
    )
    .get(id) as { c: number };
  if (assessCount.c > 0) {
    return {
      error: `Tidak bisa dihapus: masih ada ${assessCount.c} penilaian yang memakai fungsi ini. Hapus penilaian terkait dulu, atau nonaktifkan fungsi.`,
    };
  }

  const tx = getDb().transaction(() => {
    getDb()
      .prepare(
        "UPDATE kpi_projects SET kpi_function_id = NULL WHERE kpi_function_id = ?",
      )
      .run(id);
    getDb()
      .prepare(
        "UPDATE kpi_activities SET kpi_function_id = NULL WHERE kpi_function_id = ?",
      )
      .run(id);
    getDb().prepare("DELETE FROM kpi_functions WHERE id = ?").run(id);
  });
  tx();
  return { ok: true };
}

export function listStaff(activeOnly = false): StaffMember[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      activeOnly
        ? "SELECT * FROM staff WHERE active = 1 ORDER BY name"
        : "SELECT * FROM staff ORDER BY name",
    )
    .all() as StaffRow[];
  return rows.map(mapStaff);
}

export function listItTeam(activeOnly = false): ItMember[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      activeOnly
        ? "SELECT * FROM it_team WHERE active = 1"
        : "SELECT * FROM it_team",
    )
    .all() as ItRow[];
  return rows.map(mapIt);
}

export function listAgents(): Agent[] {
  return itTeamToAgents(listItTeam(true), listStaff(true));
}

export function getDepartmentName(departmentId: string): string {
  ensureDb();
  const row = getDb()
    .prepare("SELECT name FROM departments WHERE id = ?")
    .get(departmentId) as { name: string } | undefined;
  return row?.name ?? "—";
}

export function toSessionUser(user: UserAccount): SessionUser | null {
  if (!user.active) return null;
  const staff = user.staffId
    ? listStaff().find((s) => s.id === user.staffId)
    : null;
  const dept = staff
    ? listDepartments().find((d) => d.id === staff.departmentId)
    : null;
  const it = user.staffId
    ? listItTeam(true).find((m) => m.staffId === user.staffId)
    : null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: staff?.name ?? user.username,
    email: staff?.email ?? "",
    staffId: user.staffId,
    departmentId: staff?.departmentId ?? null,
    departmentName: dept?.name ?? null,
    itMemberId: it?.id ?? null,
    itType: it?.type ?? null,
    allowedMenus: user.allowedMenus,
    departmentScope: user.departmentScope,
    assessmentStaffIds: user.assessmentStaffIds,
  };
}

export function login(
  username: string,
  password: string,
): { token: string; user: SessionUser } | { error: string } {
  ensureDb();
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(username) as UserRow | undefined;
  if (!row || !intToBool(row.active)) {
    return { error: "Username atau password salah" };
  }
  const user = mapUser(row);
  if (!verifyPassword(password, user.passwordHash)) {
    return { error: "Username atau password salah" };
  }

  const sessionUser = toSessionUser(user);
  if (!sessionUser) return { error: "Akun tidak aktif" };

  const token = createSessionToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now.toISOString());
  db.prepare(
    `INSERT INTO sessions (id, token, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    hashToken(token),
    user.id,
    now.toISOString(),
    expires.toISOString(),
  );

  return { token, user: sessionUser };
}

const RESET_SUCCESS_MESSAGE =
  "Jika akun terdaftar, permintaan sudah dikirim ke Administrator. Password baru akan diatur oleh Admin atau IT Staf.";

/**
 * Ajukan reset password. Tidak mengubah password.
 * Pesan sukses sengaja sama meski username tidak ada (anti enumerasi).
 */
export function requestPasswordReset(
  usernameRaw: string,
): { ok: true; message: string } | { error: string } {
  ensureDb();
  const username = usernameRaw.trim().toLowerCase();
  if (!username) return { error: "Username wajib diisi" };

  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(username) as UserRow | undefined;
  if (!row || !intToBool(row.active)) {
    return { ok: true, message: RESET_SUCCESS_MESSAGE };
  }

  const now = new Date().toISOString();
  const existing = getDb()
    .prepare(
      `SELECT * FROM password_reset_requests
       WHERE user_id = ? AND status = 'pending'`,
    )
    .get(row.id) as PasswordResetRow | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE password_reset_requests SET requested_at = ?, username = ? WHERE id = ?`,
      )
      .run(now, row.username, existing.id);
    return { ok: true, message: RESET_SUCCESS_MESSAGE };
  }

  getDb()
    .prepare(
      `INSERT INTO password_reset_requests (
        id, user_id, username, status, requested_at, resolved_at, resolved_by
      ) VALUES (?, ?, ?, 'pending', ?, NULL, NULL)`,
    )
    .run(randomUUID(), row.id, row.username, now);

  return { ok: true, message: RESET_SUCCESS_MESSAGE };
}

export function listPendingPasswordResets(): PasswordResetRequest[] {
  ensureDb();
  return (
    getDb()
      .prepare(
        `SELECT * FROM password_reset_requests
         WHERE status = 'pending'
         ORDER BY requested_at DESC`,
      )
      .all() as PasswordResetRow[]
  ).map(mapPasswordReset);
}

function completePendingPasswordResets(userId: string, actorId?: string) {
  getDb()
    .prepare(
      `UPDATE password_reset_requests
       SET status = 'completed', resolved_at = ?, resolved_by = ?
       WHERE user_id = ? AND status = 'pending'`,
    )
    .run(new Date().toISOString(), actorId ?? null, userId);
}

export function rejectPasswordResetRequest(
  id: string,
  actorId: string,
): { ok: true } | { error: string } {
  ensureDb();
  const row = getDb()
    .prepare("SELECT * FROM password_reset_requests WHERE id = ?")
    .get(id) as PasswordResetRow | undefined;
  if (!row) return { error: "Permintaan tidak ditemukan" };
  if (row.status !== "pending") {
    return { error: "Permintaan ini sudah diselesaikan" };
  }
  getDb()
    .prepare(
      `UPDATE password_reset_requests
       SET status = 'rejected', resolved_at = ?, resolved_by = ?
       WHERE id = ?`,
    )
    .run(new Date().toISOString(), actorId, id);
  return { ok: true };
}

export function logout(token: string | undefined) {
  if (!token) return;
  ensureDb();
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(hashToken(token));
}

export function getUserBySessionToken(
  token: string | undefined,
): SessionUser | null {
  if (!token) return null;
  ensureDb();
  const hashed = hashToken(token);
  const session = getDb()
    .prepare("SELECT * FROM sessions WHERE token = ?")
    .get(hashed) as
    | {
        id: string;
        token: string;
        user_id: string;
        created_at: string;
        expires_at: string;
      }
    | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    return null;
  }
  const row = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.user_id) as UserRow | undefined;
  if (!row) return null;
  return toSessionUser(mapUser(row));
}

export function listUsers(): Omit<UserAccount, "passwordHash">[] {
  ensureDb();
  return (getDb().prepare("SELECT * FROM users ORDER BY username").all() as UserRow[])
    .map(mapUser)
    .map(({ passwordHash: _, ...rest }) => rest);
}

/** staffId yang terhubung akun role admin — tidak ikut penilaian KPI */
export function listAdminStaffIds(): string[] {
  return listUsers()
    .filter((u) => u.active && u.role === "admin" && u.staffId)
    .map((u) => u.staffId as string);
}

export function upsertDepartment(
  input: Partial<Department> & { code: string; name: string },
): Department | { error: string } {
  ensureDb();
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { error: "Kode dan nama wajib diisi" };

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(input.id) as DeptRow | undefined;
    if (existing) {
      const duplicate = getDb()
        .prepare(
          "SELECT id FROM departments WHERE lower(code) = lower(?) AND id != ?",
        )
        .get(code, input.id) as { id: string } | undefined;
      if (duplicate) {
        return { error: `Kode departemen "${code}" sudah dipakai` };
      }

      getDb()
        .prepare(
          `UPDATE departments
           SET code = ?, name = ?, description = ?, active = ?
           WHERE id = ?`,
        )
        .run(
          code,
          name,
          input.description ?? existing.description,
          boolToInt(input.active ?? intToBool(existing.active)),
          input.id,
        );
      return mapDepartment(
        getDb()
          .prepare("SELECT * FROM departments WHERE id = ?")
          .get(input.id) as DeptRow,
      );
    }
  }

  const duplicate = getDb()
    .prepare("SELECT id FROM departments WHERE lower(code) = lower(?)")
    .get(code) as { id: string } | undefined;
  if (duplicate) {
    return { error: `Kode departemen "${code}" sudah dipakai` };
  }

  const dept: Department = {
    id: randomUUID(),
    code,
    name,
    description: input.description ?? "",
    active: input.active ?? true,
  };
  getDb()
    .prepare(
      `INSERT INTO departments (id, code, name, description, active)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(dept.id, dept.code, dept.name, dept.description, boolToInt(dept.active));
  ensureDepartmentKpiTemplates();
  return dept;
}

export function upsertStaff(
  input: Partial<StaffMember> & {
    employeeCode: string;
    name: string;
    departmentId: string;
  },
): StaffMember {
  ensureDb();

  let existing: StaffRow | undefined;
  if (input.id) {
    existing = getDb()
      .prepare("SELECT * FROM staff WHERE id = ?")
      .get(input.id) as StaffRow | undefined;
  }
  if (!existing) {
    existing = getDb()
      .prepare("SELECT * FROM staff WHERE lower(employee_code) = lower(?)")
      .get(input.employeeCode) as StaffRow | undefined;
  }

  if (existing) {
    getDb()
      .prepare(
        `UPDATE staff SET
          employee_code = ?, name = ?, email = ?, phone = ?,
          department_id = ?, position = ?, active = ?
         WHERE id = ?`,
      )
      .run(
        input.employeeCode,
        input.name,
        input.email ?? existing.email,
        input.phone ?? existing.phone,
        input.departmentId,
        input.position ?? existing.position,
        boolToInt(input.active ?? intToBool(existing.active)),
        existing.id,
      );
    return mapStaff(
      getDb()
        .prepare("SELECT * FROM staff WHERE id = ?")
        .get(existing.id) as StaffRow,
    );
  }

  const member: StaffMember = {
    id: randomUUID(),
    employeeCode: input.employeeCode,
    name: input.name,
    email: input.email ?? "",
    phone: input.phone ?? "",
    departmentId: input.departmentId,
    position: input.position ?? "Staff",
    active: input.active ?? true,
  };
  getDb()
    .prepare(
      `INSERT INTO staff (
        id, employee_code, name, email, phone, department_id, position, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      member.id,
      member.employeeCode,
      member.name,
      member.email,
      member.phone,
      member.departmentId,
      member.position,
      boolToInt(member.active),
    );
  return member;
}

function findOrCreateDepartment(code: string, name: string): Department {
  ensureDb();
  const byCode = getDb()
    .prepare("SELECT * FROM departments WHERE lower(code) = lower(?)")
    .get(code) as DeptRow | undefined;
  if (byCode) return mapDepartment(byCode);

  const byName = getDb()
    .prepare("SELECT * FROM departments WHERE lower(name) = lower(?)")
    .get(name) as DeptRow | undefined;
  if (byName) return mapDepartment(byName);

  const created = upsertDepartment({
    code,
    name,
    description: `Otomatis dari impor absensi — ${name}`,
    active: true,
  });
  if ("error" in created) {
    throw new Error(created.error);
  }
  return created;
}

/** Tambah staf baru dari baris impor absensi jika NIK belum ada. */
export function ensureStaffFromAttendanceImport(input: {
  employeeCode: string;
  name: string;
  position?: string;
  jobLevel?: string;
  organization?: string;
}): { staff: StaffMember; created: boolean } {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT * FROM staff WHERE lower(employee_code) = lower(?)")
    .get(input.employeeCode) as StaffRow | undefined;
  if (existing) {
    return { staff: mapStaff(existing), created: false };
  }

  const depts = listDepartments();
  const mapped = resolveDepartmentFromAttendance({
    organization: input.organization ?? "",
    position: input.position ?? "",
    existing: depts.map((d) => ({ code: d.code, name: d.name })),
  });
  const dept = findOrCreateDepartment(mapped.code, mapped.name);
  const position = input.jobLevel
    ? `${input.position || "Staff"} (${input.jobLevel})`
    : input.position || "Staff";

  const staff = upsertStaff({
    employeeCode: input.employeeCode,
    name: input.name,
    departmentId: dept.id,
    position,
    active: true,
  });
  return { staff, created: true };
}

export function deleteStaff(id: string): { ok: true } | { error: string } {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT * FROM staff WHERE id = ?")
    .get(id) as StaffRow | undefined;
  if (!existing) return { error: "Staf tidak ditemukan" };

  const linkedUser = getDb()
    .prepare("SELECT username FROM users WHERE staff_id = ? LIMIT 1")
    .get(id) as { username: string } | undefined;
  if (linkedUser) {
    return {
      error: `Tidak bisa dihapus: masih terhubung ke user "${linkedUser.username}". Lepas link di User & Role dulu, atau nonaktifkan staf.`,
    };
  }

  const linkedIt = getDb()
    .prepare("SELECT id FROM it_team WHERE staff_id = ? LIMIT 1")
    .get(id) as { id: string } | undefined;
  if (linkedIt) {
    return {
      error:
        "Tidak bisa dihapus: masih terdaftar di Master Tim IT. Hapus dari Tim IT dulu, atau nonaktifkan staf.",
    };
  }

  const ticketCount = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM tickets WHERE requester_staff_id = ?",
    )
    .get(id) as { c: number };
  if (ticketCount.c > 0) {
    // Soft-delete saja agar histori tiket tetap utuh
    getDb().prepare("UPDATE staff SET active = 0 WHERE id = ?").run(id);
    return { ok: true };
  }

  getDb().prepare("DELETE FROM staff WHERE id = ?").run(id);
  return { ok: true };
}

function ensureDepartmentByCode(code: string, name: string): Department {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT * FROM departments WHERE lower(code) = lower(?)")
    .get(code) as DeptRow | undefined;
  if (existing) {
    if (existing.name !== name) {
      getDb()
        .prepare("UPDATE departments SET name = ?, active = 1 WHERE id = ?")
        .run(name, existing.id);
      return mapDepartment(
        getDb()
          .prepare("SELECT * FROM departments WHERE id = ?")
          .get(existing.id) as DeptRow,
      );
    }
    return mapDepartment(existing);
  }
  const created = upsertDepartment({
    code,
    name,
    description: `Diimpor dari Excel — ${name}`,
    active: true,
  });
  if ("error" in created) {
    throw new Error(created.error);
  }
  return created;
}

export function importStaffFromExcel(filePath?: string): {
  created: number;
  updated: number;
  departments: number;
  resigned: number;
  total: number;
  file: string;
} {
  ensureDb();
  const file = filePath || defaultEmployeeExcelPath();
  const rows = parseEmployeeExcel(file);

  let created = 0;
  let updated = 0;
  let resigned = 0;
  const deptCodes = new Set<string>();

  const tx = getDb().transaction(() => {
    for (const row of rows) {
      const dept = ensureDepartmentByCode(row.departmentCode, row.departmentName);
      deptCodes.add(dept.code);

      const before = getDb()
        .prepare("SELECT id FROM staff WHERE lower(employee_code) = lower(?)")
        .get(row.employeeCode) as { id: string } | undefined;

      upsertStaff({
        employeeCode: row.employeeCode,
        name: row.name,
        email: row.email,
        phone: row.phone,
        departmentId: dept.id,
        position: row.position,
        active: row.active,
      });

      if (!row.active) resigned += 1;
      if (before) updated += 1;
      else created += 1;
    }
  });

  tx();

  return {
    created,
    updated,
    departments: deptCodes.size,
    resigned,
    total: rows.length,
    file,
  };
}

export function upsertItMember(
  input: Partial<ItMember> & { staffId: string; type: ItMemberType },
): ItMember | { error: string } {
  ensureDb();
  const staff = getDb()
    .prepare("SELECT id FROM staff WHERE id = ?")
    .get(input.staffId) as { id: string } | undefined;
  if (!staff) return { error: "Staf tidak ditemukan" };

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM it_team WHERE id = ?")
      .get(input.id) as ItRow | undefined;
    if (existing) {
      getDb()
        .prepare(
          `UPDATE it_team SET staff_id = ?, type = ?, active = ? WHERE id = ?`,
        )
        .run(
          input.staffId,
          input.type,
          boolToInt(input.active ?? intToBool(existing.active)),
          input.id,
        );
      return mapIt(
        getDb().prepare("SELECT * FROM it_team WHERE id = ?").get(input.id) as ItRow,
      );
    }
  }

  const exists = getDb()
    .prepare("SELECT id FROM it_team WHERE staff_id = ? AND active = 1")
    .get(input.staffId) as { id: string } | undefined;
  if (exists) return { error: "Staf ini sudah terdaftar di tim IT" };

  const member: ItMember = {
    id: randomUUID(),
    staffId: input.staffId,
    type: input.type,
    active: input.active ?? true,
  };
  getDb()
    .prepare(
      `INSERT INTO it_team (id, staff_id, type, active) VALUES (?, ?, ?, ?)`,
    )
    .run(member.id, member.staffId, member.type, boolToInt(member.active));
  return member;
}

export function upsertUser(input: {
  id?: string;
  username: string;
  password?: string;
  role: UserRole;
  staffId: string | null;
  active?: boolean;
  /** null = ikuti role; array = custom allowlist */
  allowedMenus?: string[] | null;
  /** null = ikuti role; ["*"] = semua; id[] = terbatas */
  departmentScope?: string[] | null;
  /** Staf dept lain yang boleh dinilai (manager/penilai); [] = hanya dept sendiri */
  assessmentStaffIds?: string[] | null;
  /** User yang sedang login (untuk audit reset password) */
  actorId?: string;
}): Omit<UserAccount, "passwordHash"> | { error: string } {
  ensureDb();
  const username = input.username.trim().toLowerCase();
  if (!username) return { error: "Username wajib diisi" };
  if (!USER_ROLES.includes(input.role)) {
    return { error: "Role tidak valid" };
  }
  if (input.password != null && input.password !== "" && input.password.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }

  const duplicate = getDb()
    .prepare("SELECT id FROM users WHERE lower(username) = ? AND id != ?")
    .get(username, input.id ?? "") as { id: string } | undefined;
  if (duplicate) return { error: "Username sudah dipakai" };

  const now = new Date().toISOString();
  const menusJson =
    input.allowedMenus === undefined
      ? undefined
      : input.allowedMenus == null
        ? null
        : JSON.stringify(input.allowedMenus);
  const scopeJson =
    input.departmentScope === undefined
      ? undefined
      : input.departmentScope == null
        ? null
        : JSON.stringify(input.departmentScope);
  const assessJson =
    input.assessmentStaffIds === undefined
      ? undefined
      : input.assessmentStaffIds == null
        ? null
        : JSON.stringify(input.assessmentStaffIds);

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(input.id) as UserRow | undefined;
    if (!existing) return { error: "User tidak ditemukan" };

    getDb()
      .prepare(
        `UPDATE users SET
          username = ?, role = ?, staff_id = ?, active = ?,
          allowed_menus_json = ?, department_scope_json = ?,
          assessment_staff_ids_json = ?,
          updated_at = ?, password_hash = ?
         WHERE id = ?`,
      )
      .run(
        username,
        input.role,
        input.staffId,
        boolToInt(input.active ?? intToBool(existing.active)),
        menusJson === undefined ? existing.allowed_menus_json ?? null : menusJson,
        scopeJson === undefined
          ? existing.department_scope_json ?? null
          : scopeJson,
        assessJson === undefined
          ? existing.assessment_staff_ids_json ?? null
          : assessJson,
        now,
        input.password ? hashPassword(input.password) : existing.password_hash,
        input.id,
      );

    if (input.password) {
      completePendingPasswordResets(input.id, input.actorId);
      if (input.actorId !== input.id) {
        getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(input.id);
      }
    }

    const updated = mapUser(
      getDb().prepare("SELECT * FROM users WHERE id = ?").get(input.id) as UserRow,
    );
    const { passwordHash: _, ...rest } = updated;
    return rest;
  }

  if (!input.password) return { error: "Password wajib untuk user baru" };

  const user: UserAccount = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    staffId: input.staffId,
    active: input.active ?? true,
    allowedMenus: input.allowedMenus ?? null,
    departmentScope: input.departmentScope ?? null,
    assessmentStaffIds: input.assessmentStaffIds ?? null,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO users (
        id, username, password_hash, role, staff_id, active,
        allowed_menus_json, department_scope_json, assessment_staff_ids_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.id,
      user.username,
      user.passwordHash,
      user.role,
      user.staffId,
      boolToInt(user.active),
      user.allowedMenus == null ? null : JSON.stringify(user.allowedMenus),
      user.departmentScope == null
        ? null
        : JSON.stringify(user.departmentScope),
      user.assessmentStaffIds == null
        ? null
        : JSON.stringify(user.assessmentStaffIds),
      user.createdAt,
      user.updatedAt,
    );
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export function deleteUser(
  id: string,
  actorId?: string,
): { ok: true } | { error: string } {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  if (!existing) return { error: "User tidak ditemukan" };

  if (actorId && actorId === id) {
    return { error: "Tidak bisa menghapus akun yang sedang dipakai login" };
  }

  if (existing.role === "admin") {
    const adminCount = getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1",
      )
      .get() as { c: number };
    if (adminCount.c <= 1 && intToBool(existing.active)) {
      return { error: "Tidak bisa menghapus admin terakhir yang aktif" };
    }
  }

  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  return { ok: true };
}

export function listTickets(filters?: {
  status?: TicketStatus | "all" | "active";
  priority?: TicketPriority | "all";
  assigneeId?: string | "all" | "unassigned";
  q?: string;
  requesterStaffId?: string;
}): Ticket[] {
  ensureDb();
  let list = (getDb().prepare("SELECT * FROM tickets").all() as TicketRow[]).map(
    mapTicket,
  );

  if (filters?.requesterStaffId) {
    list = list.filter((t) => t.requesterStaffId === filters.requesterStaffId);
  }
  if (filters?.status && filters.status !== "all") {
    if (filters.status === "active") {
      list = list.filter((t) =>
        ["open", "in_progress", "pending"].includes(t.status),
      );
    } else {
      list = list.filter((t) => t.status === filters.status);
    }
  }
  if (filters?.priority && filters.priority !== "all") {
    list = list.filter((t) => t.priority === filters.priority);
  }
  if (filters?.assigneeId && filters.assigneeId !== "all") {
    if (filters.assigneeId === "unassigned") {
      list = list.filter((t) => !t.assigneeId);
    } else {
      list = list.filter((t) => t.assigneeId === filters.assigneeId);
    }
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }

  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getTicket(id: string): Ticket | null {
  ensureDb();
  const row = getDb()
    .prepare("SELECT * FROM tickets WHERE id = ? OR code = ?")
    .get(id, id) as TicketRow | undefined;
  return row ? mapTicket(row) : null;
}

export function createTicket(input: {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  requesterName: string;
  requesterDept: string;
  requesterStaffId?: string | null;
  assigneeId?: string | null;
}): Ticket {
  ensureDb();
  const num = nextTicketNumber();
  const year = new Date().getFullYear();
  const code = `SJS-${year}-${String(num).padStart(4, "0")}`;
  const now = new Date().toISOString();
  const existingTickets = listTickets();
  const repeat = detectRepeat(
    existingTickets,
    input.category,
    input.title,
    input.requesterName,
  );

  const agents = listAgents();
  let assignee: Agent | undefined;
  if (input.assigneeId) {
    assignee = agents.find((a) => a.id === input.assigneeId);
  }

  const events: TicketEvent[] = [
    {
      id: randomUUID(),
      at: now,
      type: "created",
      message: repeat.isRepeat
        ? "Tiket dibuat — terdeteksi kemungkinan repeat issue"
        : "Tiket dibuat",
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

  const ticket: Ticket = {
    id: randomUUID(),
    code,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: assignee ? "in_progress" : "open",
    requesterName: input.requesterName,
    requesterDept: input.requesterDept,
    requesterStaffId: input.requesterStaffId ?? null,
    assigneeId: assignee?.id ?? null,
    createdAt: now,
    updatedAt: now,
    firstResponseAt: assignee ? now : null,
    resolvedAt: null,
    closedAt: null,
    satisfaction: null,
    isRepeat: repeat.isRepeat,
    relatedTicketId: repeat.relatedTicketId,
    rootCause: null,
    resolution: null,
    scheduledStart: null,
    scheduledEnd: null,
    photoUrls: [],
    workPhotoUrls: [],
    events,
  };

  insertTicket(ticket);
  bumpTicketNumber(num);
  return ticket;
}

export function appendTicketPhotos(
  ticketId: string,
  urls: string[],
  kind: TicketPhotoKind = "request",
  maxTotal = MAX_TICKET_PHOTOS,
): Ticket | { error: string } {
  ensureDb();
  const ticket = getTicket(ticketId);
  if (!ticket) return { error: "Tiket tidak ditemukan" };
  const current =
    kind === "work" ? ticket.workPhotoUrls : ticket.photoUrls;
  if (current.length + urls.length > maxTotal) {
    return {
      error: `Maksimal ${maxTotal} foto ${kind === "work" ? "pekerjaan" : "laporan"} (sudah ${current.length})`,
    };
  }
  if (kind === "work") {
    ticket.workPhotoUrls = [...current, ...urls];
  } else {
    ticket.photoUrls = [...current, ...urls];
  }
  ticket.updatedAt = new Date().toISOString();
  updateTicketRow(ticket);
  return ticket;
}

export function removeTicketPhoto(
  ticketId: string,
  url: string,
  kind: TicketPhotoKind = "request",
): Ticket | { error: string } {
  ensureDb();
  const ticket = getTicket(ticketId);
  if (!ticket) return { error: "Tiket tidak ditemukan" };
  if (kind === "work") {
    ticket.workPhotoUrls = ticket.workPhotoUrls.filter((u) => u !== url);
  } else {
    ticket.photoUrls = ticket.photoUrls.filter((u) => u !== url);
  }
  ticket.updatedAt = new Date().toISOString();
  updateTicketRow(ticket);
  return ticket;
}

export function updateTicket(
  id: string,
  patch: {
    status?: TicketStatus;
    assigneeId?: string | null;
    priority?: TicketPriority;
    resolution?: string | null;
    rootCause?: string | null;
    satisfaction?: number | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    comment?: string;
    actorId?: string;
  },
): Ticket | null {
  ensureDb();
  const ticket = getTicket(id);
  if (!ticket) return null;

  const now = new Date().toISOString();
  const agents = listAgents();
  const actor = patch.actorId
    ? agents.find((a) => a.id === patch.actorId)
    : undefined;

  if (patch.assigneeId !== undefined) {
    const agent = patch.assigneeId
      ? agents.find((a) => a.id === patch.assigneeId)
      : null;
    ticket.assigneeId = agent?.id ?? null;
    ticket.events.push({
      id: randomUUID(),
      at: now,
      type: "assigned",
      message: agent ? `Ditugaskan ke ${agent.name}` : "Assignment dilepas",
      actorId: actor?.id,
      actorName: actor?.name,
    });
    if (agent && !ticket.firstResponseAt) ticket.firstResponseAt = now;
    if (agent && ticket.status === "open") ticket.status = "in_progress";
  }

  if (patch.status && patch.status !== ticket.status) {
    const prev = ticket.status;
    ticket.status = patch.status;
    ticket.events.push({
      id: randomUUID(),
      at: now,
      type: "status_changed",
      message: `Status: ${prev} → ${patch.status}`,
      actorId: actor?.id,
      actorName: actor?.name,
    });

    if (patch.status === "resolved" || patch.status === "closed") {
      if (!ticket.resolvedAt) ticket.resolvedAt = now;
      if (patch.status === "closed") ticket.closedAt = now;
      ticket.events.push({
        id: randomUUID(),
        at: now,
        type: "resolved",
        message: "Tiket diselesaikan",
        actorId: actor?.id,
        actorName: actor?.name,
      });
    }
    if (patch.status === "in_progress" || patch.status === "pending") {
      if (!ticket.scheduledStart) {
        ticket.scheduledStart = ticket.firstResponseAt || now;
      }
      if (!ticket.scheduledEnd) {
        ticket.scheduledEnd = slaDeadline(
          ticket.createdAt,
          ticket.priority,
        ).toISOString();
      }
    }
    if (patch.status === "open" || patch.status === "in_progress") {
      if (prev === "resolved" || prev === "closed") {
        ticket.resolvedAt = null;
        ticket.closedAt = null;
        ticket.events.push({
          id: randomUUID(),
          at: now,
          type: "reopened",
          message: "Tiket dibuka kembali",
          actorId: actor?.id,
          actorName: actor?.name,
        });
      }
    }
  }

  if (patch.priority && patch.priority !== ticket.priority) {
    const prev = ticket.priority;
    ticket.priority = patch.priority;
    ticket.events.push({
      id: randomUUID(),
      at: now,
      type: "comment",
      message: `Prioritas: ${PRIORITY_LABEL[prev]} → ${PRIORITY_LABEL[patch.priority]}`,
      actorId: actor?.id,
      actorName: actor?.name,
    });
    // Sesuaikan target SLA jika tiket masih terbuka
    if (
      ticket.status === "open" ||
      ticket.status === "in_progress" ||
      ticket.status === "pending"
    ) {
      ticket.scheduledEnd = slaDeadline(
        ticket.createdAt,
        ticket.priority,
      ).toISOString();
    }
  }
  if (patch.resolution !== undefined) ticket.resolution = patch.resolution;
  if (patch.rootCause !== undefined) ticket.rootCause = patch.rootCause;
  if (patch.scheduledStart !== undefined) ticket.scheduledStart = patch.scheduledStart;
  if (patch.scheduledEnd !== undefined) ticket.scheduledEnd = patch.scheduledEnd;

  if (patch.satisfaction != null) {
    ticket.satisfaction = patch.satisfaction;
    ticket.events.push({
      id: randomUUID(),
      at: now,
      type: "rated",
      message: `User satisfaction: ${patch.satisfaction}/5`,
    });
  }

  if (patch.comment) {
    ticket.events.push({
      id: randomUUID(),
      at: now,
      type: "comment",
      message: patch.comment,
      actorId: actor?.id,
      actorName: actor?.name,
    });
  }

  ticket.updatedAt = now;
  updateTicketRow(ticket);
  return ticket;
}

export function deleteTicket(id: string): { ok: true } | { error: string } {
  ensureDb();
  const existing = getDb()
    .prepare("SELECT id, code FROM tickets WHERE id = ? OR code = ?")
    .get(id, id) as { id: string; code: string } | undefined;
  if (!existing) return { error: "Tiket tidak ditemukan" };

  getDb()
    .prepare(
      "UPDATE tickets SET related_ticket_id = NULL WHERE related_ticket_id = ?",
    )
    .run(existing.id);
  getDb().prepare("DELETE FROM tickets WHERE id = ?").run(existing.id);
  deleteTicketUploadFolder(existing.id);
  return { ok: true };
}
function parseJsonGenericArray<T>(raw: string | null | undefined): T[] {
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function getServers(): ItServer[] {
  ensureDb();
  const rows = getDb().prepare("SELECT * FROM it_servers ORDER BY name ASC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    category: r.category || "Server",
    name: r.name,
    ipAddress: r.ip_address,
    url: r.url || "",
    username: r.username,
    password: r.password,
    hardwareSpec: r.hardware_spec,
    os: r.os,
    location: r.location,
    notes: r.notes,
    active: intToBool(r.active),
    osCredentials: parseJsonGenericArray(r.os_credentials_json),
    apps: parseJsonGenericArray(r.apps_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getServerById(id: string): ItServer | undefined {
  ensureDb();
  const r = getDb().prepare("SELECT * FROM it_servers WHERE id = ?").get(id) as any;
  if (!r) return undefined;
  return {
    id: r.id,
    category: r.category || "Server",
    name: r.name,
    ipAddress: r.ip_address,
    url: r.url || "",
    username: r.username,
    password: r.password,
    hardwareSpec: r.hardware_spec,
    os: r.os,
    location: r.location,
    notes: r.notes,
    active: intToBool(r.active),
    osCredentials: parseJsonGenericArray(r.os_credentials_json),
    apps: parseJsonGenericArray(r.apps_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function insertServer(server: ItServer) {
  ensureDb();
  getDb().prepare(`
    INSERT INTO it_servers (
      id, category, name, ip_address, url, username, password, hardware_spec, os, location, notes, active, os_credentials_json, apps_json, created_at, updated_at
    ) VALUES (
      @id, @category, @name, @ipAddress, @url, @username, @password, @hardwareSpec, @os, @location, @notes, @active, @osCredentialsJson, @appsJson, @createdAt, @updatedAt
    )
  `).run({
    id: server.id,
    category: server.category || "Server",
    name: server.name,
    ipAddress: server.ipAddress,
    url: server.url || "",
    username: server.username,
    password: server.password || '',
    hardwareSpec: server.hardwareSpec,
    os: server.os,
    location: server.location,
    notes: server.notes,
    active: boolToInt(server.active),
    osCredentialsJson: JSON.stringify(server.osCredentials || []),
    appsJson: JSON.stringify(server.apps || []),
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  });
}

export function updateServer(server: ItServer) {
  ensureDb();
  getDb().prepare(`
    UPDATE it_servers SET
      category = @category,
      name = @name,
      ip_address = @ipAddress,
      url = @url,
      username = @username,
      password = @password,
      hardware_spec = @hardwareSpec,
      os = @os,
      location = @location,
      notes = @notes,
      active = @active,
      os_credentials_json = @osCredentialsJson,
      apps_json = @appsJson,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: server.id,
    category: server.category || "Server",
    name: server.name,
    ipAddress: server.ipAddress,
    url: server.url || "",
    username: server.username,
    password: server.password || '',
    hardwareSpec: server.hardwareSpec,
    os: server.os,
    location: server.location,
    notes: server.notes,
    active: boolToInt(server.active),
    osCredentialsJson: JSON.stringify(server.osCredentials || []),
    appsJson: JSON.stringify(server.apps || []),
    updatedAt: server.updatedAt,
  });
}

export function deleteServer(id: string) {
  ensureDb();
  getDb().prepare("DELETE FROM it_servers WHERE id = ?").run(id);
}

export function getServerLogs(serverId: string): ItServerLog[] {
  ensureDb();
  const rows = getDb().prepare("SELECT * FROM it_server_logs WHERE server_id = ? ORDER BY log_date DESC").all(serverId) as any[];
  return rows.map((r) => ({
    id: r.id,
    serverId: r.server_id,
    actionType: r.action_type,
    description: r.description,
    logDate: r.log_date,
    createdByName: r.created_by_name,
    createdByStaffId: r.created_by_staff_id,
    createdAt: r.created_at,
  }));
}

export function insertServerLog(log: ItServerLog) {
  ensureDb();
  getDb().prepare(`
    INSERT INTO it_server_logs (
      id, server_id, action_type, description, log_date, created_by_name, created_by_staff_id, created_at
    ) VALUES (
      @id, @serverId, @actionType, @description, @logDate, @createdByName, @createdByStaffId, @createdAt
    )
  `).run({
    id: log.id,
    serverId: log.serverId,
    actionType: log.actionType,
    description: log.description,
    logDate: log.logDate,
    createdByName: log.createdByName,
    createdByStaffId: log.createdByStaffId,
    createdAt: log.createdAt,
  });
}

