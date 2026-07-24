import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { importAttendanceFromExcel } from "@/lib/attendance-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageMaster(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Unggah file Excel (.xlsx) dengan field name=file" },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = importAttendanceFromExcel({
        buffer,
        sourceFileName: file.name || "upload.xlsx",
        assessedByName: user.name,
      });
      return NextResponse.json({ ok: true, result });
    }

    const body = await req.json().catch(() => ({}));
    const result = importAttendanceFromExcel({
      filePath: body.filePath ? String(body.filePath) : undefined,
      assessedByName: user.name,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal impor absensi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
