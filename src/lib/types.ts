export type TicketPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "day2"
  | "day4"
  | "week1"
  | "week2"
  | "week3"
  | "week4";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed";
export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "email"
  | "erp"
  | "access"
  | "printer"
  | "security"
  | "report"
  | "other";

/** Role login aplikasi (4 bagian) */
export type UserRole = "admin" | "manager" | "staff" | "it_staff" | "assessor";

/** Tipe personel di master IT */
export type ItMemberType = "it_staff" | "it_manager";

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

/** Fungsi penilaian KPI per departemen (bobot + fokus) */
export interface KpiFunction {
  id: string;
  departmentId: string;
  name: string;
  weightPercent: number;
  focus: string;
  sortOrder: number;
  active: boolean;
}

/**
 * Tipe cara hitung indikator skor KPI.
 * - scale_count: capaian angka vs target → skor dari tabel bands
 * - scale_percent: % terhadap target → skor dari bandsPercent
 * - weighted_leaf: nilai manual 0–100, lalu ditimbang di induk
 * - attendance: pakai modul absensi
 */
export type KpiScoreMetricType =
  | "scale_count"
  | "scale_percent"
  | "weighted_leaf"
  | "attendance";

/**
 * Sumber capaian indikator:
 * - manual: diisi manager di Penilaian & Skor
 * - attendance: otomatis dari absensi (sudah terhubung)
 * - ticket: otomatis dari modul tiket (SLA, response, satisfaction, non-repeat)
 * - activity / project: dirancang otomatis dari modul terkait
 *   (jika belum terhubung, masih bisa diisi manual sebagai cadangan)
 */
export type KpiScoreDataSource =
  | "manual"
  | "attendance"
  | "ticket"
  | "activity"
  | "project";

export type KpiScoreBand = {
  /** Nilai minimum capaian (unit / persen / skor) */
  min: number;
  score: number;
  label?: string;
};

export type KpiScorePenalty = {
  code: string;
  label: string;
  points: number;
};

export type KpiScoreIndicatorConfig = {
  /** Target default (bisa dioverride per periode nanti) */
  defaultTarget?: number;
  /** Skala untuk scale_count: min capaian → skor */
  bands?: KpiScoreBand[];
  /** Skala untuk scale_percent: min % capaian → skor */
  bandsPercent?: KpiScoreBand[];
  penalties?: KpiScorePenalty[];
  notes?: string;
  /** Sumber capaian: manual vs otomatis dari modul */
  dataSource?: KpiScoreDataSource;
};

/** Indikator terukur di bawah fungsi KPI (aturan skor per dept) */
export interface KpiScoreIndicator {
  id: string;
  departmentId: string;
  kpiFunctionId: string;
  name: string;
  description: string;
  /** Bobot di dalam fungsi (jumlah anak satu fungsi idealnya 100) */
  weightPercent: number;
  metricType: KpiScoreMetricType;
  config: KpiScoreIndicatorConfig;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Indikator di dalam template (belum terikat dept/fungsi runtime) */
export type KpiScoreTemplateIndicator = {
  name: string;
  description: string;
  weightPercent: number;
  metricType: KpiScoreMetricType;
  config: KpiScoreIndicatorConfig;
  sortOrder: number;
};

/** Fungsi + indikator di dalam template skor */
export type KpiScoreTemplateFunction = {
  name: string;
  weightPercent: number;
  focus: string;
  sortOrder: number;
  indicators: KpiScoreTemplateIndicator[];
};

/** Master template indikator skor KPI (bisa diterapkan ke dept mana pun) */
export interface KpiScoreTemplate {
  id: string;
  code: string;
  label: string;
  description: string;
  functions: KpiScoreTemplateFunction[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KpiProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "done"
  | "cancelled";

export type KpiActivityStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "cancelled";

/** Frekuensi / siklus kegiatan */
export type KpiActivityFrequency = "daily" | "weekly" | "monthly";

/** Project departemen yang menunjang fungsi KPI */
export interface KpiProject {
  id: string;
  code: string;
  departmentId: string;
  kpiFunctionId: string | null;
  title: string;
  description: string;
  status: KpiProjectStatus;
  ownerStaffId: string | null;
  startDate: string | null;
  endDate: string | null;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

/** Kegiatan harian/mingguan/bulanan departemen */
export interface KpiActivity {
  id: string;
  departmentId: string;
  projectId: string | null;
  kpiFunctionId: string | null;
  title: string;
  description: string;
  status: KpiActivityStatus;
  /** Harian | Mingguan | Bulanan */
  frequency: KpiActivityFrequency;
  assigneeStaffId: string | null;
  activityDate: string | null;
  /** URL publik foto kegiatan, mis. /uploads/activities/... */
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

/** Penilaian skor per fungsi KPI (periode) */
export interface KpiAssessment {
  id: string;
  departmentId: string;
  periodLabel: string;
  staffId: string | null;
  kpiFunctionId: string;
  score: number;
  targetScore: number;
  notes: string;
  assessedByName: string;
  createdAt: string;
  updatedAt: string;
}

/** Capaian indikator skor per staf & periode (Aturan Skor KPI) */
export interface KpiIndicatorActual {
  id: string;
  departmentId: string;
  staffId: string;
  periodLabel: string;
  indicatorId: string;
  /** Nilai capaian: jumlah, %, atau skor 0–100 tergantung metricType */
  actualValue: number | null;
  targetOverride: number | null;
  computedScore: number;
  notes: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "sick"
  | "leave"
  | "holiday"
  | "other";

/** Baris absensi harian (hasil impor Excel) */
export interface AttendanceRecord {
  id: string;
  staffId: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  sourceFile: string;
  importedAt: string;
}

/** Ringkasan kedisiplinan per staf per periode */
export interface AttendancePeriodSummary {
  id: string;
  staffId: string;
  periodLabel: string;
  workDays: number;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  disciplineScore: number;
  notes: string;
  updatedAt: string;
}

/** Status perintah / tugas kerja non-support */
export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "done"
  | "cancelled";

export type WorkOrderPriority = "high" | "medium" | "low";

export interface WorkOrderEvent {
  id: string;
  at: string;
  type:
    | "created"
    | "assigned"
    | "status_changed"
    | "comment"
    | "completed"
    | "cancelled";
  message: string;
  actorId?: string;
  actorName?: string;
}

/** Perintah kerja untuk fungsi KPI (project, innovation, security, dll) */
export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  description: string;
  kpiFunctionId: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  requesterName: string;
  requesterStaffId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  resultNotes: string | null;
  events: WorkOrderEvent[];
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  position: string;
  active: boolean;
}

export interface ItMember {
  id: string;
  staffId: string;
  type: ItMemberType;
  active: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  staffId: string | null;
  active: boolean;
  /**
   * Allowlist href menu. `null` = ikuti default role.
   * Contoh: ["/", "/tickets", "/kpi/departments"]
   */
  allowedMenus: string[] | null;
  /**
   * Batasan departemen. `null` = ikuti role (staff = dept staf, lain = semua).
   * `["*"]` = semua departemen. Selain itu daftar id departemen.
   */
  departmentScope: string[] | null;
  /**
   * Staf dept lain yang boleh dinilai (untuk manager / penilai).
   * Departemen sendiri selalu boleh. `null`/`[]` = hanya dept sendiri.
   * Admin / IT Staf mengabaikan field ini (boleh semua).
   */
  assessmentStaffIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type PasswordResetStatus = "pending" | "completed" | "rejected";

/** Permintaan reset password — hanya Admin/IT yang boleh menyelesaikan */
export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  status: PasswordResetStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

/** Handler tiket = anggota IT aktif (kompatibel dengan UI lama) */
export interface Agent {
  id: string;
  name: string;
  role: "IT Staff" | "IT Manager";
  email: string;
  active: boolean;
  staffId?: string;
}

export interface TicketEvent {
  id: string;
  at: string;
  type:
    | "created"
    | "assigned"
    | "status_changed"
    | "comment"
    | "resolved"
    | "reopened"
    | "rated";
  message: string;
  actorId?: string;
  actorName?: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string;
  requesterDept: string;
  requesterStaffId: string | null;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  satisfaction: number | null;
  isRepeat: boolean;
  relatedTicketId: string | null;
  rootCause: string | null;
  resolution: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  /** URL publik foto laporan saat buat tiket */
  photoUrls: string[];
  /** URL publik foto pekerjaan (IT) — terpisah dari foto laporan */
  workPhotoUrls: string[];
  events: TicketEvent[];
}

export interface AppData {
  departments: Department[];
  staff: StaffMember[];
  itTeam: ItMember[];
  users: UserAccount[];
  sessions: Session[];
  tickets: Ticket[];
  nextTicketNumber: number;
}

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  staffId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  itMemberId: string | null;
  itType: ItMemberType | null;
  /** null = ikuti default role */
  allowedMenus: string[] | null;
  /** null = ikuti default role; ["*"] = semua */
  departmentScope: string[] | null;
  /** Staf dept lain yang boleh dinilai; dept sendiri selalu boleh */
  assessmentStaffIds: string[] | null;
}

export interface KpiSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionHours: number | null;
  slaCompliancePercent: number | null;
  repeatIssueRate: number | null;
  avgSatisfaction: number | null;
  byPriority: Record<
    TicketPriority,
    { total: number; withinSla: number; avgHours: number | null }
  >;
  byAgent: Array<{
    agentId: string;
    name: string;
    assigned: number;
    resolved: number;
    avgHours: number | null;
    withinSlaPercent: number | null;
  }>;
  queueAging: Array<{
    ticketId: string;
    code: string;
    title: string;
    priority: TicketPriority;
    hoursOpen: number;
    assigneeName: string | null;
    breached: boolean;
  }>;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staf",
  it_staff: "IT Staf",
  assessor: "Penilai",
};

export const USER_ROLES = Object.keys(ROLE_LABEL) as UserRole[];

export const IT_TYPE_LABEL: Record<ItMemberType, string> = {
  it_staff: "IT Staff",
  it_manager: "IT Manager",
};

/** Langkah prosedur (D. PROSEDUR PELAKSANAAN) — title = peran/aktor */
export interface SopStep {
  order: number;
  title: string;
  body: string;
}

/** Lampiran: link eksternal atau file yang diunggah (PDF/Word/Excel/dll) */
export interface SopAttachment {
  label: string;
  url: string;
  /** Nama file asli saat unggah */
  originalName?: string;
  mimeType?: string;
  kind?: "link" | "file";
}

/** Baris tabel disposisi / tanda tangan */
export interface SopDisposition {
  role: string;
  name: string;
  position: string;
}

/** SOP formal per departemen (header + A–D + disposisi) */
export interface SopDocument {
  id: string;
  /** Departemen pemilik SOP */
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  /** NOMOR DOCUMENT, contoh IT-SOP/2026/001 */
  code: string;
  title: string;
  divisionLabel: string;
  documentType: string;
  /** MULAI BERLAKU (teks tanggal) */
  effectiveDate: string;
  /** REVISI */
  revision: string;
  /** TANGGAL REVISI */
  revisionDate: string;
  /** A. TUJUAN */
  purpose: string;
  /** B. BAHAN DAN PERALATAN */
  materials: string;
  /** C. KUALIFIKASI PERSONEL */
  qualifications: string;
  /** D. PROSEDUR PELAKSANAAN */
  steps: SopStep[];
  /** E. NOTE */
  notes: string;
  dispositions: SopDisposition[];
  attachments: SopAttachment[];
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function sopDivisionLabelFromDepartment(name: string): string {
  const n = name.trim();
  if (!n) return "DIVISI";
  if (/^divisi\b/i.test(n)) return n.toUpperCase();
  return `DIVISI ${n.toUpperCase()}`;
}

export function defaultSopDispositions(deptName = ""): SopDisposition[] {
  const position = deptName.trim() || "Departemen";
  return [
    { role: "Dibuat Oleh", name: "", position },
    { role: "Diperiksa Oleh", name: "", position: "Manager" },
    { role: "Diperiksa Oleh", name: "", position: "Management Representative" },
    { role: "Disetujui Oleh", name: "", position: "Direktur" },
  ];
}

export const DEFAULT_SOP_DISPOSITIONS: SopDisposition[] =
  defaultSopDispositions("Departemen");
