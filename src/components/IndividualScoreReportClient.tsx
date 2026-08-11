"use client";

import { useMemo, useState } from "react";
import {
  buildDisciplinePeriodOptions,
  formatDisciplinePeriodLabel,
} from "@/lib/discipline-period";
import { buildIndividualScoreReport } from "@/lib/individual-score-report";
import type {
  Agent,
  AttendancePeriodSummary,
  Department,
  KpiActivity,
  KpiAssessment,
  KpiFunction,
  KpiIndicatorActual,
  KpiScoreIndicator,
  StaffMember,
  Ticket,
} from "@/lib/types";
import { ticketPeriodLabels } from "@/lib/ticket-score-metrics";
import type { ItMember } from "@/lib/types";

const SOURCE_LABEL = {
  indikator: "Otomatis · Job desk",
  manual: "Manual",
  absensi: "Otomatis · Absensi",
  kegiatan: "Otomatis · Kegiatan",
} as const;

export function IndividualScoreReportClient({
  departments,
  staff,
  functions,
  indicators,
  actuals,
  assessments,
  disciplineSummaries,
  activities,
  tickets = [],
  agents = [],
  itTeam = [],
  managerStaffIds = [],
  adminStaffIds,
  lockedDepartmentId,
  lockedStaffId,
  initialPeriod,
}: {
  departments: Department[];
  staff: StaffMember[];
  functions: KpiFunction[];
  indicators: KpiScoreIndicator[];
  actuals: KpiIndicatorActual[];
  assessments: KpiAssessment[];
  disciplineSummaries: AttendancePeriodSummary[];
  activities: KpiActivity[];
  tickets?: Ticket[];
  agents?: Agent[];
  itTeam?: ItMember[];
  managerStaffIds?: string[];
  adminStaffIds: string[];
  lockedDepartmentId: string | null;
  lockedStaffId: string | null;
  initialPeriod: string;
}) {
  const periodOptions = useMemo(() => {
    const fromData = [
      ...disciplineSummaries.map((d) => d.periodLabel),
      ...actuals.map((a) => a.periodLabel),
      ...assessments.map((a) => a.periodLabel),
      ...ticketPeriodLabels(tickets),
    ];
    return buildDisciplinePeriodOptions(fromData);
  }, [disciplineSummaries, actuals, assessments, tickets]);

  const [deptId, setDeptId] = useState(
    lockedDepartmentId || departments[0]?.id || "",
  );
  const [period, setPeriod] = useState(() => {
    if (periodOptions.includes(initialPeriod)) return initialPeriod;
    return periodOptions[0] || initialPeriod;
  });
  const [q, setQ] = useState("");

  const deptStaff = useMemo(() => {
    let list = staff.filter(
      (s) => s.departmentId === deptId && s.active,
    );
    if (lockedStaffId) {
      list = list.filter((s) => s.id === lockedStaffId);
    }
    return list;
  }, [staff, deptId, lockedStaffId]);

  const disciplineByStaff = useMemo(() => {
    const map = new Map<string, AttendancePeriodSummary>();
    for (const d of disciplineSummaries) {
      if (d.periodLabel !== period) continue;
      map.set(d.staffId, d);
    }
    return map;
  }, [disciplineSummaries, period]);

  const rows = useMemo(
    () =>
      buildIndividualScoreReport({
        staffList: deptStaff,
        periodLabel: period,
        functions,
        indicators,
        actuals,
        assessments,
        disciplineByStaff,
        activities,
        adminStaffIds,
        tickets,
        agents,
        allStaff: staff,
        itTeam,
        managerUserStaffIds: managerStaffIds,
      }),
    [
      deptStaff,
      period,
      functions,
      indicators,
      actuals,
      assessments,
      disciplineByStaff,
      activities,
      adminStaffIds,
      tickets,
      agents,
      staff,
      itTeam,
      managerStaffIds,
    ],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.staffName.toLowerCase().includes(term) ||
        r.employeeCode.toLowerCase().includes(term) ||
        r.position.toLowerCase().includes(term),
    );
  }, [rows, q]);

  const functionColumns = useMemo(() => {
    return functions
      .filter((f) => f.departmentId === deptId && f.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [functions, deptId]);

  const avgOverall = useMemo(() => {
    const withScore = filtered.filter((r) => r.overall != null);
    if (!withScore.length) return null;
    return (
      Math.round(
        (withScore.reduce((s, r) => s + (r.overall ?? 0), 0) /
          withScore.length) *
          10,
      ) / 10
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            value={deptId}
            disabled={Boolean(lockedDepartmentId) || departments.length <= 1}
            onChange={(e) => setDeptId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Periode</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {formatDisciplinePeriodLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-xs text-ink-muted">Cari karyawan</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nama / NIK / jabatan"
            disabled={Boolean(lockedStaffId)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-ink-muted">
          Periode{" "}
          <strong>{formatDisciplinePeriodLabel(period)}</strong>
          {" · "}
          {filtered.length} karyawan
          {avgOverall != null ? (
            <>
              {" · "}rata-rata skor{" "}
              <strong className="text-brand">{avgOverall}</strong>
            </>
          ) : null}
        </p>
        <p className="text-[11px] text-ink-muted">
          Prioritas: indikator → manual → absensi / kegiatan. Total = skor
          tertimbang atas semua fungsi (yang kosong = 0).
        </p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-elevated/70 text-xs text-ink-muted uppercase">
                <th className="px-3 py-2.5 font-medium">Karyawan</th>
                {functionColumns.map((f) => (
                  <th key={f.id} className="px-3 py-2.5 font-medium">
                    {f.name}
                    <span className="mt-0.5 block font-normal normal-case text-[10px]">
                      {f.weightPercent}%
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={functionColumns.length + 2}
                    className="px-4 py-10 text-center text-sm text-ink-muted"
                  >
                    Belum ada data skor untuk filter ini.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const byFn = new Map(
                    r.functions.map((f) => [f.functionId, f]),
                  );
                  return (
                    <tr key={r.staffId} className="border-b border-line">
                      <td className="px-3 py-3">
                        <p className="font-medium">{r.staffName}</p>
                        <p className="text-xs text-ink-muted">
                          {r.employeeCode}
                          {r.position ? ` · ${r.position}` : ""}
                        </p>
                      </td>
                      {functionColumns.map((f) => {
                        const cell = byFn.get(f.id);
                        return (
                          <td key={f.id} className="px-3 py-3">
                            {cell?.score != null ? (
                              <>
                                <span className="font-semibold text-brand">
                                  {cell.score}
                                </span>
                                {cell.source ? (
                                  <span className="mt-0.5 block text-[10px] text-ink-muted">
                                    {SOURCE_LABEL[cell.source]}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3">
                        {r.overall != null ? (
                          <span className="text-base font-semibold text-brand">
                            {r.overall}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

