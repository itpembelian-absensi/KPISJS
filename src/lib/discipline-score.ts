import type { KpiScoreIndicatorConfig } from "./types";

/** Empat komponen kedisiplinan, masing-masing 25%. */
export const DISCIPLINE_PART_WEIGHT = 25;

export const LATENESS_SCALE_LABEL =
  "0 kali = 100, 1 = 90, 2 = 80, 3 = 65, 4 = 50, 5 = 30, 6 kali atau lebih = 0";
export const DAILY_REPORT_SCALE_LABEL =
  "100% = 100, 95–<100% = 90, 90–<95% = 75, 80–<90% = 50, di bawah 80% = 0";
export const VIOLATION_SCALE_LABEL =
  "tidak ada = 100, teguran tertulis = 70, SP1 = 40, SP2/SP3 = 0";

export const DISCIPLINE_FOCUS =
  "Kehadiran, keterlambatan (skala per kali, target 0), laporan kerja harian (skala persen, target 100%), pelanggaran aturan (tidak ada / teguran / SP). Empat komponen sama rata.";

export type ViolationLevel = "none" | "written" | "sp1" | "sp2";

export const VIOLATION_LEVELS: Array<{
  level: ViolationLevel;
  label: string;
  score: number;
}> = [
  { level: "none", label: "Tidak ada", score: 100 },
  { level: "written", label: "Teguran tertulis", score: 70 },
  { level: "sp1", label: "SP1", score: 40 },
  { level: "sp2", label: "SP2 / SP3", score: 0 },
];

const VIOLATION_SEVERITY: Record<ViolationLevel, number> = {
  none: 0,
  written: 1,
  sp1: 2,
  sp2: 3,
};

export function isViolationLevel(value: unknown): value is ViolationLevel {
  return (
    value === "none" ||
    value === "written" ||
    value === "sp1" ||
    value === "sp2"
  );
}

export function parseViolationLevel(value: unknown): ViolationLevel {
  return isViolationLevel(value) ? value : "none";
}

export function violationLevelLabel(level: ViolationLevel): string {
  return (
    VIOLATION_LEVELS.find((item) => item.level === level)?.label ?? "Tidak ada"
  );
}

/** Tingkat terberat menang jika satu rentang memuat beberapa periode. */
export function worstViolationLevel(levels: ViolationLevel[]): ViolationLevel {
  let worst: ViolationLevel = "none";
  for (const level of levels) {
    if (VIOLATION_SEVERITY[level] > VIOLATION_SEVERITY[worst]) worst = level;
  }
  return worst;
}

export type DisciplinePart =
  | "attendance"
  | "lateness"
  | "daily_report"
  | "violation";

export type DisciplineIndicatorTemplate = {
  part: DisciplinePart;
  name: string;
  description: string;
  weightPercent: number;
  sortOrder: number;
  notes: string;
};

export const DISCIPLINE_INDICATOR_TEMPLATES: DisciplineIndicatorTemplate[] = [
  {
    part: "attendance",
    name: "Kehadiran",
    description: "Persen hari hadir dari hari kerja. 100% hadir = skor 100.",
    weightPercent: DISCIPLINE_PART_WEIGHT,
    sortOrder: 1,
    notes: "Skor = (hari hadir ÷ hari kerja) × 100. Hari libur tidak dihitung.",
  },
  {
    part: "lateness",
    name: "Keterlambatan",
    description: "Jumlah keterlambatan. Target 0 kali.",
    weightPercent: DISCIPLINE_PART_WEIGHT,
    sortOrder: 2,
    notes: `Skala per kali, target 0. ${LATENESS_SCALE_LABEL}.`,
  },
  {
    part: "daily_report",
    name: "Laporan Kerja Harian",
    description:
      "Kelengkapan Lapor WhatsApp. Satu laporan per tanggal pada periode 21–20, kecuali hari libur. Target 100%.",
    weightPercent: DISCIPLINE_PART_WEIGHT,
    sortOrder: 3,
    notes: `Dari Lapor WhatsApp. Wajib ada laporan pada setiap tanggal periode 21–20, kecuali hari libur di absensi. Tanggal setelah hari ini belum dihitung. Target 100%. ${DAILY_REPORT_SCALE_LABEL}.`,
  },
  {
    part: "violation",
    name: "Pelanggaran Aturan",
    description: "Tingkat pelanggaran. Target tidak ada.",
    weightPercent: DISCIPLINE_PART_WEIGHT,
    sortOrder: 4,
    notes: `Diisi di Master Absensi per periode. Target tidak ada. ${VIOLATION_SCALE_LABEL}.`,
  },
];

export function disciplineIndicatorConfig(
  part: DisciplinePart,
): KpiScoreIndicatorConfig {
  const tpl = DISCIPLINE_INDICATOR_TEMPLATES.find((item) => item.part === part);
  return {
    dataSource: part === "daily_report" ? "wa_report" : "attendance",
    disciplinePart: part,
    notes: tpl?.notes,
  };
}

/** Tanggal hari ini di zona WIB, format YYYY-MM-DD. */
export function todayIsoJakarta(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function eachIsoDate(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return [];
  }
  if (start > end) return [];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end && dates.length < 400) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

function isoDay(value: string): string {
  return value.slice(0, 10);
}

/**
 * Cakupan laporan harian: satu tanggal = satu laporan.
 * Hari libur tidak wajib. Tanggal setelah asOf belum wajib.
 */
export function dailyReportCoverage(input: {
  start: string;
  end: string;
  holidayDates: Iterable<string>;
  reportDates: Iterable<string>;
  asOf: string;
}): { requiredDays: number; coveredDays: number; percent: number } {
  const holidays = new Set(
    [...input.holidayDates].map(isoDay).filter((day) => day.length === 10),
  );
  const reports = new Set(
    [...input.reportDates].map(isoDay).filter((day) => day.length === 10),
  );
  const last = input.end < input.asOf ? input.end : input.asOf;
  if (input.start > last) {
    return { requiredDays: 0, coveredDays: 0, percent: 100 };
  }
  let requiredDays = 0;
  let coveredDays = 0;
  for (const day of eachIsoDate(input.start, last)) {
    if (holidays.has(day)) continue;
    requiredDays += 1;
    if (reports.has(day)) coveredDays += 1;
  }
  const percent =
    requiredDays === 0
      ? 100
      : Math.round((coveredDays / requiredDays) * 1000) / 10;
  return { requiredDays, coveredDays, percent };
}

export type DisciplineScoreInput = {
  workDays: number;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  /** Kosong = belum dihitung dari Lapor WhatsApp. */
  dailyReportPercent?: number | null;
  reportRequiredDays?: number;
  reportCoveredDays?: number;
  /** Kosong = tidak ada pelanggaran. */
  violationLevel?: ViolationLevel | null;
};

export type DisciplineBreakdown = {
  workDays: number;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  attendancePercent: number;
  attendanceScore: number;
  latenessScore: number;
  reportPercent: number;
  reportRequiredDays: number;
  reportCoveredDays: number;
  dailyReportScore: number;
  violationLevel: ViolationLevel;
  violationScore: number;
  total: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

/** D1 — skor sama dengan persen kehadiran. */
export function attendanceDisciplineScore(
  presentDays: number,
  workDays: number,
): number {
  if (workDays <= 0) return 0;
  return clampScore((Math.max(0, presentDays) / workDays) * 100);
}

/** D2 — keterlambatan per kali. Target 0. */
export function latenessDisciplineScore(lateCount: number): number {
  const late = Math.max(0, Math.floor(lateCount));
  if (late <= 0) return 100;
  if (late === 1) return 90;
  if (late === 2) return 80;
  if (late === 3) return 65;
  if (late === 4) return 50;
  if (late === 5) return 30;
  return 0;
}

/**
 * D3 — persen laporan ke skala.
 * 100, lalu 95–<100, 90–<95, 80–<90, di bawah 80.
 */
export function dailyReportDisciplineScore(reportPercent: number): number {
  const pct = Math.max(0, reportPercent);
  if (pct >= 100) return 100;
  if (pct >= 95) return 90;
  if (pct >= 90) return 75;
  if (pct >= 80) return 50;
  return 0;
}

/** D4 — tingkat pelanggaran ke skor. */
export function violationDisciplineScore(level: ViolationLevel): number {
  return VIOLATION_LEVELS.find((item) => item.level === level)?.score ?? 100;
}

export function computeDisciplineBreakdown(
  input: DisciplineScoreInput,
): DisciplineBreakdown {
  const workDays = Math.max(0, input.workDays);
  const presentDays = Math.max(0, input.presentDays);
  const absentDays = Math.max(0, input.absentDays);
  const lateCount = Math.max(0, input.lateCount);
  const attendancePercent = attendanceDisciplineScore(presentDays, workDays);
  const latenessScore = latenessDisciplineScore(lateCount);
  const reportRequiredDays = Math.max(0, input.reportRequiredDays ?? 0);
  const reportCoveredDays = Math.max(0, input.reportCoveredDays ?? 0);
  const reportPercent =
    input.dailyReportPercent == null
      ? 100
      : Math.max(0, input.dailyReportPercent);
  const dailyReportScore = dailyReportDisciplineScore(reportPercent);
  const violationLevel = parseViolationLevel(input.violationLevel);
  const violationScore = violationDisciplineScore(violationLevel);
  const total = clampScore(
    (attendancePercent + latenessScore + dailyReportScore + violationScore) / 4,
  );

  return {
    workDays,
    presentDays,
    absentDays,
    lateCount,
    attendancePercent,
    attendanceScore: attendancePercent,
    latenessScore,
    reportPercent,
    reportRequiredDays,
    reportCoveredDays,
    dailyReportScore,
    violationLevel,
    violationScore,
    total,
  };
}

export function resolveDisciplinePart(indicator: {
  name: string;
  config?: { disciplinePart?: string | null };
}): DisciplinePart | null {
  const raw = indicator.config?.disciplinePart;
  if (
    raw === "attendance" ||
    raw === "lateness" ||
    raw === "daily_report" ||
    raw === "violation"
  ) {
    return raw;
  }
  const name = indicator.name.trim().toLowerCase();
  if (name === "kehadiran") return "attendance";
  if (name === "keterlambatan") return "lateness";
  if (name.startsWith("laporan kerja")) return "daily_report";
  if (name.startsWith("pelanggaran")) return "violation";
  return null;
}

export function disciplineComponentScore(
  part: DisciplinePart | null,
  parts: DisciplineBreakdown,
): number {
  if (part === "attendance") return parts.attendanceScore;
  if (part === "lateness") return parts.latenessScore;
  if (part === "daily_report") return parts.dailyReportScore;
  if (part === "violation") return parts.violationScore;
  return parts.total;
}

export function disciplinePartNotes(
  part: DisciplinePart | null,
  parts: DisciplineBreakdown,
): string {
  if (part === "attendance") {
    return `Hadir ${parts.presentDays}/${parts.workDays} (${parts.attendancePercent}%)`;
  }
  if (part === "lateness") {
    return `${parts.lateCount} kali`;
  }
  if (part === "daily_report") {
    if (parts.reportRequiredDays > 0) {
      return `Lapor WA ${parts.reportCoveredDays}/${parts.reportRequiredDays} tanggal (${parts.reportPercent}%), target 100%`;
    }
    return "Belum ada tanggal wajib. Target 100%";
  }
  if (part === "violation") {
    return violationLevelLabel(parts.violationLevel);
  }
  return `Rata-rata 4 komponen = ${parts.total}`;
}

export function attendanceIndicatorActual(
  indicator: {
    name: string;
    metricType: string;
    config?: { disciplinePart?: string | null };
  },
  summary: DisciplineScoreInput | DisciplineBreakdown | null | undefined,
): number | null {
  if (indicator.metricType !== "attendance" || !summary) return null;
  const part = resolveDisciplinePart(indicator);
  if ("attendanceScore" in summary && "dailyReportScore" in summary) {
    return disciplineComponentScore(part, summary);
  }
  const parts = computeDisciplineBreakdown(summary);
  return disciplineComponentScore(part, parts);
}
