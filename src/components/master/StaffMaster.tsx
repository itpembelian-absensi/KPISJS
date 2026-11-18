"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, JabatanRecord, StaffMember } from "@/lib/types";

type SortKey = "name" | "employeeCode" | "department" | "position";
type SortDir = "asc" | "desc";

/** Jumlah staf per halaman di daftar kanan */
const LIST_PAGE_SIZE = 8;

export function StaffMaster({
  initial,
  departments: initialDepartments,
  jabatan: initialJabatan,
  initialJabatanId = "all",
}: {
  initial: StaffMember[];
  departments: Department[];
  jabatan: JabatanRecord[];
  initialJabatanId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [departments, setDepartments] = useState(initialDepartments);
  const [jabatan, setJabatan] = useState(initialJabatan);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [jabatanFilter, setJabatanFilter] = useState(initialJabatanId);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resigned">(
    "all",
  );
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [listPage, setListPage] = useState(1);

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
    if (jabatanFilter !== "all") {
      list = list.filter((s) => s.jabatanId === jabatanFilter);
    }
    if (statusFilter === "active") {
      list = list.filter((s) => s.active);
    } else if (statusFilter === "resigned") {
      list = list.filter((s) => !s.active);
    }

    if (q) {
      list = list.filter((s) => {
        const hay = [
          s.employeeCode,
          s.name,
          s.position,
          s.jabatanName,
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
      if (statusFilter === "all" && a.active !== b.active) {
        return Number(b.active) - Number(a.active);
      }
      const av =
        sortKey === "department"
          ? deptName(a.departmentId)
          : sortKey === "position"
            ? a.jabatanName || a.position
            : String(a[sortKey] ?? "");
      const bv =
        sortKey === "department"
          ? deptName(b.departmentId)
          : sortKey === "position"
            ? b.jabatanName || b.position
            : String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "id", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, query, deptFilter, jabatanFilter, statusFilter, sortKey, sortDir, departments]);

  const totalListPages = Math.max(1, Math.ceil(filtered.length / LIST_PAGE_SIZE));
  const currentListPage = Math.min(listPage, totalListPages);
  const paged = useMemo(() => {
    const start = (currentListPage - 1) * LIST_PAGE_SIZE;
    return filtered.slice(start, start + LIST_PAGE_SIZE);
  }, [filtered, currentListPage]);

  useEffect(() => {
    setListPage(1);
  }, [query, deptFilter, jabatanFilter, statusFilter, sortKey, sortDir]);

  async function reloadLists() {
    const res = await fetch("/api/master/staff");
    const data = await res.json();
    if (res.ok) {
      setItems(data.staff);
      setDepartments(data.departments);
      if (Array.isArray(data.jabatan)) setJabatan(data.jabatan);
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
    const resignNote =
      r.resigned > 0 ? ` · ${r.resigned} ditandai resign` : "";
    setMessage(
      `Impor berhasil: ${r.total} baris · ${r.created} baru · ${r.updated} diupdate · ${r.departments} departemen${resignNote}`,
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
            project. Karyawan yang di Excel bertanda resign (kolom Status /
            Resign Date) tidak dihapus — hanya ditandai Resign.
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
              <select
                name="jabatanId"
                required
                defaultValue={editing?.jabatanId ?? ""}
                key={`jab-${editing?.id ?? "new"}`}
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
              defaultValue={editing?.position ?? ""}
              key={`pos-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
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
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Status kepegawaian</span>
            <select
              name="status"
              defaultValue={editing && !editing.active ? "resign" : "active"}
              key={`status-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            >
              <option value="active">Aktif (masih bekerja)</option>
              <option value="resign">Resign (tidak bekerja)</option>
            </select>
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

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, kode, jabatan, email..."
                className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <select
                value={jabatanFilter}
                onChange={(e) => setJabatanFilter(e.target.value)}
                className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
              >
                <option value="all">Semua jabatan</option>
                {jabatan.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "resigned")
                }
                className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="resigned">Resign</option>
              </select>
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
            </div>
            <div className="mt-2 flex gap-2">
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

          <div>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                Tidak ada staf yang cocok dengan pencarian.
              </p>
            ) : (
              paged.map((s) => (
                <div
                  key={s.id}
                  className={`flex flex-col gap-2 border-b border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 ${
                    s.active ? "" : "bg-danger-soft/60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mono text-xs text-brand">{s.employeeCode}</p>
                      {s.active ? null : (
                        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                          Resign
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-ink-muted sm:truncate">
                      {s.jabatanName || s.position}
                      {s.jabatanName && s.position && s.jabatanName !== s.position
                        ? ` · ${s.position}`
                        : ""}
                      {" · "}
                      {deptName(s.departmentId)}
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
            {totalListPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <p className="text-xs text-ink-muted">
                  Halaman {currentListPage} dari {totalListPages}
                  {" · "}
                  {(currentListPage - 1) * LIST_PAGE_SIZE + 1}–
                  {Math.min(currentListPage * LIST_PAGE_SIZE, filtered.length)} dari{" "}
                  {filtered.length}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentListPage <= 1}
                    onClick={() => setListPage(1)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman awal"
                    title="Halaman awal"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    disabled={currentListPage <= 1}
                    onClick={() => setListPage((page) => Math.max(1, page - 1))}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman sebelumnya"
                    title="Halaman sebelumnya"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalListPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setListPage(page)}
                        className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium ${
                          page === currentListPage
                            ? "bg-brand text-white"
                            : "border border-line hover:bg-bg"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={currentListPage >= totalListPages}
                    onClick={() =>
                      setListPage((page) => Math.min(totalListPages, page + 1))
                    }
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman berikutnya"
                    title="Halaman berikutnya"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    disabled={currentListPage >= totalListPages}
                    onClick={() => setListPage(totalListPages)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman akhir"
                    title="Halaman akhir"
                  >
                    »
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
