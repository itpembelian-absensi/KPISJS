"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Department,
  KpiActivity,
  KpiAssessment,
  KpiFunction,
  KpiProject,
  StaffMember,
} from "@/lib/types";

const ACTIVITY_STATUS = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Batal",
} as const;

type ProjectGroup = {
  key: string;
  project: KpiProject | null;
  activities: KpiActivity[];
  percent: number;
  label: string;
  href: string;
  meta: string;
};

function progressOf(status: string) {
  if (status === "done") return 1;
  if (status === "in_progress") return 0.5;
  return 0;
}

function buildProjectGroups(
  activities: KpiActivity[],
  projects: KpiProject[],
  functionId: string,
): ProjectGroup[] {
  const byProject = new Map<string, KpiActivity[]>();
  const without: KpiActivity[] = [];

  for (const a of activities) {
    if (a.projectId) {
      const list = byProject.get(a.projectId) ?? [];
      list.push(a);
      byProject.set(a.projectId, list);
    } else {
      without.push(a);
    }
  }

  const groups: ProjectGroup[] = [];

  for (const [projectId, list] of byProject) {
    const project = projects.find((p) => p.id === projectId) ?? null;
    const sum = list.reduce((s, a) => s + progressOf(a.status), 0);
    const percent =
      list.length === 0 ? 0 : Math.round((sum / list.length) * 1000) / 10;
    const done = list.filter((a) => a.status === "done").length;
    const jalan = list.filter((a) => a.status === "in_progress").length;
    groups.push({
      key: projectId,
      project,
      activities: list,
      percent,
      label: project ? `${project.code} — ${project.title}` : "Project",
      href: `/kpi/projects/${projectId}?from=assessment&functionId=${functionId}`,
      meta: `${list.length} kegiatan · ${done} selesai · ${jalan} jalan`,
    });
  }

  for (const a of without) {
    groups.push({
      key: a.id,
      project: null,
      activities: [a],
      percent: Math.round(progressOf(a.status) * 1000) / 10,
      label: a.title,
      href: `/kpi/activities/${a.id}`,
      meta: `${ACTIVITY_STATUS[a.status]}${
        a.activityDate
          ? ` · ${new Date(a.activityDate).toLocaleDateString("id-ID")}`
          : ""
      } · tanpa project`,
    });
  }

  return groups;
}

export function AssessmentHistoryClient({
  kpiFunction,
  department,
  assessments,
  activities,
  projects,
  autoScore,
  staff,
  canDelete = false,
}: {
  kpiFunction: KpiFunction;
  department: Department | null;
  assessments: KpiAssessment[];
  activities: KpiActivity[];
  projects: KpiProject[];
  autoScore: {
    percent: number;
    detail: string;
    total: number;
    done: number;
    inProgress: number;
    planned: number;
  };
  staff: StaffMember[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const groups = buildProjectGroups(activities, projects, kpiFunction.id);

  function staffName(id: string | null) {
    if (!id) return "Departemen";
    return staff.find((s) => s.id === id)?.name ?? "—";
  }

  async function removeAssessment(id: string) {
    if (!confirm("Hapus penilaian ini?")) return;
    const res = await fetch("/api/kpi/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Gagal menghapus");
      return;
    }
    router.refresh();
  }

  function closeView() {
    if (window.history.length > 1) router.back();
    else router.push("/kpi/departments?tab=penilaian");
  }

  return (
    <div className="space-y-4">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Riwayat penilaian
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {kpiFunction.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {department
            ? `${department.code} — ${department.name}`
            : "Departemen"}{" "}
          · Bobot fungsi {kpiFunction.weightPercent}%
          {kpiFunction.focus ? ` · ${kpiFunction.focus}` : ""}
        </p>
      </div>

      <section className="panel space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Skor otomatis (dari kegiatan)</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Selesai 100% · Dikerjakan 50% · Rencana 0%. Ini yang muncul di
              tabel Penilaian &amp; Skor — bukan dari daftar manual di bawah.
            </p>
          </div>
          <p className="text-3xl font-semibold text-brand">
            {autoScore.percent}%
          </p>
        </div>
        <p className="text-sm text-ink-muted">{autoScore.detail}</p>
        <p className="text-xs text-ink-muted">
          Ditampilkan per project (1 baris). Klik untuk buka detail &amp;
          daftar kegiatan.
        </p>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Belum ada kegiatan untuk fungsi ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.key}>
                <Link
                  href={g.href}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-sm transition hover:bg-brand-soft/40"
                >
                  <div>
                    <p className="font-medium text-brand">{g.label}</p>
                    <p className="text-xs text-ink-muted">{g.meta}</p>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted">
                    {g.percent}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Penilaian manual</h2>
          <p className="text-xs text-ink-muted">
            {assessments.length} entri · diisi lewat form Input penilaian
            manual (opsional / override)
          </p>
        </div>

        {assessments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            Belum ada penilaian manual. Skor {autoScore.percent}% di atas tetap
            valid dari kegiatan otomatis.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{a.periodLabel}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {staffName(a.staffId)}
                    {a.assessedByName ? ` · oleh ${a.assessedByName}` : ""}
                  </p>
                  {a.notes ? (
                    <p className="mt-1 text-sm text-ink-muted">{a.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      a.score >= a.targetScore ? "text-ok" : "text-warn"
                    }`}
                  >
                    {a.score}/{a.targetScore}
                  </span>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void removeAssessment(a.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Hapus
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
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
