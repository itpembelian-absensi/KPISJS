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

export function meetingTouchDates(
  sessions: Array<{ sessionDate: string; hidden?: boolean }> | undefined,
  extraDates: string[] = [],
): string[] {
  const dates = new Set<string>();
  for (const session of sessions ?? []) {
    if ("hidden" in session && session.hidden) continue;
    const date = String(session.sessionDate || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
  }
  for (const raw of extraDates) {
    const date = String(raw || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
  }
  return [...dates].sort();
}

export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TOPIC_ALIAS: Record<string, string> = {
  utk: "untuk",
  system: "sistem",
  systems: "sistem",
  recruitment: "rekrutmen",
  recruitmen: "rekrutmen",
  rekrutment: "rekrutmen",
  stock: "stok",
};

const TOPIC_STOP = new Set([
  "dan",
  "atau",
  "yang",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "ke",
  "di",
  "yg",
]);

/** Kata kunci bahasan, supaya judul yang diketik ulang tetap dianggap sama. */
export function topicTokens(topic: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of normalizeTopic(topic).split(" ")) {
    if (raw.length <= 1) continue;
    const token = TOPIC_ALIAS[raw] ?? raw;
    if (token.length <= 1 || TOPIC_STOP.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/** Judul berbeda sedikit tetap satu bahasan, misalnya "utk" dan "untuk". */
export function sameTopic(a: string, b: string): boolean {
  if (normalizeTopic(a) === normalizeTopic(b)) return true;
  const left = topicTokens(a);
  const right = topicTokens(b);
  if (left.length === 0 || right.length === 0) return false;
  const [small, large] = left.length <= right.length ? [left, right] : [right, left];
  const largeSet = new Set(large);
  let shared = 0;
  for (const token of small) {
    if (largeSet.has(token)) shared += 1;
  }
  if (small.length === 1) {
    return shared === 1 && small[0].length >= 8 && large.length <= 2;
  }
  if (shared === small.length) return true;
  return shared >= 3 && shared / small.length >= 0.75;
}

export function findSameTopicKey(
  keys: Iterable<string>,
  topic: string,
): string | undefined {
  const key = normalizeTopic(topic);
  if (key.length < 3) return undefined;
  for (const existing of keys) {
    if (sameTopic(existing, key)) return existing;
  }
  return undefined;
}

export type MeetingBucket =
  | "in_progress"
  | "overdue"
  | "open"
  | "done"
  | "repeated";

/** Satu bahasan hanya masuk satu filter, supaya isinya tidak dobel. */
export function itemBucket(
  status: MeetingItemStatus,
  dueDate: string,
  repeated: boolean,
  today = todayIso(),
): MeetingBucket {
  if (status === "done") return "done";
  const due = dueDate.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(due) && due < today) return "overdue";
  if (repeated) return "repeated";
  if (status === "in_progress") return "in_progress";
  return "open";
}

export const MEETING_BUCKET_LABEL: Record<MeetingBucket, string> = {
  in_progress: "On progress",
  overdue: "Overdue",
  open: "Belum mulai",
  done: "Selesai",
  repeated: "Repeated",
};

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
