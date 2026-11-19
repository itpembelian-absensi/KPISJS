import fs from "fs";
import * as XLSX from "xlsx";

type Row = {
  code: string;
  fn: string;
  name: string;
  tipe: string;
  bukti: string;
  unit: string;
  target: number | null;
  weight: number | null;
};

const SKIP = new Set(["Panduan", "Marcomm"]);
const JABATAN: Record<string, string> = {
  "Procurement Non Stock": "Procurement",
};

const book = XLSX.readFile(process.argv[2], { cellFormula: false });

function cell(sheet: XLSX.WorkSheet, col: string, row: number): unknown {
  return (sheet[`${col}${row}`] as { v?: unknown } | undefined)?.v;
}

function text(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function targetOf(raw: unknown, tipe: string, unit: string): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (tipe === "Kejadian") return 0;
  const asPercent = unit === "%" || tipe === "Batas maks";
  if (asPercent && n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return n;
}

function weightOf(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 1) return Math.round(n * 10000) / 100;
  return n;
}

function rowsOf(sheet: XLSX.WorkSheet): Row[] {
  const out: Row[] = [];
  for (let row = 1; row <= 80; row += 1) {
    const code = text(cell(sheet, "A", row));
    if (!/^[MAJU]\d+$/.test(code)) continue;
    const unit = text(cell(sheet, "G", row));
    const tipe = text(cell(sheet, "E", row));
    out.push({
      code,
      fn: text(cell(sheet, "B", row)),
      name: text(cell(sheet, "C", row)),
      tipe,
      bukti: text(cell(sheet, "F", row)),
      unit,
      target: targetOf(cell(sheet, "H", row), tipe, unit),
      weight: weightOf(cell(sheet, "M", row)),
    });
  }
  return out;
}

function equalWeights(count: number): number[] {
  const base = Math.floor(100 / count);
  const extra = 100 - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

const FUNCTION_META: Record<string, { name: string; weight: number; sort: number; focus: string }> = {
  M: {
    name: "Mutu",
    weight: 25,
    sort: 1,
    focus: "Kualitas pekerjaan jabatan ini",
  },
  A: {
    name: "Andal",
    weight: 10,
    sort: 2,
    focus: "Kehadiran, ketepatan waktu, dan laporan harian",
  },
  J: {
    name: "Jalin Kerja Sama",
    weight: 15,
    sort: 3,
    focus: "Kerja sama antar divisi",
  },
  U: {
    name: "Unjuk Kerja",
    weight: 50,
    sort: 4,
    focus: "Hasil kerja jabatan ini",
  },
};

const sheets = book.SheetNames.filter((name) => !SKIP.has(name)).map((name) => {
  const rows = rowsOf(book.Sheets[name]);
  const jabatanName = JABATAN[name] || name;
  const scoreMethod = rows.some((row) => row.weight != null) ? "bobot" : "rata-rata";
  const groups = ["M", "A", "J", "U"].map((code) => {
    const kids = rows.filter((row) => row.code.startsWith(code));
    const meta = FUNCTION_META[code];
    const shares = scoreMethod === "rata-rata" ? equalWeights(kids.length || 1) : [];
    return {
      name: meta.name,
      weightPercent: meta.weight,
      groupCode: code,
      focus: meta.focus,
      sortOrder: meta.sort,
      indicators: kids.map((row, index) => {
        const rule =
          row.tipe === "Kejadian" ? "kejadian" : row.tipe === "Batas maks" ? "batas" : "ratio";
        const notes =
          rule === "kejadian"
            ? "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            : rule === "batas"
              ? "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
              : row.target == null
                ? "Target angka wajib diisi atasan. Sebelum itu indikator tidak dihitung."
                : undefined;
        return {
          name: row.name,
          description: row.bukti || row.name,
          weightPercent: scoreMethod === "bobot" ? row.weight || 0 : shares[index],
          metricType: "ratio",
          sortOrder: Number(row.code.slice(1)) || index + 1,
          config: {
            code: row.code,
            unit: row.unit,
            dataSource: "manual",
            jabatanName,
            rule,
            direction: rule === "batas" ? "lower" : "higher",
            ...(row.target != null ? { defaultTarget: row.target } : {}),
            ...(notes ? { notes } : {}),
          },
        };
      }),
    };
  }).filter((fn) => fn.indicators.length > 0);

  return { jabatanName, scoreMethod, functions: groups };
});

const body = `import type { ScoreFunctionTemplate } from "./kpi-score-templates";

export type MajuWorkbookSheet = {
  jabatanName: string;
  scoreMethod: "bobot" | "rata-rata";
  functions: ScoreFunctionTemplate[];
};

/** Lembar KPI MAJU dari berkas KPI_MAJU_SJS. Markom tetap di template sendiri. */
export const MAJU_WORKBOOK: MajuWorkbookSheet[] = ${JSON.stringify(sheets, null, 2)};
`;

fs.writeFileSync("src/lib/kpi-maju-workbook.ts", body);
console.log(
  sheets
    .map(
      (sheet) =>
        `${sheet.jabatanName} ${sheet.scoreMethod} ${sheet.functions.reduce((sum, fn) => sum + fn.indicators.length, 0)}`,
    )
    .join("\n"),
);
