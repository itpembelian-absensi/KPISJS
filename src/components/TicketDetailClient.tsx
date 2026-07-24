"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import {
  formatDuration,
  formatSlaTarget,
  hoursBetween,
  isWithinSla,
  PRIORITY_LABEL,
  PRIORITY_OPTIONS,
  STATUS_LABEL,
} from "@/lib/sla";
import type { Agent, Ticket } from "@/lib/types";

export function TicketDetailClient({
  ticket: initial,
  agents,
  related,
  canAssign = false,
  actorId = null,
}: {
  ticket: Ticket;
  agents: Agent[];
  related: Ticket | null;
  canAssign?: boolean;
  actorId?: string | null;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState(initial.resolution ?? "");
  const [rootCause, setRootCause] = useState(initial.rootCause ?? "");

  const end = ticket.resolvedAt ?? new Date().toISOString();
  const elapsed = hoursBetween(ticket.createdAt, end);
  const within = isWithinSla(ticket.priority, ticket.createdAt, ticket.resolvedAt);
  const assignee = agents.find((a) => a.id === ticket.assigneeId);

  const timeline = useMemo(
    () =>
      [...ticket.events].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [ticket.events],
  );

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        actorId: body.actorId ?? actorId ?? undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setTicket(data.ticket);
      router.refresh();
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Hapus tiket ${ticket.code}?\n\n"${ticket.title}"\n\nTindakan ini tidak bisa dibatalkan.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus tiket");
        return;
      }
      router.push("/tickets");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="panel p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mono text-xs text-brand">{ticket.code}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              {ticket.title}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {ticket.requesterName} · {ticket.requesterDept}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
            {ticket.isRepeat && (
              <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                Repeat Issue
              </span>
            )}
            {canAssign ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-0 w-full rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-2 text-xs font-medium text-danger disabled:opacity-50 sm:ml-1 sm:w-auto sm:py-1"
              >
                {deleting ? "Menghapus..." : "Hapus tiket"}
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {ticket.description || "Tidak ada deskripsi."}
        </p>

        {related ? (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft/50 px-4 py-3 text-sm">
            <p className="font-medium text-danger">Terkait tiket sebelumnya</p>
            <a href={`/tickets/${related.id}`} className="text-brand underline">
              {related.code} — {related.title}
            </a>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bg px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Handler
            </p>
            <p className="mt-1 font-medium">
              {assignee?.name ?? "Belum di-assign"}
            </p>
            <p className="text-xs text-ink-muted">{assignee?.role}</p>
          </div>
          <div className="rounded-xl bg-bg px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Lama penyelesaian
            </p>
            <p className="mono mt-1 text-lg font-semibold">
              {formatDuration(elapsed)}
            </p>
            <p className="text-xs text-ink-muted">
              Target SLA {formatSlaTarget(ticket.priority)} (
              {PRIORITY_LABEL[ticket.priority]})
            </p>
          </div>
          <div className="rounded-xl bg-bg px-3 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Status SLA
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${within ? "text-ok" : "text-danger"}`}
            >
              {within ? "Sesuai SLA" : "Melewati SLA"}
            </p>
            <p className="text-xs text-ink-muted">
              Dibuat {new Date(ticket.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {canAssign ? (
          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Update tiket
            </h2>
            <p className="text-xs text-ink-muted">
              Proses IT — assign, prioritas, status, dan resolusi. Penilaian
              kepuasan user ada di menu Nilai Hasil Kerja.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Assign handler</span>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={ticket.assigneeId ?? ""}
                  onChange={(e) =>
                    patch({
                      assigneeId: e.target.value || null,
                    })
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
                  value={ticket.priority}
                  onChange={(e) =>
                    patch({
                      priority: e.target.value,
                    })
                  }
                >
                  {PRIORITY_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {PRIORITY_LABEL[k]} · SLA {formatSlaTarget(k)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-ink-muted">
                  Bisa diturunkan/dinaikkan jika ada tiket lebih prioritas.
                </span>
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="text-xs text-ink-muted">Status</span>
                <select
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  value={ticket.status}
                  onChange={(e) =>
                    patch({
                      status: e.target.value,
                      resolution: resolution || undefined,
                      rootCause: rootCause || undefined,
                    })
                  }
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Root cause</span>
              <input
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                onBlur={() => {
                  if (rootCause !== (ticket.rootCause ?? "")) {
                    patch({ rootCause });
                  }
                }}
                placeholder="Akar masalah (penting untuk kurangi repeat issue)"
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Resolusi</span>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                onBlur={() => {
                  if (resolution !== (ticket.resolution ?? "")) {
                    patch({ resolution });
                  }
                }}
                rows={3}
                placeholder="Apa yang sudah dilakukan untuk menyelesaikan..."
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Catatan / komentar</span>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Update progress untuk timeline..."
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={saving || !comment.trim()}
                onClick={async () => {
                  await patch({
                    comment: comment.trim(),
                    actorId: ticket.assigneeId,
                  });
                  setComment("");
                }}
                className="self-end rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Tambah
              </button>
            </div>

            {saving ? (
              <p className="text-xs text-ink-muted">Menyimpan perubahan...</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Progres kerja
            </h2>
            <p className="text-xs text-ink-muted">
              Status dan update dari tim IT. Setelah tiket selesai, nilai hasil
              kerja di menu Nilai Hasil Kerja.
            </p>
            <div className="rounded-xl bg-bg px-3 py-3 text-sm">
              <p>
                <span className="text-ink-muted">Status:</span>{" "}
                <span className="font-medium">
                  {STATUS_LABEL[ticket.status]}
                </span>
              </p>
              {ticket.resolution ? (
                <p className="mt-2">
                  <span className="text-ink-muted">Resolusi:</span>{" "}
                  {ticket.resolution}
                </p>
              ) : (
                <p className="mt-2 text-ink-muted">
                  Belum ada resolusi — menunggu update dari tim IT.
                </p>
              )}
              {ticket.satisfaction != null ? (
                <p className="mt-2">
                  <span className="text-ink-muted">Penilaian Anda:</span>{" "}
                  <span className="font-medium">{ticket.satisfaction}/5</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="panel p-5 md:p-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Timeline
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Riwayat siapa handle, status, dan durasi.
        </p>
        <ol className="mt-5 space-y-4">
          {timeline.map((ev) => (
            <li key={ev.id} className="relative border-l-2 border-brand/25 pl-4">
              <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-brand" />
              <p className="mono text-[11px] text-ink-muted">
                {new Date(ev.at).toLocaleString("id-ID")}
              </p>
              <p className="mt-0.5 text-sm font-medium">{ev.message}</p>
              {ev.actorName ? (
                <p className="text-xs text-ink-muted">oleh {ev.actorName}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
