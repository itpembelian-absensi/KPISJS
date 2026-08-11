import { resolveIndicatorDataSource } from "./kpi-score-templates";
import { filterTicketsByMonth } from "./report-period";
import { hoursBetween, isWithinSla } from "./sla";
import type {
  Agent,
  ItMember,
  KpiScoreIndicator,
  StaffMember,
  Ticket,
} from "./types";

/** Target response time helpdesk (menit) — selaras template IT */
export const TICKET_RESPONSE_TARGET_MINUTES = 30;

export type TicketScoreMetrics = {
  ticketCount: number;
  resolvedCount: number;
  /** % tiket selesai sesuai SLA */
  slaCompliancePercent: number | null;
  /** % first response ≤ target */
  responseWithinTargetPercent: number | null;
  /** (avg satisfaction / 5) × 100 */
  satisfactionPercent: number | null;
  /** % tiket yang bukan repeat issue */
  nonRepeatPercent: number | null;
};

export type TicketScoreScope = "personal" | "team" | "department";

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

/** Staf dinilai sebagai manager (IT Manager di tim IT, atau user role manager) */
export function isManagerForTicketScore(
  staffId: string,
  itTeam: ItMember[],
  managerUserStaffIds?: Iterable<string> | null,
): boolean {
  if (
    itTeam.some(
      (m) => m.active && m.staffId === staffId && m.type === "it_manager",
    )
  ) {
    return true;
  }
  if (!managerUserStaffIds) return false;
  for (const id of managerUserStaffIds) {
    if (id === staffId) return true;
  }
  return false;
}

/**
 * Assignee untuk skor tiket:
 * - Staf biasa → tiket yang dia handle (personal)
 * - Manager → tiket yang di-handle anak buah / IT Staff di departemen yang sama (tim)
 */
export function assigneeIdsForTicketScore(opts: {
  staffId: string;
  agents: Agent[];
  staff: StaffMember[];
  itTeam: ItMember[];
  managerUserStaffIds?: Iterable<string> | null;
}): { assigneeIds: string[]; scope: TicketScoreScope } {
  const { staffId, agents, staff, itTeam, managerUserStaffIds } = opts;
  const personal = agentIdsForStaff(agents, staffId);
  const isManager = isManagerForTicketScore(
    staffId,
    itTeam,
    managerUserStaffIds,
  );
  if (!isManager) {
    return { assigneeIds: personal, scope: "personal" };
  }

  const me = staff.find((s) => s.id === staffId);
  const deptId = me?.departmentId;
  if (!deptId) {
    return { assigneeIds: personal, scope: "personal" };
  }

  const managerStaffSet = new Set<string>();
  for (const m of itTeam) {
    if (m.active && m.type === "it_manager") managerStaffSet.add(m.staffId);
  }
  if (managerUserStaffIds) {
    for (const id of managerUserStaffIds) managerStaffSet.add(id);
  }
  managerStaffSet.add(staffId);

  // Utama: IT Staff aktif di dept yang sama
  const itStaffIds = itTeam
    .filter((m) => m.active && m.type === "it_staff")
    .map((m) => m.staffId)
    .filter((sid) => {
      const s = staff.find((x) => x.id === sid);
      return s?.departmentId === deptId && s.active;
    });

  let teamAgentIds = [
    ...new Set(itStaffIds.flatMap((sid) => agentIdsForStaff(agents, sid))),
  ];

  // Fallback: semua agent di dept kecuali manager sendiri
  if (teamAgentIds.length === 0) {
    const personalSet = new Set(personal);
    teamAgentIds = agents
      .filter((a) => {
        if (personalSet.has(a.id)) return false;
        const s = staff.find((x) => x.id === a.staffId);
        return Boolean(s && s.active && s.departmentId === deptId);
      })
      .map((a) => a.id);
  }

  if (teamAgentIds.length === 0) {
    return { assigneeIds: personal, scope: "personal" };
  }
  return { assigneeIds: teamAgentIds, scope: "team" };
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
