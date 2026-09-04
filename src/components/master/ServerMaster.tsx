"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ItServer, AssetCategory } from "@/lib/types";

export function ServerMaster({ initial }: { initial: ItServer[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<ItServer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<AssetCategory>("Server");

  const filteredItems = items.filter((i) => i.category === activeTab || (!i.category && activeTab === "Server"));

  async function deleteServer(id: string) {
    if (!confirm("Yakin ingin menghapus item ini beserta seluruh log dan kredensialnya?")) return;
    try {
      const res = await fetch(`/api/servers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Gagal menghapus item");
        return;
      }
      setItems((prev) => prev.filter((s) => s.id !== id));
      if (editing?.id === id) {
        setEditing(null);
        setShowPassword(false);
      }
      router.refresh();
    } catch {
      alert("Koneksi gagal");
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const data = {
        category: activeTab,
        name: fd.get("name"),
        ipAddress: fd.get("ipAddress"),
        url: fd.get("url"),
        username: fd.get("username"),
        password: fd.get("password"),
        hardwareSpec: fd.get("hardwareSpec"),
        os: fd.get("os"),
        location: fd.get("location"),
        notes: fd.get("notes"),
        active: fd.get("active") === "on",
      };

      const url = editing ? `/api/servers/${editing.id}` : `/api/servers`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan");
        return;
      }

      if (editing) {
        setItems(items.map((x) => (x.id === editing.id ? json : x)));
      } else {
        setItems([...items, json]);
      }
      setEditing(null);
      setShowPassword(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const TabButton = ({ category, label }: { category: AssetCategory; label: string }) => (
    <button
      type="button"
      onClick={() => {
        setActiveTab(category);
        setEditing(null); // Reset editing when switching tabs
        setShowPassword(false);
        setError(null);
      }}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === category
          ? "border-brand text-brand"
          : "border-transparent text-ink-muted hover:text-ink hover:border-line"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex border-b border-line mb-4 overflow-x-auto whitespace-nowrap">
        <TabButton category="Server" label="Server & Hardware" />
        <TabButton category="Aplikasi" label="Aplikasi & Software" />
        <TabButton category="Domain/Email" label="Domain & Email" />
        <TabButton category="Lainnya" label="Lainnya" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <form onSubmit={save} className="panel h-fit space-y-4 p-5">
          <h2 className="font-semibold text-lg">
            {editing ? `Edit ${activeTab}` : `Tambah ${activeTab}`}
          </h2>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Nama {activeTab}</span>
            <input
              name="name"
              required
              defaultValue={editing?.name}
              key={`name-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              placeholder={`Contoh: ${
                activeTab === "Server" ? "SRV-DB-01" : 
                activeTab === "Aplikasi" ? "Sistem HRIS" : 
                activeTab === "Domain/Email" ? "google.com" : "Router Utama"
              }`}
            />
          </label>

          {activeTab === "Server" && (
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">IP Address</span>
              <input
                name="ipAddress"
                defaultValue={editing?.ipAddress}
                key={`ipAddress-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="Contoh: 192.168.1.100"
              />
            </label>
          )}

          {(activeTab === "Aplikasi" || activeTab === "Domain/Email" || activeTab === "Lainnya") && (
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">URL / Alamat IP</span>
              <input
                name="url"
                defaultValue={editing?.url}
                key={`url-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder={activeTab === "Domain/Email" ? "Contoh: https://example.com" : "Contoh: 10.10.1.5:8080"}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Username Utama</span>
              <input
                name="username"
                defaultValue={editing?.username}
                key={`user-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="opsional"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted flex justify-between">
                Password
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-brand hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                defaultValue={editing?.password}
                key={`pass-${editing?.id ?? "new"}`}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="opsional"
              />
            </label>
          </div>

          {activeTab === "Server" && (
            <>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">OS</span>
                <input
                  name="os"
                  defaultValue={editing?.os}
                  key={`os-${editing?.id ?? "new"}`}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  placeholder="Contoh: Windows Server 2019"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Spesifikasi Hardware</span>
                <textarea
                  name="hardwareSpec"
                  rows={2}
                  defaultValue={editing?.hardwareSpec}
                  key={`hw-${editing?.id ?? "new"}`}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  placeholder="Contoh: RAM 32GB, SSD 1TB, Xeon..."
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Lokasi</span>
                <input
                  name="location"
                  defaultValue={editing?.location}
                  key={`location-${editing?.id ?? "new"}`}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                  placeholder="Contoh: Rak 1 Data Center"
                />
              </label>
            </>
          )}

          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Catatan Tambahan</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editing?.notes}
              key={`notes-${editing?.id ?? "new"}`}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editing?.active ?? true}
              key={`active-${editing?.id ?? "new"}`}
            />
            Aktif
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setShowPassword(false);
                }}
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3 flex justify-between items-center">
            <h2 className="font-semibold">Daftar {activeTab}</h2>
            <span className="text-xs font-medium bg-bg-subtle px-2 py-0.5 rounded border border-line">
              Total: {filteredItems.length}
            </span>
          </div>
          <div className="divide-y divide-line">
            {filteredItems.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-elevated"
              >
                <div>
                  <Link
                    href={`/master/servers/${s.id}`}
                    className="font-medium text-brand hover:underline flex items-center gap-2"
                  >
                    <span>
                      {s.category === "Server" ? "🖥️" : 
                       s.category === "Aplikasi" ? "📦" : 
                       s.category === "Domain/Email" ? "🌐" : "🔧"}
                    </span>
                    {s.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                    {s.category === "Server" && (
                      <>
                        <span>IP: {s.ipAddress || "—"}</span>
                        <span>OS: {s.os || "—"}</span>
                      </>
                    )}
                    {s.category !== "Server" && (
                      <span>URL/IP: {s.url || "—"}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] ${
                      s.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                    }`}
                  >
                    {s.active ? "Aktif" : "Nonaktif"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(s);
                      setShowPassword(false);
                    }}
                    className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg-elevated"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteServer(s.id)}
                    className="rounded-lg border border-danger/30 text-danger bg-danger/5 px-2 py-1 text-xs hover:bg-danger hover:text-white transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="p-10 text-center text-sm text-ink-muted">
                Belum ada data {activeTab}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
