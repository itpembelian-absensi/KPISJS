"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildKpiFunctionReportGroups,
  departmentReportLabel,
  formatWeight,
} from "@/lib/kpi-function-report";
import type { Department, KpiFunction } from "@/lib/types";

export function KpiFunctionReportClient({
  departments,
  functions,
  defaultDepartmentId,
  initialActiveOnly = false,
  autoPrint = false,
}: {
  departments: Department[];
  functions: KpiFunction[];
  defaultDepartmentId: string;
  initialActiveOnly?: boolean;
  autoPrint?: boolean;
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId);
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly);

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  function updateQuery(nextDept: string, nextActive: boolean) {
    const q = new URLSearchParams();
    q.set("departmentId", nextDept);
    if (nextActive) q.set("active", "1");
    router.replace(`/kpi/function-report?${q.toString()}`);
  }

  const groups = useMemo(
    () =>
      buildKpiFunctionReportGroups(
        departments,
        functions,
        departmentId,
        activeOnly,
      ),
    [departments, functions, departmentId, activeOnly],
  );

  const departmentText = departmentReportLabel(departmentId, departments);
  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    [],
  );

  const exportHref = (format: "xlsx" | "pdf") => {
    const q = new URLSearchParams({ format, departmentId });
    if (activeOnly) q.set("active", "1");
    return `/api/kpi/function-report/export?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 print:hidden sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={departmentId}
            onChange={(e) => {
              const v = e.target.value;
              setDepartmentId(v);
              updateQuery(v, activeOnly);
            }}
          >
            {departments.length > 1 ? (
              <option value="all">Semua departemen</option>
            ) : null}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              const v = e.target.checked;
              setActiveOnly(v);
              updateQuery(departmentId, v);
            }}
            className="mb-2.5 size-4 accent-[var(--brand)]"
          />
          <span className="text-ink-muted">Hanya fungsi aktif</span>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium"
          >
            Cetak
          </button>
          <a
            href={exportHref("xlsx")}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
          >
            Export Excel
          </a>
          <a
            href={exportHref("pdf")}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium"
          >
            Export PDF
          </a>
        </div>
      </div>

      <div className="print-report space-y-4">
        <div className="hidden print:block">
          <p className="text-xs tracking-wide text-ink-muted uppercase">
            Laporan Fungsi KPI
          </p>
          <p className="mt-1 text-xl font-semibold">{departmentText}</p>
          <p className="mt-1 text-xs text-ink-muted">Dicetak: {generatedAt}</p>
        </div>
        <p className="text-sm text-ink-muted print:hidden">
          Fungsi KPI dikelompokkan per departemen ·{" "}
          <strong>{departmentText}</strong>
        </p>

        {groups.map((g) => (
          <section
            key={g.departmentId}
            className="panel kpi-fn-print-group overflow-hidden"
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-semibold">{g.label}</h2>
                <p className="text-xs text-ink-muted">
                  {g.functions.length} fungsi
                  {activeOnly ? " aktif" : ` · ${g.activeCount} aktif`} · total
                  bobot aktif{" "}
                  <span
                    className={
                      Math.abs(g.activeWeightTotal - 100) < 0.01
                        ? "font-semibold text-ok"
                        : "font-semibold text-warn"
                    }
                  >
                    {formatWeight(g.activeWeightTotal)}
                  </span>
                </p>
              </div>
            </div>
            {g.functions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">
                Belum ada fungsi KPI untuk departemen ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                      <th className="w-10 px-4 py-2.5 font-medium">No</th>
                      <th className="px-4 py-2.5 font-medium">Fungsi KPI</th>
                      <th className="w-24 px-4 py-2.5 font-medium">Bobot</th>
                      <th className="w-24 px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Fokus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.functions.map((f, i) => (
                      <tr
                        key={f.id}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-4 py-2.5 text-ink-muted">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{f.name}</td>
                        <td className="px-4 py-2.5">
                          {formatWeight(f.weightPercent)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] ${
                              f.active
                                ? "bg-ok-soft text-ok"
                                : "bg-line text-ink-muted"
                            }`}
                          >
                            {f.active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-muted">
                          {f.focus || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
