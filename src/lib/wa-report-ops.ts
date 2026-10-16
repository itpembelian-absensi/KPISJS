import { randomUUID } from "crypto";
import { getDb } from "./db";
import {
  deleteWaReportPhotoFiles,
  deleteWaReportUploadFolder,
} from "./wa-report-photos";
import type { KpiWaReport, SessionUser } from "./types";
import { canUserSeeWaReport } from "./auth";

type WaReportRow = {
  id: string;
  department_id: string;
  user_id: string;
  user_name: string;
  username?: string | null;
  creator_role?: string | null;
  creator_staff_id?: string | null;
  creator_department_id?: string | null;
  activity_id: string | null;
  project_id: string | null;
  title: string;
  leader_name: string;
  report_date: string;
  notes: string;
  photo_urls_json?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapWaReport(row: WaReportRow): KpiWaReport {
  let photoUrls: string[] = [];
  try {
    if (row.photo_urls_json) {
      photoUrls = JSON.parse(row.photo_urls_json);
    }
  } catch {
    photoUrls = [];
  }
  return {
    id: row.id,
    departmentId: row.department_id,
    userId: row.user_id,
    userName: row.user_name || "",
    username: row.username || "",
    creatorRole: row.creator_role || undefined,
    creatorDepartmentId: row.creator_department_id || null,
    creatorStaffId: row.creator_staff_id || null,
    activityId: row.activity_id ?? null,
    projectId: row.project_id ?? null,
    title: row.title,
    leaderName: row.leader_name,
    reportDate: row.report_date,
    notes: row.notes || "",
    photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
    status: (row.status === "acknowledged" ? "acknowledged" : "reported") as
      | "reported"
      | "acknowledged",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listKpiWaReports(
  departmentId?: string,
  activityId?: string,
  user?: SessionUser,
): KpiWaReport[] {
  const db = getDb();
  let sql = `
    SELECT
      r.*,
      u.role as creator_role,
      u.staff_id as creator_staff_id,
      s.department_id as creator_department_id
    FROM kpi_wa_reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN staff s ON u.staff_id = s.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (departmentId) {
    sql += " AND r.department_id = ?";
    params.push(departmentId);
  }
  if (activityId) {
    sql += " AND r.activity_id = ?";
    params.push(activityId);
  }

  sql += " ORDER BY r.report_date DESC, r.created_at DESC";
  const rows = db.prepare(sql).all(...params) as WaReportRow[];
  let reports = rows.map(mapWaReport);

  if (user) {
    reports = reports.filter((r) =>
      canUserSeeWaReport(user, {
        userId: r.userId,
        username: r.username,
        departmentId: r.departmentId,
        creatorRole: r.creatorRole,
        creatorDepartmentId: r.creatorDepartmentId,
        creatorStaffId: r.creatorStaffId,
      }),
    );
  }

  return reports;
}

export function getKpiWaReport(id: string): KpiWaReport | null {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        r.*,
        u.role as creator_role,
        u.staff_id as creator_staff_id,
        s.department_id as creator_department_id
      FROM kpi_wa_reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN staff s ON u.staff_id = s.id
      WHERE r.id = ?
    `)
    .get(id) as WaReportRow | undefined;
  return row ? mapWaReport(row) : null;
}

export function upsertKpiWaReport(input: {
  id?: string;
  departmentId: string;
  userId: string;
  userName?: string;
  username?: string;
  activityId?: string | null;
  projectId?: string | null;
  title: string;
  leaderName: string;
  reportDate?: string | null;
  notes?: string;
  photoUrls?: string[];
  status?: "reported" | "acknowledged";
}): KpiWaReport | { error: string } {
  const db = getDb();
  const title = (input.title || "").trim();
  if (!title) return { error: "Perihal / judul laporan wajib diisi" };
  const leaderName = (input.leaderName || "").trim() || "Adytirta Widjaja";
  if (!input.departmentId) return { error: "Departemen wajib dipilih" };

  const now = new Date().toISOString();
  const reportDate =
    input.reportDate && input.reportDate.trim() !== ""
      ? input.reportDate.trim()
      : now;

  // Check if existing record exists with this id
  const existing = input.id
    ? (db.prepare("SELECT * FROM kpi_wa_reports WHERE id = ?").get(input.id) as WaReportRow | undefined)
    : undefined;

  if (existing) {
    const photoUrls =
      input.photoUrls !== undefined
        ? JSON.stringify(input.photoUrls)
        : existing.photo_urls_json || "[]";

    db.prepare(
      `UPDATE kpi_wa_reports SET
        department_id = ?,
        activity_id = ?,
        project_id = ?,
        title = ?,
        leader_name = ?,
        report_date = ?,
        notes = ?,
        photo_urls_json = ?,
        status = ?,
        username = ?,
        updated_at = ?
      WHERE id = ?`,
    ).run(
      input.departmentId,
      input.activityId ?? null,
      input.projectId ?? null,
      title,
      leaderName,
      reportDate,
      input.notes !== undefined ? input.notes : existing.notes,
      photoUrls,
      input.status || existing.status || "reported",
      input.username !== undefined ? input.username : (existing.username || ""),
      now,
      existing.id,
    );

    return mapWaReport(
      db
        .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
        .get(existing.id) as WaReportRow,
    );
  }

  // Insert new record (using provided id or generating a new one)
  const id = input.id || randomUUID();
  const photoUrlsJson = JSON.stringify(input.photoUrls || []);

  db.prepare(
    `INSERT INTO kpi_wa_reports (
      id, department_id, user_id, user_name, username, activity_id, project_id,
      title, leader_name, report_date, notes, photo_urls_json, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.departmentId,
    input.userId,
    input.userName || "",
    input.username || "",
    input.activityId ?? null,
    input.projectId ?? null,
    title,
    leaderName,
    reportDate,
    input.notes || "",
    photoUrlsJson,
    input.status || "reported",
    now,
    now,
  );

  return mapWaReport(
    db
      .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
      .get(id) as WaReportRow,
  );
}

export function appendWaReportPhotos(
  id: string,
  newUrls: string[],
): KpiWaReport | { error: string } {
  if (newUrls.length === 0) {
    const existing = getKpiWaReport(id);
    return existing ?? { error: "Laporan WhatsApp tidak ditemukan" };
  }
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
    .get(id) as WaReportRow | undefined;
  if (!row) return { error: "Laporan WhatsApp tidak ditemukan" };

  const current = mapWaReport(row);
  const combined = [...current.photoUrls, ...newUrls];
  const now = new Date().toISOString();

  db.prepare(
    "UPDATE kpi_wa_reports SET photo_urls_json = ?, updated_at = ? WHERE id = ?",
  ).run(JSON.stringify(combined), now, id);

  return mapWaReport(
    db
      .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
      .get(id) as WaReportRow,
  );
}

export function removeWaReportPhoto(
  id: string,
  urlToRemove: string,
): KpiWaReport | { error: string } {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
    .get(id) as WaReportRow | undefined;
  if (!row) return { error: "Laporan WhatsApp tidak ditemukan" };

  const current = mapWaReport(row);
  const updated = current.photoUrls.filter((u) => u !== urlToRemove);
  const now = new Date().toISOString();

  db.prepare(
    "UPDATE kpi_wa_reports SET photo_urls_json = ?, updated_at = ? WHERE id = ?",
  ).run(JSON.stringify(updated), now, id);

  return mapWaReport(
    db
      .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
      .get(id) as WaReportRow,
  );
}

export function deleteKpiWaReport(
  id: string,
): { ok: true } | { error: string } {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM kpi_wa_reports WHERE id = ?")
    .get(id) as WaReportRow | undefined;
  if (!row) return { error: "Laporan WhatsApp tidak ditemukan" };

  const current = mapWaReport(row);
  deleteWaReportPhotoFiles(current.photoUrls);
  deleteWaReportUploadFolder(id);

  db.prepare("DELETE FROM kpi_wa_reports WHERE id = ?").run(id);
  return { ok: true };
}
