/**
 * Periode kedisiplinan: tanggal 21 s/d tanggal 20 bulan berikutnya.
 * Label = bulan akhir periode (YYYY-MM), contoh:
 * 21 Mei–20 Jun 2026 → "2026-06"
 */
export function disciplinePeriodFromDate(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return isoDate.slice(0, 7);
  if (d >= 21) {
    let ey = y;
    let em = m + 1;
    if (em > 12) {
      em = 1;
      ey += 1;
    }
    return `${ey}-${String(em).padStart(2, "0")}`;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Rentang tanggal untuk label periode disiplin YYYY-MM */
export function disciplinePeriodRange(periodLabel: string): {
  start: string;
  end: string;
} {
  const [ys, ms] = periodLabel.split("-").map(Number);
  let startY = ys;
  let startM = ms - 1;
  if (startM < 1) {
    startM = 12;
    startY -= 1;
  }
  return {
    start: `${startY}-${String(startM).padStart(2, "0")}-21`,
    end: `${ys}-${String(ms).padStart(2, "0")}-20`,
  };
}

/** Semua label periode disiplin dalam 1 tahun kalender (Jan–Des = 12 periode) */
export function disciplinePeriodsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

/**
 * Opsi filter periode: data yang ada + seluruh periode tahun berjalan
 * (+ tahun sebelumnya & berikutnya agar Agustus/Desember selalu bisa dipilih).
 */
export function buildDisciplinePeriodOptions(
  existingLabels: string[],
  aroundDate = new Date(),
): string[] {
  const y = aroundDate.getFullYear();
  const set = new Set<string>([
    ...disciplinePeriodsForYear(y - 1),
    ...disciplinePeriodsForYear(y),
    ...disciplinePeriodsForYear(y + 1),
    ...existingLabels.filter((p) => /^\d{4}-\d{2}$/.test(p)),
  ]);
  return [...set].sort().reverse();
}

/** Tampilkan "21 Mei 2026 – 20 Jun 2026" */
export function formatDisciplinePeriodLabel(periodLabel: string): string {
  if (!/^\d{4}-\d{2}$/.test(periodLabel)) return periodLabel;
  const { start, end } = disciplinePeriodRange(periodLabel);
  const fmt = (iso: string) => {
    const dt = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
