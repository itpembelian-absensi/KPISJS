import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type ExcelEmployeeRow = {
  employeeCode: string;
  name: string;
  position: string;
  jobLevel: string;
  email: string;
  phone: string;
  departmentCode: string;
  departmentName: string;
  /** false = resign / tidak bekerja */
  active: boolean;
};

const DEFAULT_FILE = path.join(process.cwd(), "employe.xlsx");

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && clean(row[key]) !== "") return row[key];
  }
  const lower = new Map(
    Object.keys(row).map((k) => [k.toLowerCase(), k] as const),
  );
  for (const key of keys) {
    const real = lower.get(key.toLowerCase());
    if (real && clean(row[real]) !== "") return row[real];
  }
  return "";
}

/** Status resign di export HR: kolom status, atau Resign Date terisi. */
export function isResignedEmployeeRow(row: Record<string, unknown>): boolean {
  const status = clean(
    pick(row, [
      "Status Employee",
      "Employment Status",
      "Employee Status",
      "Status Karyawan",
      "Status",
      "Status Kerja",
    ]),
  );
  if (
    /resign|resigned|terminate|terminated|inactive|nonaktif|keluar|\bphk\b|tidak aktif/i.test(
      status,
    )
  ) {
    return true;
  }
  const resignDate = pick(row, [
    "Resign Date",
    "Tanggal Resign",
    "Resignation Date",
    "Last Working Date",
    "Tanggal Keluar",
  ]);
  return clean(resignDate) !== "";
}

/** Infer departemen dari Job Position karena Excel belum punya kolom Department */
export function mapDepartmentFromPosition(position: string): {
  code: string;
  name: string;
} {
  const p = position.toLowerCase();

  if (/\bit\b|information technology|sistem informasi/.test(p)) {
    return { code: "IT", name: "Information Technology" };
  }
  if (
    /finance|accounting|treasury|cashier|invoicing|ar collection|collector|gl accounting/.test(
      p,
    )
  ) {
    return { code: "FIN", name: "Finance & Accounting" };
  }
  if (/hrd|human resource|ga\b|general affair|reception|office boy|messenger/.test(p)) {
    return { code: "HRD", name: "HRD & GA" };
  }
  if (/warehouse|inventory|tallyman/.test(p)) {
    return { code: "WH", name: "Warehouse" };
  }
  if (/marketing|sales|graphic design|communication/.test(p)) {
    return { code: "MKT", name: "Marketing & Sales" };
  }
  if (
    /produksi|laminasi|sortir|mekanik|inspector|grading|pengawas/.test(p)
  ) {
    return { code: "PRD", name: "Produksi" };
  }
  if (/security|komandan|pembina/.test(p)) {
    return { code: "SEC", name: "Security" };
  }
  if (/purchasing|procurement/.test(p)) {
    return { code: "PUR", name: "Purchasing" };
  }
  if (/owner|general manager|assistant manager/.test(p)) {
    return { code: "MGT", name: "Management" };
  }

  return { code: "GEN", name: "General" };
}

function normalizeDeptKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ORG_DEPT_ALIASES: Array<[RegExp, string]> = [
  [/\bhrd\b|human resource|general affair|\bga\b|legalitas/, "HRD"],
  [/warehouse|gudang/, "WH"],
  [/\baccount/, "ACC"],
  [/finance|keuangan/, "FIN"],
  [/\bit\b|information technology|sistem informasi/, "IT"],
  [/market|sales|penjualan/, "MKT"],
  [/produksi|production/, "PRD"],
  [/mekanik/, "MTR"],
  [/purchas|procurement/, "PUR"],
  [/security|satpam/, "SEC"],
  [/manag|direksi|owner/, "MGT"],
  [/operat/, "OPS"],
];

/** Cocokkan Organization/jabatan export HR ke master departemen. */
export function resolveDepartmentFromAttendance(input: {
  organization: string;
  position: string;
  existing: Array<{ code: string; name: string }>;
}): { code: string; name: string } {
  const position = input.position.trim();
  const organization = input.organization.trim();
  const existing = input.existing;

  // Security di lokasi gudang tetap masuk departemen Security
  if (/security|komandan|pembina/i.test(position)) {
    const sec = existing.find((d) => d.code.toUpperCase() === "SEC");
    return sec
      ? { code: sec.code, name: sec.name }
      : { code: "SEC", name: "Security" };
  }

  if (organization) {
    const orgKey = normalizeDeptKey(organization);
    const exact = existing.find(
      (d) =>
        normalizeDeptKey(d.name) === orgKey ||
        d.code.toLowerCase() === organization.toLowerCase(),
    );
    if (exact) return { code: exact.code, name: exact.name };

    const fuzzy = existing.find((d) => {
      const nameKey = normalizeDeptKey(d.name);
      if (nameKey.length < 4) return false;
      return orgKey.includes(nameKey) || nameKey.includes(orgKey);
    });
    if (fuzzy) return { code: fuzzy.code, name: fuzzy.name };

    for (const [re, code] of ORG_DEPT_ALIASES) {
      if (re.test(orgKey)) {
        const found = existing.find((d) => d.code.toUpperCase() === code);
        if (found) return { code: found.code, name: found.name };
      }
    }

    const code =
      organization
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 8) || "GEN";
    return { code, name: organization };
  }

  const fromPosition = mapDepartmentFromPosition(position);
  const found = existing.find(
    (d) => d.code.toUpperCase() === fromPosition.code,
  );
  if (found) return { code: found.code, name: found.name };
  return fromPosition;
}

export function parseEmployeeExcel(
  filePath = DEFAULT_FILE,
): ExcelEmployeeRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File tidak ditemukan: ${filePath}`);
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const parsed: ExcelEmployeeRow[] = [];

  for (const row of rows) {
    const employeeCode = clean(
      pick(row, ["Employee ID", "Employee ID", "EmployeeID", "NIK", "Kode"]),
    );
    const name = clean(
      pick(row, ["Full Name", "Full Name", "Nama", "Name", "Nama Lengkap"]),
    );
    if (!employeeCode || !name) continue;

    const position = clean(
      pick(row, ["Job Position", "Jabatan", "Position"]) || "Staff",
    );
    const jobLevel = clean(pick(row, ["Job Level", "Level"]));
    const email = clean(pick(row, ["Email", "E-mail"]));
    const phone = clean(
      pick(row, ["Mobile Phone", "Phone", "Telepon", "HP"]),
    );
    const deptFromFile = clean(
      pick(row, ["Department", "Departemen", "Organization", "Dept"]),
    );

    const mapped = deptFromFile
      ? {
          code: deptFromFile.slice(0, 8).toUpperCase().replace(/\s+/g, ""),
          name: deptFromFile,
        }
      : mapDepartmentFromPosition(position);

    parsed.push({
      employeeCode,
      name,
      position: jobLevel ? `${position} (${jobLevel})` : position,
      jobLevel,
      email,
      phone,
      departmentCode: mapped.code,
      departmentName: mapped.name,
      active: !isResignedEmployeeRow(row),
    });
  }

  return parsed;
}

export function defaultEmployeeExcelPath() {
  return DEFAULT_FILE;
}
