import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = requestPasswordReset(String(body.username || ""));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan" },
      { status: 500 },
    );
  }
}
