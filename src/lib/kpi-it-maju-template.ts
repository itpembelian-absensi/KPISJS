import type { ScoreFunctionTemplate } from "./kpi-score-templates";

function ratio(
  jabatanName: string,
  input: {
    code: string;
    name: string;
    description: string;
    weightPercent: number;
    sortOrder: number;
    unit: string;
    defaultTarget?: number;
    direction?: "higher" | "lower";
    notes?: string;
  },
) {
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
      jabatanName,
      ...(input.defaultTarget != null
        ? { defaultTarget: input.defaultTarget }
        : {}),
      notes: input.notes,
    },
  };
}

/** 12 indikator IT Support. Skor = realisasi ÷ target angka × 100, maks 100. */
export const IT_SUPPORT_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
  {
    name: "Mutu",
    weightPercent: 25,
    groupCode: "M",
    focus: "Tiket berulang, backup, dan kesesuaian aset IT",
    sortOrder: 1,
    indicators: [
      ratio("IT Support", {
        code: "M1",
        name: "Tiket dibuka ulang",
        description:
          "Tiket dibuka ulang karena masalah yang sama (repeat issue). Target 0 kejadian. Realisasi 0 = skor 100. Ada kejadian = skor 0. Bukti: log tiket.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "kejadian",
        defaultTarget: 0,
        direction: "lower",
        notes: "Target 0 tidak dibagi. 0 kejadian = 100, lebih dari 0 = 0.",
      }),
      ratio("IT Support", {
        code: "M2",
        name: "Backup harian dan CCTV",
        description:
          "Backup harian dan pengecekan CCTV sesuai jadwal. Target 95%. Bukti: checklist backup dan CCTV (IT-008/009).",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio("IT Support", {
        code: "M3",
        name: "Aset IT sesuai fisik",
        description:
          "Aset IT tercatat dan sesuai fisik. Target 95%. Bukti: register aset IT dan audit sampel (IT-006).",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 95,
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
      ratio("IT Support", {
        code: "A1",
        name: "Kehadiran",
        description: "Target 98% hari kerja. Bukti: rekap absensi Talenta.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 98,
      }),
      ratio("IT Support", {
        code: "A2",
        name: "Masuk tepat waktu",
        description: "Target 95% hari masuk. Bukti: rekap jam masuk Talenta.",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio("IT Support", {
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
    focus: "Respons tiket, kepuasan user, dan onboarding bersama HRD",
    sortOrder: 3,
    indicators: [
      ratio("IT Support", {
        code: "J1",
        name: "Respons pertama tiket",
        description:
          "Respons pertama tiket maksimal 30 menit jam kerja. Target 90%. Bukti: log tiket.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio("IT Support", {
        code: "J2",
        name: "Kepuasan user atas tiket",
        description:
          "Skor kepuasan user atas tiket. Target 4,0 dari 5. Bukti: survei penutupan tiket.",
        weightPercent: 33,
        sortOrder: 2,
        unit: "skor (1-5)",
        defaultTarget: 4,
      }),
      ratio("IT Support", {
        code: "J3",
        name: "Onboarding dan offboarding",
        description:
          "Onboarding dan offboarding bersama HRD: akun, hardware, berita acara serah terima aset, dan log penutupan akses. Target 100% karyawan masuk dan keluar. Bukti: checklist onboarding/offboarding IT (IT-004).",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 100,
      }),
    ],
  },
  {
    name: "Unjuk Kerja",
    weightPercent: 50,
    groupCode: "U",
    focus: "Tiket sesuai SLA, maintenance rutin, dan tugas project",
    sortOrder: 4,
    indicators: [
      ratio("IT Support", {
        code: "U1",
        name: "Tiket selesai sesuai SLA",
        description: "Target 90%. Bukti: log tiket.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio("IT Support", {
        code: "U2",
        name: "Maintenance rutin",
        description:
          "Maintenance rutin server, jaringan, dan PC sesuai jadwal. Target 95%. Bukti: checklist maintenance (IT-009).",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio("IT Support", {
        code: "U3",
        name: "Tugas project selesai sesuai jadwal",
        description:
          "Tugas project IT yang diberikan dan selesai sesuai jadwal. Target 90%. Bukti: task list project dan tab kegiatan aplikasi KPI.",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 90,
      }),
    ],
  },
];

/**
 * Indikator IT Manager yang terlihat di lembar (mulai M3).
 * Catatan lembar menyebut 14 indikator; M1 dan M2 tidak ada di gambar.
 */
export const IT_MANAGER_SCORE_TEMPLATE: ScoreFunctionTemplate[] = [
  {
    name: "Mutu",
    weightPercent: 25,
    groupCode: "M",
    focus: "Insiden kritis, aset, dan dokumentasi SOP IT",
    sortOrder: 1,
    indicators: [
      ratio("IT Manager", {
        code: "M3",
        name: "Insiden keamanan atau downtime kritis",
        description:
          "Insiden keamanan atau downtime sistem kritis lebih dari 4 jam. Target 0 kejadian. Realisasi 0 = skor 100. Ada kejadian = skor 0. Bukti: incident log dan laporan DR (IT-011).",
        weightPercent: 50,
        sortOrder: 3,
        unit: "kejadian",
        defaultTarget: 0,
        direction: "lower",
        notes: "Target 0 tidak dibagi. 0 kejadian = 100, lebih dari 0 = 0.",
      }),
      ratio("IT Manager", {
        code: "M4",
        name: "Aset IT dan SOP terdokumentasi",
        description:
          "Aset IT dan SOP IT terdokumentasi, revisi berkala terbaru. Target 95%. Bukti: register aset IT, audit sampel, dan daftar revisi SOP (IT-006).",
        weightPercent: 50,
        sortOrder: 4,
        unit: "%",
        defaultTarget: 95,
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
      ratio("IT Manager", {
        code: "A1",
        name: "Kehadiran",
        description: "Target 98% hari kerja. Bukti: rekap absensi Talenta.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 98,
      }),
      ratio("IT Manager", {
        code: "A2",
        name: "Masuk tepat waktu",
        description: "Target 95% hari masuk. Bukti: rekap jam masuk Talenta.",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 95,
      }),
      ratio("IT Manager", {
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
    focus: "Kepuasan user, project tepat waktu, dan onboarding",
    sortOrder: 3,
    indicators: [
      ratio("IT Manager", {
        code: "J1",
        name: "Kepuasan user atas tiket",
        description:
          "Skor kepuasan user atas tiket. Target 4,0 dari 5. Bukti: survei penutupan tiket.",
        weightPercent: 34,
        sortOrder: 1,
        unit: "skor (1-5)",
        defaultTarget: 4,
      }),
      ratio("IT Manager", {
        code: "J2",
        name: "Project on-time UAT dan sign-off",
        description:
          "Project on-time sampai UAT dan sign-off, termasuk tambahan jika ada. Target 100% project. Bukti: berita acara UAT dan sign-off (IT-003).",
        weightPercent: 33,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 100,
      }),
      ratio("IT Manager", {
        code: "J3",
        name: "Onboarding dan offboarding",
        description:
          "Onboarding dan offboarding bersama HRD: notifikasi HRD, checklist, berita acara serah terima aset, dan log penutupan akses. Target 100% karyawan masuk dan keluar. Bukti: notifikasi HRD (HRD-04/HRD-14) dan checklist IT (IT-004).",
        weightPercent: 33,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 100,
      }),
    ],
  },
  {
    name: "Unjuk Kerja",
    weightPercent: 50,
    groupCode: "U",
    focus: "SLA, uptime, proyek, dan improvement",
    sortOrder: 4,
    indicators: [
      ratio("IT Manager", {
        code: "U1",
        name: "Tiket selesai sesuai SLA",
        description:
          "Tiket IT terselesaikan sesuai SLA, termasuk eskalasi. Target 90%. Bukti: log tiket (IT-001/002).",
        weightPercent: 25,
        sortOrder: 1,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio("IT Manager", {
        code: "U2",
        name: "Uptime server, jaringan, dan internet",
        description:
          "Uptime server, jaringan, dan internet di jam kerja. Target 99% (rutin). Bukti: log monitoring jaringan dan incident log.",
        weightPercent: 25,
        sortOrder: 2,
        unit: "%",
        defaultTarget: 99,
      }),
      ratio("IT Manager", {
        code: "U3",
        name: "Proyek IT sesuai milestone",
        description:
          "Proyek IT (ERP, website, aplikasi internal, dashboard, integrasi) sesuai milestone. Target 90%. Bukti: portofolio proyek (IT-024) dan berita acara sign milestone.",
        weightPercent: 25,
        sortOrder: 3,
        unit: "%",
        defaultTarget: 90,
      }),
      ratio("IT Manager", {
        code: "U4",
        name: "Improvement dan inovasi",
        description:
          "Improvement finansial, digitalisasi, otomatisasi, atau AI yang selesai dan dipakai user. Target 1 per kuartal. Bukti: daftar improvement, bukti dipakai user, dan jam kerja yang dihemat.",
        weightPercent: 25,
        sortOrder: 4,
        unit: "kuartal",
        defaultTarget: 1,
      }),
    ],
  },
];
