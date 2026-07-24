import { formatReportMonth } from "./report-period";
import type {
  Department,
  KpiActivity,
  KpiActivityFrequency,
  KpiFunction,
  KpiProject,
  StaffMember,
} from "./types";

export const ACTIVITY_FREQUENCY_LABEL: Record<KpiActivityFrequency, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

export const ACTIVITY_STATUS_LABEL = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Batal",
} as const;

export const PROJECT_STATUS_LABEL = {
  planned: "Direncanakan",
  active: "Berjalan",
  on_hold: "Ditunda",
  done: "Selesai",
  cancelled: "Batal",
} as const;

export function isActivityPending(status: KpiActivity["status"]) {
  return status === "planned" || status === "in_progress";
}

export function isProjectPending(status: KpiProject["status"]) {
  return (
    status === "planned" || status === "active" || status === "on_hold"
  );
}

export function filterActivitiesByPeriod(
  activities: KpiActivity[],
  periodYm: string | "all",
): KpiActivity[] {
  if (!periodYm || periodYm === "all") return activities;
  return activities.filter((a) => {
    const d = a.activityDate || a.createdAt.slice(0, 10);
    return d.startsWith(periodYm);
  });
}

export function filterProjectsByPeriod(
  projects: KpiProject[],
  periodYm: string | "all",
): KpiProject[] {
  if (!periodYm || periodYm === "all") return projects;
  return projects.filter((p) => {
    const d = p.startDate || p.createdAt.slice(0, 10);
    return d.startsWith(periodYm);
  });
}

export type WorkReportStats = {
  total: number;
  planned: number;
  inProgress: number;
  done: number;
  cancelled: number;
  pending: number;
};

export function activityStats(list: KpiActivity[]): WorkReportStats {
  const planned = list.filter((a) => a.status === "planned").length;
  const inProgress = list.filter((a) => a.status === "in_progress").length;
  const done = list.filter((a) => a.status === "done").length;
  const cancelled = list.filter((a) => a.status === "cancelled").length;
  return {
    total: list.length,
    planned,
    inProgress,
    done,
    cancelled,
    pending: planned + inProgress,
  };
}

export function projectStats(list: KpiProject[]) {
  const planned = list.filter((p) => p.status === "planned").length;
  const active = list.filter((p) => p.status === "active").length;
  const onHold = list.filter((p) => p.status === "on_hold").length;
  const done = list.filter((p) => p.status === "done").length;
  const cancelled = list.filter((p) => p.status === "cancelled").length;
  return {
    total: list.length,
    planned,
    active,
    onHold,
    done,
    cancelled,
    pending: planned + active + onHold,
  };
}

export type WorkReportRow = {
  kind: "activity" | "project";
  id: string;
  title: string;
  departmentLabel: string;
  frequencyLabel: string;
  statusLabel: string;
  status: string;
  pending: boolean;
  dateLabel: string;
  picLabel: string;
  functionLabel: string;
  projectLabel: string;
  detailHref: string;
};

function deptLabel(departments: Department[], id: string) {
  const d = departments.find((x) => x.id === id);
  return d ? `${d.code} — ${d.name}` : "—";
}

function staffLabel(staff: StaffMember[], id: string | null) {
  if (!id) return "—";
  const s = staff.find((x) => x.id === id);
  return s ? s.name : "—";
}

export function buildActivityRows(
  activities: KpiActivity[],
  departments: Department[],
  staff: StaffMember[],
  projects: KpiProject[],
  functions: KpiFunction[],
): WorkReportRow[] {
  return activities.map((a) => {
    const fn = a.kpiFunctionId
      ? functions.find((f) => f.id === a.kpiFunctionId)
      : null;
    const project = a.projectId
      ? projects.find((p) => p.id === a.projectId)
      : null;
    const date = a.activityDate || a.createdAt.slice(0, 10);
    return {
      kind: "activity",
      id: a.id,
      title: a.title,
      departmentLabel: deptLabel(departments, a.departmentId),
      frequencyLabel:
        ACTIVITY_FREQUENCY_LABEL[a.frequency || "daily"] || "Harian",
      statusLabel: ACTIVITY_STATUS_LABEL[a.status] || a.status,
      status: a.status,
      pending: isActivityPending(a.status),
      dateLabel: date
        ? new Date(date).toLocaleDateString("id-ID")
        : "—",
      picLabel: staffLabel(staff, a.assigneeStaffId),
      functionLabel: fn?.name ?? "—",
      projectLabel: project ? `${project.code} — ${project.title}` : "—",
      detailHref: `/kpi/activities/${a.id}`,
    };
  });
}

export function buildProjectRows(
  projects: KpiProject[],
  departments: Department[],
  staff: StaffMember[],
  functions: KpiFunction[],
): WorkReportRow[] {
  return projects.map((p) => {
    const fn = p.kpiFunctionId
      ? functions.find((f) => f.id === p.kpiFunctionId)
      : null;
    const date = p.startDate || p.createdAt.slice(0, 10);
    return {
      kind: "project",
      id: p.id,
      title: p.title,
      departmentLabel: deptLabel(departments, p.departmentId),
      frequencyLabel: "Project",
      statusLabel: PROJECT_STATUS_LABEL[p.status] || p.status,
      status: p.status,
      pending: isProjectPending(p.status),
      dateLabel: date
        ? new Date(date).toLocaleDateString("id-ID")
        : "—",
      picLabel: staffLabel(staff, p.ownerStaffId),
      functionLabel: fn?.name ?? "—",
      projectLabel: p.code,
      detailHref: `/kpi/projects/${p.id}`,
    };
  });
}

export type WorkReportGroupId =
  | KpiActivityFrequency
  | "pending";

export type WorkReportGroup = {
  id: WorkReportGroupId;
  label: string;
  rows: WorkReportRow[];
};

export const WORK_REPORT_GROUPS: {
  id: WorkReportGroupId;
  label: string;
}[] = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
  { id: "pending", label: "Pending" },
];

export function buildWorkReportGroups(
  activities: KpiActivity[],
  projects: KpiProject[],
  departments: Department[],
  staff: StaffMember[],
  functions: KpiFunction[],
): WorkReportGroup[] {
  const activeActs = activities.filter((a) => a.status !== "cancelled");
  const pendingActs = activities.filter((a) => isActivityPending(a.status));
  const pendingProjs = projects.filter((p) => isProjectPending(p.status));

  return WORK_REPORT_GROUPS.map((g) => {
    if (g.id === "pending") {
      return {
        ...g,
        rows: [
          ...buildActivityRows(
            pendingActs,
            departments,
            staff,
            projects,
            functions,
          ),
          ...buildProjectRows(pendingProjs, departments, staff, functions),
        ],
      };
    }
    return {
      ...g,
      rows: buildActivityRows(
        activeActs.filter((a) => (a.frequency || "daily") === g.id),
        departments,
        staff,
        projects,
        functions,
      ),
    };
  });
}

export function workReportSheetRows(
  groups: WorkReportGroup[],
  meta: {
    title: string;
    periodLabel: string;
    departmentLabel: string;
  },
) {
  const header = [
    "Kelompok",
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
  ];
  const body: (string | number)[][] = [];
  for (const g of groups) {
    if (g.rows.length === 0) {
      body.push([g.label, "—", "(kosong)", "", "", "", "", "", "", "", ""]);
      continue;
    }
    for (const r of g.rows) {
      body.push([
        g.label,
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
      ]);
    }
  }
  return [
    [meta.title],
    ["Periode", meta.periodLabel],
    ["Departemen", meta.departmentLabel],
    [],
    header,
    ...body,
  ];
}

export function collectWorkReportPeriods(
  activities: KpiActivity[],
  projects: KpiProject[],
): string[] {
  const set = new Set<string>();
  for (const a of activities) {
    const d = (a.activityDate || a.createdAt || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(d)) set.add(d);
  }
  for (const p of projects) {
    const d = (p.startDate || p.createdAt || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(d)) set.add(d);
  }
  return [...set].sort().reverse();
}

export function periodLabel(periodYm: string | "all") {
  return periodYm === "all" ? "Semua periode" : formatReportMonth(periodYm);
}

export function departmentLabel(
  departmentId: string | "all",
  departments: Department[],
) {
  if (departmentId === "all") return "Semua departemen";
  const d = departments.find((x) => x.id === departmentId);
  return d ? `${d.code} — ${d.name}` : "Departemen";
}

/** Teks ringkas untuk share WhatsApp (batasi panjang URL) */
export function formatWorkReportWhatsAppText(
  groups: WorkReportGroup[],
  meta: {
    periodLabel: string;
    departmentLabel: string;
  },
  maxChars = 3500,
): string {
  const lines: string[] = [
    "*Laporan Pekerjaan*",
    `Periode: ${meta.periodLabel}`,
    `Departemen: ${meta.departmentLabel}`,
    "",
  ];

  for (const g of groups) {
    lines.push(`*${g.label}* (${g.rows.length})`);
    if (g.rows.length === 0) {
      lines.push("- (kosong)");
      lines.push("");
      continue;
    }
    const show = g.rows.slice(0, 12);
    for (const r of show) {
      const kind =
        g.id === "pending"
          ? r.kind === "activity"
            ? "[Keg] "
            : "[Proj] "
          : "";
      lines.push(
        `- ${kind}${r.title} · ${r.statusLabel}${r.picLabel !== "—" ? ` · ${r.picLabel}` : ""}`,
      );
    }
    if (g.rows.length > show.length) {
      lines.push(`- … +${g.rows.length - show.length} lainnya`);
    }
    lines.push("");
  }

  lines.push("_Dikirim dari SJS IT Systems_");
  let text = lines.join("\n").trim();
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars - 20).trim()}\n… (dipotong)`;
  }
  return text;
}

export function whatsappShareUrl(text: string, phone?: string) {
  const params = new URLSearchParams({ text });
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}?${params.toString()}`;
  }
  return `https://wa.me/?${params.toString()}`;
}
