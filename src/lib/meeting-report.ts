import {
  formatIsoDateId,
  itemTrack,
  MEETING_TRACK_LABEL,
  normalizeTopic,
  todayIso,
  type MeetingTrack,
} from "./meeting-track";
import type { Department, MeetingNote } from "./types";

export type MeetingReportStatus = "all" | MeetingTrack;

export type MeetingReportFilters = {
  from?: string;
  to?: string;
  departmentId?: string;
  status?: string;
  query?: string;
};

export type MeetingReportNoteRow = {
  id: string;
  title: string;
  meetingDate: string;
  meetingDateLabel: string;
  meetingTime: string;
  departmentLabel: string;
  attendees: string;
  externalAttendees: string;
  summary: string;
  createdByName: string;
  itemCount: number;
};

export type MeetingReportItemRow = {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingDateLabel: string;
  meetingTime: string;
  meetingDepartmentLabel: string;
  topic: string;
  problemDetail: string;
  detail: string;
  departmentLabel: string;
  ownerName: string;
  startDateLabel: string;
  dueDateLabel: string;
  track: MeetingTrack;
  trackLabel: string;
  repeated: boolean;
  repeatCount: number;
};

export type MeetingReport = {
  notes: MeetingReportNoteRow[];
  items: MeetingReportItemRow[];
  stats: {
    notes: number;
    items: number;
    open: number;
    progress: number;
    overdue: number;
    done: number;
    repeated: number;
  };
  periodLabel: string;
  departmentLabel: string;
  statusLabel: string;
};

const STATUS_SET = new Set<MeetingReportStatus>([
  "all",
  "open",
  "in_progress",
  "overdue",
  "done",
]);

export function monthStartIso(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return todayIso().slice(0, 7) + "-01";
  return `${day.slice(0, 7)}-01`;
}

export function departmentIdsLabel(
  ids: string[] | undefined,
  departments: Department[],
): string {
  if (!ids || ids.length === 0) return "";
  if (ids.includes("*")) return "Semua departemen";
  return ids
    .map((id) => departments.find((dept) => dept.id === id)?.code)
    .filter((code): code is string => Boolean(code))
    .join(", ");
}

function isoOrEmpty(value: string | undefined): string {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function dateBounds(from: string | undefined, to: string | undefined) {
  let start = isoOrEmpty(from);
  let end = isoOrEmpty(to);
  if (start && end && start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  return { start, end };
}

function idsMatch(ids: string[] | undefined, departmentId: string): boolean {
  if (!departmentId || departmentId === "all") return true;
  if (!ids || ids.length === 0) return false;
  if (ids.includes("*")) return true;
  return ids.includes(departmentId);
}

function dateLabel(iso: string): string {
  return iso ? formatIsoDateId(iso) : "—";
}

export function buildMeetingReport(
  meetings: MeetingNote[],
  departments: Department[],
  filters: MeetingReportFilters = {},
  today = todayIso(),
): MeetingReport {
  const { start, end } = dateBounds(filters.from, filters.to);
  const departmentId = filters.departmentId || "all";
  const status: MeetingReportStatus = STATUS_SET.has(
    filters.status as MeetingReportStatus,
  )
    ? (filters.status as MeetingReportStatus)
    : "all";
  const tokens = String(filters.query || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const repeatCount = new Map<string, number>();
  for (const meeting of meetings) {
    const seen = new Set<string>();
    for (const item of meeting.items) {
      const key = normalizeTopic(item.topic);
      if (key.length < 3 || seen.has(key)) continue;
      seen.add(key);
      repeatCount.set(key, (repeatCount.get(key) ?? 0) + 1);
    }
  }

  const notes: MeetingReportNoteRow[] = [];
  const items: MeetingReportItemRow[] = [];

  const dated = [...meetings]
    .filter((meeting) => {
      if (start && meeting.meetingDate < start) return false;
      if (end && meeting.meetingDate > end) return false;
      return true;
    })
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.title.localeCompare(a.title, "id"));

  for (const meeting of dated) {
    const meetingDepartmentLabel =
      departmentIdsLabel(meeting.departmentIds, departments) ||
      meeting.departmentCode ||
      "—";
    const meetingMatchesDept =
      departmentId === "all" || idsMatch(meeting.departmentIds, departmentId);

    const matchedItems = meeting.items.filter((item) => {
      const itemMatchesDept =
        departmentId === "all" ||
        idsMatch(item.departmentIds, departmentId) ||
        (item.departmentIds.length === 0 && meetingMatchesDept);
      if (!itemMatchesDept) return false;
      const track = itemTrack(item.status, item.dueDate, today);
      if (status !== "all" && track !== status) return false;
      return true;
    });

    const includeNote =
      (departmentId === "all" ||
        meetingMatchesDept ||
        matchedItems.length > 0) &&
      (status === "all" || matchedItems.length > 0);
    if (!includeNote) continue;

    const note: MeetingReportNoteRow = {
      id: meeting.id,
      title: meeting.title,
      meetingDate: meeting.meetingDate,
      meetingDateLabel: dateLabel(meeting.meetingDate),
      meetingTime: meeting.meetingTime || "",
      departmentLabel: meetingDepartmentLabel,
      attendees: meeting.attendees || "",
      externalAttendees: meeting.externalAttendees || "",
      summary: meeting.summary || "",
      createdByName: meeting.createdByName || "",
      itemCount: matchedItems.length,
    };

    const itemRows = matchedItems.map((item) => {
      const track = itemTrack(item.status, item.dueDate, today);
      const key = normalizeTopic(item.topic);
      const repeats = key.length >= 3 ? (repeatCount.get(key) ?? 0) : 0;
      return {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingDate: meeting.meetingDate,
        meetingDateLabel: note.meetingDateLabel,
        meetingTime: note.meetingTime,
        meetingDepartmentLabel,
        topic: item.topic,
        problemDetail: item.problemDetail || "",
        detail: item.detail || "",
        departmentLabel: departmentIdsLabel(item.departmentIds, departments) || "—",
        ownerName: item.ownerName || "Tanpa PIC",
        startDateLabel: dateLabel(item.startDate),
        dueDateLabel: dateLabel(item.dueDate),
        track,
        trackLabel: MEETING_TRACK_LABEL[track],
        repeated: repeats >= 2,
        repeatCount: repeats,
      } satisfies MeetingReportItemRow;
    });

    const hay = [
      note.title,
      note.summary,
      note.attendees,
      note.externalAttendees,
      note.departmentLabel,
      note.createdByName,
      ...itemRows.flatMap((row) => [
        row.topic,
        row.problemDetail,
        row.detail,
        row.ownerName,
        row.departmentLabel,
      ]),
    ]
      .join("\n")
      .toLowerCase();
    if (tokens.length > 0 && !tokens.every((token) => hay.includes(token))) {
      continue;
    }

    notes.push(note);
    items.push(...itemRows);
  }

  return {
    notes,
    items,
    stats: {
      notes: notes.length,
      items: items.length,
      open: items.filter((row) => row.track === "open").length,
      progress: items.filter((row) => row.track === "in_progress").length,
      overdue: items.filter((row) => row.track === "overdue").length,
      done: items.filter((row) => row.track === "done").length,
      repeated: items.filter((row) => row.repeated).length,
    },
    periodLabel: periodLabel(start, end),
    departmentLabel:
      departmentId === "all"
        ? "Semua departemen"
        : departmentIdsLabel([departmentId], departments) || "Departemen",
    statusLabel: status === "all" ? "Semua status" : MEETING_TRACK_LABEL[status],
  };
}

function periodLabel(start: string, end: string): string {
  if (start && end) return `${formatIsoDateId(start)} – ${formatIsoDateId(end)}`;
  if (start) return `Dari ${formatIsoDateId(start)}`;
  if (end) return `Sampai ${formatIsoDateId(end)}`;
  return "Semua tanggal";
}

export function meetingReportSheetRows(report: MeetingReport): {
  notes: string[][];
  items: string[][];
} {
  const intro = [
    ["Laporan Meeting & Notulen"],
    ["Periode", report.periodLabel],
    ["Departemen", report.departmentLabel],
    ["Status", report.statusLabel],
    [
      "Ringkasan",
      `${report.stats.notes} notulen, ${report.stats.items} bahasan, ${report.stats.progress} on progress, ${report.stats.overdue} overdue, ${report.stats.done} selesai`,
    ],
    [],
  ];
  return {
    notes: [
      ...intro,
      [
        "Tanggal",
        "Waktu",
        "Judul notulen",
        "Departemen",
        "Peserta",
        "Pihak luar",
        "Ringkasan",
        "Jumlah bahasan",
        "Dicatat oleh",
      ],
      ...report.notes.map((note) => [
        note.meetingDateLabel,
        note.meetingTime,
        note.title,
        note.departmentLabel,
        note.attendees,
        note.externalAttendees,
        note.summary,
        String(note.itemCount),
        note.createdByName,
      ]),
    ],
    items: [
      ...intro,
      [
        "Tanggal rapat",
        "Judul notulen",
        "Departemen notulen",
        "Topik",
        "Detail permasalahan",
        "Keputusan / tindak lanjut",
        "Departemen bahasan",
        "Penanggung jawab",
        "Tanggal awal",
        "Target selesai",
        "Status",
        "Dibahas ulang",
      ],
      ...report.items.map((row) => [
        row.meetingDateLabel,
        row.meetingTitle,
        row.meetingDepartmentLabel,
        row.topic,
        row.problemDetail,
        row.detail,
        row.departmentLabel,
        row.ownerName,
        row.startDateLabel,
        row.dueDateLabel,
        row.trackLabel,
        row.repeated ? `${row.repeatCount}x` : "",
      ]),
    ],
  };
}
