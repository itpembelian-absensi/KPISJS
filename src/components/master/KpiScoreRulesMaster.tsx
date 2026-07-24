"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DATA_SOURCE_LABEL,
  METRIC_TYPE_LABEL,
  dataSourceBadgeLabel,
} from "@/lib/kpi-score-templates";
import type {
  Department,
  KpiFunction,
  KpiScoreDataSource,
  KpiScoreIndicator,
  KpiScoreMetricType,
} from "@/lib/types";

function formatBands(
  ind: KpiScoreIndicator,
): string {
  const c = ind.config;
  if (ind.metricType === "scale_count" && c.bands?.length) {
    return c.bands
      .map((b) => `${b.label || `≥${b.min}`} → ${b.score}`)
      .join(" · ");
  }
  if (ind.metricType === "scale_percent" && c.bandsPercent?.length) {
    return c.bandsPercent
      .map((b) => `${b.label || `≥${b.min}%`} → ${b.score}`)
      .join(" · ");
  }
  if (c.penalties?.length) {
    return c.penalties.map((p) => `${p.label} ${p.points}`).join(" · ");
  }
  if (c.notes) return c.notes;
  if (ind.metricType === "attendance") return "Dari modul absensi";
  if (ind.metricType === "weighted_leaf") return "Input nilai 0–100";
  return "—";
}

export function KpiScoreRulesMaster({
  departments,
  initialFunctions,
  initialIndicators,
  defaultDepartmentId,
}: {
  departments: Department[];
  initialFunctions: KpiFunction[];
  initialIndicators: KpiScoreIndicator[];
  defaultDepartmentId: string;
}) {
  const router = useRouter();
  const [deptId, setDeptId] = useState(
    defaultDepartmentId || departments[0]?.id || "",
  );
  const [functions, setFunctions] = useState(initialFunctions);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<KpiScoreIndicator | null>(null);
  const [showForm, setShowForm] = useState(false);

  const deptFunctions = useMemo(
    () =>
      functions
        .filter((f) => f.departmentId === deptId && f.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [functions, deptId],
  );

  const deptIndicators = useMemo(
    () => indicators.filter((i) => i.departmentId === deptId && i.active),
    [indicators, deptId],
  );

  const grouped = useMemo(() => {
    return deptFunctions.map((fn) => {
      const inds = deptIndicators
        .filter((i) => i.kpiFunctionId === fn.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const indWeight = inds.reduce((s, i) => s + i.weightPercent, 0);
      return { fn, inds, indWeight };
    });
  }, [deptFunctions, deptIndicators]);

  async function reloadDept(nextDeptId: string) {
    const res = await fetch(
      `/api/master/kpi-score-rules?departmentId=${encodeURIComponent(nextDeptId)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal memuat data");
      return;
    }
    setFunctions(data.functions || []);
    setIndicators(data.indicators || []);
  }

  async function saveIndicator(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const metricType = String(fd.get("metricType")) as KpiScoreMetricType;
    const dataSource = String(fd.get("dataSource") || "manual") as KpiScoreDataSource;
    const defaultTarget = Number(fd.get("defaultTarget") || 0);
    const config: KpiScoreIndicator["config"] = {
      ...(editing?.config || {}),
      notes: String(fd.get("notes") || ""),
      dataSource:
        metricType === "attendance"
          ? "attendance"
          : dataSource || "manual",
    };
    if (defaultTarget > 0) config.defaultTarget = defaultTarget;
    else delete config.defaultTarget;

    try {
      const res = await fetch("/api/master/kpi-score-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          departmentId: deptId,
          kpiFunctionId: fd.get("kpiFunctionId"),
          name: fd.get("name"),
          description: fd.get("description"),
          weightPercent: fd.get("weightPercent"),
          metricType,
          sortOrder: fd.get("sortOrder"),
          active: true,
          config,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan");
        return;
      }
      setIndicators((prev) => {
        const exists = prev.some((x) => x.id === data.indicator.id);
        if (exists) {
          return prev.map((x) =>
            x.id === data.indicator.id ? data.indicator : x,
          );
        }
        return [...prev, data.indicator];
      });
      setEditing(null);
      setShowForm(false);
      setMessage("Indikator disimpan.");
      setError(null);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  async function removeIndicator(ind: KpiScoreIndicator) {
    if (!confirm(`Hapus indikator "${ind.name}"?`)) return;
    setError(null);
    const res = await fetch("/api/master/kpi-score-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: ind.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus");
      return;
    }
    setIndicators((prev) => prev.filter((x) => x.id !== ind.id));
    if (editing?.id === ind.id) {
      setEditing(null);
      setShowForm(false);
    }
    router.refresh();
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  const deptMeta = departments.find((d) => d.id === deptId);
  const deptLabel = deptMeta
    ? `${deptMeta.code} — ${deptMeta.name}`
    : "Departemen";

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm font-medium text-brand hover:underline"
            >
              ← Kembali ke daftar aturan skor
            </button>
            <p className="mt-1 text-xs text-ink-muted">{deptLabel}</p>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form
          key={editing?.id ?? "new-ind"}
          onSubmit={saveIndicator}
          className="panel mx-auto max-w-xl space-y-3 p-4 sm:p-5"
        >
          <h2 className="font-semibold">
            {editing ? "Edit indikator" : "Tambah indikator"}
          </h2>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Fungsi KPI</span>
            <select
              name="kpiFunctionId"
              required
              defaultValue={editing?.kpiFunctionId || deptFunctions[0]?.id || ""}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            >
              {deptFunctions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.weightPercent}%)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Nama indikator</span>
            <input
              name="name"
              required
              defaultValue={editing?.name}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Deskripsi</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={editing?.description}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Bobot dalam fungsi (%)</span>
              <input
                name="weightPercent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                defaultValue={editing?.weightPercent ?? 100}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Urutan</span>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={editing?.sortOrder ?? 0}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Tipe hitung</span>
              <select
                name="metricType"
                defaultValue={editing?.metricType ?? "scale_percent"}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              >
                {(Object.keys(METRIC_TYPE_LABEL) as KpiScoreMetricType[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {METRIC_TYPE_LABEL[k]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Sumber capaian</span>
              <select
                name="dataSource"
                defaultValue={
                  editing?.config.dataSource ||
                  (editing?.metricType === "attendance"
                    ? "attendance"
                    : "manual")
                }
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
              >
                {(Object.keys(DATA_SOURCE_LABEL) as KpiScoreDataSource[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {DATA_SOURCE_LABEL[k]}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-ink-muted">
            <strong>Manual</strong> = diisi di Penilaian &amp; Skor.{" "}
            <strong>Otomatis · Absensi</strong> sudah terhubung. Ticket /
            Kegiatan / Project = rencana otomatis (sementara masih bisa diisi
            manual).
          </p>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Target default (opsional)</span>
            <input
              name="defaultTarget"
              type="number"
              min={0}
              defaultValue={editing?.config.defaultTarget ?? ""}
              placeholder="Mis. 15 unit / 100%"
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Catatan aturan</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editing?.config.notes ?? ""}
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            />
          </label>
          <p className="text-[11px] text-ink-muted">
            Skala bands / penalti detail dari template bisa diedit lewat apply
            ulang template, atau diperluas di fase berikutnya.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-line px-4 py-2.5 text-sm"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-end justify-between gap-3 p-3 sm:p-4">
        <label className="block min-w-[200px] flex-1 text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 sm:max-w-sm"
            value={deptId}
            onChange={(e) => {
              const id = e.target.value;
              setDeptId(id);
              setEditing(null);
              setShowForm(false);
              void reloadDept(id);
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/master/kpi-score-templates"
            className="rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5 text-sm font-medium text-brand-deep"
          >
            Template Indikator
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
              setError(null);
              setMessage(null);
            }}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
          >
            Tambah indikator
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {deptIndicators.length === 0 ? (
        <p className="rounded-xl border border-warn/30 bg-warn-soft/40 px-4 py-3 text-sm text-ink">
          Departemen ini belum punya indikator. Tambah manual, atau buka{" "}
          <Link
            href="/master/kpi-score-templates"
            className="font-medium text-brand hover:underline"
          >
            Template Indikator
          </Link>{" "}
          untuk membuat / menerapkan template.
        </p>
      ) : null}

      <div className="space-y-3">
        {grouped.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
            Belum ada fungsi KPI aktif di departemen ini. Isi Master Fungsi KPI
            atau terapkan template.
          </p>
        ) : (
          grouped.map(({ fn, inds, indWeight }) => (
            <section key={fn.id} className="panel overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-semibold">{fn.name}</h2>
                  <p className="text-xs text-ink-muted">
                    Bobot fungsi {fn.weightPercent}% · indikator{" "}
                    {inds.length} · Σ bobot indikator{" "}
                    <span
                      className={
                        inds.length === 0 || Math.abs(indWeight - 100) < 0.01
                          ? "text-ok"
                          : "text-warn"
                      }
                    >
                      {indWeight.toFixed(indWeight % 1 ? 1 : 0)}%
                    </span>
                  </p>
                </div>
              </div>
              {inds.length === 0 ? (
                <p className="px-4 py-4 text-sm text-ink-muted">
                  Belum ada indikator. Tambah manual atau terapkan dari{" "}
                  <Link
                    href="/master/kpi-score-templates"
                    className="font-medium text-brand hover:underline"
                  >
                    Template Indikator
                  </Link>
                  .
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {inds.map((ind) => (
                    <div
                      key={ind.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {ind.name}{" "}
                          <span className="text-xs font-normal text-ink-muted">
                            ({ind.weightPercent}%)
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const badge = dataSourceBadgeLabel(
                              ind.metricType,
                              ind.config,
                            );
                            return (
                              <span
                                className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                  badge.kind === "manual"
                                    ? "bg-bg-elevated text-ink-muted"
                                    : badge.wired
                                      ? "bg-ok-soft text-ok"
                                      : "bg-warn-soft/60 text-ink"
                                }`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-brand">
                            {METRIC_TYPE_LABEL[ind.metricType]}
                            {ind.config.defaultTarget != null
                              ? ` · target ${ind.config.defaultTarget}`
                              : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          {formatBands(ind)}
                        </p>
                        {ind.config.penalties?.length ? (
                          <p className="mt-1 text-xs text-warn">
                            Penalti:{" "}
                            {ind.config.penalties
                              .map((p) => `${p.label} (${p.points})`)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(ind);
                            setShowForm(true);
                            setError(null);
                            setMessage(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeIndicator(ind)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
