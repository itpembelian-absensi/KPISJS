"use client";

import { useEffect, useState } from "react";
import {
  AMBANG_ITEMS,
  ambangStatus,
  type AmbangKey,
  type AmbangMark,
  type KpiAmbangCheck,
} from "@/lib/kpi-ambang";

const EMPTY: Record<AmbangKey, AmbangMark> = {
  kehadiran: "",
  alpa: "",
  sp: "",
  integritas: "",
  k3: "",
};

export function KpiAmbangPanel({
  staffId,
  periodLabel,
  checkedBy,
}: {
  staffId: string;
  periodLabel: string;
  checkedBy: string;
}) {
  const [marks, setMarks] = useState(EMPTY);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const params = new URLSearchParams({ staffId, periodLabel });
    fetch(`/api/kpi/ambang?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Gagal memuat syarat ambang");
        if (cancelled) return;
        const row = data.check as KpiAmbangCheck | null;
        setMarks(
          row
            ? {
                kehadiran: row.kehadiran,
                alpa: row.alpa,
                sp: row.sp,
                integritas: row.integritas,
                k3: row.k3,
              }
            : EMPTY,
        );
        setNotes(row?.notes || "");
        setSavedAt(row?.updatedAt || "");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat syarat ambang");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [staffId, periodLabel]);

  const status = ambangStatus(marks);
  const statusLabel =
    status === "lulus"
      ? "Lulus syarat ambang"
      : status === "tidak"
        ? "Tidak lulus syarat ambang"
        : "Belum selesai dicek";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kpi/ambang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          periodLabel,
          ...marks,
          notes,
          checkedBy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan syarat ambang");
        return;
      }
      const row = data.check as KpiAmbangCheck;
      setSavedAt(row.updatedAt);
    } catch {
      setError("Gagal menyimpan syarat ambang");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Syarat ambang HRGA</h4>
          <p className="mt-0.5 text-xs text-ink-muted">
            Dicek setelah nilai akhir keluar. Angka dan huruf di atas belum
            memasukkan hasil ambang ini.
          </p>
        </div>
        <p
          className={`text-sm font-semibold ${
            status === "lulus"
              ? "text-ok"
              : status === "tidak"
                ? "text-danger"
                : "text-ink-muted"
          }`}
        >
          {statusLabel}
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {AMBANG_ITEMS.map((item) => (
          <label key={item.key} className="text-xs">
            <span className="text-ink-muted">{item.label}</span>
            <select
              className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm"
              value={marks[item.key]}
              onChange={(e) =>
                setMarks((prev) => ({
                  ...prev,
                  [item.key]: e.target.value as AmbangMark,
                }))
              }
            >
              <option value="">Belum</option>
              <option value="lulus">Lulus</option>
              <option value="tidak">Tidak lulus</option>
            </select>
          </label>
        ))}
      </div>
      <label className="mt-3 block text-xs">
        <span className="text-ink-muted">Catatan HRGA</span>
        <input
          className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opsional"
        />
      </label>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan ambang"}
        </button>
        {savedAt ? (
          <span className="text-[11px] text-ink-muted">
            Terakhir disimpan {savedAt.slice(0, 16).replace("T", " ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
