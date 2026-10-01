import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { getCompanyName } from "./branding";
import { customerCodesBySubmission } from "./customer-ops";
import {
  getPengajuanType,
  PENGAJUAN_STATUS_LABEL,
} from "./pengajuan";
import { absolutePathFromPengajuanPhotoUrl } from "./pengajuan-photos";
import type { Pengajuan } from "./types";

function collectBuffers(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function companyLine() {
  return getCompanyName() || "SJS";
}

function displayCode(item: Pengajuan, codes: Record<string, string>) {
  return codes[item.id] || item.code;
}

function fieldValue(kind: string, value: string) {
  if (!value) return "—";
  if (kind === "date") {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return value;
}

function drawPhotos(doc: PDFKit.PDFDocument, urls: string[]) {
  const files = urls
    .map((url) => absolutePathFromPengajuanPhotoUrl(url))
    .filter((abs): abs is string => {
      if (!abs || !fs.existsSync(abs)) return false;
      const ext = path.extname(abs).toLowerCase();
      return ext === ".jpg" || ext === ".jpeg" || ext === ".png";
    });
  if (files.length === 0) {
    if (urls.length > 0) {
      doc.fontSize(9).fillColor("#64748b").text("Foto tersimpan di sistem.");
    }
    return;
  }

  const size = 110;
  const gap = 8;
  const maxX = doc.page.width - doc.page.margins.right;
  let x = doc.page.margins.left;
  let y = doc.y;
  let rowHeight = 0;
  for (const abs of files) {
    if (x + size > maxX) {
      x = doc.page.margins.left;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    if (y + size > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      x = doc.page.margins.left;
      y = doc.y;
      rowHeight = 0;
    }
    try {
      doc.image(abs, x, y, { fit: [size, size] });
      rowHeight = Math.max(rowHeight, size);
    } catch {
      continue;
    }
    x += size + gap;
  }
  doc.x = doc.page.margins.left;
  doc.y = y + rowHeight + 8;
}

function drawOne(doc: PDFKit.PDFDocument, item: Pengajuan, codes: Record<string, string>) {
  const def = getPengajuanType(item.type);
  const width = contentWidth(doc);
  doc.fontSize(11).fillColor("#0f766e").text(companyLine(), { width });
  doc.moveDown(0.2);
  doc.fontSize(16).fillColor("#0f172a").text(def?.label || "Pengajuan", { width });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor("#0f172a").text(item.title, { width });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Kode: ${displayCode(item, codes)}`);
  doc.text(`Status: ${PENGAJUAN_STATUS_LABEL[item.status]}`);
  doc.text(`Pemohon: ${item.requesterName} · ${item.requesterDept}`);
  doc.text(`Diajukan: ${formatWhen(item.createdAt)}`);
  if (item.reviewedAt) {
    doc.text(
      `${item.status === "rejected" ? "Ditolak" : "Disetujui"} oleh ${item.reviewerName || "—"} · ${formatWhen(item.reviewedAt)}`,
      { width },
    );
  }
  if (item.reviewerNote) doc.text(`Catatan persetujuan: ${item.reviewerNote}`, { width });
  if (item.completedAt) {
    doc.text(
      `Diselesaikan oleh ${item.completedBy || "—"} · ${formatWhen(item.completedAt)}`,
      { width },
    );
  }
  if (item.completionNote) doc.text(`Catatan penyelesaian: ${item.completionNote}`, { width });
  doc.moveDown(0.6);

  for (const field of def?.fields ?? []) {
    ensureSpace(doc, 36);
    const value = fieldValue(field.kind, item.payload[field.key] ?? "");
    doc.fontSize(8).fillColor("#64748b").text(field.label.toUpperCase(), { width });
    doc.fontSize(11).fillColor("#0f172a").text(value, { width });
    doc.moveDown(0.35);
  }

  if (item.note) {
    ensureSpace(doc, 36);
    doc.fontSize(8).fillColor("#64748b").text("CATATAN TAMBAHAN", { width });
    doc.fontSize(11).fillColor("#0f172a").text(item.note, { width });
    doc.moveDown(0.35);
  }

  if (item.photoUrls.length > 0) {
    ensureSpace(doc, 24);
    doc.fontSize(8).fillColor("#64748b").text("FOTO", { width });
    doc.moveDown(0.2);
    drawPhotos(doc, item.photoUrls);
  }
}

function drawList(
  doc: PDFKit.PDFDocument,
  items: Pengajuan[],
  title: string,
  codes: Record<string, string>,
) {
  const width = contentWidth(doc);
  doc.fontSize(11).fillColor("#0f766e").text(companyLine(), { width });
  doc.moveDown(0.2);
  doc.fontSize(16).fillColor("#0f172a").text(title, { width });
  doc.fontSize(9).fillColor("#64748b").text(`${items.length} pengajuan · dicetak ${formatWhen(new Date().toISOString())}`, { width });
  doc.moveDown(0.6);

  if (items.length === 0) {
    doc.fontSize(11).fillColor("#334155").text("Belum ada pengajuan.");
    return;
  }

  for (const item of items) {
    ensureSpace(doc, 48);
    const def = getPengajuanType(item.type);
    doc.fontSize(11).fillColor("#0f172a").text(
      `${displayCode(item, codes)}  ·  ${item.title}`,
      { width },
    );
    doc.fontSize(9).fillColor("#475569").text(
      [
        def?.label,
        PENGAJUAN_STATUS_LABEL[item.status],
        item.requesterName,
        item.requesterDept,
        formatWhen(item.createdAt),
      ]
        .filter(Boolean)
        .join(" · "),
      { width },
    );
    doc.moveDown(0.45);
  }
}

export async function buildPengajuanPdf(input: {
  items: Pengajuan[];
  title: string;
  mode: "one" | "list";
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: input.title,
      Author: companyLine(),
    },
  });
  const done = collectBuffers(doc);
  const codes = customerCodesBySubmission();
  if (input.mode === "one" && input.items[0]) {
    drawOne(doc, input.items[0], codes);
  } else {
    drawList(doc, input.items, input.title, codes);
  }
  doc.end();
  return done;
}
