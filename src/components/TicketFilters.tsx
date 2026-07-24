"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TicketRow } from "@/components/TicketRow";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/sla";
import type { Agent, Ticket } from "@/lib/types";

export function TicketFilters({
  tickets: initialTickets,
  agents,
  canDelete = false,
}: {
  tickets: Ticket[];
  agents: Agent[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [tickets, setTickets] = useState(initialTickets);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/tickets?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Status</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            value={params.get("status") || "active"}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="active">Aktif (antrian)</option>
            <option value="all">Semua</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-xs text-ink-muted">Prioritas</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            value={params.get("priority") || "all"}
            onChange={(e) => setParam("priority", e.target.value)}
          >
            <option value="all">Semua</option>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-xs text-ink-muted">Handler</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            value={params.get("assigneeId") || "all"}
            onChange={(e) => setParam("assigneeId", e.target.value)}
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
            defaultValue={params.get("q") || ""}
            placeholder="Kode / judul / pemohon"
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParam("q", (e.target as HTMLInputElement).value);
              }
            }}
          />
        </label>
      </div>

      <div className="panel overflow-hidden">
        {tickets.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            Tidak ada tiket untuk filter ini.
          </p>
        ) : (
          tickets.map((t) => (
            <TicketRow
              key={t.id}
              ticket={t}
              agents={agents}
              canDelete={canDelete}
              onDeleted={(id) =>
                setTickets((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
