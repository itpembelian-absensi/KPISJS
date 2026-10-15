"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoneyCurrency, terbilangRupiah } from "@/lib/money";
import type { PengajuanField } from "@/lib/pengajuan";
import {
  approvalActorNames,
  approvedSignerNames,
  currentApprovalStep,
  unapproveTarget,
} from "@/lib/pengajuan-approval-view";
import type { Pengajuan } from "@/lib/types";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
import { PengajuanStatusBadge } from "@/components/pengajuan/PengajuanStatusBadge";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayValue(field: PengajuanField, value: string) {
  if (!value) return "—";
  if (field.kind === "money") return formatMoneyCurrency(value) || "—";
  if (field.kind === "date") {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return value;
}

function StepMark({
  state,
}: {
  state: "done" | "current" | "wait" | "rejected";
}) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M3.5 8.2 6.4 11.1 12.5 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "rejected") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-white">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M4.5 4.5 11.5 11.5 M11.5 4.5 4.5 11.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-brand bg-white" />
    );
  }
  return (
    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-line bg-white" />
  );
}

type UiStep = {
  key: string;
  label: string;
  state: "done" | "current" | "wait" | "rejected";
  hint: string;
};

function progressSteps(item: Pengajuan): UiStep[] {
  const steps: UiStep[] = [
    { key: "submitted", label: "Diajukan", state: "done", hint: "Sudah" },
  ];
  for (const step of item.approval.steps) {
    const who = approvalActorNames(item, step);
    if (step.status === "approved") {
      steps.push({
        key: step.id,
        label: step.label,
        state: "done",
        hint: step.actorName ? `Disetujui ${step.actorName}` : "Sudah disetujui",
      });
      continue;
    }
    if (step.status === "rejected") {
      steps.push({
        key: step.id,
        label: step.label,
        state: "rejected",
        hint: step.actorName ? `Ditolak ${step.actorName}` : "Ditolak",
      });
      continue;
    }
    const current = step.order === item.approval.currentOrder;
    steps.push({
      key: step.id,
      label: step.label,
      state: current ? "current" : "wait",
      hint: current ? `Menunggu ${who}` : "Belum",
    });
  }
  if (item.status !== "rejected") {
    const finished = item.status === "approved" || item.status === "done";
    steps.push({
      key: "approved",
      label: "Disetujui",
      state: finished ? "done" : "wait",
      hint: finished ? "Sudah disetujui" : "Belum",
    });
  }
  return steps;
}

export function PengajuanDetail({
  item,
  def,
  displayCode,
  canReview,
  canUnapprove,
}: {
  item: Pengajuan;
  displayCode?: string;
  def: { label: string; fields: PengajuanField[]; photos?: boolean };
  canReview: boolean;
  canUnapprove: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | "unapprove" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const steps = progressSteps(item);
  const current = currentApprovalStep(item);
  const undoStep = unapproveTarget(item);
  const notes = item.approval.steps.filter((step) => step.note.trim());
  const signers = approvedSignerNames(item);

  async function act(action: "approve" | "reject" | "unapprove") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/pengajuan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memperbarui status");
        setLoading(null);
        return;
      }
      setNote("");
      router.refresh();
      setLoading(null);
    } catch {
      setError("Koneksi gagal — coba lagi");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-ink-muted uppercase">
              {displayCode || item.code}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {item.requesterName} · {item.requesterDept}
            </p>
          </div>
          <PengajuanStatusBadge status={item.status} />
        </div>

        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.key}
              aria-current={step.state === "current" ? "step" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                step.state === "rejected"
                  ? "bg-danger-soft text-danger"
                  : step.state === "wait"
                    ? "bg-bg-elevated text-ink-muted"
                    : "bg-brand-soft text-brand-deep"
              }`}
            >
              <StepMark state={step.state} />
              <div className="min-w-0">
                <div className="font-medium">
                  {index === 0 || step.key === "approved"
                    ? step.label
                    : `${index}. ${step.label}`}
                </div>
                <div className="text-[11px] opacity-80">{step.hint}</div>
              </div>
            </li>
          ))}
        </ol>

        <dl className="grid gap-3 sm:grid-cols-2">
          {def.fields.map((field) => (
            <div
              key={field.key}
              className={field.kind === "textarea" || field.wide ? "sm:col-span-2" : ""}
            >
              <dt className="text-xs tracking-wide text-ink-muted uppercase">
                {field.label}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                <div className={field.kind === "money" ? "font-medium tabular-nums" : ""}>
                  {displayValue(field, item.payload[field.key] ?? "")}
                </div>
                {field.kind === "money" && item.payload[field.key] ? (
                  <p className="mt-0.5 text-xs font-normal text-ink-muted">
                    {terbilangRupiah(item.payload[field.key] ?? "")}
                  </p>
                ) : null}
              </dd>
            </div>
          ))}
          {def.photos ? (
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-ink-muted uppercase">
                Foto bukti
              </dt>
              <dd className="mt-2">
                {item.photoUrls.length > 0 ? (
                  <ActivityPhotoSlider photos={item.photoUrls} layout="thumbs" />
                ) : (
                  <span className="text-sm">Tidak ada foto</span>
                )}
              </dd>
            </div>
          ) : null}
          {item.note ? (
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-ink-muted uppercase">
                Catatan tambahan
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{item.note}</dd>
            </div>
          ) : null}
        </dl>

        <p className="text-xs text-ink-muted">
          Diajukan {formatWhen(item.createdAt)}
        </p>
        {notes.map((step) => (
          <p key={step.id} className="rounded-xl bg-bg-elevated px-3 py-2 text-sm">
            <span className="text-ink-muted">
              {step.status === "rejected" ? "Alasan penolakan" : "Catatan persetujuan"}
              {item.approval.mode === "chain" ? ` ${step.label}` : ""}:{" "}
            </span>
            {step.note}
          </p>
        ))}
        {item.status === "done" && (item.completedBy || item.completionNote) ? (
          <p className="text-xs text-ink-muted">
            Riwayat proses
            {item.completedBy ? ` oleh ${item.completedBy}` : ""}{" "}
            {formatWhen(item.completedAt)}
            {item.completionNote ? ` · ${item.completionNote}` : ""}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-6 border-t border-line pt-5">
          <div>
            <p className="text-xs tracking-wide text-ink-muted uppercase">
              Dibuat oleh
            </p>
            <p className="mt-6 text-sm font-semibold">{item.requesterName || "—"}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-ink-muted uppercase">
              Disetujui oleh
            </p>
            <div className="mt-6 space-y-2">
              {signers.length > 0 ? (
                signers.map((name, index) => (
                  <p key={`${name}-${index}`} className="text-sm font-semibold">
                    {name}
                  </p>
                ))
              ) : (
                <p className="text-sm text-ink-muted">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {canReview && current ? (
        <form
          className="panel space-y-3 p-5 print:hidden md:p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <h3 className="text-sm font-semibold">Persetujuan</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Giliran {current.label}. Yang boleh menyetujui:{" "}
              {approvalActorNames(item, current)}. Satu orang di tingkat ini
              sudah cukup. Tolak bila data perlu dikoreksi pemohon.
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Catatan (wajib jika ditolak)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => act("reject")}
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger disabled:opacity-60"
            >
              {loading === "reject" ? "Menolak..." : "Tolak"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => act("approve")}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {loading === "approve" ? "Menyetujui..." : "Setujui"}
            </button>
          </div>
        </form>
      ) : null}

      {canUnapprove && undoStep ? (
        <form
          className="panel space-y-3 p-5 print:hidden md:p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <h3 className="text-sm font-semibold">Batalkan persetujuan</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Membatalkan {undoStep.label}
              {undoStep.actorName ? ` yang disetujui ${undoStep.actorName}` : ""}.
              Tingkat ini kembali menunggu. Pengajuan yang sudah disetujui penuh
              dibuka lagi.
            </p>
          </div>
          {error && !canReview ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => act("unapprove")}
              className="rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm font-medium text-ink hover:border-brand disabled:opacity-60"
            >
              {loading === "unapprove" ? "Membatalkan..." : "Batalkan persetujuan"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
