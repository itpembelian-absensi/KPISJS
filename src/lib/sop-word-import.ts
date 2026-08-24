import { getDb } from "./db";
import { splitOriginalDocx } from "./sop-docx-split";
import {
  appendSopAttachments,
  getSop,
  listSops,
  replaceSopAttachment,
  upsertSop,
} from "./sop-ops";
import { deleteSopFileUrls, writeSopDiskFile } from "./sop-files";
import { convertDocxToPdf } from "./docx-to-pdf";
import { attachConvertedPdf } from "./sop-ensure-pdf";
import {
  defaultSopDispositions,
  sopDivisionLabelFromDepartment,
  type SopDisposition,
  type SopDocument,
  type SopStep,
} from "./types";
import { zipReadFile } from "./zip-read";

export type ParsedSopDraft = {
  code: string;
  title: string;
  divisionLabel: string;
  documentType: string;
  effectiveDate: string;
  revision: string;
  revisionDate: string;
  purpose: string;
  materials: string;
  qualifications: string;
  notes: string;
  steps: SopStep[];
  dispositions: SopDisposition[];
};

const CODE_RE =
  /\b([A-Za-z][A-Za-z0-9]{1,10}-SOP\/\d{4}\/\d{2,4}|[A-Za-z][A-Za-z0-9]{1,10}-SOP-\d{2,4})\b/gi;

const BODY_HINT =
  /STANDARD\s+OPERATING\s+PROCEDURE|A\.\s*TUJUAN|1\.\s*Tujuan|PROSEDUR\s+PELAKSANAAN|NOMOR\s+DOCUMENT|MULAI\s+BERLAKU|Ruang\s+Lingkup/i;

function recoverBrokenCodes(text: string): string {
  return text
    .replace(
      /([A-Za-z]{2,8})\s*[-–]\s*SOP\s*[/\n\t]+\s*(\d{4})\s*[/\n\t]+\s*(\d{2,4})/gi,
      "$1-SOP/$2/$3",
    )
    .replace(
      /([A-Za-z]{2,8}-SOP)\s*[/\n\t]+\s*(\d{4})\s*[/\n\t]+\s*(\d{2,4})/gi,
      "$1/$2/$3",
    )
    .replace(/([A-Za-z]{2,8}-SOP\/)\s+(\d{4}\/\d{2,4})/gi, "$1$2");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function docxXmlToText(xml: string): string {
  let s = xml.replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/gi, "");
  s = s.replace(/<w:tab\b[^/]*\/>/g, "\t");
  s = s.replace(/<w:lastRenderedPageBreak\b[^/]*\/>/g, "\n");
  s = s.replace(/<w:br\b[^>]*w:type="page"[^/]*\/>/g, "\n");
  s = s.replace(/<w:br\b[^/]*\/>/g, "\n");
  s = s.replace(/<\/w:p>/g, "\n");
  s = s.replace(/<\/w:tr>/g, "\n");
  s = s.replace(/<\/w:tc>/g, "\t");
  s = s.replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/g, "$1");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeXmlEntities(s);
  s = s.replace(/\r/g, "");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function preserveCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

/** Ambil nomor dokumen apa adanya dari isi Word (Kode / NOMOR DOCUMENT). */
function extractCodeFromChunk(chunk: string, fallback: string): string {
  const labeled = chunk.match(
    /(?:Kode|NOMOR\s*DOCUMENT|Nomor\s*(?:Dokumen|Document))\s*[:.]?\s*([^\n\t]{3,60})/i,
  );
  if (labeled) {
    const raw = labeled[1].replace(/\s+/g, " ").trim();
    const cut = raw.split(/\s{2,}|Berlaku|Revisi|STANDARD/i)[0]?.trim() ?? raw;
    if (cut.length >= 3 && cut.length <= 50) return preserveCode(cut);
  }
  return preserveCode(fallback);
}

function collapseWs(s: string): string {
  return s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function metaValue(chunk: string, label: RegExp): string {
  const m = chunk.match(label);
  if (!m) return "";
  return collapseWs(m[1] || "").slice(0, 120);
}

function extractBetween(
  text: string,
  start: RegExp,
  ends: RegExp[],
): string {
  const flags = start.flags.includes("i") ? "i" : "";
  const sm = new RegExp(start.source, flags).exec(text);
  if (!sm || sm.index == null) return "";
  const from = sm.index + sm[0].length;
  let to = text.length;
  const rest = text.slice(from);
  for (const end of ends) {
    const em = new RegExp(end.source, end.flags.replace("g", "")).exec(rest);
    if (em && em.index != null && em.index < to - from) {
      to = from + em.index;
    }
  }
  return collapseWs(text.slice(from, to)).slice(0, 8000);
}

const NEXT_SECTION = [
  /\n\s*B\.\s*BAHAN/i,
  /\n\s*C\.\s*KUALIFIKASI/i,
  /\n\s*D\.\s*PROSEDUR/i,
  /\n\s*E\.\s*NOTE/i,
  /\n\s*E\.\s*CATATAN/i,
  /\n\s*2\.\s*Ruang\s+Lingkup/i,
  /\n\s*2\.\s*Bahan/i,
  /\n\s*3\.\s*Kualifikasi/i,
  /\n\s*3\.\s*Peran/i,
  /\n\s*4\.\s*Prosedur/i,
  /\n\s*\d+\.\s*Prosedur/i,
  /\n\s*\d+\.\s*Kontrol/i,
  /\n\s*\d+\.\s*KPI/i,
  /\n\s*\d+\.\s*Dokumen/i,
  /\n\s*\d+\.\s*Catatan/i,
  /\n\s*Pengesahan\s+SOP/i,
];

function parseSteps(prosedur: string): SopStep[] {
  const lines = prosedur
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !/^No\.?\s*(PIC|Jabatan|Aktivitas)/i.test(l) &&
        !/^PIC\s*\/\s*Jabatan/i.test(l),
    );

  const steps: SopStep[] = [];
  const used = new Set<number>();

  for (const line of lines) {
    const cells = line.split(/\t/).map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3 && /^\d{1,2}$/.test(cells[0])) {
      const order = Number(cells[0]);
      if (used.has(order)) continue;
      used.add(order);
      steps.push({
        order,
        title: cells[1].slice(0, 140),
        body: cells.slice(2).join(" — ").slice(0, 2000),
      });
      continue;
    }
    const numbered = line.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (numbered) {
      const order = Number(numbered[1]);
      if (used.has(order)) continue;
      used.add(order);
      const rest = numbered[2].trim();
      const cut = rest.split(/\s[—–-]\s/);
      steps.push({
        order,
        title: (cut[0] || `Langkah ${order}`).slice(0, 140),
        body: (cut.length > 1 ? cut.slice(1).join(" — ") : rest).slice(0, 2000),
      });
    }
  }

  if (steps.length === 0) {
    const compact = collapseWs(prosedur);
    if (compact.length > 40) {
      steps.push({
        order: 1,
        title: "Prosedur pelaksanaan",
        body: compact.slice(0, 4000),
      });
    }
  }

  return steps
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i + 1 }))
    .slice(0, 20);
}

function extractTitle(chunk: string, code: string): string {
  const afterSop = chunk.match(
    /STANDARD\s+OPERATING\s+PROCEDURE[^\n]*\n+([^\n]{8,180})/i,
  );
  if (afterSop) {
    let t = collapseWs(afterSop[1]);
    t = t.replace(/^(Revisi|Berlaku|Nomor|Kode)[:.].*$/i, "").trim();
    if (
      t &&
      !/Kerahasiaan|Halaman|PT\s+SAHABAT/i.test(t) &&
      !/[A-Za-z]{2,8}-SOP\/\d{4}\/\d{2,4}/i.test(t)
    ) {
      return t.slice(0, 180);
    }
  }

  const afterCode = chunk.match(
    new RegExp(
      `${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]*\\n+([^\\n]{8,180})`,
      "i",
    ),
  );
  if (afterCode) {
    const t = collapseWs(afterCode[1]);
    if (
      t &&
      !/STANDARD|NOMOR|MULAI|REVISI|Kode:|Berlaku/i.test(t)
    ) {
      return t.slice(0, 180);
    }
  }

  return `SOP ${code}`;
}

function parseChunk(
  chunk: string,
  code: string,
  deptName: string,
): ParsedSopDraft {
  const purpose =
    extractBetween(chunk, /(?:A\.\s*TUJUAN|1\.\s*Tujuan)\b/i, NEXT_SECTION) ||
    extractBetween(chunk, /Tujuan\s*\n/i, NEXT_SECTION);

  const materials =
    extractBetween(
      chunk,
      /(?:B\.\s*BAHAN(?:\s+DAN\s+PERALATAN)?|2\.\s*Ruang\s+Lingkup|2\.\s*Bahan)\b/i,
      NEXT_SECTION,
    ) ||
    extractBetween(
      chunk,
      /\d+\.\s*Peran dan Tanggung Jawab/i,
      NEXT_SECTION,
    );

  const qualifications =
    extractBetween(
      chunk,
      /(?:C\.\s*KUALIFIKASI(?:\s+PERSONEL)?|3\.\s*Kualifikasi|\d+\.\s*Kualifikasi Personel)\b/i,
      NEXT_SECTION,
    ) ||
    extractBetween(
      chunk,
      /\d+\.\s*Peran dan Tanggung Jawab/i,
      NEXT_SECTION,
    );

  const prosedur =
    extractBetween(
      chunk,
      /(?:D\.\s*PROSEDUR(?:\s+PELAKSANAAN)?|\d+\.\s*Prosedur(?:\s+Pelaksanaan)?)\b/i,
      [
        /\n\s*E\.\s*NOTE/i,
        /\n\s*E\.\s*CATATAN/i,
        /\n\s*\d+\.\s*KPI/i,
        /\n\s*\d+\.\s*Dokumen/i,
        /\n\s*\d+\.\s*Catatan/i,
        /\n\s*Pengesahan\s+SOP/i,
      ],
    );

  const kontrol = extractBetween(
    chunk,
    /\d+\.\s*Kontrol Kritis/i,
    [/\n\s*\d+\.\s*Prosedur/i, /\n\s*\d+\.\s*KPI/i, /\n\s*Pengesahan/i],
  );
  const kpi = extractBetween(
    chunk,
    /\d+\.\s*KPI\s*\/?\s*SLA/i,
    [/\n\s*\d+\.\s*Dokumen/i, /\n\s*\d+\.\s*Catatan/i, /\n\s*Pengesahan/i],
  );
  const catatan = extractBetween(
    chunk,
    /(?:E\.\s*(?:NOTE|CATATAN)|\d+\.\s*Catatan)\b/i,
    [/\n\s*Pengesahan\s+SOP/i, /\n\s*[A-Z]{2,8}-SOP\//],
  );

  const noteParts: string[] = [];
  if (catatan) noteParts.push(catatan);
  if (kontrol) noteParts.push("Kontrol kritis:\n" + kontrol);
  if (kpi) noteParts.push("KPI/SLA:\n" + kpi);

  const effectiveDate =
    metaValue(
      chunk,
      /MULAI\s+BERLAKU\s*[:\t]*\s*([^\n]{4,40})/i,
    ) ||
    metaValue(chunk, /Berlaku\s*:\s*([^\n]{4,40})/i);
  const revision =
    metaValue(chunk, /REVISI\s*[:\t]*\s*([^\n]{1,40})/i) || "-";
  const revisionDate = metaValue(
    chunk,
    /TANGGAL\s+REVISI\s*[:\t]*\s*([^\n]{4,40})/i,
  );

  const steps = parseSteps(prosedur);
  if (steps.length === 0) {
    steps.push({
      order: 1,
      title: "Ikuti prosedur pada dokumen sumber",
      body: "Detail langkah ada pada file Word/PDF lampiran SOP ini.",
    });
  }

  return {
    code,
    title: extractTitle(chunk, code),
    divisionLabel: sopDivisionLabelFromDepartment(deptName),
    documentType: "STANDARD OPERATING PROCEDURE",
    effectiveDate,
    revision: revision || "-",
    revisionDate,
    purpose:
      purpose ||
      `SOP ${extractTitle(chunk, code)} sesuai dokumen master yang diunggah.`,
    materials:
      materials ||
      "Lihat dokumen sumber untuk bahan, peralatan, dan ruang lingkup.",
    qualifications:
      qualifications ||
      `PIC dan pelaksana sesuai ${deptName}.`,
    notes: noteParts.join("\n\n") || "Diimpor dari file Word master SOP.",
    steps,
    dispositions: defaultSopDispositions(deptName),
  };
}

function findSopStarts(
  text: string,
): Array<{ code: string; index: number }> {
  const recovered = recoverBrokenCodes(text);
  const re = new RegExp(CODE_RE.source, "gi");
  const positions: Array<{ code: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(recovered))) {
    positions.push({ code: preserveCode(m[1]), index: m.index });
  }
  if (positions.length === 0) return [];

  const byCode = new Map<string, number[]>();
  for (const p of positions) {
    const key = p.code.toUpperCase();
    const list = byCode.get(key) ?? [];
    list.push(p.index);
    byCode.set(key, list);
  }

  const starts: Array<{ code: string; index: number }> = [];
  for (const [key, idxs] of byCode) {
    const original = positions.find((p) => p.code.toUpperCase() === key)!;
    let chosen = idxs[0];
    const isolated = idxs.filter((idx) => {
      const nearby = positions.filter(
        (p) => p.index !== idx && Math.abs(p.index - idx) < 220,
      );
      return nearby.length < 3;
    });
    const withHint = (isolated.length ? isolated : idxs).filter((idx) =>
      BODY_HINT.test(recovered.slice(idx, idx + 2200)),
    );
    if (withHint.length) {
      chosen = withHint[withHint.length > 1 ? withHint.length - 1 : 0];
    } else if (isolated.length > 1) {
      chosen = isolated[isolated.length - 1];
    } else if (idxs.length > 1) {
      chosen = idxs[idxs.length - 1];
    }
    starts.push({ code: original.code, index: chosen });
  }
  starts.sort((a, b) => a.index - b.index);
  const minGap = 180;
  const deduped: Array<{ code: string; index: number }> = [];
  for (const s of starts) {
    const prev = deduped[deduped.length - 1];
    if (prev && s.index - prev.index < minGap) continue;
    deduped.push(s);
  }
  return deduped;
}

function splitByHeading(text: string): string[] {
  const recovered = recoverBrokenCodes(text);
  const parts = recovered.split(
    /(?=STANDARD\s+OPERATING\s+PROCE?DURE|STANDAR\s+OPERATING\s+PROCEDURE|PROSEDUR\s+OPERASI\s+STANDAR)/i,
  );
  return parts.map((p) => p.trim()).filter((p) => p.length > 180);
}

function splitByKodeLine(text: string): string[] {
  const recovered = recoverBrokenCodes(text);
  const parts = recovered.split(
    /(?=(?:^|\n)\s*(?:Kode|NOMOR\s*DOCUMENT|Nomor\s*(?:Dokumen|Document))\s*[:.])/i,
  );
  return parts.map((p) => p.trim()).filter((p) => p.length > 180);
}

function isWeakChunk(chunk: string): boolean {
  const codes = chunk.match(new RegExp(CODE_RE.source, "gi")) ?? [];
  const unique = new Set(codes.map((c) => c.toUpperCase()));
  if (
    unique.size >= 5 &&
    !/1\.\s*Tujuan|A\.\s*TUJUAN|PROSEDUR/i.test(chunk) &&
    chunk.length < 8000
  ) {
    return true;
  }
  return chunk.trim().length < 80;
}

function draftsFromChunks(
  chunks: string[],
  deptName: string,
  deptCode: string,
): ParsedSopDraft[] {
  const drafts: ParsedSopDraft[] = [];
  const used = new Set<string>();
  for (const chunk of chunks) {
    if (isWeakChunk(chunk)) continue;
    const fallbackMatch = new RegExp(CODE_RE.source, "i").exec(chunk);
    const fallback = fallbackMatch
      ? preserveCode(fallbackMatch[1])
      : `${deptCode.toUpperCase()}-SOP/${new Date().getFullYear()}/${String(drafts.length + 1).padStart(3, "0")}`;
    const code = extractCodeFromChunk(chunk, fallback);
    const key = code.toUpperCase();
    if (used.has(key)) continue;
    used.add(key);
    drafts.push(parseChunk(chunk, code, deptName));
  }
  return drafts;
}

function parseHeaderRels(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = relsXml.match(/<Relationship\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!/relationships\/header/i.test(tag)) continue;
    const id = tag.match(/\bId="([^"]+)"/i)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/i)?.[1];
    if (!id || !target) continue;
    const file = target.replace(/^\//, "").replace(/\\/g, "/");
    map.set(id, file.startsWith("word/") ? file : `word/${file.replace(/^word\//, "")}`);
  }
  return map;
}

function headerIdsFromSectPr(sectPr: string): string[] {
  const ids: string[] = [];
  const tags = sectPr.match(/<w:headerReference\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const id = tag.match(/\br:id="([^"]+)"/i)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

function splitBodySections(docXml: string): Array<{ xml: string; sectPr: string }> {
  const body = docXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/i)?.[1] ?? docXml;
  const sections: Array<{ xml: string; sectPr: string }> = [];
  const re = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    sections.push({ xml: body.slice(last, m.index), sectPr: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    const rest = body.slice(last);
    if (rest.replace(/<[^>]+>/g, "").trim()) {
      sections.push({ xml: rest, sectPr: "" });
    }
  }
  return sections;
}

function extractDocxSopChunks(buf: Buffer): string[] {
  const docXml = zipReadFile(buf, "word/document.xml")?.toString("utf8");
  if (!docXml) return [];
  const relsXml =
    zipReadFile(buf, "word/_rels/document.xml.rels")?.toString("utf8") ?? "";
  const headerRels = parseHeaderRels(relsXml);
  const headerCache = new Map<string, string>();
  const headerText = (relId: string) => {
    const file = headerRels.get(relId);
    if (!file) return "";
    if (!headerCache.has(file)) {
      const xml = zipReadFile(buf, file)?.toString("utf8") ?? "";
      headerCache.set(file, xml ? docxXmlToText(xml) : "");
    }
    return headerCache.get(file) ?? "";
  };

  const sections = splitBodySections(docXml);
  const sectionTexts: string[] = [];
  for (const sec of sections) {
    const heads = headerIdsFromSectPr(sec.sectPr)
      .map(headerText)
      .filter(Boolean)
      .join("\n");
    const body = docxXmlToText(sec.xml);
    const combined = [heads, body].filter(Boolean).join("\n");
    if (combined.trim().length > 40) sectionTexts.push(recoverBrokenCodes(combined));
  }

  if (sectionTexts.length <= 1) {
    const full = recoverBrokenCodes(
      sectionTexts[0] || docxXmlToText(docXml),
    );
    return full.trim() ? [full] : [];
  }
  return sectionTexts;
}

export function parseSopWordText(
  text: string,
  deptName: string,
  deptCode: string,
): ParsedSopDraft[] {
  const recovered = recoverBrokenCodes(text);
  const candidates: ParsedSopDraft[][] = [];

  const starts = findSopStarts(recovered);
  if (starts.length >= 2) {
    const chunks: string[] = [];
    for (let i = 0; i < starts.length; i++) {
      const from = starts[i].index;
      const to = i + 1 < starts.length ? starts[i + 1].index : recovered.length;
      chunks.push(recovered.slice(from, to));
    }
    candidates.push(draftsFromChunks(chunks, deptName, deptCode));
  }

  const byHeading = splitByHeading(recovered);
  if (byHeading.length >= 2) {
    candidates.push(draftsFromChunks(byHeading, deptName, deptCode));
  }

  const byKode = splitByKodeLine(recovered);
  if (byKode.length >= 2) {
    candidates.push(draftsFromChunks(byKode, deptName, deptCode));
  }

  candidates.sort((a, b) => b.length - a.length);
  if (candidates[0] && candidates[0].length >= 2) return candidates[0];

  if (starts.length === 1) {
    return draftsFromChunks(
      [
        recovered.slice(starts[0].index),
      ],
      deptName,
      deptCode,
    );
  }

  CODE_RE.lastIndex = 0;
  const any = CODE_RE.exec(recovered);
  CODE_RE.lastIndex = 0;
  const code = any
    ? preserveCode(any[1])
    : `${deptCode.toUpperCase()}-SOP/${new Date().getFullYear()}/001`;
  const draft = parseChunk(
    recovered,
    extractCodeFromChunk(recovered, code),
    deptName,
  );
  if (
    draft.purpose.length < 20 &&
    draft.steps.every((s) => s.body.length < 40) &&
    recovered.length < 80
  ) {
    return [];
  }
  return [draft];
}

function parseDocxToDrafts(
  buf: Buffer,
  deptName: string,
  deptCode: string,
): ParsedSopDraft[] {
  const chunks = extractDocxSopChunks(buf);
  const fromSections = draftsFromChunks(chunks, deptName, deptCode);
  if (fromSections.length >= 2) return fromSections;

  const merged = chunks.join("\n\n");
  const fromText = parseSopWordText(merged, deptName, deptCode);
  if (fromText.length >= fromSections.length) return fromText;
  return fromSections;
}

function getDepartmentRow(id: string) {
  return getDb()
    .prepare("SELECT id, code, name FROM departments WHERE id = ?")
    .get(id) as { id: string; code: string; name: string } | undefined;
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isDocxAttachment(att: { url: string; originalName?: string; label?: string; mimeType?: string }) {
  const name = `${att.originalName || ""} ${att.label || ""} ${att.url}`.toLowerCase();
  return (
    att.mimeType === DOCX_MIME ||
    name.includes(".docx") ||
    att.url.toLowerCase().endsWith(".docx")
  );
}

function attachOriginalDocx(
  sopId: string,
  buffer: Buffer,
  originalName: string,
) {
  const att = writeSopDiskFile(sopId, buffer, originalName, DOCX_MIME, ".docx");
  const existing = getSop(sopId);
  const old = existing?.attachments.find((a) => isDocxAttachment(a));
  if (old) {
    const result = replaceSopAttachment(sopId, old.url, [att]);
    deleteSopFileUrls([old.url]);
    return result;
  }
  return appendSopAttachments(sopId, [att]);
}

function isPdfAttachment(att: {
  url: string;
  originalName?: string;
  label?: string;
  mimeType?: string;
}) {
  const name = `${att.originalName || ""} ${att.label || ""} ${att.url}`.toLowerCase();
  return (
    att.mimeType === "application/pdf" ||
    name.includes(".pdf") ||
    att.url.toLowerCase().endsWith(".pdf")
  );
}

/** Hapus PDF template hasil impor lama agar tombol PDF tidak membuka file palsu. */
function stripGeneratedPdfAttachments(sopId: string) {
  const sop = getSop(sopId);
  if (!sop) return;
  const pdfs = sop.attachments.filter((a) => isPdfAttachment(a));
  if (pdfs.length === 0) return;
  const next = sop.attachments.filter((a) => !isPdfAttachment(a));
  getDb()
    .prepare(`UPDATE sops SET attachments_json = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(next), new Date().toISOString(), sopId);
  deleteSopFileUrls(pdfs.map((p) => p.url));
}

async function attachPdfFromDocx(
  sopId: string,
  docx: Buffer,
  pdfName: string,
  warnings: string[],
  code: string,
  current: SopDocument,
): Promise<SopDocument> {
  try {
    const pdf = await convertDocxToPdf(docx);
    const next = attachConvertedPdf(sopId, pdf, pdfName);
    if ("error" in next) {
      warnings.push(`${code}: Word asli tersimpan, PDF gagal (${next.error})`);
      return current;
    }
    return next;
  } catch (err) {
    warnings.push(
      `${code}: Word asli tersimpan, PDF gagal dikonversi (${err instanceof Error ? err.message : "error"})`,
    );
    return current;
  }
}

export async function importSopsFromWord(input: {
  buffer: Buffer;
  filename: string;
  departmentId: string;
  createdBy: string;
  preview?: boolean;
}): Promise<
  | { error: string }
  | {
      preview: true;
      drafts: ParsedSopDraft[];
      warnings: string[];
    }
  | {
      preview: false;
      created: number;
      updated: number;
      sops: SopDocument[];
      warnings: string[];
    }
> {
  const dept = getDepartmentRow(input.departmentId);
  if (!dept) return { error: "Departemen tidak ditemukan" };

  const xmlBuf = zipReadFile(input.buffer, "word/document.xml");
  if (!xmlBuf) {
    return {
      error:
        "File bukan Word .docx yang valid. Simpan ulang sebagai .docx (bukan .doc lama).",
    };
  }

  const drafts = parseDocxToDrafts(input.buffer, dept.name, dept.code);
  if (drafts.length === 0) {
    return {
      error:
        "Tidak ada SOP terdeteksi. Pastikan file berisi nomor dokumen (Kode / NOMOR DOCUMENT) dan bagian Tujuan / Prosedur.",
    };
  }

  const warnings: string[] = [];
  if (drafts.length === 1) {
    warnings.push(
      "Hanya 1 SOP terdeteksi. Jika file master berisi banyak SOP, pastikan tiap dokumen punya nomor sendiri (Kode / NOMOR DOCUMENT) atau judul STANDARD OPERATING PROCEDURE.",
    );
  }

  if (input.preview) {
    return { preview: true, drafts, warnings };
  }

  const existingByCode = new Map(
    listSops().map((s) => [s.code.toLowerCase(), s]),
  );
  let created = 0;
  let updated = 0;
  const saved: SopDocument[] = [];
  const year = new Date().getFullYear();
  const masterCode = `${dept.code.toUpperCase()}-SOP/${year}/MASTER`;
  const originals = splitOriginalDocx(input.buffer, drafts.length);
  if (
    drafts.length > 1 &&
    originals.some((b) => b.length === input.buffer.length)
  ) {
    warnings.push(
      "Sebagian pecahan Word memakai file master utuh. Unduh Word per SOP lalu periksa apakah isinya sudah terpisah.",
    );
  }

  for (const [i, draft] of drafts.entries()) {
    const existing = existingByCode.get(draft.code.toLowerCase());
    if (existing && existing.departmentId !== dept.id) {
      warnings.push(
        `${draft.code}: nomor sudah dipakai ${existing.departmentName}, dilewati agar tidak menimpa.`,
      );
      continue;
    }
    const result = upsertSop({
      id: existing?.id,
      departmentId: dept.id,
      code: draft.code,
      title: draft.title,
      divisionLabel: draft.divisionLabel,
      documentType: draft.documentType,
      effectiveDate: draft.effectiveDate,
      revision: draft.revision,
      revisionDate: draft.revisionDate,
      purpose: draft.purpose,
      materials: draft.materials,
      qualifications: draft.qualifications,
      notes: draft.notes,
      steps: draft.steps,
      dispositions: draft.dispositions,
      attachments: existing?.attachments ?? [],
      active: existing?.active ?? false,
      createdBy: input.createdBy,
    });
    if ("error" in result) {
      warnings.push(`${draft.code}: ${result.error}`);
      continue;
    }
    if (existing) updated += 1;
    else created += 1;
    existingByCode.set(result.code.toLowerCase(), result);

    stripGeneratedPdfAttachments(result.id);
    const slice = originals[i] ?? input.buffer;
    const fname = `${draft.code.replace(/\//g, "-")} – ${draft.title.slice(0, 80)}.docx`;
    const withWord = attachOriginalDocx(result.id, slice, fname);
    let current: SopDocument =
      "error" in withWord ? getSop(result.id) ?? result : withWord;
    if ("error" in withWord) {
      warnings.push(`${draft.code}: SOP tersimpan, file Word asli gagal (${withWord.error})`);
    } else {
      current = await attachPdfFromDocx(
        result.id,
        slice,
        fname.replace(/\.docx$/i, ".pdf"),
        warnings,
        draft.code,
        current,
      );
    }
    saved.push(current);
  }

  if (drafts.length >= 2) {
    const masterExisting = existingByCode.get(masterCode.toLowerCase());
    const master = upsertSop({
      id: masterExisting?.id,
      departmentId: dept.id,
      code: masterCode,
      title: `Master SOP ${dept.name} (file sumber)`,
      divisionLabel: sopDivisionLabelFromDepartment(dept.name),
      documentType: "MASTER STANDARD OPERATING PROCEDURE",
      purpose: `Dokumen induk ${drafts.length} SOP ${dept.name} yang dipecah otomatis dari file Word.`,
      materials: `File sumber: ${input.filename}`,
      qualifications: `Pemilik proses: ${dept.name}`,
      notes: `Diimpor ${new Date().toISOString().slice(0, 10)}. SOP pecahan: ${drafts.map((d) => d.code).join(", ")}.`,
      steps: [
        {
          order: 1,
          title: "Pakai pecahan per nomor",
          body: "Isi operasional ada pada entri SOP per nomor. File Word master terlampir di sini.",
        },
      ],
      dispositions: defaultSopDispositions(dept.name),
      attachments: masterExisting?.attachments ?? [],
      active: false,
      createdBy: input.createdBy,
    });
    if (!("error" in master)) {
      if (!masterExisting) created += 1;
      else updated += 1;
      stripGeneratedPdfAttachments(master.id);
      const withWord = attachOriginalDocx(master.id, input.buffer, input.filename);
      let current: SopDocument = "error" in withWord ? master : withWord;
      if (!("error" in withWord)) {
        current = await attachPdfFromDocx(
          master.id,
          input.buffer,
          input.filename.replace(/\.docx$/i, ".pdf") || "master.pdf",
          warnings,
          master.code,
          current,
        );
      }
      saved.push(current);
    }
  }

  return {
    preview: false,
    created,
    updated,
    sops: saved,
    warnings,
  };
}
