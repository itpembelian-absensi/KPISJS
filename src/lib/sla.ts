import type { TicketPriority } from "./types";

/** SLA target in hours — jam kerja operasional + opsi multi-hari/minggu */
export const SLA_HOURS: Record<TicketPriority, number> = {
  critical: 2,
  high: 4,
  medium: 8,
  low: 24,
  day2: 48,
  day4: 96,
  week1: 168,
  week2: 336,
  week3: 504,
  week4: 672,
};

/** Teks ringkas untuk UI (Report KPI, Buat Tiket, Antrian) */
export const SLA_TARGET_HINT =
  "Target SLA: Critical 2 jam · High 4 jam · Medium 8 jam · Low 24 jam · 2–4 hari · 1–4 minggu";

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  day2: "2 hari",
  day4: "4 hari",
  week1: "1 minggu",
  week2: "2 minggu",
  week3: "3 minggu",
  week4: "4 minggu",
};

/** Urutan tampilan dropdown prioritas */
export const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABEL) as TicketPriority[];

/** Label durasi SLA yang mudah dibaca */
export function formatSlaDuration(hours: number): string {
  if (hours < 24) return `${hours} jam`;
  if (hours % 168 === 0) {
    const w = hours / 168;
    return `${w} minggu`;
  }
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} hari`;
  }
  return `${hours} jam`;
}

export function formatSlaTarget(priority: TicketPriority): string {
  return formatSlaDuration(SLA_HOURS[priority]);
}

export const STATUS_LABEL = {
  open: "Antrian",
  in_progress: "Dikerjakan",
  pending: "Menunggu",
  resolved: "Selesai",
  closed: "Ditutup",
} as const;

export const CATEGORY_LABEL = {
  hardware: "Hardware",
  software: "Software",
  network: "Jaringan",
  email: "Email",
  erp: "ERP",
  access: "Akses User",
  printer: "Printer",
  security: "Keamanan",
  report: "Report",
  other: "Lainnya",
} as const;

export const WORK_ORDER_STATUS_LABEL: Record<
  import("./types").WorkOrderStatus,
  string
> = {
  open: "Antrian",
  in_progress: "Dikerjakan",
  pending: "Menunggu",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

export const WORK_ORDER_PRIORITY_LABEL: Record<
  import("./types").WorkOrderPriority,
  string
> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function hoursBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export function formatDuration(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} mnt`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${d} hari ${h} jam` : `${d} hari`;
}

export function isWithinSla(
  priority: TicketPriority,
  createdAt: string,
  resolvedAt: string | null,
  now = new Date().toISOString(),
): boolean {
  const end = resolvedAt ?? now;
  return hoursBetween(createdAt, end) <= SLA_HOURS[priority];
}

export function slaDeadline(createdAt: string, priority: TicketPriority): Date {
  return new Date(
    new Date(createdAt).getTime() + SLA_HOURS[priority] * 60 * 60 * 1000,
  );
}
