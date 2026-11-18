"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { MajuGroup } from "@/lib/kpi-maju";

type MajuRow = MajuGroup & { functionCount: number };

export function MajuMaster({ initial }: { initial: MajuRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<MajuRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeTotal = items
    .filter((item) => item.active)
    .reduce((sum, item) => sum + item.weightPercent, 0);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/master/maju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          code: fd.get("code"),
          name: fd.get("name"),
          subtitle: fd.get("subtitle"),
          weightPercent: fd.get("weightPercent"),
          sortOrder: Number(fd.get("sortOrder")),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      const saved = data.group as MajuRow;
      setItems((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        const next = exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [...prev, saved];
        return next.sort(
          (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
        );
      });
      setEditing(null);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MajuRow) {
    if (
      !confirm(
        `Hapus grup ${item.code} — ${item.name}?\n\nGrup yang masih dipakai fungsi KPI tidak bisa dihapus.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/master/maju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus");
        return;
      }
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    }
  }

  const nextOrder =
    items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="font-semibold">
          {editing ? "Edit grup MAJU" : "Tambah grup MAJU"}
        </h2>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Kode</span>
          <input
            name="code"
            required
            maxLength={3}
            defaultValue={editing?.code ?? ""}
            key={`code-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 uppercase"
            placeholder="M"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Nama</span>
          <input
            name="name"
            required
            defaultValue={editing?.name ?? ""}
            key={`name-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            placeholder="Mutu"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Keterangan</span>
          <input
            name="subtitle"
            defaultValue={editing?.subtitle ?? ""}
            key={`sub-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            placeholder="Kualitas & Kepatuhan"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Bobot (%)</span>
            <input
              name="weightPercent"
              type="number"
              required
              min={0}
              max={100}
              step={0.1}
              defaultValue={editing?.weightPercent ?? 0}
              key={`weight-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Urutan</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              required
              defaultValue={editing?.sortOrder ?? nextOrder}
              key={`order-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={editing?.active ?? true}
            key={`active-${editing?.id ?? "new"}`}
          />
          Aktif — ikut skor dan pilihan fungsi
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-line px-4 py-2 text-sm"
            >
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel overflow-hidden">
        <div className="flex items-end justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-semibold">Daftar grup MAJU</h2>
            <p className="text-xs text-ink-muted">
              Skor akhir memakai bobot grup yang aktif dan sudah punya fungsi.
            </p>
          </div>
          <p
            className={`text-sm font-semibold ${
              Math.abs(activeTotal - 100) < 0.01 ? "text-ok" : "text-warn"
            }`}
          >
            Total aktif {activeTotal.toFixed(activeTotal % 1 ? 1 : 0)}%
          </p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink-muted">Belum ada grup MAJU.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <div>
                <p className="font-medium">
                  {item.code} — {item.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {item.subtitle || "—"} · urutan {item.sortOrder} ·{" "}
                  {item.functionCount} fungsi
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
                  {item.weightPercent}%
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    item.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                  }`}
                >
                  {item.active ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-danger"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
