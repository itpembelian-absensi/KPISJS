"use client";

import { useRouter } from "next/navigation";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
import type {
  KpiActivity,
  KpiActivityFrequency,
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

const ACTIVITY_FREQUENCY: Record<KpiActivityFrequency, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

export function ActivityDetailClient({
  activity,
  project,
  kpiFunction,
  assignee,
}: {
  activity: KpiActivity;
  project: KpiProject | null;
  kpiFunction: KpiFunction | null;
  assignee: StaffMember | null;
}) {
  const router = useRouter();

  function closeView() {
    if (window.history.length > 1) router.back();
    else router.push("/kpi/departments?tab=kegiatan");
  }

  return (
    <div className="space-y-4">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Detail kegiatan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {activity.title}
        </h1>
      </div>

      <section className="panel space-y-4 p-4 sm:p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-muted">Status</dt>
            <dd className="mt-0.5 font-medium">
              {ACTIVITY_STATUS[activity.status]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Frekuensi</dt>
            <dd className="mt-0.5 font-medium">
              {ACTIVITY_FREQUENCY[activity.frequency || "daily"]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Tanggal kegiatan</dt>
            <dd className="mt-0.5 font-medium">
              {activity.activityDate
                ? new Date(activity.activityDate).toLocaleDateString("id-ID")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Fungsi KPI</dt>
            <dd className="mt-0.5 font-medium">{kpiFunction?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">PIC</dt>
            <dd className="mt-0.5 font-medium">
              {assignee
                ? `${assignee.name} (${assignee.employeeCode})`
                : "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-muted">Project terkait</dt>
            <dd className="mt-0.5 font-medium">
              {project ? `${project.code} — ${project.title}` : "—"}
            </dd>
          </div>
        </dl>

        {activity.description ? (
          <div>
            <p className="text-xs text-ink-muted">Detail</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {activity.description}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Foto kegiatan
            {activity.photoUrls?.length
              ? ` (${activity.photoUrls.length})`
              : ""}
          </p>
          {activity.photoUrls?.length ? (
            <div className="mx-auto mt-2 max-w-2xl">
              <ActivityPhotoSlider photos={activity.photoUrls} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Belum ada foto.</p>
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
