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

export function filterTicketsByMonth<T extends { createdAt: string }>(
  tickets: T[],
  periodYm: string | "all",
): T[] {
  if (periodYm === "all") return tickets;
  return tickets.filter((t) => (t.createdAt || "").slice(0, 7) === periodYm);
}
