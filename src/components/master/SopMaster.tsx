"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, SopDocument } from "@/lib/types";
import { formatSopDate } from "@/lib/sop-format";

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Jumlah SOP per halaman di daftar kanan */
const LIST_PAGE_SIZE = 5;

type SopSortKey = "code" | "title";

function sopSearchText(sop: SopDocument): string {
  const steps = sop.steps.map((s) => `${s.title} ${s.body}`).join(" ");
  const files = sop.attachments
    .map((a) => `${a.originalName || ""} ${a.label || ""}`)
    .join(" ");
  return [
    sop.code,
    sop.title,
    sop.purpose,
    sop.materials,
    sop.qualifications,
    sop.notes,
    steps,
    sop.documentType,
    sop.divisionLabel,
    sop.departmentName,
    sop.departmentCode,
    files,
  ]
    .join("\n")
    .toLowerCase();
}

function sopMatchesQuery(sop: SopDocument, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = sopSearchText(sop);
  return q.split(/\s+/).every((token) => hay.includes(token));
}

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

export function SopMaster({
  initial,
  departments,
  canManage,
}: {
  initial: SopDocument[];
  departments: Department[];
  canManage: boolean;
}) {
  const router = useRouter();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{
    sopId: string;
    url: string;
    label: string;
  } | null>(null);
  const [items, setItems] = useState(() => sortSops(initial, "code"));
  const [listPage, setListPage] = useState(1);
  const [sortKey, setSortKey] = useState<SopSortKey>("code");
  const [deptFilter, setDeptFilter] = useState("all");
  const [listQuery, setListQuery] = useState("");
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [importDepartmentId, setImportDepartmentId] = useState(
    departments.length > 1 ? "" : (departments[0]?.id ?? ""),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const wordFileRef = useRef<File | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [wordPreview, setWordPreview] = useState<
    Array<{ code: string; title: string; purpose: string; steps: number }> | null
  >(null);
  const [wordWarnings, setWordWarnings] = useState<string[]>([]);
  const [wordFileName, setWordFileName] = useState<string | null>(null);

  function deptOf(id: string) {
    return departments.find((d) => d.id === id);
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (selected.length === filteredItems.length && filteredItems.length > 0) {
      setSelected([]);
    } else setSelected(filteredItems.map((s) => s.id));
  }

  const selectedIdsQuery = useMemo(() => selected.join(","), [selected]);

  const filteredItems = useMemo(() => {
    const byDept =
      deptFilter === "all"
        ? items
        : items.filter((s) => s.departmentId === deptFilter);
    return byDept.filter((s) => sopMatchesQuery(s, listQuery));
  }, [items, deptFilter, listQuery]);

  const sortedItems = useMemo(
    () => sortSops(filteredItems, sortKey),
    [filteredItems, sortKey],
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

  function applySopToState(sop: SopDocument) {
    setItems((prev) => {
      const exists = prev.some((s) => s.id === sop.id);
      if (exists) {
        return prev.map((s) => (s.id === sop.id ? sop : s));
      }
      return [...prev, sop];
    });
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
    const file = files?.[0] ?? null;
    replaceTargetRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    if (!target || !file) return;
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
    router.refresh();
  }

  async function removeSelected() {
    if (!canManage || deletingSelected || selected.length === 0) return;
    const chosen = items.filter((s) => selected.includes(s.id));
    const codes = chosen.map((s) => s.code);
    const preview = codes.slice(0, 8).join(", ");
    const extra =
      codes.length > 8 ? ` dan ${codes.length - 8} lainnya` : "";
    if (
      !window.confirm(
        `Hapus ${selected.length} SOP yang dipilih?\n\n${preview}${extra}\n\nTindakan ini tidak bisa dibatalkan.`,
      )
    ) {
      return;
    }
    setDeletingSelected(true);
    setError(null);
    setListNotice(null);
    try {
      const res = await fetch("/api/master/sops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        ids?: string[];
        errors?: string[];
      };
      if (!res.ok) {
        setError(data.error || "Gagal menghapus SOP terpilih");
        setListNotice(data.error || "Gagal menghapus SOP terpilih");
        return;
      }
      const removed = new Set(data.ids ?? selected);
      setItems((prev) => prev.filter((s) => !removed.has(s.id)));
      setSelected((prev) => prev.filter((id) => !removed.has(id)));
      const n = data.deleted ?? removed.size;
      const failN = data.errors?.length ?? 0;
      setListNotice(
        failN > 0
          ? `${n} SOP dihapus. ${failN} gagal.`
          : `${n} SOP dihapus.`,
      );
      router.refresh();
    } catch {
      setError("Gagal menghapus SOP terpilih");
      setListNotice("Gagal menghapus SOP terpilih");
    } finally {
      setDeletingSelected(false);
    }
  }

  async function toggleActive(sop: SopDocument) {
    if (!canManage || togglingId) return;
    setTogglingId(sop.id);
    setError(null);
    setListNotice(null);
    try {
      const res = await fetch("/api/master/sops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sop.id, active: !sop.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengubah status");
        setListNotice(data.error || "Gagal mengubah status");
        return;
      }
      const next = data.sop as SopDocument;
      applySopToState(next);
      setListNotice(next.active ? `${next.code} diaktifkan` : `${next.code} dinonaktifkan`);
      router.refresh();
    } catch {
      setError("Gagal mengubah status");
      setListNotice("Gagal mengubah status");
    } finally {
      setTogglingId(null);
    }
  }

  async function previewWord(files: FileList | null) {
    const file = files?.[0];
    if (wordInputRef.current) wordInputRef.current.value = "";
    if (!file) return;
    if (!importDepartmentId) {
      setError("Pilih departemen dulu, lalu unggah Word.");
      return;
    }
    setWordBusy(true);
    setError(null);
    setMessage(null);
    setWordPreview(null);
    setWordWarnings([]);
    setWordFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("departmentId", importDepartmentId);
      fd.append("preview", "1");
      fd.append("file", file);
      const res = await fetch("/api/master/sops/import-word", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal membaca file Word");
        setWordFileName(null);
        wordFileRef.current = null;
        return;
      }
      setWordPreview(data.drafts || []);
      setWordWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setWordFileName(file.name);
      wordFileRef.current = file;
    } catch {
      setError("Gagal mengunggah file Word");
      setWordFileName(null);
    } finally {
      setWordBusy(false);
    }
  }

  async function confirmWordImport() {
    const file = wordFileRef.current;
    if (!file || !importDepartmentId) return;
    const n = wordPreview?.length ?? 0;
    if (
      !window.confirm(
        `Impor ${n} SOP ke ${deptOf(importDepartmentId)?.name ?? "departemen ini"}?\n\nSOP dengan nomor yang sama akan diperbarui. SOP baru berstatus Draft (Off).`,
      )
    ) {
      return;
    }
    setWordBusy(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("departmentId", importDepartmentId);
      fd.append("preview", "0");
      fd.append("file", file);
      const res = await fetch("/api/master/sops/import-word", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal impor Word");
        return;
      }
      const imported = Array.isArray(data.sops) ? (data.sops as SopDocument[]) : [];
      setItems((prev) => {
        const next = [...prev];
        for (const sop of imported) {
          const i = next.findIndex((s) => s.id === sop.id);
          if (i >= 0) next[i] = sop;
          else next.push(sop);
        }
        return next;
      });
      setDeptFilter(importDepartmentId);
      setListPage(1);
      setWordPreview(null);
      setWordFileName(null);
      wordFileRef.current = null;
      const warn = Array.isArray(data.warnings) ? data.warnings : [];
      setWordWarnings(warn);
      setMessage(
        `Impor selesai: ${data.created ?? 0} baru, ${data.updated ?? 0} diperbarui.` +
          (warn.length ? ` (${warn.length} peringatan)` : ""),
      );
      router.refresh();
    } catch {
      setError("Gagal impor Word");
    } finally {
      setWordBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
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
          {canManage ? (
            <button
              type="button"
              onClick={removeSelected}
              disabled={deletingSelected}
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger disabled:opacity-50"
            >
              {deletingSelected
                ? "Menghapus..."
                : `Hapus ${selected.length} dipilih`}
            </button>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <div className="panel space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold">Impor dari Word</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Unggah file Master SOP (.docx). Sistem memecah per judul/nomor
              sesuai isi Word, menempelkan pecahan Word asli, lalu membuat PDF
              dengan layout yang sama. Pilih departemen, lalu unggah file Word.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {departments.length > 1 ? (
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>Dept</span>
                <select
                  value={importDepartmentId}
                  onChange={(e) => setImportDepartmentId(e.target.value)}
                  className="rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs text-ink"
                >
                  <option value="">Semua departemen</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <input
              ref={wordInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => previewWord(e.target.files)}
            />
            <button
              type="button"
              disabled={wordBusy || !importDepartmentId}
              onClick={() => wordInputRef.current?.click()}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {wordBusy ? "Membaca Word..." : "Pilih file Word (.docx)"}
            </button>
            {wordFileName ? (
              <span className="text-xs text-ink-muted">{wordFileName}</span>
            ) : null}
            {wordPreview && wordPreview.length > 0 ? (
              <>
                <button
                  type="button"
                  disabled={wordBusy}
                  onClick={confirmWordImport}
                  className="rounded-xl border border-brand px-3 py-2 text-sm font-medium text-brand disabled:opacity-60"
                >
                  Impor {wordPreview.length} SOP
                </button>
                <button
                  type="button"
                  disabled={wordBusy}
                  onClick={() => {
                    setWordPreview(null);
                    setWordFileName(null);
                    setWordWarnings([]);
                    wordFileRef.current = null;
                  }}
                  className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted"
                >
                  Batal
                </button>
              </>
            ) : null}
          </div>
          {wordPreview && wordPreview.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-xs text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nomor</th>
                    <th className="px-3 py-2 font-medium">Judul</th>
                    <th className="px-3 py-2 font-medium">Langkah</th>
                  </tr>
                </thead>
                <tbody>
                  {wordPreview.map((d) => (
                    <tr key={d.code} className="border-t border-line">
                      <td className="mono whitespace-nowrap px-3 py-2 text-xs text-brand">
                        {d.code}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{d.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                          {d.purpose}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-muted">
                        {d.steps}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {wordWarnings.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
              {wordWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div>

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
              <h2 className="font-semibold">Daftar SOP</h2>
              <p className="text-xs text-ink-muted">
                {filteredItems.length} dokumen
                {listQuery.trim()
                  ? ` · hasil pencarian`
                  : deptFilter !== "all"
                    ? ` · ${deptOf(deptFilter)?.name ?? ""}`
                    : departments.length > 1
                      ? " · semua departemen"
                      : ""}
              </p>
              {listNotice ? (
                <p className="mt-1 text-xs text-ok">{listNotice}</p>
              ) : null}
              {uploading ? (
                <p className="mt-1 text-xs text-ink-muted">Mengunggah file...</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <Link
                  href="/master/sops/new"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Tambah
                </Link>
              ) : null}
              {departments.length > 1 ? (
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span>Dept</span>
                  <select
                    value={deptFilter}
                    onChange={(e) => {
                      setDeptFilter(e.target.value);
                      setListPage(1);
                      setSelected([]);
                    }}
                    className="rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs text-ink"
                  >
                    <option value="all">Semua departemen</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
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
                {selected.length === filteredItems.length &&
                filteredItems.length > 0
                  ? "Batal pilih"
                  : "Pilih semua"}
              </button>
              {canManage && selected.length > 0 ? (
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={deletingSelected}
                  className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger disabled:opacity-50"
                >
                  {deletingSelected
                    ? "Menghapus..."
                    : `Hapus dipilih (${selected.length})`}
                </button>
              ) : null}
            </div>
          </div>
          <div className="border-b border-line px-4 py-2.5">
            <label className="sr-only" htmlFor="sop-list-search">
              Cari SOP
            </label>
            <div className="relative">
              <input
                id="sop-list-search"
                type="text"
                value={listQuery}
                onChange={(e) => {
                  setListQuery(e.target.value);
                  setListPage(1);
                }}
                placeholder="Cari nomor, judul, atau isi SOP..."
                className={`w-full rounded-lg border border-line bg-bg-elevated py-2 pl-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-brand ${
                  listQuery ? "pr-9" : "pr-3"
                }`}
              />
              {listQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setListQuery("");
                    setListPage(1);
                  }}
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
          {filteredItems.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted">
              {listQuery.trim()
                ? "Tidak ada SOP yang cocok. Coba kata lain, atau kosongkan pencarian."
                : canManage
                  ? "Belum ada SOP. Klik Tambah untuk membuat dokumen."
                  : "Belum ada SOP untuk departemen Anda."}
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
                        {sop.departmentCode || sop.departmentName} · Berlaku{" "}
                        {formatSopDate(sop.effectiveDate)} · Rev{" "}
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
                                href={
                                  /\.pdf($|\?)/i.test(f.url)
                                    ? `/api/sop/export?format=pdf&ids=${encodeURIComponent(sop.id)}&v=${encodeURIComponent(sop.updatedAt)}`
                                    : /\.docx($|\?)/i.test(f.url)
                                      ? `/api/sop/export?format=docx&ids=${encodeURIComponent(sop.id)}&v=${encodeURIComponent(sop.updatedAt)}`
                                      : `${f.url}${f.url.includes("?") ? "&" : "?"}v=${encodeURIComponent(sop.updatedAt)}`
                                }
                                className="rounded-md bg-bg px-1.5 py-0.5 text-[11px] text-brand underline"
                              >
                                {f.originalName || f.label}
                              </a>
                              {canManage ? (
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
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : canManage ? (
                        <div className="mt-1.5">
                          <Link
                            href={`/master/sops/${sop.id}/edit#unggah-file`}
                            className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-[11px] text-ink-muted hover:border-brand hover:text-brand"
                          >
                            + Tambah file
                          </Link>
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Link
                          href={`/sop/${sop.id}`}
                          className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                        >
                          Baca
                        </Link>
                        <a
                          href={`/api/sop/export?format=pdf&ids=${encodeURIComponent(sop.id)}&v=${encodeURIComponent(sop.updatedAt)}`}
                          className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                        >
                          PDF
                        </a>
                        <a
                          href={`/api/sop/export?format=docx&ids=${encodeURIComponent(sop.id)}&v=${encodeURIComponent(sop.updatedAt)}`}
                          className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-bg"
                        >
                          Word
                        </a>
                        {canManage ? (
                          <>
                            <Link
                              href={`/master/sops/${sop.id}/edit`}
                              className="rounded-lg border border-line px-2 py-1 text-xs"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => remove(sop.id)}
                              className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger"
                            >
                              Hapus
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={togglingId === sop.id}
                        onClick={() => toggleActive(sop)}
                        title={
                          sop.active
                            ? "Klik untuk menonaktifkan"
                            : "Klik untuk mengaktifkan"
                        }
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] disabled:opacity-60 ${
                          sop.active
                            ? "bg-ok-soft text-ok hover:bg-ok/20"
                            : "bg-line text-ink-muted hover:bg-brand-soft hover:text-brand"
                        }`}
                      >
                        {togglingId === sop.id
                          ? "..."
                          : sop.active
                            ? "Aktif"
                            : "Off"}
                      </button>
                    ) : (
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] ${
                          sop.active
                            ? "bg-ok-soft text-ok"
                            : "bg-line text-ink-muted"
                        }`}
                      >
                        {sop.active ? "Aktif" : "Off"}
                      </span>
                    )}
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
                      filteredItems.length,
                    )}{" "}
                    dari {filteredItems.length}
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
