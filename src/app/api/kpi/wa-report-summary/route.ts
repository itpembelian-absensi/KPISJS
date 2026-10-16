import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  getUserBySessionToken,
  listDepartments,
  listStaff,
} from "@/lib/store";
import { listKpiWaReports } from "@/lib/wa-report-ops";
import type { KpiWaReport, Department, StaffMember } from "@/lib/types";

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

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/wa-report-summary")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format");
  const period = req.nextUrl.searchParams.get("period") || "all";
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
  let reports = listKpiWaReports(deptFilter, undefined, user);

  // Filter by period
  if (period !== "all" && /^\d{4}-\d{2}$/.test(period)) {
    reports = reports.filter(
      (r) => (r.reportDate || r.createdAt || "").slice(0, 7) === period,
    );
  }

  const rows = groupByDayUser(reports, departments);

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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 25 },  // Nama User
      { wch: 18 },  // Username
      { wch: 20 },  // Departemen
      { wch: 14 },  // Jumlah Laporan
      { wch: 50 },  // Perihal
      { wch: 25 },  // Nama Pimpinan
      { wch: 12 },  // Jumlah Foto
      { wch: 14 },  // Ada Bukti
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Bukti WA");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-bukti-wa-${period}.xlsx"`,
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

  return NextResponse.json({
    rows,
    stats: {
      totalReports,
      totalWithPhoto,
      totalPhotos,
      uniqueUsers,
      uniqueDays,
    },
  });
}
