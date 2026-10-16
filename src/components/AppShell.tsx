"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  flattenNav,
  isNavSubGroup,
  navForUser,
  type NavChild,
  type NavEntry,
  type NavItem,
} from "@/lib/auth";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { DEFAULT_APP_TITLE, DEFAULT_APP_TAGLINE } from "@/lib/branding-types";
import { ROLE_LABEL, type SessionUser } from "@/lib/types";

/** Exact match, or nested path — but prefer a more specific sibling nav item (e.g. /tickets/new over /tickets). */
function isNavActive(pathname: string, href: string, navHrefs: string[]) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  const hasMoreSpecific = navHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecific;
}

function groupHasActive(
  children: NavChild[],
  pathname: string,
  navHrefs: string[],
) {
  return children.some((c) => {
    if (isNavSubGroup(c)) {
      return c.children.some((item) =>
        isNavActive(pathname, item.href, navHrefs),
      );
    }
    return isNavActive(pathname, c.href, navHrefs);
  });
}

/** Folder tertutup — parent menu collapsed */
function FolderClosedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.586a1.5 1.5 0 0 1 1.06.44l.828.828A.5.5 0 0 0 9.828 5.5H16a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
    </svg>
  );
}

/** Folder terbuka — parent menu expanded (mirip Explorer) */
function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M2.5 5.75A1.75 1.75 0 0 1 4.25 4h3.19c.3 0 .59.12.8.33l.84.84c.21.21.5.33.8.33h5.87A1.75 1.75 0 0 1 17.5 7.25v.5H5.1a1.5 1.5 0 0 0-1.44 1.1L2.5 13.4V5.75Z" />
      <path d="M3.82 9.35A.75.75 0 0 1 4.54 8.8h12.2a.75.75 0 0 1 .72.97l-1.4 4.7A1.75 1.75 0 0 1 14.4 15.5H4.35a1.75 1.75 0 0 1-1.68-1.25l-1.05-3.5a.75.75 0 0 1 .72-.97c.16 0 .31.05.43.14l1.05 3.5Z" />
    </svg>
  );
}

function FolderIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return open ? (
    <FolderOpenIcon className={className} />
  ) : (
    <FolderClosedIcon className={className} />
  );
}

function NavLink({
  item,
  active,
  nested = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`rounded-xl transition ${
        nested ? "px-3 py-2" : "px-3 py-2.5"
      } ${
        active
          ? "bg-brand-soft text-brand-deep ring-1 ring-brand/25"
          : "text-ink hover:bg-bg-elevated"
      }`}
    >
      <div
        className={`font-medium ${
          nested ? "text-[13px] md:text-sm" : "text-sm md:text-[15px]"
        }`}
      >
        {item.label}
      </div>
      <div
        className={`text-xs md:text-[13px] ${
          active ? "text-brand-deep/80" : "text-ink-muted"
        }`}
      >
        {item.hint}
      </div>
    </Link>
  );
}

function SidebarNav({
  nav,
  navHrefs,
  pathname,
  openGroups,
  toggleGroup,
  onNavigate,
}: {
  nav: NavEntry[];
  navHrefs: string[];
  pathname: string;
  openGroups: Record<string, boolean>;
  toggleGroup: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {nav.map((entry) => {
        if (entry.type === "link") {
          const active = isNavActive(pathname, entry.item.href, navHrefs);
          return (
            <NavLink
              key={entry.item.href}
              item={entry.item}
              active={active}
              onNavigate={onNavigate}
            />
          );
        }

        const { group } = entry;
        const childActive = groupHasActive(group.children, pathname, navHrefs);
        const open = openGroups[group.id] ?? childActive;

        return (
          <div key={group.id} className="mt-1">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={open}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                childActive
                  ? "text-brand-deep"
                  : "text-ink hover:bg-bg-elevated"
              }`}
            >
              <FolderIcon
                open={open}
                className="h-6 w-6 shrink-0 text-amber-500 md:h-7 md:w-7"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold md:text-base">
                  {group.label}
                </div>
                <div className="text-xs text-ink-muted md:text-[13px]">
                  {group.hint}
                </div>
              </div>
              <span
                className={`mono text-xs text-ink-muted transition-transform ${
                  open ? "rotate-90" : ""
                }`}
                aria-hidden
              >
                ›
              </span>
            </button>

            {open ? (
              <div className="mt-1 ml-2 flex flex-col gap-0.5 border-l border-line pl-2">
                {group.children.map((child) => {
                  if (isNavSubGroup(child)) {
                    const subActive = child.children.some((item) =>
                      isNavActive(pathname, item.href, navHrefs),
                    );
                    const subOpen = openGroups[child.id] ?? subActive;
                    return (
                      <div key={child.id} className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => toggleGroup(child.id)}
                          aria-expanded={subOpen}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                            subActive
                              ? "text-brand-deep"
                              : "text-ink hover:bg-bg-elevated"
                          }`}
                        >
                          <FolderIcon
                            open={subOpen}
                            className="h-5 w-5 shrink-0 text-amber-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold md:text-sm">
                              {child.label}
                            </div>
                            <div className="text-[11px] text-ink-muted md:text-xs">
                              {child.hint}
                            </div>
                          </div>
                          <span
                            className={`mono text-xs text-ink-muted transition-transform ${
                              subOpen ? "rotate-90" : ""
                            }`}
                            aria-hidden
                          >
                            ›
                          </span>
                        </button>
                        {subOpen ? (
                          <div className="mt-0.5 ml-2 flex flex-col gap-0.5 border-l border-line pl-2">
                            {child.children.map((item) => (
                              <NavLink
                                key={item.href}
                                item={item}
                                active={isNavActive(
                                  pathname,
                                  item.href,
                                  navHrefs,
                                )}
                                nested
                                onNavigate={onNavigate}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={child.href}
                      item={child}
                      active={isNavActive(pathname, child.href, navHrefs)}
                      nested
                      onNavigate={onNavigate}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  user,
  logoUrl = null,
  companyName = "",
  appTitle = DEFAULT_APP_TITLE,
  appTagline = DEFAULT_APP_TAGLINE,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  logoUrl?: string | null;
  companyName?: string;
  appTitle?: string;
  appTagline?: string;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  const nav = user ? navForUser(user) : [];
  const flat = flattenNav(nav);
  const navHrefs = flat.map((item) => item.href);

  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const entries = navForUser(user);
    const hrefs = flattenNav(entries).map((item) => item.href);
    setOpenGroups(() => {
      const next: Record<string, boolean> = {};
      for (const entry of entries) {
        if (entry.type !== "group") continue;
        const active = groupHasActive(entry.group.children, pathname, hrefs);
        next[entry.group.id] = active;
        for (const child of entry.group.children) {
          if (!isNavSubGroup(child)) continue;
          const subActive = child.children.some((item) =>
            isNavActive(pathname, item.href, hrefs),
          );
          next[child.id] = subActive;
          if (subActive) next[entry.group.id] = true;
        }
      }
      return next;
    });
  }, [pathname, user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (isLogin || !user) {
    return <>{children}</>;
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      // Full reload — hindari cache layout yang masih menganggap user login
      // lalu /login me-redirect kembali ke dashboard.
      window.location.assign("/login");
    }
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const willOpen = !prev[id];
      if (!willOpen) return { ...prev, [id]: false };
      const topLevelIds = nav
        .filter((e) => e.type === "group")
        .map((e) => e.group.id);
      if (!topLevelIds.includes(id)) {
        return { ...prev, [id]: true };
      }
      const next = { ...prev };
      for (const tid of topLevelIds) {
        if (tid !== id) next[tid] = false;
      }
      next[id] = true;
      return next;
    });
  }

  const brandTitle = companyName.trim() || "SJS · IT Systems";
  const currentLabel =
    flat.find((item) => isNavActive(pathname, item.href, navHrefs))?.label ??
    appTitle;

  return (
    <div className="flex min-h-screen w-full gap-6 px-3 py-3 sm:px-4 sm:py-5 md:px-5 lg:px-6 print:block print:p-0">
      {/* Desktop sidebar */}
      <aside className="panel sticky top-5 hidden h-[calc(100vh-2.5rem)] w-72 shrink-0 flex-col overflow-hidden p-5 print:hidden md:flex lg:w-80">
        <div className="mb-6 min-w-0">
          <p className="mono min-w-0 break-words text-[11px] font-semibold leading-snug tracking-wide text-brand uppercase lg:text-xs">
            {brandTitle}
          </p>
          <h1 className="mt-1 text-xl leading-tight font-semibold tracking-tight text-ink lg:text-2xl">
            {appTitle}
          </h1>
          <p className="mt-2 text-sm leading-snug text-ink-muted lg:text-[15px]">
            {appTagline}
          </p>
        </div>

        <div className="mb-4 rounded-xl bg-brand-soft px-3 py-2.5">
          <p className="text-sm font-medium text-ink md:text-[15px] truncate">{user.name}</p>
          <p className="text-xs text-ink-muted md:text-[13px] truncate">
            {ROLE_LABEL[user.role]}
            {user.departmentName ? ` · ${user.departmentName}` : ""}
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-brand/20 pt-2 text-xs">
            <span className="mono text-[11px] text-ink-muted">@{user.username}</span>
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-brand-deep hover:underline cursor-pointer"
              title="Ganti password akun Anda"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Ganti Password
            </button>
          </div>
        </div>

        <SidebarNav
          nav={nav}
          navHrefs={navHrefs}
          pathname={pathname}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
        />

        <div className="mt-4 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setChangePasswordOpen(true)}
            className="flex-1 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-bg hover:text-ink flex items-center justify-center gap-1.5 cursor-pointer"
            title="Ganti password akun Anda"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Password
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-1 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-bg hover:text-ink cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col overflow-hidden bg-surface p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mono min-w-0 break-words text-[11px] font-semibold leading-snug tracking-wide text-brand uppercase">
                  {brandTitle}
                </p>
                <h1 className="mt-1 text-lg font-semibold leading-tight tracking-tight">
                  {appTitle}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted"
              >
                Tutup
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-brand-soft px-3 py-2.5">
              <p className="text-sm font-medium text-ink truncate">{user.name}</p>
              <p className="text-xs text-ink-muted truncate">
                {ROLE_LABEL[user.role]}
                {user.departmentName ? ` · ${user.departmentName}` : ""}
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-brand/20 pt-2 text-xs">
                <span className="mono text-[11px] text-ink-muted">@{user.username}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setChangePasswordOpen(true);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-brand-deep hover:underline cursor-pointer"
                  title="Ganti password akun Anda"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Ganti Password
                </button>
              </div>
            </div>

            <SidebarNav
              nav={nav}
              navHrefs={navHrefs}
              pathname={pathname}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              onNavigate={() => setMenuOpen(false)}
            />

            <div className="mt-4 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="flex-1 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink-muted flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Password
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex-1 rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-ink-muted cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-5 print:block print:w-full">
        {logoUrl ? (
          <div className="hidden justify-end print:hidden md:flex">
            <CompanyLogo url={logoUrl} />
          </div>
        ) : null}

        <header className="panel sticky top-3 z-40 flex items-center justify-between gap-3 px-3 py-2.5 print:hidden sm:px-4 sm:py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-bg-elevated"
              aria-label="Buka menu"
            >
              <span className="block h-0.5 w-4 rounded bg-ink" />
              <span className="block h-0.5 w-4 rounded bg-ink" />
              <span className="block h-0.5 w-4 rounded bg-ink" />
            </button>
            <div className="min-w-0">
              <p className="mono min-w-0 break-words text-[10px] font-semibold leading-snug tracking-wide text-brand uppercase">
                {brandTitle}
              </p>
              <p className="truncate text-sm font-semibold">{currentLabel}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <CompanyLogo url={logoUrl} size="sm" showActions={false} />
            ) : null}
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="shrink-0 rounded-lg border border-line p-2 text-xs text-ink-muted hover:text-ink cursor-pointer"
              title="Ganti Password"
              aria-label="Ganti Password"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs text-ink-muted cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-8">{children}</main>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        user={user}
      />
    </div>
  );
}
