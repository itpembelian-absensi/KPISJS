import { inflateRawSync } from "zlib";

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

function findEocd(buf: Buffer): number {
  const start = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

function readLocalFile(
  buf: Buffer,
  localOff: number,
  method: number,
  compSize: number,
): Buffer | null {
  if (localOff < 0 || localOff + 30 > buf.length) return null;
  if (buf.readUInt32LE(localOff) !== LOCAL_SIG) return null;
  const nameLen = buf.readUInt16LE(localOff + 26);
  const extraLen = buf.readUInt16LE(localOff + 28);
  const dataStart = localOff + 30 + nameLen + extraLen;
  const dataEnd = dataStart + compSize;
  if (dataEnd > buf.length) return null;
  const data = buf.subarray(dataStart, dataEnd);
  if (method === 0) return Buffer.from(data);
  if (method === 8) {
    try {
      return inflateRawSync(data);
    } catch {
      return null;
    }
  }
  return null;
}

/** Baca satu entri dari arsip ZIP (docx = ZIP). */
export function zipReadFile(buf: Buffer, entryName: string): Buffer | null {
  const eocd = findEocd(buf);
  if (eocd < 0) return null;
  const cdCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  let p = cdOffset;
  const want = entryName.replace(/\\/g, "/");
  for (let i = 0; i < cdCount; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CENTRAL_SIG) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf
      .subarray(p + 46, p + 46 + nameLen)
      .toString("utf8")
      .replace(/\\/g, "/");
    if (name === want) {
      return readLocalFile(buf, localOff, method, compSize);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Daftar nama file di dalam ZIP. */
export function zipListFiles(buf: Buffer): string[] {
  const eocd = findEocd(buf);
  if (eocd < 0) return [];
  const cdCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const names: string[] = [];
  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CENTRAL_SIG) break;
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    names.push(
      buf
        .subarray(p + 46, p + 46 + nameLen)
        .toString("utf8")
        .replace(/\\/g, "/"),
    );
    p += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

export type ZipEntry = { name: string; data: Buffer };

/** Baca semua entri ZIP (decompress). */
export function zipReadAll(buf: Buffer): ZipEntry[] {
  const eocd = findEocd(buf);
  if (eocd < 0) return [];
  const cdCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CENTRAL_SIG) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf
      .subarray(p + 46, p + 46 + nameLen)
      .toString("utf8")
      .replace(/\\/g, "/");
    const data = readLocalFile(buf, localOff, method, compSize);
    if (data) entries.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
