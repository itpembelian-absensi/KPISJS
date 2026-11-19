import { randomUUID } from "crypto";
import { getDb, intToBool, boolToInt } from "./db";
import type { JabatanRecord } from "./types";

type JabatanRow = {
  id: string;
  name: string;
  department_id: string | null;
  kelompok: string;
  score_method: string;
  indicator_count: number;
  origin: string;
  sort_order: number;
  active: number;
  created_at: string;
  updated_at: string;
};

type ScoreMethod = JabatanRecord["scoreMethod"];
type Origin = JabatanRecord["origin"];

type CatalogItem = {
  name: string;
  kelompok: string;
  scoreMethod: ScoreMethod;
  indicatorCount: number;
  sortOrder: number;
};

/** 32 jabatan paket MAJU Revisi 02, 18 November 2026. */
const KPI_JABATAN: CatalogItem[] = [
  { name: "Marketing & Communication", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 14, sortOrder: 10 },
  { name: "Graphic Design", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 9, sortOrder: 20 },
  { name: "Sales Manager", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 13, sortOrder: 30 },
  { name: "Senior Marketing", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 13, sortOrder: 40 },
  { name: "Sales", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 14, sortOrder: 50 },
  { name: "Admin Marketing", kelompok: "Marketing & Sales", scoreMethod: "rata-rata", indicatorCount: 9, sortOrder: 60 },
  { name: "General Manager", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 17, sortOrder: 110 },
  { name: "Tax Manager", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 19, sortOrder: 120 },
  { name: "Staff Pajak", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 16, sortOrder: 130 },
  { name: "Inventory Controller", kelompok: "Accounting & Finance", scoreMethod: "rata-rata", indicatorCount: 10, sortOrder: 140 },
  { name: "GL Accounting", kelompok: "Accounting & Finance", scoreMethod: "rata-rata", indicatorCount: 10, sortOrder: 150 },
  { name: "Finance Manager", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 17, sortOrder: 160 },
  { name: "Supervisor Finance", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 19, sortOrder: 170 },
  { name: "AR Collection", kelompok: "Accounting & Finance", scoreMethod: "rata-rata", indicatorCount: 14, sortOrder: 180 },
  { name: "Admin Invoicing", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 13, sortOrder: 190 },
  { name: "Admin Finance", kelompok: "Accounting & Finance", scoreMethod: "rata-rata", indicatorCount: 10, sortOrder: 200 },
  { name: "Cashier", kelompok: "Accounting & Finance", scoreMethod: "bobot", indicatorCount: 17, sortOrder: 210 },
  { name: "Collector", kelompok: "Accounting & Finance", scoreMethod: "rata-rata", indicatorCount: 2, sortOrder: 220 },
  { name: "Warehouse Controller", kelompok: "Warehouse & Security", scoreMethod: "bobot", indicatorCount: 14, sortOrder: 310 },
  { name: "Pengawas Produksi", kelompok: "Warehouse & Security", scoreMethod: "bobot", indicatorCount: 11, sortOrder: 320 },
  { name: "Admin Warehouse", kelompok: "Warehouse & Security", scoreMethod: "bobot", indicatorCount: 16, sortOrder: 330 },
  { name: "Mekanik", kelompok: "Warehouse & Security", scoreMethod: "bobot", indicatorCount: 10, sortOrder: 340 },
  { name: "Pembina Security", kelompok: "Warehouse & Security", scoreMethod: "rata-rata", indicatorCount: 10, sortOrder: 350 },
  { name: "Komandan Security", kelompok: "Warehouse & Security", scoreMethod: "rata-rata", indicatorCount: 10, sortOrder: 360 },
  { name: "HR Manager", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "bobot", indicatorCount: 17, sortOrder: 410 },
  { name: "HR Staff", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "bobot", indicatorCount: 15, sortOrder: 420 },
  { name: "Procurement", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 12, sortOrder: 430 },
  { name: "Messenger", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 2, sortOrder: 440 },
  { name: "Office Boy", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 2, sortOrder: 450 },
  { name: "Purchasing Stock", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 13, sortOrder: 460 },
  { name: "IT Manager", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 12, sortOrder: 470 },
  { name: "IT Support", kelompok: "HRD, GA, Purchasing, IT", scoreMethod: "rata-rata", indicatorCount: 12, sortOrder: 480 },
];

/** Judul absensi yang artinya sama dengan jabatan KPI. */
const TITLE_ALIAS: Record<string, string> = {
  "graphic designer": "Graphic Design",
  "graphic design": "Graphic Design",
  "digital marketing & campaign": "Marketing & Communication",
  "marketing & communication": "Marketing & Communication",
  "purchasing non stock": "Procurement",
  procurement: "Procurement",
  kurir: "Messenger",
  messenger: "Messenger",
  "supervisor finance & accounting": "Supervisor Finance",
  "supervisor finance": "Supervisor Finance",
  "inventory controller & gl accounting": "Inventory Controller",
  "inventory controller": "Inventory Controller",
  "gl accounting": "GL Accounting",
  "admin finance ap": "Admin Finance",
  "admin finance": "Admin Finance",
  "pengawas produksi laminasi & tempelan": "Pengawas Produksi",
  "pengawas produksi sortir": "Pengawas Produksi",
  "pengawas produksi": "Pengawas Produksi",
  "staff account payable": "Account Payable",
  "account payable": "Account Payable",
};

/** Orang yang jabatannya di paket tidak sama dengan judul absensi. */
const NAME_ALIAS: Array<[string, string]> = [
  ["hianry", "Tax Manager"],
  ["yohana", "Finance Manager"],
  ["ovira", "Staff Pajak"],
  ["yemima", "HR Staff"],
];

const KELOMPOK_BY_DEPT: Record<string, string> = {
  ACC: "Accounting & Finance",
  COL: "Accounting & Finance",
  FIN: "Accounting & Finance",
  TAX: "Accounting & Finance",
  WH: "Warehouse & Security",
  MTR: "Warehouse & Security",
  PRD: "Warehouse & Security",
  SEC: "Warehouse & Security",
  OPS: "Warehouse & Security",
  HRD: "HRD, GA, Purchasing, IT",
  PUR: "HRD, GA, Purchasing, IT",
  IT: "HRD, GA, Purchasing, IT",
  KUR: "HRD, GA, Purchasing, IT",
  DGM: "Marketing & Sales",
  MKT: "Marketing & Sales",
  MGT: "Lainnya",
};

/** Kode departemen tempat skor jabatan paket dihitung. Mengikuti departemen pemegangnya. */
const DEPARTMENT_CODE_BY_JABATAN: Record<string, string> = {
  "Marketing & Communication": "DGM",
  "Graphic Design": "DGM",
  "Sales Manager": "MKT",
  "Senior Marketing": "MKT",
  Sales: "MKT",
  "Admin Marketing": "MKT",
  "General Manager": "MGT",
  "Tax Manager": "TAX",
  "Staff Pajak": "TAX",
  "Inventory Controller": "ACC",
  "GL Accounting": "ACC",
  "Finance Manager": "FIN",
  "Supervisor Finance": "ACC",
  "AR Collection": "FIN",
  "Admin Invoicing": "FIN",
  "Admin Finance": "FIN",
  Cashier: "FIN",
  Collector: "COL",
  "Warehouse Controller": "WH",
  "Pengawas Produksi": "PRD",
  "Admin Warehouse": "WH",
  Mekanik: "MTR",
  "Pembina Security": "SEC",
  "Komandan Security": "SEC",
  "HR Manager": "HRD",
  "HR Staff": "HRD",
  Procurement: "PUR",
  Messenger: "KUR",
  "Office Boy": "HRD",
  "Purchasing Stock": "PUR",
  "IT Manager": "IT",
  "IT Support": "IT",
};

function departmentIdForCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare("SELECT id FROM departments WHERE lower(code) = lower(?)")
    .get(trimmed) as { id: string } | undefined;
  return row?.id ?? null;
}

function departmentNameById(id: string | null): string {
  if (!id) return "";
  const row = getDb()
    .prepare("SELECT name FROM departments WHERE id = ?")
    .get(id) as { name: string } | undefined;
  return row?.name ?? "";
}

/** Isi department_id yang masih kosong. Jabatan yang sudah diubah pengguna tidak ditimpa. */
function assignJabatanDepartments() {
  const db = getDb();
  const now = new Date().toISOString();
  const setDept = db.prepare(
    `UPDATE jabatan SET department_id = ?, updated_at = ?
     WHERE id = ? AND (department_id IS NULL OR trim(department_id) = '')`,
  );
  for (const [name, code] of Object.entries(DEPARTMENT_CODE_BY_JABATAN)) {
    const row = findJabatanByName(name);
    const departmentId = departmentIdForCode(code);
    if (!row || !departmentId) continue;
    setDept.run(departmentId, now, row.id);
  }
  const loose = db
    .prepare(
      `SELECT id FROM jabatan
       WHERE department_id IS NULL OR trim(department_id) = ''`,
    )
    .all() as Array<{ id: string }>;
  const staffDepts = db.prepare(
    `SELECT DISTINCT department_id FROM staff
     WHERE jabatan_id = ?
       AND department_id IS NOT NULL
       AND trim(department_id) != ''`,
  );
  for (const row of loose) {
    const depts = staffDepts.all(row.id) as Array<{ department_id: string }>;
    if (depts.length !== 1) continue;
    setDept.run(depts[0].department_id, now, row.id);
  }
}

function normalizeTitle(position: string): string {
  return position
    .replace(/\s*\((staff|manager|supervisor|naker)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function asScoreMethod(value: string): ScoreMethod {
  if (value === "bobot" || value === "rata-rata") return value;
  return "";
}

function asOrigin(value: string): Origin {
  if (value === "kpi" || value === "keduanya") return value;
  return "aplikasi";
}

function findJabatanByName(name: string): JabatanRow | undefined {
  return getDb()
    .prepare("SELECT * FROM jabatan WHERE lower(name) = lower(?)")
    .get(name.trim()) as JabatanRow | undefined;
}

function markLinked(id: string) {
  getDb()
    .prepare(
      `UPDATE jabatan
       SET origin = 'keduanya', updated_at = ?
       WHERE id = ? AND origin = 'kpi'`,
    )
    .run(new Date().toISOString(), id);
}

export function ensureKpiJabatanCatalog() {
  const db = getDb();
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO jabatan (
      id, name, kelompok, score_method, indicator_count, origin, sort_order, active,
      department_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'kpi', ?, 1, ?, ?, ?)`,
  );
  for (const item of KPI_JABATAN) {
    if (findJabatanByName(item.name)) continue;
    insert.run(
      randomUUID(),
      item.name,
      item.kelompok,
      item.scoreMethod,
      item.indicatorCount,
      item.sortOrder,
      departmentIdForCode(DEPARTMENT_CODE_BY_JABATAN[item.name] || ""),
      now,
      now,
    );
  }
}

export function resolveJabatanId(
  staffName: string,
  position: string,
  departmentCode: string,
): string {
  ensureKpiJabatanCatalog();
  const byName = NAME_ALIAS.find(([needle]) =>
    staffName.toLowerCase().includes(needle),
  );
  const alias = TITLE_ALIAS[normalizeTitle(position)];
  const targetName = byName?.[1] || alias;
  if (targetName) {
    const existing = findJabatanByName(targetName);
    if (existing) {
      markLinked(existing.id);
      return existing.id;
    }
  }

  const cleaned = position
    .replace(/\s*\((staff|manager|supervisor|naker)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const name = cleaned || "Staff";
  const existing = findJabatanByName(name);
  if (existing) {
    markLinked(existing.id);
    return existing.id;
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const maxSort = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), 1000) AS n FROM jabatan")
    .get() as { n: number };
  getDb()
    .prepare(
      `INSERT INTO jabatan (
        id, name, kelompok, score_method, indicator_count, origin, sort_order, active,
        department_id, created_at, updated_at
      ) VALUES (?, ?, ?, '', 0, 'aplikasi', ?, 1, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      KELOMPOK_BY_DEPT[departmentCode] || "Lainnya",
      maxSort.n + 10,
      departmentIdForCode(departmentCode),
      now,
      now,
    );
  return id;
}

export function seedJabatan() {
  ensureKpiJabatanCatalog();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.position, d.code AS department_code
       FROM staff s
       JOIN departments d ON d.id = s.department_id
       WHERE s.jabatan_id IS NULL OR trim(s.jabatan_id) = ''`,
    )
    .all() as Array<{
    id: string;
    name: string;
    position: string;
    department_code: string;
  }>;
  const update = db.prepare("UPDATE staff SET jabatan_id = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const row of rows) {
      const jabatanId = resolveJabatanId(
        row.name,
        row.position,
        row.department_code,
      );
      update.run(jabatanId, row.id);
    }
  });
  tx();
  assignJabatanDepartments();
  seedJabatanMenuIfMissing();
}

export function seedJabatanMenuIfMissing() {
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
    if (!Array.isArray(menus) || menus.includes("/master/jabatan")) continue;
    update.run(JSON.stringify([...menus, "/master/jabatan"]), row.id);
  }
}

function staffForJabatan(jabatanId: string) {
  return getDb()
    .prepare(
      `SELECT s.id, s.name, s.active, d.name AS department_name
       FROM staff s
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.jabatan_id = ?
       ORDER BY s.active DESC, s.name`,
    )
    .all(jabatanId) as Array<{
    id: string;
    name: string;
    active: number;
    department_name: string | null;
  }>;
}

function mapJabatan(row: JabatanRow, withStaff: boolean): JabatanRecord {
  const staff = withStaff
    ? staffForJabatan(row.id).map((member) => ({
        id: member.id,
        name: member.name,
        active: intToBool(member.active),
        departmentName: member.department_name || "",
      }))
    : [];
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id || null,
    departmentName: departmentNameById(row.department_id),
    kelompok: row.kelompok,
    scoreMethod: asScoreMethod(row.score_method),
    indicatorCount: Number(row.indicator_count) || 0,
    origin: asOrigin(row.origin),
    sortOrder: Number(row.sort_order) || 0,
    active: intToBool(row.active),
    staffCount: withStaff
      ? staff.length
      : (
          getDb()
            .prepare(
              "SELECT COUNT(*) AS total FROM staff WHERE jabatan_id = ?",
            )
            .get(row.id) as { total: number }
        ).total,
    staff,
  };
}

export function listJabatan(activeOnly = false, withStaff = true): JabatanRecord[] {
  seedJabatan();
  const sql = activeOnly
    ? `SELECT * FROM jabatan WHERE active = 1 ORDER BY sort_order, name`
    : `SELECT * FROM jabatan ORDER BY sort_order, name`;
  return (getDb().prepare(sql).all() as JabatanRow[]).map((row) =>
    mapJabatan(row, withStaff),
  );
}

export function upsertJabatan(input: {
  id?: string;
  name: string;
  departmentId?: string;
  scoreMethod?: string;
  indicatorCount?: number;
  active?: boolean;
}): JabatanRecord | { error: string } {
  ensureKpiJabatanCatalog();
  const name = input.name.trim();
  if (!name) return { error: "Nama jabatan wajib" };
  const departmentId = (input.departmentId || "").trim();
  const department = departmentId
    ? (getDb()
        .prepare("SELECT id, name FROM departments WHERE id = ?")
        .get(departmentId) as { id: string; name: string } | undefined)
    : undefined;
  if (!department) return { error: "Departemen wajib" };
  const duplicate = findJabatanByName(name);
  if (duplicate && duplicate.id !== input.id) {
    return { error: "Nama jabatan sudah ada" };
  }
  const now = new Date().toISOString();
  const scoreMethod = asScoreMethod(input.scoreMethod || "");
  const indicatorCount = Math.max(0, Number(input.indicatorCount) || 0);
  const active = input.active ?? true;

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM jabatan WHERE id = ?")
      .get(input.id) as JabatanRow | undefined;
    if (!existing) return { error: "Jabatan tidak ditemukan" };
    getDb()
      .prepare(
        `UPDATE jabatan SET
          name = ?, department_id = ?, kelompok = ?, score_method = ?,
          indicator_count = ?, active = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        name,
        department.id,
        department.name,
        scoreMethod,
        indicatorCount,
        boolToInt(active),
        now,
        input.id,
      );
    const row = getDb()
      .prepare("SELECT * FROM jabatan WHERE id = ?")
      .get(input.id) as JabatanRow;
    return mapJabatan(row, true);
  }

  const maxSort = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM jabatan")
    .get() as { n: number };
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO jabatan (
        id, name, kelompok, score_method, indicator_count, origin, sort_order, active,
        department_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'aplikasi', ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      department.name,
      scoreMethod,
      indicatorCount,
      maxSort.n + 10,
      boolToInt(active),
      department.id,
      now,
      now,
    );
  const row = getDb()
    .prepare("SELECT * FROM jabatan WHERE id = ?")
    .get(id) as JabatanRow;
  return mapJabatan(row, true);
}

export function deleteJabatan(id: string): { ok: true } | { error: string } {
  const db = getDb();
  const row = db.prepare("SELECT id FROM jabatan WHERE id = ?").get(id);
  if (!row) return { error: "Jabatan tidak ditemukan" };
  const remove = db.transaction(() => {
    db.prepare("UPDATE staff SET jabatan_id = NULL WHERE jabatan_id = ?").run(id);
    db.prepare("DELETE FROM jabatan WHERE id = ?").run(id);
  });
  remove();
  return { ok: true };
}
