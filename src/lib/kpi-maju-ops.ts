import { randomUUID } from "crypto";
import { getDb, intToBool } from "./db";
import { MAJU_GROUPS, isMajuCode, type MajuGroup } from "./kpi-maju";

type MajuRow = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  weight_percent: number;
  sort_order: number;
  active: number;
};

function mapGroup(row: MajuRow): MajuGroup {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    subtitle: row.subtitle,
    weightPercent: Number(row.weight_percent),
    sortOrder: Number(row.sort_order),
    active: intToBool(row.active),
  };
}

export function seedMajuGroupsIfEmpty() {
  const db = getDb();
  const count = db
    .prepare("SELECT COUNT(*) AS total FROM kpi_maju_groups")
    .get() as { total: number };
  if (count.total > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO kpi_maju_groups
      (id, code, name, subtitle, weight_percent, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const group of MAJU_GROUPS) {
      insert.run(
        randomUUID(),
        group.code,
        group.name,
        group.subtitle,
        group.weightPercent,
        group.sortOrder,
        now,
        now,
      );
    }
  });
  tx();
}

/** Tambahkan menu Master MAJU ke Admin/IT yang punya allowlist kustom. */
export function seedMajuMenuIfMissing() {
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
    if (!Array.isArray(menus) || menus.includes("/master/maju")) continue;
    update.run(JSON.stringify([...menus, "/master/maju"]), row.id);
  }
}

export function listMajuGroups(activeOnly = false): MajuGroup[] {
  seedMajuGroupsIfEmpty();
  const sql = activeOnly
    ? `SELECT id, code, name, subtitle, weight_percent, sort_order, active
       FROM kpi_maju_groups WHERE active = 1
       ORDER BY sort_order ASC, code ASC`
    : `SELECT id, code, name, subtitle, weight_percent, sort_order, active
       FROM kpi_maju_groups
       ORDER BY sort_order ASC, code ASC`;
  return (getDb().prepare(sql).all() as MajuRow[]).map(mapGroup);
}

export function majuGroupUsage(code: string): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS total FROM kpi_functions WHERE group_code = ?",
    )
    .get(code) as { total: number };
  return row.total;
}

export function upsertMajuGroup(input: {
  id?: string;
  code: string;
  name: string;
  subtitle?: string;
  weightPercent: number;
  sortOrder?: number;
  active?: boolean;
}): { error: string } | MajuGroup {
  seedMajuGroupsIfEmpty();
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim().replace(/\s+/g, " ");
  const subtitle = (input.subtitle ?? "").trim().replace(/\s+/g, " ");
  const weightPercent = Number(input.weightPercent);
  if (!isMajuCode(code)) {
    return { error: "Kode grup 1–3 huruf, contoh M atau MAJ" };
  }
  if (!name) return { error: "Nama grup wajib diisi" };
  if (name.length > 80) return { error: "Nama grup terlalu panjang" };
  if (
    !Number.isFinite(weightPercent) ||
    weightPercent < 0 ||
    weightPercent > 100
  ) {
    return { error: "Bobot harus antara 0–100%" };
  }

  const db = getDb();
  let sortOrder = Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    const next = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM kpi_maju_groups",
      )
      .get() as { max_order: number };
    sortOrder = input.id ? 0 : next.max_order + 1;
  }
  const active = input.active === false ? 0 : 1;
  const now = new Date().toISOString();

  const duplicate = db
    .prepare("SELECT id FROM kpi_maju_groups WHERE code = ? AND id != ?")
    .get(code, input.id || "") as { id: string } | undefined;
  if (duplicate) return { error: `Kode ${code} sudah dipakai` };

  if (input.id) {
    const existing = db
      .prepare("SELECT id, code FROM kpi_maju_groups WHERE id = ?")
      .get(input.id) as { id: string; code: string } | undefined;
    if (!existing) return { error: "Grup MAJU tidak ditemukan" };
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE kpi_maju_groups
         SET code = ?, name = ?, subtitle = ?, weight_percent = ?, sort_order = ?, active = ?, updated_at = ?
         WHERE id = ?`,
      ).run(code, name, subtitle, weightPercent, sortOrder, active, now, input.id);
      if (existing.code !== code) {
        db.prepare(
          "UPDATE kpi_functions SET group_code = ? WHERE group_code = ?",
        ).run(code, existing.code);
      }
    });
    tx();
    const row = db
      .prepare(
        `SELECT id, code, name, subtitle, weight_percent, sort_order, active
         FROM kpi_maju_groups WHERE id = ?`,
      )
      .get(input.id) as MajuRow;
    return mapGroup(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO kpi_maju_groups
      (id, code, name, subtitle, weight_percent, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, code, name, subtitle, weightPercent, sortOrder, active, now, now);
  return {
    id,
    code,
    name,
    subtitle,
    weightPercent,
    sortOrder,
    active: active === 1,
  };
}

export function deleteMajuGroup(id: string): { ok: true } | { error: string } {
  seedMajuGroupsIfEmpty();
  const db = getDb();
  const existing = db
    .prepare("SELECT id, code FROM kpi_maju_groups WHERE id = ?")
    .get(id) as { id: string; code: string } | undefined;
  if (!existing) return { error: "Grup MAJU tidak ditemukan" };
  const used = majuGroupUsage(existing.code);
  if (used > 0) {
    return {
      error: `Tidak bisa dihapus: masih dipakai ${used} fungsi KPI. Nonaktifkan saja, atau pindahkan fungsinya dulu.`,
    };
  }
  const total = db
    .prepare("SELECT COUNT(*) AS total FROM kpi_maju_groups")
    .get() as { total: number };
  if (total.total <= 1) {
    return { error: "Minimal satu grup MAJU harus tersisa" };
  }
  db.prepare("DELETE FROM kpi_maju_groups WHERE id = ?").run(id);
  return { ok: true };
}
