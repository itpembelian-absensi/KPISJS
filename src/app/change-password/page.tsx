import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/ChangePasswordModal";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Page Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl text-ink">
          Ganti Password
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Perbarui kata sandi login untuk keamanan akun Anda di aplikasi SJS KPI & IT Helpdesk.
        </p>
      </div>

      {/* Main Card */}
      <div className="panel p-5 sm:p-7 shadow-xs">
        <ChangePasswordForm user={user} />
      </div>
    </div>
  );
}
