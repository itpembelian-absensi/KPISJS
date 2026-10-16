/** Helper periode laporan — aman dipakai di Client Component */

export function currentReportMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

export function buildReportPeriodOptions(extra?: string[]): string[] {
  const y = new Date().getFullYear();
  const set = new Set<string>([
    ...monthsForYear(y - 1),
    ...monthsForYear(y),
    ...monthsForYear(y + 1),
    ...(extra ?? []).filter((p) => /^\d{4}-\d{2}$/.test(p)),
  ]);
  return [...set].sort().reverse();
}

export function formatReportMonth(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [ys, ms] = ym.split("-").map(Number);
  const dt = new Date(ys, ms - 1, 1);
  if (Number.isNaN(dt.getTime())) return ym;
  return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Daftar bulan YYYY-MM dari `from` sampai `to` (inklusif). Urutan dibalik jika from > to. */
export function monthsBetween(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) return [];
  let start = from;
  let end = to;
  if (start > end) {
    start = to;
    end = from;
  }
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 120) break;
  }
  return out;
}

export function currentReportDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function monthStartDate(ym?: string) {
  const month = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : currentReportMonth();
  return `${month}-01`;
}

export function normalizeDateRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const today = currentReportDate();
  const a = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : monthStartDate();
  const b = /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today;
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/** Setiap tanggal YYYY-MM-DD dari `from` sampai `to` (inklusif). */
export function datesBetween(from: string, to: string): string[] {
  const range = normalizeDateRange(from, to);
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const out: string[] = [];
  while (cursor <= end && out.length < 400) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function normalizePeriodRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const current = currentReportMonth();
  const a = /^\d{4}-\d{2}$/.test(from) ? from : current;
  const b = /^\d{4}-\d{2}$/.test(to) ? to : current;
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export function filterTicketsByMonth<T extends { createdAt: string }>(
  tickets: T[],
  periodYm: string | "all",
): T[] {
  if (periodYm === "all") return tickets;
  return tickets.filter((t) => (t.createdAt || "").slice(0, 7) === periodYm);
}
