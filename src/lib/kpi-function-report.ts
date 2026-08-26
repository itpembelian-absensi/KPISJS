import type { Department, KpiFunction } from "./types";

export type KpiFunctionReportGroup = {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  label: string;
  functions: KpiFunction[];
  activeCount: number;
  activeWeightTotal: number;
};

export function formatWeight(n: number): string {
  return `${n.toFixed(n % 1 ? 1 : 0)}%`;
}

export function departmentReportLabel(
  departmentId: string,
  departments: Department[],
): string {
  if (departmentId === "all") return "Semua departemen";
  const d = departments.find((x) => x.id === departmentId);
  return d ? `${d.code} — ${d.name}` : "Departemen";
}

export function buildKpiFunctionReportGroups(
  departments: Department[],
  functions: KpiFunction[],
  departmentId: string | "all" = "all",
  activeOnly = false,
): KpiFunctionReportGroup[] {
  const depts =
    departmentId === "all"
      ? departments
      : departments.filter((d) => d.id === departmentId);

  return depts.map((d) => {
    const fns = functions
      .filter((f) => f.departmentId === d.id)
      .filter((f) => (activeOnly ? f.active : true))
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, "id", { sensitivity: "base" }),
      );
    const active = fns.filter((f) => f.active);
    return {
      departmentId: d.id,
      departmentCode: d.code,
      departmentName: d.name,
      label: `${d.code} — ${d.name}`,
      functions: fns,
      activeCount: active.length,
      activeWeightTotal: active.reduce((s, f) => s + f.weightPercent, 0),
    };
  });
}

export function kpiFunctionReportSheetRows(
  groups: KpiFunctionReportGroup[],
  meta: { title: string; departmentLabel: string; generatedAt: string },
): (string | number)[][] {
  const rows: (string | number)[][] = [
    [meta.title],
    [`Departemen: ${meta.departmentLabel}`],
    [`Dicetak: ${meta.generatedAt}`],
    [],
    [
      "No",
      "Departemen",
      "Kode",
      "Fungsi KPI",
      "Bobot (%)",
      "Status",
      "Fokus",
    ],
  ];

  let n = 1;
  for (const g of groups) {
    if (g.functions.length === 0) {
      rows.push([n++, g.label, g.departmentCode, "(belum ada fungsi)", "", "", ""]);
      continue;
    }
    for (const f of g.functions) {
      rows.push([
        n++,
        g.label,
        g.departmentCode,
        f.name,
        f.weightPercent,
        f.active ? "Aktif" : "Nonaktif",
        f.focus || "",
      ]);
    }
  }

  return rows;
}

export function kpiFunctionReportSummaryRows(
  groups: KpiFunctionReportGroup[],
): (string | number)[][] {
  return [
    [
      "Departemen",
      "Kode",
      "Jumlah fungsi",
      "Fungsi aktif",
      "Total bobot aktif (%)",
    ],
    ...groups.map((g) => [
      g.departmentName,
      g.departmentCode,
      g.functions.length,
      g.activeCount,
      Number(g.activeWeightTotal.toFixed(2)),
    ]),
  ];
}
