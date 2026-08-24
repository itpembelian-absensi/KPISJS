import type { SopAttachment, SopDocument } from "./types";

function attName(att: SopAttachment) {
  return `${att.originalName || ""} ${att.label || ""} ${att.url}`.toLowerCase();
}

export function isSopPdfAttachment(att: SopAttachment) {
  return (
    att.mimeType === "application/pdf" ||
    attName(att).includes(".pdf") ||
    att.url.toLowerCase().endsWith(".pdf")
  );
}

export function isSopDocxAttachment(att: SopAttachment) {
  return (
    att.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    attName(att).includes(".docx") ||
    att.url.toLowerCase().endsWith(".docx")
  );
}

function fileAttachments(sop: SopDocument) {
  return sop.attachments.filter(
    (a) => a.kind === "file" || a.url.startsWith("/uploads/sops/"),
  );
}

/** File PDF lampiran asli (bukan hasil generate template). */
export function primarySopPdf(sop: SopDocument): SopAttachment | null {
  return fileAttachments(sop).find(isSopPdfAttachment) || null;
}

/** File Word lampiran asli. */
export function primarySopDocx(sop: SopDocument): SopAttachment | null {
  return fileAttachments(sop).find(isSopDocxAttachment) || null;
}
