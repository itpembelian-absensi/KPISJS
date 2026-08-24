import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  getAppBranding,
  isThemeId,
  resetAppCopy,
  setAppTagline,
  setAppTitle,
  setCompanyName,
  setThemeId,
} from "@/lib/branding";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getAppBranding());
}

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageMaster(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { companyName, themeId, appTitle, appTagline, resetAppCopy: doReset } =
    body as {
      companyName?: unknown;
      themeId?: unknown;
      appTitle?: unknown;
      appTagline?: unknown;
      resetAppCopy?: unknown;
    };

  if (doReset === true) {
    resetAppCopy();
  }

  if (companyName !== undefined) {
    if (typeof companyName !== "string") {
      return NextResponse.json(
        { error: "Nama perusahaan tidak valid" },
        { status: 400 },
      );
    }
    setCompanyName(companyName);
  }

  if (themeId !== undefined) {
    if (!isThemeId(themeId)) {
      return NextResponse.json({ error: "Tema tidak dikenali" }, { status: 400 });
    }
    setThemeId(themeId);
  }

  if (appTitle !== undefined) {
    if (typeof appTitle !== "string") {
      return NextResponse.json(
        { error: "Judul aplikasi tidak valid" },
        { status: 400 },
      );
    }
    setAppTitle(appTitle);
  }

  if (appTagline !== undefined) {
    if (typeof appTagline !== "string") {
      return NextResponse.json(
        { error: "Subjudul aplikasi tidak valid" },
        { status: 400 },
      );
    }
    setAppTagline(appTagline);
  }

  return NextResponse.json(getAppBranding());
}
