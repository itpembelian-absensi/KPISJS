import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { AttendanceStatus } from "./types";

export type ExcelAttendanceRow = {
  employeeCode: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  fullName?: string;
  position?: string;
  jobLevel?: string;
  organization?: string;
};

const TEMPLATE_FILE = path.join(process.cwd(), "template.xlsx");
const ABSENSI_FILE = path.join(process.cwd(), "absensi.xlsx");

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const n = Number(String(value ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Excel serial date → YYYY-MM-DD */
function excelDateToIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  const raw = clean(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // duration or clock as Excel fraction of day
    const totalMinutes = Math.round(value * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const raw = clean(value);
  if (!raw || raw === "00:00") return raw === "00:00" ? "00:00" : null;
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return raw;
}

function timeToMinutes(value: unknown): number | null {
  const t = normalizeTime(value);
  if (!t || t === "00:00") {
    // 00:00 schedule on dayoff — treat as null for work calc
    if (t === "00:00") return 0;
    return null;
  }
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function mapStatus(value: unknown): AttendanceStatus {
  const s = clean(value).toLowerCase();
  if (!s || /hadir|present|masuk|^h$/.test(s)) return "present";
  if (/absen|alpha|alpa|tidak hadir|^a$/.test(s)) return "absent";
  if (/sakit|sick|skt/.test(s)) return "sick";
  if (/izin|cuti|leave|ijin|idt|dlk/.test(s)) return "leave";
  if (/libur|holiday|dayoff|off|^l$/.test(s)) return "holiday";
  return "other";
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && clean(row[k]) !== "") {
      return row[k];
    }
  }
  // case-insensitive fallback
  const lowerMap = new Map(
    Object.keys(row).map((k) => [k.toLowerCase(), k] as const),
  );
  for (const k of keys) {
    const real = lowerMap.get(k.toLowerCase());
    if (real && clean(row[real]) !== "") return row[real];
  }
  return "";
}

function pickStaffProfile(row: Record<string, unknown>): {
  fullName: string;
  position: string;
  jobLevel: string;
  organization: string;
} {
  return {
    fullName: clean(
      pick(row, ["Full Name", "Nama", "Name", "Nama Lengkap"]),
    ),
    position: clean(pick(row, ["Job Position", "Jabatan", "Position"])),
    jobLevel: clean(pick(row, ["Job Level", "Level"])),
    organization: clean(
      pick(row, [
        "Organization",
        "Department",
        "Departemen",
        "Dept",
        "Org",
      ]),
    ),
  };
}

function isExportAttendanceFormat(rows: Record<string, unknown>[]): boolean {
  if (!rows[0]) return false;
  const keys = Object.keys(rows[0]);
  return (
    keys.some((k) => /employee id/i.test(k)) &&
    keys.some((k) => /^date/i.test(k) || k === "Date*") &&
    keys.some((k) => /check in/i.test(k) || /schedule in/i.test(k))
  );
}

/** Format export HR (template.xlsx — sheet Export Attendance) */
function parseExportAttendanceRow(
  row: Record<string, unknown>,
): ExcelAttendanceRow | null {
  const employeeCode = clean(
    pick(row, ["Employee ID*", "Employee ID", "EmployeeID", "NIK"]),
  );
  const workDate = excelDateToIso(pick(row, ["Date*", "Date", "Tanggal"]));
  if (!employeeCode || !workDate) return null;

  const shift = clean(pick(row, ["Shift", "Shift Label", "Shift Code"])).toLowerCase();
  const attendanceCode = clean(pick(row, ["Attendance Code"]));
  const timeOffCode = clean(pick(row, ["Time Off Code"]));

  const clockIn = normalizeTime(pick(row, ["Check In", "Jam Masuk", "Clock In"]));
  const clockOut = normalizeTime(
    pick(row, ["Check Out", "Jam Keluar", "Clock Out"]),
  );
  // treat 00:00 empty clock as null
  const cin = clockIn === "00:00" && !attendanceCode ? null : clockIn;
  const cout = clockOut === "00:00" ? null : clockOut;

  const scheduleIn = pick(row, ["Schedule In"]);
  const scheduleOut = pick(row, ["Schedule Out"]);
  const sinM = timeToMinutes(scheduleIn);
  const soutM = timeToMinutes(scheduleOut);
  const cinM = timeToMinutes(cin);
  const coutM = timeToMinutes(cout);

  // Status
  let status: AttendanceStatus = "present";
  if (
    /dayoff|national holiday|holiday|libur/.test(shift) ||
    (sinM === 0 && soutM === 0 && !cin)
  ) {
    status = "holiday";
  } else if (timeOffCode) {
    // IDT/DLK dll — cuti/izin
    if (/sakit|sick|skt/i.test(timeOffCode)) status = "sick";
    else status = "leave";
  } else if (cin) {
    status = "present";
  } else if (/^h$/i.test(attendanceCode)) {
    status = "present";
  } else {
    status = "absent";
  }

  // Late: check-in setelah schedule in (grace 5 menit)
  let lateMinutes = 0;
  if (status === "present" && cinM != null && sinM != null && sinM > 0) {
    const diff = cinM - sinM;
    if (diff > 5) lateMinutes = diff;
  }

  // Early leave: check-out sebelum schedule out (min 15 menit)
  let earlyLeaveMinutes = 0;
  if (status === "present" && coutM != null && soutM != null && soutM > 0) {
    const diff = soutM - coutM;
    if (diff > 15) earlyLeaveMinutes = diff;
  }

  // Overtime: dari kolom OT, atau check-out setelah schedule
  let overtimeMinutes = Math.round(
    toNumber(pick(row, ["Lembur (menit)", "Lembur", "Overtime Minutes", "OT"])),
  );
  const otAfterRaw = pick(row, ["Overtime After"]);
  const otBeforeRaw = pick(row, ["Overtime Before"]);
  // Jika Overtime After/Before berupa jam (HH:MM) = durasi dari jam 00
  const otAfterM = timeToMinutes(otAfterRaw);
  const otBeforeM = timeToMinutes(otBeforeRaw);
  if (clean(otAfterRaw) || clean(otBeforeRaw)) {
    overtimeMinutes += (otAfterM ?? 0) + (otBeforeM ?? 0);
  } else if (
    status === "present" &&
    coutM != null &&
    soutM != null &&
    soutM > 0 &&
    coutM > soutM + 15
  ) {
    overtimeMinutes = coutM - soutM;
  }

  return {
    employeeCode,
    workDate,
    clockIn: cin,
    clockOut: cout,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes: Math.max(0, overtimeMinutes),
    status,
    ...pickStaffProfile(row),
  };
}

/** Format sederhana (template unduhan aplikasi) */
function parseSimpleRow(row: Record<string, unknown>): ExcelAttendanceRow | null {
  const employeeCode = clean(
    pick(row, [
      "Employee ID",
      "EmployeeID",
      "NIK",
      "Kode",
      "Kode Karyawan",
      "Employee Code",
      "Employee ID*",
    ]),
  );
  const workDate = excelDateToIso(
    pick(row, ["Tanggal", "Date", "Date*", "Work Date", "Tgl"]),
  );
  if (!employeeCode || !workDate) return null;

  const hasExplicitStatus = Boolean(
    clean(pick(row, ["Status", "Ket", "Keterangan", "Absence Type"])),
  );

  const clockIn = normalizeTime(
    pick(row, ["Jam Masuk", "Masuk", "Clock In", "Check In", "In"]),
  );
  const clockOut = normalizeTime(
    pick(row, ["Jam Keluar", "Keluar", "Clock Out", "Check Out", "Out"]),
  );

  let lateMinutes = Math.round(
    toNumber(
      pick(row, ["Terlambat (menit)", "Terlambat", "Late Minutes", "Late"]),
    ),
  );
  let earlyLeaveMinutes = Math.round(
    toNumber(
      pick(row, [
        "Pulang Cepat (menit)",
        "Pulang Cepat",
        "Early Leave",
        "Early Leave Minutes",
      ]),
    ),
  );
  let overtimeMinutes = Math.round(
    toNumber(
      pick(row, [
        "Lembur (menit)",
        "Lembur",
        "Overtime",
        "OT",
        "Overtime Minutes",
      ]),
    ),
  );

  let status = hasExplicitStatus
    ? mapStatus(pick(row, ["Status", "Ket", "Keterangan", "Absence Type"]))
    : clockIn
      ? "present"
      : "absent";

  return {
    employeeCode,
    workDate,
    clockIn,
    clockOut,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    status,
    ...pickStaffProfile(row),
  };
}

function parseRows(rows: Record<string, unknown>[]): ExcelAttendanceRow[] {
  const exportFmt = isExportAttendanceFormat(rows);
  const parsed: ExcelAttendanceRow[] = [];
  for (const row of rows) {
    const item = exportFmt
      ? parseExportAttendanceRow(row)
      : parseSimpleRow(row);
    if (item) parsed.push(item);
  }
  return parsed;
}

function pickSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  const preferred =
    wb.SheetNames.find((n) => /export\s*attendance/i.test(n)) ||
    wb.SheetNames.find((n) => /absensi|attendance/i.test(n)) ||
    wb.SheetNames[0];
  return wb.Sheets[preferred];
}

export function parseAttendanceExcel(
  filePath?: string,
): ExcelAttendanceRow[] {
  const resolved = filePath || defaultAttendanceFilePath();
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `File tidak ditemukan: ${resolved}. Letakkan template.xlsx di folder project, atau unggah lewat form.`,
    );
  }
  const wb = XLSX.readFile(resolved);
  const sheet = pickSheet(wb);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  return parseRows(rows);
}

export function parseAttendanceExcelBuffer(
  buffer: Buffer,
): ExcelAttendanceRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = pickSheet(wb);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  return parseRows(rows);
}

export function defaultAttendanceFilePath() {
  if (fs.existsSync(TEMPLATE_FILE)) return TEMPLATE_FILE;
  return ABSENSI_FILE;
}

/** Skor kedisiplinan 0–100 dari ringkasan periode */
export function computeDisciplineScore(input: {
  workDays: number;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
}): number {
  const workDays = Math.max(input.workDays, 1);
  let score = 100;
  score -= (input.absentDays / workDays) * 45;
  score -= Math.min(input.lateCount * 2.5, 20);
  score -= Math.min(input.totalLateMinutes / 30, 15);
  score += Math.min(input.totalOvertimeMinutes / 120, 5);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}
