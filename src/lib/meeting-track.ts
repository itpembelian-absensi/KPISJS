import type { MeetingItemStatus } from "./types";

/** Status tampilan: overdue dihitung dari jatuh tempo, tidak disimpan. */
export type MeetingTrack = "open" | "in_progress" | "done" | "overdue";

export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayIso(d);
}

/** Senin pada minggu tanggal tersebut. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return todayIso(d);
}

export function weekBounds(anchorIso: string): { start: string; end: string } {
  const start = mondayOf(anchorIso);
  return { start, end: addDays(start, 6) };
}

export function formatIsoDateId(iso: string): string {
  const dt = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWeekLabel(start: string, end: string): string {
  return `${formatIsoDateId(start)} – ${formatIsoDateId(end)}`;
}

export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function itemTrack(
  status: MeetingItemStatus,
  dueDate: string,
  today = todayIso(),
): MeetingTrack {
  if (status === "done") return "done";
  if (dueDate && dueDate.slice(0, 10) < today) return "overdue";
  if (status === "in_progress") return "in_progress";
  return "open";
}

export const MEETING_TRACK_LABEL: Record<MeetingTrack, string> = {
  open: "Belum mulai",
  in_progress: "On progress",
  overdue: "Overdue",
  done: "Selesai",
};

export const MEETING_STATUS_LABEL: Record<MeetingItemStatus, string> = {
  open: "Belum mulai",
  in_progress: "On progress",
  done: "Selesai",
};
