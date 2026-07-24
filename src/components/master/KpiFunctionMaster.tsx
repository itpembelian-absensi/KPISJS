"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Department, KpiFunction } from "@/lib/types";

function resolveDeptFilter(
  raw: string | null,
  departments: Department[],
): string {
  if (raw === "all") return "all";
  if (raw && departments.some((d) => d.id === raw)) return raw;
  return departments[0]?.id ?? "all";
}

export function KpiFunctionMaster({
  initial,
  departments,
}: {
  initial: KpiFunction[];
  departments: Department[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const deptFilter = resolveDeptFilter(params.get("departmentId"), departments);

  function setDeptFilter(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("departmentId", value);
    router.push(`/master/kpi-functions?${next.toString()}`);
  }

  const filtered = useMemo(
    () =>
      deptFilter === "all"
        ? items
        : items.filter((f) => f.departmentId === deptFilter),
    [items, deptFilter],
  );

  const activeTotal = useMemo(
    () =>
      filtered
        .filter((f) => f.active)
        .reduce((sum, f) => sum + f.weightPercent, 0),
    [filtered],
  );

  const deptLabel = (id: string) => {
    const d = departments.find((x) => x.id === id);
    return d ? `${d.code} — ${d.name}` : "—";
  };

  const listQuery =
    deptFilter !== "all"
      ? `?departmentId=${encodeURIComponent(deptFilter)}`
      : "?departmentId=all";

  const addHref =
    deptFilter !== "all"
      ? `/master/kpi-functions/new?departmentId=${encodeURIComponent(deptFilter)}`
      : "/master/kpi-functions/new";

  async function remove(f: KpiFunction) {
    if (
      !confirm(
        `Hapus fungsi KPI "${f.name}"?\n\nJika masih dipakai perintah kerja atau penilaian, penghapusan akan ditolak.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/master/kpi-functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteId: f.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus");
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== f.id));
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-end justify-between gap-3 p-3 sm:p-4">
        <label className="block min-w-[200px] flex-1 text-sm">
          <span className="text-xs text-ink-muted">Filter departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 sm:max-w-sm"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">Semua departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          href={addHref}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          Add
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold">Daftar fungsi KPI</h2>
              <p className="text-xs text-ink-muted">
                Add / Change / Delete lewat tombol di list
              </p>
            </div>
            <p
              className={`text-sm font-semibold ${
                Math.abs(activeTotal - 100) < 0.01 ? "text-ok" : "text-warn"
              }`}
            >
              Total aktif filter:{" "}
              {activeTotal.toFixed(activeTotal % 1 ? 1 : 0)}%
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            Belum ada fungsi untuk filter ini.{" "}
            <Link href={addHref} className="font-medium text-brand hover:underline">
              Add fungsi
            </Link>
          </p>
        ) : (
          filtered.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 border-b border-line px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4"
            >
              <div className="min-w-0">
                <p className="text-[11px] text-ink-muted">
                  {deptLabel(f.departmentId)}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{f.name}</p>
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
                    {f.weightPercent}%
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {f.focus || "—"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    f.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                  }`}
                >
                  {f.active ? "Aktif" : "Nonaktif"}
                </span>
                <Link
                  href={`/master/kpi-functions/${f.id}/edit${listQuery}`}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated"
                >
                  Change
                </Link>
                <button
                  type="button"
                  onClick={() => remove(f)}
                  className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
