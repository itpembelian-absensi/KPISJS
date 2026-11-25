"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Department,
  SopAttachment,
  SopDisposition,
  SopDocument,
  SopStep,
} from "@/lib/types";
import {
  defaultSopDispositions,
  sopDivisionLabelFromDepartment,
} from "@/lib/types";
import { automaticSopCode, toDateInputValue } from "@/lib/sop-format";

function isFileAttachment(att: SopAttachment) {
  return att.kind === "file" || att.url.startsWith("/uploads/sops/");
}

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function SopForm({
  departments,
  defaultDepartmentId,
  initial,
}: {
  departments: Department[];
  defaultDepartmentId: string;
  initial?: SopDocument | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{ url: string; label: string } | null>(null);

  const startDeptId =
    initial?.departmentId &&
    departments.some((d) => d.id === initial.departmentId)
      ? initial.departmentId
      : defaultDepartmentId || departments[0]?.id || "";
  const startDept = departments.find((d) => d.id === startDeptId);

  const [record, setRecord] = useState<SopDocument | null>(initial ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [departmentId, setDepartmentId] = useState(startDeptId);
  const [divisionLabel, setDivisionLabel] = useState(
    initial?.divisionLabel ??
      (startDept ? sopDivisionLabelFromDepartment(startDept.name) : "DIVISI"),
  );
  const documentType = initial?.documentType ?? "STANDARD OPERATING PROCEDURE";
  const effectiveDate = toDateInputValue(initial?.effectiveDate ?? "");
  const revision = initial?.revision ?? "-";
  const revisionDate = toDateInputValue(initial?.revisionDate ?? "");
  const purpose = initial?.purpose ?? "";
  const materials = initial?.materials ?? "";
  const qualifications = initial?.qualifications ?? "";
  const notes = initial?.notes ?? "";
  const [active, setActive] = useState(initial?.active ?? true);
  const steps: SopStep[] =
    initial && initial.steps.length > 0
      ? initial.steps.map((s, i) => ({ ...s, order: i + 1 }))
      : [];
  const [dispositions, setDispositions] = useState<SopDisposition[]>(
    initial?.dispositions?.length
      ? initial.dispositions.map((d) => ({ ...d }))
      : defaultSopDispositions(startDept?.name ?? ""),
  );
  const [attachments, setAttachments] = useState<SopAttachment[]>(
    initial?.attachments?.length ? [...initial.attachments] : [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEdit = Boolean(record?.id);
  const selectedDept = departments.find((d) => d.id === departmentId);
  const codePlaceholder = selectedDept
    ? automaticSopCode(selectedDept.code, 1)
    : automaticSopCode("IT", 1);
  const fileAttachments = useMemo(
    () => attachments.filter((a) => isFileAttachment(a)),
    [attachments],
  );

  function onDepartmentChange(id: string) {
    const d = departments.find((x) => x.id === id);
    setDepartmentId(id);
    if (!d) return;
    setDivisionLabel(sopDivisionLabelFromDepartment(d.name));
    if (!isEdit) setDispositions(defaultSopDispositions(d.name));
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
    if (!res.ok) throw new Error(data.error || "Gagal mengunggah file");
    return data.sop as SopDocument;
  }

  function onPickFiles(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    const current = fileAttachments[0];
    if (record?.id && current) {
      void replaceStoredFile(
        current.url,
        current.originalName || current.label,
        file,
      );
      return;
    }
    setPendingFiles([file]);
  }

  async function removeFileAttachment(att: SopAttachment) {
    if (!record?.id) {
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
      fd.append("sopId", record.id);
      fd.append("removeUrl", att.url);
      const res = await fetch("/api/master/sops/files", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus file");
        return;
      }
      const sop = data.sop as SopDocument;
      setRecord(sop);
      setAttachments(sop.attachments);
      router.refresh();
    } catch {
      setError("Gagal menghapus file");
    } finally {
      setUploading(false);
    }
  }

  function beginReplaceFile(url: string, label: string) {
    replaceTargetRef.current = { url, label };
    replaceInputRef.current?.click();
  }

  async function replaceStoredFile(url: string, label: string, file: File) {
    if (!record?.id) return;
    if (!window.confirm(`Ganti file "${label}" dengan "${file.name}"?`)) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("sopId", record.id);
      fd.append("replaceUrl", url);
      fd.append("files", file);
      const res = await fetch("/api/master/sops/files", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengganti file");
        return;
      }
      const sop = data.sop as SopDocument;
      setRecord(sop);
      setAttachments(sop.attachments);
      setPendingFiles([]);
      router.refresh();
    } catch {
      setError("Gagal mengganti file");
    } finally {
      setUploading(false);
    }
  }

  async function onReplaceFilePicked(files: FileList | null) {
    const target = replaceTargetRef.current;
    const file = files?.[0] ?? null;
    replaceTargetRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    if (!target || !file) return;
    await replaceStoredFile(target.url, target.label, file);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const filesToUpload = [...pendingFiles];
    try {
      const res = await fetch("/api/master/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record?.id,
          departmentId,
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
      setRecord(sop);
      if (filesToUpload.length > 0) {
        try {
          const withFiles = await uploadFilesToSop(sop.id, filesToUpload);
          if (withFiles) sop = withFiles;
        } catch (err) {
          setRecord(sop);
          setError(
            err instanceof Error
              ? `SOP tersimpan, tapi unggah file gagal: ${err.message}`
              : "SOP tersimpan, tapi unggah file gagal",
          );
          if (!record?.id) {
            router.replace(`/master/sops/${sop.id}/edit`);
          }
          router.refresh();
          return;
        }
      }

      router.push("/master/sops");
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="panel mx-auto max-w-4xl space-y-3 p-5">
      <input
        ref={replaceInputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={(e) => onReplaceFilePicked(e.target.files)}
      />
      <h2 className="font-semibold">{isEdit ? "Edit SOP" : "Tambah SOP"}</h2>
      <p className="text-xs text-ink-muted">
        Satu SOP per departemen. Cukup judul, nomor, dan satu file (PDF atau Word).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            required
            value={departmentId}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            {departments.length === 0 ? (
              <option value="">Tidak ada departemen</option>
            ) : null}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
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
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs text-ink-muted">
            Nomor dokumen (kosong = otomatis)
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            placeholder={codePlaceholder}
          />
        </label>
      </div>

      <div
        id="unggah-file"
        className="space-y-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-3 py-3"
      >
        <h3 className="text-sm font-semibold">File SOP</h3>
        <p className="text-xs text-ink-muted">
          Satu file untuk seluruh isi SOP departemen. PDF atau Word, maksimal 20MB.
        </p>
        {fileAttachments.length === 0 ? (
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            onChange={(e) => onPickFiles(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          />
        ) : null}
        {pendingFiles.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-ink-muted">
              File baru, diunggah saat Simpan:
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
                      setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="shrink-0 text-xs text-danger"
                  >
                    Buang
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted">Diunggah saat Simpan.</p>
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
                  {record?.id ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() =>
                        beginReplaceFile(att.url, att.originalName || att.label)
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Aktif (bisa dipakai; Off = masih draft)
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <Link
          href="/master/sops"
          className="rounded-xl border border-line px-4 py-2 text-sm"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
