"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-11 max-w-[9rem]",
  md: "h-16 max-w-[16rem] lg:h-20 lg:max-w-[20rem]",
  lg: "h-28 max-w-[22rem]",
};

export function CompanyLogo({
  url,
  canEdit = false,
  size = "md",
  showActions = true,
}: {
  url: string | null;
  canEdit?: boolean;
  size?: Size;
  showActions?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = canEdit && showActions;

  useEffect(() => {
    setCurrent(url);
  }, [url]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal mengunggah logo");
        return;
      }
      setCurrent(data.url ?? null);
      router.refresh();
    } catch {
      setError("Gagal mengunggah logo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("Hapus logo perusahaan?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal menghapus logo");
        return;
      }
      setCurrent(null);
      router.refresh();
    } catch {
      setError("Gagal menghapus logo");
    } finally {
      setBusy(false);
    }
  }

  if (!current && !canEdit) return null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {current ? (
        <div className="flex items-center gap-2">
          {canEdit && !actions ? (
            <button
              type="button"
              disabled={busy}
              title="Ganti logo"
              onClick={() => inputRef.current?.click()}
              className="disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current}
                alt="Logo perusahaan"
                className={`${SIZE[size]} object-contain object-right`}
              />
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current}
              alt="Logo perusahaan"
              className={`${SIZE[size]} object-contain object-right`}
            />
          )}
          {actions ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted hover:bg-bg disabled:opacity-60"
              >
                {busy ? "..." : "Ganti"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted hover:bg-bg disabled:opacity-60"
              >
                Hapus
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={
            size === "sm"
              ? "rounded-lg border border-dashed border-line px-2 py-1.5 text-[11px] text-ink-muted hover:border-brand disabled:opacity-60"
              : "rounded-xl border border-dashed border-line bg-bg-elevated px-3 py-2 text-left hover:border-brand hover:bg-brand-soft disabled:opacity-60"
          }
        >
          {size === "sm" ? (
            busy ? (
              "..."
            ) : (
              "Logo"
            )
          ) : (
            <>
              <div className="text-xs font-medium text-ink">
                {busy ? "Mengunggah..." : "Unggah logo perusahaan"}
              </div>
              <div className="text-[11px] text-ink-muted">
                JPG / PNG / WebP, maks 2MB
              </div>
            </>
          )}
        </button>
      )}

      {error ? (
        <p className="max-w-[16rem] text-right text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
