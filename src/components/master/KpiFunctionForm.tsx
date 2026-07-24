"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, KpiFunction } from "@/lib/types";

function listHref(departmentId: string | null | undefined) {
  if (!departmentId) return "/master/kpi-functions";
  return `/master/kpi-functions?departmentId=${encodeURIComponent(departmentId)}`;
}

export function KpiFunctionForm({
  departments,
  initial,
  defaultDepartmentId,
  returnDepartmentId,
}: {
  departments: Department[];
  initial?: KpiFunction | null;
  defaultDepartmentId?: string;
  /** Filter list departemen yang harus dipertahankan saat kembali (bisa "all") */
  returnDepartmentId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const backHref = listHref(
    returnDepartmentId ||
      initial?.departmentId ||
      defaultDepartmentId,
  );

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const departmentId = String(fd.get("departmentId") || "");
      const res = await fetch("/api/master/kpi-functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial?.id,
          departmentId,
          name: fd.get("name"),
          weightPercent: fd.get("weightPercent"),
          focus: fd.get("focus"),
          sortOrder: fd.get("sortOrder"),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      // Tetap di filter departemen yang dipilih; jika user memindah departemen di form, ikut departemen baru
      const stayOn =
        returnDepartmentId === "all"
          ? "all"
          : departmentId || returnDepartmentId || defaultDepartmentId;
      router.push(listHref(stayOn));
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
        {isEdit ? "Change fungsi KPI" : "Add fungsi KPI"}
      </h2>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Departemen</span>
        <select
          name="departmentId"
          required
          defaultValue={
            initial?.departmentId ||
            defaultDepartmentId ||
            departments[0]?.id ||
            ""
          }
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Fungsi</span>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
          placeholder="Contoh: Closing & Reporting"
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
            defaultValue={initial?.weightPercent ?? 10}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Urutan tampil</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.sortOrder ?? ""}
            placeholder="Otomatis"
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Fokus</span>
        <textarea
          name="focus"
          rows={3}
          defaultValue={initial?.focus}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
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
          href={backHref}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
