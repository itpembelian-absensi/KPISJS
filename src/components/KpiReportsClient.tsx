"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatHours,
  formatPercent,
  formatScore,
  StatCard,
} from "@/components/StatCard";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import { SlaTargetHint } from "@/components/SlaTargetHint";
import { computeKpi } from "@/lib/kpi";
import {
  buildReportPeriodOptions,
  filterTicketsByMonth,
  formatReportMonth,
} from "@/lib/report-period";
import { CATEGORY_LABEL } from "@/lib/sla";
import type { Agent, Department, StaffMember, Ticket } from "@/lib/types";

type Tab = "kpi" | "repeat";

function filterByDepartment<T extends Ticket>(
  tickets: T[],
  departmentId: string,
  departments: Department[],
  staff: StaffMember[],
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

export function KpiReportsClient({
  initialPeriod,
  periodsFromData,
  departments,
  staff,
  agents,
  tickets,
}: {
  initialPeriod: string;
  periodsFromData: string[];
  departments: Department[];
  staff: StaffMember[];
  agents: Agent[];
  tickets: Array<Ticket & { relatedCode?: string | null }>;
}) {
  const [tab, setTab] = useState<Tab>("kpi");
  const [period, setPeriod] = useState(initialPeriod);
  const [departmentId, setDepartmentId] = useState("all");

  const periodOptions = useMemo(
    () => buildReportPeriodOptions(periodsFromData),
    [periodsFromData],
  );

  const filteredTickets = useMemo(() => {
    const byPeriod = filterTicketsByMonth(tickets, period);
    return filterByDepartment(byPeriod, departmentId, departments, staff);
  }, [tickets, period, departmentId, departments, staff]);

  const kpi = useMemo(
    () => computeKpi(filteredTickets, agents),
    [filteredTickets, agents],
  );

  const repeats = useMemo(
    () => filteredTickets.filter((t) => t.isRepeat),
    [filteredTickets],
  );

  const periodLabel =
    period === "all" ? "Semua periode" : formatReportMonth(period);
  const departmentLabel =
    departmentId === "all"
      ? "Semua departemen"
      : (() => {
          const d = departments.find((x) => x.id === departmentId);
          return d ? `${d.code} — ${d.name}` : "Departemen";
        })();

  const exportHref = (type: "kpi" | "repeat") => {
    const params = new URLSearchParams({
      type,
      period,
      departmentId,
    });
    return `/api/kpi/reports/export?${params.toString()}`;
  };

  const handlers = useMemo(
    () => kpi.byAgent.filter((a) => a.assigned > 0 || a.resolved > 0),
    [kpi.byAgent],
  );

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Periode</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Semua periode</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {formatReportMonth(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen pemohon</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="all">Semua departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:justify-end">
          <a
            href={exportHref("kpi")}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
          >
            Export Excel KPI
          </a>
          <a
            href={exportHref("repeat")}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium"
          >
            Export Excel Repeat
          </a>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex gap-1 border-b border-line px-2 pt-2">
          {(
            [
              { id: "kpi", label: "Report KPI" },
              {
                id: "repeat",
                label: `Masalah berulang (${repeats.length})`,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-brand-soft text-brand-deep"
                  : "text-ink-muted hover:bg-bg-elevated"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "kpi" ? (
          <div className="space-y-4 p-4">
            <p className="text-sm text-ink-muted">
              Ringkasan KPI helpdesk untuk{" "}
              <strong>{periodLabel}</strong> ·{" "}
              <strong>{departmentLabel}</strong> · {filteredTickets.length}{" "}
              tiket
            </p>
            <SlaTargetHint />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Ticket Resolution Time"
                value={formatHours(kpi.avgResolutionHours)}
                hint="Rata-rata jam penyelesaian"
              />
              <StatCard
                label="SLA Compliance"
                value={formatPercent(kpi.slaCompliancePercent, 1)}
                hint="Tiket selesai dalam target SLA"
                tone={
                  (kpi.slaCompliancePercent ?? 0) >= 90
                    ? "ok"
                    : (kpi.slaCompliancePercent ?? 0) >= 70
                      ? "warn"
                      : "danger"
                }
              />
              <StatCard
                label="Repeat Issue Rate"
                value={formatPercent(kpi.repeatIssueRate, 1)}
                hint="Proporsi tiket berulang"
                tone={(kpi.repeatIssueRate ?? 100) <= 5 ? "ok" : "danger"}
              />
              <StatCard
                label="User Satisfaction"
                value={formatScore(kpi.avgSatisfaction)}
                hint="Rata-rata nilai 1–5"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                    <th className="px-3 py-2.5 font-medium">Handler</th>
                    <th className="px-3 py-2.5 font-medium">Assigned</th>
                    <th className="px-3 py-2.5 font-medium">Selesai</th>
                    <th className="px-3 py-2.5 font-medium">Avg jam</th>
                    <th className="px-3 py-2.5 font-medium">SLA %</th>
                  </tr>
                </thead>
                <tbody>
                  {handlers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-ink-muted"
                      >
                        Belum ada data handler untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    handlers.map((a) => (
                      <tr key={a.agentId} className="border-b border-line">
                        <td className="px-3 py-2.5 font-medium">{a.name}</td>
                        <td className="px-3 py-2.5">{a.assigned}</td>
                        <td className="px-3 py-2.5">{a.resolved}</td>
                        <td className="px-3 py-2.5">
                          {formatHours(a.avgHours)}
                        </td>
                        <td className="px-3 py-2.5">
                          {formatPercent(a.withinSlaPercent, 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-muted">
              Periode = bulan tiket <strong>dibuat</strong>. SLA % = proporsi
              tiket <strong>selesai</strong> yang waktu penyelesaiannya ≤ target
              prioritas (bukan % assigned). 100% berarti semua tiket selesai
              handler itu masuk dalam SLA.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <p className="text-sm text-ink-muted">
              Daftar tiket yang terdeteksi{" "}
              <strong>repeat issue</strong> pada{" "}
              <strong>{periodLabel}</strong> ·{" "}
              <strong>{departmentLabel}</strong>. Berguna untuk analisis akar
              masalah yang mengulang.
            </p>

            {repeats.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">
                Tidak ada masalah berulang untuk filter ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                      <th className="px-3 py-2.5 font-medium">Tiket</th>
                      <th className="px-3 py-2.5 font-medium">Kategori</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Pemohon</th>
                      <th className="px-3 py-2.5 font-medium">Terkait</th>
                      <th className="px-3 py-2.5 font-medium">Akar masalah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repeats.map((t) => (
                      <tr key={t.id} className="border-b border-line">
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/tickets/${t.id}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {t.code}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {t.title}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <PriorityBadge priority={t.priority} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <CategoryBadge category={t.category} />
                          <p className="mt-1 text-[11px] text-ink-muted">
                            {CATEGORY_LABEL[t.category]}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{t.requesterName}</p>
                          <p className="text-xs text-ink-muted">
                            {t.requesterDept}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          {t.relatedTicketId ? (
                            <Link
                              href={`/tickets/${t.relatedTicketId}`}
                              className="text-brand hover:underline"
                            >
                              {t.relatedCode ?? "Lihat"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="max-w-[220px] px-3 py-2.5 text-xs text-ink-muted">
                          {t.rootCause || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
