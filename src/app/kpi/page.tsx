import Link from "next/link";
import {
  formatHours,
  formatPercent,
  formatScore,
  StatCard,
} from "@/components/StatCard";
import { PriorityBadge } from "@/components/Badges";
import { canManageMaster } from "@/lib/auth";
import { computeKpi } from "@/lib/kpi";
import { requireUser } from "@/lib/session";
import {
  formatSlaTarget,
  PRIORITY_LABEL,
  PRIORITY_OPTIONS,
} from "@/lib/sla";
import { listAgents, listDepartments, listKpiFunctions, readData } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function KpiPage() {
  const user = await requireUser(["admin", "manager", "it_staff"]);
  const data = readData();
  const agents = listAgents();
  const kpi = computeKpi(data.tickets, agents);
  const itDept = listDepartments(true).find((d) => d.code === "IT");
  const functions = listKpiFunctions(true, itDept?.id);
  const weightTotal = functions.reduce((sum, f) => sum + f.weightPercent, 0);

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          SJS — KPI IT Systems
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          KPI dari data tiket
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Angka di halaman ini dihitung otomatis dari antrian helpdesk — cocok
          untuk mengisi kerangka spreadsheet KPI IT Staff & IT Manager.
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-semibold">Fungsi KPI IT</h2>
            <p className="text-xs text-ink-muted">
              Kerangka bobot penilaian · total aktif{" "}
              {weightTotal.toFixed(weightTotal % 1 ? 1 : 0)}%
            </p>
          </div>
          {canManageMaster(user.role) ? (
            <Link
              href="/master/kpi-functions"
              className="text-sm text-brand hover:underline"
            >
              Kelola master fungsi →
            </Link>
          ) : null}
        </div>

        <div className="border-b border-line bg-bg-elevated/50 px-4 py-2.5 text-sm">
          <span className="text-ink-muted">KPI dept lain: </span>
          <Link
            href="/kpi/departments"
            className="font-medium text-brand hover:underline"
          >
            KPI Departemen
          </Link>
          <span className="text-ink-muted"> · </span>
          <Link href="/kpi/reports" className="font-medium text-brand hover:underline">
            Report KPI
          </Link>
          <span className="text-ink-muted"> · Proses kerja IT: </span>
          <Link href="/work-orders" className="font-medium text-brand hover:underline">
            Antrian Tugas
          </Link>
          <span className="text-ink-muted"> · </span>
          <Link href="/work-orders/new" className="font-medium text-brand hover:underline">
            Beri Perintah
          </Link>
        </div>

        {functions.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink-muted">
            Belum ada fungsi KPI aktif. Tambahkan lewat Master Fungsi KPI.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-elevated/70 text-xs tracking-wide text-ink-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Fungsi</th>
                  <th className="w-24 px-4 py-2.5 font-medium">Bobot</th>
                  <th className="px-4 py-2.5 font-medium">Fokus</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{f.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-deep">
                        {f.weightPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {f.focus || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ticket Resolution Time"
          value={formatHours(kpi.avgResolutionHours)}
          hint="Rata-rata lama selesai"
          tone="brand"
        />
        <StatCard
          label="Tiket tepat SLA"
          value={formatPercent(kpi.slaCompliancePercent, 1)}
          hint="Target > 95%"
          tone={(kpi.slaCompliancePercent ?? 0) >= 95 ? "ok" : "warn"}
        />
        <StatCard
          label="Repeat Issue Rate"
          value={formatPercent(kpi.repeatIssueRate, 1)}
          hint="Target < 5%"
          tone={(kpi.repeatIssueRate ?? 100) <= 5 ? "ok" : "danger"}
        />
        <StatCard
          label="User Satisfaction"
          value={formatScore(kpi.avgSatisfaction)}
          hint="Target > 4,5"
          tone={(kpi.avgSatisfaction ?? 0) >= 4.5 ? "ok" : "warn"}
        />
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">SLA per prioritas</h2>
          <p className="text-xs text-ink-muted">
            Critical–Low (jam) · 2–4 hari · 1–4 minggu
          </p>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-5">
          {PRIORITY_OPTIONS.map((priority) => {
            const row = kpi.byPriority[priority];
            const pct =
              row.total > 0 ? (row.withinSla / row.total) * 100 : null;
            return (
              <div
                key={priority}
                className="border-b border-line p-4 md:border-r last:border-r-0"
              >
                <PriorityBadge priority={priority} />
                <p className="mt-3 text-2xl font-semibold">
                  {formatPercent(pct, 0)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {row.withinSla}/{row.total} tepat waktu
                </p>
                <p className="mono mt-2 text-xs text-ink-muted">
                  avg {formatHours(row.avgHours)} / target{" "}
                  {formatSlaTarget(priority)}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {PRIORITY_LABEL[priority]}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="font-semibold">Aging antrian (breach risk)</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Tiket terbuka yang sudah lama / melewati SLA
          </p>
          <div className="mt-4 space-y-2">
            {kpi.queueAging.length === 0 ? (
              <p className="text-sm text-ink-muted">Tidak ada tiket aktif.</p>
            ) : (
              kpi.queueAging.slice(0, 8).map((q) => (
                <Link
                  key={q.ticketId}
                  href={`/tickets/${q.ticketId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-brand-soft/40"
                >
                  <div className="min-w-0">
                    <p className="mono text-[11px] text-brand">{q.code}</p>
                    <p className="truncate text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-ink-muted">
                      {q.assigneeName ?? "Belum di-assign"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-sm font-semibold">
                      {formatHours(q.hoursOpen)}
                    </p>
                    <p
                      className={`text-xs font-medium ${q.breached ? "text-danger" : "text-ok"}`}
                    >
                      {q.breached ? "BREACH" : "OK"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="font-semibold">Ringkasan untuk appraisal</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">IT Operation / Support:</strong>{" "}
              Resolution Time, SLA compliance, aging antrian dari helpdesk.
            </li>
            <li>
              <strong className="text-ink">IT Project:</strong> Progress project
              ERP/CRM/aplikasi — sumber data terpisah, bobot di master fungsi.
            </li>
            <li>
              <strong className="text-ink">Improvement & Innovation:</strong>{" "}
              Otomasi, efisiensi, digitalisasi — dilengkapi bukti di luar
              antrian tiket.
            </li>
            <li>
              <strong className="text-ink">Security & Governance:</strong>{" "}
              Backup, audit, kepatuhan — monitoring & kebijakan IT.
            </li>
          </ul>
          <div className="mt-5 rounded-xl bg-brand-deep p-4 text-white">
            <p className="text-xs tracking-wide text-white/70 uppercase">
              Catatan
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              Metrik helpdesk mendukung fungsi Operation/Support. Uptime,
              project completion, inovasi, dan audit masih perlu sumber data
              terpisah — bobot fungsi diatur di Master Fungsi KPI.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
