import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  canAccessMenu,
  canAccessSop,
  canManageMaster,
  getSafeRedirect,
  SESSION_COOKIE,
} from "./auth";
import { getUserBySessionToken } from "./store";
import type { SessionUser, UserRole } from "./types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return getUserBySessionToken(token);
}

export async function requireUser(
  allowed?: UserRole[],
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const headerList = await headers();
    const target = headerList.get("x-target");
    const safeTarget = getSafeRedirect(target, "/");
    if (safeTarget !== "/") {
      redirect(`/login?next=${encodeURIComponent(safeTarget)}`);
    }
    redirect("/login");
  }
  if (allowed && !allowed.includes(user.role)) redirect("/");
  return user;
}

export async function requireMenu(href: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessMenu(user, href)) redirect("/");
  return user;
}

export async function requireMasterAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageMaster(user.role)) redirect("/");
  return user;
}

/** SOP — semua role (menu allowlist + canAccessSop) */
export async function requireSopAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessSop(user.role) || !canAccessMenu(user, "/master/sops")) {
    redirect("/");
  }
  return user;
}

/** Master + menu spesifik (allowlist per-user) */
export async function requireMasterMenu(href: string): Promise<SessionUser> {
  const user = await requireMasterAccess();
  if (!canAccessMenu(user, href)) redirect("/");
  return user;
}
