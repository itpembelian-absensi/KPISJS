"use client";

import { useState } from "react";

export function CustomerCodeStartForm({ initial }: { initial: number }) {
  const [start, setStart] = useState(String(initial));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/pengajuan/customer-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: Number(start) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Gagal menyimpan counter",
        );
        setLoading(false);
        return;
      }
      setStart(String(data.start));
      setMessage(`Counter awal disimpan: ${data.start}`);
      setLoading(false);
    } catch {
      setError("Koneksi gagal — coba lagi");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-4 print:hidden md:p-5">
      <div>
        <h2 className="text-sm font-semibold">Counter awal kode customer</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Kode otomatis: 2 huruf depan nama + nomor 3 digit. Contoh nama Toko
          Maju menjadi TO001. Nomor baru tidak lebih kecil dari angka ini, dan
          tidak mengulang kode yang sudah terpakai.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Mulai dari
          </span>
          <input
            type="number"
            min={1}
            max={999}
            step={1}
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand sm:w-32"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan counter"}
        </button>
      </div>
      {message ? <p className="text-sm text-brand-deep">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
