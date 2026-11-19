import { randomUUID } from "crypto";
import { ensureDisciplineScoreIndicators } from "./attendance-ops";
import { getDb, boolToInt, getMeta, intToBool, setMeta } from "./db";
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
import { GRAPHIC_DESIGN_SCORE_TEMPLATE } from "./kpi-graphic-design-template";
import { MAJU_WORKBOOK } from "./kpi-maju-workbook";
import {
  IT_MANAGER_SCORE_TEMPLATE,
  IT_SUPPORT_SCORE_TEMPLATE,
} from "./kpi-it-maju-template";
import { inferMajuGroup } from "./kpi-maju";
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
  jabatan_id?: string | null;
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
    jabatanId: row.jabatan_id || null,
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
    jabatanId?: string | null;
  },
): KpiScoreIndicator | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: "Nama indikator wajib" };
  const now = new Date().toISOString();
  const configJson = JSON.stringify(input.config ?? {});

  if (input.id) {
    const existing = getKpiScoreIndicator(input.id);
    if (!existing) return { error: "Indikator tidak ditemukan" };
    const jabatanId =
      input.jabatanId !== undefined
        ? input.jabatanId || null
        : existing.jabatanId;
    getDb()
      .prepare(
        `UPDATE kpi_score_indicators SET
          department_id = ?, kpi_function_id = ?, name = ?, description = ?,
          weight_percent = ?, metric_type = ?, config_json = ?,
          sort_order = ?, active = ?, jabatan_id = ?, updated_at = ?
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
        jabatanId,
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
        jabatan_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.jabatanId || null,
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

function jabatanIdForName(name: string | undefined): string | null {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare("SELECT id FROM jabatan WHERE lower(name) = lower(?) LIMIT 1")
    .get(trimmed) as { id: string } | undefined;
  return row?.id ?? null;
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

  const groupCode = item.groupCode || inferMajuGroup(item.name);
  if (existing) {
    db.prepare(
      `UPDATE kpi_functions SET
        weight_percent = ?, group_code = ?, focus = ?, sort_order = ?, active = 1
       WHERE id = ?`,
    ).run(item.weightPercent, groupCode, item.focus, item.sortOrder, existing.id);
    return existing.id;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO kpi_functions
      (id, department_id, name, weight_percent, group_code, focus, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    id,
    departmentId,
    item.name,
    item.weightPercent,
    groupCode,
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
            jabatan_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
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
          jabatanIdForName(ind.config.jabatanName),
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

/** Jika dept IT belum punya aturan skor support terbaru, terapkan template otomatis */
export function ensureITScoreRules() {
  ensureDepartmentKpiTemplates();
  ensureBuiltInScoreTemplates();
  const it = listDepartments(true).find((d) => d.code.toUpperCase() === "IT");
  if (!it) return;
  const inds = listKpiScoreIndicators(it.id);
  const hasSupportWeighted =
    inds.some((i) => i.name === "User Satisfaction") &&
    inds.some((i) => i.name === "Non-repeat Issue") &&
    inds.some(
      (i) => i.name === "Ticket selesai SLA" && i.weightPercent >= 30,
    );
  if (inds.length > 0 && hasSupportWeighted) return;
  applyScoreTemplateToDepartment(it.id, "IT");
}

/** Tandai indikator Backup/Patch yang sudah ada sebagai sumber kegiatan */
function ensureActivityIndicatorSources() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, config_json FROM kpi_score_indicators WHERE active = 1`,
    )
    .all() as Array<{ id: string; name: string; config_json: string }>;
  const now = new Date().toISOString();
  for (const row of rows) {
    if (!/backup|patch/i.test(row.name)) continue;
    let config: KpiScoreIndicatorConfig = {};
    try {
      config = JSON.parse(row.config_json || "{}") as KpiScoreIndicatorConfig;
    } catch {
      continue;
    }
    if (config.dataSource === "activity") continue;
    config.dataSource = "activity";
    db.prepare(
      `UPDATE kpi_score_indicators SET config_json = ?, updated_at = ? WHERE id = ?`,
    ).run(JSON.stringify(config), now, row.id);
  }
}

const MARKOM_RULES_VERSION = "3";
const GRAPHIC_DESIGN_RULES_VERSION = "1";
const MARKOM_FUNCTION_NAMES = [
  "Mutu",
  "Andal",
  "Jalin Kerja Sama",
  "Unjuk Kerja",
];

/** Fungsi yang sudah ada tidak ditimpa teksnya. Dipakai lembar jabatan kedua di departemen yang sama. */
function ensureFunctionRow(
  departmentId: string,
  item: ScoreFunctionTemplate,
  updateText: boolean,
): string {
  if (updateText) return upsertFunctionForTemplate(departmentId, item);
  const existing = getDb()
    .prepare(
      `SELECT id FROM kpi_functions
       WHERE department_id = ? AND lower(name) = lower(?)`,
    )
    .get(departmentId, item.name) as { id: string } | undefined;
  if (!existing) return upsertFunctionForTemplate(departmentId, item);
  getDb()
    .prepare(`UPDATE kpi_functions SET active = 1 WHERE id = ?`)
    .run(existing.id);
  return existing.id;
}

/** Indikator milik satu jabatan. Kode yang sama boleh dipakai jabatan lain di fungsi yang sama. */
function upsertJabatanIndicators(
  departmentId: string,
  jabatanId: string,
  template: ScoreFunctionTemplate[],
  refresh: boolean,
  updateFunctionText: boolean,
) {
  const db = getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const fn of template) {
      const fnId = ensureFunctionRow(departmentId, fn, updateFunctionText);
      const rows = db
        .prepare(
          `SELECT id, jabatan_id, config_json FROM kpi_score_indicators
           WHERE department_id = ? AND kpi_function_id = ?`,
        )
        .all(departmentId, fnId) as Array<{
        id: string;
        jabatan_id: string | null;
        config_json: string;
      }>;
      for (const ind of fn.indicators) {
        const code = ind.config.code || "";
        const existing = rows.find((row) => {
          if ((row.jabatan_id || "") !== jabatanId) return false;
          if (!code) return false;
          try {
            const parsed = JSON.parse(row.config_json) as { code?: string };
            return parsed.code === code;
          } catch {
            return false;
          }
        });
        if (existing && !refresh) continue;
        const config = { ...ind.config };
        if (existing) {
          db.prepare(
            `UPDATE kpi_score_indicators SET
              name = ?, description = ?, weight_percent = ?, metric_type = ?,
              config_json = ?, sort_order = ?, active = 1, jabatan_id = ?,
              updated_at = ?
             WHERE id = ?`,
          ).run(
            ind.name,
            ind.description,
            ind.weightPercent,
            ind.metricType,
            JSON.stringify(config),
            ind.sortOrder,
            jabatanId,
            now,
            existing.id,
          );
        } else {
          db.prepare(
            `INSERT INTO kpi_score_indicators (
              id, department_id, kpi_function_id, name, description,
              weight_percent, metric_type, config_json, sort_order, active,
              jabatan_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          ).run(
            randomUUID(),
            departmentId,
            fnId,
            ind.name,
            ind.description,
            ind.weightPercent,
            ind.metricType,
            JSON.stringify(config),
            ind.sortOrder,
            jabatanId,
            now,
            now,
          );
        }
      }
    }
  });
  tx();
}

/** Pasang lembar Markom di departemen jabatan Marketing & Communication. */
export function ensureMarkomScoreRules() {
  const versionKey = "kpi_markom_rules_version";
  if (getMeta(versionKey) === MARKOM_RULES_VERSION) return;
  ensureBuiltInScoreTemplates();
  listDepartments(true);
  const jabatan = getDb()
    .prepare(
      `SELECT id, department_id FROM jabatan WHERE lower(name) = lower(?)`,
    )
    .get("Marketing & Communication") as
    | { id: string; department_id: string | null }
    | undefined;
  const departmentId = jabatan?.department_id?.trim() || "";
  if (!jabatan || !departmentId) return;
  const template = scoreTemplateForDepartmentCode("MKT");
  if (!template) return;
  const db = getDb();
  const mkt = listDepartments(true).find(
    (dept) => dept.code.toUpperCase() === "MKT",
  );

  upsertJabatanIndicators(departmentId, jabatan.id, template, true, true);

  const tx = db.transaction(() => {
    if (mkt && mkt.id !== departmentId) {
      const placeholders = MARKOM_FUNCTION_NAMES.map(() => "?").join(", ");
      db.prepare(
        `UPDATE kpi_functions SET active = 0
         WHERE department_id = ? AND name IN (${placeholders})`,
      ).run(mkt.id, ...MARKOM_FUNCTION_NAMES);
      db.prepare(
        `UPDATE kpi_score_indicators SET active = 0
         WHERE department_id = ? AND kpi_function_id IN (
           SELECT id FROM kpi_functions
           WHERE department_id = ? AND name IN (${placeholders})
         )`,
      ).run(mkt.id, mkt.id, ...MARKOM_FUNCTION_NAMES);
      const previous = [
        "Lead Generation",
        "Brand & Content",
        "Demand Conversion",
        "Market Insight",
      ];
      const previousPlaceholders = previous.map(() => "?").join(", ");
      db.prepare(
        `UPDATE kpi_functions SET active = 1
         WHERE department_id = ? AND name IN (${previousPlaceholders})`,
      ).run(mkt.id, ...previous);
    }
  });
  tx();
  setMeta(versionKey, MARKOM_RULES_VERSION);
}

/** Pasang lembar Graphic Design di departemen jabatan itu, terpisah dari Markom. */
export function ensureGraphicDesignScoreRules() {
  const versionKey = "kpi_graphic_design_rules_version";
  if (getMeta(versionKey) === GRAPHIC_DESIGN_RULES_VERSION) return;
  if (getMeta("kpi_maju_sheet_graphic_design") === "1") return;
  listDepartments(true);
  const jabatan = getDb()
    .prepare(
      `SELECT id, department_id FROM jabatan WHERE lower(name) = lower(?)`,
    )
    .get("Graphic Design") as
    | { id: string; department_id: string | null }
    | undefined;
  const departmentId = jabatan?.department_id?.trim() || "";
  if (!jabatan || !departmentId) return;
  upsertJabatanIndicators(
    departmentId,
    jabatan.id,
    GRAPHIC_DESIGN_SCORE_TEMPLATE,
    true,
    false,
  );
  const count = GRAPHIC_DESIGN_SCORE_TEMPLATE.reduce(
    (sum, fn) => sum + fn.indicators.length,
    0,
  );
  getDb()
    .prepare(
      `UPDATE jabatan SET indicator_count = ?, updated_at = ? WHERE id = ?`,
    )
    .run(count, new Date().toISOString(), jabatan.id);
  setMeta(versionKey, GRAPHIC_DESIGN_RULES_VERSION);
}

const IT_ROLE_SHEETS: Array<{
  jabatanName: string;
  versionKey: string;
  version: string;
  template: ScoreFunctionTemplate[];
  updateFunctionText: boolean;
}> = [
  {
    jabatanName: "IT Support",
    versionKey: "kpi_it_support_rules_version",
    version: "1",
    template: IT_SUPPORT_SCORE_TEMPLATE,
    updateFunctionText: true,
  },
  {
    jabatanName: "IT Manager",
    versionKey: "kpi_it_manager_rules_version",
    version: "2",
    template: IT_MANAGER_SCORE_TEMPLATE,
    updateFunctionText: false,
  },
];

/** Pasang lembar IT Support dan IT Manager di departemen masing-masing jabatan. */
export function ensureItRoleScoreRules() {
  const pending = IT_ROLE_SHEETS.filter(
    (sheet) =>
      getMeta(sheet.versionKey) !== sheet.version &&
      getMeta(
        `kpi_maju_sheet_${sheet.jabatanName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      ) !== "1",
  );
  if (pending.length === 0) return;
  listDepartments(true);
  const db = getDb();
  for (const sheet of pending) {
    const jabatan = db
      .prepare(
        `SELECT id, department_id FROM jabatan WHERE lower(name) = lower(?)`,
      )
      .get(sheet.jabatanName) as
      | { id: string; department_id: string | null }
      | undefined;
    const departmentId = jabatan?.department_id?.trim() || "";
    if (!jabatan || !departmentId) continue;
    upsertJabatanIndicators(
      departmentId,
      jabatan.id,
      sheet.template,
      true,
      sheet.updateFunctionText,
    );
    const count = sheet.template.reduce(
      (sum, fn) => sum + fn.indicators.length,
      0,
    );
    db.prepare(
      `UPDATE jabatan SET indicator_count = ?, updated_at = ? WHERE id = ?`,
    ).run(count, new Date().toISOString(), jabatan.id);
    setMeta(sheet.versionKey, sheet.version);
  }
}

/** Andal umum departemen sudah memuat kehadiran. Andal khusus satu jabatan tidak menyembunyikan kedisiplinan jabatan lain. */
function hideCombinedDisciplineWhereAndalExists() {
  getDb()
    .prepare(
      `UPDATE kpi_functions
       SET active = 0
       WHERE lower(name) = lower('Kedisiplinan & Kehadiran')
         AND department_id IN (
           SELECT f.department_id
           FROM kpi_functions f
           JOIN kpi_score_indicators i
             ON i.kpi_function_id = f.id AND i.active = 1
           WHERE f.active = 1
             AND lower(f.name) = 'andal'
             AND (i.jabatan_id IS NULL OR trim(i.jabatan_id) = '')
         )`,
    )
    .run();
}

function majuSheetVersionKey(jabatanName: string): string {
  return `kpi_maju_sheet_${jabatanName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function retireJabatanIndicatorsNotInSheet(
  departmentId: string,
  jabatanId: string,
  template: ScoreFunctionTemplate[],
) {
  const wanted = new Set(
    template.flatMap((fn) =>
      fn.indicators.map((ind) => ind.config.code || ""),
    ),
  );
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, config_json FROM kpi_score_indicators
       WHERE department_id = ? AND jabatan_id = ? AND active = 1`,
    )
    .all(departmentId, jabatanId) as Array<{
    id: string;
    config_json: string;
  }>;
  const now = new Date().toISOString();
  for (const row of rows) {
    let code = "";
    try {
      code = String(
        (JSON.parse(row.config_json) as { code?: string }).code || "",
      );
    } catch {
      code = "";
    }
    if (wanted.has(code)) continue;
    db.prepare(
      `UPDATE kpi_score_indicators SET active = 0, updated_at = ? WHERE id = ?`,
    ).run(now, row.id);
  }
}

/** Pasang lembar KPI MAJU per jabatan. Jabatan tanpa departemen ditunda. */
export function ensureMajuWorkbookRules() {
  const pending = MAJU_WORKBOOK.filter(
    (sheet) => getMeta(majuSheetVersionKey(sheet.jabatanName)) !== "1",
  );
  if (pending.length === 0) return;
  listDepartments(true);
  const db = getDb();
  const now = new Date().toISOString();
  for (const sheet of pending) {
    const jabatan = db
      .prepare(
        `SELECT id, department_id FROM jabatan WHERE lower(name) = lower(?)`,
      )
      .get(sheet.jabatanName) as
      | { id: string; department_id: string | null }
      | undefined;
    const departmentId = jabatan?.department_id?.trim() || "";
    if (!jabatan || !departmentId) continue;
    upsertJabatanIndicators(
      departmentId,
      jabatan.id,
      sheet.functions,
      true,
      false,
    );
    retireJabatanIndicatorsNotInSheet(
      departmentId,
      jabatan.id,
      sheet.functions,
    );
    const count = sheet.functions.reduce(
      (sum, fn) => sum + fn.indicators.length,
      0,
    );
    db.prepare(
      `UPDATE jabatan
       SET indicator_count = ?, score_method = ?, updated_at = ?
       WHERE id = ?`,
    ).run(count, sheet.scoreMethod, now, jabatan.id);
    setMeta(majuSheetVersionKey(sheet.jabatanName), "1");
  }
}

/** Pastikan template skor dept yang sudah didukung terisi */
export function ensureDepartmentScoreRules() {
  ensureBuiltInScoreTemplates();
  ensureMekanikScoreRules();
  ensureITScoreRules();
  ensureItRoleScoreRules();
  ensureMarkomScoreRules();
  ensureGraphicDesignScoreRules();
  ensureMajuWorkbookRules();
  ensureDisciplineScoreIndicators();
  ensureActivityIndicatorSources();
  hideCombinedDisciplineWhereAndalExists();
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
