"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, JabatanRecord, StaffMember } from "@/lib/types";

export function StaffForm({
  departments,
  jabatan,
  initial,
}: {
  departments: Department[];
  jabatan: JabatanRecord[];
  initial?: StaffMember | null;
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
      const res = await fetch("/api/master/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial?.id,
          employeeCode: fd.get("employeeCode"),
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          departmentId: fd.get("departmentId"),
          jabatanId: fd.get("jabatanId"),
          position: fd.get("position"),
          active: fd.get("status") !== "resign",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      router.push("/master/staff");
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
        {isEdit ? "Edit staf" : "Tambah staf / manager"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Kode karyawan</span>
          <input
            name="employeeCode"
            required
            defaultValue={initial?.employeeCode}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Jabatan</span>
          <select
            name="jabatanId"
            required
            defaultValue={initial?.jabatanId ?? ""}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            <option value="" disabled>
              Pilih jabatan
            </option>
            {jabatan.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Judul di absensi</span>
        <input
          name="position"
          defaultValue={initial?.position ?? ""}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
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
        <span className="text-xs text-ink-muted">Departemen</span>
        <select
          name="departmentId"
          required
          defaultValue={initial?.departmentId ?? departments[0]?.id}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={initial?.email}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Telepon</span>
          <input
            name="phone"
            defaultValue={initial?.phone}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Status kepegawaian</span>
        <select
          name="status"
          defaultValue={initial && !initial.active ? "resign" : "active"}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        >
          <option value="active">Aktif (masih bekerja)</option>
          <option value="resign">Resign (tidak bekerja)</option>
        </select>
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
          href="/master/staff"
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
