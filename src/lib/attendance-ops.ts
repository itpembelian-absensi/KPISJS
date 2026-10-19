import { randomUUID } from "crypto";
import {
  computeDisciplineScore,
  defaultAttendanceFilePath,
  parseAttendanceExcel,
  parseAttendanceExcelBuffer,
  type ExcelAttendanceRow,
} from "./attendance-import";
import { getDb, getMeta, setMeta } from "./db";
import {
  buildDisciplinePeriodOptions,
  disciplinePeriodFromDate,
  disciplinePeriodRange,
  disciplinePeriodsOverlapping,
  formatDisciplinePeriodLabel,
  resolveDisciplineDeleteRange,
  type DisciplineDeleteUnit,
} from "./discipline-period";
import { upsertKpiAssessment } from "./kpi-ops";
import {
  ensureDepartmentKpiTemplates,
  ensureStaffFromAttendanceImport,
  listStaff,
} from "./store";
import type {
  AttendancePeriodSummary,
  AttendanceRecord,
  AttendanceStatus,
  StaffMember,
} from "./types";

export {
  disciplinePeriodFromDate,
  disciplinePeriodRange,
  formatDisciplinePeriodLabel,
  resolveDisciplineDeleteRange,
} from "./discipline-period";
export type { DisciplineDeleteUnit } from "./discipline-period";

const DISCIPLINE_FN_NAME = "Kedisiplinan & Kehadiran";

type RecordRow = {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  status: string;
  source_file: string;
  imported_at: string;
};

type SummaryRow = {
  id: string;
  staff_id: string;
  period_label: string;
  work_days: number;
  present_days: number;
  absent_days: number;
  late_count: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  discipline_score: number;
  notes: string;
  updated_at: string;
};

function mapRecord(row: RecordRow): AttendanceRecord {
  return {
    id: row.id,
    staffId: row.staff_id,
    workDate: row.work_date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    lateMinutes: Number(row.late_minutes) || 0,
    earlyLeaveMinutes: Number(row.early_leave_minutes) || 0,
    overtimeMinutes: Number(row.overtime_minutes) || 0,
    status: row.status as AttendanceStatus,
    sourceFile: row.source_file,
    importedAt: row.imported_at,
  };
}

function mapSummary(row: SummaryRow): AttendancePeriodSummary {
  return {
    id: row.id,
    staffId: row.staff_id,
    periodLabel: row.period_label,
    workDays: Number(row.work_days) || 0,
    presentDays: Number(row.present_days) || 0,
    absentDays: Number(row.absent_days) || 0,
    lateCount: Number(row.late_count) || 0,
    totalLateMinutes: Number(row.total_late_minutes) || 0,
    totalOvertimeMinutes: Number(row.total_overtime_minutes) || 0,
    disciplineScore: Number(row.discipline_score) || 0,
    notes: row.notes || "",
    updatedAt: row.updated_at,
  };
}

/**
 * Periode kedisiplinan: tanggal 21 s/d tanggal 20 bulan berikutnya.
 * Label = bulan akhir periode (YYYY-MM), contoh:
 * 21 Mei–20 Jun 2026 → "2026-06"
 */
// period helpers di ./discipline-period.ts

function periodFromDate(isoDate: string): string {
  return disciplinePeriodFromDate(isoDate);
}

/** Pastikan setiap dept punya fungsi KPI Kedisiplinan (bobot 0 agar tidak ganggu total 100%) */
export function ensureDisciplineKpiFunctions() {
  ensureDepartmentKpiTemplates();
  const db = getDb();
  const depts = db
    .prepare("SELECT id FROM departments WHERE active = 1")
    .all() as Array<{ id: string }>;
  const insert = db.prepare(
    `INSERT INTO kpi_functions (id, department_id, name, weight_percent, focus, sort_order, active)
     VALUES (?, ?, ?, 0, ?, 99, 1)`,
  );
  const tx = db.transaction(() => {
    for (const dept of depts) {
      const exists = db
        .prepare(
          `SELECT id FROM kpi_functions
           WHERE department_id = ? AND lower(name) = lower(?)`,
        )
        .get(dept.id, DISCIPLINE_FN_NAME) as { id: string } | undefined;
      if (exists) continue;
      insert.run(
        randomUUID(),
        dept.id,
        DISCIPLINE_FN_NAME,
        "Absensi, keterlambatan, lembur, dan kepatuhan jam kerja (dari impor Excel)",
      );
    }
  });
  tx();
}

function getDisciplineFunctionId(departmentId: string): string | null {
  ensureDisciplineKpiFunctions();
  const row = getDb()
    .prepare(
      `SELECT id FROM kpi_functions
       WHERE department_id = ? AND lower(name) = lower(?) LIMIT 1`,
    )
    .get(departmentId, DISCIPLINE_FN_NAME) as { id: string } | undefined;
  return row?.id ?? null;
}

function rebuildPeriodSummaries(
  staffIds: string[],
  periods: string[],
  assessedByName: string,
) {
  const db = getDb();
  const staffMap = new Map(listStaff().map((s) => [s.id, s]));

  for (const staffId of staffIds) {
    const staff = staffMap.get(staffId);
    if (!staff) continue;
    for (const period of periods) {
      const { start, end } = disciplinePeriodRange(period);
      const rows = db
        .prepare(
          `SELECT * FROM attendance_records
           WHERE staff_id = ? AND work_date >= ? AND work_date <= ?
           ORDER BY work_date`,
        )
        .all(staffId, start, end) as RecordRow[];

      let workDays = 0;
      let presentDays = 0;
      let absentDays = 0;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;

      for (const r of rows) {
        if (r.status === "holiday") continue;
        workDays += 1;
        if (r.status === "present") {
          presentDays += 1;
        } else if (r.status === "absent") {
          absentDays += 1;
        }
        if ((Number(r.late_minutes) || 0) > 0) {
          lateCount += 1;
          totalLateMinutes += Number(r.late_minutes) || 0;
        }
        totalOvertimeMinutes += Number(r.overtime_minutes) || 0;
      }

      if (workDays === 0) {
        clearDisciplinePeriod(staff, period);
        continue;
      }

      const disciplineScore = computeDisciplineScore({
        workDays,
        presentDays,
        absentDays,
        lateCount,
        totalLateMinutes,
        totalOvertimeMinutes,
      });

      const notes = `Hadir ${presentDays}/${workDays}, absen ${absentDays}, telat ${lateCount}x (${totalLateMinutes} mnt), lembur ${totalOvertimeMinutes} mnt · periode ${formatDisciplinePeriodLabel(period)}`;
      const now = new Date().toISOString();
      const existing = db
        .prepare(
          `SELECT id FROM attendance_period_summaries
           WHERE staff_id = ? AND period_label = ?`,
        )
        .get(staffId, period) as { id: string } | undefined;

      if (existing) {
        db.prepare(
          `UPDATE attendance_period_summaries SET
            work_days = ?, present_days = ?, absent_days = ?, late_count = ?,
            total_late_minutes = ?, total_overtime_minutes = ?,
            discipline_score = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
        ).run(
          workDays,
          presentDays,
          absentDays,
          lateCount,
          totalLateMinutes,
          totalOvertimeMinutes,
          disciplineScore,
          notes,
          now,
          existing.id,
        );
      } else {
        db.prepare(
          `INSERT INTO attendance_period_summaries
            (id, staff_id, period_label, work_days, present_days, absent_days,
             late_count, total_late_minutes, total_overtime_minutes,
             discipline_score, notes, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          staffId,
          period,
          workDays,
          presentDays,
          absentDays,
          lateCount,
          totalLateMinutes,
          totalOvertimeMinutes,
          disciplineScore,
          notes,
          now,
        );
      }

      const fnId = getDisciplineFunctionId(staff.departmentId);
      if (fnId) {
        const existingAssess = db
          .prepare(
            `SELECT id FROM kpi_assessments
             WHERE department_id = ? AND period_label = ?
               AND staff_id = ? AND kpi_function_id = ?`,
          )
          .get(staff.departmentId, period, staffId, fnId) as
          | { id: string }
          | undefined;

        upsertKpiAssessment({
          id: existingAssess?.id,
          departmentId: staff.departmentId,
          periodLabel: period,
          staffId,
          kpiFunctionId: fnId,
          score: disciplineScore,
          targetScore: 100,
          notes,
          assessedByName,
        });
      }
      syncAttendanceIndicatorActuals(staffId, period, disciplineScore);
    }
  }
}

function clearDisciplinePeriodByStaffId(staffId: string, period: string) {
  const db = getDb();
  db.prepare(
    `DELETE FROM attendance_period_summaries
     WHERE staff_id = ? AND period_label = ?`,
  ).run(staffId, period);
  db.prepare(
    `DELETE FROM kpi_assessments
     WHERE staff_id = ? AND period_label = ?
       AND kpi_function_id IN (
         SELECT id FROM kpi_functions WHERE lower(name) = lower(?)
       )`,
  ).run(staffId, period, DISCIPLINE_FN_NAME);
  syncAttendanceIndicatorActuals(staffId, period, null);
}

function clearDisciplinePeriod(staff: StaffMember, period: string) {
  clearDisciplinePeriodByStaffId(staff.id, period);
}

/** Selaraskan capaian indikator absensi yang sudah tersimpan dengan skor baru. */
function syncAttendanceIndicatorActuals(
  staffId: string,
  period: string,
  score: number | null,
) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.id
       FROM kpi_indicator_actuals a
       INNER JOIN kpi_score_indicators i ON i.id = a.indicator_id
       WHERE a.staff_id = ? AND a.period_label = ? AND i.metric_type = 'attendance'`,
    )
    .all(staffId, period) as Array<{ id: string }>;
  if (rows.length === 0) return;

  if (score == null) {
    const del = db.prepare("DELETE FROM kpi_indicator_actuals WHERE id = ?");
    for (const row of rows) del.run(row.id);
    return;
  }

  const rounded = Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  const now = new Date().toISOString();
  const upd = db.prepare(
    `UPDATE kpi_indicator_actuals
     SET actual_value = ?, computed_score = ?, updated_at = ?
     WHERE id = ?`,
  );
  for (const row of rows) upd.run(score, rounded, now, row.id);
}

export function deleteDisciplineData(input: {
  scope: "staff" | "all";
  staffId?: string;
  unit: DisciplineDeleteUnit;
  anchor: string;
  assessedByName?: string;
}):
  | {
      deletedRecords: number;
      deletedSummaries: number;
      from: string;
      to: string;
      label: string;
      staffCount: number;
    }
  | { error: string } {
  const range = resolveDisciplineDeleteRange(input.unit, input.anchor);
  if ("error" in range) return range;

  const db = getDb();
  const staffIdFilter = input.staffId?.trim() || "";
  if (input.scope === "staff") {
    if (!staffIdFilter) return { error: "Pilih staf yang datanya akan dihapus." };
  } else if (input.scope !== "all") {
    return { error: "Cakupan hapus tidak dikenal." };
  }

  const targetPeriods =
    input.unit === "period"
      ? [input.anchor.trim()]
      : disciplinePeriodsOverlapping(range.from, range.to);

  const params: string[] = [range.from, range.to];
  let selectSql = `SELECT staff_id, work_date FROM attendance_records
     WHERE work_date >= ? AND work_date <= ?`;
  if (input.scope === "staff") {
    selectSql += " AND staff_id = ?";
    params.push(staffIdFilter);
  }
  const hits = db.prepare(selectSql).all(...params) as Array<{
    staff_id: string;
    work_date: string;
  }>;

  const periodsByStaff = new Map<string, Set<string>>();
  const addPair = (id: string, period: string) => {
    const periods = periodsByStaff.get(id) ?? new Set<string>();
    periods.add(period);
    periodsByStaff.set(id, periods);
  };
  for (const hit of hits) {
    addPair(hit.staff_id, disciplinePeriodFromDate(hit.work_date));
  }

  // Ringkasan tanpa baris absensi (staf sudah dihapus) tidak ketemu lewat attendance_records.
  if (targetPeriods.length) {
    const placeholders = targetPeriods.map(() => "?").join(", ");
    const sumParams: string[] = [...targetPeriods];
    let sumSql = `SELECT staff_id, period_label FROM attendance_period_summaries
      WHERE period_label IN (${placeholders})`;
    if (input.scope === "staff") {
      sumSql += " AND staff_id = ?";
      sumParams.push(staffIdFilter);
    }
    const summaryRows = db.prepare(sumSql).all(...sumParams) as Array<{
      staff_id: string;
      period_label: string;
    }>;
    const knownStaff = new Set(listStaff().map((s) => s.id));
    const countInPeriod = db.prepare(
      `SELECT COUNT(*) AS n FROM attendance_records
       WHERE staff_id = ? AND work_date >= ? AND work_date <= ?`,
    );
    for (const row of summaryRows) {
      const { start, end } = disciplinePeriodRange(row.period_label);
      const remaining = countInPeriod.get(row.staff_id, start, end) as {
        n: number;
      };
      const periodFullyCovered = range.from <= start && range.to >= end;
      if (
        !knownStaff.has(row.staff_id) ||
        (remaining?.n || 0) === 0 ||
        periodFullyCovered
      ) {
        addPair(row.staff_id, row.period_label);
      }
    }
  }

  if (hits.length === 0 && periodsByStaff.size === 0) {
    return {
      deletedRecords: 0,
      deletedSummaries: 0,
      from: range.from,
      to: range.to,
      label: range.label,
      staffCount: 0,
    };
  }

  const assessedByName = input.assessedByName || "Hapus data kedisiplinan";
  const staffMap = new Map(listStaff().map((s) => [s.id, s]));
  let deletedSummaries = 0;
  const tx = db.transaction(() => {
    if (hits.length > 0) {
      const delParams: string[] = [range.from, range.to];
      let delSql = `DELETE FROM attendance_records WHERE work_date >= ? AND work_date <= ?`;
      if (input.scope === "staff") {
        delSql += " AND staff_id = ?";
        delParams.push(staffIdFilter);
      }
      db.prepare(delSql).run(...delParams);
    }

    const countInPeriod = db.prepare(
      `SELECT COUNT(*) AS n FROM attendance_records
       WHERE staff_id = ? AND work_date >= ? AND work_date <= ?`,
    );
    const summaryExists = db.prepare(
      `SELECT id FROM attendance_period_summaries
       WHERE staff_id = ? AND period_label = ?`,
    );
    for (const [staffId, periods] of periodsByStaff) {
      const staff = staffMap.get(staffId);
      for (const period of periods) {
        const { start, end } = disciplinePeriodRange(period);
        const remaining = countInPeriod.get(staffId, start, end) as {
          n: number;
        };
        if (!staff || (remaining?.n || 0) === 0) {
          if (summaryExists.get(staffId, period)) deletedSummaries += 1;
          clearDisciplinePeriodByStaffId(staffId, period);
          continue;
        }
        rebuildPeriodSummaries([staffId], [period], assessedByName);
      }
    }
  });
  tx();

  return {
    deletedRecords: hits.length,
    deletedSummaries,
    from: range.from,
    to: range.to,
    label: range.label,
    staffCount: periodsByStaff.size,
  };
}

/** Hitung ulang semua ringkasan dengan periode 21–20 */
export function rebuildAllDisciplineSummaries(
  assessedByName = "Periode disiplin 21–20",
) {
  const db = getDb();
  const records = db
    .prepare("SELECT staff_id, work_date FROM attendance_records")
    .all() as Array<{ staff_id: string; work_date: string }>;

  db.prepare("DELETE FROM attendance_period_summaries").run();

  if (records.length === 0) {
    setDisciplinePeriodMode();
    return { staffCount: 0, periods: [] as string[] };
  }

  const staffIds = new Set<string>();
  const periods = new Set<string>();
  for (const r of records) {
    staffIds.add(r.staff_id);
    periods.add(disciplinePeriodFromDate(r.work_date));
  }

  rebuildPeriodSummaries([...staffIds], [...periods], assessedByName);
  setDisciplinePeriodMode();
  return { staffCount: staffIds.size, periods: [...periods].sort() };
}

const DISCIPLINE_PERIOD_META = "discipline_period_mode";

function setDisciplinePeriodMode() {
  setMeta(DISCIPLINE_PERIOD_META, "21-20");
}

function ensureDisciplinePeriodMode() {
  if (getMeta(DISCIPLINE_PERIOD_META) === "21-20") return;
  rebuildAllDisciplineSummaries();
}

function importRows(
  rows: ExcelAttendanceRow[],
  sourceFile: string,
  assessedByName: string,
) {
  const db = getDb();
  ensureDisciplineKpiFunctions();

  const staffByCode = new Map(
    listStaff().map((s) => [s.employeeCode.toLowerCase(), s] as const),
  );

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const unknownCodes = new Set<string>();
  const createdStaff: Array<{ employeeCode: string; name: string }> = [];
  const staffIds = new Set<string>();
  const periods = new Set<string>();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const row of rows) {
      const codeKey = row.employeeCode.toLowerCase();
      let staff = staffByCode.get(codeKey);
      if (!staff && row.fullName) {
        const ensured = ensureStaffFromAttendanceImport({
          employeeCode: row.employeeCode,
          name: row.fullName,
          position: row.position,
          jobLevel: row.jobLevel,
          organization: row.organization,
        });
        staff = ensured.staff;
        staffByCode.set(codeKey, staff);
        if (ensured.created) {
          createdStaff.push({
            employeeCode: staff.employeeCode,
            name: staff.name,
          });
        }
      }
      if (!staff) {
        skipped += 1;
        unknownCodes.add(row.employeeCode);
        continue;
      }

      const existing = db
        .prepare(
          `SELECT id FROM attendance_records
           WHERE staff_id = ? AND work_date = ?`,
        )
        .get(staff.id, row.workDate) as { id: string } | undefined;

      if (existing) {
        db.prepare(
          `UPDATE attendance_records SET
            clock_in = ?, clock_out = ?, late_minutes = ?,
            early_leave_minutes = ?, overtime_minutes = ?,
            status = ?, source_file = ?, imported_at = ?
           WHERE id = ?`,
        ).run(
          row.clockIn,
          row.clockOut,
          row.lateMinutes,
          row.earlyLeaveMinutes,
          row.overtimeMinutes,
          row.status,
          sourceFile,
          now,
          existing.id,
        );
        updated += 1;
      } else {
        db.prepare(
          `INSERT INTO attendance_records
            (id, staff_id, work_date, clock_in, clock_out, late_minutes,
             early_leave_minutes, overtime_minutes, status, source_file, imported_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          staff.id,
          row.workDate,
          row.clockIn,
          row.clockOut,
          row.lateMinutes,
          row.earlyLeaveMinutes,
          row.overtimeMinutes,
          row.status,
          sourceFile,
          now,
        );
        imported += 1;
      }

      staffIds.add(staff.id);
      periods.add(periodFromDate(row.workDate));
    }

    if (createdStaff.length) ensureDisciplineKpiFunctions();
    rebuildPeriodSummaries([...staffIds], [...periods], assessedByName);
  });
  tx();

  return {
    totalRows: rows.length,
    imported,
    updated,
    skipped,
    unknownCodes: [...unknownCodes].slice(0, 20),
    periods: [...periods].sort(),
    staffCount: staffIds.size,
    staffCreated: createdStaff.length,
    createdStaff: createdStaff.slice(0, 20),
  };
}

export function importAttendanceFromExcel(
  options: {
    filePath?: string;
    buffer?: Buffer;
    sourceFileName?: string;
    assessedByName?: string;
  } = {},
) {
  const assessedByName = options.assessedByName || "Import Absensi";
  let rows: ExcelAttendanceRow[];
  let sourceFile: string;

  if (options.buffer) {
    rows = parseAttendanceExcelBuffer(options.buffer);
    sourceFile = options.sourceFileName || "upload.xlsx";
  } else {
    const filePath = options.filePath || defaultAttendanceFilePath();
    rows = parseAttendanceExcel(filePath);
    sourceFile = filePath;
  }

  if (rows.length === 0) {
    throw new Error(
      "Tidak ada baris absensi valid. Pastikan kolom NIK/Employee ID dan Tanggal terisi.",
    );
  }

  return importRows(rows, sourceFile, assessedByName);
}

function tallyDisciplineRecords(rows: RecordRow[]) {
  let workDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateCount = 0;
  let totalLateMinutes = 0;
  let totalOvertimeMinutes = 0;

  for (const r of rows) {
    if (r.status === "holiday") continue;
    workDays += 1;
    if (r.status === "present") {
      presentDays += 1;
    } else if (r.status === "absent") {
      absentDays += 1;
    }
    if ((Number(r.late_minutes) || 0) > 0) {
      lateCount += 1;
      totalLateMinutes += Number(r.late_minutes) || 0;
    }
    totalOvertimeMinutes += Number(r.overtime_minutes) || 0;
  }

  return {
    workDays,
    presentDays,
    absentDays,
    lateCount,
    totalLateMinutes,
    totalOvertimeMinutes,
  };
}

/** Skor kedisiplinan per staf untuk rentang tanggal bebas (tidak mengubah periode baku 21–20). */
export function summarizeDisciplineByRange(filters: {
  from: string;
  to: string;
  departmentId?: string;
}): Array<AttendancePeriodSummary & { staff: StaffMember | null }> {
  const from = filters.from.slice(0, 10);
  const to = filters.to.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return [];
  }
  if (from > to) return [];

  listStaff();
  const staffMap = new Map(listStaff().map((s) => [s.id, s]));
  const rows = getDb()
    .prepare(
      `SELECT * FROM attendance_records
       WHERE work_date >= ? AND work_date <= ?
       ORDER BY work_date`,
    )
    .all(from, to) as RecordRow[];

  const byStaff = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const staff = staffMap.get(row.staff_id);
    if (!staff) continue;
    if (filters.departmentId && staff.departmentId !== filters.departmentId) {
      continue;
    }
    const list = byStaff.get(row.staff_id) ?? [];
    list.push(row);
    byStaff.set(row.staff_id, list);
  }

  const now = new Date().toISOString();
  const result: Array<AttendancePeriodSummary & { staff: StaffMember | null }> =
    [];
  for (const [staffId, list] of byStaff) {
    const tally = tallyDisciplineRecords(list);
    if (tally.workDays === 0) continue;
    const disciplineScore = computeDisciplineScore(tally);
    result.push({
      id: `${staffId}:${from}:${to}`,
      staffId,
      periodLabel: `${from}..${to}`,
      ...tally,
      disciplineScore,
      notes: "",
      updatedAt: now,
      staff: staffMap.get(staffId) ?? null,
    });
  }

  result.sort((a, b) =>
    (a.staff?.name ?? "").localeCompare(b.staff?.name ?? "", "id"),
  );
  return result;
}

export function listAttendanceSummaries(filters?: {
  departmentId?: string;
  periodLabel?: string;
}): Array<AttendancePeriodSummary & { staff: StaffMember | null }> {
  listStaff(); // ensure db
  ensureDisciplinePeriodMode();
  let sql = "SELECT * FROM attendance_period_summaries";
  const params: string[] = [];
  const where: string[] = [];
  if (filters?.periodLabel) {
    where.push("period_label = ?");
    params.push(filters.periodLabel);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY period_label DESC, updated_at DESC";

  const staffMap = new Map(listStaff().map((s) => [s.id, s]));
  return (getDb().prepare(sql).all(...params) as SummaryRow[])
    .map((row) => {
      const staff = staffMap.get(row.staff_id) ?? null;
      return { ...mapSummary(row), staff };
    })
    .filter((row) =>
      filters?.departmentId
        ? row.staff?.departmentId === filters.departmentId
        : true,
    );
}

export function listAttendanceRecords(filters?: {
  staffId?: string;
  periodLabel?: string;
  limit?: number;
}): AttendanceRecord[] {
  listStaff();
  ensureDisciplinePeriodMode();
  let sql = "SELECT * FROM attendance_records";
  const params: string[] = [];
  const where: string[] = [];
  if (filters?.staffId) {
    where.push("staff_id = ?");
    params.push(filters.staffId);
  }
  if (filters?.periodLabel) {
    const { start, end } = disciplinePeriodRange(filters.periodLabel);
    where.push("work_date >= ?");
    where.push("work_date <= ?");
    params.push(start, end);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY work_date DESC";
  if (filters?.limit) sql += ` LIMIT ${Math.max(1, Math.floor(filters.limit))}`;
  return (getDb().prepare(sql).all(...params) as RecordRow[]).map(mapRecord);
}

export function listAttendancePeriods(): string[] {
  listStaff();
  ensureDisciplinePeriodMode();
  const existing = (
    getDb()
      .prepare(
        `SELECT DISTINCT period_label FROM attendance_period_summaries
         ORDER BY period_label DESC`,
      )
      .all() as Array<{ period_label: string }>
  ).map((r) => r.period_label);
  return buildDisciplinePeriodOptions(existing);
}

export { DISCIPLINE_FN_NAME };
