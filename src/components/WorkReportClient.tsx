"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { ActivityDocumentList } from "@/components/ActivityDocumentList";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
import {
  activityStats,
  buildWorkReportGroups,
  filterActivitiesByPeriod,
  filterProjectsByPeriod,
  formatWorkReportWhatsAppText,
  isActivityPending,
  isProjectPending,
  periodLabel,
  whatsappShareUrl,
  type WorkReportGroup,
  type WorkReportRow,
} from "@/lib/work-report";
import {
  buildReportPeriodOptions,
  formatReportMonth,
} from "@/lib/report-period";
import type {
  Department,
  KpiActivity,
  KpiFunction,
  KpiProject,
  StaffMember,
} from "@/lib/types";

function GroupTable({
  group,
}: {
  group: WorkReportGroup;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-elevated/70 px-3 py-2.5">
        <h3 className="font-semibold">{group.label}</h3>
        <span className="text-xs text-ink-muted">{group.rows.length} item</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted uppercase">
              {group.id === "pending" ? (
                <th className="px-3 py-2.5 font-medium">Jenis</th>
              ) : null}
              <th className="px-3 py-2.5 font-medium">Judul</th>
              <th className="px-3 py-2.5 font-medium">Departemen</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Tanggal</th>
              <th className="px-3 py-2.5 font-medium">PIC</th>
              <th className="px-3 py-2.5 font-medium">Fungsi / Project</th>
              <th className="px-3 py-2.5 font-medium">Lampiran</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={group.id === "pending" ? 8 : 7}
                  className="px-3 py-6 text-center text-ink-muted"
                >
                  Tidak ada data di kelompok ini.
                </td>
              </tr>
            ) : (
              group.rows.map((r: WorkReportRow) => (
                <tr
                  key={`${group.id}-${r.kind}-${r.id}`}
                  className="border-b border-line last:border-0 align-top"
                >
                  {group.id === "pending" ? (
                    <td className="px-3 py-2.5 text-xs text-ink-muted">
                      {r.kind === "activity" ? "Kegiatan" : "Project"}
                      {r.kind === "activity" ? ` · ${r.frequencyLabel}` : ""}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5">
                    <Link
                      href={r.detailHref}
                      className="font-medium text-brand hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">
                    {r.departmentLabel}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] ${
                        r.pending
                          ? "bg-warn-soft text-warn"
                          : r.status === "done"
                            ? "bg-ok-soft text-ok"
                            : "bg-line text-ink-muted"
                      }`}
                    >
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">
                    {r.dateLabel}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.picLabel}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">
                    {r.functionLabel}
                    {r.kind === "activity" && r.projectLabel !== "—"
                      ? ` · ${r.projectLabel}`
                      : r.kind === "project"
                        ? ` · ${r.projectLabel}`
                        : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.photoUrls.length === 0 && r.documents.length === 0 ? (
                      <span className="text-xs text-ink-muted">—</span>
                    ) : (
                      <div className="max-w-[220px] space-y-2">
                        {r.photoUrls.length > 0 ? (
                          <ActivityPhotoSlider
                            photos={r.photoUrls}
                            layout="thumbs"
                          />
                        ) : null}
                        {r.documents.length > 0 ? (
                          <ActivityDocumentList documents={r.documents} />
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function WorkReportClient({
  initialPeriod,
  periodsFromData,
  departments,
  staff,
  functions,
  activities,
  projects,
  lockedDepartmentId,
}: {
  initialPeriod: string;
  periodsFromData: string[];
  departments: Department[];
  staff: StaffMember[];
  functions: KpiFunction[];
  activities: KpiActivity[];
  projects: KpiProject[];
  lockedDepartmentId?: string | null;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [departmentId, setDepartmentId] = useState(
    lockedDepartmentId || "all",
  );

  const periodOptions = useMemo(
    () => buildReportPeriodOptions(periodsFromData),
    [periodsFromData],
  );

  const scopedActivities = useMemo(() => {
    let list = filterActivitiesByPeriod(activities, period);
    if (departmentId !== "all") {
      list = list.filter((a) => a.departmentId === departmentId);
    }
    return list;
  }, [activities, period, departmentId]);

  const scopedProjects = useMemo(() => {
    let list = filterProjectsByPeriod(projects, period);
    if (departmentId !== "all") {
      list = list.filter((p) => p.departmentId === departmentId);
    }
    return list;
  }, [projects, period, departmentId]);

  const groups = useMemo(
    () =>
      buildWorkReportGroups(
        scopedActivities,
        scopedProjects,
        departments,
        staff,
        functions,
      ),
    [scopedActivities, scopedProjects, departments, staff, functions],
  );

  const activeActs = useMemo(
    () => scopedActivities.filter((a) => a.status !== "cancelled"),
    [scopedActivities],
  );
  const pendingActs = useMemo(
    () => scopedActivities.filter((a) => isActivityPending(a.status)),
    [scopedActivities],
  );
  const pendingProjs = useMemo(
    () => scopedProjects.filter((p) => isProjectPending(p.status)),
    [scopedProjects],
  );
  const overall = activityStats(activeActs);
  const pendingTotal = pendingActs.length + pendingProjs.length;

  const periodText = periodLabel(period);
  const departmentText =
    departmentId === "all"
      ? "Semua departemen"
      : (() => {
          const d = departments.find((x) => x.id === departmentId);
          return d ? `${d.code} — ${d.name}` : "Departemen";
        })();

  const exportHref = (format: "xlsx" | "pdf") => {
    const params = new URLSearchParams({
      format,
      period,
      departmentId,
    });
    return `/api/kpi/work-report/export?${params.toString()}`;
  };

  const waText = useMemo(
    () =>
      formatWorkReportWhatsAppText(groups, {
        periodLabel: periodText,
        departmentLabel: departmentText,
      }),
    [groups, periodText, departmentText],
  );

  function shareWhatsApp() {
    window.open(whatsappShareUrl(waText), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Periode</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Semua periode</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {formatReportMonth(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={departmentId}
            disabled={Boolean(lockedDepartmentId)}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            {!lockedDepartmentId ? (
              <option value="all">Semua departemen</option>
            ) : null}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:justify-end">
          <a
            href={exportHref("xlsx")}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
          >
            Export Excel
          </a>
          <a
            href={exportHref("pdf")}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium"
          >
            Export PDF
          </a>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="rounded-xl border border-ok/40 bg-ok-soft/40 px-4 py-2.5 text-sm font-medium text-ok"
          >
            Kirim WhatsApp
          </button>
        </div>
      </div>

      <div className="panel space-y-4 p-4">
        <p className="text-sm text-ink-muted">
          Laporan pekerjaan terpadu · <strong>{periodText}</strong> ·{" "}
          <strong>{departmentText}</strong>
          . Sumber: semua kegiatan harian, mingguan, dan bulanan (kecuali batal).
          Foto &amp; dokumen tampil di kolom Lampiran.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total kegiatan"
            value={String(overall.total)}
            hint="Harian + mingguan + bulanan (semua jenis)"
          />
          <StatCard
            label="Belum selesai"
            value={String(overall.pending)}
            hint="Direncanakan + berjalan"
            tone={overall.pending > 0 ? "warn" : "ok"}
          />
          <StatCard
            label="Selesai"
            value={String(overall.done)}
            tone="ok"
          />
          <StatCard
            label="Pending (keg. + project)"
            value={String(pendingTotal)}
            hint={`${pendingActs.length} kegiatan · ${pendingProjs.length} project`}
            tone={pendingTotal > 0 ? "warn" : "default"}
          />
        </div>

        <div className="space-y-4">
          {groups.map((g) => (
            <GroupTable key={g.id} group={g} />
          ))}
        </div>
      </div>
    </div>
  );
}
