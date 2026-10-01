import { NextRequest, NextResponse } from "next/server";
import { canAccessMenu, canSeePengajuan, SESSION_COOKIE } from "@/lib/auth";
import { getPengajuanType } from "@/lib/pengajuan";
import { buildPengajuanPdf } from "@/lib/pengajuan-pdf";
import { getPengajuan, listPengajuan } from "@/lib/pengajuan-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function filename(name: string) {
  const safe = name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `pengajuan-${safe || "dokumen"}.pdf`;
}

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim() || "";
  const type = req.nextUrl.searchParams.get("type")?.trim() || "";

  try {
    if (id) {
      const item = getPengajuan(id);
      if (!item) {
        return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
      }
      const def = getPengajuanType(item.type);
      if (!def || !canAccessMenu(user, def.href) || !canSeePengajuan(user, item)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const buffer = await buildPengajuanPdf({
        items: [item],
        title: item.title,
        mode: "one",
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename(item.code)}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const def = type ? getPengajuanType(type) : null;
    if (type && !def) {
      return NextResponse.json({ error: "Jenis pengajuan tidak dikenal" }, { status: 400 });
    }
    const menu = def?.href ?? "/pengajuan";
    if (!canAccessMenu(user, menu)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = listPengajuan(def?.type).filter((item) => canSeePengajuan(user, item));
    const title = def ? def.label : "Semua Pengajuan";
    const buffer = await buildPengajuanPdf({
      items,
      title,
      mode: "list",
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename(def ? def.type : "semua")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal membuat PDF" }, { status: 500 });
  }
}
