import { computeKpi } from "./kpi";
import {
  filterTicketsByMonth,
  formatReportMonth,
} from "./report-period";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "./sla";
import { listAgents, listDepartments, listStaff, listTickets } from "./store";
import type { Agent, Department, KpiSummary, StaffMember, Ticket } from "./types";

export {
  buildReportPeriodOptions,
  currentReportMonth,
  filterTicketsByMonth,
  formatReportMonth,
  monthsForYear,
} from "./report-period";

/** Filter tiket berdasarkan departemen pemohon */
export function filterTicketsByRequesterDepartment(
  tickets: Ticket[],
  departmentId: string | "all",
  departments: Department[] = listDepartments(true),
  staff: StaffMember[] = listStaff(true),
): Ticket[] {
  if (!departmentId || departmentId === "all") return tickets;
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept) return [];
  const staffIds = new Set(
    staff.filter((s) => s.departmentId === departmentId).map((s) => s.id),
  );
  return tickets.filter((t) => {
    if (t.requesterStaffId && staffIds.has(t.requesterStaffId)) return true;
    return (
      t.requesterDept === dept.name ||
      t.requesterDept === `${dept.code} — ${dept.name}` ||
      t.requesterDept.toLowerCase() === dept.name.toLowerCase()
    );
  });
}

export function listRepeatTickets(
  periodYm: string | "all" = "all",
  departmentId: string | "all" = "all",
): Ticket[] {
  const tickets = filterTicketsByRequesterDepartment(
    filterTicketsByMonth(listTickets(), periodYm),
    departmentId,
  );
  return tickets.filter((t) => t.isRepeat);
}

export type KpiReportBundle = {
  periodLabel: string;
  periodYm: string | "all";
  departmentId: string | "all";
  departmentLabel: string;
  ticketCount: number;
  kpi: KpiSummary;
  agents: Agent[];
  repeatTickets: Ticket[];
};

export function buildKpiReport(
  periodYm: string | "all" = "all",
  departmentId: string | "all" = "all",
): KpiReportBundle {
  const agents = listAgents();
  const departments = listDepartments(true);
  const dept =
    departmentId !== "all"
      ? departments.find((d) => d.id === departmentId)
      : null;
  const tickets = filterTicketsByRequesterDepartment(
    filterTicketsByMonth(listTickets(), periodYm),
    departmentId,
    departments,
  );
  return {
    periodYm,
    departmentId,
    departmentLabel: dept
      ? `${dept.code} — ${dept.name}`
      : "Semua departemen",
    periodLabel:
      periodYm === "all" ? "Semua periode" : formatReportMonth(periodYm),
    ticketCount: tickets.length,
    kpi: computeKpi(tickets, agents),
    agents,
    repeatTickets: tickets.filter((t) => t.isRepeat),
  };
}

export function kpiSummarySheetRows(bundle: KpiReportBundle) {
  const { kpi, periodLabel, departmentLabel } = bundle;
  return [
    ["Laporan KPI Helpdesk", periodLabel],
    ["Departemen pemohon", departmentLabel],
    [],
    ["Metrik", "Nilai"],
    ["Total tiket", kpi.totalTickets],
    ["Tiket terbuka", kpi.openTickets],
    ["Tiket selesai", kpi.resolvedTickets],
    [
      "Rata-rata waktu penyelesaian (jam)",
      kpi.avgResolutionHours != null
        ? Math.round(kpi.avgResolutionHours * 10) / 10
        : "—",
    ],
    [
      "SLA compliance (%)",
      kpi.slaCompliancePercent != null
        ? Math.round(kpi.slaCompliancePercent * 10) / 10
        : "—",
    ],
    [
      "Repeat issue rate (%)",
      kpi.repeatIssueRate != null
        ? Math.round(kpi.repeatIssueRate * 10) / 10
        : "—",
    ],
    [
      "Rata-rata kepuasan (1–5)",
      kpi.avgSatisfaction != null
        ? Math.round(kpi.avgSatisfaction * 10) / 10
        : "—",
    ],
  ];
}

export function kpiByAgentSheetRows(bundle: KpiReportBundle) {
  return [
    ["Handler", "Assigned", "Selesai", "Avg jam", "SLA %"],
    ...bundle.kpi.byAgent.map((a) => [
      a.name,
      a.assigned,
      a.resolved,
      a.avgHours != null ? Math.round(a.avgHours * 10) / 10 : "—",
      a.withinSlaPercent != null
        ? Math.round(a.withinSlaPercent * 10) / 10
        : "—",
    ]),
  ];
}

export function repeatIssueSheetRows(tickets: Ticket[], allTickets: Ticket[]) {
  const byId = new Map(allTickets.map((t) => [t.id, t]));
  return [
    [
      "Kode",
      "Judul",
      "Kategori",
      "Prioritas",
      "Status",
      "Pemohon",
      "Departemen",
      "Dibuat",
      "Tiket terkait",
      "Akar masalah",
    ],
    ...tickets.map((t) => {
      const related = t.relatedTicketId
        ? byId.get(t.relatedTicketId)
        : undefined;
      return [
        t.code,
        t.title,
        CATEGORY_LABEL[t.category] ?? t.category,
        PRIORITY_LABEL[t.priority] ?? t.priority,
        STATUS_LABEL[t.status] ?? t.status,
        t.requesterName,
        t.requesterDept,
        t.createdAt,
        related?.code ?? t.relatedTicketId ?? "",
        t.rootCause ?? "",
      ];
    }),
  ];
}
