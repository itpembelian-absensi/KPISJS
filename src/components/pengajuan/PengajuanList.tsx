"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPengajuanType, PENGAJUAN_STATUS_LABEL } from "@/lib/pengajuan";
import {
  approvalWaitingText,
  canActOnPengajuan,
  canUnapprovePengajuan,
} from "@/lib/pengajuan-approval-view";
import type { Pengajuan, UserRole } from "@/lib/types";
import { PengajuanStatusBadge } from "@/components/pengajuan/PengajuanStatusBadge";

type StatusFilter = "all" | "submitted" | "approved" | "rejected";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "submitted", label: PENGAJUAN_STATUS_LABEL.submitted },
  { id: "approved", label: PENGAJUAN_STATUS_LABEL.approved },
  { id: "rejected", label: PENGAJUAN_STATUS_LABEL.rejected },
];

function matchesStatus(item: Pengajuan, status: StatusFilter) {
  if (status === "all") return true;
  if (status === "approved") {
    return item.status === "approved" || item.status === "done";
  }
  return item.status === status;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PengajuanList({
  items,
  showType = false,
  customerCodes,
  viewer,
}: {
  items: Pengajuan[];
  showType?: boolean;
  customerCodes?: Record<string, string>;
  viewer: { id: string; role: UserRole; staffId: string | null };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Pengajuan>>({});
  const [busy, setBusy] = useState<{
    id: string;
    action: "approve" | "unapprove";
  } | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const rows = useMemo(
    () => items.map((item) => overrides[item.id] ?? item),
    [items, overrides],
  );
  const showApprove = useMemo(
    () =>
      rows.some(
        (item) =>
          canActOnPengajuan(viewer, item) || canUnapprovePengajuan(viewer, item),
      ),
    [rows, viewer],
  );

  function mayApprove(item: Pengajuan) {
    return canActOnPengajuan(viewer, item);
  }

  function mayUnapprove(item: Pengajuan) {
    return canUnapprovePengajuan(viewer, item);
  }

  async function approve(item: Pengajuan) {
    setBusy({ id: item.id, action: "approve" });
    setRowError(null);
    try {
      const res = await fetch(`/api/pengajuan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(
          typeof data.error === "string" ? data.error : "Gagal menyetujui",
        );
        setBusy(null);
        return;
      }
      if (data.pengajuan) {
        setOverrides((prev) => ({ ...prev, [item.id]: data.pengajuan as Pengajuan }));
      }
      setBusy(null);
      router.refresh();
    } catch {
      setRowError("Koneksi gagal — coba lagi");
      setBusy(null);
    }
  }

  async function unapprove(item: Pengajuan) {
    setBusy({ id: item.id, action: "unapprove" });
    setRowError(null);
    try {
      const res = await fetch(`/api/pengajuan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unapprove" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(
          typeof data.error === "string"
            ? data.error
            : "Gagal membatalkan persetujuan",
        );
        setBusy(null);
        return;
      }
      if (data.pengajuan) {
        setOverrides((prev) => ({ ...prev, [item.id]: data.pengajuan as Pengajuan }));
      }
      setBusy(null);
      router.refresh();
    } catch {
      setRowError("Koneksi gagal — coba lagi");
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: rows.length,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    for (const item of rows) {
      if (item.status === "approved" || item.status === "done") base.approved += 1;
      else if (item.status === "submitted" || item.status === "rejected") {
        base[item.status] += 1;
      }
    }
    return base;
  }, [rows]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((item) => {
      if (!matchesStatus(item, status)) return false;
      if (!query) return true;
      const typeLabel = getPengajuanType(item.type)?.label ?? item.type;
      const customerCode = customerCodes?.[item.id] ?? "";
      return (
        item.code.toLowerCase().includes(query) ||
        customerCode.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.requesterName.toLowerCase().includes(query) ||
        item.requesterDept.toLowerCase().includes(query) ||
        typeLabel.toLowerCase().includes(query)
      );
    });
  }, [customerCodes, q, rows, status]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => {
            const active = status === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-brand text-white"
                    : "bg-bg-elevated text-ink-muted hover:text-ink"
                }`}
              >
                {filter.label}
                <span className={active ? "text-white/80" : ""}>
                  {" "}
                  {counts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kode, judul, pemohon..."
          className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-brand sm:max-w-xs"
        />
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Pengajuan</th>
                {showType ? (
                  <th className="px-4 py-3 font-medium">Jenis</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Pemohon</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Diajukan</th>
                {showApprove ? (
                  <th className="px-4 py-3 font-medium print:hidden">Approval</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showType ? 6 : 5) + (showApprove ? 1 : 0)}
                    className="px-4 py-10 text-center text-sm text-ink-muted"
                  >
                    Belum ada pengajuan pada filter ini.
                  </td>
                </tr>
              ) : (
                visible.map((item) => {
                  const typeDef = getPengajuanType(item.type);
                  const code = customerCodes?.[item.id] || item.code;
                  return (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/pengajuan/${item.type}/${item.id}`}
                          className="font-medium text-brand-deep hover:underline"
                        >
                          {code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/pengajuan/${item.type}/${item.id}`}
                          className="font-medium text-ink hover:text-brand-deep"
                        >
                          {item.title}
                        </Link>
                      </td>
                      {showType ? (
                        <td className="px-4 py-3 align-top text-ink-muted">
                          {typeDef?.label ?? item.type}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 align-top">
                        <div>{item.requesterName}</div>
                        <div className="text-xs text-ink-muted">
                          {item.requesterDept}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <PengajuanStatusBadge status={item.status} />
                        {approvalWaitingText(item) ? (
                          <div className="mt-1 max-w-[220px] text-xs text-ink-muted">
                            {approvalWaitingText(item)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-ink-muted">
                        {formatWhen(item.createdAt)}
                      </td>
                      {showApprove ? (
                        <td className="px-4 py-3 align-top print:hidden">
                          <div className="flex flex-col items-start gap-1.5">
                            {mayApprove(item) ? (
                              <button
                                type="button"
                                onClick={() => approve(item)}
                                disabled={busy?.id === item.id}
                                className="rounded-xl bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-deep disabled:opacity-60"
                              >
                                {busy?.id === item.id && busy.action === "approve"
                                  ? "Menyetujui..."
                                  : "Approval"}
                              </button>
                            ) : null}
                            {mayUnapprove(item) ? (
                              <button
                                type="button"
                                onClick={() => unapprove(item)}
                                disabled={busy?.id === item.id}
                                className="rounded-xl border border-line bg-bg-elevated px-3 py-1.5 text-xs font-medium text-ink hover:border-brand disabled:opacity-60"
                              >
                                {busy?.id === item.id && busy.action === "unapprove"
                                  ? "Membatalkan..."
                                  : "Batalkan"}
                              </button>
                            ) : null}
                            {!mayApprove(item) && !mayUnapprove(item) ? (
                              <span className="text-xs text-ink-muted">—</span>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {rowError ? <p className="text-sm text-danger">{rowError}</p> : null}
    </div>
  );
}
