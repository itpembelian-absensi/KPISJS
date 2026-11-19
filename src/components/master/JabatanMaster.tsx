"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JabatanRecord } from "@/lib/types";

type DepartmentOption = {
  id: string;
  code: string;
  name: string;
};

function methodLabel(method: JabatanRecord["scoreMethod"]) {
  if (method === "bobot") return "Bobot per indikator";
  if (method === "rata-rata") return "Rata-rata fungsi";
  return "—";
}

function originLabel(origin: JabatanRecord["origin"]) {
  if (origin === "kpi") return "KPI, belum ada pemegang";
  if (origin === "keduanya") return "KPI";
  return "Dari data staf";
}

export function JabatanMaster({
  initial,
  departments,
}: {
  initial: JabatanRecord[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState<JabatanRecord | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const editing = form && form !== "new" ? form : null;

  useEffect(() => {
    if (!form) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setForm(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (departmentId === "none" && item.departmentId) return false;
      if (
        departmentId !== "all" &&
        departmentId !== "none" &&
        item.departmentId !== departmentId
      ) {
        return false;
      }
      if (!q) return true;
      const staff = item.staff.map((member) => member.name).join(" ");
      return `${item.name} ${item.departmentName} ${staff}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, departmentId]);

  const groups = useMemo(() => {
    const order = [...departments].sort((a, b) =>
      a.name.localeCompare(b.name, "id"),
    );
    const known = new Set(order.map((dept) => dept.id));
    const buckets: Array<{ id: string; name: string; items: JabatanRecord[] }> =
      order.map((dept) => ({
        id: dept.id,
        name: `${dept.name} (${dept.code})`,
        items: filtered.filter((item) => item.departmentId === dept.id),
      }));
    const extraNames = new Map<string, string>();
    for (const item of filtered) {
      if (!item.departmentId || known.has(item.departmentId)) continue;
      extraNames.set(item.departmentId, item.departmentName || "Departemen");
    }
    for (const [id, name] of extraNames) {
      buckets.push({
        id,
        name,
        items: filtered.filter((item) => item.departmentId === id),
      });
    }
    const unlinked = filtered.filter((item) => !item.departmentId);
    if (unlinked.length > 0) {
      buckets.push({
        id: "none",
        name: "Belum terhubung",
        items: unlinked,
      });
    }
    return buckets.filter((group) => group.items.length > 0);
  }, [filtered, departments]);

  function openNew() {
    setError(null);
    setForm("new");
  }

  function openEdit(item: JabatanRecord) {
    setError(null);
    setForm(item);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/master/jabatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name: fd.get("name"),
          departmentId: fd.get("departmentId"),
          scoreMethod: fd.get("scoreMethod"),
          indicatorCount: fd.get("indicatorCount"),
          active: fd.get("active") === "on",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setItems((prev) => {
        const exists = prev.some((item) => item.id === data.jabatan.id);
        const next = exists
          ? prev.map((item) =>
              item.id === data.jabatan.id ? data.jabatan : item,
            )
          : [...prev, data.jabatan];
        return next.sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id"),
        );
      });
      setForm(null);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: JabatanRecord) {
    const warning =
      item.staffCount > 0
        ? `Hapus jabatan ${item.name}?\n\n${item.staffCount} staf akan dilepas dari jabatan ini. Data staf tidak dihapus.`
        : `Hapus jabatan ${item.name}?`;
    if (!window.confirm(warning)) return;
    setError(null);
    const res = await fetch(`/api/master/jabatan?id=${item.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus");
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    if (editing?.id === item.id) setForm(null);
    router.refresh();
  }

  const kpiCount = items.filter((item) => item.origin !== "aplikasi").length;
  const linkedStaff = items.reduce((sum, item) => sum + item.staffCount, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel px-4 py-3">
          <p className="text-xs text-ink-muted">Jabatan</p>
          <p className="text-2xl font-semibold">{items.length}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-xs text-ink-muted">Dari paket KPI</p>
          <p className="text-2xl font-semibold">{kpiCount}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-xs text-ink-muted">Staf terhubung</p>
          <p className="text-2xl font-semibold">{linkedStaff}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari jabatan atau nama staf"
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
          />
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
          >
            <option value="all">Semua departemen</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
            <option value="none">Belum terhubung</option>
          </select>
          <button
            type="button"
            onClick={openNew}
            className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Tambah jabatan
          </button>
        </div>

        {error && !form ? <p className="text-sm text-danger">{error}</p> : null}

        {groups.map((group) => (
          <section key={group.id} className="panel overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">
              {group.name}
            </h2>
            <div className="divide-y divide-line">
              {group.items.map((item) => (
                <div key={item.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {item.name}
                        {item.active ? null : (
                          <span className="ml-2 text-xs text-ink-muted">nonaktif</span>
                        )}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {originLabel(item.origin)}
                        {item.indicatorCount > 0
                          ? ` · ${item.indicatorCount} indikator`
                          : ""}
                        {item.scoreMethod ? ` · ${methodLabel(item.scoreMethod)}` : ""}
                        {` · ${item.staffCount} staf`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/master/staff?jabatan=${item.id}`}
                        className="rounded-xl border border-line px-3 py-1.5 text-xs"
                      >
                        Lihat staf
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-xl border border-line px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="rounded-xl border border-line px-3 py-1.5 text-xs text-danger"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  {item.staff.length > 0 ? (
                    <p className="text-sm text-ink-muted">
                      {item.staff.map((member, index) => (
                        <span key={member.id}>
                          {index > 0 ? ", " : ""}
                          <Link
                            href={`/master/staff?jabatan=${item.id}`}
                            className={member.active ? "" : "line-through"}
                          >
                            {member.name}
                          </Link>
                          {member.departmentName ? ` (${member.departmentName})` : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-muted">Belum ada staf.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {form ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 cursor-default"
            onClick={() => setForm(null)}
          />
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="jabatan-form-title"
            onSubmit={save}
            className="panel relative z-10 max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto p-5 shadow-2xl"
          >
            <h2 id="jabatan-form-title" className="font-semibold">
              {editing ? `Edit ${editing.name}` : "Tambah jabatan"}
            </h2>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Nama</span>
              <input
                name="name"
                required
                autoFocus
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
                defaultValue={editing?.departmentId || departments[0]?.id || ""}
                key={`dept-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Cara hitung</span>
              <select
                name="scoreMethod"
                defaultValue={editing?.scoreMethod || ""}
                key={`method-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              >
                <option value="">Belum diatur</option>
                <option value="rata-rata">Rata-rata fungsi</option>
                <option value="bobot">Bobot per indikator</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Jumlah indikator</span>
              <input
                name="indicatorCount"
                type="number"
                min={0}
                defaultValue={editing?.indicatorCount ?? 0}
                key={`ind-${editing?.id ?? "new"}`}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => remove(editing)}
                  className="ml-auto rounded-xl border border-line px-4 py-2 text-sm text-danger"
                >
                  Hapus
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
