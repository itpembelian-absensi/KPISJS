import {
  activityActualValueForIndicator,
  activityInScorePeriod,
  activityProgressOf,
  isActivitySourcedIndicator,
} from "./activity-score-metrics";
import { attendanceIndicatorActual } from "./discipline-score";
import {
  computeFunctionScoreFromIndicators,
  indicatorsForStaffFunction,
  jabatanOwnsScoreSheet,
} from "./kpi-score-compute";
import {
  majuGroupsWeightedByItems,
  rollupMaju,
  type MajuCode,
  type MajuGroup,
} from "./kpi-maju";
import {
  assigneeIdsForTicketScore,
  computeTicketScoreMetrics,
  filterTicketsForScoreMetrics,
  isTicketSourcedIndicator,
  ticketActualValueForIndicator,
} from "./ticket-score-metrics";
import type {
  Agent,
  AttendancePeriodSummary,
  ItMember,
  KpiActivity,
  KpiAssessment,
  KpiFunction,
  KpiIndicatorActual,
  KpiScoreIndicator,
  StaffMember,
  Ticket,
} from "./types";

export type IndividualFunctionScore = {
  functionId: string;
  functionName: string;
  groupCode: MajuCode;
  weightPercent: number;
  /** Bobot yang dipakai di nilai akhir. Untuk metode bobot ini jumlah bobot indikator terisi. */
  scoreWeight?: number;
  score: number | null;
  source: "indikator" | "manual" | "absensi" | "kegiatan" | null;
};

export type IndividualScoreRow = {
  staffId: string;
  staffName: string;
  employeeCode: string;
  departmentId: string;
  position: string;
  periodLabel: string;
  functions: IndividualFunctionScore[];
  overall: number | null;
  weightUsed: number;
};

function isDiscipline(name: string) {
  return /kedisiplinan|kehadiran/i.test(name);
}

/**
 * Skor satu staf per periode — prioritas sama KPI Departemen:
 * indikator → penilaian manual → absensi / kegiatan
 */
export function computeIndividualScore(input: {
  staff: StaffMember;
  periodLabel: string;
  functions: KpiFunction[];
  indicators: KpiScoreIndicator[];
  actuals: KpiIndicatorActual[];
  assessments: KpiAssessment[];
  discipline: AttendancePeriodSummary | null;
  activities: KpiActivity[];
  tickets?: Ticket[];
  agents?: Agent[];
  /** Semua staf (untuk hitung tim manager) */
  allStaff?: StaffMember[];
  itTeam?: ItMember[];
  managerUserStaffIds?: string[];
  majuGroups?: MajuGroup[];
  scoreMethod?: "" | "bobot" | "rata-rata";
}): IndividualScoreRow {
  const {
    staff,
    periodLabel,
    functions,
    indicators,
    actuals,
    assessments,
    discipline,
    activities,
    tickets = [],
    agents = [],
    allStaff = [],
    itTeam = [],
    managerUserStaffIds = [],
  } = input;

  const deptFns = functions
    .filter((f) => f.departmentId === staff.departmentId && f.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const staffActuals = actuals.filter(
    (a) => a.staffId === staff.id && a.periodLabel === periodLabel,
  );
  const actualMap = new Map(staffActuals.map((a) => [a.indicatorId, a]));
  const discScore = discipline?.disciplineScore ?? null;

  const staffActs = activities.filter(
    (a) =>
      a.assigneeStaffId === staff.id &&
      a.status !== "cancelled" &&
      activityInScorePeriod(a.activityDate, a.createdAt, periodLabel),
  );

  const staffPool = allStaff.length > 0 ? allStaff : [staff];
  const { assigneeIds } = assigneeIdsForTicketScore({
    staffId: staff.id,
    agents,
    staff: staffPool,
    itTeam,
    managerUserStaffIds,
  });
  const ticketMetrics = computeTicketScoreMetrics(
    filterTicketsForScoreMetrics(tickets, {
      periodYm: periodLabel,
      assigneeIds,
    }),
  );

  const deptIndicators = indicators.filter(
    (i) => i.departmentId === staff.departmentId && i.active,
  );
  const ownsSheet = jabatanOwnsScoreSheet(deptIndicators, staff.jabatanId);

  const fnScores: IndividualFunctionScore[] = deptFns.map((fn) => {
    const fnIndicators = indicatorsForStaffFunction(
      deptIndicators,
      fn.id,
      staff.jabatanId,
      ownsSheet,
    );
    const functionHasIndicators = deptIndicators.some(
      (i) => i.kpiFunctionId === fn.id,
    );
    if (functionHasIndicators && fnIndicators.length === 0) {
      return {
        functionId: fn.id,
        functionName: fn.name,
        groupCode: fn.groupCode,
        weightPercent: fn.weightPercent,
        score: null,
        source: null,
      };
    }

    if (fnIndicators.length > 0) {
      const result = computeFunctionScoreFromIndicators(
        fn.id,
        fnIndicators,
        (ind) => {
          if (ind.metricType === "attendance") {
            const fromDb = actualMap.get(ind.id);
            if (fromDb?.actualValue != null) {
              return {
                actualValue: fromDb.actualValue,
                targetOverride: fromDb.targetOverride,
              };
            }
            const fromPart = attendanceIndicatorActual(ind, input.discipline);
            if (fromPart != null) return { actualValue: fromPart };
            if (discScore != null && Number.isFinite(discScore)) {
              return { actualValue: Number(discScore) };
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
          if (isActivitySourcedIndicator(ind)) {
            const auto = activityActualValueForIndicator(ind, staffActs);
            if (auto != null) return { actualValue: auto };
            const fromDb = actualMap.get(ind.id);
            if (fromDb?.actualValue != null) {
              return {
                actualValue: fromDb.actualValue,
                targetOverride: fromDb.targetOverride,
              };
            }
            return null;
          }
          const a = actualMap.get(ind.id);
          if (!a || a.actualValue == null) return null;
          return {
            actualValue: a.actualValue,
            targetOverride: a.targetOverride,
          };
        },
        { scoreMethod: input.scoreMethod ?? "" },
      );
      if (result.filledCount > 0) {
        return {
          functionId: fn.id,
          functionName: fn.name,
          groupCode: fn.groupCode,
          weightPercent: fn.weightPercent,
          ...(input.scoreMethod === "bobot"
            ? { scoreWeight: result.weightUsed }
            : {}),
          score: result.score,
          source: "indikator",
        };
      }
    }

    const manuals = assessments
      .filter(
        (a) =>
          a.kpiFunctionId === fn.id &&
          a.periodLabel === periodLabel &&
          (a.staffId === staff.id || !a.staffId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const forStaff = manuals.find((a) => a.staffId === staff.id);
    const forDept = manuals.find((a) => !a.staffId);
    const manual = forStaff || forDept;
    if (manual) {
      return {
        functionId: fn.id,
        functionName: fn.name,
        groupCode: fn.groupCode,
        weightPercent: fn.weightPercent,
        score: manual.score,
        source: "manual",
      };
    }

    if (fnIndicators.some((ind) => ind.metricType === "ratio")) {
      return {
        functionId: fn.id,
        functionName: fn.name,
        groupCode: fn.groupCode,
        weightPercent: fn.weightPercent,
        score: null,
        source: null,
      };
    }

    if (isDiscipline(fn.name)) {
      if (discScore != null && Number.isFinite(discScore)) {
        return {
          functionId: fn.id,
          functionName: fn.name,
          groupCode: fn.groupCode,
          weightPercent: fn.weightPercent,
          score: Math.round(Number(discScore) * 10) / 10,
          source: "absensi",
        };
      }
      return {
        functionId: fn.id,
        functionName: fn.name,
        groupCode: fn.groupCode,
        weightPercent: fn.weightPercent,
        score: null,
        source: null,
      };
    }

    const list = staffActs.filter((a) => a.kpiFunctionId === fn.id);
    if (list.length > 0) {
      const sum = list.reduce((s, a) => s + activityProgressOf(a.status), 0);
      const pct = Math.round((sum / list.length) * 1000) / 10;
      return {
        functionId: fn.id,
        functionName: fn.name,
        groupCode: fn.groupCode,
        weightPercent: fn.weightPercent,
        score: pct,
        source: "kegiatan",
      };
    }

    return {
      functionId: fn.id,
      functionName: fn.name,
      groupCode: fn.groupCode,
      weightPercent: fn.weightPercent,
      score: null,
      source: null,
    };
  });

  const visibleScores = fnScores.filter((row) => {
    const applied = indicatorsForStaffFunction(
      deptIndicators,
      row.functionId,
      staff.jabatanId,
      ownsSheet,
    );
    const hasAny = deptIndicators.some(
      (indicator) => indicator.kpiFunctionId === row.functionId,
    );
    return !(hasAny && applied.length === 0);
  });

  const majuItems = visibleScores.map((row) => ({
    groupCode: row.groupCode,
    weightPercent: row.scoreWeight ?? row.weightPercent,
    score: row.score,
  }));
  const maju = rollupMaju(
    majuItems,
    input.scoreMethod === "bobot"
      ? majuGroupsWeightedByItems(majuItems, input.majuGroups)
      : input.majuGroups,
  );

  return {
    staffId: staff.id,
    staffName: staff.name,
    employeeCode: staff.employeeCode,
    departmentId: staff.departmentId,
    position: staff.position,
    periodLabel,
    functions: visibleScores,
    overall: maju.overall,
    weightUsed: maju.weightUsed,
  };
}

export function buildIndividualScoreReport(input: {
  staffList: StaffMember[];
  periodLabel: string;
  functions: KpiFunction[];
  indicators: KpiScoreIndicator[];
  actuals: KpiIndicatorActual[];
  assessments: KpiAssessment[];
  disciplineByStaff: Map<string, AttendancePeriodSummary>;
  activities: KpiActivity[];
  adminStaffIds?: string[];
  tickets?: Ticket[];
  agents?: Agent[];
  allStaff?: StaffMember[];
  itTeam?: ItMember[];
  managerUserStaffIds?: string[];
  majuGroups?: MajuGroup[];
  scoreMethodByJabatan?: Record<string, "" | "bobot" | "rata-rata">;
}): IndividualScoreRow[] {
  const adminSet = new Set(input.adminStaffIds ?? []);
  const functions = input.functions;
  return input.staffList
    .filter((s) => s.active && !adminSet.has(s.id))
    .map((staff) =>
      computeIndividualScore({
        staff,
        periodLabel: input.periodLabel,
        functions,
        indicators: input.indicators.filter(
          (i) => i.departmentId === staff.departmentId,
        ),
        actuals: input.actuals,
        assessments: input.assessments.filter(
          (a) => a.departmentId === staff.departmentId,
        ),
        discipline: input.disciplineByStaff.get(staff.id) ?? null,
        activities: input.activities.filter(
          (a) => a.departmentId === staff.departmentId,
        ),
        scoreMethod: staff.jabatanId
          ? input.scoreMethodByJabatan?.[staff.jabatanId] ?? ""
          : "",
        tickets: input.tickets,
        agents: input.agents,
        allStaff: input.allStaff ?? input.staffList,
        itTeam: input.itTeam,
        managerUserStaffIds: input.managerUserStaffIds,
        majuGroups: input.majuGroups,
      }),
    )
    .sort((a, b) => {
      const ao = a.overall ?? -1;
      const bo = b.overall ?? -1;
      if (bo !== ao) return bo - ao;
      return a.staffName.localeCompare(b.staffName);
    });
}
