import fs from "fs";
import { convertDocxToPdf } from "./docx-to-pdf";
import {
  appendSopAttachments,
  getSop,
  replaceSopAttachment,
} from "./sop-ops";
import {
  deleteSopFileUrls,
  resolveSopDocxPath,
  resolveSopPdfPath,
  writeSopDiskFile,
} from "./sop-files";

import { isSopPdfAttachment } from "./sop-attachments";
import type { SopDocument } from "./types";

function pdfNameFromDocx(filename: string) {
  return filename.replace(/\.docx$/i, ".pdf") || "sop.pdf";
}

function attachConvertedPdf(
  sopId: string,
  buffer: Buffer,
  originalName: string,
) {
  const att = writeSopDiskFile(
    sopId,
    buffer,
    originalName,
    "application/pdf",
    ".pdf",
  );
  const existing = getSop(sopId);
  const old = existing?.attachments.find((a) => isSopPdfAttachment(a));
  if (old) {
    const result = replaceSopAttachment(sopId, old.url, [att]);
    deleteSopFileUrls([old.url]);
    return result;
  }
  return appendSopAttachments(sopId, [att]);
}

/**
 * Pastikan SOP punya PDF hasil konversi Word asli (disimpan sebagai lampiran).
 */
export async function ensureSopOriginalPdf(
  sop: SopDocument,
): Promise<SopDocument> {
  if (resolveSopPdfPath(sop)) return sop;
  const docxPath = resolveSopDocxPath(sop);
  if (!docxPath) return sop;

  try {
    const pdf = await convertDocxToPdf(fs.readFileSync(docxPath));
    const docxAtt = sop.attachments.find((a) =>
      `${a.originalName || ""} ${a.label || ""} ${a.url}`
        .toLowerCase()
        .includes(".docx"),
    );
    const name = pdfNameFromDocx(
      docxAtt?.originalName || docxAtt?.label || "sop.docx",
    );
    const next = attachConvertedPdf(sop.id, pdf, name);
    if ("error" in next) return sop;
    return next;
  } catch {
    return getSop(sop.id) ?? sop;
  }
}

export { attachConvertedPdf };
