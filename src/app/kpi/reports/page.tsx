import { KpiReportsClient } from "@/components/KpiReportsClient";
import { SlaTargetHint } from "@/components/SlaTargetHint";
import {
  buildReportPeriodOptions,
  currentReportMonth,
} from "@/lib/reports";
import { requireMenu } from "@/lib/session";
import {
  getTicket,
  listAgents,
  listDepartments,
  listStaff,
  listTickets,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function KpiReportsPage() {
  await requireMenu("/kpi/reports");

  const allTickets = listTickets();
  const periodsFromData = [
    ...new Set(
      allTickets
        .map((t) => (t.createdAt || "").slice(0, 7))
        .filter((p) => /^\d{4}-\d{2}$/.test(p)),
    ),
  ];
  const periodOptions = ["all", ...buildReportPeriodOptions(periodsFromData)];
  const initialPeriod = currentReportMonth();

  const tickets = allTickets.map((t) => ({
    ...t,
    relatedCode: t.relatedTicketId
      ? getTicket(t.relatedTicketId)?.code ?? null
      : null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Laporan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Report KPI &amp; Repeat Issue
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Ringkasan performa helpdesk per periode dan departemen pemohon, plus
          daftar masalah yang mengulang. Bisa diexport ke Excel.
        </p>
        <div className="mt-3 max-w-3xl">
          <SlaTargetHint />
        </div>
      </div>

      <KpiReportsClient
        initialPeriod={
          periodOptions.includes(initialPeriod) ? initialPeriod : "all"
        }
        periodsFromData={periodsFromData}
        departments={listDepartments(true)}
        staff={listStaff(true)}
        agents={listAgents()}
        tickets={tickets}
      />
    </div>
  );
}
