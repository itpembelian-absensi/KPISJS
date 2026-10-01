import { randomUUID } from "crypto";
import {
  applyCustomerChange,
  syncCustomerFromSubmission,
} from "./customer-ops";
import { getDb } from "./db";
import { pengajuanMenuHrefs } from "./pengajuan";
import type { Pengajuan, PengajuanStatus, PengajuanType } from "./types";

type PengajuanRow = {
  id: string;
  code: string;
  type: PengajuanType;
  title: string;
  status: PengajuanStatus;
  payload_json: string;
  note: string;
  requester_name: string;
  requester_dept: string;
  requester_staff_id: string | null;
  department_id: string;
  reviewer_name: string;
  reviewer_note: string;
  reviewed_at: string | null;
  completed_by: string;
  completion_note: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  photo_urls_json: string;
};

function parsePhotoUrls(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (url): url is string =>
        typeof url === "string" && url.startsWith("/uploads/pengajuan/"),
    );
  } catch {
    return [];
  }
}

function mapPengajuan(row: PengajuanRow): Pengajuan {
  let payload: Record<string, string> = {};
  try {
    const parsed = JSON.parse(row.payload_json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      );
    }
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    title: row.title,
    status: row.status,
    payload,
    photoUrls: parsePhotoUrls(row.photo_urls_json),
    note: row.note,
    requesterName: row.requester_name,
    requesterDept: row.requester_dept,
    requesterStaffId: row.requester_staff_id,
    departmentId: row.department_id,
    reviewerName: row.reviewer_name,
    reviewerNote: row.reviewer_note,
    reviewedAt: row.reviewed_at,
    completedBy: row.completed_by,
    completionNote: row.completion_note,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nextPengajuanCode(now = new Date()): string {
  const year = now.getFullYear();
  const prefix = `PGJ-${year}-`;
  const row = getDb()
    .prepare(
      `SELECT code FROM submissions WHERE code LIKE ? ORDER BY code DESC LIMIT 1`,
    )
    .get(`${prefix}%`) as { code: string } | undefined;
  const last = row ? Number(row.code.slice(prefix.length)) : 0;
  const n = Number.isFinite(last) ? last + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export function listPengajuan(type?: PengajuanType): Pengajuan[] {
  const rows = (
    type
      ? getDb()
          .prepare(
            `SELECT * FROM submissions WHERE type = ? ORDER BY created_at DESC`,
          )
          .all(type)
      : getDb()
          .prepare(`SELECT * FROM submissions ORDER BY created_at DESC`)
          .all()
  ) as PengajuanRow[];
  return rows.map(mapPengajuan);
}

export function getPengajuan(id: string): Pengajuan | null {
  const row = getDb()
    .prepare(`SELECT * FROM submissions WHERE id = ? OR code = ?`)
    .get(id, id) as PengajuanRow | undefined;
  return row ? mapPengajuan(row) : null;
}

export function createPengajuan(input: {
  type: PengajuanType;
  title: string;
  payload: Record<string, string>;
  note: string;
  requesterName: string;
  requesterDept: string;
  requesterStaffId: string;
  departmentId: string;
}): Pengajuan {
  const now = new Date().toISOString();
  const id = randomUUID();
  const code = nextPengajuanCode();
  getDb()
    .prepare(
      `INSERT INTO submissions (
        id, code, type, title, status, payload_json, note,
        requester_name, requester_dept, requester_staff_id, department_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      code,
      input.type,
      input.title,
      JSON.stringify(input.payload),
      input.note,
      input.requesterName,
      input.requesterDept,
      input.requesterStaffId,
      input.departmentId,
      now,
      now,
    );
  const created = getPengajuan(id);
  if (!created) throw new Error("Pengajuan gagal disimpan");
  try {
    syncCustomerFromSubmission(created);
  } catch (error) {
    getDb().prepare(`DELETE FROM submissions WHERE id = ?`).run(id);
    throw error;
  }
  return created;
}

export function reviewPengajuan(input: {
  id: string;
  action: "approve" | "reject" | "done";
  actorName: string;
  actorStaffId: string | null;
  allowSelfReview: boolean;
  note: string;
}): { error: string } | { pengajuan: Pengajuan } {
  const current = getPengajuan(input.id);
  if (!current) return { error: "Pengajuan tidak ditemukan" };

  const isOwn = Boolean(
    input.actorStaffId && current.requesterStaffId === input.actorStaffId,
  );
  if (isOwn && !input.allowSelfReview && input.action !== "done") {
    return { error: "Anda tidak dapat menyetujui pengajuan sendiri" };
  }

  const note = input.note.trim();
  if (input.action === "reject" && !note) {
    return { error: "Alasan penolakan wajib diisi" };
  }
  if (note.length > 2000) return { error: "Catatan terlalu panjang" };

  const now = new Date().toISOString();
  const db = getDb();

  if (input.action === "approve" || input.action === "reject") {
    if (current.status !== "submitted") {
      return { error: "Pengajuan ini sudah tidak menunggu persetujuan" };
    }
    const status = input.action === "approve" ? "approved" : "rejected";
    const result = db
      .prepare(
        `UPDATE submissions
         SET status = ?, reviewer_name = ?, reviewer_note = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ? AND status = 'submitted'`,
      )
      .run(status, input.actorName, note, now, now, current.id);
    if (result.changes !== 1) {
      return { error: "Status pengajuan sudah berubah" };
    }
  } else {
    if (current.status !== "approved") {
      return {
        error: "Hanya pengajuan yang sudah disetujui yang bisa diselesaikan",
      };
    }
    const result = db
      .prepare(
        `UPDATE submissions
         SET status = 'done', completed_by = ?, completion_note = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND status = 'approved'`,
      )
      .run(input.actorName, note, now, now, current.id);
    if (result.changes !== 1) {
      return { error: "Status pengajuan sudah berubah" };
    }
  }

  const updated = getPengajuan(current.id);
  if (!updated) return { error: "Pengajuan tidak ditemukan" };
  syncCustomerFromSubmission(updated);
  applyCustomerChange(updated);
  return { pengajuan: updated };
}

export function appendPengajuanPhotos(
  id: string,
  urls: string[],
  max: number,
): { error: string } | { pengajuan: Pengajuan } {
  const current = getPengajuan(id);
  if (!current) return { error: "Pengajuan tidak ditemukan" };
  if (current.status !== "submitted") {
    return { error: "Foto hanya bisa ditambah saat pengajuan masih diajukan" };
  }
  const next = [...current.photoUrls, ...urls];
  if (next.length > max) {
    return { error: `Maksimal ${max} foto (sudah ${current.photoUrls.length})` };
  }
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      `UPDATE submissions
       SET photo_urls_json = ?, updated_at = ?
       WHERE id = ? AND status = 'submitted'`,
    )
    .run(JSON.stringify(next), now, current.id);
  if (result.changes !== 1) {
    return { error: "Foto gagal disimpan" };
  }
  const updated = getPengajuan(current.id);
  if (!updated) return { error: "Pengajuan tidak ditemukan" };
  syncCustomerFromSubmission(updated, { photos: true });
  return { pengajuan: updated };
}

/** Tambahkan menu Pengajuan ke user yang punya allowlist kustom. */
export function seedPengajuanMenusIfMissing() {
  const db = getDb();
  const hrefs = pengajuanMenuHrefs();
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
    if (!Array.isArray(menus)) continue;
    const missing = hrefs.filter((href) => !menus.includes(href));
    if (missing.length === 0) continue;
    update.run(JSON.stringify([...menus, ...missing]), row.id);
  }
}
