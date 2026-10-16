import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getCompanyName } from "@/lib/branding";
import {
  datesBetween,
  formatReportMonth,
  monthsBetween,
  normalizeDateRange,
  normalizePeriodRange,
} from "@/lib/report-period";
import { buildWaReportSummaryPdf } from "@/lib/wa-report-summary-pdf";
import { getUserBySessionToken, listDepartments } from "@/lib/store";
import { listKpiWaReports } from "@/lib/wa-report-ops";
import type { KpiWaReport, Department } from "@/lib/types";

export const runtime = "nodejs";

/** Kelompokkan laporan per hari per user */
function groupByDayUser(
  reports: KpiWaReport[],
  departments: Department[],
) {
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  /** dateKey -> userId -> reports */
  const grouped = new Map<string, Map<string, KpiWaReport[]>>();

  for (const r of reports) {
    const dateKey = (r.reportDate || r.createdAt || "").slice(0, 10);
    if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
    const dayMap = grouped.get(dateKey)!;
    const key = r.userId || r.username || r.userName;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(r);
  }

  // Build rows sorted by date DESC then user
  const rows: Array<{
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
    reports: KpiWaReport[];
  }> = [];

  const sortedDates = [...grouped.keys()].sort().reverse();
  for (const date of sortedDates) {
    const dayMap = grouped.get(date)!;
    const users = [...dayMap.entries()].sort((a, b) =>
      (a[1][0]?.userName || "").localeCompare(b[1][0]?.userName || ""),
    );
    for (const [userId, userReports] of users) {
      const first = userReports[0];
      const deptName = deptMap.get(first.departmentId) || "-";
      const totalPhotos = userReports.reduce(
        (sum, r) => sum + (r.photoUrls?.length || 0),
        0,
      );
      const leaders = [
        ...new Set(userReports.map((r) => r.leaderName).filter(Boolean)),
      ];
      rows.push({
        date,
        userId,
        userName: first.userName || first.username || userId,
        username: first.username || "",
        department: deptName,
        count: userReports.length,
        titles: userReports.map((r) => r.title).join("; "),
        leaderNames: leaders.join(", "),
        hasPhoto: totalPhotos > 0,
        photoCount: totalPhotos,
        reports: userReports,
      });
    }
  }

  return rows;
}

export interface WaMonthCell {
  period: string;
  count: number;
  photoCount: number;
  days: number;
}

export interface WaUserMonthSummary {
  userId: string;
  userName: string;
  username: string;
  department: string;
  months: WaMonthCell[];
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
}

/** Ringkasan jumlah laporan per user per bulan dalam rentang periode. */
function groupByUserMonth(
  reports: KpiWaReport[],
  departments: Department[],
  months: string[],
): WaUserMonthSummary[] {
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  type Bucket = {
    userId: string;
    userName: string;
    username: string;
    departments: Set<string>;
    byMonth: Map<string, { count: number; photoCount: number; days: Set<string> }>;
  };

  const users = new Map<string, Bucket>();

  for (const r of reports) {
    const raw = r.reportDate || r.createdAt || "";
    const ym = raw.slice(0, 7);
    if (!months.includes(ym)) continue;
    const date = raw.slice(0, 10);
    const key = r.userId || r.username || r.userName;
    if (!users.has(key)) {
      users.set(key, {
        userId: key,
        userName: r.userName || r.username || key,
        username: r.username || "",
        departments: new Set(),
        byMonth: new Map(),
      });
    }
    const bucket = users.get(key)!;
    if (r.userName) bucket.userName = r.userName;
    if (r.username) bucket.username = r.username;
    const deptName = deptMap.get(r.departmentId);
    if (deptName) bucket.departments.add(deptName);
    if (!bucket.byMonth.has(ym)) {
      bucket.byMonth.set(ym, { count: 0, photoCount: 0, days: new Set() });
    }
    const cell = bucket.byMonth.get(ym)!;
    cell.count += 1;
    cell.photoCount += r.photoUrls?.length || 0;
    if (date) cell.days.add(date);
  }

  return [...users.values()]
    .map((bucket) => {
      const monthCells: WaMonthCell[] = months.map((period) => {
        const cell = bucket.byMonth.get(period);
        return {
          period,
          count: cell?.count || 0,
          photoCount: cell?.photoCount || 0,
          days: cell?.days.size || 0,
        };
      });
      const allDays = new Set<string>();
      for (const cell of bucket.byMonth.values()) {
        for (const d of cell.days) allDays.add(d);
      }
      return {
        userId: bucket.userId,
        userName: bucket.userName,
        username: bucket.username,
        department: [...bucket.departments].sort().join(", ") || "-",
        months: monthCells,
        totalCount: monthCells.reduce((sum, c) => sum + c.count, 0),
        totalPhotos: monthCells.reduce((sum, c) => sum + c.photoCount, 0),
        totalDays: allDays.size,
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName, "id"));
}

export interface WaDateCount {
  count: number;
  photoCount: number;
}

export interface WaUserDateSummary {
  userId: string;
  userName: string;
  username: string;
  department: string;
  byDate: Record<string, WaDateCount>;
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
}

/** Ringkasan jumlah laporan per user pada tiap tanggal dalam rentang. */
function groupByUserDate(
  reports: KpiWaReport[],
  departments: Department[],
  dates: string[],
): WaUserDateSummary[] {
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const dateSet = new Set(dates);

  type Bucket = {
    userId: string;
    userName: string;
    username: string;
    departments: Set<string>;
    byDate: Map<string, WaDateCount>;
  };

  const users = new Map<string, Bucket>();

  for (const r of reports) {
    const date = (r.reportDate || r.createdAt || "").slice(0, 10);
    if (!dateSet.has(date)) continue;
    const key = r.userId || r.username || r.userName;
    if (!users.has(key)) {
      users.set(key, {
        userId: key,
        userName: r.userName || r.username || key,
        username: r.username || "",
        departments: new Set(),
        byDate: new Map(),
      });
    }
    const bucket = users.get(key)!;
    if (r.userName) bucket.userName = r.userName;
    if (r.username) bucket.username = r.username;
    const deptName = deptMap.get(r.departmentId);
    if (deptName) bucket.departments.add(deptName);
    const cell = bucket.byDate.get(date) || { count: 0, photoCount: 0 };
    cell.count += 1;
    cell.photoCount += r.photoUrls?.length || 0;
    bucket.byDate.set(date, cell);
  }

  return [...users.values()]
    .map((bucket) => {
      const byDate: Record<string, WaDateCount> = {};
      let totalCount = 0;
      let totalPhotos = 0;
      for (const [date, cell] of bucket.byDate) {
        byDate[date] = cell;
        totalCount += cell.count;
        totalPhotos += cell.photoCount;
      }
      return {
        userId: bucket.userId,
        userName: bucket.userName,
        username: bucket.username,
        department: [...bucket.departments].sort().join(", ") || "-",
        byDate,
        totalCount,
        totalPhotos,
        totalDays: bucket.byDate.size,
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName, "id"));
}

function dayColumnLabel(iso: string, multiYear: boolean): string {
  const [y, m, d] = iso.split("-");
  return multiYear ? `${d}/${m}/${y.slice(2)}` : `${d}/${m}`;
}

function formatIsoDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sheetWithHeading(
  title: string,
  parameters: Array<[string, string]>,
  data: Array<Record<string, string | number>>,
  cols: Array<{ wch: number }>,
) {
  const heading = [[title], ...parameters.map(([label, value]) => [`${label}: ${value}`]), []];
  const ws = XLSX.utils.aoa_to_sheet(heading);
  if (data.length === 0) {
    XLSX.utils.sheet_add_aoa(ws, [["Tidak ada data pada parameter ini"]], {
      origin: { r: heading.length, c: 0 },
    });
  } else {
    XLSX.utils.sheet_add_json(ws, data, { origin: { r: heading.length, c: 0 } });
  }
  ws["!cols"] = cols;
  return ws;
}

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/wa-report-summary")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format");
  const reportParam = req.nextUrl.searchParams.get("report") || "all";
  const reportKind =
    reportParam === "month" || reportParam === "daily" || reportParam === "detail"
      ? reportParam
      : "all";
  const legacyPeriod = req.nextUrl.searchParams.get("period") || "";
  const fromParam = req.nextUrl.searchParams.get("from") || "";
  const toParam = req.nextUrl.searchParams.get("to") || "";
  const dateFromParam = req.nextUrl.searchParams.get("dateFrom") || "";
  const dateToParam = req.nextUrl.searchParams.get("dateTo") || "";
  let departmentId = req.nextUrl.searchParams.get("departmentId") || "all";
  const scope = getEffectiveDepartmentScope(user);

  if (scope !== "all") {
    if (scope.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (departmentId === "all" || !scope.includes(departmentId)) {
      departmentId = scope.length === 1 ? scope[0] : "all";
    }
  }

  const departments = listDepartments(true);

  // Fetch reports filtered by department
  const deptFilter = departmentId === "all" ? undefined : departmentId;
  const allReports = listKpiWaReports(deptFilter, undefined, user);

  let range: { from: string; to: string } | null = null;
  if (/^\d{4}-\d{2}$/.test(fromParam) || /^\d{4}-\d{2}$/.test(toParam)) {
    range = normalizePeriodRange(fromParam, toParam);
  } else if (/^\d{4}-\d{2}$/.test(legacyPeriod)) {
    range = { from: legacyPeriod, to: legacyPeriod };
  }

  const months = range ? monthsBetween(range.from, range.to) : [];
  const monthSet = new Set(months);
  const reports = range
    ? allReports.filter((r) =>
        monthSet.has((r.reportDate || r.createdAt || "").slice(0, 7)),
      )
    : allReports;

  const dateRange =
    /^\d{4}-\d{2}-\d{2}$/.test(dateFromParam) ||
    /^\d{4}-\d{2}-\d{2}$/.test(dateToParam)
      ? normalizeDateRange(dateFromParam, dateToParam)
      : null;
  const summaryDates = dateRange
    ? datesBetween(dateRange.from, dateRange.to)
    : [];
  const dateSet = new Set(summaryDates);
  const dateReports = dateRange
    ? allReports.filter((r) =>
        dateSet.has((r.reportDate || r.createdAt || "").slice(0, 10)),
      )
    : [];

  const rows = groupByDayUser(reports, departments);
  const monthlySummary = range
    ? groupByUserMonth(reports, departments, months)
    : groupByUserMonth(
        reports,
        departments,
        [
          ...new Set(
            reports
              .map((r) => (r.reportDate || r.createdAt || "").slice(0, 7))
              .filter((p) => /^\d{4}-\d{2}$/.test(p)),
          ),
        ].sort(),
      );
  const summaryMonths =
    months.length > 0
      ? months
      : (monthlySummary[0]?.months.map((c) => c.period) ?? []);
  const dailySummary = groupByUserDate(dateReports, departments, summaryDates);
  const monthSpan = range ? `${range.from}-sd-${range.to}` : "semua";
  const dateSpan = dateRange ? `${dateRange.from}-sd-${dateRange.to}` : monthSpan;
  const periodLabel =
    reportKind === "daily" ? dateSpan : reportKind === "detail" ? monthSpan : monthSpan;
  const departmentLabel =
    departmentId === "all"
      ? "Semua departemen"
      : departments.find((d) => d.id === departmentId)?.name || departmentId;
  const generatedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const monthParameters: Array<[string, string]> = range
    ? [
        ["Dari periode", formatReportMonth(range.from)],
        ["Sampai periode", formatReportMonth(range.to)],
      ]
    : [["Periode", "Semua periode"]];
  const dateParameters: Array<[string, string]> = dateRange
    ? [
        ["Dari tanggal", formatIsoDate(dateRange.from)],
        ["Sampai tanggal", formatIsoDate(dateRange.to)],
      ]
    : [["Periode", "Semua periode"]];
  const sharedParameters: Array<[string, string]> = [
    ["Departemen", departmentLabel],
  ];
  const monthHeading = [...monthParameters, ...sharedParameters];
  const dateHeading = [...dateParameters, ...sharedParameters];
  const include = (kind: "month" | "daily" | "detail") =>
    reportKind === "all" || reportKind === kind;

  if (format === "pdf") {
    const kind = reportKind === "all" ? "month" : reportKind;
    const statsSource = kind === "daily" ? dateReports : reports;
    const buffer = await buildWaReportSummaryPdf({
      kind,
      companyName: getCompanyName() || "PT SAHABAT JAYA SUKSES",
      parameters: (kind === "daily" ? dateHeading : monthHeading).map(
        ([label, value]) => ({ label, value }),
      ),
      generatedAt,
      stats: {
        totalReports: statsSource.length,
        totalWithPhoto: statsSource.filter((r) => r.photoUrls && r.photoUrls.length > 0)
          .length,
        totalPhotos: statsSource.reduce(
          (sum, r) => sum + (r.photoUrls?.length || 0),
          0,
        ),
        uniqueUsers: new Set(statsSource.map((r) => r.userId || r.username)).size,
        uniqueDays: new Set(
          statsSource.map((r) => (r.reportDate || r.createdAt || "").slice(0, 10)),
        ).size,
      },
      months: summaryMonths,
      monthlySummary,
      dates: summaryDates,
      dailySummary,
      rows,
    });
    const pdfName =
      kind === "daily"
        ? `laporan-bukti-wa-tanggal-${dateSpan}.pdf`
        : kind === "detail"
          ? `laporan-bukti-wa-detail-${monthSpan}.pdf`
          : `laporan-bukti-wa-bulan-${monthSpan}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfName}"`,
      },
    });
  }

  // --- Excel Export ---
  if (format === "xlsx") {
    const sheetData = rows.map((r, i) => ({
      No: i + 1,
      Tanggal: r.date,
      "Nama User": r.userName,
      Username: r.username,
      Departemen: r.department,
      "Jumlah Laporan": r.count,
      "Perihal / Judul": r.titles,
      "Nama Pimpinan": r.leaderNames,
      "Jumlah Foto": r.photoCount,
      "Ada Bukti Foto": r.hasPhoto ? "Ya" : "Tidak",
    }));

    const summarySheet = monthlySummary.map((u, i) => {
      const row: Record<string, string | number> = {
        No: i + 1,
        "Nama User": u.userName,
        Username: u.username,
        Departemen: u.department,
      };
      for (const cell of u.months) {
        row[formatReportMonth(cell.period)] = cell.count;
      }
      row["Total Laporan"] = u.totalCount;
      row["Total Foto"] = u.totalPhotos;
      row["Hari Aktif"] = u.totalDays;
      return row;
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = sheetWithHeading(
      "Laporan Bukti WhatsApp — Ringkasan per Bulan",
      [...monthHeading, ["Dicetak", generatedAt]],
      summarySheet,
      [
        { wch: 5 },
        { wch: 25 },
        { wch: 18 },
        { wch: 22 },
        ...summaryMonths.map(() => ({ wch: 16 })),
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
      ],
    );
    if (include("month")) {
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan per Bulan");
    }

    const multiYear =
      summaryDates.length > 1 &&
      summaryDates[0].slice(0, 4) !== summaryDates[summaryDates.length - 1].slice(0, 4);
    const dailySheet = dailySummary.map((u, i) => {
      const row: Record<string, string | number> = {
        No: i + 1,
        "Nama User": u.userName,
        Username: u.username,
        Departemen: u.department,
      };
      for (const date of summaryDates) {
        row[dayColumnLabel(date, multiYear)] = u.byDate[date]?.count || 0;
      }
      row["Total Laporan"] = u.totalCount;
      row["Total Foto"] = u.totalPhotos;
      row["Hari Aktif"] = u.totalDays;
      return row;
    });
    const wsDaily = sheetWithHeading(
      "Laporan Bukti WhatsApp — Ringkasan per Tanggal",
      [...dateHeading, ["Dicetak", generatedAt]],
      dailySheet,
      [
        { wch: 5 },
        { wch: 25 },
        { wch: 18 },
        { wch: 22 },
        ...summaryDates.map(() => ({ wch: 7 })),
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
      ],
    );
    if (include("daily")) {
      XLSX.utils.book_append_sheet(wb, wsDaily, "Ringkasan per Tanggal");
    }

    const ws = sheetWithHeading(
      "Laporan Bukti WhatsApp — Detail per Hari",
      [...monthHeading, ["Dicetak", generatedAt]],
      sheetData,
      [
        { wch: 5 },
        { wch: 12 },
        { wch: 25 },
        { wch: 18 },
        { wch: 20 },
        { wch: 14 },
        { wch: 50 },
        { wch: 25 },
        { wch: 12 },
        { wch: 14 },
      ],
    );

    if (include("detail")) {
      XLSX.utils.book_append_sheet(wb, ws, "Detail per Hari");
    }
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-bukti-wa-${reportKind}-${periodLabel}.xlsx"`,
      },
    });
  }

  // --- JSON response ---
  // For the client, also include summary stats
  const totalReports = reports.length;
  const totalWithPhoto = reports.filter(
    (r) => r.photoUrls && r.photoUrls.length > 0,
  ).length;
  const totalPhotos = reports.reduce(
    (sum, r) => sum + (r.photoUrls?.length || 0),
    0,
  );
  const uniqueUsers = new Set(reports.map((r) => r.userId || r.username)).size;
  const uniqueDays = new Set(
    reports.map((r) => (r.reportDate || r.createdAt || "").slice(0, 10)),
  ).size;
  const dailyStats = {
    totalReports: dateReports.length,
    totalWithPhoto: dateReports.filter(
      (r) => r.photoUrls && r.photoUrls.length > 0,
    ).length,
    totalPhotos: dateReports.reduce(
      (sum, r) => sum + (r.photoUrls?.length || 0),
      0,
    ),
    uniqueUsers: new Set(dateReports.map((r) => r.userId || r.username)).size,
    uniqueDays: new Set(
      dateReports.map((r) => (r.reportDate || r.createdAt || "").slice(0, 10)),
    ).size,
  };

  return NextResponse.json({
    rows,
    months: summaryMonths,
    monthlySummary,
    dates: summaryDates,
    dailySummary,
    range,
    dateRange,
    stats: {
      totalReports,
      totalWithPhoto,
      totalPhotos,
      uniqueUsers,
      uniqueDays,
    },
    dailyStats,
  });
}
