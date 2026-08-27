"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Department, KpiFunction } from "@/lib/types";

function isDisciplineFn(name: string) {
  return /kedisiplinan|kehadiran/i.test(name);
}

export function ScoreGuideClient({
  departments,
  functions,
  defaultDepartmentId,
}: {
  departments: Department[];
  functions: KpiFunction[];
  defaultDepartmentId?: string;
}) {
  const [deptId, setDeptId] = useState(
    defaultDepartmentId || departments[0]?.id || "all",
  );

  const byDept = useMemo(() => {
    return departments.map((d) => {
      const fns = functions
        .filter((f) => f.departmentId === d.id && f.active)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const weightTotal = fns.reduce((s, f) => s + f.weightPercent, 0);
      return { dept: d, functions: fns, weightTotal };
    });
  }, [departments, functions]);

  const visible =
    deptId === "all" ? byDept : byDept.filter((x) => x.dept.id === deptId);

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Filter departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-sm"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
          >
            {departments.length > 1 ? (
              <option value="all">Semua departemen</option>
            ) : null}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-sm text-ink-muted">
            Data fungsi &amp; bobot dari <strong>Master Fungsi KPI</strong>.
            Detail indikator &amp; skala nilai diatur di{" "}
            <Link
              href="/master/kpi-score-rules"
              className="font-medium text-brand hover:underline"
            >
              Aturan Skor KPI
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="panel space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">Rumus berlaku untuk semua departemen</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cara hitung skor sama; yang berbeda hanya daftar fungsi dan bobot
            per departemen.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              1. Fungsi biasa (Kegiatan)
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              <li>Selesai = 100%</li>
              <li>Berjalan = 50%</li>
              <li>Lainnya = 0%</li>
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              Skor fungsi = rata-rata nilai kegiatan yang di-link ke fungsi itu
              (kegiatan batal &amp; PIC admin tidak dihitung). Indikator dengan
              sumber Kegiatan (Backup, Patch, dll.) memakai kegiatan yang
              judulnya relevan, bukan semua kegiatan fungsi.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              2. Kedisiplinan (Absensi)
            </p>
            <p className="mt-2 text-sm">
              Mulai 100, dikurangi absen/telat, ditambah lembur (maks 100).
            </p>
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              <li>− (hari absen ÷ hari kerja) × 45</li>
              <li>− min(jumlah telat × 2.5, 20)</li>
              <li>− min(menit telat ÷ 30, 15)</li>
              <li>+ min(menit lembur ÷ 120, 5)</li>
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              Skor fungsi = rata-rata staf dept (atau individu jika difilter).
            </p>
          </div>
          <div className="rounded-xl border border-line bg-bg-elevated/50 p-3">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              3. Total tertimbang
            </p>
            <p className="mt-2 font-mono text-sm">
              Σ (skor × bobot) ÷ Σ bobot
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Project / rencana kerja tidak langsung masuk skor; yang dihitung
              adalah kegiatan yang tertaut fungsi. Penilaian manual terpisah.
            </p>
          </div>
        </div>
      </section>

      {visible.map(({ dept, functions: fns, weightTotal }) => (
        <section key={dept.id} className="panel overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-semibold">
                {dept.code} — {dept.name}
              </h2>
              <p className="text-xs text-ink-muted">
                {fns.length} fungsi aktif · total bobot{" "}
                <span
                  className={
                    Math.abs(weightTotal - 100) < 0.01
                      ? "font-semibold text-ok"
                      : "font-semibold text-warn"
                  }
                >
                  {weightTotal.toFixed(weightTotal % 1 ? 1 : 0)}%
                </span>
                {Math.abs(weightTotal - 100) >= 0.01
                  ? " (sebaiknya mendekati 100%)"
                  : ""}
              </p>
            </div>
          </div>

          {fns.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">
              Belum ada fungsi KPI aktif. Isi dulu di Master Fungsi KPI.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                    <th className="px-4 py-2.5 font-medium">Fungsi</th>
                    <th className="w-20 px-4 py-2.5 font-medium">Bobot</th>
                    <th className="w-28 px-4 py-2.5 font-medium">Sumber skor</th>
                    <th className="px-4 py-2.5 font-medium">Cara hitung</th>
                    <th className="px-4 py-2.5 font-medium">Fokus</th>
                  </tr>
                </thead>
                <tbody>
                  {fns.map((f) => {
                    const disc = isDisciplineFn(f.name);
                    return (
                      <tr key={f.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium">{f.name}</td>
                        <td className="px-4 py-3">{f.weightPercent}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] ${
                              disc
                                ? "bg-brand-soft text-brand-deep"
                                : "bg-ok-soft text-ok"
                            }`}
                          >
                            {disc ? "Absensi" : "Kegiatan"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">
                          {disc
                            ? "Rata-rata skor disiplin staf dari impor absensi (periode 21–20)."
                            : "Rata-rata capaian kegiatan tertaut fungsi ini (Selesai 100% · Berjalan 50%)."}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">
                          {f.focus || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-line bg-bg-elevated/40 px-4 py-3 text-xs text-ink-muted">
            <strong className="text-ink">Contoh kontribusi:</strong> jika fungsi
            berbobot 30% skornya 80, maka bagiannya ke total = (80 × 30) ÷ total
            bobot. Ulangi untuk semua fungsi, lalu jumlahkan.
          </div>
        </section>
      ))}
    </div>
  );
}
