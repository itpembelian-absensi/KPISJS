"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import {
  formatDuration,
  hoursBetween,
  isWithinSla,
  slaDeadline,
} from "@/lib/sla";
import type { Agent, Ticket } from "@/lib/types";

function formatSchedule(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketRow({
  ticket,
  agents,
  canDelete = false,
  onDeleted,
}: {
  ticket: Ticket;
  agents: Agent[];
  canDelete?: boolean;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const agent = agents.find((a) => a.id === ticket.assigneeId);
  const end = ticket.resolvedAt ?? new Date().toISOString();
  const elapsed = hoursBetween(ticket.createdAt, end);
  const within = isWithinSla(
    ticket.priority,
    ticket.createdAt,
    ticket.resolvedAt,
  );
  const open = !ticket.resolvedAt;
  const scheduleEnd =
    ticket.scheduledEnd ||
    (open ? slaDeadline(ticket.createdAt, ticket.priority).toISOString() : null);
  const scheduleOverdue =
    open &&
    scheduleEnd &&
    new Date(scheduleEnd).getTime() < Date.now();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
      onDeleted?.(ticket.id);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border-b border-line px-3 py-3.5 transition hover:bg-brand-soft/40 sm:px-4">
      <div className="flex items-start gap-3">
        <Link href={`/tickets/${ticket.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono text-xs text-brand">{ticket.code}</span>
            <StatusBadge status={ticket.status} />
            {ticket.isRepeat ? (
              <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                Repeat
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[15px] leading-snug font-semibold text-ink break-words">
            {ticket.title}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {ticket.requesterName} · {ticket.requesterDept}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>
        </Link>

        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-xs text-danger disabled:opacity-50"
          >
            {deleting ? "..." : "Hapus"}
          </button>
        ) : (
          <Link
            href={`/tickets/${ticket.id}`}
            className="hidden shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted sm:inline-flex"
          >
            Detail
          </Link>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-bg-elevated px-3 py-2.5 sm:grid-cols-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-ink-muted uppercase">
            Handler
          </p>
          <p className="mt-0.5 truncate text-xs font-medium" title={agent?.name}>
            {agent?.name ?? (
              <span className="text-accent">Belum di-assign</span>
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-ink-muted uppercase">
            {open ? "Berjalan" : "Selesai"}
          </p>
          <p className="mono mt-0.5 text-xs font-medium">
            {formatDuration(elapsed)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-ink-muted uppercase">
            Schedule selesai
          </p>
          <p
            className={`mt-0.5 text-xs font-medium leading-snug ${
              scheduleOverdue ? "text-danger" : "text-ink"
            }`}
            title={formatSchedule(scheduleEnd)}
          >
            {formatSchedule(scheduleEnd)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-ink-muted uppercase">
            SLA
          </p>
          <p
            className={`mt-0.5 text-xs font-semibold ${
              within ? "text-ok" : "text-danger"
            }`}
          >
            {within ? "On track" : "Breach"}
          </p>
        </div>
      </div>

      <Link
        href={`/tickets/${ticket.id}`}
        className="mt-3 flex w-full items-center justify-center rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-brand sm:hidden"
      >
        Lihat detail
      </Link>
    </div>
  );
}
