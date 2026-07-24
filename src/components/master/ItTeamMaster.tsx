"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IT_TYPE_LABEL, type ItMember, type StaffMember } from "@/lib/types";

export function ItTeamMaster({
  initial,
  staff,
}: {
  initial: ItMember[];
  staff: StaffMember[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<ItMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function staffName(id: string) {
    return staff.find((s) => s.id === id)?.name ?? "—";
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/master/it-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        staffId: fd.get("staffId"),
        type: fd.get("type"),
        active: fd.get("active") === "on",
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      return;
    }
    setItems((prev) => {
      const exists = prev.some((m) => m.id === data.itMember.id);
      if (exists) {
        return prev.map((m) =>
          m.id === data.itMember.id ? data.itMember : m,
        );
      }
      return [...prev, data.itMember];
    });
    setEditing(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={save} className="panel space-y-3 p-5">
        <h2 className="font-semibold">
          {editing ? "Edit anggota IT" : "Tambah IT Staff / IT Manager"}
        </h2>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Dari master staf</span>
          <select
            name="staffId"
            required
            defaultValue={editing?.staffId ?? staff[0]?.id}
            key={`staff-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.position}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-ink-muted">Tipe</span>
          <select
            name="type"
            defaultValue={editing?.type ?? "it_staff"}
            key={`type-${editing?.id ?? "new"}`}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            <option value="it_staff">{IT_TYPE_LABEL.it_staff}</option>
            <option value="it_manager">{IT_TYPE_LABEL.it_manager}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={editing?.active ?? true}
            key={`active-${editing?.id ?? "new"}`}
          />
          Aktif (bisa di-assign tiket)
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-line px-4 py-2 text-sm"
            >
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Tim IT</h2>
          <p className="text-xs text-ink-muted">
            Handler tiket: IT Staff & IT Manager
          </p>
        </div>
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
          >
            <div>
              <p className="font-medium">{staffName(m.staffId)}</p>
              <p className="text-xs text-ink-muted">{IT_TYPE_LABEL[m.type]}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  m.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                }`}
              >
                {m.active ? "Aktif" : "Nonaktif"}
              </span>
              <button
                type="button"
                onClick={() => setEditing(m)}
                className="rounded-lg border border-line px-2 py-1 text-xs"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
