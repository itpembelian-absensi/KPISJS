"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATUS_LABEL,
} from "@/lib/sla";
import type { Agent, KpiFunction, WorkOrder } from "@/lib/types";

type BoardTab = "queue" | "working" | "done";

const TABS: { id: BoardTab; label: string; empty: string }[] = [
  { id: "queue", label: "Antrian", empty: "Tidak ada perintah menunggu." },
  {
    id: "working",
    label: "Sedang dikerjakan",
    empty: "Tidak ada tugas aktif.",
  },
  { id: "done", label: "Selesai", empty: "Belum ada tugas selesai." },
];

function currentMonthLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

/** Opsi periode: tahun lalu–depan + bulan dari data yang ada */
function buildWorkOrderPeriodOptions(items: WorkOrder[]): string[] {
  const y = new Date().getFullYear();
  const set = new Set<string>([
    ...monthsForYear(y - 1),
    ...monthsForYear(y),
    ...monthsForYear(y + 1),
  ]);
  for (const w of items) {
    const ym = (w.createdAt || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
  }
  return [...set].sort().reverse();
}

function formatMonthPeriod(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [ys, ms] = ym.split("-").map(Number);
  const dt = new Date(ys, ms - 1, 1);
  if (Number.isNaN(dt.getTime())) return ym;
  return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function StatusPill({ status }: { status: WorkOrder["status"] }) {
  const tone =
    status === "done"
      ? "bg-ok-soft text-ok"
      : status === "cancelled"
        ? "bg-line text-ink-muted"
        : status === "pending"
          ? "bg-warn-soft text-warn"
          : status === "in_progress"
            ? "bg-brand-soft text-brand-deep"
            : "bg-info-soft text-info";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {WORK_ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function PriorityPill({ priority }: { priority: WorkOrder["priority"] }) {
  const tone =
    priority === "high"
      ? "bg-danger-soft text-danger"
      : priority === "medium"
        ? "bg-warn-soft text-warn"
        : "bg-line text-ink-muted";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {WORK_ORDER_PRIORITY_LABEL[priority]}
    </span>
  );
}

export function WorkOrderBoard({
  workOrders: initial,
  functions,
  agents,
  canDelete = false,
}: {
  workOrders: WorkOrder[];
  functions: KpiFunction[];
  agents: Agent[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<BoardTab>("queue");
  const [functionId, setFunctionId] = useState("all");
  const [period, setPeriod] = useState(currentMonthLabel);
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fnMap = useMemo(() => {
    const m = new Map(functions.map((f) => [f.id, f]));
    return m;
  }, [functions]);

  const periodOptions = useMemo(
    () => buildWorkOrderPeriodOptions(items),
    [items],
  );

  const filtered = useMemo(() => {
    let list = [...items];
    if (functionId !== "all") {
      list = list.filter((w) => w.kpiFunctionId === functionId);
    }
    if (period !== "all") {
      list = list.filter((w) => (w.createdAt || "").slice(0, 7) === period);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((w) =>
        [w.code, w.title, w.requesterName, w.description, fnMap.get(w.kpiFunctionId)?.name]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  }, [items, functionId, period, q, fnMap]);

  const queue = filtered.filter((w) => w.status === "open");
  const working = filtered.filter(
    (w) => w.status === "in_progress" || w.status === "pending",
  );
  const done = filtered.filter(
    (w) => w.status === "done" || w.status === "cancelled",
  );

  const lists: Record<BoardTab, WorkOrder[]> = { queue, working, done };
  const counts: Record<BoardTab, number> = {
    queue: queue.length,
    working: working.length,
    done: done.length,
  };
  const activeList = lists[tab];
  const activeTab = TABS.find((t) => t.id === tab)!;

  async function handleDelete(id: string, code: string) {
    if (!window.confirm(`Hapus perintah ${code}?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus");
        return;
      }
      setItems((prev) => prev.filter((w) => w.id !== id));
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  async function startWork(id: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal memulai tugas");
        return;
      }
      setItems((prev) =>
        prev.map((w) => (w.id === id ? data.workOrder : w)),
      );
      setTab("working");
      router.refresh();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="panel grid gap-3 p-3 sm:p-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Fungsi KPI</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-base sm:text-sm"
            value={functionId}
            onChange={(e) => setFunctionId(e.target.value)}
          >
            <option value="all">Semua fungsi</option>
            {functions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Periode</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-base sm:text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Semua periode</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {formatMonthPeriod(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Cari</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kode / judul / pemberi"
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-base sm:text-sm"
          />
        </label>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-1.5 pt-1.5 sm:px-3 sm:pt-2">
          <div className="flex gap-1">
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2.5 text-xs transition sm:flex-none sm:px-4 sm:text-sm ${
                    selected
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:bg-brand-soft hover:text-ink"
                  }`}
                >
                  <span className="truncate font-medium">{t.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                      selected ? "bg-white/20 text-white" : "bg-bg text-ink-muted"
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-line bg-bg-elevated/60 px-3 py-2 text-xs text-ink-muted sm:px-4">
          {tab === "queue"
            ? "Klik “Mulai kerjakan” agar tugas pindah ke tab Sedang dikerjakan (belum selesai)."
            : tab === "working"
              ? "Tugas yang sedang diproses. Selesaikan lewat detail → Tandai selesai."
              : "Tugas yang sudah selesai atau dibatalkan."}
        </div>

        <div>
          {activeList.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">
              {activeTab.empty}
            </p>
          ) : (
            activeList.map((w) => {
              const agent = agents.find((a) => a.id === w.assigneeId);
              const fn = fnMap.get(w.kpiFunctionId);
              return (
                <div
                  key={w.id}
                  className="border-b border-line px-3 py-3.5 sm:px-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/work-orders/${w.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mono text-xs text-brand">{w.code}</span>
                        <StatusPill status={w.status} />
                        <PriorityPill priority={w.priority} />
                      </div>
                      <p className="mt-1.5 text-[15px] leading-snug font-semibold">
                        {w.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {fn?.name ?? "Fungsi"} · dari {w.requesterName}
                      </p>
                    </Link>
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={deleting === w.id}
                        onClick={() => handleDelete(w.id, w.code)}
                        className="shrink-0 rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-xs text-danger disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-bg-elevated px-3 py-2.5 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-wide text-ink-muted uppercase">
                        Handler
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium">
                        {agent?.name ?? (
                          <span className="text-accent">Belum assign</span>
                        )}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-wide text-ink-muted uppercase">
                        Target
                      </p>
                      <p className="mt-0.5 text-xs font-medium">
                        {w.dueDate
                          ? new Date(w.dueDate).toLocaleDateString("id-ID")
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                      {w.status === "open" ? (
                        <button
                          type="button"
                          disabled={updating === w.id}
                          onClick={() => startWork(w.id)}
                          className="flex w-full items-center justify-center rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          {updating === w.id ? "..." : "Mulai kerjakan"}
                        </button>
                      ) : null}
                      <Link
                        href={`/work-orders/${w.id}`}
                        className="flex w-full items-center justify-center rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-brand"
                      >
                        {w.status === "open" ? "Detail" : "Proses / detail"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
