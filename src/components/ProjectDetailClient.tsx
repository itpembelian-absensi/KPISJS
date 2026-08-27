"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Department,
  KpiActivity,
  KpiFunction,
  KpiProject,
  StaffMember,
} from "@/lib/types";

const PROJECT_STATUS = {
  planned: "Direncanakan",
  active: "Berjalan",
  on_hold: "Ditunda",
  done: "Selesai",
  cancelled: "Batal",
} as const;

const ACTIVITY_STATUS = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Batal",
} as const;

export function ProjectDetailClient({
  project,
  department,
  kpiFunction,
  owner,
  activities,
  backHref = "/kpi/departments?tab=project",
}: {
  project: KpiProject;
  department: Department | null;
  kpiFunction: KpiFunction | null;
  owner: StaffMember | null;
  activities: KpiActivity[];
  backHref?: string;
}) {
  const router = useRouter();

  function closeView() {
    if (window.history.length > 1) router.back();
    else router.push(backHref);
  }

  return (
    <div className="space-y-4">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Detail project
        </p>
        <p className="mono mt-1 text-xs text-brand">{project.code}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {department
            ? `${department.code} — ${department.name}`
            : "Departemen"}{" "}
          · {PROJECT_STATUS[project.status]} · {project.progressPercent}%
          {kpiFunction ? ` · ${kpiFunction.name}` : ""}
        </p>
      </div>

      <section className="panel space-y-4 p-4 sm:p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">Owner</dt>
            <dd className="mt-0.5 font-medium">
              {owner ? `${owner.name} (${owner.employeeCode})` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Jadwal</dt>
            <dd className="mt-0.5 font-medium">
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString("id-ID")
                : "—"}{" "}
              →{" "}
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString("id-ID")
                : "—"}
            </dd>
          </div>
        </dl>

        {project.description ? (
          <div>
            <p className="text-xs text-ink-muted">Deskripsi</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {project.description}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Kegiatan terkait ({activities.length})
          </p>
          {activities.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Belum ada kegiatan.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/kpi/activities/${a.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-sm hover:bg-brand-soft/30"
                  >
                    <div>
                      <p className="font-medium text-brand">{a.title}</p>
                      <p className="text-xs text-ink-muted">
                        {ACTIVITY_STATUS[a.status]}
                        {a.activityDate
                          ? ` · ${new Date(a.activityDate).toLocaleDateString("id-ID")}`
                          : ""}
                        {a.photoUrls?.length
                          ? ` · ${a.photoUrls.length} foto`
                          : ""}
                        {a.documents?.length
                          ? ` · ${a.documents.length} dokumen`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-ink-muted">Lihat →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={closeView}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium"
          >
            Tutup view
          </button>
        </div>
      </section>
    </div>
  );
}
