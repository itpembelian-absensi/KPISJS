import { randomUUID } from "crypto";
import { getDb, boolToInt, intToBool } from "./db";
import { SCORE_TEMPLATE_BY_CODE } from "./kpi-score-templates";
import { listDepartments, listKpiFunctions } from "./store";
import type {
  KpiScoreIndicatorConfig,
  KpiScoreMetricType,
  KpiScoreTemplate,
  KpiScoreTemplateFunction,
  KpiScoreTemplateIndicator,
} from "./types";

type TemplateRow = {
  id: string;
  code: string;
  label: string;
  description: string;
  functions_json: string;
  active: number;
  created_at: string;
  updated_at: string;
};

function parseFunctions(raw: string | null | undefined): KpiScoreTemplateFunction[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as KpiScoreTemplateFunction[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((fn, fi) => ({
      name: String(fn.name || "").trim(),
      weightPercent: Number(fn.weightPercent ?? 0),
      focus: String(fn.focus || ""),
      sortOrder: Number(fn.sortOrder ?? fi + 1),
      indicators: Array.isArray(fn.indicators)
        ? fn.indicators.map((ind, ii) => normalizeIndicator(ind, ii))
        : [],
    }));
  } catch {
    return [];
  }
}

function normalizeIndicator(
  ind: Partial<KpiScoreTemplateIndicator>,
  index: number,
): KpiScoreTemplateIndicator {
  const metricType = (ind.metricType || "weighted_leaf") as KpiScoreMetricType;
  return {
    name: String(ind.name || "").trim(),
    description: String(ind.description || ""),
    weightPercent: Number(ind.weightPercent ?? 100),
    metricType,
    config:
      ind.config && typeof ind.config === "object" ? { ...ind.config } : {},
    sortOrder: Number(ind.sortOrder ?? index + 1),
  };
}

function mapTemplate(row: TemplateRow): KpiScoreTemplate {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    functions: parseFunctions(row.functions_json),
    active: intToBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listKpiScoreTemplates(activeOnly = false): KpiScoreTemplate[] {
  ensureBuiltInScoreTemplates();
  let sql = "SELECT * FROM kpi_score_templates";
  if (activeOnly) sql += " WHERE active = 1";
  sql += " ORDER BY code";
  return (getDb().prepare(sql).all() as TemplateRow[]).map(mapTemplate);
}

export function getKpiScoreTemplate(id: string): KpiScoreTemplate | null {
  ensureBuiltInScoreTemplates();
  const row = getDb()
    .prepare("SELECT * FROM kpi_score_templates WHERE id = ?")
    .get(id) as TemplateRow | undefined;
  return row ? mapTemplate(row) : null;
}

export function getKpiScoreTemplateByCode(
  code: string,
): KpiScoreTemplate | null {
  ensureBuiltInScoreTemplates();
  const row = getDb()
    .prepare(
      "SELECT * FROM kpi_score_templates WHERE upper(code) = upper(?) LIMIT 1",
    )
    .get(code.trim()) as TemplateRow | undefined;
  return row ? mapTemplate(row) : null;
}

function validateFunctions(
  functions: KpiScoreTemplateFunction[],
): string | null {
  if (!functions.length) return "Minimal satu fungsi di template";
  for (const fn of functions) {
    if (!fn.name.trim()) return "Nama fungsi wajib diisi";
    if (!fn.indicators.length) {
      return `Fungsi "${fn.name}" belum punya indikator`;
    }
    for (const ind of fn.indicators) {
      if (!ind.name.trim()) {
        return `Ada indikator tanpa nama di fungsi "${fn.name}"`;
      }
    }
  }
  return null;
}

export function upsertKpiScoreTemplate(
  input: Partial<KpiScoreTemplate> & {
    code: string;
    label: string;
    functions: KpiScoreTemplateFunction[];
  },
): KpiScoreTemplate | { error: string } {
  const code = input.code.trim().toUpperCase();
  const label = input.label.trim();
  if (!code) return { error: "Kode template wajib" };
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) {
    return {
      error: "Kode template: 2–20 karakter huruf/angka/_/- (contoh: ACC, HR)",
    };
  }
  if (!label) return { error: "Label template wajib" };

  const functions = (input.functions || []).map((fn, fi) => ({
    name: String(fn.name || "").trim(),
    weightPercent: Number(fn.weightPercent ?? 0),
    focus: String(fn.focus || ""),
    sortOrder: Number(fn.sortOrder ?? fi + 1),
    indicators: (fn.indicators || []).map((ind, ii) =>
      normalizeIndicator(ind, ii),
    ),
  }));

  const fnError = validateFunctions(functions);
  if (fnError) return { error: fnError };

  const now = new Date().toISOString();
  const db = getDb();

  if (input.id) {
    const existing = getKpiScoreTemplate(input.id);
    if (!existing) return { error: "Template tidak ditemukan" };
    const clash = db
      .prepare(
        "SELECT id FROM kpi_score_templates WHERE upper(code) = ? AND id != ?",
      )
      .get(code, input.id) as { id: string } | undefined;
    if (clash) return { error: `Kode template "${code}" sudah dipakai` };

    db.prepare(
      `UPDATE kpi_score_templates SET
        code = ?, label = ?, description = ?, functions_json = ?,
        active = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      code,
      label,
      String(input.description || ""),
      JSON.stringify(functions),
      boolToInt(input.active ?? true),
      now,
      input.id,
    );
    return getKpiScoreTemplate(input.id)!;
  }

  const clash = getKpiScoreTemplateByCode(code);
  if (clash) return { error: `Kode template "${code}" sudah dipakai` };

  const id = randomUUID();
  db.prepare(
    `INSERT INTO kpi_score_templates (
      id, code, label, description, functions_json, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    code,
    label,
    String(input.description || ""),
    JSON.stringify(functions),
    boolToInt(input.active ?? true),
    now,
    now,
  );
  return getKpiScoreTemplate(id)!;
}

export function deleteKpiScoreTemplate(
  id: string,
): { ok: true } | { error: string } {
  const existing = getKpiScoreTemplate(id);
  if (!existing) return { error: "Template tidak ditemukan" };
  getDb().prepare("DELETE FROM kpi_score_templates WHERE id = ?").run(id);
  return { ok: true };
}

function parseConfig(raw: string | null | undefined): KpiScoreIndicatorConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as KpiScoreIndicatorConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Salin fungsi + indikator dari departemen menjadi template baru/update */
export function createTemplateFromDepartment(input: {
  departmentId: string;
  code: string;
  label: string;
  description?: string;
  id?: string;
}): KpiScoreTemplate | { error: string } {
  const dept = listDepartments().find((d) => d.id === input.departmentId);
  if (!dept) return { error: "Departemen tidak ditemukan" };

  const functions = listKpiFunctions(true, input.departmentId).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const indicatorRows = getDb()
    .prepare(
      `SELECT * FROM kpi_score_indicators
       WHERE department_id = ? AND active = 1
       ORDER BY sort_order, name`,
    )
    .all(input.departmentId) as Array<{
    kpi_function_id: string;
    name: string;
    description: string;
    weight_percent: number;
    metric_type: string;
    config_json: string;
    sort_order: number;
  }>;

  if (!indicatorRows.length) {
    return {
      error: "Departemen belum punya indikator aktif untuk disalin",
    };
  }

  const templateFns: KpiScoreTemplateFunction[] = functions
    .map((fn) => {
      const inds = indicatorRows
        .filter((i) => i.kpi_function_id === fn.id)
        .map((i, idx) => ({
          name: i.name,
          description: i.description,
          weightPercent: Number(i.weight_percent),
          metricType: i.metric_type as KpiScoreMetricType,
          config: parseConfig(i.config_json),
          sortOrder: Number(i.sort_order) || idx + 1,
        }));
      if (!inds.length) return null;
      return {
        name: fn.name,
        weightPercent: fn.weightPercent,
        focus: fn.focus,
        sortOrder: fn.sortOrder,
        indicators: inds,
      };
    })
    .filter((x): x is KpiScoreTemplateFunction => x != null);

  if (!templateFns.length) {
    return { error: "Tidak ada fungsi yang punya indikator" };
  }

  return upsertKpiScoreTemplate({
    id: input.id,
    code: input.code,
    label: input.label,
    description:
      input.description ||
      `Disalin dari ${dept.code} — ${dept.name}`,
    functions: templateFns,
    active: true,
  });
}

/**
 * Seed / sync template bawaan IT & MTR ke DB.
 * Template kode bawaan selalu diselaraskan ke definisi di kode sumber.
 */
export function ensureBuiltInScoreTemplates() {
  const db = getDb();
  const now = new Date().toISOString();
  const builtins: Array<{ code: string; label: string; description: string }> =
    [
      {
        code: "IT",
        label: "IT / Manager IT",
        description:
          "Template bawaan skor KPI IT — support tiket (SLA, response, satisfaction, repeat) sebagai bobot utama",
      },
      {
        code: "MTR",
        label: "Mekanik (indikator terukur)",
        description: "Template bawaan skor KPI Mekanik / perawatan unit",
      },
    ];

  for (const meta of builtins) {
    const built = SCORE_TEMPLATE_BY_CODE[meta.code];
    if (!built) continue;
    const existing = db
      .prepare(
        "SELECT id FROM kpi_score_templates WHERE upper(code) = ? LIMIT 1",
      )
      .get(meta.code) as { id: string } | undefined;
    const functionsJson = JSON.stringify(built);
    if (existing) {
      db.prepare(
        `UPDATE kpi_score_templates SET
          label = ?, description = ?, functions_json = ?, active = 1, updated_at = ?
         WHERE id = ?`,
      ).run(meta.label, meta.description, functionsJson, now, existing.id);
      continue;
    }
    db.prepare(
      `INSERT INTO kpi_score_templates (
        id, code, label, description, functions_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      randomUUID(),
      meta.code,
      meta.label,
      meta.description,
      functionsJson,
      now,
      now,
    );
  }
}
