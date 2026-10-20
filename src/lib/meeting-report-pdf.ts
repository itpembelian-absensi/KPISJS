import PDFDocument from "pdfkit";
import type {
  MeetingReport,
  MeetingReportItemRow,
  MeetingReportNoteRow,
} from "./meeting-report";

const FONT = 8;
const PAD_X = 4;
const PAD_Y = 3;
const LINE = "#94a3b8";
const HEADER_FILL = "#0f766e";
const LABEL_FILL = "#e2e8f0";
const BAND_FILL = "#f8fafc";
const INK = "#0f172a";
const MUTED = "#475569";

type Align = "left" | "center";

type Cell = {
  text: string;
  bold?: boolean;
  color?: string;
  fill?: string;
  align?: Align;
};

type Col = { label: string; width: number; align?: Align };

function collectBuffers(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function pageBottom(doc: PDFKit.PDFDocument) {
  return doc.page.height - doc.page.margins.bottom;
}

function clean(value: string | undefined): string {
  return String(value || "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\r/g, "")
    .trim();
}

function fontName(bold?: boolean) {
  return bold ? "Helvetica-Bold" : "Helvetica";
}

function textHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  bold?: boolean,
) {
  doc.font(fontName(bold)).fontSize(FONT);
  return doc.heightOfString(text || "-", {
    width: Math.max(8, width - PAD_X * 2),
    lineGap: 1,
  });
}

function paintCell(
  doc: PDFKit.PDFDocument,
  cell: Cell,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const text = clean(cell.text);
  if (cell.fill) {
    doc.save();
    doc.rect(x, y, width, height).fill(cell.fill);
    doc.restore();
  }
  doc.save();
  doc.lineWidth(0.6).strokeColor(LINE).rect(x, y, width, height).stroke();
  doc.restore();
  const cursorY = doc.y;
  const cursorX = doc.x;
  if (text) {
    doc
      .font(fontName(cell.bold))
      .fontSize(FONT)
      .fillColor(cell.color || INK)
      .text(text, x + PAD_X, y + PAD_Y, {
        width: Math.max(8, width - PAD_X * 2),
        height: Math.max(8, height - PAD_Y * 2),
        align: cell.align || "left",
        lineGap: 1,
      });
  }
  doc.x = cursorX;
  doc.y = cursorY;
}

function cellHeight(
  doc: PDFKit.PDFDocument,
  cell: Cell,
  width: number,
) {
  const text = clean(cell.text);
  if (!text) return 16;
  return Math.max(16, textHeight(doc, text, width, cell.bold) + PAD_Y * 2);
}

function drawBanner(doc: PDFKit.PDFDocument, text: string, y: number) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const inner = clean(text);
  doc.font("Helvetica-Bold").fontSize(9);
  const height = Math.max(18, doc.heightOfString(inner, { width: width - 12 }) + 8);
  doc.save();
  doc.rect(x, y, width, height).fill(HEADER_FILL);
  doc.restore();
  const cursorY = doc.y;
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(inner, x + 6, y + 4, { width: width - 12, lineGap: 1 });
  doc.y = cursorY;
  return y + height;
}

function drawGrid(
  doc: PDFKit.PDFDocument,
  columns: Col[],
  rows: Cell[][],
  y: number,
  options?: { header?: boolean; repeatTitle?: string; fills?: Array<string | undefined> },
) {
  const left = doc.page.margins.left;
  const showHeader = options?.header !== false;
  const headerCells: Cell[] = columns.map((col) => ({
    text: col.label,
    bold: true,
    color: "#ffffff",
    fill: HEADER_FILL,
    align: col.align || "left",
  }));
  const headerHeight = showHeader
    ? Math.max(...headerCells.map((cell, index) => cellHeight(doc, cell, columns[index].width)))
    : 0;

  function drawHeader(top: number) {
    if (!showHeader) return top;
    let x = left;
    headerCells.forEach((cell, index) => {
      paintCell(doc, cell, x, top, columns[index].width, headerHeight);
      x += columns[index].width;
    });
    return top + headerHeight;
  }

  function newPage(topTitle: boolean) {
    doc.addPage();
    let next = doc.page.margins.top;
    if (topTitle && options?.repeatTitle) {
      next = drawBanner(doc, options.repeatTitle, next);
    }
    return drawHeader(next);
  }

  let cursor = y;
  if (cursor + headerHeight + 18 > pageBottom(doc)) {
    cursor = newPage(true);
  } else {
    cursor = drawHeader(cursor);
  }

  const bannerAllowance = options?.repeatTitle ? 28 : 0;
  const printable =
    pageBottom(doc) - doc.page.margins.top - headerHeight - bannerAllowance - 8;

  rows.forEach((row, rowIndex) => {
    const parts = splitRow(doc, columns, row, Math.max(80, printable));
    parts.forEach((part) => {
      const height = Math.max(
        ...part.map((cell, index) => cellHeight(doc, cell, columns[index].width)),
      );
      const atPageStart = cursor <= doc.page.margins.top + headerHeight + bannerAllowance + 2;
      if (cursor + height > pageBottom(doc) && !atPageStart) {
        cursor = newPage(true);
      }
      const fill = options?.fills?.[rowIndex];
      let x = left;
      part.forEach((cell, index) => {
        paintCell(
          doc,
          {
            ...cell,
            fill: cell.fill || fill,
          },
          x,
          cursor,
          columns[index].width,
          height,
        );
        x += columns[index].width;
      });
      cursor += height;
    });
  });

  doc.x = left;
  doc.y = cursor;
  return cursor;
}

function splitRow(
  doc: PDFKit.PDFDocument,
  columns: Col[],
  row: Cell[],
  maxHeight: number,
): Cell[][] {
  const chunks = row.map((cell, index) =>
    splitText(doc, clean(cell.text), columns[index].width, maxHeight - PAD_Y * 2, cell.bold),
  );
  const count = Math.max(1, ...chunks.map((part) => part.length));
  const rows: Cell[][] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push(
      row.map((cell, index) => ({
        ...cell,
        text: chunks[index][i] || "",
      })),
    );
  }
  return rows;
}

function splitText(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  maxTextHeight: number,
  bold?: boolean,
): string[] {
  const source = clean(text);
  if (!source) return [""];
  if (textHeight(doc, source, width, bold) <= maxTextHeight) {
    return [source];
  }
  const chunks: string[] = [];
  let rest = source;
  while (rest) {
    if (textHeight(doc, rest, width, bold) <= maxTextHeight) {
      chunks.push(rest);
      break;
    }
    let low = 1;
    let high = rest.length;
    let fit = 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const slice = rest.slice(0, mid);
      if (textHeight(doc, slice, width, bold) <= maxTextHeight) {
        fit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const window = rest.slice(0, fit);
    const breakAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const cut = breakAt > fit * 0.5 ? breakAt : fit;
    const piece = rest.slice(0, cut).trimEnd();
    if (!piece) break;
    chunks.push(piece);
    rest = rest.slice(cut).trimStart();
    if (chunks.length > 30) {
      chunks.push(rest);
      break;
    }
  }
  return chunks.length > 0 ? chunks : [source];
}

function bahasanColumns(total: number): Col[] {
  const fixed: Col[] = [
    { label: "No", width: 24, align: "center" },
    { label: "Topik", width: 96 },
    { label: "Permasalahan", width: 176 },
    { label: "Keputusan", width: 136 },
    { label: "Dept", width: 68 },
    { label: "PIC", width: 100 },
    { label: "Mulai", width: 62, align: "center" },
    { label: "Selesai", width: 62, align: "center" },
  ];
  const used = fixed.reduce((sum, col) => sum + col.width, 0);
  return [...fixed, { label: "Status", width: Math.max(56, total - used), align: "center" }];
}

function statusText(row: MeetingReportItemRow) {
  return row.repeated ? `${row.trackLabel}\n${row.repeatCount}x` : row.trackLabel;
}

function statusColor(row: MeetingReportItemRow) {
  if (row.track === "overdue") return "#b91c1c";
  if (row.track === "in_progress") return "#0f766e";
  if (row.track === "done") return "#15803d";
  return MUTED;
}

function labelCell(text: string): Cell {
  return { text, bold: true, fill: LABEL_FILL, color: "#334155" };
}

function meetingInfoRows(note: MeetingReportNoteRow): Cell[][] {
  const rows: Cell[][] = [
    [
      labelCell("Tanggal"),
      { text: note.meetingDateLabel },
      labelCell("Waktu"),
      { text: note.meetingTime || "-" },
      labelCell("Departemen"),
      { text: note.departmentLabel },
      labelCell("Dicatat"),
      { text: note.createdByName || "-" },
    ],
  ];
  if (note.attendees) {
    rows.push([labelCell("Peserta"), { text: note.attendees }]);
  }
  if (note.externalAttendees) {
    rows.push([labelCell("Pihak luar"), { text: note.externalAttendees }]);
  }
  if (note.summary) {
    rows.push([labelCell("Ringkasan"), { text: note.summary }]);
  }
  return rows;
}

function infoColumns(total: number, spanValue: boolean): Col[] {
  if (spanValue) {
    return [
      { label: "", width: 58 },
      { label: "", width: total - 58 },
    ];
  }
  const labels = [58, 46, 72, 52];
  const flex = total - labels.reduce((sum, width) => sum + width, 0);
  const first = Math.floor(flex * 0.2);
  const second = Math.floor(flex * 0.14);
  const third = Math.floor(flex * 0.3);
  const fourth = flex - first - second - third;
  return [
    { label: "", width: 58 },
    { label: "", width: first },
    { label: "", width: 46 },
    { label: "", width: second },
    { label: "", width: 72 },
    { label: "", width: third },
    { label: "", width: 52 },
    { label: "", width: fourth },
  ];
}

function itemCells(row: MeetingReportItemRow, index: number, fill?: string): Cell[] {
  const base = fill ? { fill } : {};
  return [
    { text: String(index + 1), align: "center", ...base },
    { text: row.topic, bold: true, ...base },
    { text: row.problemDetail || "-", ...base },
    { text: row.detail || "-", ...base },
    { text: row.departmentLabel, ...base },
    { text: row.ownerName, ...base },
    { text: row.startDateLabel, align: "center", ...base },
    { text: row.dueDateLabel, align: "center", ...base },
    { text: statusText(row), align: "center", color: statusColor(row), bold: true, ...base },
  ];
}

export async function buildMeetingReportPdf(input: {
  report: MeetingReport;
  companyName: string;
  generatedAt: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    bufferPages: true,
    info: {
      Title: "Laporan Meeting dan Notulen",
      Author: input.companyName || "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);
  const report = input.report;
  const width = contentWidth(doc);
  const left = doc.page.margins.left;

  doc.fontSize(8).fillColor(MUTED).text(input.companyName || "SJS", left, doc.page.margins.top);
  doc.moveDown(0.15);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text("Laporan Meeting & Notulen");
  doc.moveDown(0.45);

  const metaColumns: Col[] = [
    { label: "", width: 70 },
    { label: "", width: (width - 140) / 2 },
    { label: "", width: 70 },
    { label: "", width: width - 140 - (width - 140) / 2 },
  ];
  let y = doc.y;
  y = drawGrid(
    doc,
    metaColumns,
    [
      [
        labelCell("Periode"),
        { text: report.periodLabel },
        labelCell("Departemen"),
        { text: report.departmentLabel },
      ],
      [
        labelCell("Status"),
        { text: report.statusLabel },
        labelCell("Dicetak"),
        { text: input.generatedAt },
      ],
    ],
    y,
    { header: false },
  );

  const statWidth = width / 6;
  const statColumns: Col[] = [
    "Notulen",
    "Bahasan",
    "On progress",
    "Overdue",
    "Selesai",
    "Diulang",
  ].map((label, index) => ({
    label,
    width: index === 5 ? width - statWidth * 5 : statWidth,
    align: "center" as const,
  }));
  y = drawGrid(
    doc,
    statColumns,
    [
      [
        { text: String(report.stats.notes), align: "center", bold: true },
        { text: String(report.stats.items), align: "center", bold: true },
        { text: String(report.stats.progress), align: "center", bold: true, color: "#0f766e" },
        { text: String(report.stats.overdue), align: "center", bold: true, color: "#b91c1c" },
        { text: String(report.stats.done), align: "center", bold: true, color: "#15803d" },
        { text: String(report.stats.repeated), align: "center", bold: true },
      ],
    ],
    y + 8,
  );
  y = doc.y + 12;

  if (report.notes.length === 0) {
    doc.fontSize(10).fillColor(MUTED).text("Tidak ada notulen pada filter ini.", left, y);
  }

  const itemColumns = bahasanColumns(width);
  report.notes.forEach((note, noteIndex) => {
    if (y + 70 > pageBottom(doc)) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    y = drawBanner(doc, `${noteIndex + 1}. ${note.title}`, y);
    y = drawGrid(doc, infoColumns(width, false), [meetingInfoRows(note)[0]], y, {
      header: false,
    });
    for (const row of meetingInfoRows(note).slice(1)) {
      y = drawGrid(doc, infoColumns(width, true), [row], y, { header: false });
    }

    const rows = report.items.filter((item) => item.meetingId === note.id);
    if (rows.length === 0) {
      y = drawGrid(
        doc,
        [{ label: "", width }],
        [[{ text: "Tidak ada bahasan pada filter ini.", color: MUTED }]],
        y,
        { header: false },
      );
    } else {
      y = drawGrid(
        doc,
        itemColumns,
        rows.map((row, index) =>
          itemCells(row, index, index % 2 === 1 ? BAND_FILL : "#ffffff"),
        ),
        y,
        { repeatTitle: `${note.title} (lanjutan)` },
      );
    }
    y += 12;
    doc.y = y;
  });

  const count = doc.bufferedPageRange().count;
  for (let i = 0; i < count; i += 1) {
    doc.switchToPage(i);
    const previousBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(`${i + 1} / ${count}`, left, doc.page.height - 18, {
        width,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = previousBottom;
  }

  doc.end();
  return done;
}
