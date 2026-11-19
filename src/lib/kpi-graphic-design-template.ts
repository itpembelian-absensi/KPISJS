import type { ScoreFunctionTemplate } from "./kpi-score-templates";

const JABATAN = "Graphic Design";

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
 * Indikator Graphic Design yang terlihat di lembar.
 * Lembar menyebut 13 indikator; empat baris Mutu tidak ada di gambar, jadi belum masuk.
 * Skor = realisasi ÷ target angka × 100 (maks 100). Di dalam fungsi, rata-rata indikator terisi.
 */
export const GRAPHIC_DESIGN_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
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
        description: "Target 95% hari masuk. Bukti: rekap jam masuk Talenta.",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio({
        code: "A3",
        name: "Laporan kerja harian terkirim",
        description: "Target 95% hari kerja. Bukti: tab Lapor WhatsApp.",
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
    focus: "Revisi desain dan pembaruan rutin dengan Marcomm serta Sales",
    sortOrder: 3,
    indicators: [
      ratio({
        code: "J1",
        name: "Revisi diselesaikan ≤1 hari kerja",
        description:
          "Target 90%. Bukti: design request log (tanggal minta vs tanggal selesai). Penilaian antar divisi (PP-KPI-02).",
        weightPercent: 50,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 90,
        notes: "Angka diisi dari penilaian antar divisi (PP-KPI-02).",
      }),
      ratio({
        code: "J2",
        name: "Pembaruan desain rutin dengan Marcomm & Sales",
        description:
          "Target 3 kali per bulan. Bukti: notulen / catatan meeting desain. Penilaian antar divisi (PP-KPI-02).",
        weightPercent: 50,
        sortOrder: 2,
        unit: "kali",
        defaultTarget: 3,
        notes: "Angka diisi dari penilaian antar divisi (PP-KPI-02).",
      }),
    ],
  },
  {
    name: "Unjuk Kerja",
    weightPercent: 50,
    groupCode: "U",
    focus: "Produksi konten, informasi produk, biaya produksi, dan video",
    sortOrder: 4,
    indicators: [
      ratio({
        code: "U1",
        name: "Konten story/post feed diproduksi",
        description:
          "Untuk bahan utama Dinar, SJS, dan Alpro. Target 20 story/post per bulan. Bukti: folder file konten harian dan laporan post harian Marcomm.",
        weightPercent: 25,
        sortOrder: 1,
        unit: "story/post",
        defaultTarget: 20,
      }),
      ratio({
        code: "U2",
        name: "Update informasi produk",
        description:
          "Produk baru, price list, katalog, dan file lain yang diminta Sales atau Purchasing. Target 90%. Bukti: daftar pembaruan produk dan file final.",
        weightPercent: 25,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio({
        code: "U3",
        name: "Biaya produksi",
        description:
          "Print job di luar anggaran, atau cetak ulang karena kesalahan desain. Target 0 kejadian. Realisasi 0 = skor 100. Ada kejadian = skor 0. Bukti: PO atau nota persetujuan vs anggaran, dan catatan cetak ulang.",
        weightPercent: 25,
        sortOrder: 3,
        unit: "kejadian",
        defaultTarget: 0,
        direction: "lower",
        notes: "Target 0 tidak dibagi. 0 kejadian = 100, lebih dari 0 = 0.",
      }),
      ratio({
        code: "U4",
        name: "Video produk",
        description:
          "5 reels diproduksi sesuai rencana konten bulanan, termasuk stok untuk gudang atau Dinar, dan untuk email konten minimal 2 diedit per hari. Target angka 5. Bukti: kalender konten, file video final, tautan reels, dan katalog gudang Dinar.",
        weightPercent: 25,
        sortOrder: 4,
        unit: "% capaian",
        defaultTarget: 5,
      }),
    ],
  },
];
