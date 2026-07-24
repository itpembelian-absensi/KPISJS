import { randomUUID } from "crypto";
import {
  DISCIPLINE_FN_NAME,
  ensureDisciplineKpiFunctions,
} from "./attendance-ops";
import { getDb, boolToInt, intToBool } from "./db";
import {
  METRIC_TYPE_LABEL,
  scoreTemplateForDepartmentCode,
  type ScoreFunctionTemplate,
} from "./kpi-score-templates";
import {
  ensureBuiltInScoreTemplates,
  getKpiScoreTemplateByCode,
  listKpiScoreTemplates,
} from "./kpi-score-template-ops";
import {
  ensureDepartmentKpiTemplates,
  listDepartments,
  listKpiFunctions,
} from "./store";
import type {
  KpiScoreIndicator,
  KpiScoreIndicatorConfig,
  KpiScoreMetricType,
} from "./types";

export { METRIC_TYPE_LABEL };

type IndicatorRow = {
  id: string;
  department_id: string;
  kpi_function_id: string;
  name: string;
  description: string;
  weight_percent: number;
  metric_type: string;
  config_json: string;
  sort_order: number;
  active: number;
  created_at: string;
  updated_at: string;
};

function parseConfig(raw: string | null | undefined): KpiScoreIndicatorConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as KpiScoreIndicatorConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mapIndicator(row: IndicatorRow): KpiScoreIndicator {
  return {
    id: row.id,
    departmentId: row.department_id,
    kpiFunctionId: row.kpi_function_id,
    name: row.name,
    description: row.description,
    weightPercent: Number(row.weight_percent),
    metricType: row.metric_type as KpiScoreMetricType,
    config: parseConfig(row.config_json),
    sortOrder: Number(row.sort_order),
    active: intToBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listKpiScoreIndicators(
  departmentId?: string,
): KpiScoreIndicator[] {
  let sql = "SELECT * FROM kpi_score_indicators";
  const params: string[] = [];
  if (departmentId) {
    sql += " WHERE department_id = ?";
    params.push(departmentId);
  }
  sql += " ORDER BY sort_order, name";
  return (getDb().prepare(sql).all(...params) as IndicatorRow[]).map(
    mapIndicator,
  );
}

export function getKpiScoreIndicator(id: string): KpiScoreIndicator | null {
  const row = getDb()
    .prepare("SELECT * FROM kpi_score_indicators WHERE id = ?")
    .get(id) as IndicatorRow | undefined;
  return row ? mapIndicator(row) : null;
}

export function upsertKpiScoreIndicator(
  input: Partial<KpiScoreIndicator> & {
    departmentId: string;
    kpiFunctionId: string;
    name: string;
    metricType: KpiScoreMetricType;
  },
): KpiScoreIndicator | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: "Nama indikator wajib" };
  const now = new Date().toISOString();
  const configJson = JSON.stringify(input.config ?? {});

  if (input.id) {
    const existing = getKpiScoreIndicator(input.id);
    if (!existing) return { error: "Indikator tidak ditemukan" };
    getDb()
      .prepare(
        `UPDATE kpi_score_indicators SET
          department_id = ?, kpi_function_id = ?, name = ?, description = ?,
          weight_percent = ?, metric_type = ?, config_json = ?,
          sort_order = ?, active = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.departmentId,
        input.kpiFunctionId,
        name,
        input.description ?? existing.description,
        input.weightPercent ?? existing.weightPercent,
        input.metricType,
        configJson,
        input.sortOrder ?? existing.sortOrder,
        boolToInt(input.active ?? existing.active),
        now,
        input.id,
      );
    return getKpiScoreIndicator(input.id)!;
  }

  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO kpi_score_indicators (
        id, department_id, kpi_function_id, name, description,
        weight_percent, metric_type, config_json, sort_order, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.departmentId,
      input.kpiFunctionId,
      name,
      input.description ?? "",
      input.weightPercent ?? 100,
      input.metricType,
      configJson,
      input.sortOrder ?? 0,
      boolToInt(input.active ?? true),
      now,
      now,
    );
  return getKpiScoreIndicator(id)!;
}

export function deleteKpiScoreIndicator(
  id: string,
): { ok: true } | { error: string } {
  const existing = getKpiScoreIndicator(id);
  if (!existing) return { error: "Indikator tidak ditemukan" };
  getDb().prepare("DELETE FROM kpi_score_indicators WHERE id = ?").run(id);
  return { ok: true };
}

function upsertFunctionForTemplate(
  departmentId: string,
  item: ScoreFunctionTemplate,
): string {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM kpi_functions
       WHERE department_id = ? AND lower(name) = lower(?)`,
    )
    .get(departmentId, item.name) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE kpi_functions SET
        weight_percent = ?, focus = ?, sort_order = ?, active = 1
       WHERE id = ?`,
    ).run(item.weightPercent, item.focus, item.sortOrder, existing.id);
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO kpi_functions
      (id, department_id, name, weight_percent, focus, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    id,
    departmentId,
    item.name,
    item.weightPercent,
    item.focus,
    item.sortOrder,
  );
  return id;
}

function resolveTemplateFunctions(
  templateCode: string,
  deptCode?: string,
): ScoreFunctionTemplate[] | null {
  ensureBuiltInScoreTemplates();
  const fromDb =
    getKpiScoreTemplateByCode(templateCode) ||
    (deptCode ? getKpiScoreTemplateByCode(deptCode) : null);
  if (fromDb?.functions?.length) return fromDb.functions;
  return (
    scoreTemplateForDepartmentCode(templateCode) ||
    (deptCode ? scoreTemplateForDepartmentCode(deptCode) : null)
  );
}

/**
 * Terapkan template aturan skor ke departemen.
 * - Upsert fungsi sesuai template
 * - Hapus indikator lama pada fungsi template, lalu isi ulang
 */
export function applyScoreTemplateToDepartment(
  departmentId: string,
  templateCode = "MTR",
): { ok: true; functions: number; indicators: number } | { error: string } {
  const dept = listDepartments().find((d) => d.id === departmentId);
  if (!dept) return { error: "Departemen tidak ditemukan" };

  const template = resolveTemplateFunctions(templateCode, dept.code);
  if (!template) {
    return {
      error: `Belum ada template skor untuk kode ${templateCode}/${dept.code}`,
    };
  }

  const db = getDb();
  let functionCount = 0;
  let indicatorCount = 0;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const fn of template) {
      const fnId = upsertFunctionForTemplate(departmentId, fn);
      functionCount += 1;

      db.prepare(
        "DELETE FROM kpi_score_indicators WHERE kpi_function_id = ?",
      ).run(fnId);

      for (const ind of fn.indicators) {
        db.prepare(
          `INSERT INTO kpi_score_indicators (
            id, department_id, kpi_function_id, name, description,
            weight_percent, metric_type, config_json, sort_order, active,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        ).run(
          randomUUID(),
          departmentId,
          fnId,
          ind.name,
          ind.description,
          ind.weightPercent,
          ind.metricType,
          JSON.stringify(ind.config),
          ind.sortOrder,
          now,
          now,
        );
        indicatorCount += 1;
      }
    }
  });
  tx();

  return { ok: true, functions: functionCount, indicators: indicatorCount };
}

/** Pastikan dept Mekanik (MTR) ada */
export function ensureMekanikDepartment(): string | null {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM departments WHERE upper(code) = 'MTR' LIMIT 1")
    .get() as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE departments SET active = 1 WHERE id = ?").run(existing.id);
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO departments (id, code, name, description, active)
     VALUES (?, 'MTR', 'Mekanik', 'Perawatan & perbaikan kendaraan / alat berat', 1)`,
  ).run(id);
  return id;
}

/** Jika dept MTR belum punya indikator, terapkan template otomatis */
export function ensureMekanikScoreRules() {
  ensureMekanikDepartment();
  ensureDepartmentKpiTemplates();
  const mtr = listDepartments(true).find(
    (d) => d.code.toUpperCase() === "MTR",
  );
  if (!mtr) return;
  const count = listKpiScoreIndicators(mtr.id).length;
  if (count > 0) return;
  applyScoreTemplateToDepartment(mtr.id, "MTR");
}

/** Jika dept IT belum punya indikator skor, terapkan template otomatis */
export function ensureITScoreRules() {
  ensureDepartmentKpiTemplates();
  const it = listDepartments(true).find((d) => d.code.toUpperCase() === "IT");
  if (!it) return;
  const count = listKpiScoreIndicators(it.id).length;
  if (count > 0) return;
  applyScoreTemplateToDepartment(it.id, "IT");
}

/** Pastikan setiap dept punya indikator skor absensi di fungsi Kedisiplinan & Kehadiran */
export function ensureDisciplineScoreIndicators() {
  ensureDisciplineKpiFunctions();
  const db = getDb();
  const depts = listDepartments(true);
  const now = new Date().toISOString();
  const configJson = JSON.stringify({
    dataSource: "attendance",
    notes: "Sumber: modul Absensi & Kedisiplinan (sudah terhubung)",
  });

  const tx = db.transaction(() => {
    for (const dept of depts) {
      const fn = db
        .prepare(
          `SELECT id FROM kpi_functions
           WHERE department_id = ? AND lower(name) = lower(?)
           LIMIT 1`,
        )
        .get(dept.id, DISCIPLINE_FN_NAME) as { id: string } | undefined;
      if (!fn) continue;

      db.prepare("UPDATE kpi_functions SET active = 1 WHERE id = ?").run(fn.id);

      const existing = db
        .prepare(
          `SELECT id, active, metric_type FROM kpi_score_indicators
           WHERE kpi_function_id = ?
             AND (
               metric_type = 'attendance'
               OR lower(name) = lower('Skor absensi periode')
             )
           LIMIT 1`,
        )
        .get(fn.id) as
        | { id: string; active: number; metric_type: string }
        | undefined;

      if (existing) {
        db.prepare(
          `UPDATE kpi_score_indicators SET
            active = 1,
            metric_type = 'attendance',
            config_json = ?,
            weight_percent = 100,
            updated_at = ?
           WHERE id = ?`,
        ).run(configJson, now, existing.id);
        continue;
      }

      db.prepare(
        `INSERT INTO kpi_score_indicators (
          id, department_id, kpi_function_id, name, description,
          weight_percent, metric_type, config_json, sort_order, active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 100, 'attendance', ?, 1, 1, ?, ?)`,
      ).run(
        randomUUID(),
        dept.id,
        fn.id,
        "Skor absensi periode",
        "Dari impor absensi (kehadiran, terlambat, lembur, pulang cepat)",
        configJson,
        now,
        now,
      );
    }
  });
  tx();
}

/** Pastikan template skor dept yang sudah didukung terisi */
export function ensureDepartmentScoreRules() {
  ensureBuiltInScoreTemplates();
  ensureMekanikScoreRules();
  ensureITScoreRules();
  ensureDisciplineScoreIndicators();
}

export function listScoreTemplateCodes(): Array<{
  code: string;
  label: string;
}> {
  return listKpiScoreTemplates(true).map((t) => ({
    code: t.code,
    label: t.label,
  }));
}
