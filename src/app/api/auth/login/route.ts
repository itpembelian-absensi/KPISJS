import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { getUserBySessionToken, login, logout } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username dan password wajib" },
      { status: 400 },
    );
  }

  const result = login(username, password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const res = NextResponse.json({ user: result.user });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
