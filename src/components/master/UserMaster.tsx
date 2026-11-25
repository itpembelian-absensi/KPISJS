"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_LABEL,
  type PasswordResetRequest,
  type StaffMember,
  type UserAccount,
} from "@/lib/types";

type UserRow = Omit<UserAccount, "passwordHash">;

/** Jumlah user per halaman di daftar */
const LIST_PAGE_SIZE = 10;

export function UserMaster({
  initial,
  staff,
  initialResets,
}: {
  initial: UserRow[];
  staff: StaffMember[];
  initialResets: PasswordResetRequest[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pendingResets, setPendingResets] = useState(initialResets);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listPage, setListPage] = useState(1);

  function staffName(id: string | null) {
    if (!id) return "—";
    return staff.find((s) => s.id === id)?.name ?? "—";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => {
      const linked = u.staffId
        ? (staff.find((s) => s.id === u.staffId)?.name ?? "")
        : "";
      const hay = [
        u.username,
        ROLE_LABEL[u.role],
        u.role,
        linked,
        u.active ? "aktif" : "nonaktif",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, staff]);

  const totalListPages = Math.max(1, Math.ceil(filtered.length / LIST_PAGE_SIZE));
  const currentListPage = Math.min(listPage, totalListPages);
  const pagedItems = useMemo(() => {
    const start = (currentListPage - 1) * LIST_PAGE_SIZE;
    return filtered.slice(start, start + LIST_PAGE_SIZE);
  }, [filtered, currentListPage]);

  useEffect(() => {
    setListPage(1);
  }, [query]);

  async function removeUser(u: UserRow) {
    const ok = window.confirm(
      `Hapus user "${u.username}" (${ROLE_LABEL[u.role]})?\n\nSession login user ini juga akan dihapus.`,
    );
    if (!ok) return;

    setError(null);
    setMessage(null);
    const res = await fetch(`/api/master/users?id=${encodeURIComponent(u.id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus user");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== u.id));
    setPendingResets((prev) => prev.filter((r) => r.userId !== u.id));
    setMessage(`User "${u.username}" berhasil dihapus`);
    router.refresh();
  }

  async function rejectReset(req: PasswordResetRequest) {
    const ok = window.confirm(
      `Tolak permintaan reset untuk "${req.username}"?`,
    );
    if (!ok) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/master/password-resets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: req.id, action: "reject" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menolak permintaan");
      return;
    }
    setPendingResets((prev) => prev.filter((r) => r.id !== req.id));
    setMessage(`Permintaan reset "${req.username}" ditolak`);
    router.refresh();
  }

  function formatResetAt(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {pendingResets.length > 0 ? (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
          <p className="text-sm font-medium text-warn">
            Permintaan reset password ({pendingResets.length})
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            User tidak bisa mengubah password sendiri. Atur password baru, lalu
            sampaikan ke yang bersangkutan.
          </p>
          <div className="mt-3 space-y-2">
            {pendingResets.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="mono text-sm font-medium">{r.username}</p>
                  <p className="text-[11px] text-ink-muted">
                    Diajukan {formatResetAt(r.requestedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/master/users/${r.userId}/edit?reset=1`}
                    className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white"
                  >
                    Atur password
                  </Link>
                  <button
                    type="button"
                    onClick={() => rejectReset(r)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="space-y-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">
                User & role ({filtered.length}
                {filtered.length !== items.length ? ` / ${items.length}` : ""})
              </h2>
              <p className="text-xs text-ink-muted">
                Role + menu khusus + batasan departemen
              </p>
            </div>
            <Link
              href="/master/users/new"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Tambah
            </Link>
          </div>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari username, role, atau nama staf..."
              className={`w-full rounded-xl border border-line bg-bg-elevated py-2 pl-3 text-sm outline-none focus:border-brand ${
                query ? "pr-9" : "pr-3"
              }`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-line hover:text-ink"
                aria-label="Hapus pencarian"
                title="Hapus pencarian"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {pagedItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            {query.trim()
              ? "Tidak ada user yang cocok dengan pencarian."
              : "Belum ada user login."}
          </p>
        ) : (
          pagedItems.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
            >
              <div className="min-w-0">
                <p className="mono text-xs text-brand">{u.username}</p>
                <p className="font-medium">{ROLE_LABEL[u.role]}</p>
                <p className="truncate text-xs text-ink-muted">
                  {staffName(u.staffId)}
                  {u.allowedMenus != null
                    ? ` · ${u.allowedMenus.length} menu custom`
                    : " · menu default role"}
                  {u.departmentScope == null
                    ? " · dept: role"
                    : u.departmentScope.includes("*")
                      ? " · dept: semua"
                      : ` · dept: ${u.departmentScope.length}`}
                  {(u.role === "manager" || u.role === "assessor") &&
                  (u.assessmentStaffIds?.length ?? 0) > 0
                    ? ` · nilai lintas: ${u.assessmentStaffIds!.length} staf`
                    : u.role === "manager" || u.role === "assessor"
                      ? " · nilai: dept sendiri"
                      : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pendingResets.some((r) => r.userId === u.id) ? (
                  <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                    Minta reset
                  </span>
                ) : null}
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    u.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                  }`}
                >
                  {u.active ? "Aktif" : "Nonaktif"}
                </span>
                <Link
                  href={`/master/users/${u.id}/edit`}
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => removeUser(u)}
                  className="rounded-lg border border-danger/30 bg-danger-soft px-2 py-1 text-xs text-danger"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}

        {filtered.length > 0 && totalListPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <p className="text-xs text-ink-muted">
              Halaman {currentListPage} dari {totalListPages}
              {" · "}
              {(currentListPage - 1) * LIST_PAGE_SIZE + 1}–
              {Math.min(currentListPage * LIST_PAGE_SIZE, filtered.length)} dari{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentListPage <= 1}
                onClick={() => setListPage(1)}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman awal"
                title="Halaman awal"
              >
                «
              </button>
              <button
                type="button"
                disabled={currentListPage <= 1}
                onClick={() => setListPage(Math.max(1, currentListPage - 1))}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman sebelumnya"
                title="Halaman sebelumnya"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={currentListPage >= totalListPages}
                onClick={() =>
                  setListPage(Math.min(totalListPages, currentListPage + 1))
                }
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman berikutnya"
                title="Halaman berikutnya"
              >
                ›
              </button>
              <button
                type="button"
                disabled={currentListPage >= totalListPages}
                onClick={() => setListPage(totalListPages)}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman akhir"
                title="Halaman akhir"
              >
                »
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
