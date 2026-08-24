import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteCompanyLogo,
  getCompanyLogoUrl,
  saveCompanyLogo,
} from "@/lib/branding";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ url: getCompanyLogoUrl() });
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageMaster(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (
      !file ||
      typeof file !== "object" ||
      !("arrayBuffer" in file) ||
      typeof (file as File).arrayBuffer !== "function" ||
      Number((file as File).size) <= 0
    ) {
      return NextResponse.json(
        { error: "Pilih file logo (JPG, PNG, atau WebP)" },
        { status: 400 },
      );
    }

    const result = await saveCompanyLogo(file as File);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunggah logo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageMaster(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  deleteCompanyLogo();
  return NextResponse.json({ url: null });
}
