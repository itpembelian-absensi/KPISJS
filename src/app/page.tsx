import Link from "next/link";
import { TicketRow } from "@/components/TicketRow";
import {
  formatHours,
  formatPercent,
  formatScore,
  StatCard,
} from "@/components/StatCard";
import { canViewAllTickets, canViewKpi } from "@/lib/auth";
import { computeKpi } from "@/lib/kpi";
import { requireUser } from "@/lib/session";
import { listAgents, listTickets, readData } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = readData();
  const agents = listAgents();
  const ownOnly = !canViewAllTickets(user.role);
  const scopedTickets = ownOnly
    ? data.tickets.filter((t) => t.requesterStaffId === user.staffId)
    : data.tickets;
  const kpi = computeKpi(scopedTickets, agents);
  const queue = listTickets({
    status: "active",
    requesterStaffId: ownOnly ? user.staffId ?? undefined : undefined,
  }).slice(0, 6);
  const unassigned = scopedTickets.filter(
    (t) =>
      !t.assigneeId && ["open", "in_progress", "pending"].includes(t.status),
  ).length;
  const breached = kpi.queueAging.filter((q) => q.breached).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-sm tracking-wide text-brand"
            style={{ fontFamily: "var(--font-accent), serif" }}
          >
            Halo, {user.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard IT Support
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Role: {ROLE_LABEL[user.role]}
            {user.departmentName ? ` · ${user.departmentName}` : ""}.{" "}
            {ownOnly
              ? "Anda melihat tiket milik sendiri."
              : "Pantau antrian, handler, SLA, dan repeat issue."}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-deep sm:w-auto sm:py-2.5"
        >
          + Buat tiket
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tiket aktif"
          value={String(kpi.openTickets)}
          hint={
            ownOnly ? "Tiket Anda yang masih terbuka" : `${unassigned} belum di-assign`
          }
          tone="brand"
        />
        <StatCard
          label="Rata-rata selesai"
          value={formatHours(kpi.avgResolutionHours)}
          hint="Ticket Resolution Time"
        />
        {canViewKpi(user.role) ? (
          <>
            <StatCard
              label="SLA compliance"
              value={formatPercent(kpi.slaCompliancePercent, 0)}
              hint="Target > 95%"
              tone={
                (kpi.slaCompliancePercent ?? 0) >= 95
                  ? "ok"
                  : (kpi.slaCompliancePercent ?? 0) >= 80
                    ? "warn"
                    : "danger"
              }
            />
            <StatCard
              label="Repeat issue rate"
              value={formatPercent(kpi.repeatIssueRate, 0)}
              hint="Target < 5%"
              tone={
                (kpi.repeatIssueRate ?? 0) <= 5
                  ? "ok"
                  : (kpi.repeatIssueRate ?? 0) <= 15
                    ? "warn"
                    : "danger"
              }
            />
          </>
        ) : (
          <>
            <StatCard
              label="Tiket selesai"
              value={String(kpi.resolvedTickets)}
              hint={`dari ${kpi.totalTickets} tiket Anda`}
            />
            <StatCard
              label="Satisfaction"
              value={formatScore(kpi.avgSatisfaction)}
              hint="Rata-rata rating Anda"
            />
          </>
        )}
      </div>

      {canViewKpi(user.role) ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="User satisfaction"
            value={formatScore(kpi.avgSatisfaction)}
            hint="Skala 1–5 · target > 4,5"
          />
          <StatCard
            label="Tiket selesai"
            value={String(kpi.resolvedTickets)}
            hint={`dari ${kpi.totalTickets} total`}
          />
          <StatCard
            label="Antrian breach SLA"
            value={String(breached)}
            hint="Sedang terbuka & melewati target"
            tone={breached > 0 ? "danger" : "ok"}
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="font-semibold">
                {ownOnly ? "Tiket Anda" : "Antrian aktif"}
              </h2>
              <p className="text-xs text-ink-muted">
                Siapa handle & berapa lama sudah berjalan
              </p>
            </div>
            <Link href="/tickets" className="text-sm text-brand hover:underline">
              Lihat semua
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted">Antrian kosong.</p>
          ) : (
            queue.map((t) => (
              <TicketRow key={t.id} ticket={t} agents={agents} />
            ))
          )}
        </section>

        {canViewAllTickets(user.role) ? (
          <section className="panel p-4">
            <h2 className="font-semibold">Performa handler</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Beban kerja & kepatuhan SLA per orang
            </p>
            <div className="mt-4 space-y-3">
              {kpi.byAgent.map((a) => (
                <div
                  key={a.agentId}
                  className="rounded-xl border border-line bg-bg/60 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.name}</p>
                    <p className="mono text-xs text-ink-muted">
                      {a.resolved}/{a.assigned} selesai
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
                    <span>Avg {formatHours(a.avgHours)}</span>
                    <span>SLA {formatPercent(a.withinSlaPercent, 0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/kpi"
              className="mt-4 inline-block text-sm text-brand hover:underline"
            >
              Buka halaman KPI lengkap →
            </Link>
          </section>
        ) : (
          <section className="panel p-4">
            <h2 className="font-semibold">Bantuan cepat</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Buat tiket untuk masalah printer, email, jaringan, akses ERP, dan
              lainnya. Tim IT akan assign handler dan menyelesaikan sesuai SLA.
            </p>
            <Link
              href="/tickets/new"
              className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Buat tiket baru
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
