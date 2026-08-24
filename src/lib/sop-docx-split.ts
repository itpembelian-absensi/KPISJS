import { zipReadAll, zipReadFile } from "./zip-read";
import { zipCreate } from "./zip-write";

const SOP_HEADING =
  /STANDARD\s+OPERATING\s+PROCE?DURE|PROSEDUR\s+OPERASI\s+STANDAR|STANDAR\s+OPERATING\s+PROCEDURE/i;
const SOP_KODE =
  /(?:Kode|NOMOR\s*DOCUMENT|Nomor\s*(?:Dokumen|Document))\s*[:.]/i;

function xmlPlain(xml: string): string {
  return xml
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/gi, "")
    .replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceElement(
  xml: string,
  start: number,
  tag: string,
): string | null {
  const after = xml.slice(start);
  const gt = after.indexOf(">");
  if (gt < 0) return null;
  if (after[gt - 1] === "/") return after.slice(0, gt + 1);
  const close = `</${tag}>`;
  const open = `<${tag}`;
  let depth = 1;
  let pos = start + gt + 1;
  while (pos < xml.length && depth > 0) {
    const nextClose = xml.indexOf(close, pos);
    if (nextClose < 0) return xml.slice(start);
    let nextOpen = xml.indexOf(open, pos);
    while (nextOpen >= 0 && nextOpen < nextClose) {
      const c = xml[nextOpen + open.length];
      if (c === " " || c === ">" || c === "/") break;
      nextOpen = xml.indexOf(open, nextOpen + open.length);
    }
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + open.length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return xml.slice(start, nextClose + close.length);
    pos = nextClose + close.length;
  }
  return xml.slice(start);
}

function extractTopLevelBlocks(inner: string): string[] {
  const blocks: string[] = [];
  let i = 0;
  while (i < inner.length) {
    const start = inner.indexOf("<w:", i);
    if (start < 0) break;
    const tagMatch = inner.slice(start).match(/^<(w:[a-zA-Z]+)\b/);
    if (!tagMatch) {
      i = start + 1;
      continue;
    }
    const tag = tagMatch[1];
    if (
      tag === "w:bookmarkStart" ||
      tag === "w:bookmarkEnd" ||
      tag === "w:proofErr" ||
      tag === "w:commentRangeStart" ||
      tag === "w:commentRangeEnd"
    ) {
      const sc = inner.indexOf("/>", start);
      i = sc >= 0 ? sc + 2 : start + 1;
      continue;
    }
    if (
      tag === "w:p" ||
      tag === "w:tbl" ||
      tag === "w:sdt" ||
      tag === "w:sectPr"
    ) {
      const block = sliceElement(inner, start, tag);
      if (block) {
        blocks.push(block);
        i = start + block.length;
        continue;
      }
    }
    i = start + 1;
  }
  return blocks;
}

function isNewSopStart(blockXml: string, currentLen: number): boolean {
  if (currentLen < 120) return false;
  const t = xmlPlain(blockXml);
  if (!t) return false;
  return SOP_HEADING.test(t) || SOP_KODE.test(t);
}

function groupBlocks(bodyInner: string): Array<{ body: string; sectPr: string }> {
  const blocks = extractTopLevelBlocks(bodyInner);
  let trailingSect = "";
  const content: string[] = [];
  for (const b of blocks) {
    if (/^<w:sectPr\b/.test(b.trim())) {
      trailingSect = b;
      continue;
    }
    if (/<w:sectPr\b/.test(b)) {
      const sm = b.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
      if (sm) trailingSect = sm[0];
    }
    content.push(b);
  }

  const groups: string[][] = [];
  let current: string[] = [];
  for (const block of content) {
    const curTextLen = xmlPlain(current.join("")).length;
    if (current.length > 0 && isNewSopStart(block, curTextLen)) {
      groups.push(current);
      current = [block];
    } else {
      current.push(block);
    }
  }
  if (current.length) groups.push(current);

  return groups
    .map((g) => g.join(""))
    .filter((xml) => xmlPlain(xml).length > 60)
    .map((body) => ({ body, sectPr: trailingSect }));
}

function splitBySectPr(
  bodyInner: string,
): Array<{ body: string; sectPr: string }> {
  const re = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/gi;
  const parts: Array<{ body: string; sectPr: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyInner))) {
    const body = bodyInner.slice(last, m.index);
    parts.push({ body, sectPr: m[0] });
    last = m.index + m[0].length;
  }
  if (last < bodyInner.length) {
    const rest = bodyInner.slice(last);
    if (xmlPlain(rest).length > 40) parts.push({ body: rest, sectPr: "" });
  }
  const meaningful = parts.filter((p) => xmlPlain(p.body).length > 60);
  return meaningful;
}

function rebuildDocumentXml(
  originalDoc: string,
  bodyInner: string,
  sectPr: string,
): Buffer {
  const open = originalDoc.match(/<w:document\b[^>]*>/)?.[0] ?? "<w:document>";
  const fallbackSect =
    sectPr ||
    originalDoc.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0] ||
    "";
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${open}<w:body>${bodyInner}${fallbackSect}</w:body></w:document>`;
  return Buffer.from(xml, "utf8");
}

function rebuildDocx(source: Buffer, newDocumentXml: Buffer): Buffer {
  const files = zipReadAll(source);
  const next = files.map((f) =>
    f.name === "word/document.xml" ? { ...f, data: newDocumentXml } : f,
  );
  if (!next.some((f) => f.name === "word/document.xml")) {
    next.push({ name: "word/document.xml", data: newDocumentXml });
  }
  return zipCreate(next);
}

function alignCount(parts: Buffer[], count: number, full: Buffer): Buffer[] {
  if (count <= 0) return [];
  if (parts.length === count) return parts;
  if (parts.length === count + 1) return parts.slice(1);
  if (parts.length > count) return parts.slice(parts.length - count);
  const out = [...parts];
  while (out.length < count) out.push(full);
  return out;
}

/**
 * Pecah master .docx jadi file Word terpisah — layout/header/gambar tetap asli.
 */
export function splitOriginalDocx(source: Buffer, sopCount: number): Buffer[] {
  if (sopCount <= 0) return [];
  if (sopCount === 1) return [source];

  const docXml = zipReadFile(source, "word/document.xml")?.toString("utf8");
  if (!docXml) return Array.from({ length: sopCount }, () => source);

  const bodyInner =
    docXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/i)?.[1] ?? docXml;

  let groups = splitBySectPr(bodyInner);
  if (groups.length < 2) groups = groupBlocks(bodyInner);

  const rebuilt = groups.map((g) =>
    rebuildDocx(source, rebuildDocumentXml(docXml, g.body, g.sectPr)),
  );
  return alignCount(rebuilt, sopCount, source);
}
