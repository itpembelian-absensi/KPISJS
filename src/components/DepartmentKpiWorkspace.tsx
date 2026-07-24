"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
import { formatDisciplinePeriodLabel, buildDisciplinePeriodOptions, disciplinePeriodFromDate } from "@/lib/discipline-period";
import { computeFunctionScoreFromIndicators } from "@/lib/kpi-score-compute";
import {
  METRIC_TYPE_LABEL,
  dataSourceBadgeLabel,
} from "@/lib/kpi-score-templates";
import type {
  AttendancePeriodSummary,
  Department,
  KpiActivity,
  KpiActivityFrequency,
  KpiAssessment,
  KpiFunction,
  KpiIndicatorActual,
  KpiProject,
  KpiScoreIndicator,
  StaffMember,
} from "@/lib/types";

type Tab = "fungsi" | "project" | "kegiatan" | "penilaian" | "kedisiplinan";
type DisciplineRow = AttendancePeriodSummary & { staff: StaffMember | null };

const ALL_TABS: Tab[] = [
  "fungsi",
  "project",
  "kegiatan",
  "kedisiplinan",
  "penilaian",
];
const STAFF_TABS: Tab[] = ["project", "kegiatan"];

function parseTab(
  raw: string | null,
  staffLimited: boolean,
): Tab | null {
  if (!raw) return null;
  const allowed = staffLimited ? STAFF_TABS : ALL_TABS;
  return allowed.includes(raw as Tab) ? (raw as Tab) : null;
}

const PROJECT_STATUS = {
  planned: "Direncanakan",
  active: "Berjalan",
  on_hold: "Ditunda",
  done: "Selesai",
  cancelled: "Batal",
} as const;

const ACTIVITY_STATUS = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Batal",
} as const;

/** Form kegiatan: tanpa "Direncanakan" (khusus project / rencana kerja) */
const ACTIVITY_STATUS_FORM = {
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Batal",
} as const;

const ACTIVITY_FREQUENCY: Record<KpiActivityFrequency, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

const ACTIVITY_FREQ_TABS: { id: KpiActivityFrequency; label: string }[] = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
];

/** Filter list: semua / pending (belum selesai) / selesai */
type ProgressFilter = "all" | "pending" | "done";

const PROGRESS_FILTERS: { id: ProgressFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Belum selesai" },
  { id: "done", label: "Selesai" },
];

function isActivityPending(status: KpiActivity["status"]) {
  return status === "planned" || status === "in_progress";
}

function isProjectPending(status: KpiProject["status"]) {
  return (
    status === "planned" || status === "active" || status === "on_hold"
  );
}

function parseActivityFreq(raw: string | null): KpiActivityFrequency {
  if (raw === "weekly" || raw === "monthly" || raw === "daily") return raw;
  return "daily";
}

function parseProgressFilter(raw: string | null): ProgressFilter {
  if (raw === "pending" || raw === "done" || raw === "all") return raw;
  return "all";
}

export function DepartmentKpiWorkspace({
  departments,
  functions: initialFunctions,
  projects: initialProjects,
  activities: initialActivities,
  assessments: initialAssessments,
  disciplineSummaries: initialDiscipline,
  scoreIndicators: initialIndicators = [],
  indicatorActuals: initialActuals = [],
  staff,
  defaultDepartmentId,
  assessorName,
  staffLimited = false,
  managerStaffIds = [],
  adminStaffIds = [],
  assessmentUnrestricted = true,
  assessorHomeDepartmentId = null,
  assessmentExtraStaffIds = [],
}: {
  departments: Department[];
  functions: KpiFunction[];
  projects: KpiProject[];
  activities: KpiActivity[];
  assessments: KpiAssessment[];
  disciplineSummaries: DisciplineRow[];
  scoreIndicators?: KpiScoreIndicator[];
  indicatorActuals?: KpiIndicatorActual[];
  staff: StaffMember[];
  defaultDepartmentId: string;
  assessorName: string;
  /** Staf: hanya project & kegiatan, dept terkunci */
  staffLimited?: boolean;
  /** staffId yang punya akun role manager (untuk label di form penilaian) */
  managerStaffIds?: string[];
  /** staffId akun admin — dikecualikan dari penilaian KPI */
  adminStaffIds?: string[];
  /** Admin/IT: boleh menilai siapa saja */
  assessmentUnrestricted?: boolean;
  /** Dept sendiri si penilai (manager/penilai) */
  assessorHomeDepartmentId?: string | null;
  /** Staf dept lain yang diizinkan dinilai */
  assessmentExtraStaffIds?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deptId, setDeptId] = useState(
    defaultDepartmentId || departments[0]?.id || "",
  );
  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = parseTab(searchParams.get("tab"), staffLimited);
    if (fromUrl) return fromUrl;
    return staffLimited ? "project" : "fungsi";
  });
  const [activityFreq, setActivityFreq] = useState<KpiActivityFrequency>(() =>
    parseActivityFreq(searchParams.get("freq")),
  );
  const [activityProgress, setActivityProgress] = useState<ProgressFilter>(() =>
    parseProgressFilter(searchParams.get("progress")),
  );
  const [projectProgress, setProjectProgress] = useState<ProgressFilter>(() =>
    parseProgressFilter(searchParams.get("projectProgress")),
  );
  const [projects, setProjects] = useState(initialProjects);
  const [activities, setActivities] = useState(initialActivities);
  const [assessments, setAssessments] = useState(initialAssessments);
  const [discipline, setDiscipline] = useState(initialDiscipline);
  const [scoreIndicators, setScoreIndicators] = useState(initialIndicators);
  const [indicatorActuals, setIndicatorActuals] = useState(initialActuals);
  /** Draft capaian: indicatorId → string input */
  const [actualDrafts, setActualDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setScoreIndicators((prev) =>
      prev === initialIndicators ? prev : initialIndicators,
    );
  }, [initialIndicators]);
  useEffect(() => {
    setIndicatorActuals((prev) =>
      prev === initialActuals ? prev : initialActuals,
    );
  }, [initialActuals]);
  const [error, setError] = useState<string | null>(null);
  const [assessMessage, setAssessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Filter skor: all = departemen, atau id staf */
  const [scoreStaffId, setScoreStaffId] = useState<string>("all");
  const [scorePeriod, setScorePeriod] = useState<string>("all");
  /** Target penilaian manual (boleh beda dari filter skor / dept workspace) */
  const [assessDeptId, setAssessDeptId] = useState(
    defaultDepartmentId || departments[0]?.id || "",
  );
  const [assessStaffId, setAssessStaffId] = useState("");
  const [assessFormKey, setAssessFormKey] = useState(0);
  const [editingAssessment, setEditingAssessment] =
    useState<KpiAssessment | null>(null);
  const [editingActivity, setEditingActivity] = useState<KpiActivity | null>(
    null,
  );
  const [editingProject, setEditingProject] = useState<KpiProject | null>(null);
  const [viewingProject, setViewingProject] = useState<KpiProject | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreview, setPendingPreview] = useState<string[]>([]);

  useEffect(() => {
    const fromUrl = parseTab(searchParams.get("tab"), staffLimited);
    if (fromUrl) setTab(fromUrl);
    setActivityFreq(parseActivityFreq(searchParams.get("freq")));
    setActivityProgress(parseProgressFilter(searchParams.get("progress")));
    setProjectProgress(parseProgressFilter(searchParams.get("projectProgress")));
  }, [searchParams, staffLimited]);

  useEffect(() => {
    setAssessDeptId(deptId);
    setAssessStaffId("");
  }, [deptId]);

  const functions = useMemo(
    () =>
      initialFunctions
        .filter((f) => f.departmentId === deptId && f.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [initialFunctions, deptId],
  );

  const deptProjects = projects.filter((p) => p.departmentId === deptId);
  const deptActivities = activities.filter((a) => a.departmentId === deptId);
  const freqActivities = deptActivities.filter(
    (a) => (a.frequency || "daily") === activityFreq,
  );
  const filteredActivities = freqActivities.filter((a) => {
    if (activityProgress === "pending") return isActivityPending(a.status);
    if (activityProgress === "done") return a.status === "done";
    return true;
  });
  const filteredProjects = deptProjects.filter((p) => {
    if (projectProgress === "pending") return isProjectPending(p.status);
    if (projectProgress === "done") return p.status === "done";
    return true;
  });
  const pendingActivityCount = freqActivities.filter((a) =>
    isActivityPending(a.status),
  ).length;
  const pendingProjectCount = deptProjects.filter((p) =>
    isProjectPending(p.status),
  ).length;

  function goActivityFreq(freq: KpiActivityFrequency) {
    setActivityFreq(freq);
    if (editingActivity && (editingActivity.frequency || "daily") !== freq) {
      setEditingActivity(null);
      clearPendingPhotos();
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "kegiatan");
    next.set("freq", freq);
    if (activityProgress !== "all") next.set("progress", activityProgress);
    else next.delete("progress");
    router.replace(`/kpi/departments?${next.toString()}`, { scroll: false });
  }

  function goActivityProgress(filter: ProgressFilter) {
    setActivityProgress(filter);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "kegiatan");
    next.set("freq", activityFreq);
    if (filter === "all") next.delete("progress");
    else next.set("progress", filter);
    router.replace(`/kpi/departments?${next.toString()}`, { scroll: false });
  }

  function goProjectProgress(filter: ProgressFilter) {
    setProjectProgress(filter);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "project");
    if (filter === "all") next.delete("projectProgress");
    else next.set("projectProgress", filter);
    router.replace(`/kpi/departments?${next.toString()}`, { scroll: false });
  }
  const deptAssessments = assessments.filter((a) => a.departmentId === deptId);
  const adminStaffSet = useMemo(
    () => new Set(adminStaffIds),
    [adminStaffIds],
  );
  const deptStaff = staff.filter((s) => s.departmentId === deptId && s.active);
  /** Staf yang ikut penilaian KPI (tanpa akun admin) */
  const kpiDeptStaff = useMemo(
    () => deptStaff.filter((s) => !adminStaffSet.has(s.id)),
    [deptStaff, adminStaffSet],
  );
  const assessFunctions = useMemo(
    () =>
      initialFunctions
        .filter((f) => f.departmentId === assessDeptId && f.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [initialFunctions, assessDeptId],
  );
  const assessmentExtraSet = useMemo(
    () => new Set(assessmentExtraStaffIds),
    [assessmentExtraStaffIds],
  );
  const assessDepartments = useMemo(() => {
    if (assessmentUnrestricted) return departments;
    const allowed = new Set<string>();
    if (assessorHomeDepartmentId) allowed.add(assessorHomeDepartmentId);
    for (const s of staff) {
      if (assessmentExtraSet.has(s.id)) allowed.add(s.departmentId);
    }
    return departments.filter((d) => allowed.has(d.id));
  }, [
    assessmentUnrestricted,
    departments,
    assessorHomeDepartmentId,
    staff,
    assessmentExtraSet,
  ]);
  const canAssessDeptAggregate =
    assessmentUnrestricted ||
    Boolean(
      assessorHomeDepartmentId && assessDeptId === assessorHomeDepartmentId,
    );
  const assessStaff = useMemo(() => {
    return staff.filter((s) => {
      if (!s.active || adminStaffSet.has(s.id)) return false;
      if (s.departmentId !== assessDeptId) return false;
      if (assessmentUnrestricted) return true;
      if (
        assessorHomeDepartmentId &&
        s.departmentId === assessorHomeDepartmentId
      ) {
        return true;
      }
      return assessmentExtraSet.has(s.id);
    });
  }, [
    staff,
    assessDeptId,
    adminStaffSet,
    assessmentUnrestricted,
    assessorHomeDepartmentId,
    assessmentExtraSet,
  ]);
  const managerStaffSet = useMemo(
    () => new Set(managerStaffIds),
    [managerStaffIds],
  );

  useEffect(() => {
    if (
      assessDepartments.length > 0 &&
      !assessDepartments.some((d) => d.id === assessDeptId)
    ) {
      const preferred =
        assessDepartments.find((d) => d.id === assessorHomeDepartmentId)?.id ||
        assessDepartments[0].id;
      setAssessDeptId(preferred);
      setAssessStaffId("");
    }
  }, [assessDepartments, assessDeptId, assessorHomeDepartmentId]);

  useEffect(() => {
    if (!canAssessDeptAggregate && !assessStaffId) {
      // keep empty until user picks; no auto-select
    } else if (
      assessStaffId &&
      !assessStaff.some((s) => s.id === assessStaffId)
    ) {
      setAssessStaffId("");
    }
  }, [canAssessDeptAggregate, assessStaffId, assessStaff]);

  const deptDiscipline = useMemo(
    () =>
      discipline.filter(
        (d) =>
          d.staff?.departmentId === deptId && !adminStaffSet.has(d.staffId),
      ),
    [discipline, deptId, adminStaffSet],
  );
  const weightTotal = functions.reduce((s, f) => s + f.weightPercent, 0);

  const deptIndicators = useMemo(
    () =>
      scoreIndicators
        .filter((i) => i.departmentId === deptId && i.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [scoreIndicators, deptId],
  );
  const deptActuals = useMemo(
    () => indicatorActuals.filter((a) => a.departmentId === deptId),
    [indicatorActuals, deptId],
  );
  const hasScoreRules = deptIndicators.length > 0;

  /** Skor: indikator → penilaian manual → absensi / kegiatan */
  const autoScores = useMemo(() => {
    const progressOf = (status: string) => {
      if (status === "done") return 1;
      if (status === "in_progress") return 0.5;
      return 0;
    };
    const isDiscipline = (name: string) =>
      /kedisiplinan|kehadiran/i.test(name);

    const staffFilter = scoreStaffId !== "all" ? scoreStaffId : null;

    let activeActs = deptActivities.filter((a) => a.status !== "cancelled");
    activeActs = activeActs.filter(
      (a) => !a.assigneeStaffId || !adminStaffSet.has(a.assigneeStaffId),
    );
    if (staffFilter) {
      activeActs = activeActs.filter((a) => a.assigneeStaffId === staffFilter);
    }
    if (scorePeriod !== "all") {
      const [ys, ms] = scorePeriod.split("-").map(Number);
      let startY = ys;
      let startM = ms - 1;
      if (startM < 1) {
        startM = 12;
        startY -= 1;
      }
      const start = `${startY}-${String(startM).padStart(2, "0")}-21`;
      const end = `${ys}-${String(ms).padStart(2, "0")}-20`;
      activeActs = activeActs.filter((a) => {
        const d = a.activityDate || a.createdAt.slice(0, 10);
        return d >= start && d <= end;
      });
    }

    let discRows = deptDiscipline;
    if (staffFilter) {
      discRows = discRows.filter((d) => d.staffId === staffFilter);
    }
    if (scorePeriod !== "all") {
      discRows = discRows.filter((d) => d.periodLabel === scorePeriod);
    }

    const latestDiscPeriod =
      scorePeriod !== "all"
        ? scorePeriod
        : (discRows[0]?.periodLabel ?? null);
    const discForAvg = latestDiscPeriod
      ? discRows.filter((d) => d.periodLabel === latestDiscPeriod)
      : discRows;
    const disciplineAvg =
      discForAvg.length === 0
        ? null
        : Math.round(
            (discForAvg.reduce((s, d) => s + d.disciplineScore, 0) /
              discForAvg.length) *
              10,
          ) / 10;

    const selectedStaff = staffFilter
      ? kpiDeptStaff.find((s) => s.id === staffFilter) ?? null
      : null;

    const latestAssessPeriod = [...deptAssessments]
      .filter((a) =>
        staffFilter ? a.staffId === staffFilter || !a.staffId : true,
      )
      .map((a) => a.periodLabel)
      .sort()
      .reverse()[0] ?? null;

    const periodForRules =
      scorePeriod !== "all"
        ? scorePeriod
        : latestDiscPeriod ||
          latestAssessPeriod ||
          deptActuals.find((a) =>
            staffFilter ? a.staffId === staffFilter : true,
          )?.periodLabel ||
          null;

    const staffIdsForRules = staffFilter
      ? [staffFilter]
      : kpiDeptStaff.map((s) => s.id);

    type ScoreSource = "indikator" | "manual" | "absensi" | "kegiatan";

    /** Ambil skor dari penilaian manual untuk satu fungsi */
    const resolveManualScore = (
      fnId: string,
    ): { score: number; detail: string } | null => {
      let list = deptAssessments.filter((a) => a.kpiFunctionId === fnId);
      if (scorePeriod !== "all") {
        list = list.filter((a) => a.periodLabel === scorePeriod);
      }
      if (!list.length) return null;

      const byUpdated = (a: (typeof list)[0], b: (typeof list)[0]) =>
        b.updatedAt.localeCompare(a.updatedAt);

      if (staffFilter) {
        const forStaff = list
          .filter((a) => a.staffId === staffFilter)
          .sort(byUpdated);
        if (forStaff.length) {
          const best = forStaff[0];
          return {
            score: best.score,
            detail: `penilaian manual · ${best.periodLabel}`,
          };
        }
        const deptLevel = list.filter((a) => !a.staffId).sort(byUpdated);
        if (deptLevel.length) {
          const best = deptLevel[0];
          return {
            score: best.score,
            detail: `penilaian manual (dept) · ${best.periodLabel}`,
          };
        }
        return null;
      }

      const periods = [...new Set(list.map((a) => a.periodLabel))]
        .sort()
        .reverse();
      const period = periods[0];
      const inPeriod = list.filter((a) => a.periodLabel === period);
      const deptLevel = inPeriod.filter((a) => !a.staffId).sort(byUpdated);
      if (deptLevel.length) {
        return {
          score: deptLevel[0].score,
          detail: `penilaian manual (dept) · ${period}`,
        };
      }
      const individuals = inPeriod.filter(
        (a) => a.staffId && !adminStaffSet.has(a.staffId),
      );
      if (!individuals.length) return null;
      const score =
        Math.round(
          (individuals.reduce((s, a) => s + a.score, 0) / individuals.length) *
            10,
        ) / 10;
      return {
        score,
        detail: `rata-rata ${individuals.length} penilaian manual · ${period}`,
      };
    };

    const rows = functions.map((fn) => {
      const fnIndicators = deptIndicators.filter(
        (i) => i.kpiFunctionId === fn.id,
      );

      if (hasScoreRules && fnIndicators.length > 0 && periodForRules) {
        const scores: number[] = [];
        let filledTotal = 0;
        for (const sid of staffIdsForRules) {
          const disc = deptDiscipline.find(
            (d) => d.staffId === sid && d.periodLabel === periodForRules,
          )?.disciplineScore;
          const staffActuals = deptActuals.filter(
            (a) => a.staffId === sid && a.periodLabel === periodForRules,
          );
          const actualMap = new Map(
            staffActuals.map((a) => [a.indicatorId, a]),
          );
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
                if (disc != null && Number.isFinite(disc)) {
                  return { actualValue: Number(disc) };
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
            scores.push(result.score);
            filledTotal += result.filledCount;
          }
        }
        if (scores.length > 0) {
          const score =
            Math.round(
              (scores.reduce((s, v) => s + v, 0) / scores.length) * 10,
            ) / 10;
          return {
            id: fn.id,
            name: fn.name,
            focus: fn.focus,
            weight: fn.weightPercent,
            source: "indikator" as ScoreSource,
            total: filledTotal,
            done: scores.length,
            inProgress: 0,
            planned: 0,
            percent: score,
            score,
            detail: staffFilter
              ? `${fnIndicators.length} indikator · ${periodForRules}`
              : `rata-rata ${scores.length} staf · ${periodForRules}`,
          };
        }
      }

      const manual = resolveManualScore(fn.id);
      if (manual) {
        return {
          id: fn.id,
          name: fn.name,
          focus: fn.focus,
          weight: fn.weightPercent,
          source: "manual" as ScoreSource,
          total: 1,
          done: 1,
          inProgress: 0,
          planned: 0,
          percent: manual.score,
          score: manual.score,
          detail: manual.detail,
        };
      }

      if (isDiscipline(fn.name)) {
        const score = disciplineAvg ?? 0;
        return {
          id: fn.id,
          name: fn.name,
          focus: fn.focus,
          weight: fn.weightPercent,
          source: "absensi" as ScoreSource,
          total: discForAvg.length,
          done: discForAvg.filter((d) => d.disciplineScore >= 80).length,
          inProgress: 0,
          planned: 0,
          percent: score,
          score,
          detail:
            discForAvg.length === 0
              ? "belum ada data absensi"
              : staffFilter
                ? `skor individu${latestDiscPeriod ? ` · ${latestDiscPeriod}` : ""}`
                : `rata-rata ${discForAvg.length} staf${
                    latestDiscPeriod ? ` · ${latestDiscPeriod}` : ""
                  }`,
        };
      }

      const list = activeActs.filter((a) => a.kpiFunctionId === fn.id);
      const sum = list.reduce((s, a) => s + progressOf(a.status), 0);
      const pct =
        list.length === 0 ? 0 : Math.round((sum / list.length) * 1000) / 10;
      return {
        id: fn.id,
        name: fn.name,
        focus: fn.focus,
        weight: fn.weightPercent,
        source: "kegiatan" as ScoreSource,
        total: list.length,
        done: list.filter((a) => a.status === "done").length,
        inProgress: list.filter((a) => a.status === "in_progress").length,
        planned: list.filter((a) => a.status === "planned").length,
        percent: pct,
        score: pct,
        detail:
          list.length === 0
            ? hasScoreRules
              ? "belum ada capaian indikator / penilaian manual"
              : "belum ada kegiatan"
            : `${list.filter((a) => a.status === "done").length} selesai · ${list.filter((a) => a.status === "in_progress").length} jalan · ${list.filter((a) => a.status === "planned").length} rencana`,
      };
    });

    let weighted = 0;
    let totalW = 0;
    const rowsWithContribution = rows.map((r) => {
      const contribution =
        r.weight > 0
          ? Math.round(((r.score ?? 0) * r.weight) / 100 * 10) / 10
          : 0;
      if (r.weight > 0) {
        totalW += r.weight;
        weighted += (r.score ?? 0) * r.weight;
      }
      return { ...r, contribution };
    });

    const overall =
      totalW > 0 ? Math.round((weighted / totalW) * 10) / 10 : 0;

    return {
      rows: rowsWithContribution,
      weightedScore: totalW > 0 ? overall : null,
      overallPercent: overall,
      weightUsed: totalW,
      total: activeActs.length,
      done: activeActs.filter((a) => a.status === "done").length,
      disciplineAvg,
      selectedStaff,
      scopeLabel: selectedStaff
        ? selectedStaff.name
        : "Seluruh departemen",
      hasScoreRules,
      periodForRules,
    };
  }, [
    deptActivities,
    functions,
    deptDiscipline,
    deptAssessments,
    kpiDeptStaff,
    scoreStaffId,
    scorePeriod,
    adminStaffSet,
    deptIndicators,
    deptActuals,
    hasScoreRules,
  ]);

  const scorePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const d of deptDiscipline) set.add(d.periodLabel);
    for (const a of deptActuals) set.add(a.periodLabel);
    for (const a of deptAssessments) set.add(a.periodLabel);
    for (const a of deptActivities) {
      const d = a.activityDate || a.createdAt.slice(0, 10);
      if (d.length >= 7) set.add(d.slice(0, 7));
    }
    return [...set].sort().reverse();
  }, [deptDiscipline, deptActivities, deptActuals, deptAssessments]);

  const canInputActuals =
    hasScoreRules &&
    scoreStaffId !== "all" &&
    scorePeriod !== "all";

  useEffect(() => {
    if (!canInputActuals) {
      setActualDrafts((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      return;
    }
    const drafts: Record<string, string> = {};
    for (const ind of deptIndicators) {
      const existing = deptActuals.find(
        (a) =>
          a.indicatorId === ind.id &&
          a.staffId === scoreStaffId &&
          a.periodLabel === scorePeriod,
      );
      if (ind.metricType === "attendance") {
        const disc = deptDiscipline.find(
          (d) =>
            d.staffId === scoreStaffId && d.periodLabel === scorePeriod,
        );
        drafts[ind.id] =
          existing?.actualValue != null
            ? String(existing.actualValue)
            : disc != null
              ? String(disc.disciplineScore)
              : "";
      } else {
        drafts[ind.id] =
          existing?.actualValue != null ? String(existing.actualValue) : "";
      }
    }
    setActualDrafts((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(drafts);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => prev[k] === drafts[k])
      ) {
        return prev;
      }
      return drafts;
    });
  }, [
    canInputActuals,
    deptIndicators,
    deptActuals,
    deptDiscipline,
    scoreStaffId,
    scorePeriod,
  ]);

  async function saveIndicatorActuals() {
    if (!canInputActuals) return;
    setSaving(true);
    setError(null);
    try {
      const items = deptIndicators
        .filter((i) => i.metricType !== "attendance")
        .map((ind) => {
          const raw = actualDrafts[ind.id]?.trim();
          return {
            indicatorId: ind.id,
            actualValue: raw === "" || raw == null ? null : Number(raw),
          };
        })
        .filter(
          (it) => it.actualValue == null || Number.isFinite(it.actualValue),
        );

      const res = await fetch("/api/kpi/indicator-actuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: deptId,
          staffId: scoreStaffId,
          periodLabel: scorePeriod,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal simpan capaian indikator");
        return;
      }
      setIndicatorActuals((prev) => {
        const others = prev.filter(
          (a) =>
            !(
              a.departmentId === deptId &&
              a.staffId === scoreStaffId &&
              a.periodLabel === scorePeriod
            ),
        );
        return [...(data.actuals as KpiIndicatorActual[]), ...others];
      });
      router.refresh();
    } catch {
      setError("Gagal simpan capaian indikator");
    } finally {
      setSaving(false);
    }
  }

  const assessmentPeriodOptions = useMemo(
    () => buildDisciplinePeriodOptions(scorePeriods),
    [scorePeriods],
  );

  const currentDisciplinePeriod = useMemo(
    () =>
      disciplinePeriodFromDate(new Date().toISOString().slice(0, 10)),
    [],
  );

  const defaultAssessPeriod =
    scorePeriod !== "all"
      ? scorePeriod
      : assessmentPeriodOptions.includes(currentDisciplinePeriod)
        ? currentDisciplinePeriod
        : (assessmentPeriodOptions[0] ?? "");

  const latestPeriod = deptAssessments[0]?.periodLabel ?? null;
  let weightedScore: number | null = null;
  if (latestPeriod && weightTotal > 0) {
    const periodAssessments = deptAssessments.filter(
      (a) => a.periodLabel === latestPeriod && !a.staffId,
    );
    let weighted = 0;
    let usedWeight = 0;
    for (const a of periodAssessments) {
      const fn = functions.find((f) => f.id === a.kpiFunctionId);
      if (!fn) continue;
      weighted += a.score * fn.weightPercent;
      usedWeight += fn.weightPercent;
    }
    if (usedWeight > 0) weightedScore = weighted / usedWeight;
  }

  const fnName = (id: string | null) =>
    initialFunctions.find((f) => f.id === id)?.name ?? "—";
  const staffName = (id: string | null) =>
    staff.find((s) => s.id === id)?.name ?? "—";

  /** Project terkunci jika sudah ada kegiatan berjalan/selesai */
  function isProjectLocked(projectId: string) {
    return activities.some(
      (a) =>
        a.projectId === projectId &&
        (a.status === "in_progress" || a.status === "done"),
    );
  }

  async function removeItem(
    kind: "projects" | "activities" | "assessments",
    id: string,
  ) {
    if (kind === "projects" && isProjectLocked(id)) {
      setError(
        "Project tidak bisa dihapus: sudah ada kegiatan yang berjalan/selesai",
      );
      return;
    }
    if (!confirm("Hapus data ini?")) return;
    setError(null);
    const res = await fetch(`/api/kpi/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus");
      return;
    }
    if (kind === "projects") {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setEditingProject((prev) => (prev?.id === id ? null : prev));
      setViewingProject((prev) => (prev?.id === id ? null : prev));
    }
    if (kind === "activities") {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setEditingActivity((prev) => (prev?.id === id ? null : prev));
    }
    if (kind === "assessments")
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  async function saveProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingProject && isProjectLocked(editingProject.id)) {
      setError(
        "Project tidak bisa diedit: sudah ada kegiatan yang berjalan/selesai",
      );
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/kpi/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingProject?.id,
        title: fd.get("title"),
        departmentId: deptId,
        kpiFunctionId: fd.get("kpiFunctionId") || null,
        description: fd.get("description"),
        status: fd.get("status"),
        ownerStaffId: fd.get("ownerStaffId") || null,
        startDate: fd.get("startDate") || null,
        endDate: fd.get("endDate") || null,
        progressPercent: fd.get("progressPercent"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal simpan project");
      return;
    }
    if (editingProject) {
      setProjects((prev) =>
        prev.map((p) => (p.id === data.project.id ? data.project : p)),
      );
      setEditingProject(null);
    } else {
      setProjects((prev) => [data.project, ...prev]);
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function uploadActivityPhotos(activityId: string, files: File[]) {
    if (!files.length) return null;
    const fd = new FormData();
    fd.append("activityId", activityId);
    for (const f of files) fd.append("photos", f);
    const res = await fetch("/api/kpi/activities/photos", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal unggah foto");
      return null;
    }
    return data.activity as KpiActivity;
  }

  function clearPendingPhotos() {
    setPendingPreview((prev) => {
      for (const url of prev) URL.revokeObjectURL(url);
      return [];
    });
    setPendingPhotos([]);
  }

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files);
    setPendingPhotos((prev) => {
      const next = [...prev, ...picked].slice(0, 8);
      setPendingPreview((old) => {
        for (const url of old) URL.revokeObjectURL(url);
        return next.map((f) => URL.createObjectURL(f));
      });
      return next;
    });
  }

  async function removeSavedPhoto(activityId: string, url: string) {
    if (!confirm("Hapus foto ini?")) return;
    const fd = new FormData();
    fd.append("activityId", activityId);
    fd.append("removeUrl", url);
    const res = await fetch("/api/kpi/activities/photos", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal hapus foto");
      return;
    }
    setActivities((prev) =>
      prev.map((a) => (a.id === data.activity.id ? data.activity : a)),
    );
    setEditingActivity((prev) =>
      prev?.id === data.activity.id ? data.activity : prev,
    );
    router.refresh();
  }

  async function saveActivity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/kpi/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingActivity?.id,
        title: fd.get("title"),
        departmentId: deptId,
        projectId: fd.get("projectId") || null,
        kpiFunctionId: fd.get("kpiFunctionId") || null,
        description: fd.get("description"),
        status: fd.get("status"),
        frequency: activityFreq,
        assigneeStaffId: fd.get("assigneeStaffId") || null,
        activityDate: fd.get("activityDate") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      setError(data.error || "Gagal simpan kegiatan");
      return;
    }

    let activity = data.activity as KpiActivity;
    if (pendingPhotos.length) {
      const withPhotos = await uploadActivityPhotos(activity.id, pendingPhotos);
      if (withPhotos) activity = withPhotos;
    }

    if (editingActivity) {
      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? activity : a)),
      );
      setEditingActivity(null);
    } else {
      setActivities((prev) => [activity, ...prev]);
    }
    const savedFreq = activity.frequency || activityFreq;
    if (savedFreq !== activityFreq) {
      goActivityFreq(savedFreq);
    }
    clearPendingPhotos();
    (e.target as HTMLFormElement).reset();
    setSaving(false);
    router.refresh();
  }

  function startEditAssessment(a: KpiAssessment) {
    setError(null);
    setAssessMessage(null);
    setAssessDeptId(a.departmentId);
    setAssessStaffId(a.staffId || "");
    setEditingAssessment(a);
    setAssessFormKey((k) => k + 1);
    requestAnimationFrame(() => {
      document
        .getElementById("assess-manual-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cancelEditAssessment() {
    setEditingAssessment(null);
    setAssessStaffId("");
    setAssessFormKey((k) => k + 1);
    setAssessMessage(null);
    setError(null);
  }

  async function deleteAssessment(a: KpiAssessment) {
    const fn =
      initialFunctions.find((f) => f.id === a.kpiFunctionId)?.name || "fungsi";
    if (
      !confirm(
        `Hapus penilaian "${fn}" · skor ${a.score} · ${formatDisciplinePeriodLabel(a.periodLabel)}?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setAssessMessage(null);
    try {
      const res = await fetch("/api/kpi/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteId: a.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus penilaian");
        return;
      }
      setAssessments((prev) => prev.filter((x) => x.id !== a.id));
      if (editingAssessment?.id === a.id) {
        cancelEditAssessment();
      }
      setAssessMessage(`Penilaian "${fn}" dihapus.`);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssessment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setAssessMessage(null);
    const fd = new FormData(e.currentTarget);
    const periodLabel = String(fd.get("periodLabel") || "").trim();
    const kpiFunctionId = String(fd.get("kpiFunctionId") || "").trim();
    const scoreRaw = String(fd.get("score") ?? "").trim();
    const score = Number(scoreRaw);

    if (!periodLabel) {
      setError("Pilih periode penilaian.");
      setSaving(false);
      return;
    }
    if (!kpiFunctionId) {
      setError("Pilih fungsi KPI yang dinilai.");
      setSaving(false);
      return;
    }
    if (!scoreRaw || !Number.isFinite(score)) {
      setError("Isi skor 0–100.");
      setSaving(false);
      return;
    }
    if (score < 0 || score > 100) {
      setError("Skor harus antara 0 dan 100.");
      setSaving(false);
      return;
    }
    if (assessFunctions.length === 0) {
      setError("Departemen ini belum punya fungsi KPI aktif.");
      setSaving(false);
      return;
    }
    if (!canAssessDeptAggregate && !assessStaffId) {
      setError("Pilih karyawan yang akan dinilai.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/kpi/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAssessment?.id,
          departmentId: assessDeptId,
          periodLabel,
          kpiFunctionId,
          staffId: assessStaffId || null,
          score,
          targetScore: fd.get("targetScore"),
          notes: fd.get("notes"),
          assessedByName: assessorName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal simpan penilaian");
        return;
      }
      setAssessments((prev) => {
        const next = prev.filter((x) => x.id !== data.assessment.id);
        return [data.assessment, ...next];
      });
      const wasEditing = Boolean(editingAssessment);
      setEditingAssessment(null);
      setAssessStaffId("");
      setAssessFormKey((k) => k + 1);
      const fnName =
        assessFunctions.find((f) => f.id === kpiFunctionId)?.name || "fungsi";
      setAssessMessage(
        wasEditing
          ? `Penilaian diperbarui: ${fnName} · skor ${score}.`
          : `Penilaian tersimpan: ${fnName} · skor ${score} · ${formatDisciplinePeriodLabel(periodLabel)}.`,
      );
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = staffLimited
    ? [
        { id: "project", label: "Project / Rencana Kerja" },
        { id: "kegiatan", label: "Kegiatan" },
      ]
    : [
        { id: "fungsi", label: "Fungsi KPI" },
        { id: "project", label: "Project / Rencana Kerja" },
        { id: "kegiatan", label: "Kegiatan" },
        { id: "kedisiplinan", label: "Kedisiplinan" },
        { id: "penilaian", label: "Penilaian & Skor" },
      ];

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            value={deptId}
            disabled={staffLimited || departments.length <= 1}
            onChange={(e) => {
              setDeptId(e.target.value);
              setScoreStaffId("all");
              setScorePeriod("all");
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        {!staffLimited ? (
          <div className="flex items-end">
            <p className="text-sm text-ink-muted">
              Bobot fungsi aktif:{" "}
              <strong
                className={
                  Math.abs(weightTotal - 100) < 0.01 ? "text-ok" : "text-warn"
                }
              >
                {weightTotal.toFixed(weightTotal % 1 ? 1 : 0)}%
              </strong>
            </p>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-sm text-ink-muted">
              Akses staf: hanya <strong>Project</strong> &amp;{" "}
              <strong>Kegiatan</strong>
            </p>
          </div>
        )}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                const next = new URLSearchParams();
                next.set("tab", t.id);
                if (t.id === "kegiatan") {
                  next.set("freq", activityFreq);
                  if (activityProgress !== "all") {
                    next.set("progress", activityProgress);
                  }
                }
                if (t.id === "project" && projectProgress !== "all") {
                  next.set("projectProgress", projectProgress);
                }
                router.replace(`/kpi/departments?${next.toString()}`, {
                  scroll: false,
                });
              }}
              className={`shrink-0 rounded-t-xl px-3 py-2.5 text-sm font-medium ${
                tab === t.id
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-brand-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="px-4 pt-3 text-sm text-danger">{error}</p>
        ) : null}

        {tab === "fungsi" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Fungsi</th>
                  <th className="w-24 px-4 py-2.5 font-medium">Bobot</th>
                  <th className="px-4 py-2.5 font-medium">Fokus standar</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((f) => (
                  <tr key={f.id} className="border-b border-line">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-deep">
                        {f.weightPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{f.focus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {functions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                Belum ada fungsi. Isi lewat Master Fungsi KPI.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "project" ? (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.1fr]">
            {viewingProject ? (
              <div className="space-y-3 rounded-xl border border-line bg-bg-elevated/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="mono text-xs text-brand">{viewingProject.code}</p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {viewingProject.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingProject(null)}
                    className="shrink-0 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs"
                  >
                    Tutup
                  </button>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-muted">Status</dt>
                    <dd className="font-medium">
                      {PROJECT_STATUS[viewingProject.status]} ·{" "}
                      {viewingProject.progressPercent}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Fungsi KPI</dt>
                    <dd className="font-medium">
                      {fnName(viewingProject.kpiFunctionId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Owner</dt>
                    <dd className="font-medium">
                      {staffName(viewingProject.ownerStaffId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Jadwal</dt>
                    <dd className="font-medium">
                      {viewingProject.startDate
                        ? new Date(viewingProject.startDate).toLocaleDateString(
                            "id-ID",
                          )
                        : "—"}{" "}
                      →{" "}
                      {viewingProject.endDate
                        ? new Date(viewingProject.endDate).toLocaleDateString(
                            "id-ID",
                          )
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {viewingProject.description ? (
                  <div>
                    <p className="text-xs text-ink-muted">Deskripsi</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {viewingProject.description}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-medium text-ink-muted uppercase">
                    Kegiatan terkait
                  </p>
                  {(() => {
                    const related = deptActivities.filter(
                      (a) => a.projectId === viewingProject.id,
                    );
                    if (related.length === 0) {
                      return (
                        <p className="mt-2 text-sm text-ink-muted">
                          Belum ada kegiatan.
                        </p>
                      );
                    }
                    return (
                      <ul className="mt-2 space-y-2">
                        {related.map((a) => (
                          <li
                            key={a.id}
                            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                          >
                            <p className="font-medium">{a.title}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {ACTIVITY_STATUS[a.status]} ·{" "}
                              {staffName(a.assigneeStaffId)}
                              {a.activityDate
                                ? ` · ${new Date(a.activityDate).toLocaleDateString("id-ID")}`
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
                {isProjectLocked(viewingProject.id) ? (
                  <p className="text-xs text-ink-muted">
                    Edit &amp; hapus dikunci karena ada kegiatan yang
                    berjalan/selesai. Detail tetap bisa dilihat.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(viewingProject);
                      setViewingProject(null);
                      setError(null);
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
                  >
                    Edit project
                  </button>
                )}
              </div>
            ) : (
              <form
                key={editingProject?.id ?? "new-project"}
                onSubmit={saveProject}
                className="space-y-3"
              >
                <h3 className="font-semibold">
                  {editingProject
                    ? "Edit project / rencana kerja"
                    : "Tambah project / rencana kerja"}
                </h3>
                <input
                  name="title"
                  required
                  defaultValue={editingProject?.title ?? ""}
                  placeholder="Judul project / rencana kerja"
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
                <select
                  name="kpiFunctionId"
                  defaultValue={editingProject?.kpiFunctionId ?? ""}
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  <option value="">Fungsi KPI (opsional)</option>
                  {functions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProject?.description ?? ""}
                  placeholder="Deskripsi"
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="status"
                    defaultValue={editingProject?.status ?? "planned"}
                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  >
                    {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    name="progressPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={editingProject?.progressPercent ?? 0}
                    placeholder="Progress %"
                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={editingProject?.startDate ?? ""}
                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  />
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={editingProject?.endDate ?? ""}
                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  />
                </div>
                <select
                  name="ownerStaffId"
                  defaultValue={editingProject?.ownerStaffId ?? ""}
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  <option value="">Owner (opsional)</option>
                  {deptStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {editingProject ? "Simpan perubahan" : "Simpan project"}
                  </button>
                  {editingProject ? (
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="rounded-xl border border-line px-4 py-2 text-sm"
                    >
                      Batal
                    </button>
                  ) : null}
                </div>
              </form>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1">
                {PROGRESS_FILTERS.map((f) => {
                  const count =
                    f.id === "pending"
                      ? pendingProjectCount
                      : f.id === "done"
                        ? deptProjects.filter((p) => p.status === "done").length
                        : deptProjects.length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => goProjectProgress(f.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                        projectProgress === f.id
                          ? "bg-brand text-white"
                          : "border border-line text-ink-muted hover:bg-bg-elevated"
                      }`}
                    >
                      {f.label}
                      {f.id === "pending" ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
              {deptProjects.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada project.</p>
              ) : filteredProjects.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  {projectProgress === "pending"
                    ? "Tidak ada project yang masih pending."
                    : projectProgress === "done"
                      ? "Belum ada project selesai."
                      : "Belum ada project."}
                </p>
              ) : (
                filteredProjects.map((p) => {
                  const locked = isProjectLocked(p.id);
                  const selected = viewingProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border px-3 py-3 ${
                        selected
                          ? "border-brand bg-brand-soft/30"
                          : "border-line"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingProject(p);
                            setEditingProject(null);
                            setError(null);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="mono text-[11px] text-brand">{p.code}</p>
                          <p className="font-medium hover:underline">{p.title}</p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {PROJECT_STATUS[p.status]} · {p.progressPercent}% ·{" "}
                            {fnName(p.kpiFunctionId)}
                          </p>
                          {locked ? (
                            <p className="mt-1 text-[11px] text-ink-muted">
                              Kegiatan terkait sudah berjalan/selesai — edit
                              &amp; hapus dikunci · klik untuk lihat detail
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px] text-ink-muted">
                              Klik untuk lihat detail
                            </p>
                          )}
                        </button>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={locked}
                            title={
                              locked
                                ? "Tidak bisa diedit: kegiatan sudah berjalan/selesai"
                                : "Edit project"
                            }
                            onClick={() => {
                              if (locked) return;
                              setEditingProject(p);
                              setViewingProject(null);
                              setError(null);
                            }}
                            className={`text-xs ${
                              locked
                                ? "cursor-not-allowed text-ink-muted/40"
                                : "text-brand hover:underline"
                            }`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            title={
                              locked
                                ? "Tidak bisa dihapus: kegiatan sudah berjalan/selesai"
                                : "Hapus project"
                            }
                            onClick={() => removeItem("projects", p.id)}
                            className={`text-xs ${
                              locked
                                ? "cursor-not-allowed text-ink-muted/40"
                                : "text-danger hover:underline"
                            }`}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {tab === "kegiatan" ? (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-bg-elevated/80 p-1">
              {ACTIVITY_FREQ_TABS.map((f) => {
                const count = deptActivities.filter(
                  (a) => (a.frequency || "daily") === f.id,
                ).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => goActivityFreq(f.id)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${
                      activityFreq === f.id
                        ? "bg-brand text-white"
                        : "text-ink-muted hover:bg-white"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`ml-1.5 text-xs ${
                        activityFreq === f.id ? "text-white/80" : "text-ink-muted"
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <form
              key={`${editingActivity?.id ?? "new-activity"}-${activityFreq}`}
              onSubmit={saveActivity}
              className="space-y-3"
            >
              <h3 className="font-semibold">
                {editingActivity
                  ? `Edit kegiatan ${ACTIVITY_FREQUENCY[activityFreq].toLowerCase()}`
                  : `Tambah kegiatan ${ACTIVITY_FREQUENCY[activityFreq].toLowerCase()}`}
              </h3>
              <input
                name="title"
                required
                defaultValue={editingActivity?.title ?? ""}
                placeholder="Judul kegiatan"
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
              <select
                name="kpiFunctionId"
                defaultValue={editingActivity?.kpiFunctionId ?? ""}
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              >
                <option value="">Fungsi KPI (opsional)</option>
                {functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                name="projectId"
                defaultValue={editingActivity?.projectId ?? ""}
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              >
                <option value="">Project terkait (opsional)</option>
                {deptProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                rows={2}
                defaultValue={editingActivity?.description ?? ""}
                placeholder="Detail kegiatan"
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="status"
                  defaultValue={
                    editingActivity?.status &&
                    editingActivity.status !== "planned"
                      ? editingActivity.status
                      : "in_progress"
                  }
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  {Object.entries(ACTIVITY_STATUS_FORM).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  name="activityDate"
                  type="date"
                  defaultValue={editingActivity?.activityDate ?? ""}
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-dashed border-brand/40 bg-brand-soft/30 p-3">
                <p className="text-xs font-medium text-brand-deep">
                  Foto kegiatan (bisa lebih dari 1, max 8)
                </p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-deep">
                  Pilih / unggah foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      onPickPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[11px] text-ink-muted">
                  Format JPG, PNG, WebP, atau GIF · max 5MB per foto
                </p>
                {editingActivity && editingActivity.photoUrls.length > 0 ? (
                  <ActivityPhotoSlider
                    photos={editingActivity.photoUrls}
                    onRemove={(url) =>
                      void removeSavedPhoto(editingActivity.id, url)
                    }
                  />
                ) : null}
                {pendingPreview.length > 0 ? (
                  <div>
                    <p className="text-xs text-ink-muted">
                      Preview upload baru ({pendingPreview.length})
                    </p>
                    <ActivityPhotoSlider photos={pendingPreview} />
                    <button
                      type="button"
                      onClick={clearPendingPhotos}
                      className="mt-1 text-xs text-danger hover:underline"
                    >
                      Buang foto baru
                    </button>
                  </div>
                ) : null}
              </div>
              <select
                name="assigneeStaffId"
                defaultValue={editingActivity?.assigneeStaffId ?? ""}
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              >
                <option value="">PIC (opsional)</option>
                {deptStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {editingActivity ? "Simpan perubahan" : "Simpan kegiatan"}
                </button>
                {editingActivity ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(null);
                      clearPendingPhotos();
                    }}
                    className="rounded-xl border border-line px-4 py-2 text-sm"
                  >
                    Batal
                  </button>
                ) : null}
              </div>
            </form>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1">
                {PROGRESS_FILTERS.map((f) => {
                  const count =
                    f.id === "pending"
                      ? pendingActivityCount
                      : f.id === "done"
                        ? freqActivities.filter((a) => a.status === "done")
                            .length
                        : freqActivities.length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => goActivityProgress(f.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                        activityProgress === f.id
                          ? "bg-brand text-white"
                          : "border border-line text-ink-muted hover:bg-bg-elevated"
                      }`}
                    >
                      {f.label}
                      {f.id === "pending" ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
              {freqActivities.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Belum ada kegiatan {ACTIVITY_FREQUENCY[activityFreq].toLowerCase()}.
                </p>
              ) : filteredActivities.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  {activityProgress === "pending"
                    ? `Tidak ada kegiatan ${ACTIVITY_FREQUENCY[activityFreq].toLowerCase()} yang masih pending.`
                    : activityProgress === "done"
                      ? `Belum ada kegiatan ${ACTIVITY_FREQUENCY[activityFreq].toLowerCase()} selesai.`
                      : `Belum ada kegiatan ${ACTIVITY_FREQUENCY[activityFreq].toLowerCase()}.`}
                </p>
              ) : (
                filteredActivities.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-line px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/kpi/activities/${a.id}`}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-medium hover:underline">{a.title}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {ACTIVITY_STATUS[a.status]} ·{" "}
                          {ACTIVITY_FREQUENCY[a.frequency || "daily"]} ·{" "}
                          {fnName(a.kpiFunctionId)} ·{" "}
                          {staffName(a.assigneeStaffId)}
                          {a.activityDate
                            ? ` · ${new Date(a.activityDate).toLocaleDateString("id-ID")}`
                            : ""}
                          {a.photoUrls?.length
                            ? ` · ${a.photoUrls.length} foto`
                            : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          Klik untuk buka halaman detail
                        </p>
                      </Link>
                      <div className="flex shrink-0 gap-2">
                        <Link
                          href={`/kpi/activities/${a.id}`}
                          className="text-xs text-ink-muted hover:underline"
                        >
                          Lihat
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActivity(a);
                            clearPendingPhotos();
                            setError(null);
                          }}
                          className="text-xs text-brand hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem("activities", a.id)}
                          className="text-xs text-danger hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>
        ) : null}

        
{tab === "penilaian" ? (
          <div className="space-y-4 p-4">
            <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Skor otomatis (Master Fungsi KPI)</h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    {hasScoreRules
                      ? "Prioritas: capaian indikator → penilaian manual → kegiatan / absensi."
                      : "Filter per departemen & karyawan. Penilaian manual dipakai jika ada; selain itu kegiatan (Selesai 100% · Berjalan 50%) / absensi."}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted">
                    Capaian tertimbang · {autoScores.scopeLabel}
                  </p>
                  <p className="text-2xl font-semibold text-brand">
                    {autoScores.overallPercent}%
                  </p>
                  <p className="text-xs text-ink-muted">
                    Bobot dipakai {autoScores.weightUsed}%
                    {autoScores.total > 0
                      ? ` · kegiatan ${autoScores.done}/${autoScores.total}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="text-xs text-ink-muted">Departemen</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                    value={deptId}
                    disabled={staffLimited || departments.length <= 1}
                    onChange={(e) => {
                      setDeptId(e.target.value);
                      setScoreStaffId("all");
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-xs text-ink-muted">Karyawan</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                    value={scoreStaffId}
                    onChange={(e) => setScoreStaffId(e.target.value)}
                  >
                    <option value="all">Semua karyawan (agregat dept)</option>
                    {kpiDeptStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-xs text-ink-muted">Periode</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                    value={scorePeriod}
                    onChange={(e) => setScorePeriod(e.target.value)}
                  >
                    <option value="all">Semua periode</option>
                    {scorePeriods.map((p) => (
                      <option key={p} value={p}>
                        {formatDisciplinePeriodLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {hasScoreRules && !canInputActuals ? (
                <p className="mt-3 rounded-lg border border-line bg-surface/80 px-3 py-2 text-xs text-ink-muted">
                  Pilih <strong>satu karyawan</strong> dan{" "}
                  <strong>satu periode</strong> untuk mengisi capaian indikator
                  Aturan Skor KPI.
                </p>
              ) : null}

              {canInputActuals ? (
                <div className="mt-3 space-y-3 rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">
                        Input capaian indikator
                      </h4>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {autoScores.selectedStaff?.name} ·{" "}
                        {formatDisciplinePeriodLabel(scorePeriod)}. Absensi
                        terisi otomatis. Simpan untuk menghitung skor fungsi.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveIndicatorActuals()}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {saving ? "Menyimpan…" : "Simpan capaian"}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {functions.map((fn) => {
                      const inds = deptIndicators.filter(
                        (i) => i.kpiFunctionId === fn.id,
                      );
                      if (inds.length === 0) return null;
                      return (
                        <div key={fn.id}>
                          <p className="mb-2 text-xs font-semibold text-brand">
                            {fn.name}{" "}
                            <span className="font-normal text-ink-muted">
                              ({fn.weightPercent}%)
                            </span>
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-line">
                            <table className="w-full min-w-[480px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-line bg-bg-elevated/60 text-[11px] uppercase text-ink-muted">
                                  <th className="px-3 py-2 font-medium">
                                    Indikator
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    Bobot
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    Target
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    Capaian
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {inds.map((ind) => {
                                  const target =
                                    ind.config.defaultTarget ?? null;
                                  const readonly =
                                    ind.metricType === "attendance";
                                  const srcBadge = dataSourceBadgeLabel(
                                    ind.metricType,
                                    ind.config,
                                  );
                                  return (
                                    <tr
                                      key={ind.id}
                                      className="border-b border-line last:border-0"
                                    >
                                      <td className="px-3 py-2">
                                        <p className="font-medium">
                                          {ind.name}
                                        </p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-ink-muted">
                                          <span
                                            className={
                                              srcBadge.kind === "manual"
                                                ? "text-ink-muted"
                                                : srcBadge.wired
                                                  ? "text-ok"
                                                  : "text-warn"
                                            }
                                          >
                                            {srcBadge.label}
                                          </span>
                                          <span>·</span>
                                          <span>
                                            {METRIC_TYPE_LABEL[ind.metricType]}
                                          </span>
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 text-ink-muted">
                                        {ind.weightPercent}%
                                      </td>
                                      <td className="px-3 py-2 text-ink-muted">
                                        {target != null ? target : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          step="any"
                                          disabled={readonly || saving}
                                          className="w-28 rounded-lg border border-line bg-bg px-2 py-1.5 text-sm disabled:opacity-70"
                                          value={actualDrafts[ind.id] ?? ""}
                                          onChange={(e) =>
                                            setActualDrafts((prev) => ({
                                              ...prev,
                                              [ind.id]: e.target.value,
                                            }))
                                          }
                                          placeholder={
                                            ind.metricType === "weighted_leaf"
                                              ? "0–100"
                                              : "nilai"
                                          }
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {autoScores.rows.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Belum ada fungsi KPI aktif di master.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                        <th className="py-2 pr-3 pl-4 font-medium">Fungsi</th>
                        <th className="px-3 py-2 font-medium">Bobot</th>
                        <th className="px-3 py-2 font-medium">Sumber</th>
                        <th className="px-3 py-2 font-medium">Detail</th>
                        <th className="px-3 py-2 font-medium">% Capaian</th>
                        <th className="px-3 py-2 font-medium">
                          Skor
                          <span className="mt-0.5 block font-normal normal-case text-[10px]">
                            capaian × bobot
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoScores.rows.map((r) => (
                        <tr
                          key={r.id}
                          className="cursor-pointer border-b border-line transition hover:bg-brand-soft/40"
                          onClick={() =>
                            router.push(`/kpi/assessments/${r.id}`)
                          }
                          title="Buka halaman riwayat penilaian fungsi ini"
                        >
                          <td className="py-2.5 pr-3 pl-4">
                            <p className="font-medium text-brand underline-offset-2 hover:underline">
                              {r.name}
                            </p>
                            {r.focus ? (
                              <p className="mt-0.5 max-w-xs text-xs font-normal leading-snug text-ink-muted normal-case">
                                {r.focus}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">{r.weight}%</td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-[11px] text-ink-muted">
                              {r.source === "indikator"
                                ? "Indikator"
                                : r.source === "manual"
                                  ? "Manual"
                                  : r.source === "absensi"
                                    ? "Absensi"
                                    : "Kegiatan"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-ink-muted">
                            {r.detail}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                                <div
                                  className="h-full rounded-full bg-brand"
                                  style={{
                                    width: `${Math.min(100, r.percent)}%`,
                                  }}
                                />
                              </div>
                              <span className="font-medium">{r.percent}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`font-semibold ${
                                r.score >= 80
                                  ? "text-ok"
                                  : r.score >= 50
                                    ? "text-warn"
                                    : r.total === 0 && r.score === 0
                                      ? "text-ink-muted"
                                      : "text-danger"
                              }`}
                            >
                              {r.contribution}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-ink-muted">
                              dari capaian {r.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-line bg-bg-elevated/80">
                        <td className="py-3 pr-3 pl-4 font-semibold">
                          Total tertimbang
                          <p className="mt-0.5 text-xs font-normal text-ink-muted normal-case">
                            Σ (capaian × bobot / 100) · fungsi kosong = 0 ·{" "}
                            {autoScores.scopeLabel}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {autoScores.weightUsed}%
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-muted">—</td>
                        <td className="px-3 py-3 text-xs text-ink-muted">
                          {autoScores.total > 0
                            ? `${autoScores.done}/${autoScores.total} kegiatan`
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{
                                  width: `${Math.min(100, autoScores.overallPercent)}%`,
                                }}
                              />
                            </div>
                            <span className="font-semibold">
                              {autoScores.overallPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-base font-bold ${
                              autoScores.overallPercent >= 80
                                ? "text-ok"
                                : autoScores.overallPercent >= 50
                                  ? "text-warn"
                                  : autoScores.overallPercent === 0
                                    ? "text-ink-muted"
                                    : "text-danger"
                            }`}
                          >
                            {autoScores.overallPercent}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <p className="mt-2 px-4 pb-3 text-xs font-semibold text-blue-600">
                    Klik baris fungsi untuk membuka halaman riwayat penilaian.
                  </p>
                </div>
              )}
            </div>

            <form
              id="assess-manual-form"
              key={assessFormKey}
              onSubmit={saveAssessment}
              noValidate
              className="max-w-xl space-y-3"
            >
              <h3 className="font-semibold">
                {editingAssessment
                  ? "Edit penilaian manual"
                  : "Input penilaian manual"}
              </h3>
              <p className="text-xs text-ink-muted">
                Dept sendiri selalu boleh dinilai. Dept lain hanya staf yang
                diizinkan admin di User &amp; Role. Wajib: periode, fungsi KPI,
                skor.
              </p>
              {assessMessage ? (
                <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
                  {assessMessage}
                </p>
              ) : null}
              {error && tab === "penilaian" ? (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
              {weightedScore != null && latestPeriod ? (
                <p className="rounded-xl bg-bg-elevated px-3 py-2 text-sm text-ink-muted">
                  Skor manual tertimbang periode{" "}
                  <strong>{formatDisciplinePeriodLabel(latestPeriod)}</strong>:{" "}
                  <strong>{weightedScore.toFixed(1)}</strong> / 100
                </p>
              ) : null}
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">
                  Departemen yang dinilai
                </span>
                <select
                  value={assessDeptId}
                  onChange={(e) => {
                    setAssessDeptId(e.target.value);
                    setAssessStaffId("");
                    setAssessMessage(null);
                    if (editingAssessment) {
                      setEditingAssessment(null);
                      setAssessFormKey((k) => k + 1);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  {assessDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                      {assessorHomeDepartmentId &&
                      d.id === assessorHomeDepartmentId
                        ? " · dept Anda"
                        : ""}
                    </option>
                  ))}
                </select>
                {!assessmentUnrestricted ? (
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    Lintas dept: hanya staf yang diizinkan. Agregat dept hanya
                    untuk dept sendiri.
                  </span>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Periode</span>
                <select
                  key={`period-${scorePeriod}-${assessDeptId}-${editingAssessment?.id ?? "new"}`}
                  name="periodLabel"
                  required
                  defaultValue={
                    editingAssessment?.periodLabel || defaultAssessPeriod
                  }
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  <option value="" disabled>
                    Pilih periode
                  </option>
                  {assessmentPeriodOptions.map((p) => (
                    <option key={p} value={p}>
                      {formatDisciplinePeriodLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Fungsi KPI</span>
                <select
                  key={`fn-${assessDeptId}-${editingAssessment?.id ?? "new"}`}
                  name="kpiFunctionId"
                  required
                  defaultValue={editingAssessment?.kpiFunctionId || ""}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  <option value="">Pilih fungsi KPI</option>
                  {assessFunctions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.weightPercent}%)
                    </option>
                  ))}
                </select>
                {assessFunctions.length === 0 ? (
                  <span className="mt-1 block text-xs text-danger">
                    Belum ada fungsi aktif di departemen ini.
                  </span>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">
                  Karyawan / manager yang dinilai
                </span>
                <select
                  value={assessStaffId}
                  onChange={(e) => setAssessStaffId(e.target.value)}
                  required={!canAssessDeptAggregate}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  {canAssessDeptAggregate ? (
                    <option value="">
                      Penilaian departemen (bukan individu)
                    </option>
                  ) : (
                    <option value="">Pilih karyawan</option>
                  )}
                  {assessStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.position ? ` · ${s.position}` : ""}
                      {managerStaffSet.has(s.id) ? " · Manager" : ""}
                      {` (${s.employeeCode})`}
                    </option>
                  ))}
                </select>
                {!canAssessDeptAggregate ? (
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    Dept lain: wajib pilih individu yang diizinkan.
                  </span>
                ) : null}
                {!assessmentUnrestricted &&
                canAssessDeptAggregate &&
                assessStaff.length === 0 ? (
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    Belum ada staf aktif di dept ini (selain admin).
                  </span>
                ) : null}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                  <span className="text-xs text-ink-muted">Skor 0–100</span>
                  <input
                    name="score"
                    type="number"
                    required
                    min={0}
                    max={100}
                    step={0.1}
                    defaultValue={editingAssessment?.score ?? ""}
                    placeholder="Mis. 85"
                    className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-ink-muted">Target</span>
                  <input
                    name="targetScore"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={editingAssessment?.targetScore ?? 100}
                    placeholder="Target"
                    className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Catatan penilaian</span>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingAssessment?.notes ?? ""}
                  placeholder="Opsional"
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving || assessFunctions.length === 0}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingAssessment
                      ? "Perbarui penilaian"
                      : "Simpan penilaian"}
                </button>
                {editingAssessment ? (
                  <button
                    type="button"
                    onClick={cancelEditAssessment}
                    className="rounded-xl border border-line px-4 py-2 text-sm"
                  >
                    Batal
                  </button>
                ) : null}
              </div>

              {assessments.filter((a) => a.departmentId === assessDeptId)
                .length > 0 ? (
                <div className="rounded-xl border border-line pt-2">
                  <p className="px-3 py-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                    Penilaian manual terbaru
                  </p>
                  <ul className="divide-y divide-line">
                    {assessments
                      .filter((a) => a.departmentId === assessDeptId)
                      .slice(0, 8)
                      .map((a) => {
                        const fn =
                          initialFunctions.find((f) => f.id === a.kpiFunctionId)
                            ?.name || "Fungsi";
                        const who =
                          assessStaff.find((s) => s.id === a.staffId)?.name ||
                          staff.find((s) => s.id === a.staffId)?.name ||
                          "Departemen";
                        return (
                          <li
                            key={a.id}
                            className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p>
                                <span className="font-medium">{fn}</span>
                                <span className="text-ink-muted">
                                  {" "}
                                  · {who} ·{" "}
                                  {formatDisciplinePeriodLabel(a.periodLabel)}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                Dinilai oleh{" "}
                                <span className="font-medium text-ink">
                                  {a.assessedByName?.trim() || "—"}
                                </span>
                                <span className="ml-2 font-semibold text-brand">
                                  Skor {a.score}
                                </span>
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => startEditAssessment(a)}
                                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated disabled:opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void deleteAssessment(a)}
                                className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/5 disabled:opacity-60"
                              >
                                Hapus
                              </button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ) : null}
            </form>
          </div>
        ) : null}

        {tab === "kedisiplinan" ? (
          <div className="space-y-4 p-4">
            <p className="text-sm text-ink-muted">
              Skor dari absensi, keterlambatan, dan lembur. Periode dihitung{" "}
              <strong>tanggal 21 s/d 20 bulan berikutnya</strong>. Impor Excel
              dilakukan di Master data → Absensi &amp; Kedisiplinan. Otomatis
              masuk penilaian fungsi{" "}
              <strong>Kedisiplinan &amp; Kehadiran</strong>.
            </p>

            {deptDiscipline.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Belum ada data kedisiplinan untuk departemen ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                      <th className="px-3 py-2.5 font-medium">Staf</th>
                      <th className="px-3 py-2.5 font-medium">Periode</th>
                      <th className="px-3 py-2.5 font-medium">Hadir</th>
                      <th className="px-3 py-2.5 font-medium">Absen</th>
                      <th className="px-3 py-2.5 font-medium">Telat</th>
                      <th className="px-3 py-2.5 font-medium">Lembur</th>
                      <th className="px-3 py-2.5 font-medium">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptDiscipline.map((d) => (
                      <tr key={d.id} className="border-b border-line">
                        <td className="px-3 py-2.5 font-medium">
                          {d.staff?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs leading-snug">
                          {formatDisciplinePeriodLabel(d.periodLabel)}
                        </td>
                        <td className="px-3 py-2.5">
                          {d.presentDays}/{d.workDays}
                        </td>
                        <td className="px-3 py-2.5">{d.absentDays}</td>
                        <td className="px-3 py-2.5">
                          {d.lateCount}x · {d.totalLateMinutes} mnt
                        </td>
                        <td className="px-3 py-2.5">
                          {d.totalOvertimeMinutes} mnt
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-semibold ${
                              d.disciplineScore >= 80
                                ? "text-ok"
                                : d.disciplineScore >= 60
                                  ? "text-warn"
                                  : "text-danger"
                            }`}
                          >
                            {d.disciplineScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
