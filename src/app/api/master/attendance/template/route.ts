import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { getUserBySessionToken, listStaff } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageMaster(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = listStaff(true).slice(0, 5);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d1 = `${y}-${m}-01`;
  const d2 = `${y}-${m}-02`;

  const sampleCode1 = staff[0]?.employeeCode || "EMP-001";
  const sampleCode2 = staff[1]?.employeeCode || "EMP-002";
  const sampleCode3 = staff[2]?.employeeCode || "EMP-003";

  const sampleName1 = staff[0]?.name || "Contoh Karyawan 1";
  const sampleName2 = staff[1]?.name || "Contoh Karyawan 2";
  const sampleName3 = staff[2]?.name || "Contoh Karyawan 3";

  const rows: Array<Array<string | number>> = [
    [
      "NIK",
      "Nama",
      "Jabatan",
      "Departemen",
      "Tanggal",
      "Jam Masuk",
      "Jam Keluar",
      "Terlambat (menit)",
      "Lembur (menit)",
      "Status",
    ],
    [sampleCode1, sampleName1, "", "", d1, "08:00", "17:00", 0, 0, "Hadir"],
    [sampleCode1, sampleName1, "", "", d2, "08:20", "17:00", 20, 0, "Hadir"],
    [sampleCode2, sampleName2, "", "", d1, "08:00", "18:30", 0, 90, "Hadir"],
    [sampleCode3, sampleName3, "", "", d1, "", "", 0, 0, "Absen"],
    [sampleCode2, sampleName2, "", "", d2, "", "", 0, 0, "Sakit"],
  ];

  // Sheet petunjuk
  const guide: Array<Array<string>> = [
    ["Petunjuk isi template absensi"],
    [""],
    ["Kolom wajib", "NIK dan Tanggal"],
    [
      "NIK",
      "Kode karyawan. Jika belum ada di Master Staf, isi juga Nama agar otomatis ditambahkan.",
    ],
    ["Nama", "Wajib jika NIK baru — dipakai untuk membuat Master Staf"],
    ["Jabatan / Departemen", "Opsional, untuk mapping staf baru"],
    ["Tanggal", "Format YYYY-MM-DD atau DD/MM/YYYY"],
    ["Jam Masuk / Keluar", "Format HH:MM (opsional)"],
    ["Terlambat (menit)", "Angka menit keterlambatan"],
    ["Lembur (menit)", "Angka menit lembur"],
    [
      "Status",
      "Hadir | Absen | Sakit | Izin | Libur (kosong = dianggap Hadir)",
    ],
    [""],
    ["Setelah diisi", "Unggah file lewat tombol Unggah file Excel"],
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet(rows);
  wsData["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Absensi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), "Petunjuk");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-absensi.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
