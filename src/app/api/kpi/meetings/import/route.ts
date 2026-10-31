import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, SESSION_COOKIE } from "@/lib/auth";
import { importMeetingNotesFromExcel, meetingImportContext } from "@/lib/meeting-import";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMenu(user, "/kpi/meetings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = meetingImportContext(user);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Unggah file Excel (.xlsx) dengan field file" },
        { status: 400 },
      );
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "File harus berupa Excel .xlsx" },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const imported = importMeetingNotesFromExcel(buffer, ctx, {
      id: user.id,
      name: user.name,
    });
    if (imported.error || !imported.result) {
      return NextResponse.json(
        {
          error: imported.error || "Gagal mengimpor notulen",
          errors: imported.errors ?? [],
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      meetings: imported.result.meetings,
      itemCount: imported.result.itemCount,
      warnings: imported.result.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengimpor notulen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
