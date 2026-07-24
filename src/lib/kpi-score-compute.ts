import type {
  KpiScoreBand,
  KpiScoreIndicator,
  KpiScoreIndicatorConfig,
} from "./types";

/** Ambil skor dari bands: band dengan min tertinggi di mana value >= min */
export function scoreFromBands(
  value: number,
  bands: KpiScoreBand[] | undefined,
): number {
  if (!bands || bands.length === 0) {
    return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
  }
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  for (const b of sorted) {
    if (value >= b.min) return b.score;
  }
  return sorted[sorted.length - 1]?.score ?? 0;
}

export function resolveTarget(
  config: KpiScoreIndicatorConfig,
  targetOverride?: number | null,
): number | null {
  if (targetOverride != null && Number.isFinite(targetOverride)) {
    return Number(targetOverride);
  }
  if (config.defaultTarget != null && Number.isFinite(config.defaultTarget)) {
    return Number(config.defaultTarget);
  }
  return null;
}

/**
 * Hitung skor indikator dari capaian.
 * - scale_count: actual vs bands (angka absolut)
 * - scale_percent: (actual/target)×100 vs bandsPercent; jika target kosong pakai actual
 * - weighted_leaf: actual sebagai skor 0–100
 * - attendance: actual sebagai skor 0–100 (dari absensi)
 */
export function computeIndicatorScore(
  indicator: KpiScoreIndicator,
  actualValue: number | null | undefined,
  targetOverride?: number | null,
): number {
  if (actualValue == null || !Number.isFinite(actualValue)) return 0;
  const actual = Number(actualValue);
  const { metricType, config } = indicator;

  if (metricType === "weighted_leaf" || metricType === "attendance") {
    return Math.max(0, Math.min(100, Math.round(actual * 10) / 10));
  }

  if (metricType === "scale_count") {
    return scoreFromBands(actual, config.bands);
  }

  if (metricType === "scale_percent") {
    const target = resolveTarget(config, targetOverride);
    const pct =
      target != null && target > 0 ? (actual / target) * 100 : actual;
    return scoreFromBands(pct, config.bandsPercent);
  }

  return 0;
}

export type FunctionIndicatorScore = {
  kpiFunctionId: string;
  score: number;
  /** Jumlah indikator yang punya nilai */
  filledCount: number;
  /** Bobot indikator yang dipakai */
  weightUsed: number;
  indicatorScores: Array<{
    indicatorId: string;
    name: string;
    weightPercent: number;
    actualValue: number | null;
    computedScore: number;
    metricType: KpiScoreIndicator["metricType"];
  }>;
};

/** Rata-rata tertimbang skor anak indikator dalam satu fungsi */
export function computeFunctionScoreFromIndicators(
  kpiFunctionId: string,
  indicators: KpiScoreIndicator[],
  getActual: (
    indicator: KpiScoreIndicator,
  ) => { actualValue: number | null; targetOverride?: number | null } | null,
): FunctionIndicatorScore {
  const kids = indicators
    .filter((i) => i.kpiFunctionId === kpiFunctionId && i.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let weighted = 0;
  let usedW = 0;
  const indicatorScores: FunctionIndicatorScore["indicatorScores"] = [];

  for (const ind of kids) {
    const raw = getActual(ind);
    if (!raw || raw.actualValue == null || !Number.isFinite(raw.actualValue)) {
      indicatorScores.push({
        indicatorId: ind.id,
        name: ind.name,
        weightPercent: ind.weightPercent,
        actualValue: null,
        computedScore: 0,
        metricType: ind.metricType,
      });
      continue;
    }
    const computed = computeIndicatorScore(
      ind,
      raw.actualValue,
      raw.targetOverride,
    );
    indicatorScores.push({
      indicatorId: ind.id,
      name: ind.name,
      weightPercent: ind.weightPercent,
      actualValue: raw.actualValue,
      computedScore: computed,
      metricType: ind.metricType,
    });
    if (ind.weightPercent > 0) {
      weighted += computed * ind.weightPercent;
      usedW += ind.weightPercent;
    }
  }

  const filledCount = indicatorScores.filter(
    (x) => x.actualValue != null,
  ).length;

  return {
    kpiFunctionId,
    score: usedW > 0 ? Math.round((weighted / usedW) * 10) / 10 : 0,
    filledCount,
    weightUsed: usedW,
    indicatorScores,
  };
}
