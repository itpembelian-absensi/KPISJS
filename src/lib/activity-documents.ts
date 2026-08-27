import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { absolutePathFromPublicUrl, ensureActivityUploadDir } from "./activity-photos";
import type { KpiActivityDocument } from "./types";

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
};

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
};

export const MAX_ACTIVITY_DOCS = 8;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

function resolveMime(file: File): string | null {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const name = (file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const mime = NAME_EXT_MIME[name.slice(dot)];
  return mime && ALLOWED.has(mime) ? mime : null;
}

function safeOriginalName(name: string, fallback: string): string {
  const base = path.basename(name || "").replace(/[<>:"|?*\u0000-\u001f]/g, "_");
  const trimmed = base.trim();
  return (trimmed || fallback).slice(0, 180);
}

export function publicUrlForActivityDoc(
  activityId: string,
  filename: string,
) {
  return `/uploads/activities/${activityId}/${filename}`;
}

export async function saveActivityDocumentFiles(
  activityId: string,
  files: File[],
): Promise<{ documents: KpiActivityDocument[]; error?: string }> {
  if (files.length === 0) return { documents: [] };
  const dir = ensureActivityUploadDir(activityId);
  const documents: KpiActivityDocument[] = [];

  for (const file of files) {
    const mime = resolveMime(file);
    if (!mime) {
      return {
        documents,
        error: `Tipe file tidak didukung: ${file.name || file.type}. Pakai PDF, Word, Excel, PowerPoint, TXT, atau CSV.`,
      };
    }
    if (file.size > MAX_DOC_BYTES) {
      return {
        documents,
        error: `File terlalu besar (max 10MB): ${file.name}`,
      };
    }
    const ext = EXT[mime] || path.extname(file.name) || "";
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    documents.push({
      url: publicUrlForActivityDoc(activityId, filename),
      name: safeOriginalName(file.name, filename),
    });
  }

  return { documents };
}

export function deleteActivityDocumentFiles(urls: string[]) {
  for (const url of urls) {
    const abs = absolutePathFromPublicUrl(url);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
  }
}
