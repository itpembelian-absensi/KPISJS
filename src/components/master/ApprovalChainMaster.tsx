"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/lib/types";
import type { ApprovalChainLevel, ApprovalChainUserOption } from "@/lib/types";

type DraftLevel = {
  key: string;
  label: string;
  userIds: string[];
};

function toDraft(levels: ApprovalChainLevel[]): DraftLevel[] {
  return levels.map((level) => ({
    key: level.id,
    label: level.label,
    userIds: [...level.userIds],
  }));
}

export function ApprovalChainMaster({
  initialLevels,
  users,
}: {
  initialLevels: ApprovalChainLevel[];
  users: ApprovalChainUserOption[];
}) {
  const router = useRouter();
  const [levels, setLevels] = useState<DraftLevel[]>(() => toDraft(initialLevels));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const activeUsers = users.filter((user) => user.active);
  const needle = query.trim().toLowerCase();
  const visibleUsers = activeUsers.filter((user) => {
    if (!needle) return true;
    return (
      user.name.toLowerCase().includes(needle) ||
      user.username.toLowerCase().includes(needle) ||
      ROLE_LABEL[user.role].toLowerCase().includes(needle)
    );
  });

  function update(key: string, patch: Partial<DraftLevel>) {
    setLevels((prev) =>
      prev.map((level) => (level.key === key ? { ...level, ...patch } : level)),
    );
    setSaved(false);
  }

  function toggleUser(key: string, userId: string) {
    setLevels((prev) =>
      prev.map((level) => {
        if (level.key !== key) return level;
        const has = level.userIds.includes(userId);
        return {
          ...level,
          userIds: has
            ? level.userIds.filter((id) => id !== userId)
            : [...level.userIds, userId],
        };
      }),
    );
    setSaved(false);
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= levels.length) return;
    setLevels((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
    setSaved(false);
  }

  function addLevel() {
    setLevels((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        label: `Level ${prev.length + 1}`,
        userIds: [],
      },
    ]);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/master/approval-pengajuan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levels: levels.map((level) => ({
            label: level.label,
            userIds: level.userIds,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        setSaving(false);
        return;
      }
      setLevels(toDraft(data.levels || []));
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Koneksi gagal — coba lagi");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Rantai persetujuan</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Tingkat di atas harus disetujui dulu. Pemohon tidak bisa
              menyetujui pengajuannya sendiri, kecuali Admin.
              Perubahan ini berlaku untuk pengajuan yang dibuat setelah disimpan.
            </p>
          </div>
          <button
            type="button"
            onClick={addLevel}
            className="rounded-xl border border-line bg-bg-elevated px-4 py-2 text-sm font-medium hover:border-brand"
          >
            Tambah tingkat
          </button>
        </div>

        {levels.length > 0 ? (
          <label className="block max-w-xs">
            <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Cari user
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nama atau username"
              className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
        ) : null}

        {levels.length === 0 ? (
          <p className="rounded-xl bg-bg-elevated px-3 py-3 text-sm text-ink-muted">
            Belum ada rantai. Pengajuan disetujui oleh Admin atau Manager
            dalam satu tingkat.
          </p>
        ) : (
          <ol className="space-y-3">
            {levels.map((level, index) => {
              const selected = level.userIds
                .map((id) => userById.get(id))
                .filter((user): user is ApprovalChainUserOption => Boolean(user));
              return (
                <li key={level.key} className="rounded-xl border border-line p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                        Tingkat {index + 1}
                      </p>
                      <input
                        value={level.label}
                        onChange={(event) =>
                          update(level.key, { label: event.target.value })
                        }
                        placeholder={`Level ${index + 1}`}
                        className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                      <p className="mt-2 text-xs text-ink-muted">
                        {selected.length === 0
                          ? "Belum ada user."
                          : `Bisa disetujui oleh: ${selected.map((user) => user.name).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                      >
                        Naik
                      </button>
                      <button
                        type="button"
                        disabled={index === levels.length - 1}
                        onClick={() => move(index, 1)}
                        className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                      >
                        Turun
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLevels((prev) => prev.filter((row) => row.key !== level.key));
                          setSaved(false);
                        }}
                        className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-bg-elevated p-2">
                    {visibleUsers.length === 0 ? (
                      <p className="px-2 py-2 text-sm text-ink-muted">
                        User tidak ditemukan.
                      </p>
                    ) : (
                      visibleUsers.map((user) => {
                        const checked = level.userIds.includes(user.id);
                        return (
                          <label
                            key={user.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(level.key, user.id)}
                            />
                            <span className="min-w-0">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-ink-muted">
                                {" "}
                                · {user.username} · {ROLE_LABEL[user.role]}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-brand-deep">Rantai approval tersimpan.</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan rantai approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
