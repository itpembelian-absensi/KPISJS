import {
  dataSourceBadgeLabel,
  METRIC_TYPE_LABEL,
  resolveIndicatorDataSource,
} from "./kpi-score-templates";
import type { KpiFunction, KpiScoreIndicator } from "./types";

function isDisciplineFn(name: string) {
  return /kedisiplinan|kehadiran/i.test(name);
}

function formatBands(
  bands: Array<{ min: number; score: number; label?: string }> | undefined,
): string | null {
  if (!bands || bands.length === 0) return null;
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const parts = sorted.slice(0, 4).map((b) => {
    const label = b.label || `≥${b.min}`;
    return `${label}→${b.score}`;
  });
  if (sorted.length > 4) parts.push("…");
  return parts.join(", ");
}

function indicatorFormulaLine(ind: KpiScoreIndicator): string {
  const src = dataSourceBadgeLabel(ind.metricType, ind.config);
  const target = ind.config.defaultTarget;
  const bands =
    formatBands(ind.config.bandsPercent) || formatBands(ind.config.bands);
  const metric = METRIC_TYPE_LABEL[ind.metricType];
  const source = resolveIndicatorDataSource(ind.metricType, ind.config);

  let how = metric;
  if (ind.metricType === "scale_percent") {
    how =
      target != null
        ? `% capaian vs target ${target} → skor skala`
        : "% capaian → skor skala";
  } else if (ind.metricType === "scale_count") {
    how =
      target != null
        ? `jumlah vs target ${target} → skor skala`
        : "jumlah capaian → skor skala";
  } else if (ind.metricType === "attendance") {
    how = "skor absensi 0–100";
  } else if (ind.metricType === "weighted_leaf") {
    how = "nilai 0–100";
  }

  if (source === "ticket") {
    const n = ind.name.toLowerCase();
    if (/sla/.test(n)) how = "% tiket selesai sesuai SLA → skor skala";
    else if (/response|respon/.test(n))
      how = "% first response ≤30 menit → skor skala";
    else if (/satisfaction|kepuasan/.test(n))
      how = "(avg rating÷5)×100 → skor skala";
    else if (/repeat/.test(n)) how = "% tiket non-repeat → skor skala";
  } else if (source === "activity") {
    how =
      "rata-rata kegiatan tertaut (Selesai 100% · Berjalan 50%) sesuai kata kunci judul";
  }

  const bandHint = bands ? ` (${bands})` : "";
  return `${ind.name} (${ind.weightPercent}%): ${how}${bandHint} · ${src.label}`;
}

/**
 * Rumus penilaian per fungsi KPI — dipakai di view Penilaian & Skor.
 */
export function buildFunctionScoreFormula(input: {
  fn: KpiFunction;
  indicators: KpiScoreIndicator[];
  source:
    | "tiket"
    | "tiket_tim"
    | "indikator"
    | "manual"
    | "absensi"
    | "kegiatan";
}): { summary: string; lines: string[] } {
  const { fn, indicators, source } = input;
  const activeInds = indicators
    .filter((i) => i.active && i.kpiFunctionId === fn.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const contrib = `Kontribusi ke total = skor fungsi × ${fn.weightPercent}% ÷ 100`;

  if ((source as string) === "manual") {
    return {
      summary: "Nilai diisi manual 0–100, lalu × bobot fungsi.",
      lines: [
        "Skor fungsi = input penilaian manual (0–100)",
        contrib,
      ],
    };
  }

  if (source === "absensi" || (isDisciplineFn(fn.name) && activeInds.length === 0)) {
    return {
      summary: "Dari absensi: mulai 100, dikurangi absen/telat, + lembur.",
      lines: [
        "Skor fungsi = skor absensi periode (maks 100)",
        "− (hari absen ÷ hari kerja) × 45",
        "− min(jumlah telat × 2,5, 20)",
        "− min(menit telat ÷ 30, 15)",
        "+ min(menit lembur ÷ 120, 5)",
        contrib,
      ],
    };
  }

  if (source === "kegiatan" || activeInds.length === 0) {
    return {
      summary: "Dari kegiatan tertaut: Selesai 100%, Berjalan 50%.",
      lines: [
        "Skor fungsi = rata-rata nilai kegiatan yang dilink ke fungsi",
        "Selesai = 100% · Berjalan = 50% · Lainnya/batal = 0% (PIC admin tidak dihitung)",
        contrib,
      ],
    };
  }

  // tiket / indikator
  const lines = [
    "Skor fungsi = Σ (skor indikator × bobot) ÷ Σ bobot indikator yang terisi",
    ...activeInds.map(indicatorFormulaLine),
    contrib,
  ];

  const summary =
    source === "tiket_tim"
      ? "Otomatis dari tiket tim (anak buah) — SLA, response, satisfaction, repeat."
      : source === "tiket"
        ? "Otomatis dari tiket (SLA, response, satisfaction, repeat) + indikator lain."
        : "Dari capaian indikator Aturan Skor KPI (otomatis/manual per indikator).";

  return { summary, lines };
}
