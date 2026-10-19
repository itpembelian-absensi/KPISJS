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

/** Label periode disiplin yang beririsan dengan rentang tanggal. */
export function disciplinePeriodsOverlapping(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return [];
  }
  if (from > to) return [];
  const periods: string[] = [];
  let cursor = disciplinePeriodFromDate(from);
  const last = disciplinePeriodFromDate(to);
  while (cursor <= last && periods.length < 48) {
    periods.push(cursor);
    const [y, m] = cursor.split("-").map(Number);
    let nextMonth = m + 1;
    let nextYear = y;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    cursor = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  }
  return periods;
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

/** Tampilkan "21 Mei 2026" */
export function formatIsoDateId(iso: string): string {
  const day = iso.slice(0, 10);
  const dt = new Date(`${day}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Tampilkan "21 Mei 2026 – 20 Jun 2026" */
export function formatDisciplinePeriodLabel(periodLabel: string): string {
  if (!/^\d{4}-\d{2}$/.test(periodLabel)) return periodLabel;
  const { start, end } = disciplinePeriodRange(periodLabel);
  return `${formatIsoDateId(start)} – ${formatIsoDateId(end)}`;
}

export type DisciplineDeleteUnit = "day" | "week" | "month" | "period";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const ISO_WEEK = /^(\d{4})-W(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseLocalDate(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Senin–Minggu dari tanggal lokal. */
export function weekRangeContaining(isoDate: string): {
  from: string;
  to: string;
} | null {
  const dt = parseLocalDate(isoDate);
  if (!dt) return null;
  const weekday = dt.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(dt);
  start.setDate(dt.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

/** Minggu ISO (input type=week, contoh 2026-W21) → Senin–Minggu. */
export function isoWeekRange(weekValue: string): {
  from: string;
  to: string;
} | null {
  const match = ISO_WEEK.exec(weekValue.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4, 12, 0, 0, 0);
  const jan4Weekday = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (jan4Weekday - 1));
  const start = new Date(mondayWeek1);
  start.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

function calendarMonthRange(month: string): { from: string; to: string } | null {
  if (!ISO_MONTH.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad2(last)}` };
}

function formatCalendarMonth(month: string): string {
  const dt = new Date(`${month}-01T12:00:00`);
  if (Number.isNaN(dt.getTime())) return month;
  return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/**
 * Rentang hapus data kedisiplinan.
 * - day: satu tanggal
 * - week: Senin–Minggu (tanggal di dalam minggu, atau 2026-W21)
 * - month: bulan kalender (tanggal 1–akhir)
 * - period: periode disiplin tanggal 21–20
 */
export function resolveDisciplineDeleteRange(
  unit: DisciplineDeleteUnit,
  anchor: string,
): { from: string; to: string; label: string } | { error: string } {
  const value = anchor.trim();
  if (unit === "day") {
    if (!parseLocalDate(value)) return { error: "Tanggal tidak valid." };
    return {
      from: value,
      to: value,
      label: formatIsoDateId(value),
    };
  }
  if (unit === "week") {
    const range = ISO_WEEK.test(value)
      ? isoWeekRange(value)
      : weekRangeContaining(value);
    if (!range) return { error: "Minggu tidak valid." };
    return {
      ...range,
      label: `minggu ${formatIsoDateId(range.from)} – ${formatIsoDateId(range.to)}`,
    };
  }
  if (unit === "month") {
    const month = ISO_DATE.test(value) ? value.slice(0, 7) : value;
    const range = calendarMonthRange(month);
    if (!range) return { error: "Bulan tidak valid." };
    return {
      ...range,
      label: `bulan kalender ${formatCalendarMonth(month)} (${formatIsoDateId(range.from)} – ${formatIsoDateId(range.to)})`,
    };
  }
  if (unit === "period") {
    if (!ISO_MONTH.test(value)) return { error: "Periode tidak valid." };
    const range = disciplinePeriodRange(value);
    return {
      from: range.start,
      to: range.end,
      label: `periode disiplin ${formatDisciplinePeriodLabel(value)}`,
    };
  }
  return { error: "Satuan hapus tidak dikenal." };
}
