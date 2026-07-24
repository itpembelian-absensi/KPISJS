"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WORK_ORDER_PRIORITY_LABEL } from "@/lib/sla";
import type {
  Agent,
  Department,
  KpiFunction,
  WorkOrderPriority,
} from "@/lib/types";

export function CreateWorkOrderForm({
  departments,
  functions,
  agents,
  defaultDepartmentId,
  defaultRequesterName,
  defaultRequesterStaffId,
}: {
  departments: Department[];
  functions: KpiFunction[];
  agents: Agent[];
  defaultDepartmentId: string;
  defaultRequesterName: string;
  defaultRequesterStaffId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(
    defaultDepartmentId || departments[0]?.id || "",
  );

  const options = useMemo(() => {
    const forDept = functions
      .filter((f) => f.departmentId === departmentId && f.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const nonSupport = forDept.filter(
      (f) => !/operation\s*\/\s*support/i.test(f.name),
    );
    return nonSupport.length > 0 ? nonSupport : forDept;
  }, [functions, departmentId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description"),
        kpiFunctionId: fd.get("kpiFunctionId"),
        priority: fd.get("priority") || "medium",
        assigneeId: fd.get("assigneeId") || null,
        dueDate: fd.get("dueDate") || null,
        requesterName: defaultRequesterName,
        requesterStaffId: defaultRequesterStaffId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal membuat perintah");
      return;
    }
    router.push(`/work-orders/${data.workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-4 sm:p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Judul perintah
          </span>
          <input
            name="title"
            required
            placeholder="Contoh: Go-live modul CRM sales"
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Detail / instruksi
          </span>
          <textarea
            name="description"
            rows={4}
            placeholder="Jelaskan ruang lingkup, target, dan kriteria selesai..."
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Departemen
          </span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          >
            {departments.length === 0 ? (
              <option value="">Belum ada departemen</option>
            ) : (
              departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Fungsi KPI
          </span>
          <select
            key={`fn-${departmentId}`}
            name="kpiFunctionId"
            required
            defaultValue={options[0]?.id ?? ""}
            disabled={!departmentId || options.length === 0}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand disabled:opacity-60"
          >
            {!departmentId ? (
              <option value="">Pilih departemen dulu</option>
            ) : options.length === 0 ? (
              <option value="">Belum ada fungsi KPI untuk dept ini</option>
            ) : (
              options.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.weightPercent}%)
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Prioritas
          </span>
          <select
            name="priority"
            defaultValue={"medium" satisfies WorkOrderPriority}
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          >
            {Object.entries(WORK_ORDER_PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Assign ke (opsional)
          </span>
          <select
            name="assigneeId"
            defaultValue=""
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
          >
            <option value="">Masuk antrian dulu</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-medium leading-5 tracking-wide text-ink-muted uppercase">
            Target selesai
          </span>
          <input
            name="dueDate"
            type="date"
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand sm:max-w-xs"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted">
          Pemberi perintah: {defaultRequesterName}. Support helpdesk tetap lewat
          tiket.
        </p>
        <button
          type="submit"
          disabled={loading || options.length === 0 || !departmentId}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {loading ? "Menyimpan..." : "Kirim perintah"}
        </button>
      </div>
    </form>
  );
}
