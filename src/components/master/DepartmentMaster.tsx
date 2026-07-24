"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "@/lib/types";

export function DepartmentMaster({
  initial,
}: {
  initial: Department[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/master/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          code: fd.get("code"),
          name: fd.get("name"),
          description: fd.get("description"),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setItems((prev) => {
        const exists = prev.some((d) => d.id === data.department.id);
        if (exists) {
          return prev.map((d) =>
            d.id === data.department.id ? data.department : d,
          );
        }
        return [...prev, data.department];
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

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="font-semibold">
          {editing ? "Edit departemen" : "Tambah departemen"}
        </h2>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Kode</span>
          <input
            name="code"
            required
            defaultValue={editing?.code}
            key={`code-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            placeholder="Contoh: MEK"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Nama</span>
          <input
            name="name"
            required
            defaultValue={editing?.name}
            key={`name-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Deskripsi</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={editing?.description}
            key={`desc-${editing?.id ?? "new"}`}
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
          Aktif
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
          <h2 className="font-semibold">Daftar departemen</h2>
        </div>
        {items.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
          >
            <div>
              <p className="mono text-xs text-brand">{d.code}</p>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-ink-muted">{d.description || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  d.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                }`}
              >
                {d.active ? "Aktif" : "Nonaktif"}
              </span>
              <button
                type="button"
                onClick={() => setEditing(d)}
                className="rounded-lg border border-line px-2 py-1 text-xs"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
