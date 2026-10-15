import { randomUUID } from "crypto";
import { boolToInt, getDb, intToBool } from "./db";
import type { MasterAssetCategory } from "./types";

const DEFAULT_NAMES = [
  "PC",
  "Laptop",
  "Printer",
  "Monitor",
  "UPS",
  "Jaringan",
  "Lainnya",
];

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  active: number;
};

function mapCategory(row: CategoryRow): MasterAssetCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    active: intToBool(row.active),
  };
}

export function seedAssetCategoriesIfEmpty() {
  const db = getDb();
  const count = db
    .prepare(`SELECT COUNT(*) AS total FROM asset_categories`)
    .get() as { total: number };
  if (count.total > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO asset_categories (id, name, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
  );
  const tx = db.transaction(() => {
    DEFAULT_NAMES.forEach((name, index) => {
      insert.run(randomUUID(), name, index + 1, now, now);
    });
  });
  tx();
}

/** Tambahkan menu master ke user Admin/IT yang punya allowlist kustom. */
export function seedAssetCategoryMenuIfMissing() {
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
    if (!Array.isArray(menus) || menus.includes("/master/asset-categories")) {
      continue;
    }
    update.run(JSON.stringify([...menus, "/master/asset-categories"]), row.id);
  }
}

export function listAssetCategories(activeOnly = false): MasterAssetCategory[] {
  seedAssetCategoriesIfEmpty();
  const sql = activeOnly
    ? `SELECT id, name, sort_order, active FROM asset_categories
       WHERE active = 1 ORDER BY sort_order ASC, name COLLATE NOCASE ASC`
    : `SELECT id, name, sort_order, active FROM asset_categories
       ORDER BY sort_order ASC, name COLLATE NOCASE ASC`;
  return (getDb().prepare(sql).all() as CategoryRow[]).map(mapCategory);
}

export function upsertAssetCategory(input: {
  id?: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
}): { error: string } | MasterAssetCategory {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Nama kategori wajib diisi" };
  if (name.length > 80) return { error: "Nama kategori terlalu panjang" };

  const db = getDb();
  const duplicate = db
    .prepare(
      `SELECT id FROM asset_categories
       WHERE lower(name) = lower(?) AND id != ?`,
    )
    .get(name, input.id || "") as { id: string } | undefined;
  if (duplicate) return { error: "Nama kategori sudah ada" };

  const now = new Date().toISOString();
  const active = input.active === false ? 0 : 1;
  let sortOrder = Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    const next = db
      .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM asset_categories`)
      .get() as { max_order: number };
    sortOrder = input.id ? 0 : next.max_order + 1;
  }

  if (input.id) {
    const existing = db
      .prepare(`SELECT id FROM asset_categories WHERE id = ?`)
      .get(input.id) as { id: string } | undefined;
    if (!existing) return { error: "Kategori tidak ditemukan" };
    db.prepare(
      `UPDATE asset_categories
       SET name = ?, sort_order = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    ).run(name, sortOrder, active, now, input.id);
    const row = db
      .prepare(`SELECT id, name, sort_order, active FROM asset_categories WHERE id = ?`)
      .get(input.id) as CategoryRow;
    return mapCategory(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO asset_categories (id, name, sort_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, name, sortOrder, boolToInt(active === 1), now, now);
  return { id, name, sortOrder, active: active === 1 };
}
