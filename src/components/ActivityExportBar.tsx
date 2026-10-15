"use client";

import {
  ACTIVITY_EXPORT_FREQ_OPTIONS,
  type ActivityExportFreq,
  type ActivityExportProgress,
} from "@/lib/activity-report";

export function ActivityExportBar({
  departmentId,
  exportFreq,
  onExportFreqChange,
  progress,
}: {
  departmentId: string;
  exportFreq: ActivityExportFreq;
  onExportFreqChange: (value: ActivityExportFreq) => void;
  progress: ActivityExportProgress;
}) {
  const exportHref = (format: "xlsx" | "pdf") => {
    const q = new URLSearchParams({
      format,
      departmentId,
      freq: exportFreq,
      progress,
    });
    return `/api/kpi/activities/export?${q.toString()}`;
  };

  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <label className="text-sm">
        <span className="text-xs text-ink-muted">
          Jenis file (Harian / Mingguan / Bulanan)
        </span>
        <select
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm sm:w-52"
          value={exportFreq}
          onChange={(e) =>
            onExportFreqChange(e.target.value as ActivityExportFreq)
          }
        >
          {ACTIVITY_EXPORT_FREQ_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium"
        >
          Cetak
        </button>
        <a
          href={exportHref("xlsx")}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Export Excel
        </a>
        <a
          href={exportHref("pdf")}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium"
        >
          Export PDF
        </a>
      </div>
    </div>
  );
}
