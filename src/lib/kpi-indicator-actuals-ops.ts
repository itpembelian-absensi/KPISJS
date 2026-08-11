import { randomUUID } from "crypto";
import { getDb } from "./db";
import {
  computeFunctionScoreFromIndicators,
  computeIndicatorScore,
} from "./kpi-score-compute";
import { listKpiScoreIndicators } from "./kpi-score-ops";
import { upsertKpiAssessment } from "./kpi-ops";
import {
  assigneeIdsForTicketScore,
  computeTicketScoreMetrics,
  filterTicketsForScoreMetrics,
  isTicketSourcedIndicator,
  ticketActualValueForIndicator,
  ticketMetricItemsForIndicators,
  ticketPeriodLabels,
} from "./ticket-score-metrics";
import {
  listAgents,
  listDepartments,
  listItTeam,
  listKpiFunctions,
  listStaff,
  listTickets,
  listUsers,
} from "./store";
import type { KpiIndicatorActual, KpiScoreIndicator } from "./types";

type ActualRow = {
  id: string;
  department_id: string;
  staff_id: string;
  period_label: string;
  indicator_id: string;
  actual_value: number | null;
  target_override: number | null;
  computed_score: number;
  notes: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

function mapActual(row: ActualRow): KpiIndicatorActual {
  return {
    id: row.id,
    departmentId: row.department_id,
    staffId: row.staff_id,
    periodLabel: row.period_label,
    indicatorId: row.indicator_id,
    actualValue:
      row.actual_value == null ? null : Number(row.actual_value),
    targetOverride:
      row.target_override == null ? null : Number(row.target_override),
    computedScore: Number(row.computed_score),
    notes: row.notes || "",
    updatedBy: row.updated_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listKpiIndicatorActuals(filters?: {
  departmentId?: string;
  staffId?: string;
  periodLabel?: string;
}): KpiIndicatorActual[] {
  let sql = "SELECT * FROM kpi_indicator_actuals WHERE 1=1";
  const params: string[] = [];
  if (filters?.departmentId) {
    sql += " AND department_id = ?";
    params.push(filters.departmentId);
  }
  if (filters?.staffId) {
    sql += " AND staff_id = ?";
    params.push(filters.staffId);
  }
  if (filters?.periodLabel) {
    sql += " AND period_label = ?";
    params.push(filters.periodLabel);
  }
  sql += " ORDER BY period_label DESC, updated_at DESC";
  const rows = getDb().prepare(sql).all(...params) as ActualRow[];
  return rows.map(mapActual);
}

export type ActualInputItem = {
  indicatorId: string;
  actualValue: number | null;
  targetOverride?: number | null;
  notes?: string;
};

/**
 * Upsert batch capaian indikator untuk satu staf + periode.
 * Attendance digisi lewat disciplineScore (opsional).
 * Opsional sync skor fungsi ke kpi_assessments.
 */
export function upsertKpiIndicatorActualsBatch(input: {
  departmentId: string;
  staffId: string;
  periodLabel: string;
  items: ActualInputItem[];
  updatedBy?: string;
  /** Skor absensi periode (untuk metricType attendance) */
  disciplineScore?: number | null;
  syncAssessments?: boolean;
}):
  | {
      ok: true;
      actuals: KpiIndicatorActual[];
      functionScores: Array<{ kpiFunctionId: string; score: number }>;
    }
  | { error: string } {
  const departmentId = input.departmentId.trim();
  const staffId = input.staffId.trim();
  const periodLabel = input.periodLabel.trim();
  if (!departmentId || !staffId || !periodLabel) {
    return { error: "Departemen, karyawan, dan periode wajib" };
  }

  const indicators = listKpiScoreIndicators(departmentId).filter(
    (i) => i.active,
  );
  if (indicators.length === 0) {
    return { error: "Belum ada indikator Aturan Skor KPI di departemen ini" };
  }

  const byId = new Map(indicators.map((i) => [i.id, i]));
  const db = getDb();
  const now = new Date().toISOString();
  const updatedBy = input.updatedBy?.trim() || "";
  const saved: KpiIndicatorActual[] = [];

  const tx = db.transaction(() => {
    for (const item of input.items) {
      const ind = byId.get(item.indicatorId);
      if (!ind) continue;

      let actualValue = item.actualValue;
      if (ind.metricType === "attendance") {
        if (
          input.disciplineScore != null &&
          Number.isFinite(input.disciplineScore)
        ) {
          actualValue = Number(input.disciplineScore);
        }
      }

      if (actualValue != null && !Number.isFinite(actualValue)) {
        continue;
      }

      const targetOverride =
        item.targetOverride != null && Number.isFinite(item.targetOverride)
          ? Number(item.targetOverride)
          : null;
      const computed =
        actualValue == null
          ? 0
          : computeIndicatorScore(ind, actualValue, targetOverride);
      const notes = item.notes?.trim() || "";

      const existing = db
        .prepare(
          `SELECT id FROM kpi_indicator_actuals
           WHERE staff_id = ? AND period_label = ? AND indicator_id = ?`,
        )
        .get(staffId, periodLabel, ind.id) as { id: string } | undefined;

      if (existing) {
        db.prepare(
          `UPDATE kpi_indicator_actuals SET
            department_id = ?, actual_value = ?, target_override = ?,
            computed_score = ?, notes = ?, updated_by = ?, updated_at = ?
           WHERE id = ?`,
        ).run(
          departmentId,
          actualValue,
          targetOverride,
          computed,
          notes,
          updatedBy,
          now,
          existing.id,
        );
        saved.push(
          mapActual(
            db
              .prepare("SELECT * FROM kpi_indicator_actuals WHERE id = ?")
              .get(existing.id) as ActualRow,
          ),
        );
      } else if (actualValue != null) {
        const id = randomUUID();
        db.prepare(
          `INSERT INTO kpi_indicator_actuals (
            id, department_id, staff_id, period_label, indicator_id,
            actual_value, target_override, computed_score, notes,
            updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          departmentId,
          staffId,
          periodLabel,
          ind.id,
          actualValue,
          targetOverride,
          computed,
          notes,
          updatedBy,
          now,
          now,
        );
        saved.push(
          mapActual(
            db
              .prepare("SELECT * FROM kpi_indicator_actuals WHERE id = ?")
              .get(id) as ActualRow,
          ),
        );
      }
    }
  });
  tx();

  // Auto-fill attendance indicators if discipline provided but not in items
  if (
    input.disciplineScore != null &&
    Number.isFinite(input.disciplineScore)
  ) {
    const disc = Number(input.disciplineScore);
    for (const ind of indicators.filter((i) => i.metricType === "attendance")) {
      if (saved.some((a) => a.indicatorId === ind.id)) continue;
      const existing = db
        .prepare(
          `SELECT id FROM kpi_indicator_actuals
           WHERE staff_id = ? AND period_label = ? AND indicator_id = ?`,
        )
        .get(staffId, periodLabel, ind.id) as { id: string } | undefined;
      const computed = computeIndicatorScore(ind, disc);
      if (existing) {
        db.prepare(
          `UPDATE kpi_indicator_actuals SET
            department_id = ?, actual_value = ?, computed_score = ?,
            updated_by = ?, updated_at = ?
           WHERE id = ?`,
        ).run(departmentId, disc, computed, updatedBy, now, existing.id);
      } else {
        db.prepare(
          `INSERT INTO kpi_indicator_actuals (
            id, department_id, staff_id, period_label, indicator_id,
            actual_value, target_override, computed_score, notes,
            updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '', ?, ?, ?)`,
        ).run(
          randomUUID(),
          departmentId,
          staffId,
          periodLabel,
          ind.id,
          disc,
          computed,
          updatedBy,
          now,
          now,
        );
      }
    }
  }

  const actualMap = new Map(
    listKpiIndicatorActuals({ departmentId, staffId, periodLabel }).map(
      (a) => [a.indicatorId, a],
    ),
  );

  const functions = listKpiFunctions(true, departmentId);
  const functionScores: Array<{ kpiFunctionId: string; score: number }> = [];

  for (const fn of functions) {
    const fnInds = indicators.filter((i) => i.kpiFunctionId === fn.id);
    if (fnInds.length === 0) continue;
    const result = computeFunctionScoreFromIndicators(
      fn.id,
      fnInds,
      (ind) => {
        const a = actualMap.get(ind.id);
        if (!a || a.actualValue == null) return null;
        return {
          actualValue: a.actualValue,
          targetOverride: a.targetOverride,
        };
      },
    );
    if (result.filledCount === 0) continue;
    functionScores.push({ kpiFunctionId: fn.id, score: result.score });

    if (input.syncAssessments !== false) {
      const existingAsm = db
        .prepare(
          `SELECT id FROM kpi_assessments
           WHERE department_id = ? AND period_label = ?
             AND kpi_function_id = ? AND staff_id = ?`,
        )
        .get(departmentId, periodLabel, fn.id, staffId) as
        | { id: string }
        | undefined;
      upsertKpiAssessment({
        id: existingAsm?.id,
        departmentId,
        periodLabel,
        staffId,
        kpiFunctionId: fn.id,
        score: result.score,
        targetScore: 100,
        notes: "Auto dari capaian indikator Aturan Skor KPI",
        assessedByName: updatedBy || "Sistem",
      });
    }
  }

  return {
    ok: true,
    actuals: listKpiIndicatorActuals({ departmentId, staffId, periodLabel }),
    functionScores,
  };
}

export function buildActualLookup(
  actuals: KpiIndicatorActual[],
): Map<string, KpiIndicatorActual> {
  return new Map(actuals.map((a) => [a.indicatorId, a]));
}

export function scoreStaffPeriodFromIndicators(input: {
  departmentId: string;
  staffId: string;
  periodLabel: string;
  indicators?: KpiScoreIndicator[];
  actuals?: KpiIndicatorActual[];
  disciplineScore?: number | null;
  tickets?: import("./types").Ticket[];
  agents?: import("./types").Agent[];
}): {
  byFunction: Map<string, ReturnType<typeof computeFunctionScoreFromIndicators>>;
  overall: number;
  weightUsed: number;
  hasAny: boolean;
} {
  const indicators =
    input.indicators ??
    listKpiScoreIndicators(input.departmentId).filter((i) => i.active);
  const actuals =
    input.actuals ??
    listKpiIndicatorActuals({
      departmentId: input.departmentId,
      staffId: input.staffId,
      periodLabel: input.periodLabel,
    });
  const actualMap = buildActualLookup(actuals);
  const functions = listKpiFunctions(true, input.departmentId);
  const byFunction = new Map<
    string,
    ReturnType<typeof computeFunctionScoreFromIndicators>
  >();

  const tickets = input.tickets ?? listTickets();
  const agents = input.agents ?? listAgents();
  const staffList = listStaff(true);
  const itTeam = listItTeam(true);
  const managerUserStaffIds = listUsers()
    .filter((u) => u.active && u.role === "manager" && u.staffId)
    .map((u) => u.staffId as string);
  const { assigneeIds, scope } = assigneeIdsForTicketScore({
    staffId: input.staffId,
    agents,
    staff: staffList,
    itTeam,
    managerUserStaffIds,
  });
  const ticketMetrics = computeTicketScoreMetrics(
    filterTicketsForScoreMetrics(tickets, {
      periodYm: input.periodLabel,
      assigneeIds,
    }),
  );
  void scope;

  let weighted = 0;
  let usedW = 0;
  let hasAny = false;

  for (const fn of functions) {
    const fnInds = indicators.filter((i) => i.kpiFunctionId === fn.id);
    if (fnInds.length === 0) continue;

    const result = computeFunctionScoreFromIndicators(
      fn.id,
      fnInds,
      (ind) => {
        if (ind.metricType === "attendance") {
          const fromDb = actualMap.get(ind.id);
          if (fromDb?.actualValue != null) {
            return {
              actualValue: fromDb.actualValue,
              targetOverride: fromDb.targetOverride,
            };
          }
          if (
            input.disciplineScore != null &&
            Number.isFinite(input.disciplineScore)
          ) {
            return { actualValue: Number(input.disciplineScore) };
          }
          return null;
        }
        if (isTicketSourcedIndicator(ind)) {
          const fromDb = actualMap.get(ind.id);
          if (fromDb?.actualValue != null) {
            return {
              actualValue: fromDb.actualValue,
              targetOverride: fromDb.targetOverride,
            };
          }
          const auto = ticketActualValueForIndicator(ind, ticketMetrics);
          if (auto != null) return { actualValue: auto };
          return null;
        }
        const a = actualMap.get(ind.id);
        if (!a || a.actualValue == null) return null;
        return {
          actualValue: a.actualValue,
          targetOverride: a.targetOverride,
        };
      },
    );
    byFunction.set(fn.id, result);
    if (result.filledCount > 0) {
      hasAny = true;
      if (fn.weightPercent > 0) {
        weighted += result.score * fn.weightPercent;
        usedW += fn.weightPercent;
      }
    }
  }

  return {
    byFunction,
    overall: usedW > 0 ? Math.round((weighted / usedW) * 10) / 10 : 0,
    weightUsed: usedW,
    hasAny,
  };
}

/**
 * Hitung ulang capaian indikator ticket dari antrian tiket,
 * simpan ke kpi_indicator_actuals + sync penilaian fungsi.
 */
export function syncTicketScoreActuals(opts?: {
  departmentId?: string;
  periodLabel?: string;
}): {
  departments: number;
  periods: number;
  staffSynced: number;
  itemsWritten: number;
} {
  const tickets = listTickets();
  const agents = listAgents();
  const staff = listStaff(true);
  const itTeam = listItTeam(true);
  const managerUserStaffIds = listUsers()
    .filter((u) => u.active && u.role === "manager" && u.staffId)
    .map((u) => u.staffId as string);
  const depts = listDepartments(true).filter((d) =>
    opts?.departmentId ? d.id === opts.departmentId : true,
  );

  let departments = 0;
  let periods = 0;
  let staffSynced = 0;
  let itemsWritten = 0;

  for (const dept of depts) {
    const indicators = listKpiScoreIndicators(dept.id).filter(
      (i) => i.active && isTicketSourcedIndicator(i),
    );
    if (indicators.length === 0) continue;
    departments += 1;

    const allIndicators = listKpiScoreIndicators(dept.id).filter((i) => i.active);
    const periodList = opts?.periodLabel
      ? [opts.periodLabel]
      : ticketPeriodLabels(tickets);
    if (periodList.length === 0) continue;

    const deptStaff = staff.filter((s) => s.departmentId === dept.id);
    const agentStaff = deptStaff.filter((s) => {
      const { assigneeIds } = assigneeIdsForTicketScore({
        staffId: s.id,
        agents,
        staff,
        itTeam,
        managerUserStaffIds,
      });
      return assigneeIds.length > 0;
    });
    const targets =
      agentStaff.length > 0 ? agentStaff : deptStaff.slice(0, 1);

    for (const periodLabel of periodList) {
      periods += 1;
      const deptMetrics = computeTicketScoreMetrics(
        filterTicketsForScoreMetrics(tickets, {
          periodYm: periodLabel,
          assigneeIds: null,
        }),
      );

      for (const member of targets) {
        const { assigneeIds, scope } = assigneeIdsForTicketScore({
          staffId: member.id,
          agents,
          staff,
          itTeam,
          managerUserStaffIds,
        });
        if (assigneeIds.length === 0) continue;

        const metrics = computeTicketScoreMetrics(
          filterTicketsForScoreMetrics(tickets, {
            periodYm: periodLabel,
            assigneeIds,
          }),
        );
        // Staf: hanya tiket pribadi. Manager: tiket tim. Tanpa fallback dept.
        if (metrics.ticketCount <= 0) continue;

        const items = ticketMetricItemsForIndicators(
          allIndicators,
          metrics,
        );
        if (items.length === 0) continue;

        const result = upsertKpiIndicatorActualsBatch({
          departmentId: dept.id,
          staffId: member.id,
          periodLabel,
          items,
          updatedBy:
            scope === "team"
              ? "Sistem · sync tiket tim"
              : "Sistem · sync tiket",
          syncAssessments: true,
        });
        if ("ok" in result && result.ok) {
          staffSynced += 1;
          itemsWritten += items.length;
        }
      }

      // Penilaian level departemen (staff_id null) dari semua tiket
      if (deptMetrics.ticketCount > 0) {
        const functions = listKpiFunctions(true, dept.id);
        for (const fn of functions) {
          const fnInds = allIndicators.filter((i) => i.kpiFunctionId === fn.id);
          if (!fnInds.some((i) => isTicketSourcedIndicator(i))) continue;
          const result = computeFunctionScoreFromIndicators(
            fn.id,
            fnInds,
            (ind) => {
              const auto = ticketActualValueForIndicator(ind, deptMetrics);
              return auto == null ? null : { actualValue: auto };
            },
          );
          if (result.filledCount === 0) continue;
          const db = getDb();
          const existingAsm = db
            .prepare(
              `SELECT id FROM kpi_assessments
               WHERE department_id = ? AND period_label = ?
                 AND kpi_function_id = ? AND staff_id IS NULL`,
            )
            .get(dept.id, periodLabel, fn.id) as { id: string } | undefined;
          upsertKpiAssessment({
            id: existingAsm?.id,
            departmentId: dept.id,
            periodLabel,
            staffId: null,
            kpiFunctionId: fn.id,
            score: result.score,
            targetScore: 100,
            notes: `Auto dari tiket · ${deptMetrics.ticketCount} tiket`,
            assessedByName: "Sistem · sync tiket",
          });
        }
      }
    }
  }

  return { departments, periods, staffSynced, itemsWritten };
}
