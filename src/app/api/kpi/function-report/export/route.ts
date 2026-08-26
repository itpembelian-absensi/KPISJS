import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getCompanyName } from "@/lib/branding";
import {
  buildKpiFunctionReportGroups,
  departmentReportLabel,
  kpiFunctionReportSheetRows,
  kpiFunctionReportSummaryRows,
} from "@/lib/kpi-function-report";
import { buildKpiFunctionReportPdf } from "@/lib/kpi-function-report-pdf";
import { getUserBySessionToken, listDepartments, listKpiFunctions } from "@/lib/store";

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
  if (
    !canAccessMenu(user, "/kpi/function-report") &&
    !canAccessMenu(user, "/master/kpi-functions")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  let departmentId = req.nextUrl.searchParams.get("departmentId") || "all";
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const scope = getEffectiveDepartmentScope(user);

  if (scope !== "all") {
    if (scope.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (departmentId === "all" || !scope.includes(departmentId)) {
      departmentId = scope.length === 1 ? scope[0] : "all";
    }
  }

  const allDepartments = listDepartments(true);
  const departments =
    scope === "all"
      ? allDepartments
      : allDepartments.filter((d) => scope.includes(d.id));
  const deptIds = new Set(departments.map((d) => d.id));
  const functions = listKpiFunctions(activeOnly).filter(
    (f) => f.departmentId && deptIds.has(f.departmentId),
  );
  const groups = buildKpiFunctionReportGroups(
    departments,
    functions,
    departmentId,
    activeOnly,
  );

  const departmentLabel = departmentReportLabel(departmentId, departments);
  const generatedAt = generatedAtLabel();
  const deptKey = departmentId === "all" ? "all" : departmentId;

  if (format === "pdf") {
    const buffer = await buildKpiFunctionReportPdf({
      groups,
      companyName: getCompanyName() || "PT SAHABAT JAYA SUKSES",
      departmentLabel,
      generatedAt,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-fungsi-kpi-${deptKey}.pdf"`,
      },
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      kpiFunctionReportSheetRows(groups, {
        title: "Laporan Fungsi KPI",
        departmentLabel,
        generatedAt,
      }),
    ),
    "Fungsi KPI",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(kpiFunctionReportSummaryRows(groups)),
    "Ringkasan",
  );
  const usedSheets = new Set<string>(["Fungsi KPI", "Ringkasan"]);
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
      [
        `${g.functions.length} fungsi · ${g.activeCount} aktif · total bobot aktif ${g.activeWeightTotal}%`,
      ],
      [],
      ["No", "Fungsi KPI", "Bobot (%)", "Status", "Fokus"],
      ...(g.functions.length
        ? g.functions.map((f, i) => [
            i + 1,
            f.name,
            f.weightPercent,
            f.active ? "Aktif" : "Nonaktif",
            f.focus || "",
          ])
        : [["", "(belum ada fungsi)", "", "", ""]]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows),
      uniqueSheet(g.departmentCode || g.departmentName),
    );
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-fungsi-kpi-${deptKey}.xlsx"`,
    },
  });
}
