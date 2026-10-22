import { getMeta, setMeta } from "./db";

export type WaScheduleScope = "open" | "overdue";

export type WaScheduleConfig = {
  enabled: boolean;
  /** Jam kirim HH:mm, waktu WIB. */
  time: string;
  /** 0 = Minggu … 6 = Sabtu. */
  days: number[];
  scope: WaScheduleScope;
};

export type WaScheduleLastRun = {
  at: string;
  source: "schedule" | "manual";
  summary: string;
  sent: number;
  failed: number;
  skipped: number;
};

export type WaScheduleView = WaScheduleConfig & {
  lastRun: WaScheduleLastRun | null;
};

const CONFIG_KEY = "wa_reminder_schedule";
const LAST_KEY = "wa_reminder_schedule_last";
const SLOT_KEY = "wa_reminder_schedule_slot";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DEFAULT_CONFIG: WaScheduleConfig = {
  enabled: false,
  time: "08:00",
  days: [1, 2, 3, 4, 5],
  scope: "open",
};

export function jakartaNow(now = new Date()): {
  date: string;
  time: string;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    time: `${hour.padStart(2, "0")}:${pick("minute").padStart(2, "0")}`,
    weekday: weekdayMap[pick("weekday")] ?? now.getDay(),
  };
}

function normalizeDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = new Set<number>();
  for (const day of value) {
    const n = Number(day);
    if (Number.isInteger(n) && n >= 0 && n <= 6) days.add(n);
  }
  return [...days].sort((a, b) => a - b);
}

function normalizeConfig(raw: unknown): WaScheduleConfig {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const time = typeof source.time === "string" ? source.time : DEFAULT_CONFIG.time;
  const scope: WaScheduleScope = source.scope === "overdue" ? "overdue" : "open";
  const days = normalizeDays(source.days);
  return {
    enabled: source.enabled === true,
    time: TIME_RE.test(time) ? time : DEFAULT_CONFIG.time,
    days: days.length > 0 ? days : [...DEFAULT_CONFIG.days],
    scope,
  };
}

export function getWaSchedule(): WaScheduleConfig {
  const raw = getMeta(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CONFIG, days: [...DEFAULT_CONFIG.days] };
  try {
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CONFIG, days: [...DEFAULT_CONFIG.days] };
  }
}

export function getWaScheduleLastRun(): WaScheduleLastRun | null {
  const raw = getMeta(LAST_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<WaScheduleLastRun>;
    if (!data || typeof data.at !== "string" || typeof data.summary !== "string") {
      return null;
    }
    return {
      at: data.at,
      source: data.source === "manual" ? "manual" : "schedule",
      summary: data.summary,
      sent: Number(data.sent) || 0,
      failed: Number(data.failed) || 0,
      skipped: Number(data.skipped) || 0,
    };
  } catch {
    return null;
  }
}

export function getWaScheduleView(): WaScheduleView {
  return { ...getWaSchedule(), lastRun: getWaScheduleLastRun() };
}

export function saveWaSchedule(input: {
  enabled: boolean;
  time: string;
  days: number[];
  scope: string;
}): { config: WaScheduleConfig } | { error: string } {
  const time = input.time.trim();
  if (!TIME_RE.test(time)) return { error: "Jam kirim tidak valid." };
  const days = normalizeDays(input.days);
  if (days.length === 0) return { error: "Pilih minimal satu hari." };
  const scope: WaScheduleScope = input.scope === "overdue" ? "overdue" : "open";
  const config: WaScheduleConfig = {
    enabled: input.enabled === true,
    time,
    days,
    scope,
  };
  setMeta(CONFIG_KEY, JSON.stringify(config));
  if (config.enabled) {
    const clock = jakartaNow();
    if (config.days.includes(clock.weekday) && clock.time >= config.time) {
      setMeta(SLOT_KEY, clock.date);
    }
  }
  return { config };
}

export function recordWaScheduleRun(input: {
  source: "schedule" | "manual";
  summary: string;
  sent: number;
  failed: number;
  skipped: number;
  at?: string;
}) {
  const last: WaScheduleLastRun = {
    at: input.at || new Date().toISOString(),
    source: input.source,
    summary: input.summary,
    sent: input.sent,
    failed: input.failed,
    skipped: input.skipped,
  };
  setMeta(LAST_KEY, JSON.stringify(last));
  return last;
}

/** Sekali per tanggal WIB. Mengembalikan false jika slot hari ini sudah diambil. */
export function claimWaScheduleSlot(date: string): boolean {
  if (getMeta(SLOT_KEY) === date) return false;
  setMeta(SLOT_KEY, date);
  return true;
}

export function isScheduleDue(
  config: WaScheduleConfig,
  now: Date,
  claimedDate: string | null,
): boolean {
  if (!config.enabled) return false;
  if (!TIME_RE.test(config.time)) return false;
  if (config.days.length === 0) return false;
  const clock = jakartaNow(now);
  if (!config.days.includes(clock.weekday)) return false;
  if (clock.time < config.time) return false;
  return claimedDate !== clock.date;
}

export function claimedScheduleDate(): string | null {
  return getMeta(SLOT_KEY);
}
