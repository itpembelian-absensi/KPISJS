/** Huruf nilai KPI. 80,9 pada lembar Markom jatuh di B. */

export type KpiGradeLetter = "A" | "B" | "C" | "D" | "E";

export const KPI_GRADE_BANDS: Array<{
  letter: KpiGradeLetter;
  min: number;
  label: string;
}> = [
  { letter: "A", min: 90, label: "Sangat baik" },
  { letter: "B", min: 80, label: "Baik" },
  { letter: "C", min: 70, label: "Cukup" },
  { letter: "D", min: 60, label: "Kurang" },
  { letter: "E", min: 0, label: "Sangat kurang" },
];

export function kpiGrade(score: number | null | undefined): {
  letter: KpiGradeLetter;
  label: string;
} | null {
  if (score == null || !Number.isFinite(score)) return null;
  const band = KPI_GRADE_BANDS.find((item) => score >= item.min);
  return band ? { letter: band.letter, label: band.label } : null;
}

export function formatScore(value: number, digits = 1): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Tertimbang = skor × bobot ÷ 100, dua desimal. */
export function weightedPoints(score: number, weightPercent: number): number {
  return Math.round(score * weightPercent) / 100;
}
