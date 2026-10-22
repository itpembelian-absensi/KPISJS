"use client";

import { FormEvent, useState } from "react";

type Config = {
  host: string;
  username: string;
  deviceId: string;
  hasPassword: boolean;
};

export function WaGatewayMaster({ initial }: { initial: Config }) {
  const [host, setHost] = useState(initial.host);
  const [username, setUsername] = useState(initial.username);
  const [password, setPassword] = useState("");
  const [deviceId, setDeviceId] = useState(initial.deviceId);
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/wa-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, username, password, deviceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setHasPassword(Boolean(data.hasPassword));
      setPassword("");
      setHost(data.host || host);
      setMessage("Gateway tersimpan.");
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/wa-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.error || "Gateway tidak terhubung");
        return;
      }
      setMessage(data.detail || "Terhubung.");
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={save} className="panel max-w-xl space-y-4 p-4">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Host</span>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          placeholder="192.168.2.226:3000"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Username</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">
          Password{hasPassword ? " (kosongkan jika tidak diubah)" : ""}
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Device ID</span>
        <input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 font-mono text-xs"
          required
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={test}
          disabled={testing}
          className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-60"
        >
          {testing ? "Menguji..." : "Uji koneksi"}
        </button>
      </div>
    </form>
  );
}
