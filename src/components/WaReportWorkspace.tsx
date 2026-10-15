"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Department, KpiActivity, KpiProject, KpiWaReport, StaffMember } from "@/lib/types";

interface WaReportWorkspaceProps {
  departmentId: string;
  departments: Department[];
  activities: KpiActivity[];
  projects: KpiProject[];
  staff: StaffMember[];
  managerStaffIds?: string[];
  sessionUser?: {
    id: string;
    name: string;
    role: string;
    departmentId: string | null;
    staffId?: string | null;
  };
  reports: KpiWaReport[];
  onReportsChange: (reports: KpiWaReport[]) => void;
  staffLimited?: boolean;
  preselectedActivityId?: string | null;
  onClearPreselectedActivity?: () => void;
}

function formatDateTimeIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getLocalDatetimeNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function WaReportWorkspace({
  departmentId,
  departments,
  activities,
  projects,
  staff,
  managerStaffIds = [],
  sessionUser,
  reports,
  onReportsChange,
  staffLimited = false,
  preselectedActivityId,
  onClearPreselectedActivity,
}: WaReportWorkspaceProps) {
  // Modal & Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReport, setEditingReport] = useState<KpiWaReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [reportDate, setReportDate] = useState(getLocalDatetimeNow());
  const [notes, setNotes] = useState("");
  const [activityId, setActivityId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActivity, setFilterActivity] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "this_month">("all");

  // Lightbox Modal
  const [activeLightbox, setActiveLightbox] = useState<{
    report: KpiWaReport;
    photoIndex: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formModalRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentDept = departments.find((d) => d.id === departmentId);
  const deptActivities = useMemo(
    () => activities.filter((a) => a.departmentId === departmentId),
    [activities, departmentId],
  );
  const deptProjects = useMemo(
    () => projects.filter((p) => p.departmentId === departmentId),
    [projects, departmentId],
  );

  // Suggestion names for leader (managers in the department or manager roles)
  const suggestedLeaders = useMemo(() => {
    const list: string[] = [];
    // 1. Staff who are managers
    staff
      .filter((s) => managerStaffIds.includes(s.id) || s.departmentId === departmentId)
      .forEach((s) => {
        if (!list.includes(s.name)) list.push(s.name);
      });
    // Add common generic fallbacks if not present
    if (list.length === 0) {
      list.push("Manager IT", "Direktur Operasional", "General Manager");
    }
    return list.slice(0, 5);
  }, [staff, managerStaffIds, departmentId]);

  // Handle preselectedActivityId
  useEffect(() => {
    if (preselectedActivityId) {
      const target = deptActivities.find((a) => a.id === preselectedActivityId);
      if (target) {
        setActivityId(target.id);
        setTitle(`Laporan Kegiatan: ${target.title}`);
        if (target.projectId) setProjectId(target.projectId);
        setShowFormModal(true);
      }
      onClearPreselectedActivity?.();
    }
  }, [preselectedActivityId, deptActivities, onClearPreselectedActivity]);

  // Open Form for New Report
  const openNewForm = () => {
    setEditingReport(null);
    const defaultLeader = suggestedLeaders[0] || "Pimpinan";
    setLeaderName(defaultLeader);
    setTitle("Laporan WhatsApp ke Pimpinan");
    setReportDate(getLocalDatetimeNow());
    setNotes("");
    setActivityId("");
    setProjectId("");
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setFormError(null);
    setShowFormModal(true);
  };

  // Open Form for Edit Report
  const openEditForm = (report: KpiWaReport) => {
    setEditingReport(report);
    setTitle(report.title);
    setLeaderName(report.leaderName);
    try {
      const d = new Date(report.reportDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setReportDate(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        );
      } else {
        setReportDate(getLocalDatetimeNow());
      }
    } catch {
      setReportDate(getLocalDatetimeNow());
    }
    setNotes(report.notes || "");
    setActivityId(report.activityId || "");
    setProjectId(report.projectId || "");
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setFormError(null);
    setShowFormModal(true);
  };

  // Sync previews when photoFiles change
  useEffect(() => {
    if (photoFiles.length === 0) {
      setPhotoPreviews([]);
      return;
    }
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoFiles]);

  // Handle Clipboard Paste of Images (Ctrl+V)
  useEffect(() => {
    if (!showFormModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const newFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split("/")[1] || "png";
            const file = new File(
              [blob],
              `screenshot-wa-${Date.now()}-${i + 1}.${ext}`,
              { type: item.type },
            );
            newFiles.push(file);
          }
        }
      }

      if (newFiles.length > 0) {
        e.preventDefault();
        setPhotoFiles((prev) => [...prev, ...newFiles]);
        setClipboardNotice(`✓ Berhasil menambahkan ${newFiles.length} screenshot dari clipboard (paste)!`);
        setTimeout(() => setClipboardNotice(null), 4000);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showFormModal]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setPhotoFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removePendingPhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Activity Select in Form
  const handleSelectActivity = (selectedId: string) => {
    setActivityId(selectedId);
    if (selectedId) {
      const act = deptActivities.find((a) => a.id === selectedId);
      if (act) {
        setTitle(`Laporan Kegiatan: ${act.title}`);
        if (act.projectId && !projectId) {
          setProjectId(act.projectId);
        }
      }
    }
  };

  // Submit Form
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const finalLeader = leaderName.trim() || suggestedLeaders[0] || "Pimpinan";
    const finalTitle =
      title.trim() ||
      (activityId
        ? `Laporan Kegiatan: ${deptActivities.find((a) => a.id === activityId)?.title || "Operasional"}`
        : `Laporan WhatsApp ke ${finalLeader}`);

    if (!editingReport && photoFiles.length === 0) {
      setFormError("Harap pilih atau paste (Ctrl+V) minimal 1 foto screenshot chat WhatsApp.");
      return;
    }

    const effectiveDeptId =
      departmentId ||
      sessionUser?.departmentId ||
      (currentDept ? currentDept.id : "");

    if (!effectiveDeptId) {
      setFormError("Departemen tidak terdeteksi. Silakan pilih departemen terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      if (editingReport) {
        formData.append("id", editingReport.id);
      }
      formData.append("departmentId", effectiveDeptId);
      formData.append("title", finalTitle);
      formData.append("leaderName", finalLeader);
      formData.append("reportDate", reportDate);
      formData.append("notes", notes.trim());
      if (activityId) formData.append("activityId", activityId);
      if (projectId) formData.append("projectId", projectId);

      for (const file of photoFiles) {
        formData.append("photos", file);
      }

      const res = await fetch("/api/kpi/wa-reports", {
        method: "POST",
        body: formData,
      });

      let data: { error?: string; report?: KpiWaReport } | null = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Respon server tidak valid (HTTP ${res.status})`);
      }

      if (!res.ok || data?.error || !data?.report) {
        throw new Error(data?.error || `Gagal menyimpan laporan WhatsApp (HTTP ${res.status})`);
      }

      const savedReport: KpiWaReport = data.report;

      if (editingReport) {
        onReportsChange(
          reports.map((r) => (r.id === savedReport.id ? savedReport : r)),
        );
      } else {
        onReportsChange([savedReport, ...reports]);
      }

      setSearchQuery("");
      setFilterActivity("all");
      setFilterPeriod("all");
      setShowFormModal(false);
      try {
        router.refresh();
      } catch {
        /* ignore */
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan";
      setFormError(msg);
      modalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a Report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus bukti laporan WhatsApp ini?")) {
      return;
    }

    try {
      const res = await fetch("/api/kpi/wa-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteId: reportId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Gagal menghapus laporan");
        return;
      }
      onReportsChange(reports.filter((r) => r.id !== reportId));
    } catch {
      alert("Terjadi kesalahan jaringan saat menghapus laporan");
    }
  };

  // Remove photo from existing report
  const handleRemoveExistingPhoto = async (reportId: string, photoUrl: string) => {
    if (!confirm("Hapus screenshot ini dari laporan?")) return;
    try {
      const fd = new FormData();
      fd.append("reportId", reportId);
      fd.append("removeUrl", photoUrl);

      const res = await fetch("/api/kpi/wa-reports/photos", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Gagal menghapus foto");
        return;
      }
      const updated: KpiWaReport = data.report;
      onReportsChange(reports.map((r) => (r.id === updated.id ? updated : r)));
      if (editingReport && editingReport.id === updated.id) {
        setEditingReport(updated);
      }
      if (activeLightbox && activeLightbox.report.id === updated.id) {
        if (updated.photoUrls.length === 0) {
          setActiveLightbox(null);
        } else {
          setActiveLightbox({
            report: updated,
            photoIndex: Math.min(activeLightbox.photoIndex, updated.photoUrls.length - 1),
          });
        }
      }
    } catch {
      alert("Gagal menghapus foto");
    }
  };

  // Filtered reports
  const deptReports = useMemo(
    () => reports.filter((r) => r.departmentId === departmentId),
    [reports, departmentId],
  );

  const filteredReports = useMemo(() => {
    return deptReports.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchLeader = r.leaderName.toLowerCase().includes(q);
        const matchUser = r.userName.toLowerCase().includes(q);
        const matchNotes = (r.notes || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLeader && !matchUser && !matchNotes) return false;
      }

      // Activity filter
      if (filterActivity !== "all") {
        if (r.activityId !== filterActivity) return false;
      }

      // Period filter
      if (filterPeriod !== "all") {
        const d = new Date(r.reportDate);
        const now = new Date();
        if (filterPeriod === "today") {
          const isSameDay =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
          if (!isSameDay) return false;
        } else if (filterPeriod === "this_month") {
          const isSameMonth =
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        }
      }

      return true;
    });
  }, [deptReports, searchQuery, filterActivity, filterPeriod]);

  // Stats
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return deptReports.filter((r) => {
      const d = new Date(r.reportDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [deptReports]);

  const totalPhotosCount = useMemo(() => {
    return deptReports.reduce((sum, r) => sum + (r.photoUrls?.length || 0), 0);
  }, [deptReports]);

  return (
    <div className="space-y-5 p-4 sm:p-5">
      {/* Header Banner & Stats */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-600/25 bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-teal-500/10 p-5 shadow-sm dark:border-emerald-500/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-300">
              {/* WhatsApp Icon */}
              <svg
                className="h-3.5 w-3.5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Pelaporan Resmi ke Pimpinan
            </div>
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Bukti Lapor WhatsApp — {currentDept?.code || "Departemen"}
            </h2>
            <p className="max-w-2xl text-xs text-ink-muted sm:text-sm">
              Upload foto screenshot chat WhatsApp sebagai verifikasi dan arsip bahwa pekerjaan/kegiatan operasional telah dilaporkan kepada pimpinan/atasan.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              + Upload Bukti Lapor WA
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-emerald-600/20 pt-4">
          <div className="rounded-xl bg-white/60 p-2.5 backdrop-blur-xs dark:bg-bg-elevated/60 sm:p-3">
            <p className="text-[11px] font-medium text-ink-muted">Total Bukti Lapor</p>
            <p className="text-lg font-bold text-ink sm:text-xl">{deptReports.length}</p>
          </div>
          <div className="rounded-xl bg-white/60 p-2.5 backdrop-blur-xs dark:bg-bg-elevated/60 sm:p-3">
            <p className="text-[11px] font-medium text-ink-muted">Laporan Bulan Ini</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 sm:text-xl">
              {thisMonthCount}
            </p>
          </div>
          <div className="rounded-xl bg-white/60 p-2.5 backdrop-blur-xs dark:bg-bg-elevated/60 sm:p-3">
            <p className="text-[11px] font-medium text-ink-muted">Total Screenshot Tersimpan</p>
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400 sm:text-xl">
              {totalPhotosCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari perihal, nama pimpinan, pelapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg-elevated py-2 pr-3 pl-9 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Activity Dropdown Filter */}
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="all">Semua Kegiatan</option>
            {deptActivities.map((act) => (
              <option key={act.id} value={act.id}>
                Kegiatan: {act.title}
              </option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as "all" | "today" | "this_month")}
            className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="this_month">Bulan Ini</option>
          </select>
        </div>

        {searchQuery || filterActivity !== "all" || filterPeriod !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterActivity("all");
              setFilterPeriod("all");
            }}
            className="text-xs text-ink-muted hover:text-ink hover:underline"
          >
            Reset Filter
          </button>
        ) : null}
      </div>

      {/* Reports Gallery / Grid */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/40 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-ink">Belum Ada Bukti Laporan WhatsApp</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-muted">
            {searchQuery || filterActivity !== "all" || filterPeriod !== "all"
              ? "Tidak ditemukan laporan yang sesuai dengan filter pencarian Anda."
              : "Unggah screenshot chat WhatsApp ke pimpinan agar menjadi bukti resmi bahwa pekerjaan telah terlaporkan."}
          </p>
          <button
            type="button"
            onClick={openNewForm}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            + Buat Bukti Lapor Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => {
            const linkedActivity = report.activityId
              ? deptActivities.find((a) => a.id === report.activityId)
              : null;
            const hasPhotos = report.photoUrls && report.photoUrls.length > 0;
            const primaryPhoto = hasPhotos ? report.photoUrls[0] : null;

            return (
              <div
                key={report.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition hover:border-emerald-500/40 hover:shadow-md"
              >
                {/* Screenshot Thumbnail Preview */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/5 dark:bg-black/30">
                  {primaryPhoto ? (
                    <button
                      type="button"
                      onClick={() => setActiveLightbox({ report, photoIndex: 0 })}
                      className="group/img relative h-full w-full cursor-zoom-in text-left focus:outline-hidden"
                    >
                      <img
                        src={primaryPhoto}
                        alt={report.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover/img:opacity-100" />
                      <div className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        Perbesar
                      </div>
                      {report.photoUrls.length > 1 ? (
                        <div className="absolute top-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                          +{report.photoUrls.length - 1} foto lain
                        </div>
                      ) : null}
                    </button>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
                      Tidak ada foto screenshot
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs">
                      <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      Terlapor ke Pimpinan
                    </span>
                  </div>
                </div>

                {/* Multiple thumbnails strip if > 1 */}
                {report.photoUrls.length > 1 ? (
                  <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-bg-elevated/40 p-2">
                    {report.photoUrls.map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActiveLightbox({ report, photoIndex: idx })}
                        className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-line hover:border-emerald-500"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDateTimeIndo(report.reportDate)}
                    </span>
                    <span>oleh {report.userName || "Staf"}</span>
                  </div>

                  <h4 className="mt-2 text-sm font-semibold text-ink line-clamp-2">
                    {report.title}
                  </h4>

                  {/* Leader target */}
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-bg-elevated/60 px-3 py-2 text-xs">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider">Dilaporkan Kepada:</p>
                      <p className="font-semibold text-ink truncate">{report.leaderName}</p>
                    </div>
                  </div>

                  {/* Linked Activity Badge */}
                  {linkedActivity ? (
                    <div className="mt-2">
                      <span className="inline-flex max-w-full items-center gap-1 truncate rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-deep">
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Kegiatan: {linkedActivity.title}
                      </span>
                    </div>
                  ) : null}

                  {/* Notes / Quote */}
                  {report.notes ? (
                    <p className="mt-2.5 rounded-lg border-l-2 border-emerald-500 bg-bg-elevated/30 p-2 text-xs text-ink-muted italic line-clamp-3">
                      &ldquo;{report.notes}&rdquo;
                    </p>
                  ) : null}

                  {/* Footer Actions */}
                  <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3">
                    <div className="flex items-center gap-2">
                      {primaryPhoto ? (
                        <a
                          href={primaryPhoto}
                          download={`wa-report-${report.id}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink hover:underline"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Unduh
                        </a>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(report)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {showFormModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop (Dark overlay with blur) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setShowFormModal(false)}
          />

          {/* Centering shell (handles desktop centering, small-screen safety, full scrollability) */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-5 pointer-events-none">
            <div
              ref={formModalRef}
              className="pointer-events-auto relative z-10 flex flex-col w-full max-w-xl my-auto rounded-2xl border border-line bg-surface shadow-2xl transition overflow-hidden"
              style={{ maxHeight: "calc(100vh - 2.5rem)", height: "auto" }}
            >
              {/* Modal Header (Sticky Top) */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 shrink-0 bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {editingReport ? "Edit Bukti Lapor WA" : "Upload Bukti Lapor WhatsApp"}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Lampirkan screenshot WhatsApp bukti laporan ke pimpinan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmitting && setShowFormModal(false)}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-elevated hover:text-ink"
                  title="Tutup (Esc)"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form wrapping scrollable content and sticky actions */}
              <form
                id="wa-report-form"
                onSubmit={handleSubmit}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                {/* Scrollable Modal Body */}
                <div
                  ref={modalScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain"
                >
                  {formError ? (
                    <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3 text-xs font-semibold text-danger">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  {clipboardNotice ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/30 dark:text-emerald-300">
                      <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {clipboardNotice}
                    </div>
                  ) : null}

                  {/* Tautkan ke Kegiatan (Dropdown) */}
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Tautkan ke Kegiatan Operasional (Opsional)
                    </label>
                    <select
                      value={activityId}
                      onChange={(e) => handleSelectActivity(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
                    >
                      <option value="">-- Tidak ditautkan ke kegiatan spesifik --</option>
                      {deptActivities.map((act) => (
                        <option key={act.id} value={act.id}>
                          [{act.frequency.toUpperCase()}] {act.title}
                        </option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      Memilih kegiatan akan otomatis mengisi judul laporan dan menandai kegiatan tersebut sebagai terlapor.
                    </p>
                  </div>

                  {/* Judul / Perihal */}
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Perihal / Judul Laporan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Laporan Rutin Backup Database & Server"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Nama Pimpinan & Tanggal Lapor */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink">
                        Nama Pimpinan / Atasan
                      </label>
                      <input
                        type="text"
                        placeholder="Nama atasan / pimpinan"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
                      />
                      {suggestedLeaders.length > 0 ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-ink-muted">Saran:</span>
                          {suggestedLeaders.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setLeaderName(name)}
                              className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-[10px] text-ink hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink">
                        Tanggal & Waktu Lapor
                      </label>
                      <input
                        type="datetime-local"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Catatan / Keterangan */}
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Catatan / Respon Pimpinan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Keterangan isi chat atau arahan balasan dari pimpinan..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Upload Screenshot Box (with Drag & Drop + Paste Support) */}
                  <div className="rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-3.5 text-center dark:bg-emerald-500/10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-ink sm:text-sm">
                        Pilih Foto Screenshot atau <span className="text-emerald-600 dark:text-emerald-400 font-bold">Paste (Ctrl+V)</span> Langsung
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        Bisa screenshot WhatsApp Desktop / Web lalu langsung tekan Ctrl+V saat form ini aktif
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs ring-1 ring-emerald-600/30 hover:bg-emerald-50 dark:bg-surface dark:text-emerald-300 dark:ring-emerald-500/30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Pilih File Gambar
                      </button>
                    </div>

                    {/* Previews of Pending Files */}
                    {photoPreviews.length > 0 ? (
                      <div className="mt-3 border-t border-emerald-600/20 pt-2.5 text-left">
                        <p className="text-xs font-semibold text-ink">
                          Screenshot Baru yang Akan Diunggah ({photoPreviews.length}):
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {photoPreviews.map((url, i) => (
                            <div key={url} className="group/thumb relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-black/5">
                              <img src={url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removePendingPhoto(i)}
                                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white opacity-80 transition hover:opacity-100"
                                title="Hapus foto ini"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Existing Photos when editing */}
                    {editingReport && editingReport.photoUrls.length > 0 ? (
                      <div className="mt-3 border-t border-line pt-2.5 text-left">
                        <p className="text-xs font-semibold text-ink">
                          Screenshot Tersimpan ({editingReport.photoUrls.length}):
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editingReport.photoUrls.map((url) => (
                            <div key={url} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-black/5">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingPhoto(editingReport.id, url)}
                                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white opacity-80 transition hover:opacity-100"
                                title="Hapus foto dari database"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Sticky Action Footer (Always pinned to bottom) */}
                <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-elevated px-5 py-3 shrink-0">
                  <div className="min-w-0 flex-1">
                    {formError ? (
                      <p className="text-xs font-semibold text-danger truncate" title={formError}>
                        ⚠️ {formError}
                      </p>
                    ) : photoFiles.length > 0 ? (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                        ✓ {photoFiles.length} foto screenshot siap diunggah
                      </p>
                    ) : (
                      <p className="text-xs text-ink-muted truncate">
                        Foto screenshot siap dilampirkan
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowFormModal(false)}
                      className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-bg-elevated hover:text-ink disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Menyimpan...
                        </>
                      ) : editingReport ? (
                        "Simpan Perubahan"
                      ) : (
                        "Simpan & Unggah Bukti"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lightbox Modal (Full-Screen Image View) */}
      {activeLightbox ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setActiveLightbox(null)}
        >
          {/* Top Bar */}
          <div
            className="absolute top-4 right-4 left-4 flex items-center justify-between text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                ✓ Lapor WA Pimpinan
              </span>
              <p className="font-semibold text-sm drop-shadow-md">
                {activeLightbox.report.title}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeLightbox.report.photoUrls[activeLightbox.photoIndex] ? (
                <a
                  href={activeLightbox.report.photoUrls[activeLightbox.photoIndex]}
                  download={`screenshot-wa-${activeLightbox.report.id}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs transition hover:bg-white/30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Unduh Gambar
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => setActiveLightbox(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs hover:bg-white/30"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Image View */}
          <div
            className="relative flex max-h-[78vh] max-w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeLightbox.report.photoUrls[activeLightbox.photoIndex]}
              alt={activeLightbox.report.title}
              className="max-h-[78vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />

            {/* Prev / Next Buttons */}
            {activeLightbox.report.photoUrls.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightbox({
                      ...activeLightbox,
                      photoIndex:
                        (activeLightbox.photoIndex - 1 + activeLightbox.report.photoUrls.length) %
                        activeLightbox.report.photoUrls.length,
                    })
                  }
                  className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightbox({
                      ...activeLightbox,
                      photoIndex:
                        (activeLightbox.photoIndex + 1) % activeLightbox.report.photoUrls.length,
                    })
                  }
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>

          {/* Bottom Info Bar */}
          <div
            className="absolute bottom-4 max-w-2xl rounded-xl bg-black/70 px-4 py-2.5 text-center text-xs text-white backdrop-blur-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">
              Kepada: <strong>{activeLightbox.report.leaderName}</strong> · Dilaporkan pada:{" "}
              {formatDateTimeIndo(activeLightbox.report.reportDate)}
            </p>
            {activeLightbox.report.notes ? (
              <p className="mt-1 text-white/80 italic">&ldquo;{activeLightbox.report.notes}&rdquo;</p>
            ) : null}
            {activeLightbox.report.photoUrls.length > 1 ? (
              <p className="mt-1 text-[11px] text-white/60">
                Foto {activeLightbox.photoIndex + 1} dari {activeLightbox.report.photoUrls.length}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
