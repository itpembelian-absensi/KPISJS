import { NextRequest, NextResponse } from "next/server";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import {
  backupDownloadName,
  createDatabaseBackup,
  getDatabaseFileInfo,
  MAX_BACKUP_BYTES,
  restoreDatabase,
} from "@/lib/db-backup";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireMaster(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!canManageMaster(user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;

  if (req.nextUrl.searchParams.get("info") === "1") {
    return NextResponse.json(getDatabaseFileInfo());
  }

  try {
    const buf = await createDatabaseBackup();
    const name = backupDownloadName();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membuat backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;

  try {
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
        { error: "Pilih file backup (.db)" },
        { status: 400 },
      );
    }
    if (Number((file as File).size) > MAX_BACKUP_BYTES) {
      return NextResponse.json(
        { error: "File backup terlalu besar (maksimal 200MB)." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await (file as File).arrayBuffer());
    const result = restoreDatabase(buf);
    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
    const name =
      typeof (file as File).name === "string" && (file as File).name
        ? (file as File).name
        : "backup.db";
    return NextResponse.json({
      ok: true,
      message: `Database berhasil ditimpa oleh ${name}. Muat ulang halaman. Jika sesi terputus, masuk ulang.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal merestor database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
