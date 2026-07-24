"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, StaffMember } from "@/lib/types";

type SortKey = "name" | "employeeCode" | "department" | "position";
type SortDir = "asc" | "desc";

export function StaffMaster({
  initial,
  departments: initialDepartments,
}: {
  initial: StaffMember[];
  departments: Department[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [departments, setDepartments] = useState(initialDepartments);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function deptName(id: string) {
    return departments.find((d) => d.id === id)?.name ?? "—";
  }

  function deptCode(id: string) {
    return departments.find((d) => d.id === id)?.code ?? "";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...items];

    if (deptFilter !== "all") {
      list = list.filter((s) => s.departmentId === deptFilter);
    }

    if (q) {
      list = list.filter((s) => {
        const hay = [
          s.employeeCode,
          s.name,
          s.position,
          s.email,
          s.phone,
          deptName(s.departmentId),
          deptCode(s.departmentId),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      const av =
        sortKey === "department"
          ? deptName(a.departmentId)
          : String(a[sortKey] ?? "");
      const bv =
        sortKey === "department"
          ? deptName(b.departmentId)
          : String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "id", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, query, deptFilter, sortKey, sortDir, departments]);

  async function reloadLists() {
    const res = await fetch("/api/master/staff?active=1");
    const data = await res.json();
    if (res.ok) {
      setItems(data.staff);
      setDepartments(data.departments);
    }
    router.refresh();
  }

  async function importExcel() {
    setImporting(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/master/staff/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setError(data.error || "Gagal impor Excel");
      return;
    }
    const r = data.result;
    setMessage(
      `Impor berhasil: ${r.total} baris · ${r.created} baru · ${r.updated} diupdate · ${r.departments} departemen`,
    );
    await reloadLists();
  }

  async function removeStaff(s: StaffMember) {
    const ok = window.confirm(
      `Hapus staf "${s.name}" (${s.employeeCode})?\n\nJika punya histori tiket, data akan dinonaktifkan saja.`,
    );
    if (!ok) return;

    setError(null);
    setMessage(null);
    const res = await fetch(`/api/master/staff?id=${encodeURIComponent(s.id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus staf");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    if (editing?.id === s.id) setEditing(null);
    setMessage(`Staf ${s.employeeCode} berhasil dihapus / dinonaktifkan`);
    router.refresh();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/master/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          employeeCode: fd.get("employeeCode"),
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          departmentId: fd.get("departmentId"),
          position: fd.get("position"),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setItems((prev) => {
        const exists = prev.some((s) => s.id === data.staff.id);
        if (exists) {
          return prev.map((s) => (s.id === data.staff.id ? data.staff : s));
        }
        return [...prev, data.staff];
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
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">Impor dari Excel</p>
          <p className="text-xs text-ink-muted">
            Membaca file <span className="mono">employe.xlsx</span> di folder
            project. Departemen diisi otomatis dari Job Position.
          </p>
        </div>
        <button
          type="button"
          onClick={importExcel}
          disabled={importing}
          className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {importing ? "Mengimpor..." : "Import employe.xlsx"}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={save} className="panel space-y-3 p-5">
          <h2 className="font-semibold">
            {editing ? "Edit staf" : "Tambah staf / manager"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Kode karyawan</span>
              <input
                name="employeeCode"
                required
                defaultValue={editing?.employeeCode}
                key={`code-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Jabatan</span>
              <input
                name="position"
                defaultValue={editing?.position ?? "Staff"}
                key={`pos-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
          </div>
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
            <span className="text-xs text-ink-muted">Departemen</span>
            <select
              name="departmentId"
              required
              defaultValue={editing?.departmentId ?? departments[0]?.id}
              key={`dep-${editing?.id ?? "new"}`}
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
                defaultValue={editing?.email}
                key={`email-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Telepon</span>
              <input
                name="phone"
                defaultValue={editing?.phone}
                key={`phone-${editing?.id ?? "new"}`}
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
          <div className="space-y-3 border-b border-line px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  Master staf ({filtered.length}
                  {filtered.length !== items.length ? ` / ${items.length}` : ""}
                  )
                </h2>
                <p className="text-xs text-ink-muted">
                  Cari & urutkan daftar karyawan
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, kode, jabatan, email..."
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
              >
                <option value="all">Semua dept</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                >
                  <option value="name">Sort: Nama</option>
                  <option value="employeeCode">Sort: Kode</option>
                  <option value="department">Sort: Dept</option>
                  <option value="position">Sort: Jabatan</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                  className="rounded-xl border border-line px-3 py-2 text-sm"
                  title={sortDir === "asc" ? "A → Z" : "Z → A"}
                >
                  {sortDir === "asc" ? "A↑" : "Z↓"}
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                Tidak ada staf yang cocok dengan pencarian.
              </p>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 border-b border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="mono text-xs text-brand">{s.employeeCode}</p>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-ink-muted sm:truncate">
                      {s.position} · {deptName(s.departmentId)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-xs sm:flex-none sm:px-2 sm:py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStaff(s)}
                      className="flex-1 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger sm:flex-none sm:px-2 sm:py-1"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
