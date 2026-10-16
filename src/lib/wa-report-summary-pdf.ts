import PDFDocument from "pdfkit";

function collectBuffers(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export type WaReportKind = "month" | "daily" | "detail";

type Align = "left" | "center";

type PdfColumn = {
  label: string;
  width: number;
  align?: Align;
};

type PdfStats = {
  totalReports: number;
  totalWithPhoto: number;
  totalPhotos: number;
  uniqueUsers: number;
  uniqueDays: number;
};

export type WaPdfMonthUser = {
  userName: string;
  username: string;
  department: string;
  months: Array<{ period: string; count: number }>;
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
};

export type WaPdfDateUser = {
  userName: string;
  username: string;
  department: string;
  byDate: Record<string, { count: number } | undefined>;
  totalCount: number;
  totalPhotos: number;
  totalDays: number;
};

export type WaPdfDetailRow = {
  date: string;
  userName: string;
  username: string;
  department: string;
  count: number;
  photoCount: number;
  leaderNames: string;
  titles: string;
};

const KIND_TITLE: Record<WaReportKind, string> = {
  month: "Laporan Bukti WhatsApp — Ringkasan per Bulan",
  daily: "Laporan Bukti WhatsApp — Ringkasan per Tanggal",
  detail: "Laporan Bukti WhatsApp — Detail per Hari",
};

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: PdfColumn[],
  rows: Array<Array<string | number>>,
  runningTitle: string,
) {
  const left = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  const header = (y: number) => {
    doc.save();
    doc.rect(left, y - 3, tableWidth, 16).fill("#f1f5f9");
    doc.fillColor("#475569").fontSize(7);
    let x = left;
    for (const col of columns) {
      doc.text(col.label, x + 2, y, {
        width: col.width - 4,
        align: col.align || "left",
        lineBreak: false,
      });
      x += col.width;
    }
    doc.restore();
    return y + 16;
  };

  let y = header(doc.y);
  rows.forEach((row, index) => {
    if (y + 14 > bottom()) {
      doc.addPage();
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(runningTitle, doc.page.margins.left, doc.page.margins.top, {
          lineBreak: false,
        });
      y = header(doc.page.margins.top + 16);
    }
    if (index % 2 === 1) {
      doc.save();
      doc.rect(left, y - 2, tableWidth, 14).fill("#f8fafc");
      doc.restore();
    }
    doc.fillColor("#0f172a").fontSize(8);
    let x = left;
    row.forEach((cell, i) => {
      const col = columns[i];
      doc.text(String(cell), x + 2, y, {
        width: col.width - 4,
        align: col.align || "left",
        lineBreak: false,
      });
      x += col.width;
    });
    y += 14;
  });
  doc.y = y + 6;
}

function drawIntro(
  doc: PDFKit.PDFDocument,
  input: {
    companyName: string;
    title: string;
    parameters: Array<{ label: string; value: string }>;
    generatedAt: string;
    stats: PdfStats;
  },
) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.fontSize(9).fillColor("#64748b").text(input.companyName || "SJS");
  doc.moveDown(0.15);
  doc.fontSize(16).fillColor("#0f172a").text(input.title);
  doc.moveDown(0.35);
  doc.fontSize(10).fillColor("#334155");
  for (const item of input.parameters) {
    doc.text(`${item.label}: ${item.value}`);
  }
  doc.fillColor("#475569").text(`Dicetak: ${input.generatedAt}`);
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .text(
      `Total laporan ${input.stats.totalReports} · bukti foto ${input.stats.totalWithPhoto} · foto ${input.stats.totalPhotos} · user ${input.stats.uniqueUsers} · hari aktif ${input.stats.uniqueDays}`,
    );
  doc
    .moveTo(left, doc.y + 6)
    .lineTo(right, doc.y + 6)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.moveDown(0.8);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function shortDay(iso: string) {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? String(day) : iso;
}

function shortMonth(ym: string) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  const month = new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
  });
  return `${month} ${String(y).slice(2)}`;
}

export async function buildWaReportSummaryPdf(input: {
  kind: WaReportKind;
  companyName: string;
  parameters: Array<{ label: string; value: string }>;
  generatedAt: string;
  stats: PdfStats;
  months: string[];
  monthlySummary: WaPdfMonthUser[];
  dates: string[];
  dailySummary: WaPdfDateUser[];
  rows: WaPdfDetailRow[];
}): Promise<Buffer> {
  const landscape = input.kind !== "detail";
  const doc = new PDFDocument({
    size: "A4",
    layout: landscape ? "landscape" : "portrait",
    margin: 28,
    info: {
      Title: KIND_TITLE[input.kind],
      Author: input.companyName || "SJS IT Systems",
    },
  });
  const done = collectBuffers(doc);
  const title = KIND_TITLE[input.kind];
  const runningTitle = [title, ...input.parameters.map((item) => `${item.label}: ${item.value}`)].join(" · ");

  drawIntro(doc, {
    companyName: input.companyName,
    title,
    parameters: input.parameters,
    generatedAt: input.generatedAt,
    stats: input.stats,
  });

  if (input.kind === "month") {
    drawMonthTables(doc, input.months, input.monthlySummary, runningTitle);
  } else if (input.kind === "daily") {
    drawDailyTables(doc, input.dates, input.dailySummary, runningTitle);
  } else {
    drawDetailTable(doc, input.rows, runningTitle);
  }

  doc.end();
  return done;
}

function drawMonthTables(
  doc: PDFKit.PDFDocument,
  months: string[],
  users: WaPdfMonthUser[],
  runningTitle: string,
) {
  if (users.length === 0) {
    doc.fontSize(10).fillColor("#64748b").text("Tidak ada data pada periode ini.");
    return;
  }
  const width = contentWidth(doc);
  const nameW = 108;
  const deptW = 78;
  const tail = 34;
  const monthW = 46;
  const perPage = Math.max(
    1,
    Math.floor((width - nameW - deptW - tail * 3) / monthW),
  );

  for (const group of chunk(months, perPage)) {
    const columns: PdfColumn[] = [
      { label: "Nama", width: nameW },
      { label: "Dept", width: deptW },
      ...group.map((period) => ({
        label: shortMonth(period),
        width: monthW,
        align: "center" as const,
      })),
      { label: "Total", width: tail, align: "center" as const },
      { label: "Foto", width: tail, align: "center" as const },
      { label: "Hari", width: tail, align: "center" as const },
    ];
    const rows = users.map((user) => [
      user.username ? `${user.userName} (@${user.username})` : user.userName,
      user.department,
      ...group.map((period) => {
        const cell = user.months.find((item) => item.period === period);
        return cell?.count || 0;
      }),
      user.totalCount,
      user.totalPhotos,
      user.totalDays,
    ]);
    const totals = group.map((period) =>
      users.reduce((sum, user) => {
        const cell = user.months.find((item) => item.period === period);
        return sum + (cell?.count || 0);
      }, 0),
    );
    rows.push([
      "Total",
      "",
      ...totals,
      users.reduce((sum, user) => sum + user.totalCount, 0),
      users.reduce((sum, user) => sum + user.totalPhotos, 0),
      "",
    ]);
    drawTable(doc, columns, rows, runningTitle);
  }
}

function drawDailyTables(
  doc: PDFKit.PDFDocument,
  dates: string[],
  users: WaPdfDateUser[],
  runningTitle: string,
) {
  if (users.length === 0) {
    doc.fontSize(10).fillColor("#64748b").text("Tidak ada data pada rentang tanggal ini.");
    return;
  }
  const width = contentWidth(doc);
  const nameW = 100;
  const deptW = 70;
  const tail = 32;
  const dateW = 18;
  const perPage = Math.max(
    1,
    Math.floor((width - nameW - deptW - tail * 3) / dateW),
  );

  for (const group of chunk(dates, perPage)) {
    const columns: PdfColumn[] = [
      { label: "Nama", width: nameW },
      { label: "Dept", width: deptW },
      ...group.map((date) => ({
        label: shortDay(date),
        width: dateW,
        align: "center" as const,
      })),
      { label: "Total", width: tail, align: "center" as const },
      { label: "Foto", width: tail, align: "center" as const },
      { label: "Hari", width: tail, align: "center" as const },
    ];
    const rows = users.map((user) => [
      user.username ? `${user.userName}` : user.userName,
      user.department,
      ...group.map((date) => user.byDate[date]?.count || 0),
      user.totalCount,
      user.totalPhotos,
      user.totalDays,
    ]);
    rows.push([
      "Total",
      "",
      ...group.map((date) =>
        users.reduce((sum, user) => sum + (user.byDate[date]?.count || 0), 0),
      ),
      users.reduce((sum, user) => sum + user.totalCount, 0),
      users.reduce((sum, user) => sum + user.totalPhotos, 0),
      "",
    ]);
    drawTable(doc, columns, rows, runningTitle);
  }
}

function drawDetailTable(
  doc: PDFKit.PDFDocument,
  rows: WaPdfDetailRow[],
  runningTitle: string,
) {
  if (rows.length === 0) {
    doc.fontSize(10).fillColor("#64748b").text("Tidak ada data pada periode ini.");
    return;
  }
  const columns: PdfColumn[] = [
    { label: "Tanggal", width: 68 },
    { label: "Nama", width: 100 },
    { label: "Dept", width: 78 },
    { label: "Laporan", width: 46, align: "center" },
    { label: "Foto", width: 36, align: "center" },
    { label: "Pimpinan", width: 90 },
    { label: "Perihal", width: contentWidth(doc) - 418 },
  ];
  drawTable(
    doc,
    columns,
    rows.map((row) => [
      row.date,
      row.userName,
      row.department,
      row.count,
      row.photoCount,
      row.leaderNames || "-",
      row.titles.length > 80 ? `${row.titles.slice(0, 77)}...` : row.titles || "-",
    ]),
    runningTitle,
  );
}
