"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm({
  logoUrl,
  companyName,
  appTitle,
}: {
  logoUrl: string | null;
  companyName: string;
  appTitle: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: fd.get("username"),
        password: fd.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login gagal");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
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
          Masuk dengan akun yang diberikan Administrator.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-xs tracking-wide text-ink-muted uppercase">
              Username
            </span>
            <input
              name="username"
              required
              autoComplete="username"
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
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>

          <p className="text-center text-sm">
            <a
              href="/login/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              Lupa password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage({
  logoUrl,
  companyName,
  appTitle,
}: {
  logoUrl: string | null;
  companyName: string;
  appTitle: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
          Memuat...
        </div>
      }
    >
      <LoginForm
        logoUrl={logoUrl}
        companyName={companyName}
        appTitle={appTitle}
      />
    </Suspense>
  );
}
