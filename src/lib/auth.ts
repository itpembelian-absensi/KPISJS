import type { SessionUser, UserRole } from "./types";

export const SESSION_COOKIE = "sjs_session";
export const SESSION_DAYS = 7;

export function canManageMaster(role: UserRole): boolean {
  return role === "admin" || role === "it_staff";
}

/** SOP IT: hanya Admin & IT Staf (dept IT) */
export function canAccessSop(role: UserRole): boolean {
  return role === "admin" || role === "it_staff";
}

export function canHandleTickets(role: UserRole): boolean {
  return role === "admin" || role === "it_staff" || role === "manager";
}

export function canViewAllTickets(role: UserRole): boolean {
  return role === "admin" || role === "it_staff" || role === "manager";
}

export function canViewKpi(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "it_staff" ||
    role === "manager" ||
    role === "assessor"
  );
}

/** Input / hapus penilaian manual KPI (lintas departemen & manager) */
export function canWriteKpiAssessment(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "it_staff" ||
    role === "manager" ||
    role === "assessor"
  );
}

/** Akses KPI Departemen (staf hanya project & kegiatan di dept sendiri) */
export function canViewDepartmentKpi(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "it_staff" ||
    role === "manager" ||
    role === "staff" ||
    role === "assessor"
  );
}

/** Staf: view terbatas (hanya project & kegiatan, 1 departemen) */
export function isStaffDeptKpiLimited(role: UserRole): boolean {
  return role === "staff";
}

export function canManageWorkOrders(role: UserRole): boolean {
  return role === "admin" || role === "it_staff" || role === "manager";
}

export function canAssignWorkOrders(role: UserRole): boolean {
  return role === "admin" || role === "it_staff" || role === "manager";
}

export function canAssignTickets(role: UserRole): boolean {
  return role === "admin" || role === "it_staff" || role === "manager";
}

/** Admin / IT Staf: lihat semua penilaian kepuasan user */
export function canViewAllSatisfaction(role: UserRole): boolean {
  return role === "admin" || role === "it_staff";
}

/** Admin / IT: penilaian tanpa batasan staf */
export function isAssessmentUnrestricted(role: UserRole): boolean {
  return role === "admin" || role === "it_staff";
}

/**
 * Boleh menilai staf target?
 * - Admin/IT: ya
 * - Manager/Penilai: dept sendiri selalu; dept lain hanya jika ada di assessmentStaffIds
 */
export function canAssessTargetStaff(
  user: SessionUser,
  target: { id: string; departmentId: string },
): boolean {
  if (!canWriteKpiAssessment(user.role)) return false;
  if (isAssessmentUnrestricted(user.role)) return true;
  if (user.departmentId && target.departmentId === user.departmentId) {
    return true;
  }
  return (user.assessmentStaffIds ?? []).includes(target.id);
}

/** Penilaian agregat departemen (bukan individu) — hanya dept sendiri / unrestricted */
export function canAssessDepartmentAggregate(
  user: SessionUser,
  departmentId: string,
): boolean {
  if (!canWriteKpiAssessment(user.role)) return false;
  if (isAssessmentUnrestricted(user.role)) return true;
  return Boolean(user.departmentId && user.departmentId === departmentId);
}

export function canAccessTicket(
  role: UserRole,
  userStaffId: string | null,
  ticketRequesterStaffId: string | null,
): boolean {
  if (canViewAllTickets(role)) return true;
  return Boolean(userStaffId && ticketRequesterStaffId === userStaffId);
}

export type NavItem = {
  href: string;
  label: string;
  hint: string;
  roles: UserRole[];
};

/** Submenu di dalam group (mis. Report di bawah KPI) */
export type NavSubGroup = {
  id: string;
  label: string;
  hint: string;
  roles: UserRole[];
  children: NavItem[];
};

export type NavChild = NavItem | NavSubGroup;

export function isNavSubGroup(child: NavChild): child is NavSubGroup {
  return (
    "children" in child &&
    Array.isArray((child as NavSubGroup).children) &&
    !("href" in child)
  );
}

export type NavGroup = {
  id: string;
  label: string;
  hint: string;
  roles: UserRole[];
  children: NavChild[];
};

export type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

export const NAV_ENTRIES: NavEntry[] = [
  {
    type: "link",
    item: {
      href: "/",
      label: "Dashboard",
      hint: "Ringkasan antrian & KPI",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
    },
  },
  {
    type: "link",
    item: {
      href: "/master/sops",
      label: "SOP IT",
      hint: "Prosedur kerja & export PDF/Word",
      roles: ["admin", "it_staff"],
    },
  },
  {
    type: "link",
    item: {
      href: "/tickets",
      label: "Antrian Tiket",
      hint: "Queue & assignment",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
    },
  },
  {
    type: "link",
    item: {
      href: "/tickets/new",
      label: "Buat Tiket",
      hint: "Request support baru",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
    },
  },
  {
    type: "link",
    item: {
      href: "/tickets/rate",
      label: "Nilai Hasil Kerja",
      hint: "Rating kepuasan tiket selesai",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
    },
  },
  {
    type: "group",
    group: {
      id: "kpi",
      label: "KPI",
      hint: "Metrik & performa departemen",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
      children: [
        {
          href: "/kpi",
          label: "KPI IT",
          hint: "SLA, repeat, satisfaction",
          roles: ["admin", "manager", "it_staff"],
        },
        {
          href: "/kpi/departments",
          label: "KPI Departemen",
          hint: "Fungsi, project, penilaian",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/work-orders",
          label: "Antrian Tugas",
          hint: "Perintah & proses kerja",
          roles: ["admin", "manager", "it_staff"],
        },
        {
          href: "/work-orders/new",
          label: "Beri Perintah",
          hint: "Tugas project / inovasi / security",
          roles: ["admin", "manager", "it_staff"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "report",
      label: "Report",
      hint: "Laporan KPI & pekerjaan",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
      children: [
        {
          href: "/kpi/reports",
          label: "Report KPI",
          hint: "Laporan KPI & repeat issue",
          roles: ["admin", "manager", "it_staff", "assessor"],
        },
        {
          href: "/kpi/work-report",
          label: "Laporan Pekerjaan",
          hint: "Harian, mingguan, bulanan & pending",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/kpi/individual-scores",
          label: "Laporan Skor Individu",
          hint: "Nilai / skor KPI per karyawan",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/kpi/score-guide",
          label: "Panduan Skor",
          hint: "Rumus & fungsi KPI per departemen",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "master",
      label: "Master Data",
      hint: "Referensi & akses",
      roles: ["admin", "it_staff"],
      children: [
        {
          href: "/master/attendance",
          label: "Absensi & Kedisiplinan",
          hint: "Impor Excel absensi / lembur",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/departments",
          label: "Departemen",
          hint: "Data departemen",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/staff",
          label: "Staf",
          hint: "Karyawan & manager",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/kpi-functions",
          label: "Fungsi KPI",
          hint: "Bobot & fokus penilaian",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/kpi-score-rules",
          label: "Aturan Skor KPI",
          hint: "Indikator, target & skala per dept",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/kpi-score-templates",
          label: "Template Indikator",
          hint: "Buat & terapkan template skor KPI",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/it-team",
          label: "Tim IT",
          hint: "IT Staff & IT Manager",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/users",
          label: "User & Role",
          hint: "Login, password, role",
          roles: ["admin", "it_staff"],
        },
      ],
    },
  },
];

function filterNavChildren(children: NavChild[], role: UserRole): NavChild[] {
  const result: NavChild[] = [];
  for (const child of children) {
    if (isNavSubGroup(child)) {
      if (!child.roles.includes(role)) continue;
      const nested = child.children.filter((c) => c.roles.includes(role));
      if (nested.length === 0) continue;
      result.push({ ...child, children: nested });
      continue;
    }
    if (child.roles.includes(role)) result.push(child);
  }
  return result;
}

export function navForRole(role: UserRole): NavEntry[] {
  const result: NavEntry[] = [];
  for (const entry of NAV_ENTRIES) {
    if (entry.type === "link") {
      if (entry.item.roles.includes(role)) result.push(entry);
      continue;
    }
    if (!entry.group.roles.includes(role)) continue;
    const children = filterNavChildren(entry.group.children, role);
    if (children.length === 0) continue;
    result.push({
      type: "group",
      group: { ...entry.group, children },
    });
  }
  return result;
}

export function flattenNav(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => {
    if (entry.type === "link") return [entry.item];
    return entry.group.children.flatMap((child) =>
      isNavSubGroup(child) ? child.children : [child],
    );
  });
}

/** Katalog semua menu (untuk form admin) */
export function listMenuCatalog(): Array<{
  href: string;
  label: string;
  group: string;
}> {
  const rows: Array<{ href: string; label: string; group: string }> = [];
  for (const entry of NAV_ENTRIES) {
    if (entry.type === "link") {
      rows.push({
        href: entry.item.href,
        label: entry.item.label,
        group: "Umum",
      });
      continue;
    }
    for (const child of entry.group.children) {
      if (isNavSubGroup(child)) {
        for (const item of child.children) {
          rows.push({
            href: item.href,
            label: item.label,
            group: `${entry.group.label} › ${child.label}`,
          });
        }
      } else {
        rows.push({
          href: child.href,
          label: child.label,
          group: entry.group.label,
        });
      }
    }
  }
  return rows;
}

export function defaultMenuHrefsForRole(role: UserRole): string[] {
  return flattenNav(navForRole(role)).map((i) => i.href);
}

export function effectiveMenuHrefs(user: SessionUser): string[] {
  if (user.allowedMenus != null) return user.allowedMenus;
  return defaultMenuHrefsForRole(user.role);
}

function filterNavByAllowList(
  entries: NavEntry[],
  allow: Set<string>,
): NavEntry[] {
  const result: NavEntry[] = [];
  for (const entry of entries) {
    if (entry.type === "link") {
      if (allow.has(entry.item.href)) result.push(entry);
      continue;
    }
    const children: NavChild[] = [];
    for (const child of entry.group.children) {
      if (isNavSubGroup(child)) {
        const nested = child.children.filter((c) => allow.has(c.href));
        if (nested.length) children.push({ ...child, children: nested });
      } else if (allow.has(child.href)) {
        children.push(child);
      }
    }
    if (children.length) {
      result.push({
        type: "group",
        group: { ...entry.group, children },
      });
    }
  }
  return result;
}

/** Nav efektif: default role, atau allowlist per-user jika di-set admin */
export function navForUser(user: SessionUser): NavEntry[] {
  const allow = new Set(effectiveMenuHrefs(user));
  // Mulai dari katalog penuh, filter by allow — agar admin bisa menambah menu di luar default role
  return filterNavByAllowList(NAV_ENTRIES, allow);
}

export function canAccessMenu(user: SessionUser, href: string): boolean {
  const allow = effectiveMenuHrefs(user);
  return allow.some(
    (h) => href === h || (h !== "/" && href.startsWith(`${h}/`)),
  );
}

/**
 * Scope departemen efektif.
 * - "all" = semua departemen
 * - string[] = hanya id tersebut
 */
export function getEffectiveDepartmentScope(
  user: SessionUser,
): "all" | string[] {
  if (user.departmentScope != null) {
    if (user.departmentScope.includes("*")) return "all";
    return user.departmentScope;
  }
  if (user.role === "staff") {
    return user.departmentId ? [user.departmentId] : [];
  }
  return "all";
}

export function isDepartmentScopeLimited(user: SessionUser): boolean {
  return getEffectiveDepartmentScope(user) !== "all";
}

export function canAccessDepartment(
  user: SessionUser,
  departmentId: string,
): boolean {
  const scope = getEffectiveDepartmentScope(user);
  if (scope === "all") return true;
  return scope.includes(departmentId);
}

export function publicUser(user: SessionUser) {
  return user;
}
