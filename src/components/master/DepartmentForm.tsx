"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "@/lib/types";

export function DepartmentForm({
  initial,
}: {
  initial?: Department | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

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
          id: initial?.id,
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
      router.push("/master/departments");
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="panel mx-auto max-w-xl space-y-3 p-4 sm:p-5">
      <h2 className="font-semibold">
        {isEdit ? "Edit departemen" : "Tambah departemen"}
      </h2>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Kode</span>
        <input
          name="code"
          required
          defaultValue={initial?.code}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          placeholder="Contoh: MEK"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Nama</span>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Deskripsi</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={initial?.active ?? true}
        />
        Aktif
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <Link
          href="/master/departments"
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
