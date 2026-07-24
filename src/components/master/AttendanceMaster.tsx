"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDisciplinePeriodLabel } from "@/lib/discipline-period";
import type { AttendancePeriodSummary, Department, StaffMember } from "@/lib/types";

type SummaryRow = AttendancePeriodSummary & { staff: StaffMember | null };

export function AttendanceMaster({
  departments,
  initialSummaries,
  periods,
}: {
  departments: Department[];
  initialSummaries: SummaryRow[];
  periods: string[];
}) {
  const router = useRouter();
  const [summaries, setSummaries] = useState(initialSummaries);
  const [periodList, setPeriodList] = useState(periods);
  const [deptFilter, setDeptFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState(periods[0] ?? "all");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      if (deptFilter !== "all" && s.staff?.departmentId !== deptFilter) {
        return false;
      }
      if (periodFilter !== "all" && s.periodLabel !== periodFilter) {
        return false;
      }
      return true;
    });
  }, [summaries, deptFilter, periodFilter]);

  const avgScore =
    filtered.length === 0
      ? null
      : filtered.reduce((sum, s) => sum + s.disciplineScore, 0) / filtered.length;

  async function importFromDisk() {
    setImporting(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/master/attendance/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setError(data.error || "Gagal impor template.xlsx");
      return;
    }
    applyImportResult(data.result);
  }

  async function importUpload(file: File) {
    setImporting(true);
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/master/attendance/import", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setError(data.error || "Gagal unggah/impor Excel");
      return;
    }
    applyImportResult(data.result);
  }

  function applyImportResult(result: {
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
    unknownCodes?: string[];
    periods?: string[];
    staffCount: number;
  }) {
    const unknown =
      result.unknownCodes && result.unknownCodes.length
        ? ` · NIK tidak ketemu: ${result.unknownCodes.join(", ")}`
        : "";
    setMessage(
      `Impor OK: ${result.totalRows} baris · ${result.imported} baru · ${result.updated} update · ${result.skipped} dilewati · ${result.staffCount} staf${unknown}`,
    );
    if (result.periods?.length) {
      setPeriodList((prev) =>
        [...new Set([...result.periods!, ...prev])].sort().reverse(),
      );
      setPeriodFilter(result.periods[0]);
    }
    router.refresh();
    // reload summaries
    void refreshList(result.periods?.[0]);
  }

  async function refreshList(period?: string) {
    const q = new URLSearchParams();
    if (period) q.set("periodLabel", period);
    const res = await fetch(`/api/kpi/attendance?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSummaries(data.summaries || []);
      if (data.periods) setPeriodList(data.periods);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">Impor absensi dari Excel</h2>
        <p className="text-sm text-ink-muted">
          Mendukung format export absensi HR (
          <strong>template.xlsx</strong> — sheet Export Attendance) dan template
          sederhana. Kolom utama: <strong>Employee ID / NIK</strong>,{" "}
          <strong>Date / Tanggal</strong>, Check In/Out, Schedule In/Out,
          Shift, Attendance Code, Time Off Code, Overtime.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/master/attendance/template"
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-bg-elevated"
          >
            Download template sederhana
          </a>
          <button
            type="button"
            onClick={importFromDisk}
            disabled={importing}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {importing ? "Mengimpor..." : "Import template.xlsx"}
          </button>
          <label className="cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-bg-elevated">
            {importing ? "Mengunggah..." : "Unggah file Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {message ? <p className="text-sm text-ok">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <div className="panel grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Filter departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">
            Periode disiplin (tgl 21 – 20)
          </span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value);
              void refreshList(
                e.target.value === "all" ? undefined : e.target.value,
              );
            }}
          >
            <option value="all">Semua periode</option>
            {periodList.map((p) => (
              <option key={p} value={p}>
                {formatDisciplinePeriodLabel(p)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">
            Tidak perlu menambah periode manual. Daftar sudah mencakup tahun
            lalu–depan (termasuk Agustus/Desember). Skor muncul setelah Anda
            impor Excel yang berisi tanggal di rentang periode itu.
          </p>
        </label>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-semibold">Skor kedisiplinan</h2>
            <p className="text-xs text-ink-muted">
              Dihitung dari absensi, keterlambatan, dan lembur · otomatis masuk
              penilaian KPI &quot;Kedisiplinan &amp; Kehadiran&quot;
            </p>
          </div>
          {avgScore != null ? (
            <p className="text-sm font-semibold text-brand">
              Rata-rata: {avgScore.toFixed(1)}
            </p>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            Belum ada data. Impor Excel absensi terlebih dahulu.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Staf</th>
                  <th className="px-4 py-2.5 font-medium">Periode</th>
                  <th className="px-4 py-2.5 font-medium">Hadir</th>
                  <th className="px-4 py-2.5 font-medium">Absen</th>
                  <th className="px-4 py-2.5 font-medium">Telat</th>
                  <th className="px-4 py-2.5 font-medium">Lembur</th>
                  <th className="px-4 py-2.5 font-medium">Skor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.staff?.name ?? "—"}</p>
                      <p className="text-xs text-ink-muted">
                        {s.staff?.employeeCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs leading-snug">
                      {formatDisciplinePeriodLabel(s.periodLabel)}
                    </td>
                    <td className="px-4 py-3">
                      {s.presentDays}/{s.workDays}
                    </td>
                    <td className="px-4 py-3">{s.absentDays}</td>
                    <td className="px-4 py-3">
                      {s.lateCount}x · {s.totalLateMinutes} mnt
                    </td>
                    <td className="px-4 py-3">{s.totalOvertimeMinutes} mnt</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          s.disciplineScore >= 80
                            ? "text-ok"
                            : s.disciplineScore >= 60
                              ? "text-warn"
                              : "text-danger"
                        }`}
                      >
                        {s.disciplineScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
