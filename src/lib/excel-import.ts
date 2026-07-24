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
};

const DEFAULT_FILE = path.join(process.cwd(), "employe.xlsx");

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
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
      row["Employee ID"] ?? row["EmployeeID"] ?? row["NIK"] ?? row["Kode"],
    );
    const name = clean(
      row["Full Name"] ?? row["Nama"] ?? row["Name"] ?? row["Nama Lengkap"],
    );
    if (!employeeCode || !name) continue;

    const position = clean(
      row["Job Position"] ?? row["Jabatan"] ?? row["Position"] ?? "Staff",
    );
    const jobLevel = clean(row["Job Level"] ?? row["Level"] ?? "");
    const email = clean(row["Email"] ?? row["E-mail"] ?? "");
    const phone = clean(
      row["Mobile Phone"] ?? row["Phone"] ?? row["Telepon"] ?? row["HP"] ?? "",
    );
    const deptFromFile = clean(
      row["Department"] ?? row["Departemen"] ?? row["Dept"] ?? "",
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
    });
  }

  return parsed;
}

export function defaultEmployeeExcelPath() {
  return DEFAULT_FILE;
}
