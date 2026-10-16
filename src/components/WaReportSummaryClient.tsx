"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatCard } from "@/components/StatCard";
import {
  buildReportPeriodOptions,
  currentReportDate,
  formatReportMonth,
  monthStartDate,
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

interface WaMonthCell {
  period: string;
  count: number;
  photoCount: number;
  days: number;
}

interface WaUserMonthSummary {
  userId: string;
  userName: string;
  username: string;
  department: string;
  months: WaMonthCell[];
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
}

interface WaDateCount {
  count: number;
  photoCount: number;
}

interface WaUserDateSummary {
  userId: string;
  userName: string;
  username: string;
  department: string;
  byDate: Record<string, WaDateCount>;
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
}

interface WaReportStats {
  totalReports: number;
  totalWithPhoto: number;
  totalPhotos: number;
  uniqueUsers: number;
  uniqueDays: number;
}

interface ManagementContact {
  name: string;
  phone: string;
  departmentId: string;
}

interface WaReportSummaryClientProps {
  initialFrom: string;
  initialTo: string;
  periodsFromData: string[];
  departments: Department[];
  lockedDepartmentId?: string | null;
  managementContacts: ManagementContact[];
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

function isWeekend(isoDate: string): boolean {
  const d = new Date(isoDate + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
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

function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function WaReportSummaryClient({
  initialFrom,
  initialTo,
  periodsFromData,
  departments,
  lockedDepartmentId,
  managementContacts,
}: WaReportSummaryClientProps) {
  const [fromPeriod, setFromPeriod] = useState(initialFrom);
  const [toPeriod, setToPeriod] = useState(initialTo);
  const [dateFrom, setDateFrom] = useState(() => monthStartDate(initialTo));
  const [dateTo, setDateTo] = useState(() => currentReportDate());
  const [departmentId, setDepartmentId] = useState(
    lockedDepartmentId || "all",
  );
  const [view, setView] = useState<"summary" | "daily" | "detail">("summary");
  const [rows, setRows] = useState<WaReportRow[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<WaUserMonthSummary[]>(
    [],
  );
  const [dates, setDates] = useState<string[]>([]);
  const [dailySummary, setDailySummary] = useState<WaUserDateSummary[]>([]);
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<WaReportStats | null>(null);
  const [dailyStats, setDailyStats] = useState<WaReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingWa, setSendingWa] = useState(false);
  const [sendNote, setSendNote] = useState<{
    message: string;
    links: Array<{ name: string; href: string }>;
  } | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<{
    urls: string[];
    idx: number;
  } | null>(null);

  const periodOptions = useMemo(
    () => buildReportPeriodOptions(periodsFromData),
    [periodsFromData],
  );

  const monthTotals = useMemo(() => {
    return months.map((period) => {
      let count = 0;
      let photoCount = 0;
      for (const user of monthlySummary) {
        const cell = user.months.find((m) => m.period === period);
        count += cell?.count || 0;
        photoCount += cell?.photoCount || 0;
      }
      return { period, count, photoCount };
    });
  }, [months, monthlySummary]);

  const dateTotals = useMemo(() => {
    return dates.map((date) => {
      let count = 0;
      for (const user of dailySummary) count += user.byDate[date]?.count || 0;
      return { date, count };
    });
  }, [dates, dailySummary]);

  const dateMonthGroups = useMemo(() => {
    const groups: Array<{ period: string; label: string; span: number }> = [];
    for (const date of dates) {
      const period = date.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.period === period) last.span += 1;
      else groups.push({ period, label: formatReportMonth(period), span: 1 });
    }
    return groups;
  }, [dates]);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("from", fromPeriod);
    params.set("to", toPeriod);
    params.set("dateFrom", dateFrom);
    params.set("dateTo", dateTo);
    if (departmentId !== "all") params.set("departmentId", departmentId);

    fetch(`/api/kpi/wa-report-summary?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows || []);
        setMonths(data.months || []);
        setMonthlySummary(data.monthlySummary || []);
        setDates(data.dates || []);
        setDailySummary(data.dailySummary || []);
        setStats(data.stats || null);
        setDailyStats(data.dailyStats || null);
      })
      .catch(() => {
        setRows([]);
        setMonths([]);
        setMonthlySummary([]);
        setDates([]);
        setDailySummary([]);
        setStats(null);
        setDailyStats(null);
      })
      .finally(() => setLoading(false));
  }, [fromPeriod, toPeriod, dateFrom, dateTo, departmentId]);

  useEffect(() => {
    if (view !== "daily" || !dailyScrollRef.current) return;
    const firstHit = dates.find((date) =>
      dailySummary.some((user) => (user.byDate[date]?.count || 0) > 0),
    );
    if (!firstHit) return;
    const cell = dailyScrollRef.current.querySelector(
      `[data-date="${firstHit}"]`,
    );
    cell?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [view, dates, dailySummary]);

  // Group rows by date for accordion view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, WaReportRow[]>();
    for (const row of rows) {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date)!.push(row);
    }
    return [...map.entries()];
  }, [rows]);

  const reportKind = view === "daily" ? "daily" : view === "detail" ? "detail" : "month";
  const reportTitle =
    reportKind === "daily"
      ? "Laporan Bukti WhatsApp — Ringkasan per Tanggal"
      : reportKind === "detail"
        ? "Laporan Bukti WhatsApp — Detail per Hari"
        : "Laporan Bukti WhatsApp — Ringkasan per Bulan";
  const departmentLabel =
    departmentId === "all"
      ? "Semua departemen"
      : departments.find((d) => d.id === departmentId)?.name || "Departemen";
  const printedAt = useMemo(
    () =>
      new Date().toLocaleString("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    [],
  );

  const exportHref = (format: "xlsx" | "pdf") => {
    const params = new URLSearchParams({ format, report: reportKind });
    params.set("from", fromPeriod);
    params.set("to", toPeriod);
    params.set("dateFrom", dateFrom);
    params.set("dateTo", dateTo);
    if (departmentId !== "all") params.set("departmentId", departmentId);
    return `/api/kpi/wa-report-summary?${params.toString()}`;
  };

  const managementTargets = useMemo(() => {
    return managementContacts.flatMap((contact) => {
      const phone = toWhatsAppNumber(contact.phone);
      return phone ? [{ ...contact, wa: phone }] : [];
    });
  }, [managementContacts]);

  async function sendDailyPdfToManagement() {
    setSendNote(null);
    if (managementTargets.length === 0) {
      setSendNote({
        message:
          "Nomor telepon manajemen belum ada. Isi nomor HP pada data staf user yang rolenya Manager.",
        links: [],
      });
      return;
    }
    setSendingWa(true);
    try {
      const params = new URLSearchParams({ format: "pdf", report: "daily" });
      params.set("from", fromPeriod);
      params.set("to", toPeriod);
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      if (departmentId !== "all") params.set("departmentId", departmentId);
      const res = await fetch(`/api/kpi/wa-report-summary?${params.toString()}`);
      if (!res.ok) {
        setSendNote({
          message: "Gagal menyiapkan PDF ringkasan per tanggal.",
          links: [],
        });
        return;
      }
      const blob = await res.blob();
      const filename = `laporan-bukti-wa-tanggal-${dateFrom}-sd-${dateTo}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      const names = managementTargets
        .map((c) => `${c.name} (${c.phone})`)
        .join(", ");
      const text = [
        reportTitle,
        `Dari tanggal: ${formatDateLong(dateFrom)}`,
        `Sampai tanggal: ${formatDateLong(dateTo)}`,
        `Departemen: ${departmentLabel}`,
        `Dikirim ke: ${names}`,
      ].join("\n");

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: reportTitle, text });
          setSendNote({
            message: `PDF ringkasan per tanggal siap dikirim ke ${names}.`,
            links: [],
          });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      const caption = `${text}\n\nLampirkan file PDF yang baru diunduh: ${filename}`;
      const links = managementTargets.map((contact) => ({
        name: `${contact.name} (${contact.phone})`,
        href: `https://wa.me/${contact.wa}?text=${encodeURIComponent(caption)}`,
      }));
      window.open(links[0].href, "_blank", "noopener,noreferrer");
      setSendNote({
        message:
          managementTargets.length === 1
            ? `PDF diunduh. Chat WhatsApp ${managementTargets[0].name} dibuka — lampirkan file tersebut.`
            : `PDF diunduh. Chat WhatsApp ${managementTargets[0].name} dibuka. Buka chat nomor manajemen lain di bawah, lalu lampirkan file yang sama.`,
        links,
      });
    } catch {
      setSendNote({
        message: "Pengiriman dibatalkan atau gagal. Coba lagi.",
        links: [],
      });
    } finally {
      setSendingWa(false);
    }
  }

  const changeFrom = (value: string) => {
    setFromPeriod(value);
    if (value > toPeriod) setToPeriod(value);
  };

  const changeTo = (value: string) => {
    setToPeriod(value);
    if (value < fromPeriod) setFromPeriod(value);
  };

  const changeDateFrom = (value: string) => {
    if (!value) return;
    setDateFrom(value);
    if (value > dateTo) setDateTo(value);
  };

  const changeDateTo = (value: string) => {
    if (!value) return;
    setDateTo(value);
    if (value < dateFrom) setDateFrom(value);
  };

  const activeStats = view === "daily" ? dailyStats : stats;

  const toggleDate = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
    setExpandedUser(null);
  };

  const toggleUser = (key: string) => {
    setExpandedUser((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          @page { size: ${view === "detail" ? "A4 portrait" : "A4 landscape"}; margin: 10mm; }
          .wa-report-print,
          .wa-report-print table { overflow: visible !important; max-height: none !important; }
          .wa-report-print .sticky { position: static !important; }
        }
      `}</style>
      <div className="rounded-xl border border-line bg-bg-elevated/70 px-4 py-3">
        <h2 className="text-lg font-semibold">{reportTitle}</h2>
        <dl className="mt-2 space-y-0.5 text-sm text-ink-muted">
          {view === "daily" ? (
            <>
              <div>Dari tanggal: {formatDateLong(dateFrom)}</div>
              <div>Sampai tanggal: {formatDateLong(dateTo)}</div>
            </>
          ) : (
            <>
              <div>Dari periode: {formatReportMonth(fromPeriod)}</div>
              <div>Sampai periode: {formatReportMonth(toPeriod)}</div>
            </>
          )}
          <div>Departemen: {departmentLabel}</div>
          <div className="hidden print:block">Dicetak: {printedAt}</div>
        </dl>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 print:hidden">
        {view === "daily" ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">
                Dari tanggal
              </label>
              <input
                type="date"
                className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => changeDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">
                Sampai tanggal
              </label>
              <input
                type="date"
                className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => changeDateTo(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">
                Dari periode
              </label>
              <select
                className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={fromPeriod}
                onChange={(e) => changeFrom(e.target.value)}
              >
                {periodOptions.map((p) => (
                  <option key={`from-${p}`} value={p}>
                    {formatReportMonth(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">
                Sampai periode
              </label>
              <select
                className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={toPeriod}
                onChange={(e) => changeTo(e.target.value)}
              >
                {periodOptions.map((p) => (
                  <option key={`to-${p}`} value={p}>
                    {formatReportMonth(p)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

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

        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-line bg-bg-elevated px-4 py-2 text-sm font-medium"
          >
            Cetak
          </button>
          <a
            href={exportHref("xlsx")}
            className="inline-flex items-center gap-2 rounded-lg bg-ok/10 px-4 py-2 text-sm font-medium text-ok transition-colors hover:bg-ok/20"
          >
            Excel
          </a>
          <a
            href={exportHref("pdf")}
            className="rounded-lg border border-line bg-bg-elevated px-4 py-2 text-sm font-medium"
          >
            PDF
          </a>
          {view === "daily" ? (
            <button
              type="button"
              onClick={() => void sendDailyPdfToManagement()}
              disabled={sendingWa}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {sendingWa ? "Menyiapkan PDF..." : "Kirim ke Manajemen"}
            </button>
          ) : null}
        </div>
      </div>
      {sendNote ? (
        <div className="space-y-2 print:hidden">
          <p className="text-sm text-ink-muted">{sendNote.message}</p>
          {sendNote.links.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {sendNote.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-sm font-medium"
                >
                  WhatsApp {link.name}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stats */}
      {activeStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Laporan"
            value={String(activeStats.totalReports)}
          />
          <StatCard
            label="Dengan Bukti Foto"
            value={String(activeStats.totalWithPhoto)}
          />
          <StatCard
            label="Total Foto"
            value={String(activeStats.totalPhotos)}
          />
          <StatCard
            label="User Aktif"
            value={String(activeStats.uniqueUsers)}
          />
          <StatCard
            label="Hari Aktif"
            value={String(activeStats.uniqueDays)}
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
      {!loading && view !== "daily" && rows.length === 0 && (
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

      {!loading && (
        <div
          className="flex gap-1 rounded-xl border border-line bg-bg-elevated/60 p-1 print:hidden"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "summary"}
            onClick={() => setView("summary")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "summary"
                ? "bg-brand text-white"
                : "text-ink-muted hover:bg-brand-soft hover:text-ink"
            }`}
          >
            Ringkasan per bulan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "daily"}
            onClick={() => setView("daily")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "daily"
                ? "bg-brand text-white"
                : "text-ink-muted hover:bg-brand-soft hover:text-ink"
            }`}
          >
            Ringkasan per tanggal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "detail"}
            onClick={() => setView("detail")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "detail"
                ? "bg-brand text-white"
                : "text-ink-muted hover:bg-brand-soft hover:text-ink"
            }`}
          >
            Detail harian
          </button>
        </div>
      )}

      {!loading && view === "summary" && monthlySummary.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line bg-bg-elevated/70 px-4 py-3">
            <h3 className="font-semibold">{reportTitle}</h3>
            <p className="text-xs text-ink-muted">
              Dari periode {formatReportMonth(fromPeriod)} sampai{" "}
              {formatReportMonth(toPeriod)} · Departemen {departmentLabel}
            </p>
          </div>
          <div className="wa-report-print overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted uppercase">
                  <th className="sticky left-0 z-10 bg-bg-elevated px-3 py-2.5 font-medium">
                    Nama User
                  </th>
                  <th className="px-3 py-2.5 font-medium">Departemen</th>
                  {months.map((period) => (
                    <th
                      key={period}
                      className="px-3 py-2.5 text-center font-medium whitespace-nowrap"
                    >
                      {formatReportMonth(period)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                    Total Laporan
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium">Foto</th>
                  <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                    Hari Aktif
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-line last:border-0 transition-colors hover:bg-bg-elevated/30"
                  >
                    <td className="sticky left-0 z-10 bg-bg-elevated px-3 py-2.5">
                      <p className="font-medium">{user.userName}</p>
                      <p className="text-xs text-ink-muted">
                        {user.username ? `@${user.username}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">
                      {user.department}
                    </td>
                    {user.months.map((cell) => (
                      <td
                        key={`${user.userId}-${cell.period}`}
                        className="px-3 py-2.5 text-center"
                        title={
                          cell.count > 0
                            ? `${cell.count} laporan, ${cell.photoCount} foto, ${cell.days} hari`
                            : "Tidak ada laporan"
                        }
                      >
                        {cell.count > 0 ? (
                          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                            {cell.count}
                          </span>
                        ) : (
                          <span className="text-ink-muted/40">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {user.totalCount}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {user.totalPhotos > 0 ? (
                        <span className="rounded-md bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">
                          {user.totalPhotos}
                        </span>
                      ) : (
                        <span className="rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {user.totalDays}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-bg-elevated/50 text-sm font-semibold">
                  <td className="sticky left-0 z-10 bg-bg-elevated px-3 py-2.5">
                    Total
                  </td>
                  <td className="px-3 py-2.5" />
                  {monthTotals.map((cell) => (
                    <td
                      key={`total-${cell.period}`}
                      className="px-3 py-2.5 text-center"
                    >
                      {cell.count}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    {monthlySummary.reduce((sum, u) => sum + u.totalCount, 0)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {monthlySummary.reduce((sum, u) => sum + u.totalPhotos, 0)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {stats?.uniqueDays ?? ""}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && view === "daily" && dailySummary.length === 0 && (
        <div className="rounded-xl border border-line bg-bg-elevated/50 py-16 text-center">
          <p className="text-sm text-ink-muted">
            Tidak ada data bukti lapor WhatsApp untuk tanggal{" "}
            {formatDateShort(dateFrom)} sampai {formatDateShort(dateTo)}.
          </p>
        </div>
      )}

      {!loading && view === "daily" && dailySummary.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line bg-bg-elevated/70 px-4 py-3">
            <h3 className="font-semibold">{reportTitle}</h3>
            <p className="text-xs text-ink-muted">
              Dari tanggal {formatDateLong(dateFrom)} sampai{" "}
              {formatDateLong(dateTo)} · Departemen {departmentLabel}
            </p>
          </div>
          <div
            ref={dailyScrollRef}
            className="wa-report-print max-h-[70vh] overflow-auto print:max-h-none print:overflow-visible"
          >
            <table className="w-max border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-44" />
                <col className="w-36" />
                {dates.map((date) => (
                  <col key={`col-${date}`} className="w-10" />
                ))}
                <col className="w-14" />
                <col className="w-14" />
                <col className="w-14" />
              </colgroup>
              <thead className="sticky top-0 z-20">
                <tr className="text-xs text-ink-muted uppercase">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 border-b border-line bg-bg-elevated px-3 py-2.5 font-medium"
                  >
                    Nama User
                  </th>
                  <th
                    rowSpan={2}
                    className="border-b border-line bg-bg-elevated px-3 py-2.5 font-medium"
                  >
                    Departemen
                  </th>
                  {dateMonthGroups.map((group) => (
                    <th
                      key={group.period}
                      colSpan={group.span}
                      className="border-b border-l border-line bg-bg-elevated px-2 py-2 text-center font-medium whitespace-nowrap"
                    >
                      {group.label}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="w-14 border-b border-l border-line bg-bg-elevated px-1 py-2.5 text-center font-medium"
                  >
                    Total
                  </th>
                  <th
                    rowSpan={2}
                    className="w-14 border-b border-line bg-bg-elevated px-1 py-2.5 text-center font-medium"
                  >
                    Foto
                  </th>
                  <th
                    rowSpan={2}
                    className="w-14 border-b border-line bg-bg-elevated px-1 py-2.5 text-center font-medium"
                  >
                    Hari
                  </th>
                </tr>
                <tr className="text-[11px] text-ink-muted">
                  {dates.map((date) => (
                    <th
                      key={date}
                      data-date={date}
                      title={formatDateIndo(date)}
                      className={`w-10 min-w-10 border-b border-line px-0 py-1 text-center font-medium ${
                        isWeekend(date)
                          ? "bg-bg text-ink-muted/70"
                          : "bg-bg-elevated"
                      }`}
                    >
                      {Number(date.slice(8, 10))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((user) => (
                  <tr key={user.userId} className="hover:bg-bg-elevated/30">
                    <td className="sticky left-0 z-10 border-b border-line bg-bg-elevated px-3 py-2">
                      <p className="font-medium whitespace-nowrap">
                        {user.userName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {user.username ? `@${user.username}` : ""}
                      </p>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-xs text-ink-muted whitespace-nowrap">
                      {user.department}
                    </td>
                    {dates.map((date) => {
                      const count = user.byDate[date]?.count || 0;
                      const photos = user.byDate[date]?.photoCount || 0;
                      return (
                        <td
                          key={`${user.userId}-${date}`}
                          title={
                            count > 0
                              ? `${formatDateIndo(date)}: ${count} laporan, ${photos} foto`
                              : `${formatDateIndo(date)}: tidak ada laporan`
                          }
                          className={`w-10 min-w-10 border-b border-line px-0 py-2 text-center ${
                            isWeekend(date) ? "bg-bg/60" : ""
                          }`}
                        >
                          {count > 0 ? (
                            <span className="inline-flex min-w-5 justify-center rounded bg-brand/10 px-1 text-xs font-medium text-brand">
                              {count}
                            </span>
                          ) : (
                            <span className="text-ink-muted/30">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="w-14 border-b border-l border-line px-1 py-2 text-center font-semibold">
                      {user.totalCount}
                    </td>
                    <td className="w-14 border-b border-line px-1 py-2 text-center">
                      {user.totalPhotos > 0 ? (
                        <span className="rounded-md bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">
                          {user.totalPhotos}
                        </span>
                      ) : (
                        <span className="rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                          0
                        </span>
                      )}
                    </td>
                    <td className="w-14 border-b border-line px-1 py-2 text-center text-xs">
                      {user.totalDays}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-20">
                <tr className="text-sm font-semibold">
                  <td className="sticky left-0 z-30 border-t border-line bg-bg-elevated px-3 py-2">
                    Total
                  </td>
                  <td className="border-t border-line bg-bg-elevated px-3 py-2" />
                  {dateTotals.map((cell) => (
                    <td
                      key={`total-${cell.date}`}
                      className={`w-10 min-w-10 border-t border-line bg-bg-elevated px-0 py-2 text-center text-xs ${
                        isWeekend(cell.date) ? "text-ink-muted" : ""
                      }`}
                    >
                      {cell.count > 0 ? cell.count : ""}
                    </td>
                  ))}
                  <td className="w-14 border-t border-l border-line bg-bg-elevated px-1 py-2 text-center">
                    {dailySummary.reduce((sum, u) => sum + u.totalCount, 0)}
                  </td>
                  <td className="w-14 border-t border-line bg-bg-elevated px-1 py-2 text-center">
                    {dailySummary.reduce((sum, u) => sum + u.totalPhotos, 0)}
                  </td>
                  <td className="w-14 border-t border-line bg-bg-elevated px-1 py-2 text-center">
                    {dailyStats?.uniqueDays ?? ""}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Report Accordion */}
      {!loading && view === "detail" && groupedByDate.length > 0 && (
        <div className="space-y-3 print:hidden">
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
      {!loading && view === "detail" && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line bg-bg-elevated/70 px-4 py-3">
            <h3 className="font-semibold">{reportTitle}</h3>
            <p className="text-xs text-ink-muted">
              Dari periode {formatReportMonth(fromPeriod)} sampai{" "}
              {formatReportMonth(toPeriod)} · Departemen {departmentLabel}
            </p>
          </div>
          <div className="wa-report-print overflow-x-auto">
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
