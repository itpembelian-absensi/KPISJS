import { randomUUID } from "crypto";
import { boolToInt, getDb, intToBool } from "./db";
import type { MasterJenisData } from "./types";

const DEFAULTS = [
  { name: "Customer", code: "01" },
  { name: "Barang", code: "02" },
  { name: "Harga", code: "03" },
  { name: "User", code: "04" },
  { name: "Lainnya", code: "05" },
];

type JenisRow = {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  active: number;
};

function mapJenis(row: JenisRow): MasterJenisData {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    sortOrder: row.sort_order,
    active: intToBool(row.active),
  };
}

function padCode(n: number): string {
  return String(n).padStart(2, "0");
}

/** Isi kode 2 digit yang masih kosong, berurutan dari 01. */
export function backfillJenisDataCodes() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, code FROM jenis_data ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
    )
    .all() as Array<{ id: string; code: string }>;
  const used = new Set(
    rows.map((row) => row.code.trim()).filter((code) => /^\d{2}$/.test(code)),
  );
  const update = db.prepare(`UPDATE jenis_data SET code = ? WHERE id = ?`);
  let next = 1;
  for (const row of rows) {
    if (/^\d{2}$/.test(row.code.trim())) continue;
    while (next <= 99 && used.has(padCode(next))) next += 1;
    if (next > 99) break;
    const code = padCode(next);
    update.run(code, row.id);
    used.add(code);
    next += 1;
  }
}

export function seedJenisDataIfEmpty() {
  const db = getDb();
  const count = db
    .prepare(`SELECT COUNT(*) AS total FROM jenis_data`)
    .get() as { total: number };
  if (count.total > 0) {
    backfillJenisDataCodes();
    return;
  }
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO jenis_data (id, name, code, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  );
  const tx = db.transaction(() => {
    DEFAULTS.forEach((item, index) => {
      insert.run(randomUUID(), item.name, item.code, index + 1, now, now);
    });
  });
  tx();
}

/** Tambahkan menu master ke user Admin/IT yang punya allowlist kustom. */
export function seedJenisDataMenuIfMissing() {
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
    if (!Array.isArray(menus) || menus.includes("/master/jenis-data")) continue;
    update.run(JSON.stringify([...menus, "/master/jenis-data"]), row.id);
  }
}

export function listJenisData(activeOnly = false): MasterJenisData[] {
  seedJenisDataIfEmpty();
  const sql = activeOnly
    ? `SELECT id, name, code, sort_order, active FROM jenis_data
       WHERE active = 1 ORDER BY sort_order ASC, name COLLATE NOCASE ASC`
    : `SELECT id, name, code, sort_order, active FROM jenis_data
       ORDER BY sort_order ASC, name COLLATE NOCASE ASC`;
  return (getDb().prepare(sql).all() as JenisRow[]).map(mapJenis);
}

function nextFreeCode(exceptId = ""): string {
  const rows = getDb()
    .prepare(`SELECT id, code FROM jenis_data`)
    .all() as Array<{ id: string; code: string }>;
  const used = new Set(
    rows
      .filter((row) => row.id !== exceptId)
      .map((row) => row.code.trim())
      .filter((code) => /^\d{2}$/.test(code)),
  );
  for (let n = 1; n <= 99; n += 1) {
    const code = padCode(n);
    if (!used.has(code)) return code;
  }
  return "";
}

export function upsertJenisData(input: {
  id?: string;
  name: string;
  code?: string;
  sortOrder?: number;
  active?: boolean;
}): { error: string } | MasterJenisData {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Nama jenis data wajib diisi" };
  if (name.length > 80) return { error: "Nama jenis data terlalu panjang" };

  const rawCode = String(input.code ?? "").trim();
  const code = rawCode || nextFreeCode(input.id || "");
  if (!/^\d{2}$/.test(code)) {
    return { error: "Kode jenis data harus 2 digit, contoh 01" };
  }

  const db = getDb();
  const duplicate = db
    .prepare(
      `SELECT id FROM jenis_data
       WHERE lower(name) = lower(?) AND id != ?`,
    )
    .get(name, input.id || "") as { id: string } | undefined;
  if (duplicate) return { error: "Nama jenis data sudah ada" };

  const duplicateCode = db
    .prepare(`SELECT id FROM jenis_data WHERE code = ? AND id != ?`)
    .get(code, input.id || "") as { id: string } | undefined;
  if (duplicateCode) return { error: "Kode 2 digit sudah dipakai" };

  const now = new Date().toISOString();
  const active = input.active === false ? 0 : 1;
  let sortOrder = Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    const next = db
      .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM jenis_data`)
      .get() as { max_order: number };
    sortOrder = input.id ? 0 : next.max_order + 1;
  }

  if (input.id) {
    const existing = db
      .prepare(`SELECT id FROM jenis_data WHERE id = ?`)
      .get(input.id) as { id: string } | undefined;
    if (!existing) return { error: "Jenis data tidak ditemukan" };
    db.prepare(
      `UPDATE jenis_data
       SET name = ?, code = ?, sort_order = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    ).run(name, code, sortOrder, active, now, input.id);
    const row = db
      .prepare(
        `SELECT id, name, code, sort_order, active FROM jenis_data WHERE id = ?`,
      )
      .get(input.id) as JenisRow;
    return mapJenis(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO jenis_data (id, name, code, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, name, code, sortOrder, boolToInt(active === 1), now, now);
  return { id, name, code, sortOrder, active: active === 1 };
}

function jakartaPeriod(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  return `${month}${year}`;
}

function jenisCodeByName(name: string): string {
  backfillJenisDataCodes();
  const row = getDb()
    .prepare(
      `SELECT code FROM jenis_data
       WHERE active = 1 AND lower(name) = lower(?)`,
    )
    .get(name.trim()) as { code: string } | undefined;
  const code = row?.code?.trim() ?? "";
  if (!/^\d{2}$/.test(code)) {
    throw new Error(
      "Nomor perubahan tidak bisa dibuat: jenis data belum punya kode 2 digit",
    );
  }
  return code;
}

function maxUsedCounter(jenisCode: string, period: string): number {
  const prefix = `${jenisCode}${period}`;
  const rows = getDb()
    .prepare(`SELECT payload_json FROM submissions WHERE type = 'perubahan'`)
    .all() as Array<{ payload_json: string }>;
  let max = 0;
  const pattern = new RegExp(`^${prefix}(\\d{3})$`);
  for (const row of rows) {
    let identitas = "";
    try {
      const payload = JSON.parse(row.payload_json) as { identitas?: unknown };
      identitas = typeof payload.identitas === "string" ? payload.identitas : "";
    } catch {
      continue;
    }
    const match = pattern.exec(identitas);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isInteger(n)) max = Math.max(max, n);
  }
  return max;
}

function formatPerubahanNumber(jenisCode: string, period: string, n: number): string {
  if (n > 999) {
    throw new Error(
      "Nomor perubahan bulan ini sudah mencapai 999 untuk jenis data tersebut",
    );
  }
  return `${jenisCode}${period}${String(n).padStart(3, "0")}`;
}

/** Contoh: kode jenis 01, Oktober 2026, urutan 1 → 01102026001. */
export function previewPerubahanNumber(jenisName: string, date = new Date()): string {
  const jenisCode = jenisCodeByName(jenisName);
  const period = jakartaPeriod(date);
  const stored = getDb()
    .prepare(
      `SELECT last_number FROM perubahan_counters
       WHERE jenis_code = ? AND period = ?`,
    )
    .get(jenisCode, period) as { last_number: number } | undefined;
  const last = Math.max(stored?.last_number ?? 0, maxUsedCounter(jenisCode, period));
  return formatPerubahanNumber(jenisCode, period, last + 1);
}

/** Ambil nomor berikutnya dan naikkan counter. Aman untuk dua simpan bersamaan. */
export function allocatePerubahanNumber(jenisName: string, date = new Date()): string {
  const jenisCode = jenisCodeByName(jenisName);
  const period = jakartaPeriod(date);
  const db = getDb();
  return db.transaction(() => {
    const stored = db
      .prepare(
        `SELECT last_number FROM perubahan_counters
         WHERE jenis_code = ? AND period = ?`,
      )
      .get(jenisCode, period) as { last_number: number } | undefined;
    const last = Math.max(
      stored?.last_number ?? 0,
      maxUsedCounter(jenisCode, period),
    );
    const next = last + 1;
    const number = formatPerubahanNumber(jenisCode, period, next);
    db.prepare(
      `INSERT INTO perubahan_counters (jenis_code, period, last_number)
       VALUES (?, ?, ?)
       ON CONFLICT(jenis_code, period) DO UPDATE SET last_number = excluded.last_number`,
    ).run(jenisCode, period, next);
    return number;
  })();
}
