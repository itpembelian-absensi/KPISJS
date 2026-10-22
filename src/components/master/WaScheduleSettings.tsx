"use client";

import { FormEvent, useState } from "react";

type Scope = "open" | "overdue";

type LastRun = {
  at: string;
  source: "schedule" | "manual";
  summary: string;
  sent: number;
  failed: number;
  skipped: number;
};

type Schedule = {
  enabled: boolean;
  time: string;
  days: number[];
  scope: Scope;
  lastRun: LastRun | null;
};

const DAYS: Array<[number, string]> = [
  [1, "Sen"],
  [2, "Sel"],
  [3, "Rab"],
  [4, "Kam"],
  [5, "Jum"],
  [6, "Sab"],
  [0, "Min"],
];

function formatLastRun(run: LastRun | null): string {
  if (!run) return "Belum pernah dikirim.";
  const when = new Date(run.at).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const via = run.source === "schedule" ? "jadwal" : "kirim sekarang";
  return `${when} WIB (${via}). ${run.summary}`;
}

export function WaScheduleSettings({ initial }: { initial: Schedule }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [time, setTime] = useState(initial.time);
  const [days, setDays] = useState<number[]>(initial.days);
  const [scope, setScope] = useState<Scope>(initial.scope);
  const [lastRun, setLastRun] = useState<LastRun | null>(initial.lastRun);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day],
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/wa-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, time, days, scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan jadwal");
        return;
      }
      setEnabled(Boolean(data.enabled));
      setTime(data.time || time);
      setDays(Array.isArray(data.days) ? data.days : days);
      setScope(data.scope === "overdue" ? "overdue" : "open");
      setLastRun(data.lastRun ?? null);
      setMessage(
        data.enabled
          ? "Jadwal tersimpan. Pengiriman otomatis mengikuti hari dan jam WIB."
          : "Jadwal tersimpan. Pengiriman otomatis dimatikan.",
      );
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    const label =
      scope === "overdue"
        ? "bahasan overdue"
        : "bahasan yang belum selesai";
    if (
      !window.confirm(
        `Kirim laporan ${label} ke semua PIC yang punya nomor WhatsApp sekarang?`,
      )
    ) {
      return;
    }
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/wa-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-now", scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengirim laporan");
        return;
      }
      if (data.lastRun) setLastRun(data.lastRun);
      const summary = data.summary || "Pengiriman selesai.";
      if (Array.isArray(data.failed) && data.failed.length > 0) setError(summary);
      else setMessage(summary);
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={save} className="panel max-w-xl space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Jadwal kirim laporan</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Pada jam yang dipilih, WhatsApp berisi laporan bahasan dikirim ke
          setiap PIC. Waktu mengikuti WIB. Satu kali per hari.
        </p>
      </div>
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Aktifkan pengiriman otomatis
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Jam kirim (WIB)</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          required
        />
      </label>
      <fieldset className="text-sm">
        <legend className="text-xs text-ink-muted">Hari</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map(([day, label]) => {
            const on = days.includes(day);
            return (
              <label
                key={day}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 ${
                  on
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-muted"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggleDay(day)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Isi laporan</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        >
          <option value="open">Semua bahasan yang belum selesai</option>
          <option value="overdue">Hanya bahasan overdue</option>
        </select>
      </label>
      <p className="text-xs text-ink-muted">{formatLastRun(lastRun)}</p>
      <p className="text-xs text-ink-muted">
        Jika jadwal disimpan setelah jam kirim, pengiriman otomatis mulai hari
        berikutnya. Nomor PIC yang kosong dilewati.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving || sending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan jadwal"}
        </button>
        <button
          type="button"
          onClick={sendNow}
          disabled={saving || sending}
          className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-60"
        >
          {sending ? "Mengirim..." : "Kirim sekarang"}
        </button>
      </div>
    </form>
  );
}
