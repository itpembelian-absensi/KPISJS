import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessDepartment,
  canViewDepartmentKpi,
  getEffectiveDepartmentScope,
  isStaffDeptKpiLimited,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  activityReportSheetRows,
  buildActivityReportGroups,
  filterActivitiesForExport,
  frequencyExportLabel,
  parseActivityExportFreq,
  parseActivityExportProgress,
  progressExportLabel,
} from "@/lib/activity-report";
import { buildActivityReportPdf } from "@/lib/activity-report-pdf";
import { getCompanyName } from "@/lib/branding";
import { listKpiActivities, listKpiProjects } from "@/lib/kpi-ops";
import {
  getUserBySessionToken,
  listDepartments,
  listKpiFunctions,
  listStaff,
} from "@/lib/store";
import { departmentLabel } from "@/lib/work-report";

export const runtime = "nodejs";

function generatedAtLabel() {
  return new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewDepartmentKpi(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format =
    req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const freq = parseActivityExportFreq(req.nextUrl.searchParams.get("freq"));
  const progress = parseActivityExportProgress(
    req.nextUrl.searchParams.get("progress"),
  );
  let departmentId = req.nextUrl.searchParams.get("departmentId") || "";
  const scope = getEffectiveDepartmentScope(user);

  if (scope !== "all") {
    if (scope.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!departmentId || !scope.includes(departmentId)) {
      departmentId = scope.length === 1 ? scope[0] : "";
    }
  } else if (isStaffDeptKpiLimited(user.role)) {
    departmentId = user.departmentId || departmentId;
  }

  if (!departmentId) {
    return NextResponse.json(
      { error: "Departemen wajib dipilih" },
      { status: 400 },
    );
  }
  if (!canAccessDepartment(user, departmentId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities = filterActivitiesForExport(
    listKpiActivities(departmentId),
    freq,
    progress,
  );
  const projects = listKpiProjects(departmentId);
  const departments = listDepartments(true);
  const staff = listStaff(true);
  const functions = listKpiFunctions();
  const groups = buildActivityReportGroups(
    activities,
    departments,
    staff,
    projects,
    functions,
    freq,
  );

  const deptText = departmentLabel(departmentId, departments);
  const freqText = frequencyExportLabel(freq);
  const progressText = progressExportLabel(progress);
  const generatedAt = generatedAtLabel();
  const freqKey = freq;
  const progressKey = progress;

  if (format === "pdf") {
    const buffer = await buildActivityReportPdf({
      groups,
      companyName: getCompanyName() || "PT SAHABAT JAYA SUKSES",
      departmentLabel: deptText,
      frequencyLabel: freqText,
      progressLabel: progressText,
      generatedAt,
    });
    const filename = `kegiatan-${freqKey}-${progressKey}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      activityReportSheetRows(groups, {
        title: "Laporan Kegiatan",
        departmentLabel: deptText,
        frequencyLabel: freqText,
        progressLabel: progressText,
        generatedAt,
      }),
    ),
    "Kegiatan",
  );

  const usedSheets = new Set<string>(["Kegiatan"]);
  function uniqueSheet(raw: string) {
    const base =
      raw.replace(/[\\/?*[\]]/g, " ").trim().slice(0, 31) || "Sheet";
    let name = base;
    let i = 2;
    while (usedSheets.has(name)) {
      const suffix = ` (${i})`;
      name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
      i += 1;
    }
    usedSheets.add(name);
    return name;
  }

  for (const g of groups) {
    const rows = [
      [g.label],
      [`${g.rows.length} kegiatan · ${progressText}`],
      [],
      [
        "No",
        "Judul",
        "Status",
        "Tanggal",
        "PIC",
        "Fungsi KPI",
        "Project",
        "Foto",
        "Dokumen",
      ],
      ...(g.rows.length
        ? g.rows.map((r, i) => [
            i + 1,
            r.title,
            r.statusLabel,
            r.dateLabel,
            r.picLabel,
            r.functionLabel,
            r.projectLabel,
            r.photoUrls.length ? r.photoUrls.length : "",
            r.documents.length
              ? r.documents.map((d) => d.name).join("; ")
              : "",
          ])
        : [["", "(belum ada kegiatan)", "", "", "", "", "", "", ""]]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows),
      uniqueSheet(g.label),
    );
  }

  const filename = `kegiatan-${freqKey}-${progressKey}.xlsx`;
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
