import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import { listKpiActivities, listKpiProjects } from "@/lib/kpi-ops";
import {
  getUserBySessionToken,
  listDepartments,
  listKpiFunctions,
  listStaff,
} from "@/lib/store";
import { buildWorkReportPdf } from "@/lib/work-report-pdf";
import {
  buildWorkReportGroups,
  departmentLabel,
  filterActivitiesByPeriod,
  filterProjectsByPeriod,
  periodLabel,
  workReportSheetRows,
} from "@/lib/work-report";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/work-report")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
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

  let activities =
    departmentId === "all"
      ? scope === "all"
        ? listKpiActivities()
        : scope.flatMap((id) => listKpiActivities(id))
      : listKpiActivities(departmentId);
  let projects =
    departmentId === "all"
      ? scope === "all"
        ? listKpiProjects()
        : scope.flatMap((id) => listKpiProjects(id))
      : listKpiProjects(departmentId);
  activities = filterActivitiesByPeriod(activities, period);
  projects = filterProjectsByPeriod(projects, period);

  const departments = listDepartments(true);
  const staff = listStaff(true);
  const functions = listKpiFunctions();
  const groups = buildWorkReportGroups(
    activities,
    projects,
    departments,
    staff,
    functions,
  );

  const periodText = periodLabel(period);
  const deptText = departmentLabel(departmentId, departments);
  const deptKey = departmentId === "all" ? "all" : departmentId;
  const periodKey = period === "all" ? "all" : period;

  if (format === "pdf") {
    const buffer = await buildWorkReportPdf({
      groups,
      periodLabel: periodText,
      departmentLabel: deptText,
    });
    const filename = `laporan-pekerjaan-${periodKey}-${deptKey}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const sheet = XLSX.utils.aoa_to_sheet(
    workReportSheetRows(groups, {
      title: "Laporan Pekerjaan",
      periodLabel: periodText,
      departmentLabel: deptText,
    }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Laporan Pekerjaan");

  // Satu sheet per kelompok supaya mudah dibaca
  for (const g of groups) {
    const rows = [
      [g.label],
      [],
      [
        "Jenis",
        "Judul",
        "Departemen",
        "Frekuensi",
        "Status",
        "Pending",
        "Tanggal",
        "PIC",
        "Fungsi KPI",
        "Project",
        "Foto",
        "Dokumen",
      ],
      ...g.rows.map((r) => [
        r.kind === "activity" ? "Kegiatan" : "Project",
        r.title,
        r.departmentLabel,
        r.frequencyLabel,
        r.statusLabel,
        r.pending ? "Ya" : "Tidak",
        r.dateLabel,
        r.picLabel,
        r.functionLabel,
        r.projectLabel,
        r.photoUrls.length ? r.photoUrls.length : "",
        r.documents.length
          ? r.documents.map((d) => d.name).join("; ")
          : "",
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows),
      g.label.slice(0, 31),
    );
  }

  const filename = `laporan-pekerjaan-${periodKey}-${deptKey}.xlsx`;
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
