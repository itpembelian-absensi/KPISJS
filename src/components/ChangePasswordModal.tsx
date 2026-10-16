"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/types";

interface ChangePasswordFormProps {
  user?: SessionUser | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function ChangePasswordForm({
  user,
  onSuccess,
  onCancel,
  isModal = false,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Masukkan password Anda saat ini.");
      return;
    }
    if (!newPassword) {
      setError("Masukkan password baru yang diinginkan.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Password baru tidak boleh sama dengan password saat ini.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal mengubah password.");
      }

      setSuccess("Password Anda berhasil diperbarui! Silakan gunakan password baru ini untuk login berikutnya.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferent = newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account Info Pill */}
      {user ? (
        <div className="flex items-center justify-between rounded-xl bg-bg-elevated/70 px-3.5 py-2 text-xs border border-line">
          <div>
            <p className="font-semibold text-ink">{user.name}</p>
            <p className="text-[11px] text-ink-muted">Username: <span className="mono font-medium text-ink">@{user.username}</span></p>
          </div>
          <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
            {user.role.toUpperCase()}
          </span>
        </div>
      ) : null}

      {/* Error Message */}
      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      ) : null}

      {/* Success Message */}
      {success ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <svg className="h-4 w-4 shrink-0 mt-0.5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 font-semibold">{success}</div>
        </div>
      ) : null}

      {/* Password Saat Ini */}
      <div>
        <label className="block text-xs font-semibold text-ink">
          Password Saat Ini <span className="text-danger">*</span>
        </label>
        <div className="relative mt-1">
          <input
            type={showCurrent ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Masukkan password saat ini"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 pr-10 text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink"
            tabIndex={-1}
            title={showCurrent ? "Sembunyikan password" : "Lihat password"}
          >
            {showCurrent ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Password Baru */}
      <div>
        <label className="block text-xs font-semibold text-ink">
          Password Baru <span className="text-danger">*</span>
        </label>
        <div className="relative mt-1">
          <input
            type={showNew ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Minimal 6 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 pr-10 text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink"
            tabIndex={-1}
            title={showNew ? "Sembunyikan password" : "Lihat password"}
          >
            {showNew ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Konfirmasi Password Baru */}
      <div>
        <label className="block text-xs font-semibold text-ink">
          Konfirmasi Password Baru <span className="text-danger">*</span>
        </label>
        <div className="relative mt-1">
          <input
            type={showConfirm ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 pr-10 text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink"
            tabIndex={-1}
            title={showConfirm ? "Sembunyikan password" : "Lihat password"}
          >
            {showConfirm ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Checklist Persyaratan Password */}
      {newPassword.length > 0 ? (
        <div className="rounded-xl bg-bg-elevated/40 p-2.5 text-[11px] space-y-1 border border-line/60">
          <div className={`flex items-center gap-1.5 ${isMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-ink-muted"}`}>
            <span>{isMinLength ? "✓" : "○"}</span>
            <span>Minimal 6 karakter</span>
          </div>
          {currentPassword ? (
            <div className={`flex items-center gap-1.5 ${isDifferent ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400"}`}>
              <span>{isDifferent ? "✓" : "○"}</span>
              <span>Berbeda dari password saat ini</span>
            </div>
          ) : null}
          {confirmPassword ? (
            <div className={`flex items-center gap-1.5 ${isMatch ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-danger"}`}>
              <span>{isMatch ? "✓" : "×"}</span>
              <span>{isMatch ? "Konfirmasi password cocok" : "Konfirmasi password belum cocok"}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Buttons */}
      <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
        {onCancel ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-bg-elevated hover:text-ink disabled:opacity-50"
          >
            Batal
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting || !isMinLength || (confirmPassword.length > 0 && !isMatch)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-deep disabled:opacity-50 transition active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Simpan Password Baru</span>
          )}
        </button>
      </div>
    </form>
  );
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser | null;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Ganti Password</h3>
              <p className="text-xs text-ink-muted">Ubah password akun login Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-muted hover:bg-bg-elevated hover:text-ink"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <ChangePasswordForm
          user={user}
          onSuccess={onClose}
          onCancel={onClose}
          isModal
        />
      </div>
    </div>
  );
}
