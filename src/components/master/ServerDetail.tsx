"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ItServer, ItServerLog, SessionUser, CredentialItem, AppItem } from "@/lib/types";
import Link from "next/link";

export function ServerDetail({
  server,
  initialLogs,
  sessionUser,
}: {
  server: ItServer;
  initialLogs: ItServerLog[];
  sessionUser: SessionUser;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [showPrimaryPassword, setShowPrimaryPassword] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Array states
  const [credentials, setCredentials] = useState<CredentialItem[]>(server.osCredentials || []);
  const [apps, setApps] = useState<AppItem[]>(server.apps || []);
  const [savingArrays, setSavingArrays] = useState(false);

  const isServer = server.category === "Server" || !server.category;

  // Tab State
  const [activeTab, setActiveTab] = useState<"info" | "apps" | "logbook">("info");

  async function updateArrays(newCreds: CredentialItem[], newApps: AppItem[]) {
    setSavingArrays(true);
    try {
      const res = await fetch(`/api/servers/${server.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osCredentials: newCreds,
          apps: newApps,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setCredentials(newCreds);
      setApps(newApps);
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Terjadi kesalahan");
    } finally {
      setSavingArrays(false);
    }
  }

  // OS Credentials Handlers
  function addCredential(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newCred: CredentialItem = {
      id: crypto.randomUUID(),
      username: fd.get("username") as string,
      password: fd.get("password") as string,
      description: fd.get("description") as string,
    };
    const updated = [...credentials, newCred];
    updateArrays(updated, apps);
    (e.target as HTMLFormElement).reset();
  }

  function removeCredential(id: string) {
    if (!confirm("Hapus kredensial ini?")) return;
    const updated = credentials.filter((c) => c.id !== id);
    updateArrays(updated, apps);
  }

  // Apps Handlers
  function addApp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newApp: AppItem = {
      id: crypto.randomUUID(),
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      credentials: [],
    };
    const updated = [...apps, newApp];
    updateArrays(credentials, updated);
    (e.target as HTMLFormElement).reset();
  }

  function removeApp(id: string) {
    if (!confirm("Hapus aplikasi ini beserta kredensialnya?")) return;
    const updated = apps.filter((a) => a.id !== id);
    updateArrays(credentials, updated);
  }

  function addAppCredential(appId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newCred: CredentialItem = {
      id: crypto.randomUUID(),
      username: fd.get("username") as string,
      password: fd.get("password") as string,
      description: fd.get("description") as string,
    };
    
    const updated = apps.map((app) => {
      if (app.id === appId) {
        return { ...app, credentials: [...app.credentials, newCred] };
      }
      return app;
    });
    updateArrays(credentials, updated);
    (e.target as HTMLFormElement).reset();
  }

  function removeAppCredential(appId: string, credId: string) {
    if (!confirm("Hapus akun aplikasi ini?")) return;
    const updated = apps.map((app) => {
      if (app.id === appId) {
        return { ...app, credentials: app.credentials.filter((c) => c.id !== credId) };
      }
      return app;
    });
    updateArrays(credentials, updated);
  }

  // Log Handlers
  async function saveLog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingLog(true);
    setLogError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/servers/${server.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: fd.get("actionType"),
          description: fd.get("description"),
          logDate: fd.get("logDate") || new Date().toISOString(),
          createdByName: sessionUser.name,
          createdByStaffId: sessionUser.staffId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLogError(data.error || "Gagal menyimpan log");
        return;
      }
      setLogs([data, ...logs]);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setLogError("Koneksi gagal / server error. Coba lagi.");
    } finally {
      setSavingLog(false);
    }
  }

  const actionTypes = [
    "Ganti Hardware",
    "Ganti IP Address",
    "Ganti Username/Password",
    "Install/Update OS",
    "Maintenance Rutin",
    "Perpanjang Domain/Hosting",
    "Migrasi",
    "Update Software",
    "Lainnya",
  ];

  const TabButton = ({ id, label }: { id: typeof activeTab; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === id
          ? "border-brand text-brand"
          : "border-transparent text-ink-muted hover:text-ink hover:border-line"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex border-b border-line mb-4">
        <TabButton id="info" label="Info & Akses" />
        {isServer && <TabButton id="apps" label="Aplikasi di Server" />}
        <TabButton id="logbook" label="Logbook & Riwayat" />
      </div>

      {/* TAB INFO & AKSES */}
      {activeTab === "info" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
          <div className="panel p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Informasi {server.category || "Server"}</h2>
              <Link
                href="/master/servers"
                className="text-xs text-brand hover:underline"
              >
                &larr; Kembali ke Daftar
              </Link>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Nama {server.category}</dt>
                <dd className="font-medium mt-0.5">{server.name}</dd>
              </div>
              
              {isServer ? (
                <>
                  <div>
                    <dt className="text-xs text-ink-muted">IP Address</dt>
                    <dd className="font-medium mt-0.5">{server.ipAddress || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">OS</dt>
                    <dd className="font-medium mt-0.5">{server.os || "—"}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt className="text-xs text-ink-muted">URL / Alamat Akses</dt>
                  <dd className="font-medium mt-0.5">
                    {server.url ? (
                      <a href={server.url.startsWith('http') ? server.url : `http://${server.url}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {server.url}
                      </a>
                    ) : "—"}
                  </dd>
                </div>
              )}

              <div className="pt-2 border-t border-line">
                <dt className="text-xs text-ink-muted">Username Utama</dt>
                <dd className="font-medium mt-0.5">{server.username || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Password Utama</dt>
                <dd className="font-medium mt-0.5 flex items-center gap-2">
                  <span className="font-mono bg-bg-elevated px-2 py-0.5 rounded border border-line">
                    {showPrimaryPassword ? (server.password || "—") : "••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPrimaryPassword(!showPrimaryPassword)}
                    className="text-xs text-brand hover:underline"
                  >
                    {showPrimaryPassword ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </dd>
              </div>
              
              {isServer && (
                <div className="pt-2 border-t border-line">
                  <dt className="text-xs text-ink-muted">Spesifikasi Hardware</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{server.hardwareSpec || "—"}</dd>
                </div>
              )}

              {isServer && (
                <div>
                  <dt className="text-xs text-ink-muted">Lokasi</dt>
                  <dd className="mt-0.5">{server.location || "—"}</dd>
                </div>
              )}

              <div className="pt-2 border-t border-line">
                <dt className="text-xs text-ink-muted">Catatan Tambahan</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{server.notes || "—"}</dd>
              </div>

              <div className="pt-6 mt-4">
                <Link
                  href="/master/servers"
                  className="inline-block w-full text-center rounded-xl bg-surface px-4 py-2 border border-line text-sm font-medium hover:bg-bg-elevated transition-colors"
                >
                  Tutup
                </Link>
              </div>
            </dl>
          </div>

          <div className="space-y-5">
            <div className="panel p-5">
              <h2 className="font-semibold text-lg mb-4">Kredensial / Akun Tambahan</h2>
              <div className="divide-y divide-line border border-line rounded-xl mb-4 overflow-hidden">
                {credentials.map((cred) => (
                  <div key={cred.id} className="p-3 bg-bg-elevated flex justify-between items-start">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{cred.username}</span>
                        <CredentialPasswordRenderer password={cred.password || ""} />
                      </div>
                      <p className="text-xs text-ink-muted">{cred.description || "Tanpa keterangan"}</p>
                    </div>
                    <button onClick={() => removeCredential(cred.id)} className="text-xs text-danger hover:underline">Hapus</button>
                  </div>
                ))}
                {credentials.length === 0 && (
                  <div className="p-3 text-sm text-ink-muted text-center">Belum ada akun tambahan.</div>
                )}
              </div>

              <form onSubmit={addCredential} className="bg-bg-subtle border border-line rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-sm">Tambah Akun Baru</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input name="username" required placeholder="Username" className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-sm" />
                  <input name="password" placeholder="Password" className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-sm" />
                </div>
                <input name="description" placeholder="Keterangan (mis. Akses DB, FTP, dsb)" className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-sm" />
                <button type="submit" disabled={savingArrays} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
                  + Tambah Akun
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB APLIKASI DI SERVER */}
      {activeTab === "apps" && isServer && (
        <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
          <div className="panel p-5 h-fit">
            <h2 className="font-semibold text-lg mb-4">Daftar Aplikasi / Software</h2>
            <form onSubmit={addApp} className="space-y-3">
              <input name="name" required placeholder="Nama Aplikasi (mis. SQL Server)" className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm" />
              <textarea name="description" placeholder="Deskripsi atau catatan port..." rows={2} className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm" />
              <button type="submit" disabled={savingArrays} className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                + Tambah Aplikasi
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {apps.map((app) => (
              <div key={app.id} className="panel p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-brand">{app.name}</h3>
                    {app.description && <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap">{app.description}</p>}
                  </div>
                  <button onClick={() => removeApp(app.id)} className="text-xs text-danger hover:underline">Hapus Aplikasi</button>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 text-ink-muted">Kredensial Aplikasi</h4>
                  <div className="divide-y divide-line border border-line rounded-lg mb-3 overflow-hidden">
                    {app.credentials.map((cred) => (
                      <div key={cred.id} className="p-3 bg-bg-elevated flex justify-between items-start">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{cred.username}</span>
                            <CredentialPasswordRenderer password={cred.password || ""} />
                          </div>
                          <p className="text-xs text-ink-muted">{cred.description || "Tanpa keterangan"}</p>
                        </div>
                        <button onClick={() => removeAppCredential(app.id, cred.id)} className="text-xs text-danger hover:underline">Hapus</button>
                      </div>
                    ))}
                    {app.credentials.length === 0 && (
                      <div className="p-3 text-sm text-ink-muted text-center">Belum ada kredensial terdaftar.</div>
                    )}
                  </div>

                  <form onSubmit={(e) => addAppCredential(app.id, e)} className="flex gap-2">
                    <input name="username" required placeholder="Username" className="flex-1 rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm" />
                    <input name="password" placeholder="Password" className="flex-1 rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm" />
                    <input name="description" placeholder="Ket" className="flex-1 rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm" />
                    <button type="submit" disabled={savingArrays} className="rounded-lg bg-surface px-3 py-1.5 border border-line text-sm font-medium hover:bg-bg-elevated disabled:opacity-60">
                      Tambah
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {apps.length === 0 && (
              <div className="panel p-10 text-center text-ink-muted">
                Belum ada aplikasi yang dicatat di server ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB LOGBOOK */}
      {activeTab === "logbook" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
          <div className="panel p-5 h-fit space-y-4">
            <h2 className="font-semibold text-lg">Catat Perubahan (Logbook)</h2>
            <form onSubmit={saveLog} className="space-y-4">
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Tanggal</span>
                <input
                  name="logDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Jenis Perubahan</span>
                <select
                  name="actionType"
                  required
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                >
                  <option value="">Pilih jenis...</option>
                  {actionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs text-ink-muted">Deskripsi Detail</span>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Contoh: Mengganti IP address karena restrukturisasi jaringan."
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                />
              </label>
              
              {logError ? <p className="text-sm text-danger">{logError}</p> : null}
              <button
                type="submit"
                disabled={savingLog}
                className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingLog ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </form>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-semibold">Riwayat Perubahan</h2>
            </div>
            <div className="divide-y divide-line">
              {logs.map((log) => {
                const dateStr = log.logDate.includes("T") 
                  ? new Date(log.logDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                  : new Date(log.logDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                  
                return (
                  <div key={log.id} className="p-4 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-bg-elevated border border-line flex items-center justify-center shrink-0">
                      <span className="text-xl">📝</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-brand">{log.actionType}</p>
                        <span className="text-xs text-ink-muted">{dateStr}</span>
                      </div>
                      <p className="text-sm mt-1 text-ink whitespace-pre-wrap">{log.description}</p>
                      <p className="text-xs text-ink-muted mt-2">
                        Oleh: <span className="font-medium text-ink">{log.createdByName}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {logs.length === 0 && (
                <div className="p-10 text-center text-ink-muted">
                  Belum ada riwayat perubahan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialPasswordRenderer({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  if (!password) return <span className="text-xs text-ink-muted italic border border-transparent px-2 py-0.5">Tanpa Password</span>;
  
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs bg-surface px-2 py-0.5 rounded border border-line min-w-16 text-center">
        {show ? password : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-[10px] text-brand hover:underline"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
