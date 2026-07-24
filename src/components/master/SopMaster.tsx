"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SopAttachment,
  SopDisposition,
  SopDocument,
  SopStep,
} from "@/lib/types";
import { DEFAULT_SOP_DISPOSITIONS } from "@/lib/types";
import { formatSopDate, toDateInputValue } from "@/lib/sop-format";

function emptyStep(order: number): SopStep {
  return { order, title: "", body: "" };
}

function emptyAttachment(): SopAttachment {
  return { label: "", url: "" };
}

export function SopMaster({ initial }: { initial: SopDocument[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<SopDocument | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [divisionLabel, setDivisionLabel] = useState("DIVISI IT");
  const [documentType, setDocumentType] = useState(
    "STANDARD OPERATING PROCEDURE",
  );
  const [effectiveDate, setEffectiveDate] = useState("");
  const [revision, setRevision] = useState("-");
  const [revisionDate, setRevisionDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [materials, setMaterials] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<SopStep[]>([emptyStep(1)]);
  const [dispositions, setDispositions] = useState<SopDisposition[]>([
    ...DEFAULT_SOP_DISPOSITIONS,
  ]);
  const [attachments, setAttachments] = useState<SopAttachment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function loadForm(sop: SopDocument | null) {
    setEditing(sop);
    setTitle(sop?.title ?? "");
    setCode(sop?.code ?? "");
    setDivisionLabel(sop?.divisionLabel ?? "DIVISI IT");
    setDocumentType(sop?.documentType ?? "STANDARD OPERATING PROCEDURE");
    setEffectiveDate(toDateInputValue(sop?.effectiveDate ?? ""));
    setRevision(sop?.revision ?? "-");
    setRevisionDate(toDateInputValue(sop?.revisionDate ?? ""));
    setPurpose(sop?.purpose ?? "");
    setMaterials(sop?.materials ?? "");
    setQualifications(sop?.qualifications ?? "");
    setNotes(sop?.notes ?? "");
    setActive(sop?.active ?? true);
    setSteps(
      sop && sop.steps.length > 0
        ? sop.steps.map((s, i) => ({ ...s, order: i + 1 }))
        : [emptyStep(1)],
    );
    setDispositions(
      sop?.dispositions?.length
        ? sop.dispositions.map((d) => ({ ...d }))
        : [...DEFAULT_SOP_DISPOSITIONS],
    );
    setAttachments(sop?.attachments?.length ? [...sop.attachments] : []);
    setError(null);
    setMessage(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((s) => s.id));
  }

  const selectedIdsQuery = useMemo(() => selected.join(","), [selected]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          code: code.trim() || undefined,
          title,
          divisionLabel,
          documentType,
          effectiveDate,
          revision,
          revisionDate,
          purpose,
          materials,
          qualifications,
          notes,
          steps,
          dispositions,
          attachments,
          active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setItems((prev) => {
        const exists = prev.some((s) => s.id === data.sop.id);
        if (exists) {
          return prev
            .map((s) => (s.id === data.sop.id ? data.sop : s))
            .sort((a, b) => a.title.localeCompare(b.title, "id"));
        }
        return [...prev, data.sop].sort((a, b) =>
          a.title.localeCompare(b.title, "id"),
        );
      });
      loadForm(null);
      setMessage("SOP tersimpan.");
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus SOP ini?")) return;
    const res = await fetch(`/api/master/sops?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus");
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    if (editing?.id === id) loadForm(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {selected.length > 0 ? (
        <div className="panel flex flex-wrap items-center gap-2 p-4">
          <p className="mr-2 text-sm text-ink-muted">
            {selected.length} SOP dipilih
          </p>
          <Link
            href={`/sop/combined?ids=${encodeURIComponent(selectedIdsQuery)}`}
            className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-bg"
          >
            Lihat gabungan
          </Link>
          <a
            href={`/api/sop/export?format=pdf&ids=${encodeURIComponent(selectedIdsQuery)}`}
            className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white"
          >
            Unduh PDF gabungan
          </a>
          <a
            href={`/api/sop/export?format=docx&ids=${encodeURIComponent(selectedIdsQuery)}`}
            className="rounded-xl border border-brand px-3 py-2 text-sm font-medium text-brand"
          >
            Unduh Word gabungan
          </a>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        <form onSubmit={save} className="panel space-y-3 p-5">
          <h2 className="font-semibold">
            {editing ? "Edit SOP" : "Tambah SOP"}
          </h2>
          <p className="text-xs text-ink-muted">
            Format formal: header dokumen, bagian A–D, tabel disposisi.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-ink-muted">Judul SOP</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="Update Credit Limit dan atau Term Of Payment..."
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">
                Nomor dokumen (kosong = otomatis)
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="IT-SOP/2026/001"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Mulai berlaku</span>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Revisi</span>
              <input
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
                placeholder="-"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Tanggal revisi</span>
              <input
                type="date"
                value={revisionDate}
                onChange={(e) => setRevisionDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Divisi</span>
              <input
                value={divisionLabel}
                onChange={(e) => setDivisionLabel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-ink-muted">Tipe dokumen</span>
              <input
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-xs font-medium text-ink-muted">
              A. TUJUAN
            </span>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              placeholder="Menjelaskan proses..."
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-ink-muted">
              B. BAHAN DAN PERALATAN
            </span>
            <textarea
              rows={2}
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-ink-muted">
              C. KUALIFIKASI PERSONEL
            </span>
            <textarea
              rows={2}
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                D. PROSEDUR PELAKSANAAN
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSteps((prev) => [...prev, emptyStep(prev.length + 1)])
                }
                className="rounded-lg border border-line px-2 py-1 text-xs"
              >
                + Langkah
              </button>
            </div>
            {steps.map((step, idx) => (
              <div
                key={`step-${idx}`}
                className="space-y-2 rounded-xl border border-line bg-bg px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-xs text-ink-muted">
                    {idx + 1}.
                  </span>
                  {steps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSteps((prev) =>
                          prev
                            .filter((_, i) => i !== idx)
                            .map((s, i) => ({ ...s, order: i + 1 })),
                        )
                      }
                      className="text-xs text-danger"
                    >
                      Hapus
                    </button>
                  ) : null}
                </div>
                <input
                  value={step.title}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, title: e.target.value } : s,
                      ),
                    )
                  }
                  placeholder="Peran / aktor (contoh: Requestor)"
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
                <textarea
                  rows={2}
                  value={step.body}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, body: e.target.value } : s,
                      ),
                    )
                  }
                  placeholder="Uraian prosedur..."
                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <label className="block text-sm">
            <span className="text-xs font-medium text-ink-muted">E. NOTE</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              placeholder="Catatan tambahan, pengecualian, referensi..."
            />
          </label>

          <div className="space-y-2 border-t border-line pt-3">
            <h3 className="text-sm font-semibold">Disposisi / tanda tangan</h3>
            {dispositions.map((d, idx) => (
              <div
                key={`disp-${idx}`}
                className="grid gap-2 rounded-xl border border-line bg-bg px-3 py-3 sm:grid-cols-3"
              >
                <input
                  value={d.role}
                  onChange={(e) =>
                    setDispositions((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, role: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Disposisi"
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
                <input
                  value={d.name}
                  onChange={(e) =>
                    setDispositions((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Nama"
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
                <input
                  value={d.position}
                  onChange={(e) =>
                    setDispositions((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, position: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Jabatan"
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Lampiran / link</h3>
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => [...prev, emptyAttachment()])
                }
                className="rounded-lg border border-line px-2 py-1 text-xs"
              >
                + Link
              </button>
            </div>
            {attachments.map((att, idx) => (
              <div
                key={`att-${idx}`}
                className="grid gap-2 rounded-xl border border-line bg-bg px-3 py-3 sm:grid-cols-[1fr_1.2fr_auto]"
              >
                <input
                  value={att.label}
                  onChange={(e) =>
                    setAttachments((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, label: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Label"
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
                <input
                  value={att.url}
                  onChange={(e) =>
                    setAttachments((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, url: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="https://..."
                  className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-xs text-danger sm:self-center"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Aktif
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-ok">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
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
                onClick={() => loadForm(null)}
                className="rounded-xl border border-line px-4 py-2 text-sm"
              >
                Batal
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-semibold">Daftar SOP IT</h2>
              <p className="text-xs text-ink-muted">{items.length} dokumen</p>
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="rounded-lg border border-line px-2 py-1 text-xs"
            >
              {selected.length === items.length && items.length > 0
                ? "Batal pilih"
                : "Pilih semua"}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted">
              Belum ada SOP. Buat dokumen pertama di formulir kiri.
            </p>
          ) : (
            items.map((sop) => (
              <div
                key={sop.id}
                className="flex items-start gap-3 border-b border-line px-4 py-3"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(sop.id)}
                  onChange={() => toggleSelect(sop.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="mono text-xs text-brand">{sop.code}</p>
                  <p className="font-medium">{sop.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Berlaku {formatSopDate(sop.effectiveDate)} · Rev{" "}
                    {sop.revision || "-"} · {sop.steps.length} langkah
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Link
                      href={`/sop/${sop.id}`}
                      className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                    >
                      Baca
                    </Link>
                    <a
                      href={`/api/sop/export?format=pdf&ids=${sop.id}`}
                      className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/sop/export?format=docx&ids=${sop.id}`}
                      className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                    >
                      Word
                    </a>
                    <button
                      type="button"
                      onClick={() => loadForm(sop)}
                      className="rounded-lg border border-line px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(sop.id)}
                      className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] ${
                    sop.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                  }`}
                >
                  {sop.active ? "Aktif" : "Off"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
