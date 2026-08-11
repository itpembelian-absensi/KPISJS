/**
 * One-shot: buat entri SOP Draft + unggah file Master Word.
 * Jalankan: npx tsx scripts/upload-master-sop-draft.ts
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { upsertSop, appendSopAttachments, listSops } from "../src/lib/sop-ops";
import {
  ensureSopUploadDir,
  publicUrlForSopFile,
} from "../src/lib/sop-files";
import type { SopAttachment } from "../src/lib/types";

const SRC =
  "d:\\ActivityDaily IT\\Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (2).docx";
const CODE = "IT-SOP/2026/MASTER";
const ORIGINAL_NAME =
  "Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (2).docx";

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("File sumber tidak ditemukan:", SRC);
    process.exit(1);
  }

  const existing = listSops().find(
    (s) => s.code.toLowerCase() === CODE.toLowerCase(),
  );
  if (existing) {
    console.log("SOP Draft sudah ada:", existing.id, existing.code);
    console.log("Hapus dulu dari UI jika ingin unggah ulang, atau update manual.");
    process.exit(0);
  }

  const result = upsertSop({
    code: CODE,
    title:
      "Master SOP Information Technology – PT Sahabat Jaya Sukses (DRAFT)",
    divisionLabel: "DIVISI IT",
    documentType: "MASTER STANDARD OPERATING PROCEDURE",
    effectiveDate: "",
    revision: "00 – Draft Internal",
    revisionDate: "2026-08-11",
    purpose:
      "Dokumen induk kompilasi 27 SOP Divisi IT (draft review internal Agustus 2026). Belum berlaku sebelum disahkan. File Word lengkap terlampir.",
    materials:
      "File Word Master SOP; daftar induk IT-SOP/2026/001–027; lampiran template di dokumen sumber.",
    qualifications:
      "IT Manager / Management Representative sebagai pemilik dokumen draft; review lintas divisi sebelum pengesahan.",
    notes:
      "STATUS: DRAFT REVIEW INTERNAL — jangan dipakai operasional sebelum pengesahan. Temuan review: perbaiki judul SOP 001, samakan pemilik proses, kunci SLA/limit/void/retention. Lihat canvas review Master SOP di Cursor.",
    steps: [
      {
        order: 1,
        title: "Review draft",
        body: "Perbaiki temuan P0 (judul 001, keputusan Pimpinan) dan checklist Word.",
      },
      {
        order: 2,
        title: "Pengesahan",
        body: "Tanda tangan Disusun / Ditinjau / Direksi pada dokumen master.",
      },
      {
        order: 3,
        title: "Publikasi",
        body: "Unggah revisi final, lalu pecah menjadi 27 SOP aktif sesuai daftar induk.",
      },
    ],
    attachments: [],
    active: false,
  });

  if ("error" in result) {
    console.error(result.error);
    process.exit(1);
  }

  const sopId = result.id;
  const dir = ensureSopUploadDir(sopId);
  const filename = `${randomUUID()}.docx`;
  const dest = path.join(dir, filename);
  fs.copyFileSync(SRC, dest);

  const attachment: SopAttachment = {
    label: ORIGINAL_NAME,
    url: publicUrlForSopFile(sopId, filename),
    originalName: ORIGINAL_NAME,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "file",
  };

  const withFile = appendSopAttachments(sopId, [attachment]);
  if ("error" in withFile) {
    console.error(withFile.error);
    process.exit(1);
  }

  console.log("OK Draft SOP dibuat:");
  console.log("  id   :", withFile.id);
  console.log("  code :", withFile.code);
  console.log("  file :", attachment.url);
  console.log("  active:", withFile.active);
  console.log("Buka: /master/sops atau /sop/" + withFile.id);
}

main();
