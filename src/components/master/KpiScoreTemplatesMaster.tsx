"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DATA_SOURCE_LABEL,
  METRIC_TYPE_LABEL,
} from "@/lib/kpi-score-templates";
import type {
  Department,
  KpiScoreDataSource,
  KpiScoreMetricType,
  KpiScoreTemplate,
  KpiScoreTemplateFunction,
  KpiScoreTemplateIndicator,
} from "@/lib/types";

function emptyIndicator(sortOrder = 1): KpiScoreTemplateIndicator {
  return {
    name: "",
    description: "",
    weightPercent: 100,
    metricType: "weighted_leaf",
    config: { dataSource: "manual" },
    sortOrder,
  };
}

function emptyFunction(sortOrder = 1): KpiScoreTemplateFunction {
  return {
    name: "",
    weightPercent: 0,
    focus: "",
    sortOrder,
    indicators: [emptyIndicator(1)],
  };
}

function countIndicators(tpl: KpiScoreTemplate) {
  return tpl.functions.reduce((n, f) => n + f.indicators.length, 0);
}

export function KpiScoreTemplatesMaster({
  initialTemplates,
  departments,
}: {
  initialTemplates: KpiScoreTemplate[];
  departments: Department[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTemplates[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<KpiScoreTemplate | null>(null);
  const [applyDeptId, setApplyDeptId] = useState(departments[0]?.id || "");
  const [copyDeptId, setCopyDeptId] = useState(departments[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const editing = draft ?? selected;

  function startCreate() {
    setSelectedId(null);
    setDraft({
      id: "",
      code: "",
      label: "",
      description: "",
      functions: [emptyFunction(1)],
      active: true,
      createdAt: "",
      updatedAt: "",
    });
    setError(null);
    setMessage(null);
  }

  function startEdit(tpl: KpiScoreTemplate) {
    setSelectedId(tpl.id);
    setDraft({
      ...tpl,
      functions: tpl.functions.map((f) => ({
        ...f,
        indicators: f.indicators.map((i) => ({
          ...i,
          config: { ...i.config },
        })),
      })),
    });
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setDraft(null);
    setError(null);
    if (!selectedId && templates[0]) setSelectedId(templates[0].id);
  }

  function updateDraft(patch: Partial<KpiScoreTemplate>) {
    setDraft((prev) => {
      const base =
        prev ??
        selected ??
        ({
          id: "",
          code: "",
          label: "",
          description: "",
          functions: [],
          active: true,
          createdAt: "",
          updatedAt: "",
        } satisfies KpiScoreTemplate);
      return { ...base, ...patch };
    });
  }

  function updateFunction(
    index: number,
    patch: Partial<KpiScoreTemplateFunction>,
  ) {
    if (!editing) return;
    const functions = editing.functions.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    updateDraft({ functions });
  }

  function updateIndicator(
    fnIndex: number,
    indIndex: number,
    patch: Partial<KpiScoreTemplateIndicator>,
  ) {
    if (!editing) return;
    const functions = editing.functions.map((f, i) => {
      if (i !== fnIndex) return f;
      return {
        ...f,
        indicators: f.indicators.map((ind, j) =>
          j === indIndex ? { ...ind, ...patch } : ind,
        ),
      };
    });
    updateDraft({ functions });
  }

  async function saveTemplate() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/kpi-score-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id || undefined,
          code: editing.code,
          label: editing.label,
          description: editing.description,
          functions: editing.functions,
          active: editing.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan template");
        return;
      }
      setTemplates(data.templates);
      setSelectedId(data.template.id);
      setDraft(null);
      setMessage(`Template "${data.template.code}" disimpan.`);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTemplate(tpl: KpiScoreTemplate) {
    if (
      !confirm(
        `Hapus template "${tpl.code} — ${tpl.label}"?\n\nAturan skor di departemen yang sudah diterapkan tidak ikut terhapus.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/kpi-score-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteId: tpl.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus");
        return;
      }
      setTemplates(data.templates);
      setDraft(null);
      setSelectedId(data.templates[0]?.id ?? null);
      setMessage(`Template "${tpl.code}" dihapus.`);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate(tpl: KpiScoreTemplate) {
    if (!applyDeptId) {
      setError("Pilih departemen tujuan");
      return;
    }
    const dept = departments.find((d) => d.id === applyDeptId);
    if (
      !confirm(
        `Terapkan template "${tpl.code}" ke ${dept?.code || "departemen"}?\n\nFungsi akan di-upsert dan indikator pada fungsi template diganti ulang.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/kpi-score-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyToDepartment: true,
          departmentId: applyDeptId,
          templateCode: tpl.code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menerapkan template");
        return;
      }
      setMessage(
        `Template diterapkan: ${data.functions} fungsi, ${data.indicators} indikator.`,
      );
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  async function copyFromDepartment() {
    if (!copyDeptId) {
      setError("Pilih departemen sumber");
      return;
    }
    const dept = departments.find((d) => d.id === copyDeptId);
    const code = window.prompt(
      "Kode template baru (contoh: ACC)",
      dept?.code || "",
    );
    if (!code) return;
    const label = window.prompt(
      "Label template",
      dept ? `${dept.code} — ${dept.name}` : code,
    );
    if (!label) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/master/kpi-score-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDepartment: true,
          departmentId: copyDeptId,
          code,
          label,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyalin dari departemen");
        return;
      }
      setTemplates(data.templates);
      setSelectedId(data.template.id);
      setDraft(null);
      setMessage(`Template "${data.template.code}" dibuat dari ${dept?.code}.`);
      router.refresh();
    } catch {
      setError("Koneksi gagal / server error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          Buat template indikator, lalu terapkan ke departemen mana pun. Lihat
          hasil di{" "}
          <Link
            href="/master/kpi-score-rules"
            className="font-medium text-brand hover:underline"
          >
            Aturan Skor KPI
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          + Buat template
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="panel space-y-3 p-4">
        <h2 className="text-sm font-semibold">Salin dari departemen</h2>
        <p className="text-xs text-ink-muted">
          Ambil fungsi + indikator aktif dari suatu departemen, jadikan
          template baru (cara cepat buat template ACC, HR, dll.).
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={copyDeptId}
            onChange={(e) => setCopyDeptId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => void copyFromDepartment()}
            className="rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5 text-sm font-medium text-brand-deep disabled:opacity-60"
          >
            Buat template dari dept
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="panel overflow-hidden">
          <div className="border-b border-line px-3 py-2.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
            Daftar template
          </div>
          <ul className="divide-y divide-line">
            {templates.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-muted">
                Belum ada template
              </li>
            ) : (
              templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(t.id);
                      setDraft(null);
                      setError(null);
                      setMessage(null);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left text-sm transition hover:bg-brand-soft/40 ${
                      selectedId === t.id && !draft
                        ? "bg-brand-soft/50"
                        : ""
                    }`}
                  >
                    <span className="font-medium">
                      {t.code}{" "}
                      {!t.active ? (
                        <span className="text-xs text-ink-muted">(nonaktif)</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-ink-muted">{t.label}</span>
                    <span className="text-[11px] text-ink-muted">
                      {t.functions.length} fungsi · {countIndicators(t)}{" "}
                      indikator
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <div className="space-y-4">
          {!editing ? (
            <p className="panel px-4 py-10 text-center text-sm text-ink-muted">
              Pilih template di kiri, atau buat template baru.
            </p>
          ) : (
            <>
              <div className="panel space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold">
                    {draft
                      ? draft.id
                        ? "Edit template"
                        : "Template baru"
                      : `Template ${editing.code}`}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {!draft && selected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(selected)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg-elevated"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeTemplate(selected)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
                        >
                          Hapus
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {draft ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-xs text-ink-muted">Kode</span>
                      <input
                        value={draft.code}
                        onChange={(e) =>
                          updateDraft({ code: e.target.value.toUpperCase() })
                        }
                        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                        placeholder="ACC"
                        maxLength={20}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs text-ink-muted">Label</span>
                      <input
                        value={draft.label}
                        onChange={(e) => updateDraft({ label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                        placeholder="Accounting"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-xs text-ink-muted">Deskripsi</span>
                      <textarea
                        rows={2}
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft({ description: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) =>
                          updateDraft({ active: e.target.checked })
                        }
                      />
                      Aktif (bisa diterapkan ke departemen)
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">
                    {editing.description || "Tanpa deskripsi."}
                  </p>
                )}

                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                  <label className="text-sm">
                    <span className="text-xs text-ink-muted">
                      Terapkan ke departemen
                    </span>
                    <select
                      className="mt-1 block rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
                      value={applyDeptId}
                      onChange={(e) => setApplyDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={saving || !editing.code}
                    onClick={() => void applyTemplate(editing)}
                    className="rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5 text-sm font-medium text-brand-deep disabled:opacity-60"
                  >
                    Terapkan template
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(draft ? draft.functions : editing.functions).map(
                  (fn, fi) => (
                    <section key={fi} className="panel overflow-hidden">
                      <div className="border-b border-line px-4 py-3">
                        {draft ? (
                          <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                            <input
                              value={fn.name}
                              onChange={(e) =>
                                updateFunction(fi, { name: e.target.value })
                              }
                              placeholder="Nama fungsi"
                              className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm font-medium"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={fn.weightPercent}
                              onChange={(e) =>
                                updateFunction(fi, {
                                  weightPercent: Number(e.target.value),
                                })
                              }
                              className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                              title="Bobot fungsi %"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft({
                                  functions: draft.functions.filter(
                                    (_, i) => i !== fi,
                                  ),
                                })
                              }
                              className="rounded-lg border border-danger/30 px-3 py-2 text-xs text-danger"
                            >
                              Hapus fungsi
                            </button>
                            <input
                              value={fn.focus}
                              onChange={(e) =>
                                updateFunction(fi, { focus: e.target.value })
                              }
                              placeholder="Fokus / catatan fungsi"
                              className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm sm:col-span-3"
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold">{fn.name}</h3>
                            <p className="text-xs text-ink-muted">
                              Bobot {fn.weightPercent}% · {fn.indicators.length}{" "}
                              indikator
                              {fn.focus ? ` · ${fn.focus}` : ""}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="divide-y divide-line">
                        {fn.indicators.map((ind, ii) => (
                          <div key={ii} className="space-y-2 px-4 py-3">
                            {draft ? (
                              <>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    value={ind.name}
                                    onChange={(e) =>
                                      updateIndicator(fi, ii, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Nama indikator"
                                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={ind.weightPercent}
                                    onChange={(e) =>
                                      updateIndicator(fi, ii, {
                                        weightPercent: Number(e.target.value),
                                      })
                                    }
                                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                    title="Bobot dalam fungsi %"
                                  />
                                  <select
                                    value={ind.metricType}
                                    onChange={(e) =>
                                      updateIndicator(fi, ii, {
                                        metricType: e.target
                                          .value as KpiScoreMetricType,
                                      })
                                    }
                                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                  >
                                    {(
                                      Object.keys(
                                        METRIC_TYPE_LABEL,
                                      ) as KpiScoreMetricType[]
                                    ).map((k) => (
                                      <option key={k} value={k}>
                                        {METRIC_TYPE_LABEL[k]}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={ind.config.dataSource || "manual"}
                                    onChange={(e) =>
                                      updateIndicator(fi, ii, {
                                        config: {
                                          ...ind.config,
                                          dataSource: e.target
                                            .value as KpiScoreDataSource,
                                        },
                                      })
                                    }
                                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                  >
                                    {(
                                      Object.keys(
                                        DATA_SOURCE_LABEL,
                                      ) as KpiScoreDataSource[]
                                    ).map((k) => (
                                      <option key={k} value={k}>
                                        {DATA_SOURCE_LABEL[k]}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min={0}
                                    value={ind.config.defaultTarget ?? ""}
                                    onChange={(e) =>
                                      updateIndicator(fi, ii, {
                                        config: {
                                          ...ind.config,
                                          defaultTarget: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        },
                                      })
                                    }
                                    placeholder="Target default"
                                    className="rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateFunction(fi, {
                                        indicators: fn.indicators.filter(
                                          (_, j) => j !== ii,
                                        ),
                                      })
                                    }
                                    className="rounded-lg border border-danger/30 px-3 py-2 text-xs text-danger"
                                  >
                                    Hapus indikator
                                  </button>
                                </div>
                                <textarea
                                  rows={1}
                                  value={ind.description}
                                  onChange={(e) =>
                                    updateIndicator(fi, ii, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Deskripsi"
                                  className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                                />
                              </>
                            ) : (
                              <div>
                                <p className="font-medium">
                                  {ind.name}{" "}
                                  <span className="text-xs font-normal text-ink-muted">
                                    ({ind.weightPercent}%)
                                  </span>
                                </p>
                                <p className="mt-0.5 text-xs text-brand">
                                  {METRIC_TYPE_LABEL[ind.metricType]}
                                  {ind.config.dataSource
                                    ? ` · ${DATA_SOURCE_LABEL[ind.config.dataSource]}`
                                    : ""}
                                  {ind.config.defaultTarget != null
                                    ? ` · target ${ind.config.defaultTarget}`
                                    : ""}
                                </p>
                                {ind.description ? (
                                  <p className="mt-1 text-xs text-ink-muted">
                                    {ind.description}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {draft ? (
                        <div className="border-t border-line px-4 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateFunction(fi, {
                                indicators: [
                                  ...fn.indicators,
                                  emptyIndicator(fn.indicators.length + 1),
                                ],
                              })
                            }
                            className="text-xs font-medium text-brand hover:underline"
                          >
                            + Tambah indikator
                          </button>
                        </div>
                      ) : null}
                    </section>
                  ),
                )}

                {draft ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({
                          functions: [
                            ...draft.functions,
                            emptyFunction(draft.functions.length + 1),
                          ],
                        })
                      }
                      className="rounded-xl border border-line px-4 py-2.5 text-sm"
                    >
                      + Tambah fungsi
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveTemplate()}
                      className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {saving ? "Menyimpan..." : "Simpan template"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-xl border border-line px-4 py-2.5 text-sm"
                    >
                      Batal
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
