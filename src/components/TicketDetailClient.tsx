"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
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

const MAX_PHOTOS = 8;

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
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState(initial.resolution ?? "");
  const [rootCause, setRootCause] = useState(initial.rootCause ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

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

  async function patch(
    body: Record<string, unknown>,
    opts?: { refresh?: boolean },
  ): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          actorId: body.actorId ?? actorId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : "Gagal menyimpan",
        );
        return false;
      }
      if (data.ticket) setTicket(data.ticket);
      if (opts?.refresh !== false) router.refresh();
      return true;
    } catch {
      setSaveError("Koneksi gagal — coba lagi");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    const text = comment.trim();
    if (!text) {
      setSaveError("Isi catatan/komentar dulu sebelum Tambah");
      return;
    }
    const ok = await patch(
      {
        comment: text,
        rootCause,
        resolution,
        actorId: ticket.assigneeId || actorId || undefined,
      },
      { refresh: true },
    );
    if (ok) setComment("");
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

  async function uploadPhotos(
    files: FileList | null,
    kind: "request" | "work",
  ) {
    if (!files?.length) return;
    const current =
      kind === "work"
        ? (ticket.workPhotoUrls ?? [])
        : (ticket.photoUrls ?? []);
    const remaining = MAX_PHOTOS - current.length;
    if (remaining <= 0) {
      setSaveError(
        `Maksimal ${MAX_PHOTOS} foto ${kind === "work" ? "pekerjaan" : "laporan"}`,
      );
      return;
    }
    setUploading(true);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("ticketId", ticket.id);
      fd.append("kind", kind);
      for (const f of Array.from(files).slice(0, remaining)) {
        fd.append("photos", f);
      }
      const res = await fetch("/api/tickets/photos", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : "Gagal unggah foto",
        );
        return;
      }
      if (data.ticket) setTicket(data.ticket);
      router.refresh();
    } catch {
      setSaveError("Koneksi gagal — coba lagi");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(url: string, kind: "request" | "work") {
    if (!confirm("Hapus foto ini?")) return;
    setUploading(true);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("ticketId", ticket.id);
      fd.append("kind", kind);
      fd.append("removeUrl", url);
      const res = await fetch("/api/tickets/photos", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" ? data.error : "Gagal hapus foto",
        );
        return;
      }
      if (data.ticket) setTicket(data.ticket);
      router.refresh();
    } catch {
      setSaveError("Koneksi gagal — coba lagi");
    } finally {
      setUploading(false);
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

        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Foto laporan
            {ticket.photoUrls?.length
              ? ` (${ticket.photoUrls.length}/${MAX_PHOTOS})`
              : ""}
          </p>
          <p className="text-[11px] text-ink-muted">
            Foto dari pemohon saat buat tiket (terpisah dari foto pekerjaan IT).
          </p>
          {ticket.photoUrls?.length ? (
            <ActivityPhotoSlider
              photos={ticket.photoUrls}
              onRemove={
                canAssign ? (url) => void removePhoto(url, "request") : undefined
              }
            />
          ) : (
            <p className="text-xs text-ink-muted">Belum ada foto laporan.</p>
          )}
          {(ticket.photoUrls?.length ?? 0) < MAX_PHOTOS ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-bg px-4 py-4 text-center transition hover:border-brand">
              <span className="text-sm font-medium text-ink">
                {uploading
                  ? "Mengunggah..."
                  : ticket.photoUrls?.length
                    ? "Tambah foto laporan"
                    : "Unggah foto laporan"}
              </span>
              <span className="text-[11px] text-ink-muted">
                Bisa pilih beberapa sekaligus · JPG/PNG/WebP/GIF · max 5MB ·
                sisa {MAX_PHOTOS - (ticket.photoUrls?.length ?? 0)} slot
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading}
                className="sr-only"
                onChange={(e) => {
                  void uploadPhotos(e.target.files, "request");
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <p className="text-[11px] text-ink-muted">
              Sudah mencapai batas {MAX_PHOTOS} foto laporan.
            </p>
          )}
        </div>

        {!canAssign && (ticket.workPhotoUrls?.length ?? 0) > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Foto pekerjaan ({ticket.workPhotoUrls.length})
            </p>
            <ActivityPhotoSlider photos={ticket.workPhotoUrls} />
          </div>
        ) : null}

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
              Proses IT — assign, prioritas, status, resolusi, dan foto
              pekerjaan. Penilaian kepuasan user ada di menu Nilai Hasil Kerja.
            </p>

            <div className="space-y-2 rounded-xl border border-line bg-bg px-3 py-3">
              <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Foto pekerjaan
                {ticket.workPhotoUrls?.length
                  ? ` (${ticket.workPhotoUrls.length}/${MAX_PHOTOS})`
                  : ""}
              </p>
              <p className="text-[11px] text-ink-muted">
                Dokumentasi IT saat dikerjakan — default kosong, tidak
                terhubung dengan foto laporan pemohon.
              </p>
              {ticket.workPhotoUrls?.length ? (
                <ActivityPhotoSlider
                  photos={ticket.workPhotoUrls}
                  compact
                  onRemove={(url) => void removePhoto(url, "work")}
                />
              ) : (
                <p className="text-xs text-ink-muted">
                  Belum ada foto pekerjaan.
                </p>
              )}
              {(ticket.workPhotoUrls?.length ?? 0) < MAX_PHOTOS ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-bg-elevated px-3 py-4 text-center transition hover:border-brand">
                  <span className="text-sm font-medium text-ink">
                    {uploading
                      ? "Mengunggah..."
                      : "Pilih / unggah foto pekerjaan"}
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    Multi-select · JPG, PNG, WebP, GIF · max 5MB · maks{" "}
                    {MAX_PHOTOS} foto
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={uploading}
                    className="sr-only"
                    onChange={(e) => {
                      void uploadPhotos(e.target.files, "work");
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <p className="text-[11px] text-ink-muted">
                  Batas {MAX_PHOTOS} foto pekerjaan tercapai — hapus foto lama
                  untuk menambah baru.
                </p>
              )}
            </div>

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
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (saveError) setSaveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addComment();
                    }
                  }}
                  placeholder="Update progress untuk timeline..."
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void addComment()}
                className="self-end rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Tambah"}
              </button>
            </div>

            {saveError ? (
              <p className="text-xs text-danger">{saveError}</p>
            ) : null}
            {saving ? (
              <p className="text-xs text-ink-muted">Menyimpan perubahan...</p>
            ) : (
              <p className="text-xs text-ink-muted">
                Tombol Tambah menulis catatan ke timeline (boleh sekaligus
                menyimpan root cause &amp; resolusi).
              </p>
            )}
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

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              router.push("/tickets");
              router.refresh();
            }}
            className="w-full rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand hover:text-brand sm:w-auto"
          >
            Tutup — kembali ke antrian
          </button>
        </div>
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
