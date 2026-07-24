import type {
  KpiScoreDataSource,
  KpiScoreIndicatorConfig,
  KpiScoreMetricType,
} from "./types";

export type ScoreIndicatorTemplate = {
  name: string;
  description: string;
  weightPercent: number;
  metricType: KpiScoreMetricType;
  config: KpiScoreIndicatorConfig;
  sortOrder: number;
};

export type ScoreFunctionTemplate = {
  name: string;
  weightPercent: number;
  focus: string;
  sortOrder: number;
  indicators: ScoreIndicatorTemplate[];
};

/** Template aturan skor KPI Mekanik (MTR) — indikator terukur per fungsi */
export const MEKANIK_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
  {
    name: "Jumlah Unit Kendaraan Sehat",
    weightPercent: 10,
    focus: "Unit siap operasi dibanding target bulanan",
    sortOrder: 1,
    indicators: [
      {
        name: "Unit siap operasi",
        description: "Jumlah unit sehat/siap operasi vs target bulan",
        weightPercent: 100,
        metricType: "scale_count",
        sortOrder: 1,
        config: {
          defaultTarget: 15,
          notes: "Target default 15 unit/bulan (bisa diubah per periode)",
          bands: [
            { min: 15, score: 100, label: "≥15 unit" },
            { min: 14, score: 95, label: "14 unit" },
            { min: 13, score: 90, label: "13 unit" },
            { min: 12, score: 85, label: "12 unit" },
            { min: 11, score: 80, label: "11 unit" },
            { min: 10, score: 75, label: "10 unit" },
            { min: 9, score: 70, label: "9 unit" },
            { min: 8, score: 60, label: "8 unit" },
            { min: 0, score: 50, label: "<8 unit" },
          ],
        },
      },
    ],
  },
  {
    name: "Jumlah Unit yang Diperbaiki",
    weightPercent: 20,
    focus: "Unit selesai diperbaiki sesuai target; penalti rework/terlambat",
    sortOrder: 2,
    indicators: [
      {
        name: "Unit selesai vs target",
        description: "Persentase penyelesaian unit diperbaiki terhadap target",
        weightPercent: 100,
        metricType: "scale_percent",
        sortOrder: 1,
        config: {
          defaultTarget: 20,
          notes: "Dinilai dari % target selesai, bukan banyaknya bongkar pasang",
          bandsPercent: [
            { min: 100, score: 100, label: "100% target" },
            { min: 95, score: 95, label: "95%" },
            { min: 90, score: 90, label: "90%" },
            { min: 85, score: 85, label: "85%" },
            { min: 80, score: 80, label: "80%" },
            { min: 75, score: 75, label: "75%" },
            { min: 70, score: 70, label: "70%" },
            { min: 0, score: 60, label: "<70%" },
          ],
          penalties: [
            {
              code: "rework",
              label: "Kerusakan berulang / rework",
              points: -10,
            },
            {
              code: "late",
              label: "Terlambat selesai",
              points: -5,
            },
          ],
        },
      },
    ],
  },
  {
    name: "Kegiatan Perawatan Rutin",
    weightPercent: 35,
    focus: "Daily / Weekly / Monthly check & service hour meter",
    sortOrder: 3,
    indicators: [
      {
        name: "Daily Check",
        description: "% checklist perawatan harian selesai",
        weightPercent: 20,
        metricType: "scale_percent",
        sortOrder: 1,
        config: {
          defaultTarget: 100,
          bandsPercent: [
            { min: 100, score: 100 },
            { min: 95, score: 95 },
            { min: 90, score: 90 },
            { min: 85, score: 85 },
            { min: 80, score: 80 },
            { min: 0, score: 70 },
          ],
        },
      },
      {
        name: "Weekly Check",
        description: "% checklist perawatan mingguan selesai",
        weightPercent: 20,
        metricType: "scale_percent",
        sortOrder: 2,
        config: {
          defaultTarget: 100,
          bandsPercent: [
            { min: 100, score: 100 },
            { min: 95, score: 95 },
            { min: 90, score: 90 },
            { min: 85, score: 85 },
            { min: 80, score: 80 },
            { min: 0, score: 70 },
          ],
        },
      },
      {
        name: "Monthly Check",
        description: "% checklist / PM bulanan selesai",
        weightPercent: 30,
        metricType: "scale_percent",
        sortOrder: 3,
        config: {
          defaultTarget: 100,
          bandsPercent: [
            { min: 100, score: 100 },
            { min: 95, score: 95 },
            { min: 90, score: 90 },
            { min: 85, score: 85 },
            { min: 80, score: 80 },
            { min: 0, score: 70 },
          ],
        },
      },
      {
        name: "Service Hour Meter",
        description: "% service sesuai hour meter selesai",
        weightPercent: 30,
        metricType: "scale_percent",
        sortOrder: 4,
        config: {
          defaultTarget: 100,
          bandsPercent: [
            { min: 100, score: 100 },
            { min: 95, score: 95 },
            { min: 90, score: 90 },
            { min: 85, score: 85 },
            { min: 80, score: 80 },
            { min: 0, score: 70 },
          ],
        },
      },
    ],
  },
  {
    name: "Keamanan Aset Perusahaan",
    weightPercent: 15,
    focus: "Tool, sparepart, oli, area kerja sesuai SOP / 5R",
    sortOrder: 4,
    indicators: [
      {
        name: "Tool lengkap",
        description: "Kelengkapan dan kondisi tool",
        weightPercent: 30,
        metricType: "weighted_leaf",
        sortOrder: 1,
        config: { notes: "Nilai observasi 0–100" },
      },
      {
        name: "Sparepart tersusun",
        description: "Kerapihan dan ketertiban sparepart",
        weightPercent: 30,
        metricType: "weighted_leaf",
        sortOrder: 2,
        config: { notes: "Nilai observasi 0–100" },
      },
      {
        name: "Oli tertata",
        description: "Oli & pelumas terkontrol",
        weightPercent: 20,
        metricType: "weighted_leaf",
        sortOrder: 3,
        config: { notes: "Nilai observasi 0–100" },
      },
      {
        name: "Area kerja bersih",
        description: "Area kerja sesuai 5R/5S",
        weightPercent: 20,
        metricType: "weighted_leaf",
        sortOrder: 4,
        config: { notes: "Nilai observasi 0–100" },
      },
    ],
  },
  {
    name: "Penghematan Biaya Perbaikan",
    weightPercent: 15,
    focus: "Diagnosis tepat, efisiensi sparepart, tanpa pemborosan",
    sortOrder: 5,
    indicators: [
      {
        name: "Perbaikan tanpa ganti part tidak perlu",
        description: "Tidak mengganti part yang masih layak",
        weightPercent: 40,
        metricType: "weighted_leaf",
        sortOrder: 1,
        config: {},
      },
      {
        name: "Reuse komponen masih layak",
        description: "Pemanfaatan ulang komponen yang masih baik",
        weightPercent: 20,
        metricType: "weighted_leaf",
        sortOrder: 2,
        config: {},
      },
      {
        name: "Tidak terjadi pemborosan",
        description: "Tidak ada pembelian / pemakaian berlebih",
        weightPercent: 20,
        metricType: "weighted_leaf",
        sortOrder: 3,
        config: {},
      },
      {
        name: "Tidak ada salah diagnosa",
        description: "Diagnosis tepat sebelum perbaikan",
        weightPercent: 20,
        metricType: "weighted_leaf",
        sortOrder: 4,
        config: {},
      },
    ],
  },
  {
    name: "Kedisiplinan & Kehadiran",
    weightPercent: 5,
    focus: "Tepat waktu, tidak alpha, tidak pulang cepat / absensi",
    sortOrder: 6,
    indicators: [
      {
        name: "Skor absensi periode",
        description:
          "Dari impor absensi (tepat waktu, tidak alpha, tidak pulang cepat)",
        weightPercent: 100,
        metricType: "attendance",
        sortOrder: 1,
        config: {
          dataSource: "attendance",
          notes:
            "Bisa dipecah: tepat waktu 40, tidak alpha 40, tidak pulang cepat 20 (fase input capaian)",
        },
      },
    ],
  },
];

const PCT_BANDS_STRICT = [
  { min: 100, score: 100, label: "100%" },
  { min: 99, score: 97, label: "99%" },
  { min: 98, score: 94, label: "98%" },
  { min: 95, score: 90, label: "95%" },
  { min: 90, score: 85, label: "90%" },
  { min: 85, score: 80, label: "85%" },
  { min: 80, score: 75, label: "80%" },
  { min: 0, score: 60, label: "<80%" },
];

function opIndicator(
  name: string,
  description: string,
  target: number,
  sortOrder: number,
  opts?: { notes?: string; dataSource?: KpiScoreDataSource },
): ScoreIndicatorTemplate {
  return {
    name,
    description,
    weightPercent: 10,
    metricType: "scale_percent",
    sortOrder,
    config: {
      defaultTarget: target,
      bandsPercent: PCT_BANDS_STRICT,
      dataSource: opts?.dataSource ?? "manual",
      notes: opts?.notes,
    },
  };
}

function leafIndicator(
  name: string,
  description: string,
  weightPercent: number,
  sortOrder: number,
  opts?: { notes?: string; dataSource?: KpiScoreDataSource },
): ScoreIndicatorTemplate {
  return {
    name,
    description,
    weightPercent,
    metricType: "weighted_leaf",
    sortOrder,
    config: {
      dataSource: opts?.dataSource ?? "manual",
      notes: opts?.notes,
    },
  };
}

/** Template aturan skor KPI IT / Manager IT */
export const IT_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
  {
    name: "IT Operation / Support",
    weightPercent: 30,
    focus:
      "Server, jaringan, internet, helpdesk, hardware, printer, uptime, SLA, backup harian",
    sortOrder: 1,
    indicators: [
      opIndicator("Server Uptime", "Uptime server vs target", 99.5, 1, {
        notes: "Target 99,5%",
        dataSource: "manual",
      }),
      opIndicator("Internet Uptime", "Uptime internet vs target", 99, 2, {
        notes: "Target 99%",
        dataSource: "manual",
      }),
      opIndicator("Backup Harian", "Keberhasilan backup harian", 100, 3, {
        dataSource: "activity",
      }),
      opIndicator(
        "Ticket selesai SLA",
        "Persentase tiket selesai sesuai SLA",
        95,
        4,
        { notes: "Target 95%", dataSource: "ticket" },
      ),
      opIndicator(
        "Printer Normal",
        "Printer dalam kondisi normal/operasional",
        95,
        5,
        { dataSource: "manual" },
      ),
      opIndicator("Monitoring Server", "Kelengkapan monitoring server", 100, 6, {
        dataSource: "activity",
      }),
      opIndicator(
        "Monitoring Jaringan",
        "Kelengkapan monitoring jaringan",
        100,
        7,
        { dataSource: "activity" },
      ),
      opIndicator("Monitoring CCTV", "Kelengkapan monitoring CCTV", 100, 8, {
        dataSource: "activity",
      }),
      opIndicator(
        "Response User",
        "Pemenuhan response time user (target ≤30 menit)",
        100,
        9,
        {
          notes: "Dihitung sebagai % kepatuhan response ≤30 menit",
          dataSource: "ticket",
        },
      ),
      opIndicator(
        "Dokumentasi Operasional",
        "Kelengkapan dokumentasi operasional",
        100,
        10,
        { dataSource: "manual" },
      ),
    ],
  },
  {
    name: "IT Project",
    weightPercent: 25,
    focus:
      "ERP, Website, Aplikasi Internal, Dashboard, Integrasi, Implementasi Project",
    sortOrder: 2,
    indicators: [
      leafIndicator(
        "Project selesai tepat waktu",
        "Ketepatan jadwal penyelesaian project",
        40,
        1,
        { notes: "Nilai 0–100", dataSource: "project" },
      ),
      leafIndicator(
        "Sesuai Scope",
        "Deliverable sesuai scope yang disepakati",
        20,
        2,
        { dataSource: "project" },
      ),
      leafIndicator(
        "Bug Minor",
        "Kualitas rilis — bug minor terkendali",
        20,
        3,
        {
          notes: "Semakin baik kontrol bug, semakin tinggi nilai",
          dataSource: "manual",
        },
      ),
      leafIndicator(
        "Dokumentasi Project",
        "Kelengkapan dokumentasi project",
        20,
        4,
        { dataSource: "manual" },
      ),
    ],
  },
  {
    name: "Improvement & Innovation",
    weightPercent: 15,
    focus:
      "Digitalisasi proses, otomatisasi, AI, efisiensi kerja, improvement sistem",
    sortOrder: 3,
    indicators: [
      leafIndicator(
        "Automation baru",
        "Implementasi otomatisasi baru (bukan sekadar ide)",
        30,
        1,
      ),
      leafIndicator(
        "Efisiensi proses",
        "Peningkatan efisiensi proses kerja",
        30,
        2,
      ),
      leafIndicator(
        "Improvement sistem",
        "Perbaikan / peningkatan sistem yang sudah jalan",
        20,
        3,
      ),
      leafIndicator(
        "Penghematan biaya",
        "Dampak penghematan biaya dari improvement",
        20,
        4,
      ),
    ],
  },
  {
    name: "Security & Governance",
    weightPercent: 25,
    focus:
      "Backup, Security, Audit, SOP, Hak Akses, Disaster Recovery, Asset IT",
    sortOrder: 4,
    indicators: [
      leafIndicator(
        "Backup berhasil",
        "Keberhasilan proses backup sesuai jadwal",
        20,
        1,
        { dataSource: "activity" },
      ),
      leafIndicator(
        "Restore Test",
        "Uji restore / disaster recovery berhasil",
        20,
        2,
      ),
      leafIndicator(
        "Hak akses sesuai SOP",
        "Manajemen hak akses sesuai SOP",
        15,
        3,
      ),
      leafIndicator(
        "Patch Server",
        "Patch / update keamanan server tepat waktu",
        15,
        4,
        { dataSource: "activity" },
      ),
      leafIndicator(
        "Audit IT",
        "Temuan audit IT tertangani / compliant",
        15,
        5,
      ),
      leafIndicator(
        "Dokumentasi Infrastruktur",
        "Kelengkapan dokumentasi infrastruktur IT",
        15,
        6,
      ),
    ],
  },
  {
    name: "Kedisiplinan & Kehadiran",
    weightPercent: 5,
    focus: "Absensi, keterlambatan, kepatuhan jam kerja",
    sortOrder: 5,
    indicators: [
      {
        name: "Skor absensi periode",
        description:
          "Dari impor absensi (kehadiran, terlambat, lembur, pulang cepat)",
        weightPercent: 100,
        metricType: "attendance",
        sortOrder: 1,
        config: {
          dataSource: "attendance",
          notes: "Sumber: modul Absensi & Kedisiplinan (sudah terhubung)",
        },
      },
    ],
  },
];

export const SCORE_TEMPLATE_BY_CODE: Record<string, ScoreFunctionTemplate[]> = {
  MTR: MEKANIK_SCORE_TEMPLATE,
  IT: IT_SCORE_TEMPLATE,
};

export function scoreTemplateForDepartmentCode(
  code: string,
): ScoreFunctionTemplate[] | null {
  return SCORE_TEMPLATE_BY_CODE[code.trim().toUpperCase()] ?? null;
}

export const METRIC_TYPE_LABEL: Record<KpiScoreMetricType, string> = {
  scale_count: "Skala jumlah vs target",
  scale_percent: "Skala % vs target",
  weighted_leaf: "Nilai tertimbang (0–100)",
  attendance: "Dari absensi",
};

export const DATA_SOURCE_LABEL: Record<KpiScoreDataSource, string> = {
  manual: "Manual",
  attendance: "Otomatis · Absensi",
  ticket: "Otomatis · Ticket",
  activity: "Otomatis · Kegiatan",
  project: "Otomatis · Project",
};

/** Sumber yang sudah benar-benar terhubung ke data sistem */
export const DATA_SOURCE_WIRED: Record<KpiScoreDataSource, boolean> = {
  manual: false,
  attendance: true,
  ticket: false,
  activity: false,
  project: false,
};

export function resolveIndicatorDataSource(
  metricType: KpiScoreMetricType,
  config: KpiScoreIndicatorConfig,
): KpiScoreDataSource {
  if (config.dataSource) return config.dataSource;
  if (metricType === "attendance") return "attendance";
  return "manual";
}

export function dataSourceBadgeLabel(
  metricType: KpiScoreMetricType,
  config: KpiScoreIndicatorConfig,
): { label: string; wired: boolean; kind: "manual" | "auto" } {
  const source = resolveIndicatorDataSource(metricType, config);
  if (source === "manual") {
    return { label: DATA_SOURCE_LABEL.manual, wired: false, kind: "manual" };
  }
  const wired = DATA_SOURCE_WIRED[source];
  return {
    label: wired
      ? DATA_SOURCE_LABEL[source]
      : `${DATA_SOURCE_LABEL[source]} (rencana)`,
    wired,
    kind: "auto",
  };
}
