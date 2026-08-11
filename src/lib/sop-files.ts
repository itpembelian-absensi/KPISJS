import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SopAttachment } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "sops");

/** MIME yang diizinkan untuk file SOP */
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Fallback ekstensi dari nama file jika MIME kosong/generik */
const NAME_EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const MAX_SOP_FILES = 10;
export const MAX_SOP_FILE_BYTES = 20 * 1024 * 1024;

export function ensureSopUploadDir(sopId: string) {
  const dir = path.join(UPLOAD_ROOT, sopId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicUrlForSopFile(sopId: string, filename: string) {
  return `/uploads/sops/${sopId}/${filename}`;
}

export function absolutePathFromSopPublicUrl(url: string): string | null {
  if (!url.startsWith("/uploads/sops/")) return null;
  const rel = url.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  const normalized = path.normalize(abs);
  const root = path.normalize(UPLOAD_ROOT);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

function resolveMime(file: File): string | null {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const name = (file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = name.slice(dot);
  const mime = NAME_EXT_MIME[ext];
  return mime && ALLOWED.has(mime) ? mime : null;
}

export async function saveSopFiles(
  sopId: string,
  files: File[],
): Promise<{ attachments: SopAttachment[]; error?: string }> {
  if (files.length === 0) return { attachments: [] };
  const dir = ensureSopUploadDir(sopId);
  const attachments: SopAttachment[] = [];

  for (const file of files) {
    const mime = resolveMime(file);
    if (!mime) {
      return {
        attachments,
        error: `Tipe file tidak didukung: ${file.name || file.type}. Pakai PDF, Word, Excel, PowerPoint, TXT/CSV, atau gambar.`,
      };
    }
    if (file.size > MAX_SOP_FILE_BYTES) {
      return {
        attachments,
        error: `File terlalu besar (max 20MB): ${file.name}`,
      };
    }
    const ext = EXT[mime] || path.extname(file.name) || "";
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    const originalName = file.name || filename;
    attachments.push({
      label: originalName,
      url: publicUrlForSopFile(sopId, filename),
      originalName,
      mimeType: mime,
      kind: "file",
    });
  }

  return { attachments };
}

export function deleteSopFileUrls(urls: string[]) {
  for (const url of urls) {
    const abs = absolutePathFromSopPublicUrl(url);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
  }
}

export function deleteSopUploadFolder(sopId: string) {
  const dir = path.join(UPLOAD_ROOT, sopId);
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function isUploadedSopFileUrl(url: string) {
  return url.startsWith("/uploads/sops/");
}
