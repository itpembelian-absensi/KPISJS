import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "tickets");

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

export type TicketPhotoKind = "request" | "work";

export const MAX_TICKET_PHOTOS = 8;
export const MAX_TICKET_PHOTO_BYTES = 5 * 1024 * 1024;

export function ensureTicketUploadDir(
  ticketId: string,
  kind: TicketPhotoKind = "request",
) {
  const dir =
    kind === "work"
      ? path.join(UPLOAD_ROOT, ticketId, "work")
      : path.join(UPLOAD_ROOT, ticketId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicUrlForTicketPhoto(
  ticketId: string,
  filename: string,
  kind: TicketPhotoKind = "request",
) {
  if (kind === "work") {
    return `/uploads/tickets/${ticketId}/work/${filename}`;
  }
  return `/uploads/tickets/${ticketId}/${filename}`;
}

export function absolutePathFromTicketPhotoUrl(url: string): string | null {
  if (!url.startsWith("/uploads/tickets/")) return null;
  const rel = url.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  const normalized = path.normalize(abs);
  const root = path.normalize(UPLOAD_ROOT);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

export async function saveTicketPhotoFiles(
  ticketId: string,
  files: File[],
  kind: TicketPhotoKind = "request",
): Promise<{ urls: string[]; error?: string }> {
  if (files.length === 0) return { urls: [] };
  const dir = ensureTicketUploadDir(ticketId, kind);
  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return {
        urls,
        error: `Tipe file tidak didukung: ${file.name || file.type}. Pakai JPG/PNG/WebP/GIF.`,
      };
    }
    if (file.size > MAX_TICKET_PHOTO_BYTES) {
      return {
        urls,
        error: `File terlalu besar (max 5MB): ${file.name}`,
      };
    }
    const ext = EXT[file.type] || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    urls.push(publicUrlForTicketPhoto(ticketId, filename, kind));
  }

  return { urls };
}

export function deleteTicketPhotoFiles(urls: string[]) {
  for (const url of urls) {
    const abs = absolutePathFromTicketPhotoUrl(url);
    if (abs && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
  }
}

export function deleteTicketUploadFolder(ticketId: string) {
  const dir = path.join(UPLOAD_ROOT, ticketId);
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function parseTicketPhotoKind(raw: unknown): TicketPhotoKind {
  return raw === "work" ? "work" : "request";
}
