import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PENGAJUAN_MAX_PHOTOS } from "./pengajuan";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "pengajuan");

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

export const MAX_PENGAJUAN_PHOTOS = PENGAJUAN_MAX_PHOTOS;
export const MAX_PENGAJUAN_PHOTO_BYTES = 5 * 1024 * 1024;

function ensureDir(pengajuanId: string) {
  const dir = path.join(UPLOAD_ROOT, pengajuanId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function absolutePathFromPengajuanPhotoUrl(url: string): string | null {
  if (!url.startsWith("/uploads/pengajuan/")) return null;
  const rel = url.replace(/^\//, "");
  const abs = path.normalize(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", rel));
  const root = path.normalize(UPLOAD_ROOT);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export async function savePengajuanPhotoFiles(
  pengajuanId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  if (files.length === 0) return { urls: [] };
  const dir = ensureDir(pengajuanId);
  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return {
        urls,
        error: `Tipe file tidak didukung: ${file.name || file.type}. Pakai JPG/PNG/WebP/GIF.`,
      };
    }
    if (file.size > MAX_PENGAJUAN_PHOTO_BYTES) {
      return {
        urls,
        error: `File terlalu besar (max 5MB): ${file.name}`,
      };
    }
    const ext = EXT[file.type] || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    urls.push(`/uploads/pengajuan/${pengajuanId}/${filename}`);
  }

  return { urls };
}

export function deletePengajuanPhotoFiles(urls: string[]) {
  for (const url of urls) {
    const abs = absolutePathFromPengajuanPhotoUrl(url);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* abaikan file yang sudah tidak ada */
      }
    }
  }
}
