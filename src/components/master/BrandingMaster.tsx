"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  DEFAULT_APP_TAGLINE,
  DEFAULT_APP_TITLE,
  THEME_OPTIONS,
  type AppBranding,
  type ThemeId,
} from "@/lib/branding-types";

export function BrandingMaster({ initial }: { initial: AppBranding }) {
  const router = useRouter();
  const [name, setName] = useState(initial.companyName);
  const [title, setTitle] = useState(initial.appTitle);
  const [tagline, setTagline] = useState(initial.appTagline);
  const [themeId, setThemeId] = useState<ThemeId>(initial.themeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(
    e: FormEvent<HTMLFormElement> | null,
    nextTheme?: ThemeId,
  ) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const theme = nextTheme ?? themeId;
    try {
      const res = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, themeId: theme }),
      });
      const data = (await res.json()) as AppBranding & { error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setName(data.companyName);
      setTitle(data.appTitle);
      setTagline(data.appTagline);
      setThemeId(data.themeId);
      document.documentElement.dataset.theme = data.themeId;
      setSaved(true);
      router.refresh();
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function pickTheme(id: ThemeId) {
    setThemeId(id);
    document.documentElement.dataset.theme = id;
    void save(null, id);
  }

  async function saveCopy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appTitle: title, appTagline: tagline }),
      });
      const data = (await res.json()) as AppBranding & { error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setTitle(data.appTitle);
      setTagline(data.appTagline);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function resetCopy() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAppCopy: true }),
      });
      const data = (await res.json()) as AppBranding & { error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal mengembalikan default");
        return;
      }
      setTitle(data.appTitle);
      setTagline(data.appTagline);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Gagal mengembalikan default");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => void save(e)}
        className="panel space-y-4 p-4 sm:p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Nama perusahaan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Tampil di sidebar dan halaman login. Kosongkan jika tidak dipakai.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-xs tracking-wide text-ink-muted uppercase">
            Nama
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Contoh: PT Sahabat Jaya Sukses"
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-ok">Pengaturan tersimpan.</p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan nama"}
        </button>
      </form>

      <form
        onSubmit={(e) => void saveCopy(e)}
        className="panel space-y-4 p-4 sm:p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Judul & subjudul sidebar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Teks di bawah nama perusahaan pada menu kiri. Bisa dikembalikan ke
            default kapan saja.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-xs tracking-wide text-ink-muted uppercase">
            Judul
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder={DEFAULT_APP_TITLE}
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs tracking-wide text-ink-muted uppercase">
            Subjudul
          </span>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder={DEFAULT_APP_TAGLINE}
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-ok">Pengaturan tersimpan.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan teks"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void resetCopy()}
            className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink-muted hover:bg-bg disabled:opacity-60"
          >
            Kembali ke default
          </button>
        </div>
      </form>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Logo perusahaan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Tampil di pojok kanan atas. Jika belum diunggah, area itu kosong.
            Format JPG, PNG, atau WebP (maksimal 2MB).
          </p>
        </div>
        <CompanyLogo url={initial.logoUrl} canEdit size="lg" />
      </div>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Tema / warna aplikasi</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pilih palet warna. Default mengembalikan ke mint sage seperti
              tampilan awal.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || themeId === "default"}
            onClick={() => pickTheme("default")}
            className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg disabled:opacity-50"
          >
            Kembali ke default
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const active = themeId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pickTheme(opt.id)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-brand bg-brand-soft ring-1 ring-brand/30"
                    : "border-line hover:bg-bg"
                }`}
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-line"
                  style={{ background: opt.swatch }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-ink-muted">
                    {opt.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
