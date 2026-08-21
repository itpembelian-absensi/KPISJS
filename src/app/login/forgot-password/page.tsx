"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: fd.get("username"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal mengirim permintaan");
      return;
    }
    setSuccess(data.message || "Permintaan sudah dikirim ke Administrator.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-6 md:p-8">
        <p className="mono text-[11px] tracking-[0.18em] text-brand uppercase">
          SJS · IT Systems
        </p>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Lupa password
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Ajukan permintaan reset. Password tidak bisa diubah sendiri — Admin
          atau IT Staf yang akan mengatur password baru.
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
              disabled={Boolean(success)}
              className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand disabled:opacity-60"
              placeholder="username login"
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {success ? <p className="text-sm text-ok">{success}</p> : null}

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Mengirim..." : "Ajukan reset ke Admin"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Kembali ke login
          </Link>
        </p>

        <div className="mt-5 rounded-xl bg-bg px-3 py-3 text-xs text-ink-muted">
          <p className="font-medium text-ink">Catatan</p>
          <p className="mt-1 leading-relaxed">
            Setelah Admin mengatur password baru, Anda bisa masuk kembali.
            Hubungi IT jika permintaan belum ditindaklanjuti.
          </p>
        </div>
      </div>
    </div>
  );
}
