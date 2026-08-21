"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultMenuHrefsForRole,
  listMenuCatalog,
} from "@/lib/auth";
import {
  ROLE_LABEL,
  type Department,
  type PasswordResetRequest,
  type StaffMember,
  type UserAccount,
  type UserRole,
} from "@/lib/types";

type UserRow = Omit<UserAccount, "passwordHash">;

const MENU_CATALOG = listMenuCatalog();

export function UserMaster({
  initial,
  staff,
  departments,
  initialResets,
}: {
  initial: UserRow[];
  staff: StaffMember[];
  departments: Department[];
  initialResets: PasswordResetRequest[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pendingResets, setPendingResets] = useState(initialResets);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<UserRole>(editing?.role ?? "staff");
  const [customMenus, setCustomMenus] = useState(false);
  const [selectedMenus, setSelectedMenus] = useState<string[]>(() =>
    defaultMenuHrefsForRole("staff"),
  );
  const [scopeMode, setScopeMode] = useState<"inherit" | "all" | "custom">(
    "inherit",
  );
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [linkedStaffId, setLinkedStaffId] = useState("");
  const [assessStaffIds, setAssessStaffIds] = useState<string[]>([]);

  function staffName(id: string | null) {
    if (!id) return "—";
    return staff.find((s) => s.id === id)?.name ?? "—";
  }

  function startEdit(u: UserRow | null, opts?: { requirePassword?: boolean }) {
    setEditing(u);
    setError(null);
    setMessage(null);
    setPasswordRequired(Boolean(opts?.requirePassword));
    const nextRole = u?.role ?? "staff";
    setRole(nextRole);
    setLinkedStaffId(u?.staffId ?? "");
    setAssessStaffIds(u?.assessmentStaffIds ?? []);
    if (u?.allowedMenus != null) {
      setCustomMenus(true);
      setSelectedMenus(u.allowedMenus);
    } else {
      setCustomMenus(false);
      setSelectedMenus(defaultMenuHrefsForRole(nextRole));
    }
    if (u?.departmentScope == null) {
      setScopeMode("inherit");
      setSelectedDepts([]);
    } else if (u.departmentScope.includes("*")) {
      setScopeMode("all");
      setSelectedDepts([]);
    } else {
      setScopeMode("custom");
      setSelectedDepts(u.departmentScope);
    }
  }

  function onRoleChange(next: UserRole) {
    setRole(next);
    if (!customMenus) {
      setSelectedMenus(defaultMenuHrefsForRole(next));
    }
  }

  async function removeUser(u: UserRow) {
    const ok = window.confirm(
      `Hapus user "${u.username}" (${ROLE_LABEL[u.role]})?\n\nSession login user ini juga akan dihapus.`,
    );
    if (!ok) return;

    setError(null);
    setMessage(null);
    const res = await fetch(`/api/master/users?id=${encodeURIComponent(u.id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus user");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== u.id));
    if (editing?.id === u.id) startEdit(null);
    setPendingResets((prev) => prev.filter((r) => r.userId !== u.id));
    setMessage(`User "${u.username}" berhasil dihapus`);
    router.refresh();
  }

  async function rejectReset(req: PasswordResetRequest) {
    const ok = window.confirm(
      `Tolak permintaan reset untuk "${req.username}"?`,
    );
    if (!ok) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/master/password-resets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: req.id, action: "reject" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menolak permintaan");
      return;
    }
    setPendingResets((prev) => prev.filter((r) => r.id !== req.id));
    if (editing?.id === req.userId) setPasswordRequired(false);
    setMessage(`Permintaan reset "${req.username}" ditolak`);
    router.refresh();
  }

  function startResetFromRequest(req: PasswordResetRequest) {
    const u = items.find((x) => x.id === req.userId);
    if (!u) {
      setError("User tidak ditemukan");
      return;
    }
    startEdit(u, { requirePassword: true });
  }

  function formatResetAt(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
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
      if (passwordRequired && !password) {
        setError("Isi password baru untuk menyelesaikan permintaan reset");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/master/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
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
      setItems((prev) => {
        const exists = prev.some((x) => x.id === data.user.id);
        if (exists) {
          return prev.map((x) => (x.id === data.user.id ? data.user : x));
        }
        return [...prev, data.user];
      });
      if (password) {
        setPendingResets((prev) =>
          prev.filter((r) => r.userId !== data.user.id),
        );
      }
      startEdit(null);
      (e.target as HTMLFormElement).reset();
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

  const formKey = editing?.id ?? "new";
  const showAssessList = role === "manager" || role === "assessor";
  const homeDeptId = useMemo(() => {
    const sid = linkedStaffId || editing?.staffId || "";
    return staff.find((s) => s.id === sid)?.departmentId ?? null;
  }, [linkedStaffId, editing?.staffId, staff]);
  const assessCandidates = useMemo(() => {
    return staff
      .filter(
        (s) =>
          s.active &&
          (!homeDeptId || s.departmentId !== homeDeptId),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, homeDeptId]);
  const deptName = (id: string) =>
    departments.find((d) => d.id === id)?.code ?? "?";

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}

      {pendingResets.length > 0 ? (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
          <p className="text-sm font-medium text-warn">
            Permintaan reset password ({pendingResets.length})
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            User tidak bisa mengubah password sendiri. Atur password baru, lalu
            sampaikan ke yang bersangkutan.
          </p>
          <div className="mt-3 space-y-2">
            {pendingResets.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="mono text-sm font-medium">{r.username}</p>
                  <p className="text-[11px] text-ink-muted">
                    Diajukan {formatResetAt(r.requestedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startResetFromRequest(r)}
                    className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white"
                  >
                    Atur password
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectReset(r)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <form
          key={formKey}
          onSubmit={save}
          className="panel space-y-3 p-5"
        >
          <h2 className="font-semibold">
            {editing ? "Edit user, menu & batasan" : "Tambah user login"}
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
              defaultValue={editing?.username}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">
              Password{" "}
              {editing && !passwordRequired
                ? "(kosongkan jika tidak diganti)"
                : ""}
            </span>
            <input
              name="password"
              type="password"
              required={!editing || passwordRequired}
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
                // Drop allowlist entries that become "own dept"
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
              defaultChecked={editing?.active ?? true}
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
              Off = menu mengikuti default role. On = pilih menu yang boleh
              diakses user ini.
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
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm"
                    >
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => startEdit(null)}
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-semibold">User & role ({items.length})</h2>
            <p className="text-xs text-ink-muted">
              Role + menu khusus + batasan departemen
            </p>
          </div>
          {items.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
            >
              <div className="min-w-0">
                <p className="mono text-xs text-brand">{u.username}</p>
                <p className="font-medium">{ROLE_LABEL[u.role]}</p>
                <p className="truncate text-xs text-ink-muted">
                  {staffName(u.staffId)}
                  {u.allowedMenus != null
                    ? ` · ${u.allowedMenus.length} menu custom`
                    : " · menu default role"}
                  {u.departmentScope == null
                    ? " · dept: role"
                    : u.departmentScope.includes("*")
                      ? " · dept: semua"
                      : ` · dept: ${u.departmentScope.length}`}
                  {(u.role === "manager" || u.role === "assessor") &&
                  (u.assessmentStaffIds?.length ?? 0) > 0
                    ? ` · nilai lintas: ${u.assessmentStaffIds!.length} staf`
                    : u.role === "manager" || u.role === "assessor"
                      ? " · nilai: dept sendiri"
                      : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pendingResets.some((r) => r.userId === u.id) ? (
                  <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                    Minta reset
                  </span>
                ) : null}
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    u.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                  }`}
                >
                  {u.active ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(u)}
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeUser(u)}
                  className="rounded-lg border border-danger/30 bg-danger-soft px-2 py-1 text-xs text-danger"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
