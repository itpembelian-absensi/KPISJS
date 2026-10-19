"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatDisciplinePeriodLabel,
  resolveDisciplineDeleteRange,
  type DisciplineDeleteUnit,
} from "@/lib/discipline-period";
import type { AttendancePeriodSummary, Department, StaffMember } from "@/lib/types";

type SummaryRow = AttendancePeriodSummary & { staff: StaffMember | null };

export function AttendanceMaster({
  departments,
  staff,
  initialSummaries,
  periods,
}: {
  departments: Department[];
  staff: StaffMember[];
  initialSummaries: SummaryRow[];
  periods: string[];
}) {
  const router = useRouter();
  const [summaries, setSummaries] = useState(initialSummaries);
  const [periodList, setPeriodList] = useState(periods);
  const [deptFilter, setDeptFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState(periods[0] ?? "all");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"staff" | "all">("staff");
  const [deleteStaffId, setDeleteStaffId] = useState("");
  const [deleteUnit, setDeleteUnit] = useState<DisciplineDeleteUnit>("day");
  const [deleteDate, setDeleteDate] = useState("");
  const [deleteMonth, setDeleteMonth] = useState("");
  const [deletePeriod, setDeletePeriod] = useState(periods[0] ?? "");

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

  const staffOptions = useMemo(() => {
    const list =
      deptFilter === "all"
        ? staff
        : staff.filter((s) => s.departmentId === deptFilter);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [staff, deptFilter]);

  const deleteAnchor =
    deleteUnit === "month"
      ? deleteMonth
      : deleteUnit === "period"
        ? deletePeriod
        : deleteDate;

  const deletePreview = useMemo(() => {
    if (!deleteAnchor) return null;
    const range = resolveDisciplineDeleteRange(deleteUnit, deleteAnchor);
    return "error" in range ? null : range;
  }, [deleteUnit, deleteAnchor]);

  const deleteStaff = staff.find((s) => s.id === deleteStaffId) ?? null;

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
    staffCreated?: number;
    createdStaff?: Array<{ employeeCode: string; name: string }>;
  }) {
    const created =
      result.staffCreated && result.staffCreated > 0
        ? ` · ${result.staffCreated} staf baru: ${(result.createdStaff || [])
            .map((s) => s.employeeCode)
            .join(", ")}`
        : "";
    const unknown =
      result.unknownCodes && result.unknownCodes.length
        ? ` · NIK tanpa nama (tidak dibuat): ${result.unknownCodes.join(", ")}`
        : "";
    setMessage(
      `Impor OK: ${result.totalRows} baris · ${result.imported} baru · ${result.updated} update · ${result.skipped} dilewati · ${result.staffCount} staf${created}${unknown}`,
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

  async function deleteDiscipline(input: {
    scope: "staff" | "all";
    staffId?: string;
    unit: DisciplineDeleteUnit;
    anchor: string;
    who: string;
    label: string;
  }) {
    const who =
      input.scope === "all" ? "SEMUA staf" : input.who || "staf yang dipilih";
    const ok = window.confirm(
      `Hapus data kedisiplinan ${who} pada ${input.label}?\n\nBaris absensi pada rentang itu akan dihapus. Skor periode dan penilaian Kedisiplinan & Kehadiran dihitung ulang. Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/master/attendance/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: input.scope,
        staffId: input.staffId,
        unit: input.unit,
        anchor: input.anchor,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      setError(data.error || "Gagal menghapus data kedisiplinan");
      return;
    }
    const result = data.result as {
      deletedRecords?: number;
      deletedSummaries?: number;
      label?: string;
      staffCount?: number;
    };
    const deletedRecords = result?.deletedRecords ?? 0;
    const deletedSummaries = result?.deletedSummaries ?? 0;
    if (!deletedRecords && !deletedSummaries) {
      setMessage(
        `Tidak ada data absensi pada ${result?.label || input.label}.`,
      );
      return;
    }
    const removed = [
      deletedRecords ? `${deletedRecords} baris absensi` : "",
      deletedSummaries ? `${deletedSummaries} ringkasan skor` : "",
    ]
      .filter(Boolean)
      .join(" dan ");
    setMessage(
      `Terhapus ${removed} · ${result?.staffCount ?? 0} staf · ${result?.label || input.label}. Skor periode dihitung ulang.`,
    );
    router.refresh();
    void refreshList(periodFilter === "all" ? undefined : periodFilter);
  }

  function submitDelete() {
    if (!deletePreview) {
      setError("Lengkapi tanggal, minggu, bulan, atau periode yang akan dihapus.");
      return;
    }
    if (deleteScope === "staff" && !deleteStaffId) {
      setError("Pilih staf yang datanya akan dihapus.");
      return;
    }
    void deleteDiscipline({
      scope: deleteScope,
      staffId: deleteScope === "staff" ? deleteStaffId : undefined,
      unit: deleteUnit,
      anchor: deleteAnchor,
      who: deleteStaff
        ? `${deleteStaff.name} (${deleteStaff.employeeCode})`
        : "",
      label: deletePreview.label,
    });
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
          Shift, Attendance Code, Time Off Code, Overtime. Karyawan baru di
          file (Employee ID + nama) otomatis ditambahkan ke Master Staf.
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

      <div className="panel space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Hapus data kedisiplinan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Menghapus baris absensi, lalu skor periode (tanggal 21–20) dan
            penilaian fungsi Kedisiplinan &amp; Kehadiran dihitung ulang.
            Minggu dihitung Senin–Minggu. Bulan kalender adalah tanggal 1
            sampai akhir bulan. Periode disiplin adalah tanggal 21 sampai 20
            bulan berikutnya.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="text-xs text-ink-muted">Cakupan</span>
            <select
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              value={deleteScope}
              onChange={(e) =>
                setDeleteScope(e.target.value === "all" ? "all" : "staff")
              }
            >
              <option value="staff">Satu staf</option>
              <option value="all">Semua staf</option>
            </select>
          </label>
          {deleteScope === "staff" ? (
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Staf</span>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                value={deleteStaffId}
                onChange={(e) => setDeleteStaffId(e.target.value)}
              >
                <option value="">Pilih staf</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.employeeCode} — {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="self-end rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              Semua staf pada rentang yang dipilih akan terhapus.
            </p>
          )}
          <label className="text-sm">
            <span className="text-xs text-ink-muted">Satuan</span>
            <select
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              value={deleteUnit}
              onChange={(e) =>
                setDeleteUnit(e.target.value as DisciplineDeleteUnit)
              }
            >
              <option value="day">Per hari</option>
              <option value="week">Per minggu</option>
              <option value="month">Per bulan kalender</option>
              <option value="period">Per periode disiplin (21–20)</option>
            </select>
          </label>
          {deleteUnit === "month" ? (
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Bulan</span>
              <input
                type="month"
                value={deleteMonth}
                onChange={(e) => setDeleteMonth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              />
            </label>
          ) : deleteUnit === "period" ? (
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Periode disiplin</span>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                value={deletePeriod}
                onChange={(e) => setDeletePeriod(e.target.value)}
              >
                <option value="">Pilih periode</option>
                {periodList.map((p) => (
                  <option key={p} value={p}>
                    {formatDisciplinePeriodLabel(p)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm">
              <span className="text-xs text-ink-muted">
                {deleteUnit === "week" ? "Tanggal di dalam minggu" : "Tanggal"}
              </span>
              <input
                type="date"
                value={deleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              />
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submitDelete}
            disabled={deleting || importing}
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Hapus data"}
          </button>
          {periodFilter !== "all" ? (
            <button
              type="button"
              disabled={deleting || importing}
              onClick={() =>
                void deleteDiscipline({
                  scope: "all",
                  unit: "period",
                  anchor: periodFilter,
                  who: "SEMUA staf",
                  label: `periode disiplin ${formatDisciplinePeriodLabel(periodFilter)}`,
                })
              }
              className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              Hapus semua staf pada periode yang difilter
            </button>
          ) : null}
          {deletePreview ? (
            <p className="text-xs text-ink-muted">
              Rentang: {deletePreview.label}
            </p>
          ) : null}
        </div>
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Staf</th>
                  <th className="px-4 py-2.5 font-medium">Periode</th>
                  <th className="px-4 py-2.5 font-medium">Hadir</th>
                  <th className="px-4 py-2.5 font-medium">Absen</th>
                  <th className="px-4 py-2.5 font-medium">Telat</th>
                  <th className="px-4 py-2.5 font-medium">Lembur</th>
                  <th className="px-4 py-2.5 font-medium">Skor</th>
                  <th className="px-4 py-2.5 font-medium">Aksi</th>
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={deleting || importing}
                        onClick={() =>
                          void deleteDiscipline({
                            scope: "staff",
                            staffId: s.staffId,
                            unit: "period",
                            anchor: s.periodLabel,
                            who: s.staff
                              ? `${s.staff.name} (${s.staff.employeeCode})`
                              : "staf ini",
                            label: `periode disiplin ${formatDisciplinePeriodLabel(s.periodLabel)}`,
                          })
                        }
                        className="rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        Hapus periode
                      </button>
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
