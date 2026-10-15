import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { absolutePathFromPublicUrl } from "./activity-photos";
import type { ActivityReportGroup } from "./activity-report";
import { attachmentSummary } from "./work-report";

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

function drawRowPhotos(doc: PDFKit.PDFDocument, urls: string[]) {
  const embeddable = urls.filter((url) => {
    const abs = absolutePathFromPublicUrl(url);
    if (!abs || !fs.existsSync(abs)) return false;
    const ext = path.extname(abs).toLowerCase();
    return ext === ".jpg" || ext === ".jpeg" || ext === ".png";
  });
  if (embeddable.length === 0) return;

  const size = 52;
  const gap = 6;
  const needed = size + 10;
  ensureSpace(doc, needed);
  const startX = doc.x;
  const startY = doc.y;
  let x = startX;
  const maxX = doc.page.width - doc.page.margins.right;
  for (const url of embeddable.slice(0, 6)) {
    const abs = absolutePathFromPublicUrl(url);
    if (!abs) continue;
    if (x + size > maxX) break;
    try {
      doc.image(abs, x, startY, { fit: [size, size] });
    } catch {
      continue;
    }
    x += size + gap;
  }
  doc.x = startX;
  doc.y = startY + size + 6;
}

export async function buildActivityReportPdf(input: {
  groups: ActivityReportGroup[];
  companyName: string;
  departmentLabel: string;
  frequencyLabel: string;
  progressLabel: string;
  generatedAt: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "Laporan Kegiatan",
      Author: input.companyName || "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);

  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(input.companyName || "SJS");
  doc.moveDown(0.15);
  doc.fontSize(16).fillColor("#0f172a").text("Laporan Kegiatan");
  doc.moveDown(0.35);
  doc.fontSize(10).fillColor("#475569");
  doc.text(`Departemen: ${input.departmentLabel}`);
  doc.text(`Jenis: ${input.frequencyLabel}`);
  doc.text(`Status: ${input.progressLabel}`);
  doc.text(`Dicetak: ${input.generatedAt}`);
  doc.moveDown(0.8);

  for (const group of input.groups) {
    ensureSpace(doc, 48);
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text(`${group.label} (${group.rows.length})`);
    doc
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
      .strokeColor("#cbd5e1")
      .stroke();
    doc.moveDown(0.5);

    if (group.rows.length === 0) {
      doc.fontSize(9).fillColor("#64748b").text("Tidak ada data.");
      doc.moveDown(0.8);
      continue;
    }

    for (const row of group.rows) {
      ensureSpace(doc, row.photoUrls.length ? 120 : 52);
      doc.fontSize(10).fillColor("#0f172a").text(row.title, { width: 500 });
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          [
            row.statusLabel,
            row.dateLabel,
            `PIC: ${row.picLabel}`,
            row.functionLabel !== "—" ? row.functionLabel : null,
            row.projectLabel !== "—" ? row.projectLabel : null,
          ]
            .filter(Boolean)
            .join(" · "),
          { width: 500 },
        );
      if (row.photoUrls.length || row.documents.length) {
        doc
          .fontSize(8)
          .fillColor("#0f766e")
          .text(`Lampiran: ${attachmentSummary(row)}`, { width: 500 });
        drawRowPhotos(doc, row.photoUrls);
      }
      doc.moveDown(0.45);
    }
    doc.moveDown(0.5);
  }

  doc.end();
  return done;
}
