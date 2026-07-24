import { computeFunctionScoreFromIndicators } from "./kpi-score-compute";
import type {
  AttendancePeriodSummary,
  KpiActivity,
  KpiAssessment,
  KpiFunction,
  KpiIndicatorActual,
  KpiScoreIndicator,
  StaffMember,
} from "./types";

export type IndividualFunctionScore = {
  functionId: string;
  functionName: string;
  weightPercent: number;
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

function progressOf(status: string) {
  if (status === "done") return 1;
  if (status === "in_progress") return 0.5;
  return 0;
}

function isDiscipline(name: string) {
  return /kedisiplinan|kehadiran/i.test(name);
}

function activityInPeriod(
  activityDate: string | null,
  createdAt: string,
  periodLabel: string,
): boolean {
  const [ys, ms] = periodLabel.split("-").map(Number);
  let startY = ys;
  let startM = ms - 1;
  if (startM < 1) {
    startM = 12;
    startY -= 1;
  }
  const start = `${startY}-${String(startM).padStart(2, "0")}-21`;
  const end = `${ys}-${String(ms).padStart(2, "0")}-20`;
  const d = activityDate || createdAt.slice(0, 10);
  return d >= start && d <= end;
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
      activityInPeriod(a.activityDate, a.createdAt, periodLabel),
  );

  const fnScores: IndividualFunctionScore[] = deptFns.map((fn) => {
    const fnIndicators = indicators.filter(
      (i) => i.kpiFunctionId === fn.id && i.active,
    );

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
            if (discScore != null && Number.isFinite(discScore)) {
              return { actualValue: Number(discScore) };
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
      );
      if (result.filledCount > 0) {
        return {
          functionId: fn.id,
          functionName: fn.name,
          weightPercent: fn.weightPercent,
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
        weightPercent: fn.weightPercent,
        score: manual.score,
        source: "manual",
      };
    }

    if (isDiscipline(fn.name)) {
      if (discScore != null && Number.isFinite(discScore)) {
        return {
          functionId: fn.id,
          functionName: fn.name,
          weightPercent: fn.weightPercent,
          score: Math.round(Number(discScore) * 10) / 10,
          source: "absensi",
        };
      }
      return {
        functionId: fn.id,
        functionName: fn.name,
        weightPercent: fn.weightPercent,
        score: null,
        source: null,
      };
    }

    const list = staffActs.filter((a) => a.kpiFunctionId === fn.id);
    if (list.length > 0) {
      const sum = list.reduce((s, a) => s + progressOf(a.status), 0);
      const pct = Math.round((sum / list.length) * 1000) / 10;
      return {
        functionId: fn.id,
        functionName: fn.name,
        weightPercent: fn.weightPercent,
        score: pct,
        source: "kegiatan",
      };
    }

    return {
      functionId: fn.id,
      functionName: fn.name,
      weightPercent: fn.weightPercent,
      score: null,
      source: null,
    };
  });

  let weighted = 0;
  let totalW = 0;
  for (const f of fnScores) {
    if (f.weightPercent <= 0) continue;
    totalW += f.weightPercent;
    // Fungsi tanpa capaian dihitung 0 — total 100 hanya jika semua bobot tercapai
    weighted += (f.score ?? 0) * f.weightPercent;
  }

  return {
    staffId: staff.id,
    staffName: staff.name,
    employeeCode: staff.employeeCode,
    departmentId: staff.departmentId,
    position: staff.position,
    periodLabel,
    functions: fnScores,
    overall: totalW > 0 ? Math.round((weighted / totalW) * 10) / 10 : null,
    weightUsed: totalW,
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
      }),
    )
    .sort((a, b) => {
      const ao = a.overall ?? -1;
      const bo = b.overall ?? -1;
      if (bo !== ao) return bo - ao;
      return a.staffName.localeCompare(b.staffName);
    });
}
