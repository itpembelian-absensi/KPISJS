"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { MasterAssetCategory } from "@/lib/types";

export function AssetCategoryMaster({ initial }: { initial: MasterAssetCategory[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<MasterAssetCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/master/asset-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name: fd.get("name"),
          sortOrder: Number(fd.get("sortOrder")),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      const saved = data.category as MasterAssetCategory;
      setItems((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        const next = exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [...prev, saved];
        return next.sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id"),
        );
      });
      setEditing(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const nextOrder =
    items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="font-semibold">
          {editing ? "Edit kategori" : "Tambah kategori"}
        </h2>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Nama</span>
          <input
            name="name"
            required
            defaultValue={editing?.name}
            key={`name-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            placeholder="Contoh: Laptop"
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
        <label className="flex items-center gap-2 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={editing?.active ?? true}
            key={`active-${editing?.id ?? "new"}`}
          />
          Aktif — muncul di pengajuan asset
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
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Daftar kategori</h2>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink-muted">Belum ada kategori.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-ink-muted">Urutan {item.sortOrder}</p>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
