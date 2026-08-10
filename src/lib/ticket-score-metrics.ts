import { resolveIndicatorDataSource } from "./kpi-score-templates";
import { filterTicketsByMonth } from "./report-period";
import { hoursBetween, isWithinSla } from "./sla";
import type { Agent, KpiScoreIndicator, Ticket } from "./types";

/** Target response time helpdesk (menit) — selaras template IT */
export const TICKET_RESPONSE_TARGET_MINUTES = 30;

export type TicketScoreMetrics = {
  ticketCount: number;
  resolvedCount: number;
  /** % tiket selesai sesuai SLA */
  slaCompliancePercent: number | null;
  /** % tiket dengan first response ≤ target */
  responseWithinTargetPercent: number | null;
  /** (avg satisfaction / 5) × 100 */
  satisfactionPercent: number | null;
  /** % tiket yang bukan repeat issue */
  nonRepeatPercent: number | null;
};

export function emptyTicketScoreMetrics(): TicketScoreMetrics {
  return {
    ticketCount: 0,
    resolvedCount: 0,
    slaCompliancePercent: null,
    responseWithinTargetPercent: null,
    satisfactionPercent: null,
    nonRepeatPercent: null,
  };
}

export function isTicketSourcedIndicator(indicator: KpiScoreIndicator): boolean {
  return resolveIndicatorDataSource(indicator.metricType, indicator.config) ===
    "ticket";
}

export function agentIdsForStaff(agents: Agent[], staffId: string): string[] {
  return agents
    .filter((a) => a.staffId === staffId)
    .map((a) => a.id);
}

export function filterTicketsForScoreMetrics(
  tickets: Ticket[],
  opts: {
    periodYm: string | "all";
    /** Filter handler; null/undefined = semua tiket di periode */
    assigneeIds?: string[] | null;
  },
): Ticket[] {
  let list = filterTicketsByMonth(tickets, opts.periodYm);
  if (opts.assigneeIds != null) {
    const set = new Set(opts.assigneeIds);
    list = list.filter((t) => t.assigneeId != null && set.has(t.assigneeId));
  }
  return list;
}

export function computeTicketScoreMetrics(
  tickets: Ticket[],
): TicketScoreMetrics {
  if (tickets.length === 0) return emptyTicketScoreMetrics();

  const resolved = tickets.filter(
    (t) =>
      (t.status === "resolved" || t.status === "closed") && Boolean(t.resolvedAt),
  );
  const withinSla = resolved.filter((t) =>
    isWithinSla(t.priority, t.createdAt, t.resolvedAt),
  );

  const responseChecked = tickets.filter((t) => Boolean(t.firstResponseAt));
  const responseOk = responseChecked.filter((t) => {
    const mins =
      hoursBetween(t.createdAt, t.firstResponseAt!) * 60;
    return mins <= TICKET_RESPONSE_TARGET_MINUTES;
  });

  const rated = tickets.filter((t) => t.satisfaction != null);
  const avgSatisfaction =
    rated.length > 0
      ? rated.reduce((s, t) => s + (t.satisfaction ?? 0), 0) / rated.length
      : null;

  const nonRepeat = tickets.filter((t) => !t.isRepeat);

  return {
    ticketCount: tickets.length,
    resolvedCount: resolved.length,
    slaCompliancePercent:
      resolved.length > 0
        ? Math.round((withinSla.length / resolved.length) * 1000) / 10
        : null,
    responseWithinTargetPercent:
      responseChecked.length > 0
        ? Math.round((responseOk.length / responseChecked.length) * 1000) / 10
        : null,
    satisfactionPercent:
      avgSatisfaction != null
        ? Math.round((avgSatisfaction / 5) * 1000) / 10
        : null,
    nonRepeatPercent:
      Math.round((nonRepeat.length / tickets.length) * 1000) / 10,
  };
}

/**
 * Petakan indikator sumber ticket → nilai capaian otomatis.
 * Matching nama (SLA / Response / Satisfaction / Non-repeat).
 */
export function ticketActualValueForIndicator(
  indicator: KpiScoreIndicator,
  metrics: TicketScoreMetrics,
): number | null {
  if (!isTicketSourcedIndicator(indicator)) return null;
  if (metrics.ticketCount <= 0) return null;

  const name = indicator.name.toLowerCase();
  if (/sla/.test(name)) return metrics.slaCompliancePercent;
  if (/response|respon/.test(name)) return metrics.responseWithinTargetPercent;
  if (/satisfaction|kepuasan/.test(name)) return metrics.satisfactionPercent;
  if (/non[\s-]?repeat|bukan\s*repeat/.test(name)) {
    return metrics.nonRepeatPercent;
  }
  if (/repeat/.test(name)) return metrics.nonRepeatPercent;
  return null;
}

/** Periode YYYY-MM dari tiket (untuk opsi filter skor) */
export function ticketPeriodLabels(tickets: Ticket[]): string[] {
  const set = new Set<string>();
  for (const t of tickets) {
    const ym = (t.createdAt || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
  }
  return [...set].sort().reverse();
}

/** Item capaian untuk upsert dari metrik tiket */
export function ticketMetricItemsForIndicators(
  indicators: KpiScoreIndicator[],
  metrics: TicketScoreMetrics,
): Array<{ indicatorId: string; actualValue: number; notes: string }> {
  const items: Array<{
    indicatorId: string;
    actualValue: number;
    notes: string;
  }> = [];
  for (const ind of indicators) {
    if (!isTicketSourcedIndicator(ind)) continue;
    const value = ticketActualValueForIndicator(ind, metrics);
    if (value == null) continue;
    items.push({
      indicatorId: ind.id,
      actualValue: value,
      notes: `Auto dari tiket · ${metrics.ticketCount} tiket · ${metrics.resolvedCount} selesai`,
    });
  }
  return items;
}
