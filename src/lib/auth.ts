import type { Department, SessionUser, UserRole } from "./types";

export const SESSION_COOKIE = "sjs_session";
export const SESSION_DAYS = 7;

/** Opsi cookie session — login & logout HARUS sama agar cookie benar-benar terhapus. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/**
 * Memastikan redirect URL aman (relative path di aplikasi, bukan open redirect ke external domain).
 */
export function getSafeRedirect(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next || typeof next !== "string") return fallback;
  const trimmed = next.trim();
  // Harus diawali satu slash '/' dan bukan '//' atau '/\' atau '\\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\")
  ) {
    return fallback;
  }

  try {
    const dummyUrl = new URL(trimmed, "http://localhost");
    // Cegah redirect loop ke login atau endpoint internal api
    if (
      dummyUrl.pathname === "/login" ||
      dummyUrl.pathname.startsWith("/login/") ||
      dummyUrl.pathname.startsWith("/api/")
    ) {
      return fallback;
    }
    return `${dummyUrl.pathname}${dummyUrl.search}${dummyUrl.hash}`;
  } catch {
    return fallback;
  }
}


export function canManageMaster(role: UserRole): boolean {
  return role === "admin" || role === "it_staff";
}

/** Baca SOP: semua role yang login (isi dibatasi scope departemen). */
export function canAccessSop(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "it_staff" ||
    role === "manager" ||
    role === "staff" ||
    role === "assessor"
  );
}

/** Buat/ubah/hapus SOP: Admin & IT semua dept; Manager hanya dept-nya. */
export function canManageSop(
  user: SessionUser,
  departmentId?: string,
): boolean {
  if (user.role === "admin" || user.role === "it_staff") {
    if (!departmentId) return true;
    return canAccessDepartment(user, departmentId);
  }
  if (user.role === "manager") {
    if (!departmentId) {
      const scope = getEffectiveDepartmentScope(user);
      return scope === "all" || scope.length > 0;
    }
    return canAccessDepartment(user, departmentId);
  }
  return false;
}

/** Departemen aktif yang boleh dilihat user (SOP / filter). */
export function departmentsVisibleToUser(
  user: SessionUser,
  departments: Department[],
): Department[] {
  const scope = getEffectiveDepartmentScope(user);
  const list = departments.filter((d) => d.active);
  if (scope === "all") return list;
  return list.filter((d) => scope.includes(d.id));
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

/** Staf & penilai hanya melihat pengajuan sendiri. Manager mengikuti scope departemen. */
export function canSeePengajuan(
  user: SessionUser,
  row: { requesterStaffId: string | null; departmentId: string },
): boolean {
  if (user.role === "admin" || user.role === "it_staff") return true;
  if (user.staffId && row.requesterStaffId === user.staffId) return true;
  if (user.role === "manager") {
    const scope = getEffectiveDepartmentScope(user);
    if (scope === "all") return true;
    return scope.includes(row.departmentId);
  }
  return false;
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
    type: "group",
    group: {
      id: "tiket-perintah",
      label: "Tiket dan Perintah",
      hint: "Buat tiket support & perintah kerja",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
      children: [
        {
          href: "/tickets/new",
          label: "Buat Tiket",
          hint: "Request support baru",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/work-orders/new",
          label: "Buat Perintah",
          hint: "Tugas project / inovasi / security",
          roles: ["admin", "manager", "it_staff"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "pengajuan",
      label: "Pengajuan",
      hint: "Permintaan resmi yang perlu persetujuan",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
      children: [
        {
          href: "/pengajuan",
          label: "Semua Pengajuan",
          hint: "Status seluruh formulir",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/void",
          label: "Approve & Void",
          hint: "Setujui atau batalkan transaksi",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/customer",
          label: "Master Customer",
          hint: "Tambah atau ubah data customer",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/perubahan",
          label: "Perubahan Data Orlansoft",
          hint: "Ubah data master yang sudah ada",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/asset",
          label: "Asset IT",
          hint: "Ajukan perangkat IT baru",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/barang",
          label: "Master Item / Stock",
          hint: "Tambah item / barang baru",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/pengajuan/akses",
          label: "Akses Sistem",
          hint: "User baru, hak akses, reset",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "antrian",
      label: "Antrian & Hasil Kerja",
      hint: "Tiket, perintah kerja & penilaian",
      roles: ["admin", "manager", "staff", "it_staff", "assessor"],
      children: [
        {
          href: "/tickets",
          label: "Antrian Tiket",
          hint: "Queue & assignment",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
        {
          href: "/work-orders",
          label: "Antrian Tugas",
          hint: "Perintah & proses kerja",
          roles: ["admin", "manager", "it_staff"],
        },
        {
          href: "/tickets/rate",
          label: "Nilai Hasil Kerja",
          hint: "Rating kepuasan tiket selesai",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "kpi",
      label: "SOP & KPI",
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
          href: "/master/sops",
          label: "SOP",
          hint: "Prosedur kerja per departemen",
          roles: ["admin", "manager", "staff", "it_staff", "assessor"],
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
          href: "/kpi/function-report",
          label: "Laporan Fungsi KPI",
          hint: "Fungsi & bobot per departemen",
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
      hint: "Referensi data",
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
          href: "/master/servers",
          label: "Dokumentasi IT",
          hint: "Server, Aplikasi & Akun",
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
          href: "/master/asset-categories",
          label: "Kategori Aset",
          hint: "Pilihan kategori pengajuan asset IT",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/jenis-data",
          label: "Jenis Data",
          hint: "Pilihan jenis data Perubahan Data Orlansoft",
          roles: ["admin", "it_staff"],
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "setting",
      label: "Setting",
      hint: "Pengaturan aplikasi",
      roles: ["admin", "it_staff"],
      children: [
        {
          href: "/master/users",
          label: "User & Role",
          hint: "Login, password, role",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/approval-pengajuan",
          label: "Approval Pengajuan",
          hint: "Rantai persetujuan bertingkat",
          roles: ["admin"],
        },
        {
          href: "/master/branding",
          label: "Identitas & Tema",
          hint: "Nama, logo, dan warna aplikasi",
          roles: ["admin", "it_staff"],
        },
        {
          href: "/master/backup",
          label: "Backup & Restore",
          hint: "Salin / timpa database SQLite",
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
