import * as XLSX from "xlsx";
import { getEffectiveDepartmentScope } from "./auth";
import { getDb } from "./db";
import {
  listMeetingNotes,
  saveMeetingNote,
  type MeetingInput,
  type MeetingItemInput,
} from "./meeting-ops";
import { listDepartments, listStaff } from "./store";
import type { Department, MeetingItemStatus, MeetingNote, SessionUser } from "./types";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 800;
const MAX_ERRORS = 40;

export const MEETING_IMPORT_HEADERS = [
  "Kode grup",
  "Judul notulen",
  "Tanggal",
  "Waktu",
  "Departemen notulen",
  "Peserta",
  "Pihak luar",
  "Ringkasan",
  "Topik",
  "Detail permasalahan",
  "Keputusan",
  "Departemen bahasan",
  "PIC",
  "Tanggal awal",
  "Target selesai",
  "Status",
] as const;

type Field =
  | "group"
  | "title"
  | "date"
  | "time"
  | "noteDept"
  | "attendees"
  | "external"
  | "summary"
  | "topic"
  | "problem"
  | "detail"
  | "itemDept"
  | "pic"
  | "start"
  | "due"
  | "status";

const HEADER_FIELD: Record<string, Field> = {
  "kode grup": "group",
  kode: "group",
  grup: "group",
  "judul notulen": "title",
  judul: "title",
  tanggal: "date",
  "tanggal rapat": "date",
  "tanggal meeting": "date",
  waktu: "time",
  jam: "time",
  "departemen notulen": "noteDept",
  departemen: "noteDept",
  peserta: "attendees",
  "peserta karyawan": "attendees",
  "pihak luar": "external",
  ringkasan: "summary",
  "ringkasan notulen": "summary",
  topik: "topic",
  bahasan: "topic",
  "detail permasalahan": "problem",
  permasalahan: "problem",
  "topik detail permasalahan": "problem",
  keputusan: "detail",
  "detail keputusan": "detail",
  detail: "detail",
  "tindak lanjut": "detail",
  "departemen bahasan": "itemDept",
  pic: "pic",
  "penanggung jawab": "pic",
  "tanggal awal": "start",
  mulai: "start",
  "tanggal awal pembahasan": "start",
  "target selesai": "due",
  "jadwal selesai": "due",
  "jatuh tempo": "due",
  status: "status",
};

const MONTHS: Record<string, number> = {
  jan: 1,
  januari: 1,
  feb: 2,
  februari: 2,
  mar: 3,
  maret: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  agu: 8,
  agustus: 8,
  aug: 8,
  sep: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  nov: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
};

const ALL_DEPT = new Set(["*", "semua", "semua departemen", "all"]);

export type MeetingImportStaff = {
  id: string;
  name: string;
  employeeCode: string;
  departmentId: string;
};

export type MeetingImportContext = {
  departments: Department[];
  allDepartments: Department[];
  staff: MeetingImportStaff[];
  allStaff: MeetingImportStaff[];
  companyWide: boolean;
};

export type MeetingImportResult = {
  meetings: MeetingNote[];
  itemCount: number;
  warnings: string[];
};

type DraftGroup = {
  kode: string;
  title: string;
  date: string;
  time: string;
  noteDept: string;
  attendees: string[];
  external: string[];
  summaries: string[];
  items: MeetingItemInput[];
  row: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function normHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\*+/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (value instanceof Date) return "";
  return String(value).replace(/\u00a0/g, " ").trim();
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n|]|(?:\s+\/\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function validIso(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function isoFromParts(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return validIso(iso) ? iso : null;
}

function parseDate(value: unknown): { iso: string } | { error: string } {
  if (value == null || value === "") return { iso: "" };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { error: "tanggal tidak valid" };
    const iso = isoFromParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
    return iso ? { iso } : { error: "tanggal tidak valid" };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (
      Number.isInteger(value) &&
      value >= 19000101 &&
      value <= 21001231
    ) {
      const text = String(value);
      const iso = isoFromParts(
        Number(text.slice(0, 4)),
        Number(text.slice(4, 6)),
        Number(text.slice(6, 8)),
      );
      return iso ? { iso } : { error: "tanggal tidak valid" };
    }
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return { error: "tanggal tidak valid" };
    const iso = isoFromParts(parsed.y, parsed.m, parsed.d);
    return iso ? { iso } : { error: "tanggal tidak valid" };
  }
  const text = asText(value);
  if (!text) return { iso: "" };
  const isoLead = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (isoLead) {
    const iso = isoFromParts(
      Number(isoLead[1]),
      Number(isoLead[2]),
      Number(isoLead[3]),
    );
    return iso ? { iso } : { error: "tanggal tidak valid" };
  }
  const numeric = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(text);
  if (numeric) {
    const iso = isoFromParts(
      Number(numeric[3]),
      Number(numeric[2]),
      Number(numeric[1]),
    );
    return iso ? { iso } : { error: "tanggal tidak valid" };
  }
  const named = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (!month) return { error: "tanggal tidak valid" };
    const iso = isoFromParts(Number(named[3]), month, Number(named[1]));
    return iso ? { iso } : { error: "tanggal tidak valid" };
  }
  return { error: "tanggal tidak valid. Gunakan YYYY-MM-DD" };
}

function parseTime(value: unknown): { time: string } | { error: string } {
  if (value == null || value === "") return { time: "" };
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value) && value >= 0 && value <= 23) {
      return { time: `${pad(value)}:00` };
    }
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return { error: "waktu tidak valid" };
    return { time: `${pad(parsed.H)}:${pad(parsed.M)}` };
  }
  const text = asText(value);
  if (!text) return { time: "" };
  const match = /^(\d{1,2})[.:](\d{2})(?::\d{2})?$/.exec(text);
  if (!match) return { error: "waktu tidak valid. Gunakan HH:MM" };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { error: "waktu tidak valid" };
  return { time: `${pad(hour)}:${pad(minute)}` };
}

function parseStatus(
  value: unknown,
): { status: MeetingItemStatus } | { error: string } {
  const text = asText(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!text) return { status: "open" };
  if (text === "belum mulai" || text === "belum" || text === "open" || text === "baru") {
    return { status: "open" };
  }
  if (
    text === "on progress" ||
    text === "in progress" ||
    text === "progress" ||
    text === "berjalan"
  ) {
    return { status: "in_progress" };
  }
  if (text === "selesai" || text === "done" || text === "closed") {
    return { status: "done" };
  }
  return { error: 'status harus Belum mulai, On progress, atau Selesai' };
}

function codeKeys(code: string): string[] {
  const key = normKey(code);
  if (!key) return [];
  const stripped = key.replace(/^0+/, "");
  if (stripped && stripped !== key) return [key, stripped];
  return [key];
}

function tokenVariants(token: string): string[] {
  const wrapped = /^(.*?)\(([^)]+)\)\s*$/.exec(token.trim());
  if (!wrapped) return [token.trim()];
  return [wrapped[2].trim(), wrapped[1].trim()].filter(Boolean);
}

function staffByCode(list: MeetingImportStaff[], token: string): MeetingImportStaff[] {
  const keys = new Set(codeKeys(token));
  if (keys.size === 0) return [];
  return list.filter((person) =>
    codeKeys(person.employeeCode).some((key) => keys.has(key)),
  );
}

function staffByName(list: MeetingImportStaff[], token: string): MeetingImportStaff[] {
  const key = normKey(token);
  if (!key) return [];
  return list.filter((person) => normKey(person.name) === key);
}

function resolvePerson(
  token: string,
  label: string,
  ctx: MeetingImportContext,
): { id: string } | { error: string } {
  const tries = tokenVariants(token);
  for (const tryToken of tries) {
    const byCode = staffByCode(ctx.staff, tryToken);
    if (byCode.length === 1) return { id: byCode[0].id };
    if (byCode.length > 1) {
      return {
        error: `${label} "${token}" cocok dengan lebih dari satu NIK. Periksa sheet Referensi`,
      };
    }
    const byName = staffByName(ctx.staff, tryToken);
    if (byName.length === 1) return { id: byName[0].id };
    if (byName.length > 1) {
      const codes = byName
        .map((person) => person.employeeCode || person.name)
        .join(", ");
      return {
        error: `${label} "${token}" dipakai lebih dari satu karyawan. Pakai NIK: ${codes}`,
      };
    }
  }
  const outside = tries.some(
    (tryToken) =>
      staffByCode(ctx.allStaff, tryToken).length > 0 ||
      staffByName(ctx.allStaff, tryToken).length > 0,
  );
  if (outside) return { error: `${label} "${token}" di luar akses Anda` };
  return {
    error: `${label} "${token}" tidak ditemukan. Salin nama atau NIK dari sheet Referensi`,
  };
}

function resolvePeople(
  raw: string,
  label: string,
  ctx: MeetingImportContext,
): { ids: string[] } | { error: string } {
  const ids: string[] = [];
  for (const token of splitList(raw)) {
    const found = resolvePerson(token, label, ctx);
    if ("error" in found) return found;
    if (!ids.includes(found.id)) ids.push(found.id);
  }
  return { ids };
}

function resolveDepartments(
  raw: string,
  label: string,
  ctx: MeetingImportContext,
): { ids: string[] } | { error: string } {
  const tokens = splitList(raw);
  if (tokens.length === 0) return { ids: [] };
  const allTokens = tokens.filter((token) => ALL_DEPT.has(normKey(token)));
  if (allTokens.length > 0) {
    if (allTokens.length !== tokens.length) {
      return { error: `${label} tidak boleh mencampur Semua dengan kode departemen` };
    }
    if (!ctx.companyWide) {
      return {
        error: `${label} "Semua" hanya bisa dipakai akun dengan akses seluruh departemen`,
      };
    }
    return { ids: ["*"] };
  }
  const ids: string[] = [];
  for (const token of tokens) {
    const key = normKey(token);
    const allowed =
      ctx.departments.find((dept) => normKey(dept.code) === key) ||
      ctx.departments.find((dept) => normKey(dept.name) === key);
    if (allowed) {
      if (!ids.includes(allowed.id)) ids.push(allowed.id);
      continue;
    }
    const known = ctx.allDepartments.find(
      (dept) => normKey(dept.code) === key || normKey(dept.name) === key,
    );
    if (known) return { error: `${label} "${token}" di luar akses Anda` };
    return {
      error: `${label} "${token}" tidak ditemukan. Gunakan kode di sheet Referensi`,
    };
  }
  return { ids };
}

function sheetGrid(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const lastRow = Math.min(range.e.r, 3000);
  const lastCol = Math.min(range.e.c, 40);
  const rows: unknown[][] = [];
  for (let r = 0; r <= lastRow; r += 1) {
    const row: unknown[] = [];
    if (r >= range.s.r) {
      for (let c = range.s.c; c <= lastCol; c += 1) {
        const value = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
        row[c] = value == null ? "" : value;
      }
    }
    rows.push(row);
  }
  return rows;
}

function findHeader(rows: unknown[][]): { index: number; columns: Map<Field, number> } | { error: string } {
  const limit = Math.min(rows.length, 8);
  for (let index = 0; index < limit; index += 1) {
    const row = rows[index] ?? [];
    const columns = new Map<Field, number>();
    let recognized = 0;
    for (let col = 0; col < row.length; col += 1) {
      const field = HEADER_FIELD[normHeader(row[col])];
      if (!field) continue;
      recognized += 1;
      if (columns.has(field)) {
        return {
          error: `Kolom "${asText(row[col])}" bentrok dengan kolom lain untuk data yang sama`,
        };
      }
      columns.set(field, col);
    }
    if (recognized >= 3 && columns.has("title") && columns.has("date") && columns.has("topic")) {
      return { index, columns };
    }
  }
  return {
    error:
      "Sheet Notulen harus punya kolom Judul notulen, Tanggal, dan Topik. Unduh template lalu isi di sheet Notulen.",
  };
}

function cell(row: unknown[], columns: Map<Field, number>, field: Field): unknown {
  const index = columns.get(field);
  if (index == null) return "";
  return row[index] ?? "";
}

function pushUnique(list: string[], value: string) {
  const key = normKey(value);
  if (!key) return;
  if (list.some((item) => normKey(item) === key)) return;
  list.push(value.trim());
}

/**
 * Baca sheet Notulen. Baris dengan Kode grup yang sama, atau judul+tanggal
 * yang sama bila kode kosong, digabung menjadi satu notulen.
 */
export function parseMeetingWorkbook(
  buffer: Buffer,
  ctx: MeetingImportContext,
): { inputs: MeetingInput[]; itemCount: number; warnings: string[]; errors: string[] } {
  if (buffer.length === 0) {
    return { inputs: [], itemCount: 0, warnings: [], errors: ["File Excel kosong"] };
  }
  if (buffer.length > MAX_BYTES) {
    return {
      inputs: [],
      itemCount: 0,
      warnings: [],
      errors: ["File terlalu besar. Maksimal 5 MB"],
    };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    return {
      inputs: [],
      itemCount: 0,
      warnings: [],
      errors: ["File Excel tidak bisa dibaca. Simpan sebagai .xlsx lalu unggah lagi"],
    };
  }

  const sheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === "notulen",
  );
  const fallbackName = workbook.SheetNames.find((name) => {
    const key = name.trim().toLowerCase();
    return key !== "contoh" && key !== "petunjuk" && key !== "referensi";
  });
  const chosen = sheetName || fallbackName;
  if (!chosen) {
    return {
      inputs: [],
      itemCount: 0,
      warnings: [],
      errors: ["Sheet Notulen tidak ditemukan. Isi data di sheet Notulen pada template"],
    };
  }
  const sheet = workbook.Sheets[chosen];
  if (!sheet) {
    return {
      inputs: [],
      itemCount: 0,
      warnings: [],
      errors: ["Sheet Notulen tidak bisa dibaca"],
    };
  }
  const used = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
  if (used && used.e.r > 3000) {
    return {
      inputs: [],
      itemCount: 0,
      warnings: [],
      errors: ["Sheet terlalu panjang. Maksimal 3000 baris"],
    };
  }

  const rows = sheetGrid(sheet);
  const header = findHeader(rows);
  if ("error" in header) {
    const contoh = workbook.SheetNames.find(
      (name) => name.trim().toLowerCase() === "contoh",
    );
    if (contoh && sheetGrid(workbook.Sheets[contoh] || {}).length > 1) {
      return {
        inputs: [],
        itemCount: 0,
        warnings: [],
        errors: [
          "Sheet Notulen masih kosong. Isi data di sheet Notulen. Sheet Contoh hanya contoh dan tidak diimpor",
        ],
      };
    }
    return { inputs: [], itemCount: 0, warnings: [], errors: [header.error] };
  }

  const errors: string[] = [];
  const groups: DraftGroup[] = [];
  let current: DraftGroup | null = null;
  const dataRows = rows.slice(header.index + 1);
  let filledRows = 0;

  dataRows.forEach((row, offset) => {
    const excelRow = header.index + offset + 2;
    const kode = asText(cell(row, header.columns, "group"));
    const title = asText(cell(row, header.columns, "title"));
    const dateRaw = cell(row, header.columns, "date");
    const timeRaw = cell(row, header.columns, "time");
    const noteDept = asText(cell(row, header.columns, "noteDept"));
    const attendees = asText(cell(row, header.columns, "attendees"));
    const external = asText(cell(row, header.columns, "external"));
    const summary = asText(cell(row, header.columns, "summary"));
    const topic = asText(cell(row, header.columns, "topic"));
    const problem = asText(cell(row, header.columns, "problem"));
    const detail = asText(cell(row, header.columns, "detail"));
    const itemDept = asText(cell(row, header.columns, "itemDept"));
    const pic = asText(cell(row, header.columns, "pic"));
    const startRaw = cell(row, header.columns, "start");
    const dueRaw = cell(row, header.columns, "due");
    const statusRaw = cell(row, header.columns, "status");

    const dateParsed = parseDate(dateRaw);
    const timeParsed = parseTime(timeRaw);
    const startParsed = parseDate(startRaw);
    const dueParsed = parseDate(dueRaw);
    const statusParsed = parseStatus(statusRaw);
    if (
      "error" in dateParsed ||
      "error" in timeParsed ||
      "error" in startParsed ||
      "error" in dueParsed ||
      "error" in statusParsed
    ) {
      if ("error" in dateParsed) errors.push(`Baris ${excelRow}: Tanggal ${dateParsed.error}`);
      if ("error" in timeParsed) errors.push(`Baris ${excelRow}: Waktu ${timeParsed.error}`);
      if ("error" in startParsed) {
        errors.push(`Baris ${excelRow}: Tanggal awal ${startParsed.error}`);
      }
      if ("error" in dueParsed) {
        errors.push(`Baris ${excelRow}: Target selesai ${dueParsed.error}`);
      }
      if ("error" in statusParsed) errors.push(`Baris ${excelRow}: ${statusParsed.error}`);
      const looksNew =
        current == null ||
        (kode !== "" && normKey(kode) !== normKey(current.kode)) ||
        (title !== "" &&
          current.title !== "" &&
          normKey(title) !== normKey(current.title));
      if (looksNew) current = null;
      return;
    }

    const date = dateParsed.iso;
    const time = timeParsed.time;
    const headerEmpty =
      !kode &&
      !title &&
      !date &&
      !time &&
      !noteDept &&
      !attendees &&
      !external &&
      !summary;
    const rowEmpty =
      headerEmpty && !topic && !problem && !detail && !itemDept && !pic && !startParsed.iso && !dueParsed.iso && !asText(statusRaw);
    if (rowEmpty) return;
    filledRows += 1;
    if (filledRows > MAX_ROWS) {
      if (!errors.some((item) => item.startsWith("Terlalu banyak"))) {
        errors.push(`Terlalu banyak baris. Maksimal ${MAX_ROWS} bahasan sekali unggah`);
      }
      return;
    }

    const startGroup = !current || (!headerEmpty && !sameGroup(current, kode, title, date));
    if (startGroup) {
      if (headerEmpty) {
        errors.push(
          `Baris ${excelRow}: isi Judul notulen dan Tanggal, atau samakan Kode grup dengan baris di atasnya`,
        );
        return;
      }
      current = {
        kode,
        title,
        date,
        time,
        noteDept,
        attendees: [],
        external: [],
        summaries: [],
        items: [],
        row: excelRow,
      };
      groups.push(current);
    }
    if (!current) return;

    const nextTitle = mergeField(current.title, title, "Judul notulen", excelRow, errors);
    const nextDate = mergeField(current.date, date, "Tanggal", excelRow, errors);
    const nextTime = mergeField(current.time, time, "Waktu", excelRow, errors);
    const nextDept = mergeDept(current.noteDept, noteDept, excelRow, errors);
    if (nextTitle == null || nextDate == null || nextTime == null || nextDept == null) return;
    current.title = nextTitle;
    current.date = nextDate;
    current.time = nextTime;
    current.noteDept = nextDept;
    for (const name of splitList(attendees)) pushUnique(current.attendees, name);
    for (const name of splitList(external)) pushUnique(current.external, name);
    if (summary) pushUnique(current.summaries, summary);

    if (!topic) {
      if (problem || detail || itemDept || pic || startParsed.iso || dueParsed.iso) {
        errors.push(`Baris ${excelRow}: Topik wajib diisi kalau baris ini sebuah bahasan`);
      }
      return;
    }
    if (startParsed.iso && dueParsed.iso && startParsed.iso > dueParsed.iso) {
      errors.push(
        `Baris ${excelRow}: Target selesai tidak boleh sebelum tanggal awal`,
      );
      return;
    }

    const itemDepartments = resolveDepartments(itemDept, "Departemen bahasan", ctx);
    if ("error" in itemDepartments) {
      errors.push(`Baris ${excelRow}: ${itemDepartments.error}`);
      return;
    }
    const owners = resolvePeople(pic, "PIC", ctx);
    if ("error" in owners) {
      errors.push(`Baris ${excelRow}: ${owners.error}`);
      return;
    }
    const ownerName = owners.ids
      .map((id) => ctx.staff.find((person) => person.id === id)?.name || "")
      .filter(Boolean)
      .join(", ");
    current.items.push({
      topic,
      problemDetail: problem,
      detail,
      departmentIds: itemDepartments.ids,
      ownerStaffIds: owners.ids,
      ownerName,
      startDate: startParsed.iso,
      dueDate: dueParsed.iso,
      status: statusParsed.status,
    });
  });

  const inputs: MeetingInput[] = [];
  for (const group of groups) {
    if (!group.title) {
      errors.push(`Baris ${group.row}: Judul notulen wajib diisi`);
      continue;
    }
    if (!group.date) {
      errors.push(`Baris ${group.row}: Tanggal wajib diisi`);
      continue;
    }
    const departments = resolveDepartments(group.noteDept, "Departemen notulen", ctx);
    if ("error" in departments) {
      errors.push(`Baris ${group.row}: ${departments.error}`);
      continue;
    }
    if (departments.ids.length === 0) {
      errors.push(`Baris ${group.row}: Departemen notulen wajib diisi`);
      continue;
    }
    const attendees = resolvePeople(group.attendees.join(", "), "Peserta", ctx);
    if ("error" in attendees) {
      errors.push(`Baris ${group.row}: ${attendees.error}`);
      continue;
    }
    inputs.push({
      departmentIds: departments.ids,
      title: group.title,
      meetingDate: group.date,
      meetingTime: group.time,
      attendeeStaffIds: attendees.ids,
      externalAttendees: group.external.join(", "),
      summary: group.summaries.join("\n"),
      items: group.items,
    });
  }

  if (groups.length === 0 && errors.length === 0) {
    errors.push(
      "Sheet Notulen masih kosong. Isi minimal judul, tanggal, dan departemen, lalu unggah lagi",
    );
  }

  const itemCount = inputs.reduce((sum, input) => sum + (input.items?.length ?? 0), 0);
  return {
    inputs: errors.length > 0 ? [] : inputs,
    itemCount: errors.length > 0 ? 0 : itemCount,
    warnings: [],
    errors: trimErrors(errors),
  };
}

function sameGroup(current: DraftGroup, kode: string, title: string, date: string): boolean {
  if (kode) return current.kode !== "" && normKey(current.kode) === normKey(kode);
  if (title && current.title && normKey(title) !== normKey(current.title)) return false;
  if (date && current.date && date !== current.date) return false;
  return true;
}

function deptSignature(raw: string): string {
  return splitList(raw)
    .map((part) => normKey(part))
    .sort()
    .join("|");
}

function mergeDept(
  current: string,
  next: string,
  row: number,
  errors: string[],
): string | null {
  if (!next) return current;
  if (!current) return next;
  if (deptSignature(current) === deptSignature(next)) return current;
  errors.push(`Baris ${row}: Departemen notulen berbeda dengan baris lain pada notulen yang sama`);
  return null;
}

function mergeField(
  current: string,
  next: string,
  label: string,
  row: number,
  errors: string[],
): string | null {
  if (!next) return current;
  if (!current) return next;
  const same = label === "Tanggal" || label === "Waktu"
    ? current === next
    : normKey(current) === normKey(next);
  if (same) return current;
  errors.push(`Baris ${row}: ${label} berbeda dengan baris lain pada notulen yang sama`);
  return null;
}

function trimErrors(errors: string[]): string[] {
  if (errors.length <= MAX_ERRORS) return errors;
  const hidden = errors.length - MAX_ERRORS;
  return [...errors.slice(0, MAX_ERRORS), `Dan ${hidden} kesalahan lain`];
}

export function importMeetingNotesFromExcel(
  buffer: Buffer,
  ctx: MeetingImportContext,
  actor: { id: string; name: string },
): { result?: MeetingImportResult; error?: string; errors?: string[] } {
  const parsed = parseMeetingWorkbook(buffer, ctx);
  if (parsed.errors.length > 0 || parsed.inputs.length === 0) {
    return {
      error: "File belum bisa diimpor. Perbaiki baris berikut lalu unggah lagi",
      errors: parsed.errors.length > 0 ? parsed.errors : ["Tidak ada notulen yang bisa disimpan"],
    };
  }

  const scopeIds = ctx.companyWide ? undefined : ctx.departments.map((dept) => dept.id);
  const existing = new Set(
    listMeetingNotes(scopeIds).map(
      (meeting) => `${normKey(meeting.title)}|${meeting.meetingDate}`,
    ),
  );
  const warnings: string[] = [];
  for (const input of parsed.inputs) {
    const key = `${normKey(input.title)}|${input.meetingDate}`;
    if (!existing.has(key)) continue;
    warnings.push(
      `Notulen "${input.title}" tanggal ${input.meetingDate} sudah ada. Yang diunggah tetap disimpan sebagai notulen baru`,
    );
  }

  const db = getDb();
  try {
    const meetings = db.transaction(() => {
      const saved: MeetingNote[] = [];
      for (const input of parsed.inputs) {
        const result = saveMeetingNote(input, actor);
        if (result.error || !result.meeting) {
          throw new Error(result.error || "Gagal menyimpan notulen");
        }
        saved.push(result.meeting);
      }
      return saved;
    })();
    return {
      result: {
        meetings,
        itemCount: parsed.itemCount,
        warnings,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan notulen";
    return { error: message };
  }
}

export function meetingImportContext(
  user: SessionUser,
): MeetingImportContext | { error: string } {
  const scope = getEffectiveDepartmentScope(user);
  const allDepartments = listDepartments(true);
  const departments =
    scope === "all"
      ? allDepartments
      : allDepartments.filter((dept) => scope.includes(dept.id));
  if (departments.length === 0) {
    return { error: "Tidak ada departemen yang bisa diakses" };
  }
  const allowed = new Set(departments.map((dept) => dept.id));
  const allStaff = listStaff(true).map((person) => ({
    id: person.id,
    name: person.name,
    employeeCode: person.employeeCode,
    departmentId: person.departmentId,
  }));
  return {
    departments,
    allDepartments,
    staff: allStaff.filter((person) => allowed.has(person.departmentId)),
    allStaff,
    companyWide: scope === "all",
  };
}

export function buildMeetingImportTemplate(
  departments: Department[],
  staff: MeetingImportStaff[],
): Buffer {
  const deptCode = departments[0]?.code || "IT";
  const deptCode2 = departments[1]?.code || deptCode;
  const personA = staff[0]?.name || "Nama Karyawan";
  const personB = staff[1]?.name || personA;
  const sampleDate = "2026-10-17";

  const contoh: Array<Array<string>> = [
    [...MEETING_IMPORT_HEADERS],
    [
      "A",
      "Weekly Meeting 17 Okt 2026",
      sampleDate,
      "09:00",
      deptCode,
      `${personA}, ${personB}`,
      "",
      "Ringkasan keputusan rapat minggu ini.",
      "Open Positions",
      "Posisi yang masih terbuka dan status offering.",
      "Susyanti lanjut ke tahap offering.",
      deptCode2,
      personA,
      sampleDate,
      "2026-10-31",
      "On progress",
    ],
    [
      "A",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "SOP & KPI System",
      "Penyusunan SOP dan sistem KPI.",
      "Lanjut pembahasan minggu depan.",
      deptCode,
      personB,
      sampleDate,
      "2026-10-31",
      "Belum mulai",
    ],
    [
      "B",
      "Rapat Gudang",
      "2026-10-18",
      "10:00",
      deptCode,
      personA,
      "Vendor contoh",
      "",
      "Struktur Gaji Naker Gudang",
      "Kenaikan gaji dibahas bersama HRD.",
      "",
      deptCode,
      personA,
      "2026-10-18",
      "2026-10-21",
      "Selesai",
    ],
  ];

  const petunjuk: Array<Array<string>> = [
    ["Petunjuk unggah notulen"],
    [""],
    ["Isi data di sheet Notulen. Satu baris sama dengan satu bahasan."],
    [
      "Baris dengan Kode grup yang sama digabung menjadi satu notulen. Contoh: semua baris berkode A menjadi satu notulen.",
    ],
    [
      "Judul, tanggal, waktu, departemen, peserta, pihak luar, dan ringkasan cukup diisi pada baris pertama tiap grup.",
    ],
    [
      "Kalau Kode grup dikosongkan, baris dengan judul dan tanggal yang sama digabung menjadi satu notulen.",
    ],
    [
      "Departemen diisi kode departemen dari sheet Referensi. Beberapa kode dipisah koma. Tulis Semua bila untuk seluruh departemen.",
    ],
    [
      "Peserta dan PIC diisi nama karyawan atau NIK, dipisah koma. Salin dari sheet Referensi supaya ejaannya sama.",
    ],
    ["Tanggal ditulis 2026-10-17. Waktu ditulis 09:00."],
    ["Status: Belum mulai, On progress, atau Selesai. Kosong berarti Belum mulai."],
    ["Sheet Contoh, Referensi, dan Petunjuk tidak diimpor."],
    [
      "Setiap unggahan membuat notulen baru. Mengunggah file yang sama dua kali akan membuat salinan baru.",
    ],
  ];

  const referensi: Array<Array<string>> = [
    ["Departemen"],
    ["Kode", "Nama"],
    ...departments.map((dept) => [dept.code, dept.name]),
    [],
    ["Karyawan (peserta dan PIC)"],
    ["NIK", "Nama", "Departemen"],
    ...[...staff]
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((person) => {
        const dept = departments.find((item) => item.id === person.departmentId);
        return [person.employeeCode, person.name, dept?.code || ""];
      }),
  ];

  const blank: Array<Array<string>> = [[...MEETING_IMPORT_HEADERS]];
  const wb = XLSX.utils.book_new();
  const notulen = XLSX.utils.aoa_to_sheet(blank);
  const contohSheet = XLSX.utils.aoa_to_sheet(contoh);
  const widths = [
    { wch: 12 },
    { wch: 34 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 32 },
    { wch: 24 },
    { wch: 36 },
    { wch: 32 },
    { wch: 42 },
    { wch: 36 },
    { wch: 22 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
  ];
  notulen["!cols"] = widths;
  contohSheet["!cols"] = widths;
  XLSX.utils.book_append_sheet(wb, notulen, "Notulen");
  XLSX.utils.book_append_sheet(wb, contohSheet, "Contoh");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(referensi), "Referensi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(petunjuk), "Petunjuk");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
