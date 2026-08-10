import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithStaffCode } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resetPasswordWithStaffCode({
      username: String(body.username || ""),
      employeeCode: String(body.employeeCode || ""),
      newPassword: String(body.newPassword || ""),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: "Password berhasil diubah. Silakan masuk dengan password baru.",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan" },
      { status: 500 },
    );
  }
}
