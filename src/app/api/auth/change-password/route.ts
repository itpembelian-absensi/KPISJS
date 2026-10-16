import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { changeUserPassword, getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const user = getUserBySessionToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Sesi telah berakhir. Silakan login kembali." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Password saat ini wajib diisi" },
        { status: 400 },
      );
    }
    if (!newPassword) {
      return NextResponse.json(
        { error: "Password baru wajib diisi" },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password baru tidak cocok" },
        { status: 400 },
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru tidak boleh sama dengan password saat ini" },
        { status: 400 },
      );
    }

    const result = changeUserPassword(user.id, currentPassword, newPassword);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Password berhasil diperbarui!",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengubah password";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
