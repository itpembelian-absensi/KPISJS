import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "activities");

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const MAX_ACTIVITY_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function ensureActivityUploadDir(activityId: string) {
  const dir = path.join(UPLOAD_ROOT, activityId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicUrlForActivityPhoto(
  activityId: string,
  filename: string,
) {
  return `/uploads/activities/${activityId}/${filename}`;
}

export function absolutePathFromPublicUrl(url: string): string | null {
  if (!url.startsWith("/uploads/activities/")) return null;
  const rel = url.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  const normalized = path.normalize(abs);
  const root = path.normalize(UPLOAD_ROOT);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

export async function saveActivityPhotoFiles(
  activityId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  if (files.length === 0) return { urls: [] };
  const dir = ensureActivityUploadDir(activityId);
  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return {
        urls,
        error: `Tipe file tidak didukung: ${file.name || file.type}. Pakai JPG/PNG/WebP/GIF.`,
      };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return {
        urls,
        error: `File terlalu besar (max 5MB): ${file.name}`,
      };
    }
    const ext = EXT[file.type] || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    urls.push(publicUrlForActivityPhoto(activityId, filename));
  }

  return { urls };
}

export function deleteActivityPhotoFiles(urls: string[]) {
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

export function deleteActivityUploadFolder(activityId: string) {
  const dir = path.join(UPLOAD_ROOT, activityId);
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
