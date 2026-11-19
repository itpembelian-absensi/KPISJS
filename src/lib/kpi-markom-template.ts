import type { ScoreFunctionTemplate } from "./kpi-score-templates";

const JABATAN = "Marketing & Communication";

function ratio(input: {
  code: string;
  name: string;
  description: string;
  weightPercent: number;
  sortOrder: number;
  unit: string;
  defaultTarget?: number;
  direction?: "higher" | "lower";
  notes?: string;
}) {
  return {
    name: input.name,
    description: input.description,
    weightPercent: input.weightPercent,
    metricType: "ratio" as const,
    sortOrder: input.sortOrder,
    config: {
      code: input.code,
      unit: input.unit,
      direction: input.direction ?? "higher",
      dataSource: "manual" as const,
      jabatanName: JABATAN,
      ...(input.defaultTarget != null
        ? { defaultTarget: input.defaultTarget }
        : {}),
      notes: input.notes,
    },
  };
}

/**
 * 14 indikator Marketing & Communication.
 * Skor = realisasi ÷ target angka × 100 (maks 100).
 * Di dalam fungsi, indikator yang kosong tidak dihitung.
 */
export const MARKOM_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
  {
    name: "Mutu",
    weightPercent: 25,
    groupCode: "M",
    focus: "Konten, brand, dan kepatuhan anggaran iklan",
    sortOrder: 1,
    indicators: [
      ratio({
        code: "M1",
        name: "Materi tayang setiap pagi",
        description:
          "Story atau feed di VA, IG, dan TikTok. Target 95% hari kerja per platform. Bukti: laporan post harian beserta tautan atau screenshot dan jam tayang.",
        weightPercent: 25,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio({
        code: "M2",
        name: "Kualitas konten tiga bidang usaha",
        description:
          "Dinar, SJS, dan Alpro. Target skor review 4,0 dari 5 per bidang usaha. Bukti: form review bulanan atasan dan sampel konten.",
        weightPercent: 25,
        sortOrder: 2,
        unit: "skor (1-5)",
        defaultTarget: 4,
      }),
      ratio({
        code: "M3",
        name: "Biaya iklan di luar persetujuan",
        description:
          "Target 0 kejadian. Realisasi 0 = skor 100. Ada kejadian = skor 0. Bukti: laporan Ads Manager dibanding anggaran yang disetujui.",
        weightPercent: 25,
        sortOrder: 3,
        unit: "kejadian",
        defaultTarget: 0,
        direction: "lower",
        notes: "Target 0 tidak dibagi. 0 kejadian = 100, lebih dari 0 = 0.",
      }),
      ratio({
        code: "M4",
        name: "Konsistensi brand dan collateral",
        description:
          "95% materi sesuai brand guideline dan 0 collateral habis, diringkas sebagai capaian. Target angka 1 = penuh. Bukti: audit brand guideline, daftar stok, dan jadwal produksi.",
        weightPercent: 25,
        sortOrder: 4,
        unit: "capaian",
        defaultTarget: 1,
      }),
    ],
  },
  {
    name: "Andal",
    weightPercent: 10,
    groupCode: "A",
    focus: "Kehadiran, ketepatan waktu, dan laporan harian",
    sortOrder: 2,
    indicators: [
      ratio({
        code: "A1",
        name: "Kehadiran",
        description: "Target 98% hari kerja. Bukti: rekap absensi Talenta.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 98,
      }),
      ratio({
        code: "A2",
        name: "Masuk tepat waktu",
        description:
          "Teks target 98% hari masuk. Target angka pada lembar contoh 95, dan atasan boleh mengubahnya per periode. Bukti: rekap jam masuk Talenta.",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio({
        code: "A3",
        name: "Laporan kerja harian terkirim",
        description:
          "Teks target 98% hari kerja. Target angka pada lembar contoh 95. Bukti: tab Lapor WhatsApp.",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 95,
      }),
    ],
  },
  {
    name: "Jalin Kerja Sama",
    weightPercent: 15,
    groupCode: "J",
    focus: "Respons ke Sales dan koordinasi dengan Graphic Design",
    sortOrder: 3,
    indicators: [
      ratio({
        code: "J1",
        name: "Permintaan materi Sales",
        description:
          "Ditanggapi maksimal 2 hari kerja. Target 90%. Bukti: log permintaan (tanggal minta vs tanggal kirim).",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio({
        code: "J2",
        name: "Prospek digital diteruskan",
        description:
          "Ke Sales atau Marketing maksimal 1 hari kerja. Target 100%. Bukti: log prospek (tanggal masuk vs tanggal diteruskan).",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 100,
      }),
      ratio({
        code: "J3",
        name: "Koordinasi Graphic Design",
        description:
          "Brief tertulis lengkap dan feedback revisi maksimal 1 hari kerja. Target 95%. Bukti: desain request log dan catatan review.",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 95,
      }),
    ],
  },
  {
    name: "Unjuk Kerja",
    weightPercent: 50,
    groupCode: "U",
    focus: "Engagement, prospek, campaign, dan materi sales",
    sortOrder: 4,
    indicators: [
      ratio({
        code: "U1",
        name: "Engagement rate per platform",
        description:
          "Target = rata-rata 3 bulan terakhir + 10%. Angka target wajib diisi atasan sebelum periode dimulai. Bukti: export insights IG dan TikTok.",
        weightPercent: 25,
        sortOrder: 1,
        unit: "%",
        notes: "Target angka kosong sampai atasan mengisi. Sebelum itu indikator tidak dihitung.",
      }),
      ratio({
        code: "U2",
        name: "Leads generation",
        description:
          "Prospek digital masuk sesuai budget, dengan biaya iklan di bawah benchmark. Target angka wajib diisi atasan sebelum periode. Bukti: log prospek beserta sumber.",
        weightPercent: 25,
        sortOrder: 2,
        unit: "%",
        notes: "Target angka kosong sampai atasan mengisi. Sebelum itu indikator tidak dihitung.",
      }),
      ratio({
        code: "U3",
        name: "Campaign conversion dan cost per lead",
        description:
          "Target 80% campaign mencapai conversion rate dan cost per qualified lead. Bukti: laporan Ads Manager, log prospek qualified, dan SO dari prospek.",
        weightPercent: 25,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 80,
      }),
      ratio({
        code: "U4",
        name: "Materi sales selesai",
        description:
          "Katalog, price list, brosur, dan sample book sesuai rencana bulanan. Target 90%. Bukti: rencana kerja yang dikunci tanggal 25 dan file final.",
        weightPercent: 25,
        sortOrder: 4,
        unit: "%",
        defaultTarget: 90,
      }),
    ],
  },
];
