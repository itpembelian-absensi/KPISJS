import PDFDocument from "pdfkit";
import type { WorkReportGroup } from "./work-report";

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

export async function buildWorkReportPdf(input: {
  groups: WorkReportGroup[];
  periodLabel: string;
  departmentLabel: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "Laporan Pekerjaan",
      Author: "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);

  doc.fontSize(16).fillColor("#0f172a").text("Laporan Pekerjaan", {
    underline: false,
  });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#475569");
  doc.text(`Periode: ${input.periodLabel}`);
  doc.text(`Departemen: ${input.departmentLabel}`);
  doc.moveDown(0.8);

  for (const group of input.groups) {
    ensureSpace(doc, 48);
    doc.fontSize(12).fillColor("#0f172a").text(
      `${group.label} (${group.rows.length})`,
      { continued: false },
    );
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
      ensureSpace(doc, 52);
      const kind =
        group.id === "pending"
          ? `${row.kind === "activity" ? "Kegiatan" : "Project"} · `
          : "";
      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .text(`${kind}${row.title}`, { width: 500 });
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          [
            row.statusLabel,
            row.departmentLabel,
            row.dateLabel,
            `PIC: ${row.picLabel}`,
            row.functionLabel !== "—" ? row.functionLabel : null,
            row.projectLabel !== "—" ? row.projectLabel : null,
          ]
            .filter(Boolean)
            .join(" · "),
          { width: 500 },
        );
      doc.moveDown(0.45);
    }
    doc.moveDown(0.5);
  }

  doc.end();
  return done;
}
