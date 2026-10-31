import { NextRequest, NextResponse } from "next/server";
import {
  canAccessMenu,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  buildMeetingImportTemplate,
  meetingImportContext,
} from "@/lib/meeting-import";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

  const buffer = buildMeetingImportTemplate(ctx.departments, ctx.staff);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-notulen.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
