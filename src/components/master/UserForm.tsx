"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultMenuHrefsForRole,
  listMenuCatalog,
} from "@/lib/auth";
import {
  ROLE_LABEL,
  type Department,
  type StaffMember,
  type UserAccount,
  type UserRole,
} from "@/lib/types";

type UserRow = Omit<UserAccount, "passwordHash">;

const MENU_CATALOG = listMenuCatalog();

export function UserForm({
  staff,
  departments,
  initial,
  passwordRequired = false,
}: {
  staff: StaffMember[];
  departments: Department[];
  initial?: UserRow | null;
  passwordRequired?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<UserRole>(initial?.role ?? "staff");
  const [customMenus, setCustomMenus] = useState(initial?.allowedMenus != null);
  const [selectedMenus, setSelectedMenus] = useState<string[]>(
    initial?.allowedMenus ?? defaultMenuHrefsForRole(initial?.role ?? "staff"),
  );
  const [scopeMode, setScopeMode] = useState<"inherit" | "all" | "custom">(() => {
    if (initial?.departmentScope == null) return "inherit";
    if (initial.departmentScope.includes("*")) return "all";
    return "custom";
  });
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    initial?.departmentScope && !initial.departmentScope.includes("*")
      ? initial.departmentScope
      : [],
  );
  const [linkedStaffId, setLinkedStaffId] = useState(initial?.staffId ?? "");
  const [assessStaffIds, setAssessStaffIds] = useState<string[]>(
    initial?.assessmentStaffIds ?? [],
  );

  function onRoleChange(next: UserRole) {
    setRole(next);
    if (!customMenus) {
      setSelectedMenus(defaultMenuHrefsForRole(next));
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const password = String(fd.get("password") || "");
      const allowedMenus = customMenus ? selectedMenus : null;
      const departmentScope =
        scopeMode === "inherit"
          ? null
          : scopeMode === "all"
            ? ["*"]
            : selectedDepts;

      if (customMenus && selectedMenus.length === 0) {
        setError("Pilih minimal satu menu, atau matikan Atur menu khusus");
        setSaving(false);
        return;
      }
      if (scopeMode === "custom" && selectedDepts.length === 0) {
        setError("Pilih minimal satu departemen, atau ganti mode batasan");
        setSaving(false);
        return;
      }
      if ((passwordRequired || !isEdit) && !password) {
        setError(
          passwordRequired
            ? "Isi password baru untuk menyelesaikan permintaan reset"
            : "Password wajib diisi",
        );
        setSaving(false);
        return;
      }

      const res = await fetch("/api/master/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initial?.id,
          username: fd.get("username"),
          password: password || undefined,
          role,
          staffId: fd.get("staffId") || null,
          active: fd.get("active") === "on",
          allowedMenus,
          departmentScope,
          assessmentStaffIds:
            role === "manager" || role === "assessor" ? assessStaffIds : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      router.push("/master/users");
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const roles = Object.keys(ROLE_LABEL) as UserRole[];
  const menusByGroup = useMemo(() => {
    const map = new Map<string, typeof MENU_CATALOG>();
    for (const m of MENU_CATALOG) {
      const list = map.get(m.group) ?? [];
      list.push(m);
      map.set(m.group, list);
    }
    return [...map.entries()];
  }, []);

  const showAssessList = role === "manager" || role === "assessor";
  const homeDeptId = useMemo(() => {
    const sid = linkedStaffId || initial?.staffId || "";
    return staff.find((s) => s.id === sid)?.departmentId ?? null;
  }, [linkedStaffId, initial?.staffId, staff]);
  const assessCandidates = useMemo(() => {
    return staff
      .filter(
        (s) => s.active && (!homeDeptId || s.departmentId !== homeDeptId),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, homeDeptId]);
  const deptName = (id: string) =>
    departments.find((d) => d.id === id)?.code ?? "?";

  return (
    <form onSubmit={save} className="panel mx-auto max-w-3xl space-y-3 p-5">
      <h2 className="font-semibold">
        {isEdit ? "Edit user, menu & batasan" : "Tambah user login"}
      </h2>
      {passwordRequired ? (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
          Permintaan reset aktif. Isi password baru lalu simpan.
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Username</span>
        <input
          name="username"
          required
          defaultValue={initial?.username}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">
          Password{" "}
          {isEdit && !passwordRequired ? "(kosongkan jika tidak diganti)" : ""}
        </span>
        <input
          name="password"
          type="password"
          required={!isEdit || passwordRequired}
          minLength={6}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Role dasar</span>
        <select
          name="role"
          value={role}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-ink-muted">
          <strong>Penilai</strong> / <strong>Manager</strong> menilai dept
          sendiri selalu; staf dept lain dipilih di daftar di bawah.
        </p>
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Link ke master staf</span>
        <select
          name="staffId"
          value={linkedStaffId}
          onChange={(e) => {
            setLinkedStaffId(e.target.value);
            const nextHome = staff.find(
              (s) => s.id === e.target.value,
            )?.departmentId;
            if (nextHome) {
              setAssessStaffIds((prev) =>
                prev.filter((id) => {
                  const m = staff.find((s) => s.id === id);
                  return m && m.departmentId !== nextHome;
                }),
              );
            }
          }}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
        >
          <option value="">— Tidak dilink —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.employeeCode})
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={initial?.active ?? true}
        />
        Aktif
      </label>

      <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={customMenus}
            onChange={(e) => {
              const on = e.target.checked;
              setCustomMenus(on);
              if (!on) setSelectedMenus(defaultMenuHrefsForRole(role));
            }}
          />
          Atur menu khusus
        </label>
        <p className="mt-1 text-[11px] text-ink-muted">
          Off = menu mengikuti default role. On = pilih menu yang boleh diakses
          user ini.
        </p>
        {customMenus ? (
          <div className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-1">
            {menusByGroup.map(([group, menus]) => (
              <div key={group}>
                <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {group}
                </p>
                <div className="mt-1 space-y-1">
                  {menus.map((m) => (
                    <label
                      key={m.href}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedMenus.includes(m.href)}
                        onChange={(e) => {
                          setSelectedMenus((prev) =>
                            e.target.checked
                              ? [...prev, m.href]
                              : prev.filter((h) => h !== m.href),
                          );
                        }}
                      />
                      <span>
                        {m.label}
                        <span className="block text-[11px] text-ink-muted">
                          {m.href}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
        <p className="text-sm font-medium">Batasan departemen</p>
        <p className="mt-1 text-[11px] text-ink-muted">
          Mengatur filter data KPI / laporan per departemen.
        </p>
        <div className="mt-2 space-y-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scopeMode"
              checked={scopeMode === "inherit"}
              onChange={() => setScopeMode("inherit")}
            />
            Ikuti role (staf = dept sendiri; manager/penilai/admin = semua)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scopeMode"
              checked={scopeMode === "all"}
              onChange={() => setScopeMode("all")}
            />
            Semua departemen
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scopeMode"
              checked={scopeMode === "custom"}
              onChange={() => setScopeMode("custom")}
            />
            Pilih departemen tertentu
          </label>
        </div>
        {scopeMode === "custom" ? (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {departments.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDepts.includes(d.id)}
                  onChange={(e) => {
                    setSelectedDepts((prev) =>
                      e.target.checked
                        ? [...prev, d.id]
                        : prev.filter((id) => id !== d.id),
                    );
                  }}
                />
                {d.code} — {d.name}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {showAssessList ? (
        <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
          <p className="text-sm font-medium">
            Boleh menilai staf di departemen lain
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            Departemen sendiri
            {homeDeptId
              ? ` (${deptName(homeDeptId)})`
              : " (link ke master staf dulu)"}{" "}
            selalu boleh dinilai. Centang staf di dept lain yang diizinkan.
          </p>
          {!homeDeptId ? (
            <p className="mt-2 text-xs text-warn">
              Link user ke master staf agar dept sendiri terdeteksi.
            </p>
          ) : null}
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {assessCandidates.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Tidak ada staf dept lain untuk dipilih.
              </p>
            ) : (
              assessCandidates.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assessStaffIds.includes(s.id)}
                    onChange={(e) => {
                      setAssessStaffIds((prev) =>
                        e.target.checked
                          ? [...prev, s.id]
                          : prev.filter((id) => id !== s.id),
                      );
                    }}
                  />
                  <span>
                    {s.name}
                    <span className="text-ink-muted">
                      {" "}
                      · {deptName(s.departmentId)} · {s.employeeCode}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          {assessStaffIds.length > 0 ? (
            <p className="mt-2 text-[11px] text-ink-muted">
              {assessStaffIds.length} staf dept lain diizinkan.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <Link
          href="/master/users"
          className="rounded-xl border border-line px-4 py-2 text-sm"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
