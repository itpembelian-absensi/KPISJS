"use client";

import { useEffect, useRef, useState } from "react";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID");
  } catch {
    return iso;
  }
}

function StatusBanner({
  kind,
  title,
  detail,
  action,
}: {
  kind: "ok" | "error";
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  const ok = kind === "ok";
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 ${
        ok
          ? "border-ok/30 bg-ok-soft text-ok"
          : "border-danger/30 bg-danger-soft text-danger"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      {detail ? (
        <p className={`mt-1 text-sm ${ok ? "text-ink" : "text-danger"}`}>
          {detail}
        </p>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-3 rounded-lg px-3 py-1.5 text-sm font-medium ${
            ok
              ? "bg-ok text-white hover:opacity-90"
              : "border border-danger/40 bg-surface text-danger hover:bg-danger-soft"
          }`}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function BackupMaster() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<{
    exists: boolean;
    size: number;
    updatedAt: string | null;
  } | null>(null);
  const [busy, setBusy] = useState<"down" | "up" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [okDetail, setOkDetail] = useState<string | null>(null);
  const [reloadIn, setReloadIn] = useState<number | null>(null);

  async function loadInfo() {
    const res = await fetch("/api/settings/backup?info=1");
    if (!res.ok) return;
    setInfo(await res.json());
  }

  useEffect(() => {
    void loadInfo();
  }, []);

  useEffect(() => {
    if (reloadIn === null) return;
    if (reloadIn <= 0) {
      window.location.assign("/");
      return;
    }
    const t = window.setTimeout(() => setReloadIn((n) => (n ?? 1) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [reloadIn]);

  async function downloadBackup() {
    setBusy("down");
    setError(null);
    setOk(null);
    setOkDetail(null);
    setReloadIn(null);
    try {
      const res = await fetch("/api/settings/backup");
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Gagal mengunduh backup.");
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename="([^"]+)"/);
      const name = match?.[1] || "itsupport-backup.db";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOk("Backup berhasil diunduh.");
      setOkDetail(`File disimpan sebagai ${name} (${formatBytes(blob.size)}).`);
    } catch {
      setError("Gagal mengunduh backup. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function restoreFile(file: File) {
    const okConfirm = window.confirm(
      `Database saat ini akan DITIMPA oleh file:\n${file.name}\n\nLanjutkan? Data yang belum di-backup akan hilang.`,
    );
    if (!okConfirm) return;

    setBusy("up");
    setError(null);
    setOk(null);
    setOkDetail(null);
    setReloadIn(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/backup", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        setError(data.error || "Restore gagal. Database lama tidak diubah.");
        return;
      }
      setOk("Restore berhasil.");
      setOkDetail(
        `${file.name} (${formatBytes(file.size)}) sudah menimpa database. ${data.message ?? "Muat ulang halaman. Jika sesi terputus, masuk ulang."}`,
      );
      void loadInfo();
      setReloadIn(8);
    } catch {
      setError(
        "Restore gagal. Tidak ada jawaban dari server. Database mungkin tidak berubah — unduh backup baru jika ragu.",
      );
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <StatusBanner kind="error" title="Gagal" detail={error} />
      ) : null}
      {ok ? (
        <StatusBanner
          kind="ok"
          title={ok}
          detail={
            reloadIn !== null
              ? `${okDetail ?? ""} Aplikasi dimuat ulang dalam ${reloadIn} detik.`
              : (okDetail ?? undefined)
          }
          action={
            reloadIn !== null
              ? {
                  label: "Muat ulang sekarang",
                  onClick: () => window.location.assign("/"),
                }
              : undefined
          }
        />
      ) : null}

      <div className="panel space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Database saat ini</h2>
        <p className="text-sm text-ink-muted">
          File SQLite di server: <span className="mono">data/itsupport.db</span>
        </p>
        {info ? (
          <p className="text-sm">
            Ukuran {formatBytes(info.size)}
            {info.updatedAt
              ? ` · diubah ${formatWhen(info.updatedAt)}`
              : ""}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Memuat info file…</p>
        )}
      </div>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Backup ke komputer</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Unduh salinan database server ke komputer lokal. File .db ini bisa
            dipakai untuk restore di server lain atau sebaliknya.
          </p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void downloadBackup()}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy === "down" ? "Menyiapkan…" : "Unduh backup (.db)"}
        </button>
      </div>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Restore (timpa database)</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Unggah file backup .db dari komputer. Database yang ada di server
            akan diganti seluruhnya. Disarankan unduh backup dulu sebelum
            restore.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".db,application/octet-stream,application/x-sqlite3"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restoreFile(file);
          }}
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink-muted hover:bg-bg disabled:opacity-60"
        >
          {busy === "up" ? "Menimpa database…" : "Pilih file backup & restore"}
        </button>
      </div>
    </div>
  );
}
