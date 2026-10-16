import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/forgot-password",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(
      /\.(svg|png|jpg|jpeg|gif|webp|ico|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i,
    )
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const target = `${pathname}${req.nextUrl.search}`;
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (target !== "/" && target !== "/login") {
      url.searchParams.set("next", target);
    }
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  const target = `${pathname}${req.nextUrl.search}`;
  requestHeaders.set("x-target", target);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
