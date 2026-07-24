import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, SESSION_COOKIE } from "@/lib/auth";
import {
  buildSopDocx,
  buildSopPdf,
  sopExportFilename,
} from "@/lib/sop-export";
import { getSopsByIds, listSops } from "@/lib/sop-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessSop(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json(
      { error: "format harus pdf atau docx" },
      { status: 400 },
    );
  }

  const all = req.nextUrl.searchParams.get("all") === "1";
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sops = all
    ? listSops(true)
    : getSopsByIds(ids.length > 0 ? ids : []);

  if (sops.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada SOP untuk diekspor" },
      { status: 400 },
    );
  }

  const buffer =
    format === "pdf" ? await buildSopPdf(sops) : await buildSopDocx(sops);
  const filename = sopExportFilename(sops, format);
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
