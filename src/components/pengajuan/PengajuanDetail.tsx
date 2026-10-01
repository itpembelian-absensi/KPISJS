"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PengajuanField } from "@/lib/pengajuan";
import { PENGAJUAN_STATUS_LABEL } from "@/lib/pengajuan";
import type { Pengajuan, PengajuanStatus } from "@/lib/types";
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
  if (field.kind === "date") {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return value;
}

const STEPS: PengajuanStatus[] = ["submitted", "approved", "done"];

function StepMark({
  state,
}: {
  state: "done" | "wait" | "rejected";
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
  return (
    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-line bg-white" />
  );
}

export function PengajuanDetail({
  item,
  def,
  displayCode,
  canReview,
  canComplete,
}: {
  item: Pengajuan;
  displayCode?: string;
  def: { label: string; fields: PengajuanField[]; photos?: boolean };
  canReview: boolean;
  canComplete: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | "done" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const rejected = item.status === "rejected";
  const steps = rejected ? (["submitted", "rejected"] as PengajuanStatus[]) : STEPS;
  const activeIndex = steps.indexOf(item.status);

  async function act(action: "approve" | "reject" | "done") {
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

        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => {
            const state =
              step === "rejected"
                ? "rejected"
                : index <= activeIndex
                  ? "done"
                  : "wait";
            const hint =
              state === "rejected"
                ? "Ditolak"
                : state === "wait"
                  ? "Belum"
                  : index === activeIndex && item.status === "submitted"
                    ? "Masih proses"
                    : index === activeIndex && item.status === "approved"
                      ? "Sudah disetujui"
                      : index === activeIndex && item.status === "done"
                        ? "Selesai"
                        : "Sudah";
            return (
              <li
                key={step}
                aria-current={index === activeIndex ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                  state === "rejected"
                    ? "bg-danger-soft text-danger"
                    : state === "wait"
                      ? "bg-bg-elevated text-ink-muted"
                      : "bg-brand-soft text-brand-deep"
                }`}
              >
                <StepMark state={state} />
                <div className="min-w-0">
                  <div className="font-medium">{PENGAJUAN_STATUS_LABEL[step]}</div>
                  <div className="text-[11px] opacity-80">{hint}</div>
                </div>
              </li>
            );
          })}
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
                {displayValue(field, item.payload[field.key] ?? "")}
              </dd>
            </div>
          ))}
          {def.photos ? (
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-ink-muted uppercase">
                Foto
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
          {item.reviewedAt
            ? ` · ${item.status === "rejected" ? "Ditolak" : "Disetujui"} oleh ${item.reviewerName} ${formatWhen(item.reviewedAt)}`
            : ""}
          {item.completedAt
            ? ` · Diselesaikan oleh ${item.completedBy} ${formatWhen(item.completedAt)}`
            : ""}
        </p>
        {item.reviewerNote ? (
          <p className="rounded-xl bg-bg-elevated px-3 py-2 text-sm">
            <span className="text-ink-muted">Catatan persetujuan: </span>
            {item.reviewerNote}
          </p>
        ) : null}
        {item.completionNote ? (
          <p className="rounded-xl bg-bg-elevated px-3 py-2 text-sm">
            <span className="text-ink-muted">Catatan penyelesaian: </span>
            {item.completionNote}
          </p>
        ) : null}
      </div>

      {canReview || canComplete ? (
        <form
          className="panel space-y-3 p-5 print:hidden md:p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <h3 className="text-sm font-semibold">
              {canReview ? "Persetujuan" : "Penyelesaian"}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              {canReview
                ? "Setujui bila data sudah cukup. Tolak bila perlu dikoreksi pemohon."
                : "Tandai selesai setelah permintaan benar-benar diproses di sistem."}
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              {canReview ? "Catatan (wajib jika ditolak)" : "Catatan penyelesaian (opsional)"}
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
            {canReview ? (
              <>
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
              </>
            ) : null}
            {canComplete ? (
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => act("done")}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
              >
                {loading === "done" ? "Menyimpan..." : "Tandai selesai"}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
