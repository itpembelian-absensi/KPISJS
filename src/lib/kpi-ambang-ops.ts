import { randomUUID } from "crypto";
import { getDb } from "./db";
import type { AmbangMark, KpiAmbangCheck } from "./kpi-ambang";

export type { AmbangKey, AmbangMark, KpiAmbangCheck } from "./kpi-ambang";
export { AMBANG_ITEMS, ambangStatus } from "./kpi-ambang";

type AmbangRow = {
  id: string;
  staff_id: string;
  period_label: string;
  kehadiran: string;
  alpa: string;
  sp: string;
  integritas: string;
  k3: string;
  notes: string;
  checked_by: string;
  updated_at: string;
};

function asMark(value: string | null | undefined): AmbangMark {
  if (value === "lulus" || value === "tidak") return value;
  return "";
}

function mapRow(row: AmbangRow): KpiAmbangCheck {
  return {
    id: row.id,
    staffId: row.staff_id,
    periodLabel: row.period_label,
    kehadiran: asMark(row.kehadiran),
    alpa: asMark(row.alpa),
    sp: asMark(row.sp),
    integritas: asMark(row.integritas),
    k3: asMark(row.k3),
    notes: row.notes || "",
    checkedBy: row.checked_by || "",
    updatedAt: row.updated_at,
  };
}

export function getKpiAmbangCheck(
  staffId: string,
  periodLabel: string,
): KpiAmbangCheck | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM kpi_threshold_checks
       WHERE staff_id = ? AND period_label = ?`,
    )
    .get(staffId, periodLabel) as AmbangRow | undefined;
  return row ? mapRow(row) : null;
}

export function saveKpiAmbangCheck(input: {
  staffId: string;
  periodLabel: string;
  kehadiran?: string;
  alpa?: string;
  sp?: string;
  integritas?: string;
  k3?: string;
  notes?: string;
  checkedBy?: string;
}): KpiAmbangCheck | { error: string } {
  const staffId = input.staffId.trim();
  const periodLabel = input.periodLabel.trim();
  if (!staffId || !periodLabel) {
    return { error: "Karyawan dan periode wajib" };
  }
  const now = new Date().toISOString();
  const marks = {
    kehadiran: asMark(input.kehadiran),
    alpa: asMark(input.alpa),
    sp: asMark(input.sp),
    integritas: asMark(input.integritas),
    k3: asMark(input.k3),
  };
  const notes = (input.notes || "").trim();
  const checkedBy = (input.checkedBy || "").trim();
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM kpi_threshold_checks
       WHERE staff_id = ? AND period_label = ?`,
    )
    .get(staffId, periodLabel) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE kpi_threshold_checks SET
        kehadiran = ?, alpa = ?, sp = ?, integritas = ?, k3 = ?,
        notes = ?, checked_by = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      marks.kehadiran,
      marks.alpa,
      marks.sp,
      marks.integritas,
      marks.k3,
      notes,
      checkedBy,
      now,
      existing.id,
    );
  } else {
    db.prepare(
      `INSERT INTO kpi_threshold_checks (
        id, staff_id, period_label, kehadiran, alpa, sp, integritas, k3,
        notes, checked_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      staffId,
      periodLabel,
      marks.kehadiran,
      marks.alpa,
      marks.sp,
      marks.integritas,
      marks.k3,
      notes,
      checkedBy,
      now,
      now,
    );
  }
  return getKpiAmbangCheck(staffId, periodLabel)!;
}
