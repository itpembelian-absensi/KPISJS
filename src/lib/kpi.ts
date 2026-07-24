import { hoursBetween, isWithinSla } from "./sla";
import type {
  Agent,
  AppData,
  KpiSummary,
  Ticket,
  TicketPriority,
} from "./types";

const PRIORITIES: TicketPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
  "day2",
  "day4",
  "week1",
  "week2",
  "week3",
  "week4",
];

export function computeKpi(
  tickets: Ticket[],
  agents: Agent[],
  now = new Date().toISOString(),
): KpiSummary {
  const resolved = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  );
  const open = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress" || t.status === "pending",
  );

  const resolutionHours = resolved
    .filter((t) => t.resolvedAt)
    .map((t) => hoursBetween(t.createdAt, t.resolvedAt!));

  const avgResolutionHours =
    resolutionHours.length > 0
      ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
      : null;

  const slaChecked = resolved.filter((t) => t.resolvedAt);
  const withinSla = slaChecked.filter((t) =>
    isWithinSla(t.priority, t.createdAt, t.resolvedAt),
  );
  const slaCompliancePercent =
    slaChecked.length > 0
      ? (withinSla.length / slaChecked.length) * 100
      : null;

  const repeatIssueRate =
    tickets.length > 0
      ? (tickets.filter((t) => t.isRepeat).length / tickets.length) * 100
      : null;

  const rated = tickets.filter((t) => t.satisfaction != null);
  const avgSatisfaction =
    rated.length > 0
      ? rated.reduce((a, t) => a + (t.satisfaction ?? 0), 0) / rated.length
      : null;

  const byPriority = Object.fromEntries(
    PRIORITIES.map((priority) => {
      const group = resolved.filter((t) => t.priority === priority && t.resolvedAt);
      const hours = group.map((t) => hoursBetween(t.createdAt, t.resolvedAt!));
      const within = group.filter((t) =>
        isWithinSla(t.priority, t.createdAt, t.resolvedAt),
      );
      return [
        priority,
        {
          total: group.length,
          withinSla: within.length,
          avgHours:
            hours.length > 0
              ? hours.reduce((a, b) => a + b, 0) / hours.length
              : null,
        },
      ];
    }),
  ) as KpiSummary["byPriority"];

  const byAgent = agents.map((agent) => {
    const assigned = tickets.filter((t) => t.assigneeId === agent.id);
    const agentResolved = assigned.filter(
      (t) => (t.status === "resolved" || t.status === "closed") && t.resolvedAt,
    );
    const hours = agentResolved.map((t) =>
      hoursBetween(t.createdAt, t.resolvedAt!),
    );
    const within = agentResolved.filter((t) =>
      isWithinSla(t.priority, t.createdAt, t.resolvedAt),
    );
    return {
      agentId: agent.id,
      name: agent.name,
      assigned: assigned.length,
      resolved: agentResolved.length,
      avgHours:
        hours.length > 0
          ? hours.reduce((a, b) => a + b, 0) / hours.length
          : null,
      withinSlaPercent:
        agentResolved.length > 0
          ? (within.length / agentResolved.length) * 100
          : null,
    };
  });

  const queueAging = open
    .map((t) => {
      const agent = agents.find((a) => a.id === t.assigneeId);
      const hoursOpen = hoursBetween(t.createdAt, now);
      return {
        ticketId: t.id,
        code: t.code,
        title: t.title,
        priority: t.priority,
        hoursOpen,
        assigneeName: agent?.name ?? null,
        breached: !isWithinSla(t.priority, t.createdAt, null, now),
      };
    })
    .sort((a, b) => b.hoursOpen - a.hoursOpen);

  return {
    totalTickets: tickets.length,
    openTickets: open.length,
    resolvedTickets: resolved.length,
    avgResolutionHours,
    slaCompliancePercent,
    repeatIssueRate,
    avgSatisfaction,
    byPriority,
    byAgent,
    queueAging,
  };
}

export function detectRepeat(
  tickets: Ticket[],
  category: Ticket["category"],
  title: string,
  requesterName: string,
): { isRepeat: boolean; relatedTicketId: string | null } {
  const normalized = title.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 3);
  const candidates = tickets.filter(
    (t) =>
      t.category === category &&
      (t.requesterName.toLowerCase() === requesterName.toLowerCase() ||
        words.some((w) => t.title.toLowerCase().includes(w))),
  );

  const recent = candidates
    .filter((t) => {
      const days =
        (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (recent.length === 0) {
    return { isRepeat: false, relatedTicketId: null };
  }
  return { isRepeat: true, relatedTicketId: recent[0].id };
}

export function emptyData(): AppData {
  return {
    departments: [],
    staff: [],
    itTeam: [],
    users: [],
    sessions: [],
    tickets: [],
    nextTicketNumber: 1,
  };
}
