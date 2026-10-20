"use client";

import { useMemo, useState } from "react";
import {
  buildMeetingReport,
  monthStartIso,
  type MeetingReportStatus,
} from "@/lib/meeting-report";
import { MEETING_TRACK_LABEL, todayIso, type MeetingTrack } from "@/lib/meeting-track";
import type { Department, MeetingNote } from "@/lib/types";

const TRACK_CLASS: Record<MeetingTrack, string> = {
  open: "bg-line text-ink-muted",
  in_progress: "bg-brand-soft text-brand",
  overdue: "bg-danger-soft text-danger",
  done: "bg-ok-soft text-ok",
};

export function MeetingReportPanel({
  meetings,
  departments,
  query,
  onOpen,
}: {
  meetings: MeetingNote[];
  departments: Department[];
  query: string;
  onOpen: (meeting: MeetingNote) => void;
}) {
  const today = todayIso();
  const [from, setFrom] = useState(monthStartIso(today));
  const [to, setTo] = useState(today);
  const [departmentId, setDepartmentId] = useState("all");
  const [status, setStatus] = useState<MeetingReportStatus>("all");

  const report = useMemo(
    () =>
      buildMeetingReport(meetings, departments, {
        from,
        to,
        departmentId,
        status,
        query,
      }),
    [meetings, departments, from, to, departmentId, status, query],
  );

  const exportHref = (format: "xlsx" | "pdf") => {
    const params = new URLSearchParams({
      format,
      from,
      to,
      departmentId,
      status,
    });
    if (query.trim()) params.set("q", query.trim());
    return `/api/kpi/meetings/export?${params.toString()}`;
  };

  return (
    <div className="space-y-3">
      <div className="panel grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Dari tanggal</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Sampai tanggal</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Departemen</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            <option value="all">Semua departemen</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} — {dept.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Status bahasan</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MeetingReportStatus)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
          >
            <option value="all">Semua status</option>
            {(Object.keys(MEETING_TRACK_LABEL) as MeetingTrack[]).map((id) => (
              <option key={id} value={id}>
                {MEETING_TRACK_LABEL[id]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="button"
            onClick={() => {
              setFrom(monthStartIso(today));
              setTo(today);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs"
          >
            Bulan ini
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs"
          >
            Semua tanggal
          </button>
          <a
            href={exportHref("xlsx")}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Export Excel
          </a>
          <a
            href={exportHref("pdf")}
            className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium"
          >
            Export PDF
          </a>
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        Laporan pembahasan dan notulen · <strong>{report.periodLabel}</strong> ·{" "}
        <strong>{report.departmentLabel}</strong> · <strong>{report.statusLabel}</strong>
        . {report.stats.notes} notulen, {report.stats.items} bahasan
        {report.stats.overdue > 0 ? `, ${report.stats.overdue} overdue` : ""}.
      </p>

      {report.notes.length === 0 ? (
        <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
          Tidak ada notulen pada filter ini.
        </p>
      ) : (
        report.notes.map((note) => {
          const rows = report.items.filter((row) => row.meetingId === note.id);
          const meeting = meetings.find((row) => row.id === note.id);
          return (
            <article key={note.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted">
                    {note.meetingDateLabel}
                    {note.meetingTime ? ` · ${note.meetingTime}` : ""}
                    {` · ${note.departmentLabel}`}
                  </p>
                  <h2 className="mt-0.5 font-semibold">{note.title}</h2>
                  {note.attendees ? (
                    <p className="mt-1 text-xs text-ink-muted">Peserta: {note.attendees}</p>
                  ) : null}
                  {note.externalAttendees ? (
                    <p className="text-xs text-ink-muted">
                      Pihak luar: {note.externalAttendees}
                    </p>
                  ) : null}
                </div>
                {meeting ? (
                  <button
                    type="button"
                    onClick={() => onOpen(meeting)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs"
                  >
                    Buka notulen
                  </button>
                ) : null}
              </div>
              {note.summary ? (
                <p className="mt-3 whitespace-pre-wrap text-sm">{note.summary}</p>
              ) : null}
              {rows.length === 0 ? (
                <p className="mt-3 text-xs text-ink-muted">
                  Tidak ada bahasan pada filter ini.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-muted">
                        <th className="px-2 py-2 font-medium">Topik</th>
                        <th className="px-2 py-2 font-medium">Departemen</th>
                        <th className="px-2 py-2 font-medium">PIC</th>
                        <th className="px-2 py-2 font-medium">Jadwal</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${note.id}-${index}`} className="border-b border-line align-top last:border-0">
                          <td className="px-2 py-2">
                            <p className="font-medium">{row.topic}</p>
                            {row.problemDetail ? (
                              <p className="mt-1 whitespace-pre-wrap text-xs text-ink">
                                {row.problemDetail}
                              </p>
                            ) : null}
                            {row.detail ? (
                              <p className="mt-1 text-xs text-ink-muted">{row.detail}</p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 text-xs">{row.departmentLabel}</td>
                          <td className="px-2 py-2 text-xs">{row.ownerName}</td>
                          <td className="px-2 py-2 text-xs text-ink-muted">
                            {row.startDateLabel !== "—" ? `mulai ${row.startDateLabel}` : "—"}
                            {row.dueDateLabel !== "—"
                              ? `${row.startDateLabel !== "—" ? " · " : ""}selesai ${row.dueDateLabel}`
                              : ""}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[11px] ${TRACK_CLASS[row.track]}`}
                              >
                                {row.trackLabel}
                              </span>
                              {row.repeated ? (
                                <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                                  {row.repeatCount}x
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
