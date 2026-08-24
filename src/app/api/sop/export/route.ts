import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, SESSION_COOKIE } from "@/lib/auth";
import { exportSops, SopOriginalFileError } from "@/lib/sop-export";
import { getSopsByIds, listSopsForUser, userCanViewSop } from "@/lib/sop-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 180;

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
  const departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sops = (
    all
      ? listSopsForUser(user, { activeOnly: true, departmentId })
      : getSopsByIds(ids.length > 0 ? ids : [])
  ).filter((s) => userCanViewSop(user, s));

  if (sops.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada SOP untuk diekspor" },
      { status: 400 },
    );
  }

  try {
    const { buffer, filename, contentType } = await exportSops(
      sops,
      format as "pdf" | "docx",
    );
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof SopOriginalFileError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
