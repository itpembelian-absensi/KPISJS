import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "wa-reports");

const ALLOWED = new Set([
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
]);

export const MAX_WA_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

function resolveFileExt(file: File): string | null {
  const t = (file.type || "").toLowerCase();
  if (t === "image/png" || t === "image/x-png") return ".png";
  if (t === "image/jpeg" || t === "image/pjpeg" || t === "image/jpg") return ".jpg";
  if (t === "image/webp") return ".webp";
  if (t === "image/gif") return ".gif";

  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".png")) return ".png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return ".jpg";
  if (name.endsWith(".webp")) return ".webp";
  if (name.endsWith(".gif")) return ".gif";

  return null;
}

export function ensureWaReportUploadDir(reportId: string): string {
  const dir = path.join(UPLOAD_ROOT, reportId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicUrlForWaReportPhoto(
  reportId: string,
  filename: string,
): string {
  return `/uploads/wa-reports/${reportId}/${filename}`;
}

export function absolutePathFromWaPublicUrl(url: string): string | null {
  if (!url.startsWith("/uploads/wa-reports/")) return null;
  const rel = url.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  const normalized = path.normalize(abs);
  const root = path.normalize(UPLOAD_ROOT);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

export async function saveWaReportPhotoFiles(
  reportId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  if (files.length === 0) return { urls: [] };
  const dir = ensureWaReportUploadDir(reportId);
  const urls: string[] = [];

  for (const file of files) {
    const ext = resolveFileExt(file);
    if (!ext) {
      return {
        urls,
        error: `Tipe file tidak didukung: ${file.name || file.type || "unknown"}. Gunakan JPG, PNG, WebP, atau GIF.`,
      };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return {
        urls,
        error: `File terlalu besar (max 10MB): ${file.name || "Foto"}`,
      };
    }
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    urls.push(publicUrlForWaReportPhoto(reportId, filename));
  }

  return { urls };
}

export function deleteWaReportPhotoFiles(urls: string[]) {
  for (const url of urls) {
    const abs = absolutePathFromWaPublicUrl(url);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
  }
}

export function deleteWaReportUploadFolder(reportId: string) {
  const dir = path.join(UPLOAD_ROOT, reportId);
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
