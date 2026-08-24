import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { getMeta, setMeta } from "./db";
import {
  DEFAULT_APP_TAGLINE,
  DEFAULT_APP_TITLE,
  isThemeId,
  type AppBranding,
  type ThemeId,
} from "./branding-types";

export const COMPANY_LOGO_META_KEY = "company_logo";
export const COMPANY_NAME_META_KEY = "company_name";
export const APP_TITLE_META_KEY = "app_title";
export const APP_TAGLINE_META_KEY = "app_tagline";
export const APP_THEME_META_KEY = "app_theme";

export {
  DEFAULT_APP_TAGLINE,
  DEFAULT_APP_TITLE,
  THEME_IDS,
  THEME_OPTIONS,
  isThemeId,
  type AppBranding,
  type ThemeId,
} from "./branding-types";

export function getCompanyName(): string {
  return (getMeta(COMPANY_NAME_META_KEY) ?? "").trim();
}

export function setCompanyName(name: string) {
  setMeta(COMPANY_NAME_META_KEY, name.trim().slice(0, 120));
}

export function getThemeId(): ThemeId {
  const raw = getMeta(APP_THEME_META_KEY);
  return isThemeId(raw) ? raw : "default";
}

export function setThemeId(id: ThemeId) {
  setMeta(APP_THEME_META_KEY, id);
}

function readCopy(key: string, fallback: string): string {
  const value = (getMeta(key) ?? "").trim();
  return value || fallback;
}

export function getAppTitle(): string {
  return readCopy(APP_TITLE_META_KEY, DEFAULT_APP_TITLE);
}

export function setAppTitle(title: string) {
  const next = title.trim().slice(0, 80);
  setMeta(APP_TITLE_META_KEY, next === DEFAULT_APP_TITLE ? "" : next);
}

export function getAppTagline(): string {
  return readCopy(APP_TAGLINE_META_KEY, DEFAULT_APP_TAGLINE);
}

export function setAppTagline(tagline: string) {
  const next = tagline.trim().slice(0, 160);
  setMeta(APP_TAGLINE_META_KEY, next === DEFAULT_APP_TAGLINE ? "" : next);
}

export function resetAppCopy() {
  setMeta(APP_TITLE_META_KEY, "");
  setMeta(APP_TAGLINE_META_KEY, "");
}

export function getAppBranding(): AppBranding {
  return {
    logoUrl: getCompanyLogoUrl(),
    companyName: getCompanyName(),
    appTitle: getAppTitle(),
    appTagline: getAppTagline(),
    themeId: getThemeId(),
  };
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "branding");

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function getCompanyLogoUrl(): string | null {
  const url = getMeta(COMPANY_LOGO_META_KEY);
  return url && url.trim() ? url : null;
}

function absolutePathFromLogoUrl(url: string): string | null {
  if (!url.startsWith("/uploads/branding/")) return null;
  const abs = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  const normalized = path.normalize(abs);
  const root = path.normalize(UPLOAD_DIR);
  if (!normalized.startsWith(root)) return null;
  return normalized;
}

function deleteLogoFile(url: string | null) {
  if (!url) return;
  const abs = absolutePathFromLogoUrl(url);
  if (abs && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch {
      /* ignore */
    }
  }
}

export async function saveCompanyLogo(
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED.has(file.type)) {
    return {
      error: "Tipe file tidak didukung. Pakai JPG, PNG, atau WebP.",
    };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "File terlalu besar (maksimal 2MB)." };
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const ext = EXT[file.type] || ".png";
  const filename = `${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);

  const url = `/uploads/branding/${filename}`;
  const previous = getCompanyLogoUrl();
  setMeta(COMPANY_LOGO_META_KEY, url);
  if (previous && previous !== url) deleteLogoFile(previous);
  return { url };
}

export function deleteCompanyLogo() {
  const previous = getCompanyLogoUrl();
  deleteLogoFile(previous);
  setMeta(COMPANY_LOGO_META_KEY, "");
}
