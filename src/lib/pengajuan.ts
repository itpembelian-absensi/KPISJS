import { formatMoneyCurrency, moneyDigits } from "./money";
import type { PengajuanStatus, PengajuanType } from "./types";

export type PengajuanFieldKind =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select"
  | "money";

export type PengajuanField = {
  key: string;
  label: string;
  kind: PengajuanFieldKind;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  wide?: boolean;
};

export type PengajuanTypeDef = {
  type: PengajuanType;
  href: string;
  label: string;
  menuHint: string;
  kicker: string;
  intro: string;
  fields: PengajuanField[];
  /** false = tidak muncul sebagai kartu sendiri di halaman Semua Pengajuan */
  listed?: boolean;
  photos?: boolean;
  titleFrom: (payload: Record<string, string>) => string;
};

export const PENGAJUAN_MAX_PHOTOS = 8;

const TOP_OPTIONS = [
  "Tunai",
  "COD",
  "7 hari",
  "14 hari",
  "21 hari",
  "30 hari",
  "45 hari",
  "60 hari",
  "90 hari",
];

const ALL_ROLES_HREF = "/pengajuan";

export const PENGAJUAN_TYPES: PengajuanTypeDef[] = [
  {
    type: "void",
    href: "/pengajuan/void",
    label: "Approve & Void Transaksi",
    menuHint: "Setujui atau batalkan transaksi",
    kicker: "Pengajuan transaksi",
    intro:
      "Ajukan persetujuan (Approve) atau pembatalan (Void) transaksi yang sudah tercatat. Isi nomor transaksi, nominal, dan alasan. Permintaan diproses setelah disetujui.",
    fields: [
      {
        key: "jenisAksi",
        label: "Jenis pengajuan",
        kind: "select",
        required: true,
        options: ["Approve", "Void"],
      },
      {
        key: "noTransaksi",
        label: "Nomor transaksi",
        kind: "text",
        required: true,
        placeholder: "Contoh: INV-2026-0142",
      },
      {
        key: "tanggalTransaksi",
        label: "Tanggal transaksi",
        kind: "date",
        required: true,
      },
      {
        key: "nominal",
        label: "Nominal",
        kind: "money",
        required: true,
        placeholder: "1.500.000",
      },
      {
        key: "namaCustomer",
        label: "Customer",
        kind: "text",
        placeholder: "Pilih dari master customer",
      },
      {
        key: "kasir",
        label: "Kasir / outlet",
        kind: "text",
        placeholder: "Nama kasir atau lokasi outlet",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan",
        kind: "textarea",
        required: true,
        placeholder: "Kenapa transaksi ini perlu di-approve atau di-void.",
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) =>
      `${p.jenisAksi || "Void"} ${p.noTransaksi || "transaksi"}`,
  },
  {
    type: "customer",
    href: "/pengajuan/customer",
    label: "Master Customer",
    menuHint: "Tambah atau ubah data customer",
    kicker: "Penambahan master",
    intro:
      "Ajukan customer baru agar bisa dicatat di sistem. Lengkapi identitas, limit, Term of Payment, dan foto pendukung.",
    fields: [
      {
        key: "namaCustomer",
        label: "Nama customer",
        kind: "text",
        required: true,
        placeholder: "Nama toko / perusahaan / perorangan",
        wide: true,
      },
      {
        key: "tipeCustomer",
        label: "Tipe",
        kind: "select",
        required: true,
        options: ["Toko", "Perusahaan", "Perorangan", "Kontraktor", "Manufacture"],
      },
      {
        key: "telepon",
        label: "Telepon",
        kind: "text",
        required: true,
        placeholder: "08xxxxxxxxxx",
      },
      {
        key: "email",
        label: "Email",
        kind: "text",
        placeholder: "nama@perusahaan.com",
      },
      {
        key: "npwp",
        label: "NPWP",
        kind: "text",
        placeholder: "Opsional",
      },
      {
        key: "namaPic",
        label: "Nama PIC",
        kind: "text",
        required: true,
        placeholder: "Kontak yang bisa dihubungi",
      },
      {
        key: "alamat",
        label: "Alamat",
        kind: "textarea",
        required: true,
        placeholder: "Alamat lengkap",
        wide: true,
      },
      {
        key: "limit",
        label: "Limit yang diberikan",
        kind: "money",
        required: true,
        placeholder: "50.000.000",
      },
      {
        key: "termOfPayment",
        label: "Term of Payment",
        kind: "select",
        required: true,
        options: TOP_OPTIONS,
      },
      {
        key: "alasan",
        label: "Alasan penambahan",
        kind: "textarea",
        placeholder: "Kenapa customer ini perlu ditambahkan.",
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) => `Customer ${p.namaCustomer || "baru"}`,
  },
  {
    type: "customer_ubah",
    href: "/pengajuan/customer",
    label: "Perubahan Data Customer",
    menuHint: "Ubah customer yang sudah ada",
    kicker: "Perubahan master",
    intro:
      "Ajukan perubahan data customer yang sudah tercatat. Isi data lama dan data baru, termasuk limit dan Term of Payment bila ikut berubah.",
    listed: false,
    photos: true,
    fields: [
      {
        key: "kodeCustomer",
        label: "Kode customer",
        kind: "text",
        required: true,
        placeholder: "Pilih dari master customer",
      },
      {
        key: "namaCustomer",
        label: "Nama customer",
        kind: "text",
        required: true,
        placeholder: "Nama yang sekarang tercatat",
      },
      {
        key: "limitLama",
        label: "Limit saat ini",
        kind: "money",
        placeholder: "Kosongkan jika tidak diubah",
      },
      {
        key: "limitBaru",
        label: "Limit baru",
        kind: "money",
        placeholder: "75.000.000",
      },
      {
        key: "topLama",
        label: "Term of Payment saat ini",
        kind: "select",
        options: TOP_OPTIONS,
      },
      {
        key: "termOfPayment",
        label: "Term of Payment baru",
        kind: "select",
        options: TOP_OPTIONS,
      },
      {
        key: "dataLama",
        label: "Data lain saat ini",
        kind: "textarea",
        placeholder: "Nama, alamat, telepon, NPWP, atau PIC yang sekarang.",
        wide: true,
      },
      {
        key: "dataBaru",
        label: "Data lain yang diminta",
        kind: "textarea",
        placeholder: "Isi baru untuk field di atas. Kosongkan jika hanya ubah limit atau TOP.",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan perubahan",
        kind: "textarea",
        required: true,
        placeholder: "Kenapa data customer ini perlu diubah.",
        wide: true,
      },
    ],
    titleFrom: (p) =>
      `Ubah customer ${p.namaCustomer || p.kodeCustomer || ""}`.trim(),
  },
  {
    type: "perubahan",
    href: "/pengajuan/perubahan",
    label: "Perubahan Data Orlansoft",
    menuHint: "Ubah data master yang sudah ada",
    kicker: "Perubahan master",
    intro:
      "Ajukan perubahan data yang sudah ada: customer, barang, harga, atau user. Tuliskan data lama dan data baru supaya tidak salah ubah.",
    fields: [
      {
        key: "objek",
        label: "Jenis data",
        kind: "select",
        required: true,
      },
      {
        key: "identitas",
        label: "Nomor perubahan",
        kind: "text",
        placeholder: "Pilih jenis data dulu",
      },
      {
        key: "nomorDokumen",
        label:
          "Nomor SO, PO, Surat Jalan, Receiving, Invoice, Cash & Bank, Kode Item, dll",
        kind: "text",
        required: true,
        placeholder: "Nomor dokumen yang akan diubah",
        wide: true,
      },
      {
        key: "dataLama",
        label: "Data lama",
        kind: "textarea",
        required: true,
        placeholder: "Isi yang sekarang tercatat",
        wide: true,
      },
      {
        key: "dataBaru",
        label: "Data baru",
        kind: "textarea",
        required: true,
        placeholder: "Isi yang diminta",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan perubahan",
        kind: "textarea",
        required: true,
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) =>
      `Ubah ${p.objek || "data"} ${p.nomorDokumen || p.identitas || ""}`.trim(),
  },
  {
    type: "asset",
    href: "/pengajuan/asset",
    label: "Asset IT",
    menuHint: "Ajukan perangkat IT baru",
    kicker: "Penambahan asset",
    intro:
      "Ajukan perangkat IT baru: komputer, laptop, printer, atau perangkat jaringan. Cantumkan jumlah, spesifikasi, dan siapa pemakainya.",
    fields: [
      {
        key: "namaAsset",
        label: "Nama asset",
        kind: "text",
        required: true,
        placeholder: "Contoh: Laptop operasional sales",
        wide: true,
      },
      {
        key: "kategoriAsset",
        label: "Kategori",
        kind: "select",
        required: true,
      },
      {
        key: "jumlah",
        label: "Jumlah",
        kind: "number",
        required: true,
        placeholder: "1",
      },
      {
        key: "pengguna",
        label: "Pengguna",
        kind: "text",
        placeholder: "Nama staf yang akan memakai",
      },
      {
        key: "lokasi",
        label: "Lokasi",
        kind: "text",
        placeholder: "Ruangan / cabang",
      },
      {
        key: "tanggalButuh",
        label: "Dibutuhkan pada",
        kind: "date",
      },
      {
        key: "spesifikasi",
        label: "Spesifikasi",
        kind: "textarea",
        placeholder: "RAM, storage, ukuran kertas, atau kebutuhan khusus.",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan pengajuan",
        kind: "textarea",
        required: true,
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) => {
      const qty = p.jumlah ? ` x${p.jumlah}` : "";
      return `Asset ${p.namaAsset || "IT"}${qty}`;
    },
  },
  {
    type: "barang",
    href: "/pengajuan/barang",
    label: "Master Item / Stock",
    menuHint: "Tambah item / barang baru",
    kicker: "Penambahan master",
    intro:
      "Ajukan barang atau item baru yang belum ada di master. Sertakan satuan, kategori, dan spesifikasi supaya IT / master data bisa input dengan benar.",
    fields: [
      {
        key: "namaBarang",
        label: "Nama barang",
        kind: "text",
        required: true,
        placeholder: "Nama item yang akan dijual / dipakai",
        wide: true,
      },
      {
        key: "kodeUsulan",
        label: "Kode usulan",
        kind: "text",
        placeholder: "Opsional, jika sudah ada usulan kode",
      },
      {
        key: "kategori",
        label: "Kategori",
        kind: "text",
        placeholder: "Contoh: Sparepart, Bahan, Finish good",
      },
      {
        key: "satuan",
        label: "Satuan",
        kind: "select",
        required: true,
        options: ["Pcs", "Box", "Kg", "Liter", "Meter", "Set", "Lainnya"],
      },
      {
        key: "spesifikasi",
        label: "Spesifikasi",
        kind: "textarea",
        placeholder: "Ukuran, merek, varian, atau keterangan pembeda.",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan penambahan",
        kind: "textarea",
        required: true,
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) => `Barang ${p.namaBarang || "baru"}`,
  },
  {
    type: "akses",
    href: "/pengajuan/akses",
    label: "Akses Sistem",
    menuHint: "User baru, hak akses, reset",
    kicker: "Pengajuan akses",
    intro:
      "Ajukan user baru, penambahan hak akses, reset password, atau penonaktifan user pada sistem perusahaan.",
    fields: [
      {
        key: "namaSistem",
        label: "Sistem",
        kind: "text",
        required: true,
        placeholder: "Contoh: ERP, Email, Folder, VPN",
      },
      {
        key: "jenisAkses",
        label: "Jenis permintaan",
        kind: "select",
        required: true,
        options: [
          "User baru",
          "Tambah hak akses",
          "Reset password",
          "Nonaktifkan user",
        ],
      },
      {
        key: "namaUser",
        label: "Nama user",
        kind: "text",
        required: true,
        placeholder: "Nama karyawan yang dimohonkan",
        wide: true,
      },
      {
        key: "hakAkses",
        label: "Hak akses / role",
        kind: "text",
        placeholder: "Menu, role, atau folder yang diminta",
        wide: true,
      },
      {
        key: "alasan",
        label: "Alasan",
        kind: "textarea",
        required: true,
        wide: true,
      },
    ],
    photos: true,
    titleFrom: (p) =>
      `${p.jenisAkses || "Akses"} — ${p.namaSistem || "sistem"}`.replace(
        /^ — /,
        "",
      ),
  },
];

export const PENGAJUAN_STATUS_LABEL: Record<PengajuanStatus, string> = {
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  done: "Disetujui",
};

export function pengajuanMenuHrefs(): string[] {
  return [ALL_ROLES_HREF, ...PENGAJUAN_TYPES.map((t) => t.href)];
}

export function getPengajuanType(type: string): PengajuanTypeDef | null {
  return PENGAJUAN_TYPES.find((t) => t.type === type) ?? null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePengajuanPayload(
  type: string,
  raw: unknown,
): { payload: Record<string, string>; title: string } | { error: string } {
  const def = getPengajuanType(type);
  if (!def) return { error: "Jenis pengajuan tidak dikenal" };
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const payload: Record<string, string> = {};

  for (const field of def.fields) {
    const value = String(source[field.key] ?? "").trim();
    if (field.required && !value) {
      return { error: `${field.label} wajib diisi` };
    }
    if (!value) {
      payload[field.key] = "";
      continue;
    }
    if (value.length > (field.kind === "textarea" ? 2000 : 300)) {
      return { error: `${field.label} terlalu panjang` };
    }
    if (field.kind === "select" && field.options && !field.options.includes(value)) {
      return { error: `${field.label} tidak valid` };
    }
    if (field.kind === "date" && !DATE_RE.test(value)) {
      return { error: `${field.label} tidak valid` };
    }
    if (field.kind === "number") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 999) {
        return { error: `${field.label} harus bilangan 1–999` };
      }
      payload[field.key] = String(n);
      continue;
    }
    if (field.kind === "money") {
      const digits = moneyDigits(value);
      if (!digits) {
        return { error: `${field.label} harus berupa angka` };
      }
      if (value.replace(/\D/g, "").length > 15) {
        return { error: `${field.label} terlalu besar` };
      }
      payload[field.key] = formatMoneyCurrency(digits);
      continue;
    }
    payload[field.key] = value;
  }

  if (type === "customer_ubah") {
    const changed = [
      payload.limitBaru,
      payload.termOfPayment,
      payload.dataBaru,
    ].some((value) => value.trim().length > 0);
    if (!changed) {
      return {
        error:
          "Isi limit baru, Term of Payment baru, atau data lain yang diminta",
      };
    }
  }

  const title = def.titleFrom(payload).trim().slice(0, 180);
  if (!title) return { error: "Ringkasan pengajuan kosong" };
  return { payload, title };
}
