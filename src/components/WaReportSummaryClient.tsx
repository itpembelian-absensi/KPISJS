"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  buildReportPeriodOptions,
  formatReportMonth,
} from "@/lib/report-period";
import type { Department } from "@/lib/types";

interface WaReportRow {
  date: string;
  userId: string;
  userName: string;
  username: string;
  department: string;
  count: number;
  titles: string;
  leaderNames: string;
  hasPhoto: boolean;
  photoCount: number;
  reports: Array<{
    id: string;
    title: string;
    leaderName: string;
    reportDate: string;
    photoUrls: string[];
    status: string;
    notes: string;
  }>;
}

interface WaReportStats {
  totalReports: number;
  totalWithPhoto: number;
  totalPhotos: number;
  uniqueUsers: number;
  uniqueDays: number;
}

interface WaReportSummaryClientProps {
  initialPeriod: string;
  periodsFromData: string[];
  departments: Department[];
  lockedDepartmentId?: string | null;
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function WaReportSummaryClient({
  initialPeriod,
  periodsFromData,
  departments,
  lockedDepartmentId,
}: WaReportSummaryClientProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [departmentId, setDepartmentId] = useState(
    lockedDepartmentId || "all",
  );
  const [rows, setRows] = useState<WaReportRow[]>([]);
  const [stats, setStats] = useState<WaReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<{
    urls: string[];
    idx: number;
  } | null>(null);

  const periodOptions = useMemo(
    () => ["all", ...buildReportPeriodOptions(periodsFromData)],
    [periodsFromData],
  );

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (departmentId !== "all") params.set("departmentId", departmentId);

    fetch(`/api/kpi/wa-report-summary?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows || []);
        setStats(data.stats || null);
      })
      .catch(() => {
        setRows([]);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [period, departmentId]);

  // Group rows by date for accordion view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, WaReportRow[]>();
    for (const row of rows) {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date)!.push(row);
    }
    return [...map.entries()];
  }, [rows]);

  // Export URL
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ format: "xlsx" });
    if (period !== "all") params.set("period", period);
    if (departmentId !== "all") params.set("departmentId", departmentId);
    return `/api/kpi/wa-report-summary?${params.toString()}`;
  }, [period, departmentId]);

  const toggleDate = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
    setExpandedUser(null);
  };

  const toggleUser = (key: string) => {
    setExpandedUser((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Periode</label>
          <select
            className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Semua Periode</option>
            {periodOptions
              .filter((p) => p !== "all")
              .map((p) => (
                <option key={p} value={p}>
                  {formatReportMonth(p)}
                </option>
              ))}
          </select>
        </div>

        {!lockedDepartmentId && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">
              Departemen
            </label>
            <select
              className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="all">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-end">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-ok/10 px-4 py-2 text-sm font-medium text-ok transition-colors hover:bg-ok/20"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Excel
          </a>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Laporan"
            value={String(stats.totalReports)}
          />
          <StatCard
            label="Dengan Bukti Foto"
            value={String(stats.totalWithPhoto)}
          />
          <StatCard
            label="Total Foto"
            value={String(stats.totalPhotos)}
          />
          <StatCard
            label="User Aktif"
            value={String(stats.uniqueUsers)}
          />
          <StatCard
            label="Hari Aktif"
            value={String(stats.uniqueDays)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="ml-3 text-sm text-ink-muted">Memuat data...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-line bg-bg-elevated/50 py-16 text-center">
          <svg
            className="mx-auto h-12 w-12 text-ink-muted/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="mt-3 text-sm text-ink-muted">
            Tidak ada data bukti lapor WhatsApp untuk periode ini.
          </p>
        </div>
      )}

      {/* Report Accordion */}
      {!loading && groupedByDate.length > 0 && (
        <div className="space-y-3">
          {groupedByDate.map(([date, dateRows]) => {
            const isDateExpanded = expandedDate === date;
            const totalReportsDay = dateRows.reduce(
              (sum, r) => sum + r.count,
              0,
            );
            const totalPhotosDay = dateRows.reduce(
              (sum, r) => sum + r.photoCount,
              0,
            );

            return (
              <div
                key={date}
                className="overflow-hidden rounded-xl border border-line transition-shadow hover:shadow-md"
              >
                {/* Date Header */}
                <button
                  type="button"
                  onClick={() => toggleDate(date)}
                  className="flex w-full items-center justify-between gap-3 bg-bg-elevated/80 px-4 py-3 text-left transition-colors hover:bg-bg-elevated"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">{formatDateIndo(date)}</p>
                      <p className="text-xs text-ink-muted">
                        {dateRows.length} user · {totalReportsDay} laporan ·{" "}
                        {totalPhotosDay} foto
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 text-ink-muted transition-transform ${
                      isDateExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>

                {/* User rows */}
                {isDateExpanded && (
                  <div className="divide-y divide-line">
                    {dateRows.map((row) => {
                      const userKey = `${date}:${row.userId}`;
                      const isUserExpanded = expandedUser === userKey;

                      return (
                        <div key={userKey}>
                          {/* User summary row */}
                          <button
                            type="button"
                            onClick={() => toggleUser(userKey)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-elevated/40"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                                {(row.userName || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{row.userName}</p>
                                <p className="text-xs text-ink-muted">
                                  {row.username ? `@${row.username} · ` : ""}
                                  {row.department}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                                  {row.count} laporan
                                </span>
                                {row.photoCount > 0 && (
                                  <span className="rounded-md bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">
                                    {row.photoCount} foto
                                  </span>
                                )}
                                {!row.hasPhoto && (
                                  <span className="rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                                    Belum ada foto
                                  </span>
                                )}
                              </div>
                              <svg
                                className={`h-4 w-4 text-ink-muted transition-transform ${
                                  isUserExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                />
                              </svg>
                            </div>
                          </button>

                          {/* Detail reports */}
                          {isUserExpanded && (
                            <div className="border-t border-line bg-bg-base/50 px-4 py-3">
                              <div className="space-y-3">
                                {row.reports.map((report) => (
                                  <div
                                    key={report.id}
                                    className="rounded-lg border border-line bg-bg-elevated/60 p-3"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {report.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                          Pimpinan:{" "}
                                          <span className="font-medium">
                                            {report.leaderName}
                                          </span>{" "}
                                          ·{" "}
                                          {new Date(
                                            report.reportDate,
                                          ).toLocaleString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                        {report.notes && (
                                          <p className="mt-1 text-xs text-ink-muted italic">
                                            {report.notes}
                                          </p>
                                        )}
                                      </div>
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                          report.status === "acknowledged"
                                            ? "bg-ok-soft text-ok"
                                            : "bg-warn-soft text-warn"
                                        }`}
                                      >
                                        {report.status === "acknowledged"
                                          ? "Diterima"
                                          : "Dilaporkan"}
                                      </span>
                                    </div>

                                    {/* Photos */}
                                    {report.photoUrls &&
                                      report.photoUrls.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {report.photoUrls.map((url, i) => (
                                            <button
                                              key={`${report.id}-photo-${i}`}
                                              type="button"
                                              onClick={() =>
                                                setPhotoModal({
                                                  urls: report.photoUrls,
                                                  idx: i,
                                                })
                                              }
                                              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-line transition-transform hover:scale-105"
                                            >
                                              <img
                                                src={url}
                                                alt={`Bukti foto ${i + 1}`}
                                                className="h-full w-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    {(!report.photoUrls ||
                                      report.photoUrls.length === 0) && (
                                      <p className="mt-2 text-xs text-ink-muted/60 italic">
                                        Belum ada bukti foto
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary table view */}
      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line bg-bg-elevated/70 px-4 py-3">
            <h3 className="font-semibold">Ringkasan Tabel</h3>
            <p className="text-xs text-ink-muted">
              Daftar lengkap bukti lapor per hari per user
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted uppercase">
                  <th className="px-3 py-2.5 font-medium">Tanggal</th>
                  <th className="px-3 py-2.5 font-medium">Nama User</th>
                  <th className="px-3 py-2.5 font-medium">Username</th>
                  <th className="px-3 py-2.5 font-medium">Departemen</th>
                  <th className="px-3 py-2.5 font-medium text-center">
                    Laporan
                  </th>
                  <th className="px-3 py-2.5 font-medium text-center">
                    Foto
                  </th>
                  <th className="px-3 py-2.5 font-medium">Pimpinan</th>
                  <th className="px-3 py-2.5 font-medium">Perihal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`table-${row.date}-${row.userId}-${i}`}
                    className="border-b border-line last:border-0 transition-colors hover:bg-bg-elevated/30"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatDateShort(row.date)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{row.userName}</td>
                    <td className="px-3 py-2.5 text-ink-muted text-xs">
                      {row.username ? `@${row.username}` : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">
                      {row.department}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.photoCount > 0 ? (
                        <span className="rounded-md bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">
                          {row.photoCount}
                        </span>
                      ) : (
                        <span className="rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">
                      {row.leaderNames || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted max-w-[200px] truncate">
                      {row.titles || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photoModal.urls[photoModal.idx]}
              alt="Bukti foto"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            />
            {/* Navigation */}
            {photoModal.urls.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPhotoModal((p) =>
                      p
                        ? {
                            ...p,
                            idx:
                              (p.idx - 1 + p.urls.length) % p.urls.length,
                          }
                        : null,
                    )
                  }
                  className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-black shadow-lg hover:bg-white"
                >
                  ← Sebelumnya
                </button>
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {photoModal.idx + 1} / {photoModal.urls.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoModal((p) =>
                      p
                        ? {
                            ...p,
                            idx: (p.idx + 1) % p.urls.length,
                          }
                        : null,
                    )
                  }
                  className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-black shadow-lg hover:bg-white"
                >
                  Berikutnya →
                </button>
              </div>
            )}
            {/* Close */}
            <button
              type="button"
              onClick={() => setPhotoModal(null)}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 text-black shadow-lg hover:bg-red-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
