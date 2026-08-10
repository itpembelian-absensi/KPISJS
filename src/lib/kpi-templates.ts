import type { KpiFunction } from "./types";

export type KpiTemplateItem = Omit<
  KpiFunction,
  "id" | "departmentId" | "active"
> & { active?: boolean };

/** Template standar fungsi KPI per kode departemen */
export const DEPT_KPI_TEMPLATES: Record<string, KpiTemplateItem[]> = {
  IT: [
    {
      name: "IT Operation / Support",
      weightPercent: 40,
      focus:
        "Semua tiket support (semua kategori): SLA, response, satisfaction, repeat issue; plus uptime & backup",
      sortOrder: 1,
    },
    {
      name: "IT Project",
      weightPercent: 20,
      focus:
        "ERP, Website, Aplikasi Internal, Dashboard, Integrasi, Implementasi Project",
      sortOrder: 2,
    },
    {
      name: "Improvement & Innovation",
      weightPercent: 10,
      focus:
        "Digitalisasi proses, otomatisasi, AI, efisiensi kerja, improvement sistem",
      sortOrder: 3,
    },
    {
      name: "Security & Governance",
      weightPercent: 25,
      focus:
        "Backup, Security, Audit, SOP, Hak Akses, Disaster Recovery, Asset IT",
      sortOrder: 4,
    },
    {
      name: "Kedisiplinan & Kehadiran",
      weightPercent: 5,
      focus: "Absensi, keterlambatan, kepatuhan jam kerja",
      sortOrder: 5,
    },
  ],
  FIN: [
    {
      name: "Closing & Reporting",
      weightPercent: 30,
      focus: "Closing bulanan tepat waktu, laporan keuangan, akurasi jurnal",
      sortOrder: 1,
    },
    {
      name: "Cash & Receivable",
      weightPercent: 25,
      focus: "AR aging, koleksi piutang, cash flow, pembayaran",
      sortOrder: 2,
    },
    {
      name: "Compliance & Audit",
      weightPercent: 25,
      focus: "Pajak, audit internal/eksternal, dokumentasi finance",
      sortOrder: 3,
    },
    {
      name: "Finance Process Improvement",
      weightPercent: 20,
      focus: "Otomasi finance, efisiensi proses, kontrol internal",
      sortOrder: 4,
    },
  ],
  HRD: [
    {
      name: "Talent Acquisition",
      weightPercent: 25,
      focus: "Time-to-hire, kualitas kandidat, pemenuhan posisi",
      sortOrder: 1,
    },
    {
      name: "People Operations",
      weightPercent: 30,
      focus: "Payroll akurat, absensi, administrasi karyawan",
      sortOrder: 2,
    },
    {
      name: "Learning & Engagement",
      weightPercent: 25,
      focus: "Training completion, retensi, employee engagement",
      sortOrder: 3,
    },
    {
      name: "HR Compliance",
      weightPercent: 20,
      focus: "Kontrak, BPJS, kebijakan ketenagakerjaan",
      sortOrder: 4,
    },
  ],
  WH: [
    {
      name: "Inventory Accuracy",
      weightPercent: 30,
      focus: "Stock opname, variance, data stok akurat",
      sortOrder: 1,
    },
    {
      name: "Fulfillment & Dispatch",
      weightPercent: 30,
      focus: "Order picking, packing, on-time dispatch",
      sortOrder: 2,
    },
    {
      name: "Warehouse Efficiency",
      weightPercent: 25,
      focus: "Throughput, utilisasi ruang, lead time gudang",
      sortOrder: 3,
    },
    {
      name: "Warehouse Safety",
      weightPercent: 15,
      focus: "K3 gudang, SOP handling, zero accident",
      sortOrder: 4,
    },
  ],
  MKT: [
    {
      name: "Lead Generation",
      weightPercent: 30,
      focus: "Leads berkualitas, campaign ROI, pipeline marketing",
      sortOrder: 1,
    },
    {
      name: "Brand & Content",
      weightPercent: 25,
      focus: "Konten, awareness, engagement channel",
      sortOrder: 2,
    },
    {
      name: "Demand Conversion",
      weightPercent: 25,
      focus: "Conversion rate, dukungan sales, nurturing",
      sortOrder: 3,
    },
    {
      name: "Market Insight",
      weightPercent: 20,
      focus: "Riset pasar, competitor analysis, insight bisnis",
      sortOrder: 4,
    },
  ],
  OPS: [
    {
      name: "Operational Excellence",
      weightPercent: 35,
      focus: "Output, ketepatan proses, ketepatan waktu operasional",
      sortOrder: 1,
    },
    {
      name: "Quality & Service Level",
      weightPercent: 30,
      focus: "Defect rate, SLA layanan, kepuasan internal",
      sortOrder: 2,
    },
    {
      name: "Cost Efficiency",
      weightPercent: 20,
      focus: "Cost control, waste reduction, efisiensi biaya",
      sortOrder: 3,
    },
    {
      name: "Continuous Improvement",
      weightPercent: 15,
      focus: "Kaizen, update SOP, perbaikan berkelanjutan",
      sortOrder: 4,
    },
  ],
  MTR: [
    {
      name: "Jumlah Unit Kendaraan Sehat",
      weightPercent: 10,
      focus: "Unit siap operasi dibanding target bulanan",
      sortOrder: 1,
    },
    {
      name: "Jumlah Unit yang Diperbaiki",
      weightPercent: 20,
      focus: "Unit selesai diperbaiki sesuai target; penalti rework/terlambat",
      sortOrder: 2,
    },
    {
      name: "Kegiatan Perawatan Rutin",
      weightPercent: 35,
      focus: "Daily / Weekly / Monthly check & service hour meter",
      sortOrder: 3,
    },
    {
      name: "Keamanan Aset Perusahaan",
      weightPercent: 15,
      focus: "Tool, sparepart, oli, area kerja sesuai SOP / 5R",
      sortOrder: 4,
    },
    {
      name: "Penghematan Biaya Perbaikan",
      weightPercent: 15,
      focus: "Diagnosis tepat, efisiensi sparepart, tanpa pemborosan",
      sortOrder: 5,
    },
    {
      name: "Kedisiplinan & Kehadiran",
      weightPercent: 5,
      focus: "Tepat waktu, tidak alpha, tidak pulang cepat / absensi",
      sortOrder: 6,
    },
  ],
};

/** Template generik jika kode departemen belum punya standar khusus */
export const GENERIC_KPI_TEMPLATE: KpiTemplateItem[] = [
  {
    name: "Hasil Kerja Utama",
    weightPercent: 40,
    focus: "Target output inti departemen, ketepatan waktu penyelesaian",
    sortOrder: 1,
  },
  {
    name: "Kualitas & Kepatuhan",
    weightPercent: 25,
    focus: "Akurasi, standar mutu, kepatuhan prosedur",
    sortOrder: 2,
  },
  {
    name: "Kolaborasi & Layanan",
    weightPercent: 20,
    focus: "Kerja sama lintas dept, respons permintaan internal",
    sortOrder: 3,
  },
  {
    name: "Improvement",
    weightPercent: 15,
    focus: "Inisiatif perbaikan, efisiensi, dokumentasi proses",
    sortOrder: 4,
  },
];

export function templateForDepartmentCode(code: string): KpiTemplateItem[] {
  const key = code.trim().toUpperCase();
  return DEPT_KPI_TEMPLATES[key] ?? GENERIC_KPI_TEMPLATE;
}
