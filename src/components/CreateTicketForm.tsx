"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Agent,
  Department,
  StaffMember,
  TicketCategory,
  TicketPriority,
} from "@/lib/types";
import {
  CATEGORY_LABEL,
  formatSlaTarget,
  PRIORITY_LABEL,
  PRIORITY_OPTIONS,
  SLA_TARGET_HINT,
} from "@/lib/sla";

export function CreateTicketForm({
  agents,
  departments,
  staffList,
  defaultStaffId = "",
  canAssign = false,
  lockRequester = false,
}: {
  agents: Agent[];
  departments: Department[];
  staffList: StaffMember[];
  defaultStaffId?: string;
  canAssign?: boolean;
  lockRequester?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState(
    defaultStaffId || staffList[0]?.id || "",
  );

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === staffId) ?? null,
    [staffList, staffId],
  );

  const selectedDept = useMemo(
    () =>
      departments.find((d) => d.id === selectedStaff?.departmentId) ?? null,
    [departments, selectedStaff],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedStaff || !selectedDept) {
      setLoading(false);
      setError("Pilih pemohon dari master staf");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") || ""),
      description: String(fd.get("description") || ""),
      category: String(fd.get("category") || "other") as TicketCategory,
      priority: String(fd.get("priority") || "medium") as TicketPriority,
      requesterStaffId: selectedStaff.id,
      requesterName: selectedStaff.name,
      requesterDept: selectedDept.name,
      departmentId: selectedDept.id,
      assigneeId: canAssign
        ? String(fd.get("assigneeId") || "") || null
        : null,
    };

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal membuat tiket");
      return;
    }
    router.push(`/tickets/${data.ticket.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Judul masalah
          </span>
          <input
            name="title"
            required
            placeholder="Contoh: Printer lantai 2 tidak bisa print"
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Deskripsi
          </span>
          <textarea
            name="description"
            rows={4}
            placeholder="Jelaskan gejala, lokasi, dan dampak ke pekerjaan..."
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Nama pemohon
          </span>
          <select
            name="requesterStaffId"
            required
            value={staffId}
            disabled={lockRequester}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand disabled:opacity-70"
          >
            {staffList.length === 0 ? (
              <option value="">Belum ada master staf</option>
            ) : (
              staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.employeeCode} — {s.name}
                </option>
              ))
            )}
          </select>
          {selectedStaff ? (
            <p className="mt-1 text-xs text-ink-muted">
              {selectedStaff.position}
              {selectedStaff.email ? ` · ${selectedStaff.email}` : ""}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Departemen
          </span>
          <input
            readOnly
            value={
              selectedDept
                ? `${selectedDept.code} — ${selectedDept.name}`
                : "Pilih pemohon terlebih dahulu"
            }
            className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-ink-muted outline-none"
          />
          <input type="hidden" name="departmentId" value={selectedDept?.id ?? ""} />
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Kategori
          </span>
          <select
            name="category"
            defaultValue="hardware"
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Prioritas
          </span>
          <select
            name="priority"
            defaultValue="medium"
            className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          >
            {PRIORITY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {PRIORITY_LABEL[k]} · SLA {formatSlaTarget(k)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-blue-700">{SLA_TARGET_HINT}</p>
        </label>

        {canAssign ? (
          <label className="block md:col-span-2">
            <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Assign ke (opsional)
            </span>
            <select
              name="assigneeId"
              defaultValue=""
              className="mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
            >
              <option value="">Masuk antrian dulu</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.role}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted">
          Departemen otomatis mengikuti master staf yang dipilih.
        </p>
        <button
          type="submit"
          disabled={loading || staffList.length === 0 || !selectedStaff}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-deep disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {loading ? "Menyimpan..." : "Buat Tiket"}
        </button>
      </div>
    </form>
  );
}
