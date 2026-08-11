"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
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
  return { label: "", url: "", kind: "link" };
}

function isFileAttachment(att: SopAttachment) {
  return att.kind === "file" || att.url.startsWith("/uploads/sops/");
}

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Jumlah SOP per halaman di daftar kanan */
const LIST_PAGE_SIZE = 5;

type SopSortKey = "code" | "title";

function sortSops(list: SopDocument[], key: SopSortKey): SopDocument[] {
  const copy = [...list];
  if (key === "code") {
    copy.sort((a, b) =>
      a.code.localeCompare(b.code, "id", { numeric: true, sensitivity: "base" }),
    );
  } else {
    copy.sort((a, b) => a.title.localeCompare(b.title, "id"));
  }
  return copy;
}

export function SopMaster({ initial }: { initial: SopDocument[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{
    sopId: string;
    url: string;
    label: string;
  } | null>(null);
  const [items, setItems] = useState(() => sortSops(initial, "code"));
  const [listPage, setListPage] = useState(1);
  const [sortKey, setSortKey] = useState<SopSortKey>("code");
  const [listNotice, setListNotice] = useState<string | null>(null);
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const sortedItems = useMemo(
    () => sortSops(items, sortKey),
    [items, sortKey],
  );
  const totalListPages = Math.max(
    1,
    Math.ceil(sortedItems.length / LIST_PAGE_SIZE),
  );
  const currentListPage = Math.min(listPage, totalListPages);
  const pagedItems = useMemo(() => {
    const start = (currentListPage - 1) * LIST_PAGE_SIZE;
    return sortedItems.slice(start, start + LIST_PAGE_SIZE);
  }, [sortedItems, currentListPage]);

  const linkAttachments = useMemo(
    () => attachments.filter((a) => !isFileAttachment(a)),
    [attachments],
  );
  const fileAttachments = useMemo(
    () => attachments.filter((a) => isFileAttachment(a)),
    [attachments],
  );

  function applySopToState(sop: SopDocument) {
    setItems((prev) => {
      const exists = prev.some((s) => s.id === sop.id);
      if (exists) {
        return prev.map((s) => (s.id === sop.id ? sop : s));
      }
      return [...prev, sop];
    });
  }

  async function uploadFilesToSop(sopId: string, files: File[]) {
    if (!files.length) return null;
    const fd = new FormData();
    fd.append("sopId", sopId);
    for (const f of files) fd.append("files", f);
    const res = await fetch("/api/master/sops/files", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Gagal mengunggah file");
    }
    return data.sop as SopDocument;
  }

  function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files);
    setPendingFiles((prev) => [...prev, ...picked].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPendingNow() {
    if (!editing?.id || pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const sop = await uploadFilesToSop(editing.id, pendingFiles);
      if (!sop) return;
      applySopToState(sop);
      setAttachments(sop.attachments);
      setEditing(sop);
      setPendingFiles([]);
      setMessage("File SOP berhasil diunggah.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal unggah file");
    } finally {
      setUploading(false);
    }
  }

  async function removeFileAttachment(att: SopAttachment) {
    if (!editing?.id) {
      setAttachments((prev) => prev.filter((a) => a.url !== att.url));
      return;
    }
    if (!window.confirm(`Hapus file "${att.label || att.originalName}"?`)) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("sopId", editing.id);
      fd.append("removeUrl", att.url);
      const res = await fetch("/api/master/sops/files", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus file");
        return;
      }
      const sop = data.sop as SopDocument;
      applySopToState(sop);
      setAttachments(sop.attachments);
      setEditing(sop);
      router.refresh();
    } catch {
      setError("Gagal menghapus file");
    } finally {
      setUploading(false);
    }
  }

  function beginReplaceFile(
    sopId: string,
    url: string,
    label: string,
  ) {
    replaceTargetRef.current = { sopId, url, label };
    setListNotice(null);
    setError(null);
    replaceInputRef.current?.click();
  }

  async function onReplaceFilePicked(files: FileList | null) {
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    if (!target || !files?.length) return;
    const file = files[0];
    if (!window.confirm(`Ganti file "${target.label}" dengan "${file.name}"?`)) {
      return;
    }
    setUploading(true);
    setListNotice(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("sopId", target.sopId);
      fd.append("replaceUrl", target.url);
      fd.append("files", file);
      const res = await fetch("/api/master/sops/files", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengganti file");
        setListNotice(data.error || "Gagal mengganti file");
        return;
      }
      const sop = data.sop as SopDocument;
      applySopToState(sop);
      if (editing?.id === sop.id) {
        setAttachments(sop.attachments);
        setEditing(sop);
      }
      setMessage(`File diganti: ${file.name}`);
      setListNotice(`File diganti: ${file.name}`);
      router.refresh();
    } catch {
      setError("Gagal mengganti file");
      setListNotice("Gagal mengganti file");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const filesToUpload = [...pendingFiles];
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

      let sop = data.sop as SopDocument;
      if (filesToUpload.length > 0) {
        try {
          const withFiles = await uploadFilesToSop(sop.id, filesToUpload);
          if (withFiles) sop = withFiles;
        } catch (err) {
          applySopToState(sop);
          setError(
            err instanceof Error
              ? `SOP tersimpan, tapi unggah file gagal: ${err.message}`
              : "SOP tersimpan, tapi unggah file gagal",
          );
          loadForm(sop);
          router.refresh();
          return;
        }
      }

      applySopToState(sop);
      loadForm(null);
      setMessage(
        filesToUpload.length > 0
          ? "SOP dan file lampiran tersimpan."
          : "SOP tersimpan.",
      );
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
            Isi manual (A–E) dan/atau unggah file SOP (PDF, Word, Excel, dll).
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

          <div className="space-y-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-3 py-3">
            <h3 className="text-sm font-semibold">Unggah file SOP</h3>
            <p className="text-xs text-ink-muted">
              PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint, TXT/CSV,
              atau gambar — max 20MB per file, total 10 lampiran.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              onChange={(e) => onPickFiles(e.target.files)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            />
            {pendingFiles.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-ink-muted">
                  Menunggu unggah ({pendingFiles.length}):
                </p>
                <ul className="space-y-1">
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="shrink-0 text-xs text-danger"
                      >
                        Buang
                      </button>
                    </li>
                  ))}
                </ul>
                {editing?.id ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={uploadPendingNow}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {uploading ? "Mengunggah..." : "Unggah sekarang"}
                  </button>
                ) : (
                  <p className="text-xs text-ink-muted">
                    File akan diunggah otomatis saat Anda klik Simpan.
                  </p>
                )}
              </div>
            ) : null}
            {fileAttachments.length > 0 ? (
              <ul className="space-y-1 border-t border-line/60 pt-2">
                {fileAttachments.map((att) => (
                  <li
                    key={att.url}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-brand underline"
                      download={att.originalName || att.label}
                    >
                      {att.originalName || att.label}
                    </a>
                    <div className="flex shrink-0 items-center gap-2">
                      {editing?.id ? (
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() =>
                            beginReplaceFile(
                              editing.id,
                              att.url,
                              att.originalName || att.label,
                            )
                          }
                          className="text-xs text-brand disabled:opacity-60"
                        >
                          Ganti
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => removeFileAttachment(att)}
                        className="text-xs text-danger disabled:opacity-60"
                      >
                        Hapus file
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
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
              placeholder="Menjelaskan proses... (opsional jika sudah unggah file)"
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
              <h3 className="text-sm font-semibold">Link tambahan</h3>
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
            {linkAttachments.map((att) => {
              const idx = attachments.indexOf(att);
              return (
                <div
                  key={`att-link-${idx}`}
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
                          i === idx
                            ? { ...a, url: e.target.value, kind: "link" }
                            : a,
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
              );
            })}
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
              disabled={saving || uploading}
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
          <input
            ref={replaceInputRef}
            type="file"
            accept={FILE_ACCEPT}
            className="hidden"
            onChange={(e) => onReplaceFilePicked(e.target.files)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-semibold">Daftar SOP IT</h2>
              <p className="text-xs text-ink-muted">{items.length} dokumen</p>
              {listNotice ? (
                <p className="mt-1 text-xs text-ok">{listNotice}</p>
              ) : null}
              {uploading ? (
                <p className="mt-1 text-xs text-ink-muted">Mengunggah file...</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>Urut</span>
                <select
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value as SopSortKey);
                    setListPage(1);
                  }}
                  className="rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs text-ink"
                >
                  <option value="code">Nomor SOP</option>
                  <option value="title">Judul</option>
                </select>
              </label>
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
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted">
              Belum ada SOP. Buat dokumen pertama di formulir kiri.
            </p>
          ) : (
            <>
              {pagedItems.map((sop) => {
                const files = sop.attachments.filter(
                  (a) =>
                    a.kind === "file" || a.url.startsWith("/uploads/sops/"),
                );
                return (
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
                        {files.length > 0 ? ` · ${files.length} file` : ""}
                      </p>
                      {files.length > 0 ? (
                        <div className="mt-1.5 flex flex-col gap-1">
                          {files.map((f) => (
                            <div
                              key={f.url}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-bg px-1.5 py-0.5 text-[11px] text-brand underline"
                                download={f.originalName || f.label}
                              >
                                {f.originalName || f.label}
                              </a>
                              <button
                                type="button"
                                disabled={uploading}
                                onClick={() =>
                                  beginReplaceFile(
                                    sop.id,
                                    f.url,
                                    f.originalName || f.label,
                                  )
                                }
                                className="rounded-md border border-brand/30 px-1.5 py-0.5 text-[11px] text-brand disabled:opacity-50"
                              >
                                Ganti file
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => {
                              loadForm(sop);
                              setMessage(
                                "Pilih file di bagian Unggah file SOP, lalu Simpan atau Unggah sekarang.",
                              );
                            }}
                            className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-[11px] text-ink-muted hover:border-brand hover:text-brand disabled:opacity-50"
                          >
                            + Tambah file
                          </button>
                        </div>
                      )}
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
                        sop.active
                          ? "bg-ok-soft text-ok"
                          : "bg-line text-ink-muted"
                      }`}
                    >
                      {sop.active ? "Aktif" : "Off"}
                    </span>
                  </div>
                );
              })}

              {totalListPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <p className="text-xs text-ink-muted">
                    Halaman {currentListPage} dari {totalListPages}
                    {" · "}
                    {(currentListPage - 1) * LIST_PAGE_SIZE + 1}–
                    {Math.min(
                      currentListPage * LIST_PAGE_SIZE,
                      items.length,
                    )}{" "}
                    dari {items.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentListPage <= 1}
                      onClick={() =>
                        setListPage((p) => Math.max(1, p - 1))
                      }
                      className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman sebelumnya"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalListPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setListPage(page)}
                          className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium ${
                            page === currentListPage
                              ? "bg-brand text-white"
                              : "border border-line hover:bg-bg"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={currentListPage >= totalListPages}
                      onClick={() =>
                        setListPage((p) => Math.min(totalListPages, p + 1))
                      }
                      className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Halaman berikutnya"
                    >
                      ›
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
