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

  if (metricType === "ratio") {
    if (config.rule === "kejadian") {
      const count = Math.max(0, Math.round(actual));
      if (count <= 0) return 100;
      if (count === 1) return 70;
      if (count === 2) return 40;
      return 0;
    }
    const target = resolveTarget(config, targetOverride);
    const lower = config.rule === "batas" || config.direction === "lower";
    if (config.direction === "lower" && config.rule !== "batas" && target === 0) {
      return actual <= 0 ? 100 : 0;
    }
    if (target == null || target <= 0) return 0;
    const raw = lower
      ? actual <= target
        ? 100
        : (target / actual) * 100
      : (actual / target) * 100;
    return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  }

  return 0;
}

/**
 * Indikator ratio tanpa target (selain kejadian target 0) tidak masuk rata-rata,
 * walaupun realisasi sudah diisi.
 */
export function indicatorAppliesToJabatan(
  jabatanIdOnIndicator: string | null | undefined,
  staffJabatanId: string | null | undefined,
): boolean {
  return !jabatanIdOnIndicator || jabatanIdOnIndicator === staffJabatanId;
}

/** Jabatan punya lembar indikator sendiri di departemen ini. */
export function jabatanOwnsScoreSheet(
  indicators: Array<{ jabatanId: string | null; active?: boolean }>,
  staffJabatanId: string | null | undefined,
): boolean {
  if (!staffJabatanId) return false;
  return indicators.some(
    (indicator) =>
      indicator.active !== false && indicator.jabatanId === staffJabatanId,
  );
}

/** Indikator yang masuk hitungan satu staf. Lembar khusus menggantikan indikator umum departemen. */
export function indicatorsForStaffScore<
  T extends { jabatanId: string | null; active?: boolean },
>(indicators: T[], staffJabatanId: string | null | undefined): T[] {
  const ownsSheet = jabatanOwnsScoreSheet(indicators, staffJabatanId);
  return indicators.filter((indicator) => {
    if (indicator.active === false) return false;
    if (ownsSheet) return indicator.jabatanId === staffJabatanId;
    return indicatorAppliesToJabatan(indicator.jabatanId, staffJabatanId);
  });
}

export function indicatorsForStaffFunction<
  T extends {
    kpiFunctionId: string;
    jabatanId: string | null;
    active?: boolean;
  },
>(
  indicators: T[],
  functionId: string,
  staffJabatanId: string | null | undefined,
  ownsSheet: boolean,
): T[] {
  return indicators.filter((indicator) => {
    if (indicator.kpiFunctionId !== functionId) return false;
    if (indicator.active === false) return false;
    if (ownsSheet) return indicator.jabatanId === staffJabatanId;
    return indicatorAppliesToJabatan(indicator.jabatanId, staffJabatanId);
  });
}

export function indicatorScoreCounts(
  indicator: KpiScoreIndicator,
  actualValue: number | null | undefined,
  targetOverride?: number | null,
): boolean {
  if (actualValue == null || !Number.isFinite(actualValue)) return false;
  if (indicator.metricType !== "ratio") return true;
  if (indicator.config.rule === "kejadian") return true;
  const target = resolveTarget(indicator.config, targetOverride);
  if (indicator.config.direction === "lower" && target === 0) return true;
  return target != null && target > 0;
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

/** Rata-rata skor anak indikator dalam satu fungsi. Metode rata-rata mengabaikan bobot. */
export function computeFunctionScoreFromIndicators(
  kpiFunctionId: string,
  indicators: KpiScoreIndicator[],
  getActual: (
    indicator: KpiScoreIndicator,
  ) => { actualValue: number | null; targetOverride?: number | null } | null,
  options?: { scoreMethod?: "" | "bobot" | "rata-rata" },
): FunctionIndicatorScore {
  const kids = indicators
    .filter((i) => i.kpiFunctionId === kpiFunctionId && i.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let weighted = 0;
  let usedW = 0;
  let filledCount = 0;
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
    if (
      !indicatorScoreCounts(ind, raw.actualValue, raw.targetOverride)
    ) {
      indicatorScores.push({
        indicatorId: ind.id,
        name: ind.name,
        weightPercent: ind.weightPercent,
        actualValue: raw.actualValue,
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
    const weight =
      options?.scoreMethod === "rata-rata" ? 1 : ind.weightPercent;
    indicatorScores.push({
      indicatorId: ind.id,
      name: ind.name,
      weightPercent: ind.weightPercent,
      actualValue: raw.actualValue,
      computedScore: computed,
      metricType: ind.metricType,
    });
    if (weight > 0) {
      weighted += computed * weight;
      usedW += weight;
      filledCount += 1;
    }
  }

  return {
    kpiFunctionId,
    score: usedW > 0 ? Math.round((weighted / usedW) * 10000) / 10000 : 0,
    filledCount,
    weightUsed: usedW,
    indicatorScores,
  };
}
