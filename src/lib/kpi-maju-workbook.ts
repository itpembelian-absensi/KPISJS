import type { ScoreFunctionTemplate } from "./kpi-score-templates";

export type MajuWorkbookSheet = {
  jabatanName: string;
  scoreMethod: "bobot" | "rata-rata";
  functions: ScoreFunctionTemplate[];
};

/** Lembar KPI MAJU dari berkas KPI_MAJU_SJS. Markom tetap di template sendiri. */
export const MAJU_WORKBOOK: MajuWorkbookSheet[] = [
  {
    "jabatanName": "Graphic Design",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Materi dikerjakan ulang karena salah ukuran, warna, atau tidak sesuai brand guideline",
            "description": "Log koreksi / catatan approval",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Design request selesai sesuai deadline",
            "description": "Design request log (tgl minta, deadline, tgl selesai)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Kreativitas desain: ide/konsep baru di luar template standar",
            "description": "Daftar ide bulanan + catatan review atasan",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "ide",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 3
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Revisi diselesaikan ≤1 hari kerja",
            "description": "Design request log (tgl revisi diminta vs selesai)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Pembahasan desain rutin dengan Marcomm & Sales",
            "description": "Notulen / catatan meeting desain",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 3
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Konten story atau feed diproduksi untuk badan usaha (Dinar, SJS, Alvic)",
            "description": "Folder file konten harian + laporan post harian Marcomm",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "story/post",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 20
            }
          },
          {
            "name": "Update informasi produk (product sheet, price list, katalog) ≤2 hari kerja setelah ada perubahan data",
            "description": "Daftar perubahan produk/harga dari Sales/Purchasing vs tgl file final",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Biaya produksi fisik / print job di luar anggaran, atau cetak ulang karena kesalahan desain",
            "description": "PO/nota percetakan vs anggaran disetujui + catatan cetak ulang",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Video produk & reels diproduksi sesuai rencana konten bulanan, termasuk visit ke gudang atau Dinar untuk ambil konten minimal 2 minggu sekali",
            "description": "Kalender konten + file video final + tautan tayang + foto/log visit gudang & Dinar",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Graphic Design",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Sales Manager",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Kepatuhan harga, diskon & termin; due diligence customer baru lengkap",
            "description": "Log approval SO (IT-012), exception log, checklist dokumen customer baru (MKT-SAL-02)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Akurasi data pesanan tim: SO tanpa retur/komplain karena salah data",
            "description": "Log void/revisi SO Orlansoft + register retur & komplain (MKT-SAL-12)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Keluhan customer ditindaklanjuti ≤2 hari kerja (usulan)",
            "description": "Register komplain (tgl masuk vs tgl tindak lanjut)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Koordinasi penagihan dengan Finance: review piutang mingguan",
            "description": "Notulen credit control + AR aging Orlansoft",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Coaching tim Sales & Marketing + weekly sales meeting",
            "description": "Notulen meeting + catatan coaching / visit report bersama",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pencapaian target sales tim & tiap salesperson",
            "description": "Laporan penjualan per salesman, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "New leads + customer reaktivasi (kembali beli setelah ≥6 bulan tidak order)",
            "description": "CRM / log prospek + tgl transaksi terakhir di Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Penjualan stok slow moving",
            "description": "Laporan stok slow moving + penjualan item slow moving, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "notes": "Target angka wajib diisi atasan. Sebelum itu indikator tidak dihitung."
            }
          },
          {
            "name": "Pengembangan tim: posisi sales baru terisi sesuai rencana kebutuhan tim",
            "description": "Rencana kebutuhan tim + form permintaan tenaga kerja (HRD-01) + tgl join karyawan baru",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "hari",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 60,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          },
          {
            "name": "Retensi tim Sales & Marketing: anggota tim yang tetap bekerja (tidak resign) dalam 12 bulan",
            "description": "Data join & resign di Talenta + catatan exit interview (HRD-14)",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Senior Marketing",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi penawaran & input pesanan: tanpa revisi karena salah harga, item, atau entitas",
            "description": "Log revisi quotation + log void/revisi SO, Orlansoft",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kepatuhan harga, diskon & termin; menggali info harga kompetitor",
            "description": "Log approval SO + exception log + laporan harga kompetitor bulanan",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Kecepatan respons pelanggan: permintaan & quotation dibalas ≤1 hari kerja",
            "description": "CRM / log permintaan + sampel chat WA bulanan",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Kendala pesanan (stok kosong, komplain, temuan lapangan) dikoordinasikan ke tim terkait di hari yang sama",
            "description": "Pending tracker + register komplain",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Koordinasi penagihan dengan Finance: update status piutang akun sendiri",
            "description": "Notulen credit control + AR aging per salesman",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pencapaian target sales pribadi",
            "description": "Laporan penjualan per salesman, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Konversi penawaran menjadi order",
            "description": "Register quotation vs SO, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 30
            }
          },
          {
            "name": "Pelanggan baru & reaktivasi (kembali beli setelah ≥6 bulan tidak order)",
            "description": "CRM + master customer & tgl transaksi terakhir, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Penjualan produk slow moving & kontribusi penjualan merata antar produk",
            "description": "Laporan stok slow moving + penjualan per kategori produk, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "notes": "Target angka wajib diisi atasan. Sebelum itu indikator tidak dihitung."
            }
          },
          {
            "name": "Janji temu & kunjungan ke customer existing maupun baru bersama Sales Manager",
            "description": "Jadwal kunjungan + visit report berfoto",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "kunjungan",
              "dataSource": "manual",
              "jabatanName": "Senior Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 2
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Sales",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi penawaran & input pesanan: tanpa revisi karena salah harga, item, atau entitas",
            "description": "Log revisi quotation + log void/revisi SO, Orlansoft",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kepatuhan harga, diskon & termin; menggali info harga kompetitor",
            "description": "Log approval SO + exception log + laporan harga kompetitor bulanan",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Jumlah kunjungan per minggu sesuai target",
            "description": "Jadwal kunjungan + visit report berfoto & lokasi",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "notes": "Target angka wajib diisi atasan. Sebelum itu indikator tidak dihitung."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Kecepatan respons pelanggan (≤1 hari kerja) & janji ke pelanggan ditindaklanjuti tepat waktu",
            "description": "CRM / log permintaan + sampel chat WA bulanan",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Kendala pesanan (stok kosong, komplain, temuan lapangan) dikoordinasikan ke tim terkait di hari yang sama",
            "description": "Pending tracker + register komplain",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Koordinasi penagihan dengan Finance: update status piutang akun sendiri",
            "description": "Notulen credit control + AR aging per salesman",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pencapaian target sales pribadi",
            "description": "Laporan penjualan per salesman, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Konversi penawaran menjadi order",
            "description": "Register quotation vs SO, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 30
            }
          },
          {
            "name": "Pelanggan baru & reaktivasi (kembali beli setelah ≥6 bulan tidak order)",
            "description": "CRM + master customer & tgl transaksi terakhir, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Penjualan produk slow moving & kontribusi penjualan merata antar produk",
            "description": "Laporan stok slow moving + penjualan per kategori produk, Orlansoft",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "notes": "Target angka wajib diisi atasan. Sebelum itu indikator tidak dihitung."
            }
          },
          {
            "name": "Kunjungan produktif: kunjungan yang menggerakkan pipeline (discovery → penawaran → deal)",
            "description": "Visit report dikaitkan ke perubahan tahap pipeline di CRM",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Sales",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 40
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Admin Marketing",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi penawaran & input pesanan: tanpa revisi karena salah harga, item, entitas, atau pajak",
            "description": "Log revisi quotation + log void/revisi SO, Orlansoft",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Akurasi permintaan pembelian: salah input kode / SKU",
            "description": "PR/PO di Orlansoft + catatan koreksi dari Purchasing",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Kendala order dieskalasi ke Sales/Purchasing/Gudang di hari yang sama",
            "description": "Pending tracker",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Pengecekan unit armada & koordinasi jadwal pengiriman ke customer sebelum cut-off",
            "description": "Jadwal kirim harian + konfirmasi armada dari Gudang + konfirmasi ke customer",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Cek stok dijawab tepat waktu (≤2 jam kerja, usulan)",
            "description": "Log permintaan cek stok (jam minta vs jam jawab)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Void transaksi melebihi toleransi atau tanpa dokumentasi",
            "description": "Log void Orlansoft + dokumen pendukung void (IT-017)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Admin Marketing",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "General Manager",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi laporan keuangan — Laporan bulanan yang lolos review tanpa koreksi material setelah disampaikan ke Direksi ÷ laporan yang disampaikan. Batas materialitas disepakati di awal",
            "description": "Laporan keuangan bulanan + log koreksi setelah penyampaian ke Direksi",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Kepatuhan pajak — Kewajiban pajak yang dibayar dan/atau dilaporkan sesuai tenggat, dengan bukti lengkap ÷ kewajiban yang jatuh tempo",
            "description": "Kalender pajak + bukti bayar (NTPN) & bukti lapor Coretax",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Piutang tak tertagih / write-off — Nilai piutang dihapus atau dicadangkan ÷ penjualan kredit 12 bulan terakhir",
            "description": "Daftar write-off yang disetujui Direksi (FIN-09)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 0.5,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          },
          {
            "name": "Pengeluaran sesuai anggaran & approval — Jumlah pengeluaran di luar anggaran atau tanpa approval sesuai matriks kewenangan",
            "description": "Laporan realisasi vs anggaran + exception log",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Penyelesaian kendala lintas departemen — Kendala prioritas yang selesai sesuai tenggat yang disepakati ÷ kendala prioritas yang jatuh tempo (mis. selisih stok yang menghambat order, sengketa invoice yang menahan penagihan)",
            "description": "Daftar kendala prioritas di pending tracker + tgl selesai",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Layanan Finance dan Operational ke unit lain — Permintaan internal lengkap yang diproses sesuai standar waktu layanan ÷ permintaan yang jatuh tempo (mis. persetujuan kredit, pembayaran supplier, jadwal muat)",
            "description": "Register permintaan internal (tgl lengkap vs tgl selesai)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Kedisiplinan review kinerja lintas fungsi — Review lintas fungsi yang terlaksana sesuai kalender, dengan keputusan, PIC, dan tenggat tercatat ÷ review terjadwal",
            "description": "Kalender review + notulen (keputusan, PIC, tenggat)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Ketepatan closing bulanan — Closing dengan rekonsiliasi bank, piutang, utang, dan persediaan selesai serta laporan disampaikan ke Direksi sesuai jadwal ÷ closing yang jatuh tempo",
            "description": "Checklist closing + rekonsiliasi bank/AR/AP/stok + waktu kirim laporan ke Direksi (ACC-23/24, FIN-24)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Supervisi piutang overdue & DSO — Review bulanan atas laporan overdue & DSO dari Finance Manager yang terlaksana bersama Sales, dengan keputusan, PIC, dan tenggat tercatat ÷ review terjadwal",
            "description": "Laporan overdue & DSO Finance Manager + notulen review (FIN-07/28)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Supervisi cash flow forecast — Forecast 13 minggu dari Finance Manager yang direview dan disetujui GM, lalu diteruskan ke Direksi tiap minggu ÷ minggu berjalan",
            "description": "File forecast mingguan + jejak review GM & waktu kirim ke Direksi (FIN-23)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Akurasi stok fisik dan ERP — Kombinasi SKU dan lokasi yang jumlah fisiknya cocok dengan ERP ÷ kombinasi yang dihitung; memakai hasil sebelum penyesuaian stok",
            "description": "Berita acara cycle count / stock opname sebelum adjustment (WH-011, ACC-16)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Pengiriman tepat waktu dan lengkap — Order yang diterima customer sesuai jadwal dan qty yang dijanjikan ÷ order yang jatuh tempo untuk dikirim; diverifikasi dengan bukti serah terima",
            "description": "Jadwal kirim + surat jalan / POD bertanda tangan customer",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Kesiapan armada — Hari-unit armada siap operasi ÷ hari-unit kebutuhan armada sesuai jadwal; siap = kondisi kendaraan baik dan dokumen lengkap",
            "description": "Fleet health log + tracker dokumen kendaraan (WH-013, GA-05)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Supervisi posisi pinjaman & kewajiban bank — Laporan posisi pinjaman bulanan dari Finance Manager (saldo, bunga, jatuh tempo, covenant) yang direview GM dan disampaikan ke Direksi ÷ bulan berjalan",
            "description": "Laporan posisi pinjaman bulanan + jejak review GM",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "General Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Tax Manager",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi Faktur Pajak Keluaran — FP Keluaran tanpa penggantian/pembatalan akibat kesalahan internal (customer, tanggal, kode transaksi, DPP/PPN) ÷ FP yang diterbitkan",
            "description": "Log koreksi FP + checklist maker-checker (PJK-01, PJK-18)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Akurasi perhitungan pajak — Paket perhitungan (PPh, PPN, SPT, bukti potong) yang lolos review tanpa koreksi material atas klasifikasi transaksi, dasar pengenaan, atau nominal pajak ÷ paket yang direview",
            "description": "Checklist review + daftar pembetulan SPT (PJK-03/04/07/09)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Status FP Masukan lengkap — FP Masukan yang punya status dikreditkan / tidak dapat dikreditkan / hold beserta alasan pada cut-off tgl 20 ÷ FP Masukan diterima",
            "description": "Rekap Pajak Pembelian + aging FP Masukan (PJK-02)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Kelengkapan arsip pajak — Paket pajak yang memiliki perhitungan, dokumen pendukung, bukti persetujuan, serta bukti bayar dan lapor ÷ paket yang diperiksa",
            "description": "Tax Document Index + Archive Audit Log triwulanan (PJK-10)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Tax clearance pembayaran supplier — Pembayaran supplier yang sudah berstatus PAJAK OK / HOLD / TIDAK OBJEK sebelum Finance membayar ÷ pembayaran supplier",
            "description": "Tax Clearance Checklist + status log (PJK-16, Lampiran C)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Instruksi pembayaran pajak ke Finance — Permintaan bayar pajak (kode billing + rekap) yang diserahkan lengkap ke Finance sesuai batas internal (PPh tgl 12–13, PPN tgl 25) ÷ permintaan bayar yang jatuh tempo",
            "description": "Kode billing + tanda terima Finance + NTPN (Lampiran A)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Tindak lanjut kendala data lintas tim — Kasus data/dokumen yang diteruskan ke PIC terkait (Admin Invoicing, Purchasing, Finance, HR/Payroll) ≤1 hari kerja sejak diketahui, dengan rincian selisih dan tenggat tindak lanjut ÷ kasus yang perlu diteruskan",
            "description": "Log HOLD / Exception Register + email/WA tindak lanjut",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Late invoice & month-end sweep — Bulan dengan Late Invoice Register terupdate dan month-end sweep bersama Purchasing selesai ≤H+2 bulan berikutnya ÷ bulan berjalan",
            "description": "Late Invoice Register + Month-end Exception List (PJK-16, Lampiran D)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "J4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Ketepatan pemenuhan kewajiban pajak — Kewajiban PPh 21/26, Unifikasi, PPh 25, PPh Final, dan PPN semua entitas yang seluruh langkah bayar dan/atau lapornya selesai sesuai tenggat (PPh setor ≤ tgl 15, lapor ≤ tgl 20; SPT PPN ≥H-3) ÷ kewajiban jatuh tempo",
            "description": "Kalender pajak, kode billing, NTPN, BPE (PJK-03…07)",
            "weightPercent": 14,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "FP Keluaran approved tepat waktu — Masa dengan outstanding FP pada cut-off internal tgl 18 = 0 (atau setiap exception punya owner & ETA) dan seluruh FP approved ≤ tgl 20 ÷ masa pajak",
            "description": "Outstanding FP Register / Red List (PJK-01)",
            "weightPercent": 9,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Penyelesaian rekonsiliasi pajak — Rekonsiliasi pajak (PPN PK/PM vs GL sebelum SPT, PPh 21 vs payroll/GL, kredit pajak PPh 25) yang selesai direview sesuai kalender internal, dengan selisih dijelaskan dan tindakan koreksi ditetapkan ÷ rekonsiliasi jatuh tempo",
            "description": "VAT Nett reconciliation, Payroll–GL reconciliation, tax credit schedule (PJK-03/05/07)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Respons surat & pemeriksaan pajak — SP2DK, himbauan, atau permintaan pemeriksa yang dicatat ≤H+1, draft siap H-3, dan dijawab lengkap sebelum tenggat bersama MEDIA & AR; data release pemeriksaan tercatat ÷ permintaan resmi jatuh tempo",
            "description": "Tax Case Register, bukti submit, Data Release Log (PJK-11/13, Lampiran E)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Tindakan atas risiko pajak — Tindakan perbaikan dari audit objek pajak (self-review), SP2DK, atau pemeriksaan yang menjadi tanggung jawab Tax dan selesai dengan bukti sesuai rencana; exception terbuka >30 hari = 0 kecuali ada alasan tertulis ÷ tindakan jatuh tempo",
            "description": "Audit plan + Exception Register + bukti remediasi (PJK-12)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "SPT Tahunan Badan & OP — SPT Tahunan Badan (dan OP yang dibantu) dilapor ≥H-5 sebelum tenggat dengan rekonsiliasi fiskal & kredit pajak lengkap ÷ SPT wajib (dinilai tahunan)",
            "description": "Rekonsiliasi fiskal, tax credit schedule, BPE (PJK-08/09)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Review kalender pajak & regulasi — Review kalender pajak terjadwal yang terlaksana dengan status kewajiban, PIC, tindakan berikutnya, dan perubahan regulasi yang berdampak tercatat ÷ review yang dijadwalkan",
            "description": "Kalender pajak + Regulatory Log/Impact memo (Lampiran A, PJK-15)",
            "weightPercent": 2,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Kontrol akses Coretax & QC tim — Access review Coretax triwulanan dan QC sampel bulanan atas pekerjaan Staff Pajak yang terlaksana, dengan 0 akses aktif mantan karyawan ÷ review yang dijadwalkan",
            "description": "Coretax Access Register, Access Review, QC report (PJK-18)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 8,
            "config": {
              "code": "U8",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Tax Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Staff Pajak",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi draft Faktur Pajak Keluaran — Draft FP yang lolos review checker tanpa koreksi ÷ draft FP yang diinput",
            "description": "Checklist maker-checker (PJK-01, PJK-18)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kelengkapan Rekap Pajak Pembelian — Baris rekap dengan kolom lengkap (vendor, NPWP, barang, qty, harga satuan, DPP, PPN, PO/LBM, status Coretax) ÷ sampel yang diperiksa",
            "description": "Rekap Pajak Pembelian, template Lampiran B (PJK-02)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Akurasi rekap PPh & bukti potong — Rekap PPh 21/26 & Unifikasi serta bukti potong yang lolos review checker tanpa koreksi ÷ rekap yang diserahkan",
            "description": "Approved PPh recap + bukti potong Coretax (PJK-03/04)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Arsip dokumen pajak — Sampel dokumen yang ditemukan <10 menit sesuai struktur folder & naming convention ÷ sampel yang diuji",
            "description": "Tax Document Index + Archive Audit Log (PJK-10)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Verifikasi dokumen penjualan — Paket dokumen dari Admin Invoicing yang diverifikasi di hari yang sama; mismatch dikembalikan dengan catatan ÷ paket diterima",
            "description": "Checklist verifikasi + log HOLD (PJK-01)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "FP final ke Finance AR — PDF FP approved yang dikirim ke Finance AR dan di-filing ≤H+1 setelah approval ÷ FP approved",
            "description": "Log kirim FP + folder pajak (PJK-01)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Bukti potong ke vendor — Bukti potong PPh Unifikasi yang dikirim ke vendor ≤H+3 setelah pelaporan ÷ bukti potong terbit",
            "description": "Log kirim bukti potong (PJK-04)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Input FP Keluaran tepat waktu — Draft FP yang diinput di Coretax pada hari dokumen dinyatakan valid (H+0) ÷ dokumen valid diterima",
            "description": "Outstanding FP Register (PJK-01)",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Rekap & matching FP Masukan — FP Masukan yang direkap dan dicocokkan dengan Coretax ≤H+1 setelah paket diterima, selesai sebelum cut-off tgl 20 ÷ paket diterima",
            "description": "Rekap Pajak Pembelian + status MATCH/UNMATCH (PJK-02)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Draft PPh 21/26 & Unifikasi — Masa dengan rekap PPh 21/26 & Unifikasi serta draft bukti potong siap direview ≤ tgl 10 ÷ masa pajak",
            "description": "Tax Payroll Reconciliation + draft bukti potong (PJK-03/04)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Status tax clearance supplier — Payment pack supplier yang diberi status PAJAK OK / HOLD / TIDAK OBJEK ≤H+1 setelah diterima ÷ payment pack diterima",
            "description": "Tax Clearance Checklist + status log (PJK-16, Lampiran C)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Filing bukti setor & lapor — Billing, NTPN, BPE, dan SPT yang di-filing dan diupdate di dashboard ≤H+1 ÷ dokumen terbit",
            "description": "Folder pajak + Tax KPI Dashboard (PJK-03…07, Lampiran G)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Scan regulasi mingguan — Minggu dengan Regulatory Log terupdate dari JDIH Kemenkeu, pajak.go.id, dan update Coretax ÷ minggu berjalan",
            "description": "Regulatory Log (PJK-15)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Staff Pajak",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Inventory Controller",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Item negative stock di akhir bulan",
            "description": "Laporan negative stock, Orlansoft",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Adjustment inventory tanpa approval lengkap",
            "description": "Form adjustment + approval (IT-015)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Skor penilaian dari divisi yang dilayani (FR-KPI-02, diisi Juni & Desember)",
            "description": "Rekap FR-KPI-02 (Google Form tanpa nama, min. 3 penilai)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "skor (1–5)",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Selisih stok yang dilaporkan Gudang/Sales ditindaklanjuti ≤2 hari kerja",
            "description": "Pending tracker",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Akurasi stok hasil stock opname / cycle count",
            "description": "Berita acara stock opname + daftar selisih (ACC-16)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99.5
            }
          },
          {
            "name": "Penerimaan barang & mutasi antar gudang diverifikasi ≤1 hari kerja",
            "description": "LBM/LPB & MAG di Orlansoft (ACC-11/12)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan nilai stok bulanan terbit",
            "description": "Laporan nilai stok (ACC-15)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "Inventory Controller",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "GL Accounting",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Kesalahan jurnal yang ditemukan reviewer",
            "description": "Catatan review Assistant Manager",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Dokumen pendukung jurnal diarsip lengkap",
            "description": "Audit sampel arsip (ACC-36)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Skor penilaian dari divisi yang dilayani (FR-KPI-02, diisi Juni & Desember)",
            "description": "Rekap FR-KPI-02 (Google Form tanpa nama, min. 3 penilai)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "skor (1–5)",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Permintaan data ditanggapi sesuai deadline",
            "description": "Pending tracker",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Rekonsiliasi bank harian selesai H+1",
            "description": "Daily bank report (ACC-06)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Jurnal akrual & penyesuaian selesai sebelum closing",
            "description": "Checklist closing (ACC-21)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Fixed asset register & penyusutan diperbarui bulanan",
            "description": "FA register (ACC-18)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "GL Accounting",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Finance Manager",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Pembayaran salah, ganda, atau tanpa approval lengkap — Jumlah pembayaran yang keluar dengan kesalahan atau di luar matriks kewenangan",
            "description": "Bukti transfer vs approval + exception log (FIN-26)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Kontrol akses bank & rekening penerima — Review akses e-banking, token, dan beneficiary master yang terlaksana sesuai jadwal, serta perubahan rekening supplier yang diverifikasi sebelum dipakai ÷ review & perubahan yang jatuh tempo",
            "description": "Access review e-banking + log verifikasi perubahan rekening (FIN-25)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Akurasi laporan finance bulanan — Laporan finance bulanan yang diserahkan ke GM tanpa koreksi material akibat kesalahan Finance ÷ laporan yang diserahkan",
            "description": "Laporan finance bulanan + log koreksi (FIN-24)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Piutang tak tertagih / write-off — Nilai piutang dihapus atau dicadangkan ÷ penjualan kredit 12 bulan terakhir",
            "description": "Daftar write-off yang disetujui Direksi (FIN-09)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 0.5,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Keputusan credit limit & TOP untuk Sales — Pengajuan credit limit, TOP, atau pelepasan credit hold yang diputuskan ≤1 hari kerja sejak data lengkap ÷ pengajuan masuk",
            "description": "Form analisa credit limit + jejak approval (FIN-11, IT-012)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Handover closing ke Accounting & Tax — Paket data kas, bank, piutang, utang serta pembayaran pajak (kode billing dari Tax) yang diserahkan/dibayar sesuai kalender ÷ yang jatuh tempo",
            "description": "Checklist handover closing + NTPN (FIN-24/27, PJK Lampiran A)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Layanan pembayaran & kendala lintas divisi — Pengajuan pembayaran lengkap yang diproses sesuai SLA dan kendala prioritas (sengketa invoice, dokumen kurang) yang selesai sesuai tenggat ÷ yang jatuh tempo",
            "description": "Register pengajuan pembayaran + pending tracker",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pengendalian piutang overdue & DSO — Saldo piutang >30 hari lewat jatuh tempo ÷ total piutang usaha akhir bulan, ditambah DSO. Skor = rata-rata kedua bagian",
            "description": "AR aging akhir bulan, Orlansoft (FIN-07)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Cash flow forecast 13 minggu — Forecast 13 minggu terkirim ke GM/Direksi sebelum Senin 12.00 tiap minggu, ditambah akurasi proyeksi vs realisasi (proyeksi dikunci di awal minggu). Skor = rata-rata kedua bagian",
            "description": "File forecast mingguan yang dikunci + mutasi bank (FIN-23)",
            "weightPercent": 9,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Analisa penerimaan piutang & usulan tindakan — Analisa mendalam atas penerimaan piutang (pencapaian vs target, per customer & salesman, penyebab selisih, akun berisiko) yang terbit sesuai jadwal dan memuat usulan tindakan tertulis untuk GM, Supervisor Finance & Sales ÷ analisa yang wajib terbit. Pelaksanaan penagihan tetap di Supervisor Finance",
            "description": "File analisa piutang + daftar usulan & status tindak lanjut (FIN-06/07/28)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Analisa pembayaran supplier & usulan tindakan — Analisa mendalam atas pembayaran supplier (jatuh tempo vs realisasi, prioritas bayar, TOP supplier, dampak ke cash flow) yang terbit sesuai jadwal dan memuat usulan tindakan tertulis untuk GM & Supervisor Finance ÷ analisa yang wajib terbit. Pelaksanaan pembayaran tetap di Supervisor Finance",
            "description": "File analisa AP & payment plan + daftar usulan & status tindak lanjut (FIN-13/16/28)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Posisi pinjaman & kewajiban bank — Angsuran & bunga dibayar tepat waktu ÷ yang jatuh tempo; laporan posisi pinjaman (saldo, bunga, jatuh tempo, covenant) disampaikan tiap bulan",
            "description": "Jadwal pinjaman + rekening koran + laporan posisi pinjaman bulanan",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Closing finance & laporan manajemen tepat waktu — Jumlah hari telat closing finance dan laporan manajemen bulanan dari kalender closing",
            "description": "Checklist closing + waktu kirim laporan (FIN-24)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Review KPI/SLA Finance & pembinaan tim — Monthly management review Finance yang terlaksana dengan keputusan, PIC, dan tenggat tercatat, termasuk review KPI tim Finance ÷ review terjadwal",
            "description": "Notulen monthly review + rekap KPI tim (FIN-28)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Finance Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Supervisor Finance",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Kepatuhan verifikasi pembayaran — Pembayaran dengan dokumen pendukung, persetujuan, dan verifikasi rekening penerima sesuai prosedur sebelum dana keluar ÷ pembayaran yang diperiksa",
            "description": "Voucher pembayaran + checklist verifikasi dokumen, approval & konfirmasi rekening (FIN-14/25/26)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Akurasi transaksi kas dan bank — Transaksi tanpa koreksi akibat kesalahan nominal, penerima, pencatatan ganda, atau alokasi invoice ÷ transaksi yang diperiksa",
            "description": "Log koreksi transaksi + rekonsiliasi bank (FIN-22)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Selisih kas saat opname — Jumlah cash opname mingguan dengan selisih yang tidak terjelaskan",
            "description": "Berita acara cash opname mingguan (FIN-19)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Pembayaran salah, ganda, atau tanpa approval lengkap — Jumlah pembayaran yang keluar dengan kesalahan atau tanpa approval lengkap",
            "description": "Bukti transfer vs approval + exception log (FIN-26)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Koordinasi penagihan dengan Sales — Akun overdue prioritas yang direview bersama Sales sesuai jadwal dan memiliki PIC, tindakan berikutnya, serta tenggat ÷ akun prioritas yang wajib direview",
            "description": "Daftar akun overdue prioritas + notulen review (FIN-07/08)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Handover data ke Accounting — Paket data kas, bank, piutang, dan pembayaran yang diserahkan lengkap sesuai kalender closing ÷ paket yang jatuh tempo",
            "description": "Checklist handover closing + tanda terima Accounting (FIN-24/27)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Layanan pengajuan pembayaran dari divisi lain — Pengajuan pembayaran lengkap yang diproses sesuai SLA ÷ pengajuan yang jatuh tempo",
            "description": "Register pengajuan pembayaran (tgl lengkap vs tgl proses)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Koordinasi kasus bad debt dengan lawyer / jalur hukum — Kasus bad debt yang diserahkan ke lawyer atau jalur hukum dengan berkas lengkap (invoice, PO, surat jalan/POD, korespondensi, somasi) dan status yang diperbarui ke GM tiap bulan ÷ kasus yang aktif",
            "description": "Register kasus bad debt + berkas per kasus + laporan status dari lawyer (FIN-09)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "J4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Ketepatan pembayaran jatuh tempo — Tagihan dalam jadwal bayar yang dibayar sesuai jatuh tempo ÷ tagihan yang dokumen, persetujuan, dan dananya siap sebelum batas proses",
            "description": "Weekly payment plan + bukti transfer vs tgl jatuh tempo (FIN-13/14)",
            "weightPercent": 9,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Pencapaian penerimaan piutang — Penerimaan yang dialokasikan ke invoice dalam daftar target penagihan ÷ nilai target penagihan periode tersebut; daftar dan nominal dikunci di awal periode",
            "description": "Daftar target penagihan yang dikunci + bank receipt & alokasi Orlansoft (FIN-06/07)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Akurasi proyeksi arus kas — Total selisih absolut proyeksi vs realisasi kas masuk dan keluar ÷ total arus kas aktual; memakai proyeksi yang dikunci di awal minggu",
            "description": "Proyeksi kas mingguan yang dikunci (FIN-23) vs mutasi bank realisasi",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "batas",
              "direction": "lower",
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          },
          {
            "name": "Penyelesaian pertanggungjawaban uang jalan dan petty cash — Pengeluaran atau uang muka yang diselesaikan dengan bukti dan pengembalian sisa dana (jika ada) sesuai tenggat ÷ transaksi yang jatuh tempo untuk dipertanggungjawabkan",
            "description": "Register uang jalan & kas bon + bukti pengembalian sisa dana (FIN-18/21)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan finance bulanan & posisi kas terbit tepat waktu — Jumlah hari telat dari jadwal penyampaian laporan bulanan",
            "description": "Laporan + waktu kirim (FIN-24)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Analisa piutang MDF — Analisa piutang customer MDF (aging per customer, akun berisiko, rekomendasi tindakan untuk Sales & GM) terbit sesuai jadwal ÷ analisa yang wajib terbit",
            "description": "File analisa piutang MDF + waktu kirim ke GM & Sales Manager (FIN-07)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Rencana pembayaran mingguan — Weekly payment plan disusun lengkap (tagihan, nominal, sumber dana) dan disetujui sebelum hari proses pembayaran ÷ minggu dalam bulan",
            "description": "Weekly payment plan + jejak approval (FIN-13)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Laporan posisi kas harian — Laporan saldo kas dan bank harian yang lengkap dan disampaikan sesuai jadwal ÷ laporan yang wajib disampaikan",
            "description": "Daily bank position + waktu kirim (FIN-22)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 8,
            "config": {
              "code": "U8",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Supervisor Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "AR Collection",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Pembayaran customer belum dialokasikan ke invoice lebih dari 2 hari kerja",
            "description": "Bank receipt vs alokasi Orlansoft (FIN-06)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "AR aging mingguan terbit tepat waktu",
            "description": "File aging + waktu kirim (FIN-07)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Koordinasi dengan Sales: update status piutang dan target penerimaan per customer per salesman dikirim tiap minggu",
            "description": "Rekap mingguan per salesman + notulen credit control",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Analisa piutang customer yang sudah kena limit tetapi punya order yang harus dikirim: disampaikan ke Sales Manager & Supervisor Finance untuk keputusan kirim/tahan",
            "description": "Form analisa credit hold + keputusan approval (IT-012, FIN-11)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Koordinasi dengan lawyer atas customer bermasalah: berkas lengkap dan status diperbarui tiap bulan",
            "description": "Register kasus bad debt + berkas + laporan status lawyer (FIN-09)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Collection rate akun yang dipegang",
            "description": "AR aging Orlansoft",
            "weightPercent": 17,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Piutang lancar (belum lewat 30 hari)",
            "description": "AR aging Orlansoft",
            "weightPercent": 17,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Reminder terkirim H-3 sebelum jatuh tempo",
            "description": "Log reminder WA/email (FIN-08)",
            "weightPercent": 17,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Invoice terbit dan sudah dikirim ke customer maksimal H+2 setelah surat jalan diterima",
            "description": "Tgl terima surat jalan vs tgl invoice di Orlansoft + bukti kirim ke customer (email/WA/tanda terima)",
            "weightPercent": 17,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Piutang berumur lebih dari 120 hari ÷ total piutang akun yang dipegang",
            "description": "AR aging akhir bulan, Orlansoft",
            "weightPercent": 16,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 5,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          },
          {
            "name": "Pengaturan jadwal kolektor: jadwal rute disusun tiap minggu dan kunjungan kolektor terlaksana sesuai rute",
            "description": "Jadwal rute mingguan + laporan harian kolektor (tanda terima/foto kunjungan)",
            "weightPercent": 16,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "AR Collection",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Admin Invoicing",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi invoice saat pertama diterbitkan — Invoice tanpa kesalahan input pada customer, SKU, qty, harga, diskon, termin, entitas/pajak, atau referensi PO/SJ ÷ invoice yang diterbitkan",
            "description": "Log void/revisi invoice, Orlansoft",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Kepatuhan pembatalan dan koreksi invoice — Pembatalan atau koreksi dengan alasan, dokumen pendukung, dan persetujuan tercatat ÷ pembatalan atau koreksi yang diproses",
            "description": "Form void/koreksi + approval (FIN-04, IT-017)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Arsip invoice lengkap — Invoice dengan arsip lengkap (invoice, PO, SJ, faktur pajak) ÷ sampel yang diperiksa",
            "description": "Audit sampel arsip invoice (FIN-27)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Koordinasi dokumen dan data yang belum lengkap — Kasus (SJ belum kembali, qty berbeda, harga belum disetujui) yang diteruskan ke PIC terkait dalam 1 hari kerja sejak diketahui ÷ kasus yang perlu ditindaklanjuti",
            "description": "Pending tracker / log eskalasi ke PIC",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Serah terima informasi ke AR Collection — Invoice terkirim yang diteruskan ke AR dengan tanggal kirim, jatuh tempo, dan bukti pengiriman dalam 1 hari kerja ÷ invoice terkirim yang perlu ditagih",
            "description": "Rekap serah terima ke AR + bukti kirim invoice",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Permintaan copy/revisi invoice dari Sales & AR — Permintaan copy atau revisi invoice yang ditanggapi di hari yang sama ÷ permintaan masuk",
            "description": "Pending tracker",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Ketepatan penerbitan invoice — Pengiriman siap tagih yang dibuatkan invoice dalam 1 hari kerja sejak data dan dokumen lengkap ÷ pengiriman siap ditagih",
            "description": "Tgl dokumen lengkap vs tgl invoice, Orlansoft (FIN-02/03)",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Ketepatan pengiriman invoice ke customer — Invoice (dan faktur pajak) yang dikirim atau diunggah melalui kanal yang disyaratkan customer sesuai jadwal ÷ invoice jatuh tempo untuk dikirim",
            "description": "Register pengiriman invoice + bukti kirim/unggah",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kelengkapan paket tagihan saat pertama dikirim — Paket tagihan dengan seluruh lampiran yang disyaratkan customer (PO, SJ bertanda terima, faktur pajak bila perlu) ÷ paket tagihan dikirim",
            "description": "Checklist paket tagihan per customer + catatan dokumen dikembalikan customer",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Credit note / retur diproses tepat waktu — Credit note atau retur yang diproses ≤2 hari kerja ÷ credit note/retur masuk",
            "description": "Register retur & credit note (FIN-04)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Invoicing",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Admin Finance",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Pembayaran tanpa dokumen lengkap atau tax clearance",
            "description": "Checklist pembayaran (PJK-16)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Arsip dokumen finance lengkap",
            "description": "Audit sampel arsip (FIN-27)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Skor penilaian dari divisi yang dilayani (FR-KPI-02, diisi Juni & Desember)",
            "description": "Rekap FR-KPI-02 (Google Form tanpa nama, min. 3 penilai)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "skor (1–5)",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Pertanyaan status pembayaran dari supplier/Purchasing ditanggapi ≤1 hari",
            "description": "Pending tracker",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Invoice supplier diverifikasi (3-way match) ≤2 hari kerja",
            "description": "Register invoice supplier (FIN-12)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Weekly payment plan siap tepat waktu",
            "description": "File payment plan + waktu kirim",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Rekonsiliasi AP bulanan selesai",
            "description": "Kertas kerja rekonsiliasi AP (FIN-16)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "Admin Finance",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Cashier",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi input transaksi — Transaksi tanpa koreksi akibat salah nominal, customer, invoice, metode bayar, atau input ganda ÷ transaksi yang diperiksa",
            "description": "Log koreksi transaksi kasir + laporan kas harian (FIN-19)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Kepatuhan bukti dan otorisasi — Transaksi dengan bukti lengkap dan persetujuan sesuai prosedur untuk pengeluaran, refund, atau void ÷ transaksi yang diperiksa",
            "description": "Voucher + bukti + approval (FIN-17/18/26)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Pencatatan potongan gaji & pinjaman karyawan — Potongan gaji dan cicilan pinjaman yang tercatat lengkap, dengan saldo pinjaman per karyawan cocok dengan payroll dan kartu pinjaman ÷ karyawan yang diperiksa",
            "description": "Kartu pinjaman per karyawan + rekap potongan gaji vs payroll (HRD-10)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Pengeluaran petty cash tanpa bukti — Jumlah pengeluaran petty cash yang keluar tanpa nota/bukti dan approval",
            "description": "Voucher petty cash + nota (FIN-17/18)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Selisih kas saat opname — Jumlah cash opname mingguan dengan selisih kas",
            "description": "Berita acara cash opname mingguan (FIN-19)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "M5",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Serah terima informasi pembayaran — Pembayaran yang diteruskan ke AR atau Finance dengan bukti, nominal, dan rincian invoice dalam 1 hari kerja sejak teridentifikasi ÷ pembayaran yang perlu diteruskan",
            "description": "Bukti serah terima / pesan ke AR & Finance (FIN-06)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Eskalasi selisih dan transaksi bermasalah — Kasus selisih kas, transfer belum teridentifikasi, atau koreksi transaksi yang dilaporkan ke Supervisor Finance sesuai tenggat ÷ kasus yang wajib dilaporkan",
            "description": "Log eskalasi ke Supervisor Finance",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Kecocokan kas fisik dengan saldo sistem — Closing dengan kas fisik cocok dengan saldo sistem sebelum penyesuaian ÷ closing yang dilakukan",
            "description": "Berita acara hitung kas / closing (FIN-19)",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Ketepatan dan kelengkapan closing kasir — Closing yang diserahkan tepat waktu dengan rekap transaksi, hasil hitung kas, dan bukti pendukung ÷ closing yang wajib diserahkan",
            "description": "Paket closing kasir + waktu serah terima (FIN-19)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Ketepatan setoran atau serah terima kas — Setoran atau serah terima yang dilakukan sesuai jadwal dan memiliki bukti lengkap ÷ setoran atau serah terima yang jatuh tempo",
            "description": "Bukti setor bank / tanda terima serah terima (FIN-20)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Jadwal pembayaran rutin bulanan uang jalan kolektor & messenger — Jadwal disusun di awal bulan, dan pembayaran uang jalan kolektor & messenger yang dibayarkan sesuai jadwal ÷ pembayaran terjadwal",
            "description": "Jadwal pembayaran bulanan + register uang jalan kolektor & messenger (FIN-21)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Cash opname mingguan terlaksana — Cash opname yang dilakukan dan ditandatangani Supervisor Finance ÷ minggu dalam bulan",
            "description": "Berita acara cash opname mingguan (FIN-19)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Uang jalan dicairkan dan diselesaikan tepat waktu — Uang jalan yang dicairkan sebelum jadwal berangkat dan dipertanggungjawabkan sesuai tenggat ÷ uang jalan yang jatuh tempo",
            "description": "Register uang jalan + jadwal kirim + bukti settlement (FIN-21)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Ketepatan pencatatan transaksi — Transaksi dengan dana atau bukti terverifikasi yang dicatat sebelum cutoff ÷ transaksi yang wajib dicatat hari itu",
            "description": "Laporan kas harian + waktu input Orlansoft",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Cashier",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Warehouse Controller",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Kepatuhan adjustment stok: adjustment dengan hasil hitung ulang, alasan, dan persetujuan lengkap ÷ adjustment yang diperiksa",
            "description": "Form adjustment + recount + approval (WH-011, ACC-16)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Salah kirim atau barang rusak di gudang: jumlah kejadian salah item/qty/grade terkirim atau barang rusak karena handling di gudang",
            "description": "Register retur/komplain + berita acara kerusakan (WH-006/009)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Audit 5S & keselamatan gudang: audit mingguan terlaksana dengan skor ≥80 dari 100 dan 0 temuan lorong/akses APAR terhalang ÷ minggu berjalan",
            "description": "Form audit 5S + foto per zona (WH-016)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Eskalasi selisih yang menghambat order: kasus prioritas diteruskan ke PIC terkait ≤1 hari kerja dengan SKU, lokasi, qty, dan tindakan berikutnya ÷ kasus prioritas",
            "description": "Pending tracker + log eskalasi (WH-011/017)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Checklist kontrol gudang harian: checklist kontrol (inbound, outbound, lokasi, barang HOLD, kebersihan armada) selesai sesuai jadwal ÷ hari kerja",
            "description": "Checklist harian + laporan harian gudang (WH-017)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Layanan ke Sales: permintaan cek stok dan jadwal kirim dari Sales/Admin Marketing ditanggapi di hari yang sama ÷ permintaan masuk",
            "description": "Pending tracker",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Akurasi stok fisik vs ERP: kombinasi SKU & lokasi dengan qty fisik sesuai saldo ERP ÷ kombinasi yang dihitung (sebelum adjustment)",
            "description": "Berita acara cycle count / stock opname FR-WH-12 (WH-011)",
            "weightPercent": 16,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Cycle count & FIFO: kombinasi SKU & lokasi yang selesai dihitung sesuai jadwal, dan saat dihitung lot tertua (berdasarkan tgl datang di kartu stok) berada di posisi keluar duluan / sudah dikeluarkan lebih dulu ÷ kombinasi yang dijadwalkan",
            "description": "Jadwal cycle count + count sheet + tgl datang di kartu stok vs DO (WH-004/005/011)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Barang di lokasi alokasi SKU: barang masuk, hasil penyesuaian, dan relokasi ditempatkan di line/lokasi yang sudah dialokasikan untuk SKU tersebut, dan setiap perpindahan tercatat ÷ lokasi yang diaudit",
            "description": "Master lokasi per SKU + audit lokasi + movement ticket FR-WH-07 (WH-005)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          },
          {
            "name": "Penyelesaian investigasi selisih: kasus selisih yang ditelusuri, didokumentasikan, dan punya tindakan korektif sesuai tenggat ÷ kasus jatuh tempo",
            "description": "RCA selisih + tindakan korektif (WH-011)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Pengiriman tepat waktu: armada rit pertama keluar gerbang paling lambat pukul 08.30 dan pengiriman yang keluar gudang sesuai jadwal ÷ pengiriman terjadwal (jadwal masuk ≤15:00)",
            "description": "Jam keluar armada di log gerbang & laporan foto Security + jadwal kirim vs SJ (WH-006/007)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Warehouse Controller",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Pengawas Produksi",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Pemeriksaan hasil produksi & sortir: hasil produksi/sortir yang diperiksa sesuai checklist dan grade/reject-nya tercatat sebelum diserahkan ke Kepala Gudang ÷ hasil yang wajib diperiksa",
            "description": "QC report FR-WH-02 + label grade per krat (WH-002/003)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Akurasi hasil sortir: krat yang diserahkan ke Kepala Gudang lolos cek ulang tanpa salah grade/brand/stempel, cacat yang lolos, atau rusak karena handling ÷ krat yang dicek ulang",
            "description": "Hasil spot-check Kepala Gudang + packing audit + berita acara kerusakan (WH-003)",
            "weightPercent": 15,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Serah terima hasil sortir/produksi ke Kepala Gudang: hasil diserahkan dengan rincian lembar per grade (UTY BTR, UTY, UTY-Lokal, reject), selisih qty bila ada, dan tujuan (gudang penyimpanan atau kirim ke customer) dalam shift yang sama ÷ hasil yang selesai",
            "description": "Form serah terima hasil sortir/produksi bertanda tangan Kepala Gudang",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan shift: laporan shift lengkap diserahkan sesuai jadwal ÷ shift kerja",
            "description": "Laporan shift / harian (WH-017)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Inspeksi tepat waktu: batch siap inspeksi yang mendapat keputusan QC sesuai jadwal (barang masuk maks H+1 dari receiving) ÷ batch jatuh tempo",
            "description": "QC report vs tgl receiving (WH-002)",
            "weightPercent": 15,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan hasil produksi lengkap: laporan harian memuat jumlah lembar diproduksi/disortir, lembar per grade (UTY BTR, UTY, UTY-Lokal) dan reject, % hasil bagus, supplier/lot asal, dan shift ÷ hari produksi",
            "description": "Laporan produksi/sortir harian + rework log (WH-003/017)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Retur dari customer berkurang: jumlah retur/komplain kualitas, salah grade/brand/stempel, atau rusak yang diinfokan Sales per bulan",
            "description": "Form komplain Sales + log retur FR-WH-11 + RCA (WH-009)",
            "weightPercent": 15,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 20
            }
          },
          {
            "name": "Repacking, stamping & barang siap muat: pekerjaan selesai sesuai jadwal harian dan barang siap sebelum jam muat ÷ pekerjaan terjadwal",
            "description": "Laporan produksi & loading harian + log gerbang (WH-003/006)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Pengawas Produksi",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Admin Warehouse",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi input mutasi — Transaksi (LBM/LPB, DO, SJ, mutasi, retur) yang bebas kesalahan input pada SKU, grade, ukuran, ketebalan, qty, satuan, atau lokasi ÷ transaksi yang diperiksa",
            "description": "Sampel transaksi Orlansoft vs dokumen sumber + hasil cycle count (WH-001/006/010/011)",
            "weightPercent": 9,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Kepatuhan void, koreksi, dan adjustment — Transaksi koreksi/void/adjustment dengan alasan, bukti, dan persetujuan lengkap sebelum diposting ÷ transaksi koreksi yang diproses",
            "description": "Log void & adjustment + approval (WH-010/011, IT-015/017)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Kartu stok per krat lengkap & terbaru — Krat sampel yang kartu stoknya terbaca, terisi lengkap (supplier, SKU, grade, tgl datang, qty, status QC) dan lokasi/balance sudah diupdate setelah relokasi ÷ krat yang diaudit",
            "description": "Line audit + kartu stok FR-WH-04 (WH-004/005)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Arsip dokumen & sample gudang — Dokumen dan sample/potongan (sample barang, potongan plywood/HPL/ACP, sample QC) yang sudah berlabel (item, grade, supplier, tgl, lokasi) dan tercatat di data stok sample, serta dapat ditemukan lewat Document Index / daftar sample ÷ dokumen & sample yang diuji (retrieval test bulanan)",
            "description": "Document Index + data stok sample + hasil retrieval test Kepala Gudang (WH-018, WH-003/010)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Tindak lanjut perbedaan data atau dokumen — Kasus qty berbeda, barang salah, atau dokumen kurang yang diteruskan ke PIC terkait (Kepala Gudang, Purchasing, Admin Marketing, Invoicing) ≤1 hari kerja ÷ kasus teridentifikasi",
            "description": "Discrepancy report FR-WH-03 + pending tracker (WH-001/017)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Disiplin update daftar pending — Hari dengan daftar transaksi pending (muat tertunda, dokumen belum lengkap, posting tertunda) diperbarui sebelum cut-off laporan harian, dan setiap item lewat tenggat punya penjelasan ÷ hari kerja",
            "description": "Pending tracker + laporan harian gudang (WH-017)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Konfirmasi stok & jadwal ke Admin Marketing — Permintaan konfirmasi stok/jadwal kirim dari Admin Marketing yang dijawab di hari yang sama ÷ permintaan masuk",
            "description": "Pending tracker / log chat konfirmasi (WH-006)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Koordinasi ketersediaan armada dengan lapangan — Hari dengan status armada (ready / dalam perbaikan / akan dijual) dikonfirmasi ke Kepala Gudang & Kepala Mekanik sebelum penugasan kendaraan, dan perubahan status/rute diinformasikan ke Admin Marketing di hari yang sama ÷ hari kerja",
            "description": "Register status fleet FR-WH-15 + jadwal kirim/penugasan kendaraan (WH-006/013)",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "J4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Koordinasi uang jalan dengan Cashier — Pengajuan uang jalan yang diserahkan lengkap (rute, kendaraan, driver, nominal sesuai matrix) ke Cashier sebelum batas pencairan, dan bukti/sisa dana diteruskan ke Cashier setelah trip ÷ trip berjalan",
            "description": "FR-WH-10 + register uang jalan Cashier (WH-008, FIN-21)",
            "weightPercent": 2,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "J5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Ketepatan posting mutasi di ERP — Mutasi (LBM→LPB H+0, maks H+1; DO; SJ; perpindahan/mutasi item; retur ke HOLD/quarantine) yang diposting sebelum cut-off sejak bukti transaksi lengkap ÷ mutasi yang siap diposting",
            "description": "Timestamp Orlansoft vs tgl dokumen lengkap (WH-001/006/009/010)",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kesiapan dokumen pengiriman — Pengiriman dengan DO (dari SO yang released) dan SJ (setelah loading terverifikasi) siap sebelum cut-off keberangkatan ÷ pengiriman yang jadwalnya masuk ≤15:00 dan datanya siap",
            "description": "Jadwal kirim Google Sheet + timestamp DO/SJ + Outbound Loading Checklist FR-WH-08 (WH-006)",
            "weightPercent": 15,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Ketepatan serah terima bukti pengiriman — SJ bertanda terima / POD yang diserahkan atau diunggah untuk Invoicing ≤1 hari kerja sejak diterima Admin Gudang ÷ SJ bertanda terima yang diterima",
            "description": "Log serah terima POD ke Invoicing + scan SJ (WH-006/014/018)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Pengajuan & rekonsiliasi uang jalan — Trip dengan pengajuan uang jalan sesuai Matrix Uang Jalan dan rekonsiliasi (bukti, sisa dana, variance) selesai ≤H+2 hari kerja ÷ trip berjalan",
            "description": "FR-WH-10 + advance register (WH-008, FIN-21)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Admin Warehouse",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Mekanik",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Catatan servis & perbaikan lengkap: keluhan, temuan, tindakan, spare part dipakai, dan hasil cek akhir tercatat ÷ pekerjaan yang diperiksa",
            "description": "Work order + riwayat servis (WH-013)",
            "weightPercent": 13,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Perbaikan ulang: keluhan yang sama kembali ≤14 hari setelah diperbaiki ÷ pekerjaan yang selesai",
            "description": "Riwayat work order + log laporan kerusakan",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 5,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Laporan kerusakan diterima & ditanggapi: laporan dari supir/operator yang dicatat dan dicek/didiagnosis di hari yang sama ÷ laporan masuk",
            "description": "Log laporan kerusakan (WH-012/013)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Update status unit & spare part: status unit, estimasi selesai, dan kebutuhan spare part disampaikan ke Kepala Gudang, Admin Gudang & Purchasing sesuai jadwal ÷ pekerjaan yang wajib di-update",
            "description": "Register status armada FR-WH-15 + form permintaan barang (WH-012/013)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Servis berkala sesuai hour meter / km: jadwal servis dibuat dari hour meter (forklift) atau km (kendaraan), dan servis selesai sebelum jatuh tempo ÷ servis yang jatuh tempo",
            "description": "Jadwal servis berkala FR-WH-16 + work order (WH-013)",
            "weightPercent": 20,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Pengecekan armada harian: unit yang dicek setiap malam setelah kembali atau pagi sebelum jalan ÷ unit yang beroperasi",
            "description": "Checklist harian kendaraan & forklift FR-WH-14 (WH-013)",
            "weightPercent": 18,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Perbaikan selesai sesuai estimasi: dihitung dari estimasi setelah diagnosis; waktu tunggu spare part dicatat terpisah ÷ perbaikan yang jatuh tempo",
            "description": "Work order (estimasi vs tgl selesai)",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Mekanik",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "HR Manager",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi data payroll (tim HR) — Data karyawan bebas koreksi akibat kesalahan input HR pada absensi, lembur, cuti, atau perubahan status ÷ data yang diproses",
            "description": "Rekap payroll + log koreksi data (HRD-05/07)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Kelengkapan dokumen karyawan — Berkas karyawan lengkap dan mutakhir sesuai checklist HR ÷ berkas yang diperiksa",
            "description": "Audit sampel file karyawan bulanan (HRD-03/04)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kepatuhan ketenagakerjaan — Temuan pelanggaran: kontrak PKWT lewat batas, BPJS telat, atau ketentuan Peraturan Perusahaan tidak dijalankan",
            "description": "Tracker kontrak + bukti BPJS + catatan audit HR (HRD-03/08)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Kebijakan & SOP HR mutakhir — SOP/kebijakan HR yang diperbarui sesuai keputusan Pimpinan dan jadwal review ÷ yang jatuh tempo",
            "description": "Daftar revisi SOP HRD + riwayat revisi",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Koordinasi kebutuhan tenaga kerja dengan kepala divisi — Permintaan tenaga kerja yang dibahas, disetujui, dan diberi tenggat pengisian sesuai jadwal ÷ permintaan masuk",
            "description": "Form permintaan tenaga kerja + notulen (HRD-01)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Pendampingan atasan dalam kasus disiplin & PHK — Kasus yang ditangani bersama atasan sesuai SOP dan terdokumentasi ÷ kasus yang muncul",
            "description": "Register kasus + berita acara (HRD-09/15)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Notifikasi onboarding & offboarding ke IT dan GA — Karyawan masuk/keluar yang dinotifikasikan minimal H-3 ÷ karyawan masuk/keluar",
            "description": "Email/WA notifikasi + checklist (HRD-04/14, IT-004)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pemenuhan posisi sesuai target — Posisi yang kandidatnya menerima penawaran sebelum atau pada tenggat pengisian ÷ posisi yang tenggatnya jatuh pada periode penilaian",
            "description": "Form permintaan tenaga kerja + surat penawaran yang ditandatangani (HRD-01/03)",
            "weightPercent": 12,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Pelaksanaan penilaian Program MAJU — Karyawan yang penilaiannya lengkap, disetujui atasan, dan terdokumentasi sesuai kalender ÷ karyawan yang wajib dinilai",
            "description": "Google Sheet KPI + FR-KPI-01/03 yang disetujui",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Turnover sukarela — Karyawan resign atas kemauan sendiri dalam 12 bulan bergulir ÷ rata-rata headcount",
            "description": "Data join & resign di Talenta + catatan exit interview (HRD-14)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "batas",
              "direction": "lower",
              "defaultTarget": 10,
              "notes": "Realisasi di bawah atau sama dengan batas = 100. Di atas batas = batas ÷ realisasi × 100."
            }
          },
          {
            "name": "Ketepatan review masa percobaan — Review yang mendapat keputusan atasan dan terdokumentasi sebelum tenggat ÷ review yang jatuh tempo",
            "description": "Form review masa percobaan + keputusan atasan",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Pelatihan & pengembangan — Program pelatihan, review kinerja, dan corporate event terlaksana ÷ rencana tahunan",
            "description": "Rencana tahunan + daftar hadir & dokumentasi (HRD-12/13)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Payroll & BPJS tepat waktu (tim) — Jumlah hari telat pembayaran gaji atau pembayaran/pelaporan BPJS",
            "description": "Jadwal payroll + bukti transfer + bukti BPJS (HRD-07/08)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Laporan HR bulanan ke GM/Owner — Laporan headcount, turnover, rekrutmen, dan kasus disiplin terkirim sesuai jadwal ÷ laporan yang wajib",
            "description": "File laporan HR + waktu kirim",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 7,
            "config": {
              "code": "U7",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "HR Staff",
    "scoreMethod": "bobot",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi input data payroll — Data karyawan bebas koreksi akibat kesalahan input pada absensi, lembur, cuti, atau perubahan status ÷ data yang diproses",
            "description": "Rekap payroll + log koreksi data (HRD-05/07)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Kelengkapan dokumen karyawan — Berkas karyawan lengkap dan mutakhir sesuai checklist HR ÷ berkas yang diperiksa",
            "description": "Audit sampel file karyawan bulanan (HRD-03/04)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Kontrak & dokumen kerja terkendali — Kontrak PKWT atau dokumen kerja yang lewat masa berlaku tanpa tindak lanjut",
            "description": "Tracker kontrak & reminder masa kerja (HRD-08)",
            "weightPercent": 7,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran — Hari hadir ÷ hari kerja wajib hadir",
            "description": "Rekap absensi Talenta",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu — Hari masuk tepat waktu ÷ hari masuk",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim — Hari dengan laporan kerja harian terkirim ÷ hari kerja",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 3,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Layanan administrasi karyawan — Permintaan lengkap (surat keterangan kerja, koreksi absensi) selesai sesuai batas waktu layanan ÷ permintaan jatuh tempo",
            "description": "Register permintaan administrasi (tgl masuk vs tgl selesai)",
            "weightPercent": 6,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Update status kandidat ke user & kandidat — Kandidat yang statusnya disampaikan sesuai jadwal ÷ kandidat yang jatuh tempo ditindaklanjuti",
            "description": "Tracker kandidat + bukti update (HRD-01/02)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Notifikasi onboarding & offboarding ke IT dan GA — Karyawan masuk/keluar yang dinotifikasikan minimal H-3 ÷ karyawan masuk/keluar",
            "description": "Email/WA notifikasi + checklist (HRD-04/14, IT-004)",
            "weightPercent": 4,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Penyelesaian onboarding — Karyawan baru yang menyelesaikan checklist onboarding sesuai tenggat ÷ karyawan baru yang tenggatnya jatuh pada periode penilaian",
            "description": "Checklist onboarding yang ditandatangani (HRD-04)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Administrasi rekrutmen & kepegawaian — Tugas yang selesai sesuai jadwal ÷ tugas yang jatuh tempo, mencakup: (1) jadwal interview, berkas kandidat & surat penawaran; (2) kelengkapan data karyawan baru di Talenta & berkas; (3) perpanjangan PKWT diproses paling lambat 30 hari sebelum habis; (4) koordinasi dengan outsourcing — data gaji mingguan diserahkan sesuai jadwal dan kebutuhan lowongan staf dikirim ke vendor",
            "description": "Tracker rekrutmen + berkas kandidat/karyawan + tracker PKWT + rekap gaji mingguan outsourcing & korespondensi vendor (HRD-01/02/03/07/08)",
            "weightPercent": 10,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "BPJS dibayar & dilaporkan tepat waktu — Jumlah hari telat pembayaran atau pelaporan BPJS",
            "description": "Bukti bayar & lapor BPJS (HRD-08)",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "hari telat",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Rekap penilaian Program MAJU — Form FR-KPI-01/03 terkumpul dan rekap nilai terbit sesuai kalender ÷ karyawan yang wajib dinilai",
            "description": "Google Sheet KPI + log pengisian form",
            "weightPercent": 8,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Administrasi SP & offboarding sesuai SOP — SP terbit ≤3 hari kerja setelah disetujui dan clearance lengkap sebelum hari terakhir ÷ kasus yang jatuh tempo",
            "description": "Register SP + form clearance (HRD-09/14)",
            "weightPercent": 9,
            "metricType": "ratio",
            "sortOrder": 5,
            "config": {
              "code": "U5",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Ketepatan penyerahan data payroll — Siklus payroll dengan data lengkap diserahkan ke Finance sebelum cutoff ÷ siklus yang jatuh tempo",
            "description": "Data payroll + waktu kirim ke Finance (HRD-07)",
            "weightPercent": 5,
            "metricType": "ratio",
            "sortOrder": 6,
            "config": {
              "code": "U6",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "HR Staff",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Procurement",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Pembelian tanpa approval",
            "description": "PR/PO + approval sesuai matriks + BAST (GA-01, GA-03)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Vendor baru tanpa due diligence lengkap, atau barang tidak sesuai spesifikasi / bukan original tanpa persetujuan",
            "description": "Checklist due diligence vendor (GA-02, lihat di bawah) + foto barang saat diterima + BAST",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Legalitas supplier aktif lengkap & masih berlaku (NIB, NPWP, status PKP, kontrak/penawaran harga), dicek ulang tiap 6 bulan",
            "description": "Daftar supplier aktif + folder dokumen legalitas per supplier (tgl cek terakhir)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Permintaan dari Mekanik, Gudang, dan staf kantor (HRGA) diproses ≤2 hari kerja",
            "description": "Register PR (tgl masuk vs tgl PO / barang tersedia)",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Koordinasi pembayaran dengan Kasir; bukti bon diserahkan ≤1 hari kerja setelah pembelian",
            "description": "Register kas bon / settlement + tanda terima bon dari Kasir",
            "weightPercent": 50,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Pembelian non-stock selesai sesuai SLA (fast / slow / urgent)",
            "description": "Register PR/PO (GA-01)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "STNK, KIR, SIM, atau dokumen lain yang lewat masa berlaku",
            "description": "Tracker masa berlaku dokumen (GA-05)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Pembelian di atas batas dengan minimal 3 penawaran pembanding, dari supplier yang bervariasi",
            "description": "Lembar perbandingan harga + rekap supplier pemenang per bulan",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Status permintaan diinformasikan ke pemohon ≤1 hari kerja + usulan penghematan",
            "description": "Register PR + catatan usulan penghematan (nilai hemat)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "% capaian",
              "dataSource": "manual",
              "jabatanName": "Procurement",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "Purchasing Stock",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Akurasi PO ke supplier: tanpa revisi karena salah item, qty, harga, atau supplier",
            "description": "Log revisi/amendment PO, Orlansoft (PUR-STK-11)",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Klaim barang selesai ≤14 hari; kualitas barang masuk dicek bersama Gudang",
            "description": "Register klaim (PUR-STK-11) + form QC barang masuk (WH-002)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "PO dengan perbandingan harga beberapa supplier (atau benchmark pasar untuk single source)",
            "description": "Lembar compare harga (PUR-STK-06)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Info ketersediaan, ETA, dan barang kosong ke Sales ≤1 hari kerja + update mingguan",
            "description": "Pending tracker + update ETA mingguan di grup Sales",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Rencana pembayaran supplier diserahkan ke Finance untuk cash flow & weekly payment plan",
            "description": "Weekly payment plan (PUR-STK-08 / FIN-13)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "kali",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Jadwal kedatangan barang dikirim ke Gudang ≥1 hari sebelum datang (pengiriman, penerimaan, penyimpanan)",
            "description": "Jadwal kedatangan + LPB (PUR-STK-07 / WH-001)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Stok SKU fast moving kosong (di bawah buffer)",
            "description": "Laporan stok Orlansoft vs buffer (PUR-STK-02)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Stock aging terkendali: nilai stok berumur ≤90 hari dari total nilai stok (pengendalian qty pembelian)",
            "description": "Laporan stock aging bulanan, Orlansoft + catatan analisa & tindakan",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Ketepatan replenishment: PO dikirim saat stok menyentuh reorder point, qty sesuai reorder plan",
            "description": "Reorder plan + PO Orlansoft (tgl stok sentuh reorder point vs tgl PO)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Saldo deposit / DP supplier cocok dengan konfirmasi supplier dan catatan Finance",
            "description": "Rekonsiliasi deposit bulanan + konfirmasi saldo dari supplier (PUR-STK-09)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "Purchasing Stock",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "IT Manager",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Backup sukses & uji restore bulanan",
            "description": "Log backup + berita acara uji restore (IT-008)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Hak akses: akses admin atau akses data diberikan tanpa approval",
            "description": "Log akses + form permintaan akses (IT-005)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Insiden keamanan atau downtime sistem kritis lebih dari 4 jam",
            "description": "Incident log + laporan DR (IT-011)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Aset IT & SOP IT terdokumentasi dan sesuai kondisi terbaru",
            "description": "Register aset IT + audit sampel + daftar revisi SOP IT (IT-006)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "M4",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Skor kepuasan user atas tiket",
            "description": "Survei penutupan tiket",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "skor (1–5)",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Proyek dengan UAT & sign-off divisi pemohon sebelum go-live",
            "description": "Berita acara UAT & go-live (IT-003)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          },
          {
            "name": "Onboarding & offboarding bersama HRD: karyawan baru menerima akun (email, server/Orlansoft, aplikasi komunikasi) dan hardware siap di hari pertama; karyawan keluar menyerahkan aset hardware & software, dan semua aksesnya (server, email, komunikasi) dicabut paling lambat di hari terakhir kerja",
            "description": "Notifikasi HRD (HRD-04 / HRD-14) + checklist onboarding/offboarding IT (IT-004) + berita acara serah terima aset + log pencabutan akses",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Tiket IT tim selesai sesuai SLA (semua kategori)",
            "description": "Log tiket (IT-001/002)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Uptime server, jaringan, dan Orlansoft di jam kerja",
            "description": "Log monitoring server & jaringan + incident log",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 99
            }
          },
          {
            "name": "Proyek IT (ERP, website, aplikasi internal, dashboard, integrasi) sesuai milestone",
            "description": "Portfolio proyek IT (IT-024) + berita acara tiap milestone",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Improvement & inovasi: digitalisasi, otomatisasi, atau AI yang selesai dan dipakai user",
            "description": "Daftar improvement + bukti dipakai (user, jam kerja yang dihemat)",
            "weightPercent": 25,
            "metricType": "ratio",
            "sortOrder": 4,
            "config": {
              "code": "U4",
              "unit": "kali per kuartal",
              "dataSource": "manual",
              "jabatanName": "IT Manager",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 1
            }
          }
        ]
      }
    ]
  },
  {
    "jabatanName": "IT Support",
    "scoreMethod": "rata-rata",
    "functions": [
      {
        "name": "Mutu",
        "weightPercent": 25,
        "groupCode": "M",
        "focus": "Kualitas pekerjaan jabatan ini",
        "sortOrder": 1,
        "indicators": [
          {
            "name": "Tiket dibuka ulang karena masalah yang sama (repeat issue)",
            "description": "Log tiket",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "M1",
              "unit": "kejadian",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "kejadian",
              "direction": "higher",
              "defaultTarget": 0,
              "notes": "0 kejadian = 100, 1 = 70, 2 = 40, 3 atau lebih = 0."
            }
          },
          {
            "name": "Backup harian & pengecekan CCTV sesuai jadwal",
            "description": "Checklist backup & CCTV (IT-008/010)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "M2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Aset IT tercatat dan sesuai fisik",
            "description": "Register aset IT + audit sampel (IT-006)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "M3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Andal",
        "weightPercent": 10,
        "groupCode": "A",
        "focus": "Kehadiran, ketepatan waktu, dan laporan harian",
        "sortOrder": 2,
        "indicators": [
          {
            "name": "Kehadiran",
            "description": "Rekap absensi Talenta",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "A1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 98
            }
          },
          {
            "name": "Masuk tepat waktu",
            "description": "Rekap jam masuk Talenta",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "A2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Laporan kerja harian terkirim",
            "description": "Tab Lapor WhatsApp",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "A3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          }
        ]
      },
      {
        "name": "Jalin Kerja Sama",
        "weightPercent": 15,
        "groupCode": "J",
        "focus": "Kerja sama antar divisi",
        "sortOrder": 3,
        "indicators": [
          {
            "name": "Respons pertama tiket ≤30 menit jam kerja",
            "description": "Log tiket",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "J1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Skor kepuasan user atas tiket",
            "description": "Survei penutupan tiket",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "J2",
              "unit": "skor (1–5)",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 4
            }
          },
          {
            "name": "Onboarding & offboarding bersama HRD dikerjakan sesuai checklist: akun & hardware karyawan baru siap di hari pertama; aset karyawan keluar diserahterimakan dan semua aksesnya dicabut paling lambat di hari terakhir kerja",
            "description": "Checklist onboarding/offboarding IT (IT-004) + berita acara serah terima aset + log pencabutan akses",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "J3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 100
            }
          }
        ]
      },
      {
        "name": "Unjuk Kerja",
        "weightPercent": 50,
        "groupCode": "U",
        "focus": "Hasil kerja jabatan ini",
        "sortOrder": 4,
        "indicators": [
          {
            "name": "Tiket selesai sesuai SLA",
            "description": "Log tiket",
            "weightPercent": 34,
            "metricType": "ratio",
            "sortOrder": 1,
            "config": {
              "code": "U1",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          },
          {
            "name": "Maintenance rutin server, jaringan, dan PC sesuai jadwal",
            "description": "Checklist maintenance (IT-009)",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 2,
            "config": {
              "code": "U2",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 95
            }
          },
          {
            "name": "Tugas proyek IT yang diberikan selesai sesuai jadwal",
            "description": "Task list proyek + tab kegiatan aplikasi KPI",
            "weightPercent": 33,
            "metricType": "ratio",
            "sortOrder": 3,
            "config": {
              "code": "U3",
              "unit": "%",
              "dataSource": "manual",
              "jabatanName": "IT Support",
              "rule": "ratio",
              "direction": "higher",
              "defaultTarget": 90
            }
          }
        ]
      }
    ]
  }
];
