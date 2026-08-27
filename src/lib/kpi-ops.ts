import { randomUUID } from "crypto";
import { deleteActivityUploadFolder } from "./activity-photos";
import { getDb, getMeta, setMeta } from "./db";
import { listDepartments, listKpiFunctions } from "./store";
import type {
  KpiActivity,
  KpiActivityDocument,
  KpiActivityFrequency,
  KpiActivityStatus,
  KpiAssessment,
  KpiProject,
  KpiProjectStatus,
} from "./types";

const ACTIVITY_FREQUENCIES: KpiActivityFrequency[] = [
  "daily",
  "weekly",
  "monthly",
];

function normalizeFrequency(
  value: string | null | undefined,
): KpiActivityFrequency {
  if (value && ACTIVITY_FREQUENCIES.includes(value as KpiActivityFrequency)) {
    return value as KpiActivityFrequency;
  }
  return "daily";
}

type ProjectRow = {
  id: string;
  code: string;
  department_id: string;
  kpi_function_id: string | null;
  title: string;
  description: string;
  status: string;
  owner_staff_id: string | null;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  department_id: string;
  project_id: string | null;
  kpi_function_id: string | null;
  title: string;
  description: string;
  status: string;
  frequency?: string | null;
  assignee_staff_id: string | null;
  activity_date: string | null;
  photo_urls_json?: string | null;
  document_urls_json?: string | null;
  created_at: string;
  updated_at: string;
};

type AssessmentRow = {
  id: string;
  department_id: string;
  period_label: string;
  staff_id: string | null;
  kpi_function_id: string;
  score: number;
  target_score: number;
  notes: string;
  assessed_by_name: string;
  created_at: string;
  updated_at: string;
};

function mapProject(row: ProjectRow): KpiProject {
  return {
    id: row.id,
    code: row.code,
    departmentId: row.department_id,
    kpiFunctionId: row.kpi_function_id,
    title: row.title,
    description: row.description,
    status: row.status as KpiProjectStatus,
    ownerStaffId: row.owner_staff_id,
    startDate: row.start_date,
    endDate: row.end_date,
    progressPercent: Number(row.progress_percent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === "string" && u.length > 0);
  } catch {
    return [];
  }
}

function parseDocuments(raw: string | null | undefined): KpiActivityDocument[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const docs: KpiActivityDocument[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && item) {
        docs.push({
          url: item,
          name: item.split("/").pop() || "dokumen",
        });
        continue;
      }
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string" &&
        (item as { url: string }).url
      ) {
        const url = (item as { url: string }).url;
        const name =
          typeof (item as { name?: unknown }).name === "string" &&
          (item as { name: string }).name
            ? (item as { name: string }).name
            : url.split("/").pop() || "dokumen";
        docs.push({ url, name });
      }
    }
    return docs;
  } catch {
    return [];
  }
}

function mapActivity(row: ActivityRow): KpiActivity {
  return {
    id: row.id,
    departmentId: row.department_id,
    projectId: row.project_id,
    kpiFunctionId: row.kpi_function_id,
    title: row.title,
    description: row.description,
    status: row.status as KpiActivityStatus,
    frequency: normalizeFrequency(row.frequency),
    assigneeStaffId: row.assignee_staff_id,
    activityDate: row.activity_date,
    photoUrls: parsePhotoUrls(row.photo_urls_json),
    documents: parseDocuments(row.document_urls_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssessment(row: AssessmentRow): KpiAssessment {
  return {
    id: row.id,
    departmentId: row.department_id,
    periodLabel: row.period_label,
    staffId: row.staff_id,
    kpiFunctionId: row.kpi_function_id,
    score: Number(row.score),
    targetScore: Number(row.target_score),
    notes: row.notes,
    assessedByName: row.assessed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nextProjectNumber(): number {
  const raw = getMeta("next_kpi_project_number");
  const current = raw ? Number(raw) : 1;
  return Number.isFinite(current) && current > 0 ? current : 1;
}

function bumpProjectNumber(used: number) {
  setMeta("next_kpi_project_number", String(used + 1));
}

export function listKpiProjects(departmentId?: string): KpiProject[] {
  listKpiFunctions();
  let sql = "SELECT * FROM kpi_projects";
  const params: string[] = [];
  if (departmentId) {
    sql += " WHERE department_id = ?";
    params.push(departmentId);
  }
  sql += " ORDER BY created_at DESC";
  return (getDb().prepare(sql).all(...params) as ProjectRow[]).map(mapProject);
}

export function getKpiProject(id: string): KpiProject | null {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_projects WHERE id = ?")
    .get(id) as ProjectRow | undefined;
  return row ? mapProject(row) : null;
}

export function isProjectLockedByActivities(projectId: string): boolean {
  listKpiFunctions();
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM kpi_activities
       WHERE project_id = ? AND status IN ('in_progress', 'done')
       LIMIT 1`,
    )
    .get(projectId) as { ok: number } | undefined;
  return Boolean(row);
}

export function upsertKpiProject(
  input: Partial<KpiProject> & {
    title: string;
    departmentId: string;
  },
): KpiProject | { error: string } {
  listKpiFunctions();
  const title = input.title.trim();
  if (!title) return { error: "Judul project wajib" };
  if (!listDepartments().some((d) => d.id === input.departmentId)) {
    return { error: "Departemen tidak valid" };
  }

  const now = new Date().toISOString();

  if (input.id) {
    if (isProjectLockedByActivities(input.id)) {
      return {
        error:
          "Project tidak bisa diedit: sudah ada kegiatan yang berjalan/selesai",
      };
    }
    const existing = getDb()
      .prepare("SELECT * FROM kpi_projects WHERE id = ?")
      .get(input.id) as ProjectRow | undefined;
    if (!existing) return { error: "Project tidak ditemukan" };
    getDb()
      .prepare(
        `UPDATE kpi_projects SET
          department_id = ?, kpi_function_id = ?, title = ?, description = ?,
          status = ?, owner_staff_id = ?, start_date = ?, end_date = ?,
          progress_percent = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.departmentId,
        input.kpiFunctionId ?? null,
        title,
        input.description ?? existing.description,
        input.status ?? existing.status,
        input.ownerStaffId ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        Number(input.progressPercent ?? existing.progress_percent),
        now,
        input.id,
      );
    return mapProject(
      getDb()
        .prepare("SELECT * FROM kpi_projects WHERE id = ?")
        .get(input.id) as ProjectRow,
    );
  }

  const num = nextProjectNumber();
  const year = new Date().getFullYear();
  const code = `PRJ-${year}-${String(num).padStart(4, "0")}`;
  const project: KpiProject = {
    id: randomUUID(),
    code,
    departmentId: input.departmentId,
    kpiFunctionId: input.kpiFunctionId ?? null,
    title,
    description: input.description ?? "",
    status: input.status ?? "planned",
    ownerStaffId: input.ownerStaffId ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    progressPercent: Number(input.progressPercent ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO kpi_projects (
        id, code, department_id, kpi_function_id, title, description, status,
        owner_staff_id, start_date, end_date, progress_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      project.id,
      project.code,
      project.departmentId,
      project.kpiFunctionId,
      project.title,
      project.description,
      project.status,
      project.ownerStaffId,
      project.startDate,
      project.endDate,
      project.progressPercent,
      project.createdAt,
      project.updatedAt,
    );
  bumpProjectNumber(num);
  return project;
}

export function deleteKpiProject(id: string): { ok: true } | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT id FROM kpi_projects WHERE id = ?")
    .get(id) as { id: string } | undefined;
  if (!row) return { error: "Project tidak ditemukan" };
  if (isProjectLockedByActivities(id)) {
    return {
      error:
        "Project tidak bisa dihapus: sudah ada kegiatan yang berjalan/selesai",
    };
  }
  getDb()
    .prepare("UPDATE kpi_activities SET project_id = NULL WHERE project_id = ?")
    .run(id);
  getDb().prepare("DELETE FROM kpi_projects WHERE id = ?").run(id);
  return { ok: true };
}

export function listKpiActivities(departmentId?: string): KpiActivity[] {
  listKpiFunctions();
  let sql = "SELECT * FROM kpi_activities";
  const params: string[] = [];
  if (departmentId) {
    sql += " WHERE department_id = ?";
    params.push(departmentId);
  }
  sql += " ORDER BY COALESCE(activity_date, created_at) DESC";
  return (getDb().prepare(sql).all(...params) as ActivityRow[]).map(mapActivity);
}

export function getKpiActivity(id: string): KpiActivity | null {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_activities WHERE id = ?")
    .get(id) as ActivityRow | undefined;
  return row ? mapActivity(row) : null;
}

export function upsertKpiActivity(
  input: Partial<KpiActivity> & { title: string; departmentId: string },
): KpiActivity | { error: string } {
  listKpiFunctions();
  const title = input.title.trim();
  if (!title) return { error: "Judul kegiatan wajib" };
  const now = new Date().toISOString();

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM kpi_activities WHERE id = ?")
      .get(input.id) as ActivityRow | undefined;
    if (!existing) return { error: "Kegiatan tidak ditemukan" };
    const frequency = normalizeFrequency(
      input.frequency ?? existing.frequency,
    );
    getDb()
      .prepare(
        `UPDATE kpi_activities SET
          department_id = ?, project_id = ?, kpi_function_id = ?, title = ?,
          description = ?, status = ?, frequency = ?, assignee_staff_id = ?,
          activity_date = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.departmentId,
        input.projectId ?? null,
        input.kpiFunctionId ?? null,
        title,
        input.description ?? existing.description,
        input.status ?? existing.status,
        frequency,
        input.assigneeStaffId ?? null,
        input.activityDate ?? null,
        now,
        input.id,
      );
    return mapActivity(
      getDb()
        .prepare("SELECT * FROM kpi_activities WHERE id = ?")
        .get(input.id) as ActivityRow,
    );
  }

  const activity: KpiActivity = {
    id: randomUUID(),
    departmentId: input.departmentId,
    projectId: input.projectId ?? null,
    kpiFunctionId: input.kpiFunctionId ?? null,
    title,
    description: input.description ?? "",
    status: input.status ?? "in_progress",
    frequency: normalizeFrequency(input.frequency),
    assigneeStaffId: input.assigneeStaffId ?? null,
    activityDate: input.activityDate ?? now.slice(0, 10),
    photoUrls: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO kpi_activities (
        id, department_id, project_id, kpi_function_id, title, description,
        status, frequency, assignee_staff_id, activity_date, photo_urls_json,
        document_urls_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      activity.id,
      activity.departmentId,
      activity.projectId,
      activity.kpiFunctionId,
      activity.title,
      activity.description,
      activity.status,
      activity.frequency,
      activity.assigneeStaffId,
      activity.activityDate,
      "[]",
      "[]",
      activity.createdAt,
      activity.updatedAt,
    );
  return activity;
}

export function appendActivityPhotos(
  activityId: string,
  urls: string[],
  maxTotal = 8,
): KpiActivity | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_activities WHERE id = ?")
    .get(activityId) as ActivityRow | undefined;
  if (!row) return { error: "Kegiatan tidak ditemukan" };
  const current = parsePhotoUrls(row.photo_urls_json);
  if (current.length + urls.length > maxTotal) {
    return {
      error: `Maksimal ${maxTotal} foto per kegiatan (sudah ${current.length})`,
    };
  }
  const next = [...current, ...urls];
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE kpi_activities SET photo_urls_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, activityId);
  return mapActivity(
    getDb()
      .prepare("SELECT * FROM kpi_activities WHERE id = ?")
      .get(activityId) as ActivityRow,
  );
}

export function removeActivityPhoto(
  activityId: string,
  url: string,
): KpiActivity | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_activities WHERE id = ?")
    .get(activityId) as ActivityRow | undefined;
  if (!row) return { error: "Kegiatan tidak ditemukan" };
  const next = parsePhotoUrls(row.photo_urls_json).filter((u) => u !== url);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE kpi_activities SET photo_urls_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, activityId);
  return mapActivity(
    getDb()
      .prepare("SELECT * FROM kpi_activities WHERE id = ?")
      .get(activityId) as ActivityRow,
  );
}

export function appendActivityDocuments(
  activityId: string,
  docs: KpiActivityDocument[],
  maxTotal = 8,
): KpiActivity | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_activities WHERE id = ?")
    .get(activityId) as ActivityRow | undefined;
  if (!row) return { error: "Kegiatan tidak ditemukan" };
  const current = parseDocuments(row.document_urls_json);
  if (current.length + docs.length > maxTotal) {
    return {
      error: `Maksimal ${maxTotal} dokumen per kegiatan (sudah ${current.length})`,
    };
  }
  const next = [...current, ...docs];
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE kpi_activities SET document_urls_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, activityId);
  return mapActivity(
    getDb()
      .prepare("SELECT * FROM kpi_activities WHERE id = ?")
      .get(activityId) as ActivityRow,
  );
}

export function removeActivityDocument(
  activityId: string,
  url: string,
): KpiActivity | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT * FROM kpi_activities WHERE id = ?")
    .get(activityId) as ActivityRow | undefined;
  if (!row) return { error: "Kegiatan tidak ditemukan" };
  const next = parseDocuments(row.document_urls_json).filter(
    (d) => d.url !== url,
  );
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE kpi_activities SET document_urls_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, activityId);
  return mapActivity(
    getDb()
      .prepare("SELECT * FROM kpi_activities WHERE id = ?")
      .get(activityId) as ActivityRow,
  );
}

export function deleteKpiActivity(id: string): { ok: true } | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT id FROM kpi_activities WHERE id = ?")
    .get(id) as { id: string } | undefined;
  if (!row) return { error: "Kegiatan tidak ditemukan" };
  getDb().prepare("DELETE FROM kpi_activities WHERE id = ?").run(id);
  deleteActivityUploadFolder(id);
  return { ok: true };
}

export type ActivityScoreRow = {
  kpiFunctionId: string | null;
  kpiFunctionName: string;
  weightPercent: number;
  total: number;
  done: number;
  inProgress: number;
  planned: number;
  /** Persentase capaian 0–100 dari kegiatan */
  achievementPercent: number;
  /** Skor 0–100 (sama dengan achievement untuk fungsi) */
  score: number;
};

export type ActivityScoreSummary = {
  departmentId: string;
  periodLabel: string | null;
  byFunction: ActivityScoreRow[];
  /** Skor tertimbang dept (fungsi berbobot > 0) */
  weightedScore: number | null;
  /** Persentase keseluruhan kegiatan dept */
  overallAchievementPercent: number;
  totalActivities: number;
  doneActivities: number;
};

/**
 * Hitung skor & % capaian mengikuti Master Fungsi KPI.
 * - Fungsi biasa: dari kegiatan (done=1, in_progress=0.5, planned=0)
 * - Kedisiplinan: rata-rata skor absensi (opsional lewat disciplineAvg)
 */
export function computeActivityScores(
  departmentId: string,
  periodLabel?: string | null,
  disciplineAvg?: number | null,
): ActivityScoreSummary {
  const functions = listKpiFunctions(true, departmentId);
  let activities = listKpiActivities(departmentId).filter(
    (a) => a.status !== "cancelled",
  );
  if (periodLabel) {
    activities = activities.filter((a) => {
      const d = a.activityDate || a.createdAt.slice(0, 10);
      return d.startsWith(periodLabel);
    });
  }

  const progressOf = (status: string) => {
    if (status === "done") return 1;
    if (status === "in_progress") return 0.5;
    return 0;
  };

  const byFunction: ActivityScoreRow[] = [];
  let weighted = 0;
  let usedWeight = 0;

  for (const fn of functions) {
    const isDisc = /kedisiplinan|kehadiran/i.test(fn.name);
    if (isDisc) {
      const score =
        disciplineAvg != null && Number.isFinite(disciplineAvg)
          ? Math.round(disciplineAvg * 10) / 10
          : 0;
      byFunction.push({
        kpiFunctionId: fn.id,
        kpiFunctionName: fn.name,
        weightPercent: fn.weightPercent,
        total: disciplineAvg != null ? 1 : 0,
        done: score >= 80 ? 1 : 0,
        inProgress: 0,
        planned: 0,
        achievementPercent: score,
        score,
      });
      if (fn.weightPercent > 0) {
        weighted += score * fn.weightPercent;
        usedWeight += fn.weightPercent;
      }
      continue;
    }

    const list = activities.filter((a) => a.kpiFunctionId === fn.id);
    const done = list.filter((a) => a.status === "done").length;
    const inProgress = list.filter((a) => a.status === "in_progress").length;
    const planned = list.filter((a) => a.status === "planned").length;
    const total = list.length;
    const sumProgress = list.reduce((s, a) => s + progressOf(a.status), 0);
    const achievementPercent =
      total === 0 ? 0 : Math.round((sumProgress / total) * 1000) / 10;
    byFunction.push({
      kpiFunctionId: fn.id,
      kpiFunctionName: fn.name,
      weightPercent: fn.weightPercent,
      total,
      done,
      inProgress,
      planned,
      achievementPercent,
      score: achievementPercent,
    });
    if (fn.weightPercent > 0) {
      weighted += achievementPercent * fn.weightPercent;
      usedWeight += fn.weightPercent;
    }
  }

  const totalActivities = activities.length;
  const doneActivities = activities.filter((a) => a.status === "done").length;
  const overallAchievementPercent =
    usedWeight > 0 ? Math.round((weighted / usedWeight) * 10) / 10 : 0;

  return {
    departmentId,
    periodLabel: periodLabel || null,
    byFunction,
    weightedScore:
      usedWeight > 0 ? Math.round((weighted / usedWeight) * 10) / 10 : null,
    overallAchievementPercent,
    totalActivities,
    doneActivities,
  };
}

export function listKpiAssessments(departmentId?: string): KpiAssessment[] {
  listKpiFunctions();
  let sql = "SELECT * FROM kpi_assessments";
  const params: string[] = [];
  if (departmentId) {
    sql += " WHERE department_id = ?";
    params.push(departmentId);
  }
  sql += " ORDER BY period_label DESC, created_at DESC";
  return (getDb().prepare(sql).all(...params) as AssessmentRow[]).map(
    mapAssessment,
  );
}

export function upsertKpiAssessment(
  input: Partial<KpiAssessment> & {
    departmentId: string;
    periodLabel: string;
    kpiFunctionId: string;
    score: number;
  },
): KpiAssessment | { error: string } {
  listKpiFunctions();
  const periodLabel = input.periodLabel.trim();
  if (!periodLabel) return { error: "Periode wajib (contoh: 2026-Q3)" };
  const score = Number(input.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { error: "Skor harus 0–100" };
  }
  const targetScore = Number(input.targetScore ?? 100);
  const now = new Date().toISOString();

  if (input.id) {
    const existing = getDb()
      .prepare("SELECT * FROM kpi_assessments WHERE id = ?")
      .get(input.id) as AssessmentRow | undefined;
    if (!existing) return { error: "Penilaian tidak ditemukan" };
    getDb()
      .prepare(
        `UPDATE kpi_assessments SET
          department_id = ?, period_label = ?, staff_id = ?, kpi_function_id = ?,
          score = ?, target_score = ?, notes = ?, assessed_by_name = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.departmentId,
        periodLabel,
        input.staffId ?? null,
        input.kpiFunctionId,
        score,
        targetScore,
        input.notes ?? existing.notes,
        input.assessedByName ?? existing.assessed_by_name,
        now,
        input.id,
      );
    return mapAssessment(
      getDb()
        .prepare("SELECT * FROM kpi_assessments WHERE id = ?")
        .get(input.id) as AssessmentRow,
    );
  }

  const item: KpiAssessment = {
    id: randomUUID(),
    departmentId: input.departmentId,
    periodLabel,
    staffId: input.staffId ?? null,
    kpiFunctionId: input.kpiFunctionId,
    score,
    targetScore,
    notes: input.notes ?? "",
    assessedByName: input.assessedByName ?? "",
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO kpi_assessments (
        id, department_id, period_label, staff_id, kpi_function_id,
        score, target_score, notes, assessed_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.id,
      item.departmentId,
      item.periodLabel,
      item.staffId,
      item.kpiFunctionId,
      item.score,
      item.targetScore,
      item.notes,
      item.assessedByName,
      item.createdAt,
      item.updatedAt,
    );
  return item;
}

export function deleteKpiAssessment(id: string): { ok: true } | { error: string } {
  listKpiFunctions();
  const row = getDb()
    .prepare("SELECT id FROM kpi_assessments WHERE id = ?")
    .get(id) as { id: string } | undefined;
  if (!row) return { error: "Penilaian tidak ditemukan" };
  getDb().prepare("DELETE FROM kpi_assessments WHERE id = ?").run(id);
  return { ok: true };
}
