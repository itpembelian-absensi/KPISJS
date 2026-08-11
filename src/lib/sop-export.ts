import PDFDocument from "pdfkit";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import fs from "fs";
import {
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { SopAttachment, SopDocument } from "./types";
import { formatSopDate } from "./sop-format";
import { absolutePathFromSopPublicUrl } from "./sop-files";

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

function drawHeaderTable(doc: PDFKit.PDFDocument, sop: SopDocument) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const leftW = width * 0.58;
  const rightW = width - leftW;
  const top = doc.y;
  const rowH = 18;
  const metaRows = 5;
  const leftH = rowH * metaRows;
  const boxH = leftH;

  doc.rect(left, top, width, boxH).strokeColor("#0f172a").lineWidth(1).stroke();
  doc
    .moveTo(left + leftW, top)
    .lineTo(left + leftW, top + boxH)
    .stroke();

  // Left title block
  doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold");
  doc.text(sop.divisionLabel || "DIVISI IT", left + 8, top + 10, {
    width: leftW - 16,
  });
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text(sop.documentType || "STANDARD OPERATING PROCEDURE", left + 8, top + 28, {
    width: leftW - 16,
  });
  doc.fontSize(10).fillColor("#1e3a8a").font("Helvetica-Bold");
  doc.text(sop.title, left + 8, top + 48, {
    width: leftW - 16,
    height: boxH - 56,
  });

  // Right meta
  const meta: Array<[string, string]> = [
    ["NOMOR DOCUMENT", sop.code],
    ["MULAI BERLAKU", formatSopDate(sop.effectiveDate)],
    ["REVISI", sop.revision || "-"],
    ["TANGGAL REVISI", formatSopDate(sop.revisionDate)],
    ["HALAMAN", "1 dari 1"],
  ];
  doc.font("Helvetica").fillColor("#0f172a");
  for (let i = 0; i < meta.length; i++) {
    const y = top + i * rowH;
    if (i > 0) {
      doc
        .moveTo(left + leftW, y)
        .lineTo(right, y)
        .strokeColor("#0f172a")
        .stroke();
    }
    doc
      .moveTo(left + leftW + rightW * 0.45, y)
      .lineTo(left + leftW + rightW * 0.45, y + rowH)
      .stroke();
    doc.fontSize(7).font("Helvetica-Bold");
    doc.text(meta[i][0], left + leftW + 4, y + 5, {
      width: rightW * 0.45 - 8,
    });
    doc.font("Helvetica").fontSize(8);
    doc.text(meta[i][1], left + leftW + rightW * 0.45 + 4, y + 4, {
      width: rightW * 0.55 - 8,
    });
  }

  doc.y = top + boxH + 16;
  doc.x = left;
}

function writeFormalSopPdf(
  doc: PDFKit.PDFDocument,
  sop: SopDocument,
  index: number,
) {
  if (index > 0) doc.addPage();
  drawHeaderTable(doc, sop);

  const section = (letter: string, title: string, body: string) => {
    ensureSpace(doc, 40);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
    doc.text(`${letter}. ${title}`);
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(9).fillColor("#1e293b");
    doc.text(body.trim() || "—", { align: "justify", width: 500 });
    doc.moveDown(0.55);
  };

  section("A", "TUJUAN", sop.purpose);
  section("B", "BAHAN DAN PERALATAN", sop.materials);
  section("C", "KUALIFIKASI PERSONEL", sop.qualifications);

  ensureSpace(doc, 40);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  doc.text("D. PROSEDUR PELAKSANAAN");
  doc.moveDown(0.35);
  if (sop.steps.length === 0) {
    doc.font("Helvetica").fontSize(9).text("—");
  } else {
    for (const step of sop.steps) {
      ensureSpace(doc, 36);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
      const head = step.title
        ? `${step.order}. ${step.title}`
        : `${step.order}.`;
      doc.text(head, { continued: Boolean(step.body) });
      if (step.body) {
        doc.font("Helvetica").fillColor("#1e293b");
        doc.text(` ${step.body}`, { align: "justify" });
      }
      doc.moveDown(0.35);
    }
  }

  section("E", "NOTE", sop.notes);

  if (sop.attachments.length > 0) {
    ensureSpace(doc, 40);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(10).text("LAMPIRAN / FILE");
    doc.moveDown(0.25);
    for (const att of sop.attachments) {
      doc.font("Helvetica").fontSize(8).fillColor("#0f172a");
      const name = att.originalName || att.label || att.url;
      doc.text(`• ${name}${att.url ? ` — ${att.url}` : ""}`);
    }
  }

  // Disposition table — full lebar halaman, baris rendah
  ensureSpace(doc, 80);
  doc.moveDown(0.8);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const tableWidth = right - left;
  const cols = [0.18, 0.28, 0.34, 0.2];
  const headers = ["DISPOSISI", "NAMA", "JABATAN", "TANDA TANGAN"];
  const rowH = 16;
  const headerH = 14;
  const rows = sop.dispositions.length || 4;
  const tableH = headerH + rows * rowH;
  let y = doc.y;
  if (y + tableH > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  doc.rect(left, y, tableWidth, tableH).strokeColor("#0f172a").lineWidth(1).stroke();
  let x = left;
  for (let c = 0; c < cols.length; c++) {
    if (c > 0) {
      doc
        .moveTo(x, y)
        .lineTo(x, y + tableH)
        .stroke();
    }
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a");
    doc.text(headers[c], x + 3, y + 3, { width: tableWidth * cols[c] - 6 });
    x += tableWidth * cols[c];
  }
  doc
    .moveTo(left, y + headerH)
    .lineTo(right, y + headerH)
    .stroke();

  const dispositions =
    sop.dispositions.length > 0
      ? sop.dispositions
      : [
          { role: "Dibuat Oleh", name: "", position: "Divisi IT" },
          { role: "Diperiksa Oleh", name: "", position: "Manager" },
          {
            role: "Diperiksa Oleh",
            name: "",
            position: "Management Representative",
          },
          { role: "Disetujui Oleh", name: "", position: "Direktur" },
        ];

  for (let i = 0; i < dispositions.length; i++) {
    const ry = y + headerH + i * rowH;
    doc
      .moveTo(left, ry)
      .lineTo(right, ry)
      .stroke();
    const d = dispositions[i];
    const vals = [d.role, d.name || "", d.position, ""];
    let cx = left;
    for (let c = 0; c < cols.length; c++) {
      doc.font("Helvetica").fontSize(7);
      doc.text(vals[c], cx + 3, ry + 4, { width: tableWidth * cols[c] - 6 });
      cx += tableWidth * cols[c];
    }
  }

  doc.y = y + tableH + 12;
}

function isPdfAttachment(att: SopAttachment) {
  const name = `${att.originalName || ""} ${att.label || ""} ${att.url}`.toLowerCase();
  return (
    att.mimeType === "application/pdf" ||
    name.includes(".pdf") ||
    att.url.toLowerCase().endsWith(".pdf")
  );
}

/** Path absolut file PDF lampiran SOP (jika ada di disk) */
export function resolveSopPdfPath(sop: SopDocument): string | null {
  for (const att of sop.attachments) {
    if (!isPdfAttachment(att)) continue;
    if (!(att.kind === "file" || att.url.startsWith("/uploads/sops/"))) {
      continue;
    }
    const abs = absolutePathFromSopPublicUrl(att.url);
    if (abs && fs.existsSync(abs)) return abs;
  }
  return null;
}

/** PDF formal A–E (fallback jika SOP belum punya file PDF) */
export async function buildSopPdfFormal(sops: SopDocument[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title:
        sops.length === 1
          ? `SOP — ${sops[0].title}`
          : "Kumpulan SOP IT",
      Author: "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);

  if (sops.length === 0) {
    doc.fontSize(12).text("Tidak ada SOP yang dipilih.");
  } else {
    for (let i = 0; i < sops.length; i++) {
      writeFormalSopPdf(doc, sops[i], i);
    }
  }

  doc.end();
  return done;
}

/**
 * Export PDF: utamakan file PDF lampiran asli (sama persis),
 * digabung berurutan. SOP tanpa PDF memakai layout formal A–E.
 */
export async function buildSopPdf(sops: SopDocument[]): Promise<Buffer> {
  if (sops.length === 0) {
    return buildSopPdfFormal([]);
  }

  // Satu SOP + ada file PDF → kirim byte file apa adanya
  if (sops.length === 1) {
    const only = resolveSopPdfPath(sops[0]);
    if (only) return fs.readFileSync(only);
  }

  const allHavePdf = sops.every((s) => Boolean(resolveSopPdfPath(s)));
  if (allHavePdf) {
    const merged = await PdfLibDocument.create();
    for (const sop of sops) {
      const pdfPath = resolveSopPdfPath(sop)!;
      const bytes = fs.readFileSync(pdfPath);
      const src = await PdfLibDocument.load(bytes, {
        ignoreEncryption: true,
      });
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
    merged.setTitle(
      sops.length === 1 ? `SOP — ${sops[0].title}` : "Kumpulan SOP IT",
    );
    merged.setAuthor("SJS IT Systems");
    return Buffer.from(await merged.save());
  }

  // Campuran: gabungkan PDF asli + formal untuk yang tanpa file
  const merged = await PdfLibDocument.create();
  for (const sop of sops) {
    const pdfPath = resolveSopPdfPath(sop);
    if (pdfPath) {
      const bytes = fs.readFileSync(pdfPath);
      const src = await PdfLibDocument.load(bytes, {
        ignoreEncryption: true,
      });
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    } else {
      const formalBuf = await buildSopPdfFormal([sop]);
      const src = await PdfLibDocument.load(formalBuf);
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
  }
  merged.setTitle("Kumpulan SOP IT");
  merged.setAuthor("SJS IT Systems");
  return Buffer.from(await merged.save());
}

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 8, color: "0F172A" },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: "0F172A" },
  left: { style: BorderStyle.SINGLE, size: 8, color: "0F172A" },
  right: { style: BorderStyle.SINGLE, size: 8, color: "0F172A" },
};

function cell(
  text: string,
  opts?: { bold?: boolean; width?: number; compact?: boolean },
) {
  return new TableCell({
    borders: thinBorder,
    width: { size: opts?.width ?? 2400, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: 16,
          }),
        ],
      }),
    ],
  });
}

function sopToDocxChildren(sop: SopDocument, withBreak: boolean) {
  const children: Array<Paragraph | Table> = [];
  if (withBreak) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [5200, 2080, 2080],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: thinBorder,
              width: { size: 5200, type: WidthType.DXA },
              rowSpan: 5,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sop.divisionLabel || "DIVISI IT",
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        sop.documentType || "STANDARD OPERATING PROCEDURE",
                      bold: true,
                      size: 16,
                    }),
                  ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sop.title,
                      bold: true,
                      size: 18,
                      color: "1E3A8A",
                    }),
                  ],
                }),
              ],
            }),
            cell("NOMOR DOCUMENT", { bold: true, width: 2080 }),
            cell(sop.code, { width: 2080 }),
          ],
        }),
        new TableRow({
          children: [
            cell("MULAI BERLAKU", { bold: true, width: 2080 }),
            cell(formatSopDate(sop.effectiveDate), { width: 2080 }),
          ],
        }),
        new TableRow({
          children: [
            cell("REVISI", { bold: true, width: 2080 }),
            cell(sop.revision || "-", { width: 2080 }),
          ],
        }),
        new TableRow({
          children: [
            cell("TANGGAL REVISI", { bold: true, width: 2080 }),
            cell(formatSopDate(sop.revisionDate), { width: 2080 }),
          ],
        }),
        new TableRow({
          children: [
            cell("HALAMAN", { bold: true, width: 2080 }),
            cell("1 dari 1", { width: 2080 }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "A. TUJUAN", bold: true, size: 20 })],
    }),
    new Paragraph({ text: sop.purpose || "—" }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({ text: "B. BAHAN DAN PERALATAN", bold: true, size: 20 }),
      ],
    }),
    new Paragraph({ text: sop.materials || "—" }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "C. KUALIFIKASI PERSONEL",
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({ text: sop.qualifications || "—" }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "D. PROSEDUR PELAKSANAAN",
          bold: true,
          size: 20,
        }),
      ],
    }),
  );

  for (const step of sop.steps) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: step.title
              ? `${step.order}. ${step.title} `
              : `${step.order}. `,
            bold: true,
          }),
          new TextRun({ text: step.body }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "E. NOTE", bold: true, size: 20 })],
    }),
    new Paragraph({ text: sop.notes || "—" }),
  );

  if (sop.attachments.length > 0) {
    children.push(
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [
          new TextRun({ text: "LAMPIRAN / FILE", bold: true, size: 20 }),
        ],
      }),
    );
    for (const att of sop.attachments) {
      const name = att.originalName || att.label || att.url;
      children.push(
        new Paragraph({
          text: `• ${name}${att.url ? ` — ${att.url}` : ""}`,
        }),
      );
    }
  }

  children.push(new Paragraph({ text: "" }));

  const dispRows = [
    new TableRow({
      children: [
        cell("DISPOSISI", { bold: true, width: 1685 }),
        cell("NAMA", { bold: true, width: 2620 }),
        cell("JABATAN", { bold: true, width: 3180 }),
        cell("TANDA TANGAN", { bold: true, width: 1875 }),
      ],
    }),
    ...sop.dispositions.map(
      (d) =>
        new TableRow({
          children: [
            cell(d.role, { width: 1685 }),
            cell(d.name, { width: 2620 }),
            cell(d.position, { width: 3180 }),
            cell("", { width: 1875 }),
          ],
        }),
    ),
  ];

  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1685, 2620, 3180, 1875],
      rows: dispRows,
    }),
  );

  return children;
}

export async function buildSopDocx(sops: SopDocument[]): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];

  if (sops.length === 0) {
    children.push(new Paragraph({ text: "Tidak ada SOP yang dipilih." }));
  } else {
    for (let i = 0; i < sops.length; i++) {
      children.push(...sopToDocxChildren(sops[i], i > 0));
    }
  }

  const doc = new Document({
    creator: "SJS IT Systems",
    title:
      sops.length === 1 ? `SOP — ${sops[0].title}` : "Kumpulan SOP IT",
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function sopExportFilename(
  sops: SopDocument[],
  format: "pdf" | "docx",
): string {
  const ext = format === "pdf" ? "pdf" : "docx";
  if (sops.length === 1) {
    const safe = sops[0].code.replace(/[^\w.-]+/g, "_");
    return `${safe}.${ext}`;
  }
  return `SOP-IT-gabungan-${sops.length}.${ext}`;
}
