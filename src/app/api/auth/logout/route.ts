import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { logout } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  logout(token);
  const res = NextResponse.json({ ok: true });
  // Atribut harus identik dengan saat set cookie, kalau tidak browser menolak menghapus.
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
