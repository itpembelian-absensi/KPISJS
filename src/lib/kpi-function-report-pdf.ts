import PDFDocument from "pdfkit";
import {
  formatWeight,
  type KpiFunctionReportGroup,
} from "./kpi-function-report";

function collectBuffers(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

const COLS = [
  { key: "no", w: 28, label: "No" },
  { key: "name", w: 150, label: "Fungsi KPI" },
  { key: "weight", w: 48, label: "Bobot" },
  { key: "status", w: 58, label: "Status" },
  { key: "focus", w: 0, label: "Fokus" },
] as const;

export async function buildKpiFunctionReportPdf(input: {
  groups: KpiFunctionReportGroup[];
  companyName: string;
  departmentLabel: string;
  generatedAt: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "Laporan Fungsi KPI",
      Author: input.companyName || "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const focusW = width - COLS.slice(0, 4).reduce((s, c) => s + c.w, 0);
  const colW = [...COLS.map((c) => c.w).slice(0, 4), focusW];

  const bottom = () => doc.page.height - doc.page.margins.bottom;

  function drawTableHeader(y: number): number {
    doc.fontSize(8).fillColor("#64748b");
    let x = left;
    COLS.forEach((c, i) => {
      doc.text(c.label, x, y, { width: colW[i], lineBreak: false });
      x += colW[i];
    });
    const next = y + 12;
    doc
      .moveTo(left, next)
      .lineTo(right, next)
      .strokeColor("#cbd5e1")
      .stroke();
    return next + 6;
  }

  doc.fontSize(9).fillColor("#64748b").text(input.companyName || "SJS");
  doc.moveDown(0.15);
  doc.fontSize(16).fillColor("#0f172a").text("Laporan Fungsi KPI");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#475569");
  doc.text(`Departemen: ${input.departmentLabel}`);
  doc.text(`Dicetak: ${input.generatedAt}`);
  doc
    .moveTo(left, doc.y + 6)
    .lineTo(right, doc.y + 6)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.moveDown(1);

  for (const group of input.groups) {
    if (doc.y + 64 > bottom()) doc.addPage();

    doc.fontSize(12).fillColor("#0f172a").text(group.label);
    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `${group.functions.length} fungsi · ${group.activeCount} aktif · total bobot aktif ${formatWeight(group.activeWeightTotal)}`,
      );
    doc.moveDown(0.35);

    if (group.functions.length === 0) {
      doc.fontSize(9).fillColor("#64748b").text("Belum ada fungsi KPI.");
      doc.moveDown(0.8);
      continue;
    }

    let y = drawTableHeader(doc.y);

    group.functions.forEach((f, i) => {
      doc.fontSize(9);
      const nameH = doc.heightOfString(f.name, { width: colW[1] });
      const focus = f.focus || "—";
      const focusH = doc.heightOfString(focus, { width: colW[4] });
      const rowH = Math.max(14, nameH, focusH) + 6;

      if (y + rowH > bottom()) {
        doc.addPage();
        y = drawTableHeader(doc.page.margins.top);
      }

      let x = left;
      doc.fillColor("#0f172a").text(String(i + 1), x, y, {
        width: colW[0],
        lineBreak: false,
      });
      x += colW[0];
      doc.text(f.name, x, y, { width: colW[1] });
      x += colW[1];
      doc.text(formatWeight(f.weightPercent), x, y, {
        width: colW[2],
        lineBreak: false,
      });
      x += colW[2];
      doc.fillColor(f.active ? "#1f7a4c" : "#64748b").text(
        f.active ? "Aktif" : "Nonaktif",
        x,
        y,
        { width: colW[3], lineBreak: false },
      );
      x += colW[3];
      doc.fillColor("#475569").text(focus, x, y, { width: colW[4] });
      y += rowH;
    });

    doc.y = y + 10;
  }

  doc.end();
  return done;
}
