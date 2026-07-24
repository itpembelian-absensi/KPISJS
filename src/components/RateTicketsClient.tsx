"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import type { Agent, Ticket } from "@/lib/types";

const SCORE_HINT: Record<number, string> = {
  1: "Sangat tidak puas",
  2: "Tidak puas",
  3: "Biasa saja",
  4: "Puas",
  5: "Sangat puas",
};

export function RateTicketsClient({
  tickets: initial,
  inProgress = [],
  agents,
  mode = "user_rate",
  currentStaffId = null,
}: {
  tickets: Ticket[];
  inProgress?: Ticket[];
  agents: Agent[];
  mode?: "user_rate" | "it_overview";
  currentStaffId?: string | null;
}) {
  const router = useRouter();
  const isIt = mode === "it_overview";
  const [tickets, setTickets] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number | "">>(() =>
    Object.fromEntries(
      initial.map((t) => [t.id, t.satisfaction ?? ("" as number | "")]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () => tickets.filter((t) => t.satisfaction == null),
    [tickets],
  );
  const rated = useMemo(
    () => tickets.filter((t) => t.satisfaction != null),
    [tickets],
  );

  const avgScore = useMemo(() => {
    if (rated.length === 0) return null;
    const sum = rated.reduce((a, t) => a + (t.satisfaction ?? 0), 0);
    return sum / rated.length;
  }, [rated]);

  async function submit(ticketId: string) {
    const score = draft[ticketId];
    if (score === "" || score == null) {
      setError("Pilih nilai 1–5 terlebih dahulu.");
      return;
    }
    setError(null);
    setSavingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satisfaction: score }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan penilaian");
        return;
      }
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? data.ticket : t)),
      );
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  function agentName(id: string | null) {
    if (!id) return "—";
    return agents.find((a) => a.id === id)?.name ?? "—";
  }

  function canRateTicket(ticket: Ticket) {
    if (isIt) return false;
    return Boolean(
      currentStaffId && ticket.requesterStaffId === currentStaffId,
    );
  }

  function TicketCard({ ticket }: { ticket: Ticket }) {
    const score = draft[ticket.id] ?? "";
    const allowRate = canRateTicket(ticket);

    return (
      <article className="rounded-2xl border border-line bg-bg-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mono text-xs text-brand">{ticket.code}</p>
            <h3 className="mt-1 font-semibold tracking-tight">{ticket.title}</h3>
            <p className="mt-1 text-xs text-ink-muted">
              {isIt ? (
                <>
                  Pemohon: {ticket.requesterName} · {ticket.requesterDept}
                  <br />
                </>
              ) : null}
              Handler: {agentName(ticket.assigneeId)}
              {ticket.resolvedAt
                ? ` · Selesai ${new Date(ticket.resolvedAt).toLocaleString("id-ID")}`
                : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
            {isIt ? (
              ticket.satisfaction != null ? (
                <span className="rounded-md bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok">
                  {ticket.satisfaction}/5 · {SCORE_HINT[ticket.satisfaction]}
                </span>
              ) : (
                <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
                  Belum dinilai
                </span>
              )
            ) : null}
          </div>
        </div>

        {ticket.resolution ? (
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-medium text-ink">Resolusi:</span>{" "}
            {ticket.resolution}
          </p>
        ) : null}

        {allowRate ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="text-xs text-ink-muted">
                Seberapa puas Anda dengan hasil kerja IT? (1–5)
              </span>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5"
                value={score}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [ticket.id]: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              >
                <option value="">Pilih nilai…</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}/5 — {SCORE_HINT[n]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Link
                href={`/tickets/${ticket.id}`}
                className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink-muted hover:bg-bg"
              >
                Detail
              </Link>
              <button
                type="button"
                disabled={savingId === ticket.id || score === ""}
                onClick={() => submit(ticket.id)}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingId === ticket.id
                  ? "Menyimpan…"
                  : ticket.satisfaction != null
                    ? "Ubah nilai"
                    : "Kirim penilaian"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Link
              href={`/tickets/${ticket.id}`}
              className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink-muted hover:bg-bg"
            >
              Detail tiket
            </Link>
          </div>
        )}
      </article>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="panel p-6 text-sm text-ink-muted">
          <p className="font-medium text-ink">
            {isIt
              ? "Belum ada tiket selesai"
              : "Belum ada tiket siap dinilai"}
          </p>
          {!isIt ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Hanya tiket dengan status <strong>Selesai</strong> atau{" "}
                <strong>Ditutup</strong> yang muncul di sini.
              </li>
              <li>
                Tiket harus diajukan atas nama akun Anda.
              </li>
            </ul>
          ) : (
            <p className="mt-2">
              Setelah ada tiket berstatus Selesai/Ditutup, penilaian user akan
              tampil di sini.
            </p>
          )}
        </div>

        {!isIt && inProgress.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">Masih diproses</h2>
              <p className="text-xs text-ink-muted">
                Tiket Anda yang belum selesai — belum bisa dinilai
              </p>
            </div>
            <ul className="space-y-2">
              {inProgress.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="mono text-xs text-brand">{t.code}</p>
                    <p className="truncate text-sm font-medium">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <Link
                      href={`/tickets/${t.id}`}
                      className="text-sm text-brand underline"
                    >
                      Lihat progres
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {isIt ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-bg-elevated px-4 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Tiket selesai
            </p>
            <p className="mt-1 text-2xl font-semibold">{tickets.length}</p>
          </div>
          <div className="rounded-2xl border border-line bg-bg-elevated px-4 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Sudah dinilai
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {rated.length}
              <span className="ml-1 text-sm font-normal text-ink-muted">
                / {tickets.length}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-bg-elevated px-4 py-3">
            <p className="text-[11px] tracking-wide text-ink-muted uppercase">
              Rata-rata skor
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {avgScore != null ? avgScore.toFixed(1) : "—"}
              {avgScore != null ? (
                <span className="ml-1 text-sm font-normal text-ink-muted">
                  / 5
                </span>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">
            {isIt ? "Belum dinilai" : "Menunggu penilaian"}
          </h2>
          <p className="text-xs text-ink-muted">
            {isIt
              ? `${pending.length} tiket selesai — user belum beri skor`
              : `${pending.length} tiket selesai belum dinilai`}
          </p>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Semua tiket selesai sudah dinilai.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>

      {rated.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">
              {isIt ? "Sudah dinilai" : "Sudah dinilai"}
            </h2>
            <p className="text-xs text-ink-muted">
              {isIt
                ? `${rated.length} tiket selesai — ada skor kepuasan dari pemohon`
                : "Bisa diubah jika ada kesalahan"}
            </p>
          </div>
          <div className="space-y-3">
            {rated.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
