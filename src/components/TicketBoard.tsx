"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TicketRow } from "@/components/TicketRow";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import {
  formatDuration,
  hoursBetween,
  PRIORITY_LABEL,
  slaDeadline,
} from "@/lib/sla";
import type { Agent, Ticket } from "@/lib/types";

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type BoardTab = "queue" | "working" | "done";
type PriorityTab = "all" | "high" | "medium" | "low";

const TABS: {
  id: BoardTab;
  label: string;
  hint: string;
  emptyText: string;
}[] = [
  {
    id: "queue",
    label: "Antrian",
    hint: "Status open — menunggu diambil",
    emptyText: "Antrian kosong.",
  },
  {
    id: "working",
    label: "Sedang dikerjakan",
    hint: "In progress & menunggu sparepart/info",
    emptyText: "Tidak ada tiket aktif dikerjakan.",
  },
  {
    id: "done",
    label: "Sudah selesai",
    hint: "Resolved & closed",
    emptyText: "Belum ada tiket selesai.",
  },
];

const PRIORITY_TABS: { id: PriorityTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

function matchesPriorityTab(priority: Ticket["priority"], tab: PriorityTab) {
  if (tab === "all") return true;
  // Critical digabung ke High agar tetap terlihat di sub-tab
  if (tab === "high") return priority === "high" || priority === "critical";
  return priority === tab;
}

function WorkSchedule({
  tickets,
  agents,
  canEdit,
  onUpdated,
}: {
  tickets: Ticket[];
  agents: Agent[];
  canEdit: boolean;
  onUpdated: (ticket: Ticket) => void;
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const aEnd = a.scheduledEnd || slaDeadline(a.createdAt, a.priority).toISOString();
      const bEnd = b.scheduledEnd || slaDeadline(b.createdAt, b.priority).toISOString();
      return new Date(aEnd).getTime() - new Date(bEnd).getTime();
    });
  }, [tickets]);

  async function saveSchedule(
    ticket: Ticket,
    scheduledStart: string | null,
    scheduledEnd: string | null,
  ) {
    setSavingId(ticket.id);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledStart, scheduledEnd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menyimpan jadwal");
        return;
      }
      onUpdated(data.ticket);
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <section className="panel p-5">
        <h2 className="font-semibold">Jadwal pengerjaan</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Belum ada tiket yang sedang dikerjakan.
        </p>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">Jadwal pengerjaan</h2>
        <p className="text-xs text-ink-muted">
          Target selesai mengikuti SLA, atau atur jadwal manual untuk tiket yang
          sedang dikerjakan / menunggu.
        </p>
      </div>

      <div className="divide-y divide-line">
        {rows.map((t) => {
          const agent = agents.find((a) => a.id === t.assigneeId);
          const slaEnd = slaDeadline(t.createdAt, t.priority);
          const planStart =
            t.scheduledStart || t.firstResponseAt || t.updatedAt || t.createdAt;
          const planEnd = t.scheduledEnd || slaEnd.toISOString();
          const remaining = hoursBetween(new Date().toISOString(), planEnd);
          const overdue = new Date(planEnd).getTime() < Date.now();

          return (
            <div key={t.id} className="grid gap-3 px-3 py-4 sm:px-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/tickets/${t.id}`} className="mono text-xs text-brand">
                    {t.code}
                  </Link>
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
                <p className="mt-1 font-medium">{t.title}</p>
                <p className="text-xs text-ink-muted">
                  Handler: {agent?.name ?? "Belum di-assign"} · SLA{" "}
                  {PRIORITY_LABEL[t.priority]} deadline{" "}
                  {slaEnd.toLocaleString("id-ID")}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className={`h-full rounded-full ${overdue ? "bg-danger" : "bg-brand"}`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          8,
                          (hoursBetween(planStart, new Date().toISOString()) /
                            Math.max(
                              0.1,
                              hoursBetween(planStart, planEnd),
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {overdue
                    ? `Terlambat ${formatDuration(hoursBetween(planEnd, new Date().toISOString()))}`
                    : `Sisa ${formatDuration(remaining)} menuju target`}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs text-ink-muted">Mulai dijadwalkan</span>
                  <input
                    type="datetime-local"
                    disabled={!canEdit || savingId === t.id}
                    defaultValue={toLocalInputValue(t.scheduledStart || planStart)}
                    key={`start-${t.id}-${t.scheduledStart ?? "x"}`}
                    onBlur={(e) => {
                      if (!canEdit) return;
                      const nextStart = fromLocalInputValue(e.target.value);
                      const nextEnd = t.scheduledEnd;
                      if (nextStart !== (t.scheduledStart || null)) {
                        saveSchedule(t, nextStart, nextEnd);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm disabled:opacity-60"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-ink-muted">Target selesai</span>
                  <input
                    type="datetime-local"
                    disabled={!canEdit || savingId === t.id}
                    defaultValue={toLocalInputValue(t.scheduledEnd || planEnd)}
                    key={`end-${t.id}-${t.scheduledEnd ?? "x"}`}
                    onBlur={(e) => {
                      if (!canEdit) return;
                      const nextEnd = fromLocalInputValue(e.target.value);
                      const nextStart = t.scheduledStart;
                      if (nextEnd !== (t.scheduledEnd || null)) {
                        saveSchedule(t, nextStart, nextEnd);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm disabled:opacity-60"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TicketBoard({
  tickets: initialTickets,
  agents,
  canDelete = false,
  canSchedule = false,
}: {
  tickets: Ticket[];
  agents: Agent[];
  canDelete?: boolean;
  canSchedule?: boolean;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [tab, setTab] = useState<BoardTab>("queue");
  const [priority, setPriority] = useState<PriorityTab>("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [q, setQ] = useState("");

  const baseFiltered = useMemo(() => {
    let list = [...tickets];
    if (assigneeId === "unassigned") list = list.filter((t) => !t.assigneeId);
    else if (assigneeId !== "all") {
      list = list.filter((t) => t.assigneeId === assigneeId);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((t) =>
        [t.code, t.title, t.requesterName, t.requesterDept, t.description]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  }, [tickets, assigneeId, q]);

  const queue = baseFiltered.filter((t) => t.status === "open");
  const working = baseFiltered.filter(
    (t) => t.status === "in_progress" || t.status === "pending",
  );
  const done = baseFiltered.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  );

  const counts: Record<BoardTab, number> = {
    queue: queue.length,
    working: working.length,
    done: done.length,
  };
  const lists: Record<BoardTab, Ticket[]> = {
    queue,
    working,
    done,
  };

  const activeTab = TABS.find((t) => t.id === tab)!;
  const statusList = lists[tab];
  const activeList = statusList.filter((t) =>
    matchesPriorityTab(t.priority, priority),
  );
  const workingForSchedule = working.filter((t) =>
    matchesPriorityTab(t.priority, priority),
  );

  const priorityCounts = PRIORITY_TABS.reduce(
    (acc, p) => {
      acc[p.id] = statusList.filter((t) =>
        matchesPriorityTab(t.priority, p.id),
      ).length;
      return acc;
    },
    {} as Record<PriorityTab, number>,
  );

  function onDeleted(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  function onUpdated(ticket: Ticket) {
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="panel grid gap-3 p-3 sm:p-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Handler</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-base sm:text-sm"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="unassigned">Belum di-assign</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Cari</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kode / judul / pemohon"
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-base sm:text-sm"
          />
        </label>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-1.5 pt-1.5 sm:px-3 sm:pt-2">
          <div
            className="flex gap-1 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(t.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2.5 text-xs transition sm:flex-none sm:justify-start sm:gap-2 sm:px-4 sm:text-sm ${
                    selected
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:bg-brand-soft hover:text-ink"
                  }`}
                >
                  <span className="truncate font-medium">{t.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium sm:px-2 sm:text-xs ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-bg text-ink-muted"
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-line bg-bg-elevated/60 px-3 py-2.5 sm:px-4">
          <p className="mb-2 text-xs text-ink-muted sm:mb-0 sm:hidden">
            {activeTab.hint}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-xs text-ink-muted sm:inline">
              {activeTab.hint}
            </span>
            <span className="hidden text-ink-muted sm:inline">·</span>
            <div className="grid w-full grid-cols-4 gap-1 sm:flex sm:w-auto sm:flex-wrap">
              {PRIORITY_TABS.map((p) => {
                const selected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`rounded-full px-2 py-1.5 text-center text-xs font-medium transition sm:px-3 sm:py-1 ${
                      selected
                        ? "bg-brand-deep text-white"
                        : "bg-surface text-ink-muted hover:bg-brand-soft hover:text-ink"
                    }`}
                  >
                    {p.label}
                    <span className="ml-1 opacity-75">{priorityCounts[p.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          {activeList.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">
              {priority === "all"
                ? activeTab.emptyText
                : `Tidak ada tiket prioritas ${PRIORITY_TABS.find((p) => p.id === priority)?.label}.`}
            </p>
          ) : (
            activeList.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                agents={agents}
                canDelete={canDelete}
                onDeleted={onDeleted}
              />
            ))
          )}
        </div>
      </section>

      {tab === "working" ? (
        <WorkSchedule
          tickets={workingForSchedule}
          agents={agents}
          canEdit={canSchedule}
          onUpdated={onUpdated}
        />
      ) : null}
    </div>
  );
}
