import {
  disciplinePeriodFromDate,
  disciplinePeriodRange,
} from "./discipline-period";
import { resolveIndicatorDataSource } from "./kpi-score-templates";
import type { KpiActivity, KpiScoreIndicator } from "./types";

const STOPWORDS = new Set([
  "harian",
  "mingguan",
  "bulanan",
  "berhasil",
  "server",
  "yang",
  "dari",
  "untuk",
  "dengan",
  "atau",
  "dan",
  "the",
  "kpi",
  "proses",
  "sesuai",
  "jadwal",
  "tepat",
  "waktu",
  "keamanan",
  "update",
]);

/** Sinonim judul kegiatan → token indikator (backup, patch, …) */
const TOKEN_SYNONYMS: Record<string, string[]> = {
  backup: ["backup", "cadangan", "bkp"],
  patch: ["patch", "hotfix", "patching"],
};

export type ActivityScoreMetrics = {
  total: number;
  done: number;
  inProgress: number;
  planned: number;
  /** Rata-rata progress × 100 (Selesai 100, Berjalan 50) */
  achievementPercent: number | null;
};

export function isActivitySourcedIndicator(
  indicator: KpiScoreIndicator,
): boolean {
  return (
    resolveIndicatorDataSource(indicator.metricType, indicator.config) ===
    "activity"
  );
}

export function activityProgressOf(status: string): number {
  if (status === "done") return 1;
  if (status === "in_progress") return 0.5;
  return 0;
}

export function activityInScorePeriod(
  activityDate: string | null,
  createdAt: string,
  periodLabel: string,
): boolean {
  const { start, end } = disciplinePeriodRange(periodLabel);
  const d = activityDate || createdAt.slice(0, 10);
  return d >= start && d <= end;
}

function indicatorSearchTerms(indicator: KpiScoreIndicator): string[] {
  const tokens = indicator.name
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  const terms = new Set<string>();
  for (const token of tokens) {
    const aliases = TOKEN_SYNONYMS[token] ?? [token];
    for (const alias of aliases) terms.add(alias);
  }
  return [...terms];
}

export function activityMatchesIndicator(
  activity: KpiActivity,
  indicator: KpiScoreIndicator,
): boolean {
  if (activity.kpiFunctionId !== indicator.kpiFunctionId) return false;
  const terms = indicatorSearchTerms(indicator);
  if (terms.length === 0) return true;
  const hay = `${activity.title} ${activity.description}`.toLowerCase();
  return terms.some((term) => hay.includes(term));
}

export function filterActivitiesForScoreMetrics(
  activities: KpiActivity[],
  opts: {
    departmentId?: string | null;
    periodLabel?: string | null;
    assigneeStaffId?: string | null;
    adminStaffIds?: Iterable<string> | null;
  },
): KpiActivity[] {
  const adminSet = new Set(opts.adminStaffIds ?? []);
  return activities.filter((a) => {
    if (a.status === "cancelled") return false;
    if (opts.departmentId && a.departmentId !== opts.departmentId) {
      return false;
    }
    if (a.assigneeStaffId && adminSet.has(a.assigneeStaffId)) return false;
    if (opts.assigneeStaffId) {
      if (a.assigneeStaffId !== opts.assigneeStaffId) return false;
    }
    if (opts.periodLabel) {
      if (
        !activityInScorePeriod(a.activityDate, a.createdAt, opts.periodLabel)
      ) {
        return false;
      }
    }
    return true;
  });
}

export function computeActivityScoreMetrics(
  activities: KpiActivity[],
): ActivityScoreMetrics {
  const list = activities.filter((a) => a.status !== "cancelled");
  if (list.length === 0) {
    return {
      total: 0,
      done: 0,
      inProgress: 0,
      planned: 0,
      achievementPercent: null,
    };
  }
  const sum = list.reduce((s, a) => s + activityProgressOf(a.status), 0);
  return {
    total: list.length,
    done: list.filter((a) => a.status === "done").length,
    inProgress: list.filter((a) => a.status === "in_progress").length,
    planned: list.filter((a) => a.status === "planned").length,
    achievementPercent: Math.round((sum / list.length) * 1000) / 10,
  };
}

/**
 * Petakan indikator sumber kegiatan → capaian otomatis.
 * Matching: fungsi KPI yang sama + kata kunci judul (backup/cadangan, patch, …).
 * Jika nama indikator tidak punya kata kunci, semua kegiatan fungsi itu dipakai.
 */
export function activityActualValueForIndicator(
  indicator: KpiScoreIndicator,
  activities: KpiActivity[],
): number | null {
  if (!isActivitySourcedIndicator(indicator)) return null;
  const matched = activities.filter((a) =>
    activityMatchesIndicator(a, indicator),
  );
  return computeActivityScoreMetrics(matched).achievementPercent;
}

export function activityPeriodLabels(activities: KpiActivity[]): string[] {
  const set = new Set<string>();
  for (const a of activities) {
    const d = a.activityDate || a.createdAt.slice(0, 10);
    const ym = disciplinePeriodFromDate(d);
    if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
  }
  return [...set].sort().reverse();
}

export function activityMetricItemsForIndicators(
  indicators: KpiScoreIndicator[],
  activities: KpiActivity[],
): Array<{ indicatorId: string; actualValue: number; notes: string }> {
  const items: Array<{
    indicatorId: string;
    actualValue: number;
    notes: string;
  }> = [];
  for (const ind of indicators) {
    if (!isActivitySourcedIndicator(ind)) continue;
    const matched = activities.filter((a) =>
      activityMatchesIndicator(a, ind),
    );
    const metrics = computeActivityScoreMetrics(matched);
    if (metrics.achievementPercent == null) continue;
    items.push({
      indicatorId: ind.id,
      actualValue: metrics.achievementPercent,
      notes: `Auto dari kegiatan · ${metrics.done}/${metrics.total} selesai · ${metrics.inProgress} berjalan`,
    });
  }
  return items;
}
