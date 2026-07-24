"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATUS_LABEL,
} from "@/lib/sla";
import type {
  Agent,
  KpiFunction,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/lib/types";

export function WorkOrderDetailClient({
  workOrder: initial,
  functions,
  agents,
  canAssign = false,
  actorName,
}: {
  workOrder: WorkOrder;
  functions: KpiFunction[];
  agents: Agent[];
  canAssign?: boolean;
  actorName?: string;
}) {
  const router = useRouter();
  const [wo, setWo] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [resultNotes, setResultNotes] = useState(initial.resultNotes ?? "");

  const fn = functions.find((f) => f.id === wo.kpiFunctionId);
  const assignee = agents.find((a) => a.id === wo.assigneeId);

  const timeline = useMemo(
    () =>
      [...wo.events].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [wo.events],
  );

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/work-orders/${wo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan");
      return;
    }
    setWo(data.workOrder);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="panel space-y-5 p-4 sm:p-5 md:p-6">
        <div>
          <p className="mono text-xs text-brand">{wo.code}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {wo.title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Dari {wo.requesterName}
            {fn ? ` · ${fn.name} (${fn.weightPercent}%)` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-deep">
              {WORK_ORDER_STATUS_LABEL[wo.status]}
            </span>
            <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
              {WORK_ORDER_PRIORITY_LABEL[wo.priority]}
            </span>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {wo.description || "Tidak ada detail."}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bg-elevated px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Handler
            </p>
            <p className="mt-1 text-sm font-medium">
              {assignee?.name ?? "Belum di-assign"}
            </p>
          </div>
          <div className="rounded-xl bg-bg-elevated px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Target
            </p>
            <p className="mt-1 text-sm font-medium">
              {wo.dueDate
                ? new Date(wo.dueDate).toLocaleDateString("id-ID")
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-bg-elevated px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Dibuat
            </p>
            <p className="mt-1 text-sm font-medium">
              {new Date(wo.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {canAssign ? (
          <div className="space-y-3 rounded-xl border border-line p-4">
            <h2 className="font-semibold">Proses pekerjaan</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Status</span>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={wo.status}
                  disabled={saving}
                  onChange={(e) =>
                    patch({ status: e.target.value as WorkOrderStatus })
                  }
                >
                  {(Object.keys(WORK_ORDER_STATUS_LABEL) as WorkOrderStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {WORK_ORDER_STATUS_LABEL[s]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Assign ke</span>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={wo.assigneeId ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    patch({ assigneeId: e.target.value || null })
                  }
                >
                  <option value="">Belum di-assign</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Prioritas</span>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={wo.priority}
                  disabled={saving}
                  onChange={(e) =>
                    patch({ priority: e.target.value as WorkOrderPriority })
                  }
                >
                  {(
                    Object.keys(WORK_ORDER_PRIORITY_LABEL) as WorkOrderPriority[]
                  ).map((p) => (
                    <option key={p} value={p}>
                      {WORK_ORDER_PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Target selesai</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={wo.dueDate ? wo.dueDate.slice(0, 10) : ""}
                  disabled={saving}
                  onChange={(e) =>
                    patch({ dueDate: e.target.value || null })
                  }
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Hasil / catatan selesai</span>
              <textarea
                rows={3}
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="Ringkasan hasil pekerjaan..."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {wo.status === "open" ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => patch({ status: "in_progress" })}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Mulai kerjakan
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => patch({ resultNotes })}
                className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-60"
              >
                Simpan catatan
              </button>
              <button
                type="button"
                disabled={saving || wo.status === "done"}
                onClick={() =>
                  patch({ status: "done", resultNotes: resultNotes || undefined })
                }
                className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Tandai selesai
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="font-semibold">Komentar</h2>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
            placeholder="Update progress..."
          />
          <button
            type="button"
            disabled={saving || !comment.trim()}
            onClick={async () => {
              await patch({ comment: comment.trim() });
              setComment("");
            }}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Kirim komentar
          </button>
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="font-semibold">Timeline</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Riwayat perintah & proses{actorName ? ` · ${actorName}` : ""}
        </p>
        <div className="mt-4 space-y-3">
          {timeline.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border border-line px-3 py-2.5"
            >
              <p className="text-sm">{ev.message}</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {new Date(ev.at).toLocaleString("id-ID")}
                {ev.actorName ? ` · ${ev.actorName}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
