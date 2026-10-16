"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type DepartmentOption = { id: string; name: string };

export function SignupForm({
  logoUrl,
  companyName,
  appTitle,
  departments,
}: {
  logoUrl: string | null;
  companyName: string;
  appTitle: string;
  departments: DepartmentOption[];
}) {
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    const passwordConfirm = String(fd.get("passwordConfirm") || "");
    if (password !== passwordConfirm) {
      setError("Konfirmasi password tidak sama");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        username: fd.get("username"),
        password,
        passwordConfirm,
        position: fd.get("position"),
        role,
        departmentId: fd.get("departmentId"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal membuat akun");
      return;
    }
    setDone(true);
    form.reset();
    setRole("staff");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-6 md:p-8">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Logo perusahaan"
            className="mb-4 h-16 max-w-[16rem] object-contain"
          />
        ) : null}
        <p className="mono break-words text-[11px] font-semibold leading-snug tracking-wide text-brand uppercase">
          {companyName.trim() || "SJS · IT Systems"}
        </p>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          {appTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Buat akun sendiri jika Anda belum punya username dan password.
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
              Akun berhasil dibuat. Silakan masuk dengan username dan password
              yang baru saja Anda buat.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-xl bg-brand py-2.5 text-center text-sm font-medium text-white hover:bg-brand-deep"
            >
              Ke halaman masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Nama
              </span>
              <input
                name="name"
                required
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                placeholder="Nama lengkap"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Username
              </span>
              <input
                name="username"
                required
                autoComplete="username"
                pattern="[A-Za-z0-9._-]+"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                placeholder="username"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Password
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                placeholder="minimal 6 karakter"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Konfirmasi password
              </span>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                placeholder="ulangi password"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Jabatan
              </span>
              <input
                name="position"
                required
                maxLength={80}
                autoComplete="organization-title"
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                placeholder="Contoh: Staff Accounting"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Departemen
              </span>
              <select
                name="departmentId"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Pilih departemen
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-ink-muted uppercase">
                Role
              </span>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value === "manager" ? "manager" : "staff")
                }
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
              >
                <option value="staff">Staf</option>
                <option value="manager">Manager</option>
              </select>
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || departments.length === 0}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {loading ? "Mendaftar..." : "Daftar"}
            </button>

            <p className="text-center text-sm">
              <Link href="/login" className="font-medium text-brand hover:underline">
                Sudah punya akun? Masuk
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
