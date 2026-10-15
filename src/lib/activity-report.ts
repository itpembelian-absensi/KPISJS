import {
  ACTIVITY_FREQUENCY_LABEL,
  buildActivityRows,
  isActivityPending,
  type WorkReportRow,
} from "./work-report";
import type {
  Department,
  KpiActivity,
  KpiActivityFrequency,
  KpiFunction,
  KpiProject,
  StaffMember,
} from "./types";

export type ActivityExportFreq = KpiActivityFrequency | "all";
export type ActivityExportProgress = "all" | "pending" | "done";

export const ACTIVITY_EXPORT_FREQ_OPTIONS: {
  id: ActivityExportFreq;
  label: string;
}[] = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
  { id: "all", label: "Semua jenis" },
];

export function parseActivityExportFreq(
  raw: string | null,
): ActivityExportFreq {
  if (raw === "weekly" || raw === "monthly" || raw === "daily" || raw === "all") {
    return raw;
  }
  return "all";
}

export function parseActivityExportProgress(
  raw: string | null,
): ActivityExportProgress {
  if (raw === "pending" || raw === "done" || raw === "all") return raw;
  return "all";
}

export function frequencyExportLabel(freq: ActivityExportFreq) {
  if (freq === "all") return "Harian, mingguan, dan bulanan";
  return ACTIVITY_FREQUENCY_LABEL[freq];
}

export function progressExportLabel(progress: ActivityExportProgress) {
  if (progress === "pending") return "Belum selesai";
  if (progress === "done") return "Selesai";
  return "Semua status";
}

export function filterActivitiesForExport(
  activities: KpiActivity[],
  freq: ActivityExportFreq,
  progress: ActivityExportProgress,
): KpiActivity[] {
  let list = activities;
  if (freq !== "all") {
    list = list.filter((a) => (a.frequency || "daily") === freq);
  }
  if (progress === "pending") {
    list = list.filter((a) => isActivityPending(a.status));
  } else if (progress === "done") {
    list = list.filter((a) => a.status === "done");
  }
  return list;
}

export type ActivityReportGroup = {
  id: KpiActivityFrequency;
  label: string;
  rows: WorkReportRow[];
};

export function buildActivityReportGroups(
  activities: KpiActivity[],
  departments: Department[],
  staff: StaffMember[],
  projects: KpiProject[],
  functions: KpiFunction[],
  freq: ActivityExportFreq,
): ActivityReportGroup[] {
  const freqs: KpiActivityFrequency[] =
    freq === "all" ? ["daily", "weekly", "monthly"] : [freq];
  return freqs.map((id) => ({
    id,
    label: ACTIVITY_FREQUENCY_LABEL[id],
    rows: buildActivityRows(
      activities.filter((a) => (a.frequency || "daily") === id),
      departments,
      staff,
      projects,
      functions,
    ),
  }));
}

export function activityReportSheetRows(
  groups: ActivityReportGroup[],
  meta: {
    title: string;
    departmentLabel: string;
    frequencyLabel: string;
    progressLabel: string;
    generatedAt: string;
  },
) {
  const header = [
    "No",
    "Jenis",
    "Judul",
    "Status",
    "Tanggal",
    "PIC",
    "Fungsi KPI",
    "Project",
    "Departemen",
    "Foto",
    "Dokumen",
  ];
  const body: (string | number)[][] = [];
  let n = 1;
  for (const g of groups) {
    if (g.rows.length === 0) {
      body.push([
        "",
        g.label,
        "(kosong)",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }
    for (const r of g.rows) {
      body.push([
        n,
        g.label,
        r.title,
        r.statusLabel,
        r.dateLabel,
        r.picLabel,
        r.functionLabel,
        r.projectLabel,
        r.departmentLabel,
        r.photoUrls.length ? r.photoUrls.length : "",
        r.documents.length
          ? r.documents.map((d) => d.name).join("; ")
          : "",
      ]);
      n += 1;
    }
  }
  return [
    [meta.title],
    ["Departemen", meta.departmentLabel],
    ["Jenis", meta.frequencyLabel],
    ["Status", meta.progressLabel],
    ["Dicetak", meta.generatedAt],
    [],
    header,
    ...body,
  ];
}

export { ACTIVITY_FREQUENCY_LABEL };
