"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  addDays,
  formatIsoDateId,
  formatWeekLabel,
  itemTrack,
  MEETING_STATUS_LABEL,
  MEETING_TRACK_LABEL,
  normalizeTopic,
  todayIso,
  weekBounds,
  type MeetingTrack,
} from "@/lib/meeting-track";
import { MeetingReportPanel } from "@/components/MeetingReportPanel";
import type {
  Department,
  MeetingItem,
  MeetingItemStatus,
  MeetingNote,
} from "@/lib/types";

type StaffOption = { id: string; name: string; departmentId: string };

type DraftItem = {
  key: string;
  id?: string;
  topic: string;
  problemDetail: string;
  detail: string;
  departmentIds: string[];
  ownerStaffIds: string[];
  ownerName: string;
  startDate: string;
  dueDate: string;
  status: MeetingItemStatus;
};

type View = "week" | "notes" | "follow" | "report";
type TrackFilter = "all" | MeetingTrack | "repeated";

type RepeatInfo = {
  count: number;
  meetings: Array<{ id: string; title: string; date: string }>;
};

const TRACK_CLASS: Record<MeetingTrack, string> = {
  open: "bg-line text-ink-muted",
  in_progress: "bg-brand-soft text-brand",
  overdue: "bg-danger-soft text-danger",
  done: "bg-ok-soft text-ok",
};

function emptyItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    topic: "",
    problemDetail: "",
    detail: "",
    departmentIds: [],
    ownerStaffIds: [],
    ownerName: "",
    startDate: "",
    dueDate: "",
    status: "open",
  };
}

function itemDepartmentLabel(
  ids: string[] | undefined,
  departments: Department[],
): string {
  if (!ids || ids.length === 0) return "";
  if (ids.includes("*")) return "Semua departemen";
  return ids
    .map((id) => departments.find((dept) => dept.id === id)?.code)
    .filter((code): code is string => Boolean(code))
    .join(", ");
}

function draftDepartmentIds(
  ids: string[] | undefined,
  departments: Department[],
  companyWide: boolean,
): string[] {
  const list = ids ?? [];
  if (list.includes("*")) {
    return companyWide ? ["*"] : departments.map((dept) => dept.id);
  }
  return list;
}

function draftFromItem(
  item: MeetingItem,
  people: StaffOption[],
  departments: Department[],
  companyWide: boolean,
): DraftItem {
  const known = new Set(people.map((person) => person.id));
  let ownerStaffIds = (item.ownerStaffIds || []).filter((id) => known.has(id));
  if (ownerStaffIds.length === 0 && item.ownerStaffId && known.has(item.ownerStaffId)) {
    ownerStaffIds = [item.ownerStaffId];
  }
  if (ownerStaffIds.length === 0 && item.ownerName) {
    ownerStaffIds = item.ownerName
      .split(/[,;\n]/)
      .map((name) => name.trim())
      .map(
        (name) =>
          people.find((person) => person.name.toLowerCase() === name.toLowerCase())
            ?.id || "",
      )
      .filter(Boolean);
  }
  const ownerName =
    ownerStaffIds
      .map((id) => people.find((person) => person.id === id)?.name)
      .filter((name): name is string => Boolean(name))
      .join(", ") || item.ownerName;
  return {
    key: item.id,
    id: item.id,
    topic: item.topic,
    problemDetail: item.problemDetail || "",
    detail: item.detail,
    departmentIds: draftDepartmentIds(item.departmentIds, departments, companyWide),
    ownerStaffIds,
    ownerName,
    startDate: item.startDate || "",
    dueDate: item.dueDate,
    status: item.status,
  };
}

function meetingDepartmentLabel(
  meeting: MeetingNote,
  departments: Department[],
): string {
  if (meeting.departmentIds.includes("*")) return "Semua departemen";
  const codes = meeting.departmentIds
    .map((id) => departments.find((dept) => dept.id === id)?.code)
    .filter((code): code is string => Boolean(code));
  if (codes.length > 0) return codes.join(", ");
  return meeting.departmentCode || "—";
}

export function MeetingWorkspace({
  departments,
  companyWide,
  staff,
  initialMeetings,
}: {
  departments: Department[];
  companyWide: boolean;
  staff: StaffOption[];
  initialMeetings: MeetingNote[];
}) {
  const today = todayIso();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [view, setView] = useState<View>("week");
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [filter, setFilter] = useState<TrackFilter>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allDepartments, setAllDepartments] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<string[]>(
    departments[0] ? [departments[0].id] : [],
  );
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(today);
  const [meetingTime, setMeetingTime] = useState("");
  const [attendeeStaffIds, setAttendeeStaffIds] = useState<string[]>([]);
  const [externalAttendees, setExternalAttendees] = useState("");
  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [ownerQueryByKey, setOwnerQueryByKey] = useState<Record<string, string>>(
    {},
  );
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const week = weekBounds(weekAnchor);

  const repeats = useMemo(() => {
    const map = new Map<string, RepeatInfo>();
    for (const meeting of meetings) {
      const seen = new Set<string>();
      for (const item of meeting.items) {
        const key = normalizeTopic(item.topic);
        if (key.length < 3 || seen.has(key)) continue;
        seen.add(key);
        const info = map.get(key) ?? { count: 0, meetings: [] };
        info.count += 1;
        info.meetings.push({
          id: meeting.id,
          title: meeting.title,
          date: meeting.meetingDate,
        });
        map.set(key, info);
      }
    }
    return map;
  }, [meetings]);

  const tracked = useMemo(() => {
    return meetings.flatMap((meeting) =>
      meeting.items.map((item) => {
        const key = normalizeTopic(item.topic);
        const repeat = repeats.get(key);
        return {
          item,
          meeting,
          track: itemTrack(item.status, item.dueDate, today),
          repeated: (repeat?.count ?? 0) >= 2,
          repeat,
        };
      }),
    );
  }, [meetings, repeats, today]);

  const repeatedTopics = useMemo(() => {
    return [...repeats.entries()]
      .filter(([, info]) => info.count >= 2)
      .sort((a, b) => b[1].count - a[1].count);
  }, [repeats]);

  const stats = {
    progress: tracked.filter((row) => row.track === "in_progress").length,
    overdue: tracked.filter((row) => row.track === "overdue").length,
    repeated: repeatedTopics.length,
    weekNotes: meetings.filter(
      (m) => m.meetingDate >= week.start && m.meetingDate <= week.end,
    ).length,
  };

  const query = search.trim().toLowerCase();
  function matchesQuery(meeting: MeetingNote) {
    if (!query) return true;
    const hay = [
      meeting.title,
      meeting.summary,
      meeting.attendees,
      meeting.externalAttendees,
      meeting.departmentName,
      meeting.createdByName,
      ...meeting.items.map(
        (item) =>
          `${item.topic} ${item.problemDetail} ${item.detail} ${item.ownerName} ${itemDepartmentLabel(item.departmentIds, departments)}`,
      ),
    ]
      .join("\n")
      .toLowerCase();
    return query.split(/\s+/).every((token) => hay.includes(token));
  }

  const visibleRepeats = repeatedTopics.filter(([key, info]) => {
    if (!query) return true;
    const hay = `${key} ${info.meetings.map((meeting) => meeting.title).join(" ")}`.toLowerCase();
    return query.split(/\s+/).every((token) => hay.includes(token));
  });

  const weekMeetings = meetings.filter(
    (m) =>
      m.meetingDate >= week.start &&
      m.meetingDate <= week.end &&
      matchesQuery(m),
  );
  const allMeetings = meetings.filter(matchesQuery);
  const followRows = tracked.filter((row) => {
    if (!matchesQuery(row.meeting)) return false;
    if (filter === "repeated") return row.repeated && row.track !== "done";
    if (filter === "all") return row.track !== "done";
    return row.track === filter;
  });
  const carryOver = tracked.filter(
    (row) =>
      matchesQuery(row.meeting) &&
      (row.track === "in_progress" || row.track === "overdue") &&
      (row.meeting.meetingDate < week.start ||
        row.meeting.meetingDate > week.end),
  );

  function openNew() {
    setEditingId(null);
    setAllDepartments(false);
    setDepartmentIds(departments[0] ? [departments[0].id] : []);
    setTitle("");
    setMeetingDate(today);
    setMeetingTime("");
    setAttendeeStaffIds([]);
    setExternalAttendees("");
    setAttendeeQuery("");
    setSummary("");
    setItems([emptyItem()]);
    setError(null);
    setShowForm(true);
  }

  function openEdit(meeting: MeetingNote) {
    setEditingId(meeting.id);
    if (meeting.departmentIds.includes("*")) {
      setAllDepartments(true);
      setDepartmentIds(departments.map((dept) => dept.id));
    } else {
      setAllDepartments(false);
      setDepartmentIds(
        meeting.departmentIds.length > 0
          ? meeting.departmentIds
          : meeting.departmentId
            ? [meeting.departmentId]
            : [],
      );
    }
    setTitle(meeting.title);
    setMeetingDate(meeting.meetingDate);
    setMeetingTime(meeting.meetingTime);
    const knownIds = new Set(staff.map((person) => person.id));
    const storedIds = (meeting.attendeeStaffIds || []).filter((id) =>
      knownIds.has(id),
    );
    if (storedIds.length > 0 || meeting.externalAttendees) {
      setAttendeeStaffIds(storedIds);
      setExternalAttendees(meeting.externalAttendees || "");
    } else {
      const parts = meeting.attendees
        .split(/[,;\n]/)
        .map((name) => name.trim())
        .filter(Boolean);
      const matched: string[] = [];
      const unmatched: string[] = [];
      for (const part of parts) {
        const person = staff.find(
          (row) => row.name.toLowerCase() === part.toLowerCase(),
        );
        if (person) matched.push(person.id);
        else unmatched.push(part);
      }
      setAttendeeStaffIds(matched);
      setExternalAttendees(unmatched.join(", "));
    }
    setAttendeeQuery("");
    setSummary(meeting.summary);
    setItems(
      meeting.items.length > 0
        ? meeting.items.map((item) =>
            draftFromItem(item, staff, departments, companyWide),
          )
        : [emptyItem()],
    );
    setError(null);
    setShowForm(true);
    setWeekAnchor(meeting.meetingDate);
  }

  function pullOpenItems() {
    const existing = new Set(
      items.map((item) => normalizeTopic(item.topic)).filter(Boolean),
    );
    const pulled: DraftItem[] = [];
    for (const row of tracked) {
      if (row.track === "done") continue;
      const key = normalizeTopic(row.item.topic);
      if (!key || existing.has(key)) continue;
      existing.add(key);
      pulled.push({
        key: crypto.randomUUID(),
        topic: row.item.topic,
        problemDetail: row.item.problemDetail || "",
        detail: row.item.detail,
        departmentIds: draftDepartmentIds(
          row.item.departmentIds,
          departments,
          companyWide,
        ),
        ownerStaffIds: row.item.ownerStaffIds || [],
        ownerName: row.item.ownerName,
        startDate: row.item.startDate || "",
        dueDate: row.item.dueDate,
        status: row.item.status === "done" ? "open" : row.item.status,
      });
    }
    if (pulled.length === 0) {
      setError("Tidak ada bahasan terbuka untuk ditarik.");
      return;
    }
    setItems((prev) => {
      const filled = prev.filter((item) => item.topic.trim());
      return [...filled, ...pulled];
    });
    setError(null);
    setMessage(`${pulled.length} bahasan terbuka disalin ke notulen ini.`);
  }

  function upsertMeeting(meeting: MeetingNote) {
    setMeetings((prev) => {
      const exists = prev.some((row) => row.id === meeting.id);
      const next = exists
        ? prev.map((row) => (row.id === meeting.id ? meeting : row))
        : [meeting, ...prev];
      return next.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const chosenDepartments = allDepartments
      ? companyWide
        ? ["*"]
        : departments.map((dept) => dept.id)
      : departmentIds;
    if (chosenDepartments.length === 0) {
      setError("Pilih minimal satu departemen, atau centang Semua departemen.");
      return;
    }
    const badSchedule = items.find(
      (item) =>
        item.topic.trim() &&
        item.startDate &&
        item.dueDate &&
        item.startDate > item.dueDate,
    );
    if (badSchedule) {
      setError(
        `Jadwal / Target selesai "${badSchedule.topic || "bahasan"}" tidak boleh sebelum tanggal awal pembahasan.`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/kpi/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          departmentIds: chosenDepartments,
          title,
          meetingDate,
          meetingTime,
          attendeeStaffIds,
          externalAttendees,
          summary,
          items: items
            .filter((item) => item.topic.trim())
            .map((item) => ({
              id: item.id,
              topic: item.topic,
              problemDetail: item.problemDetail,
              detail: item.detail,
              departmentIds: item.departmentIds,
              ownerStaffIds: item.ownerStaffIds,
              ownerName: item.ownerName,
              startDate: item.startDate,
              dueDate: item.dueDate,
              status: item.status,
            })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan notulen");
        return;
      }
      upsertMeeting(data.meeting as MeetingNote);
      setShowForm(false);
      setMessage("Notulen tersimpan.");
      setWeekAnchor(meetingDate);
      setView("week");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMeeting(meeting: MeetingNote) {
    const ok = window.confirm(`Hapus notulen "${meeting.title}"?`);
    if (!ok) return;
    setError(null);
    const res = await fetch(
      `/api/kpi/meetings?id=${encodeURIComponent(meeting.id)}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menghapus notulen");
      return;
    }
    setMeetings((prev) => prev.filter((row) => row.id !== meeting.id));
    if (editingId === meeting.id) setShowForm(false);
    setMessage("Notulen dihapus.");
  }

  async function changeStatus(itemId: string, status: MeetingItemStatus) {
    setError(null);
    const res = await fetch("/api/kpi/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", itemId, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal mengubah status");
      return;
    }
    upsertMeeting(data.meeting as MeetingNote);
  }

  function focusFilter(next: TrackFilter) {
    setFilter(next);
    setView("follow");
  }

  const pickedDepartmentIds = allDepartments
    ? departments.map((dept) => dept.id)
    : departmentIds;
  const attendeeNeedle = attendeeQuery.trim().toLowerCase();
  const visibleStaff = staff
    .filter((person) => {
      if (!attendeeNeedle) return true;
      const dept = departments.find((item) => item.id === person.departmentId);
      const hay = `${person.name} ${dept?.code ?? ""} ${dept?.name ?? ""}`.toLowerCase();
      return hay.includes(attendeeNeedle);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  const ownerOptions = [...staff].sort((a, b) =>
    a.name.localeCompare(b.name, "id"),
  );

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">{message}</p>
      ) : null}
      {error && !showForm ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On progress"
          value={stats.progress}
          hint="Bahasan yang sedang dikerjakan"
          active={view === "follow" && filter === "in_progress"}
          onClick={() => focusFilter("in_progress")}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          hint="Lewat jatuh tempo dan belum selesai"
          active={view === "follow" && filter === "overdue"}
          onClick={() => focusFilter("overdue")}
          tone="danger"
        />
        <StatCard
          label="Repeated discussions"
          value={stats.repeated}
          hint="Topik yang muncul di 2 rapat atau lebih"
          active={view === "follow" && filter === "repeated"}
          onClick={() => focusFilter("repeated")}
          tone="warn"
        />
        <StatCard
          label="Notulen minggu ini"
          value={stats.weekNotes}
          hint={formatWeekLabel(week.start, week.end)}
          active={view === "week"}
          onClick={() => setView("week")}
        />
      </div>

      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekAnchor(addDays(week.start, -7))}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
            aria-label="Minggu sebelumnya"
          >
            ‹
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium">{formatWeekLabel(week.start, week.end)}</p>
            <p className="text-[11px] text-ink-muted">Senin–Minggu</p>
          </div>
          <button
            type="button"
            onClick={() => setWeekAnchor(addDays(week.start, 7))}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
            aria-label="Minggu berikutnya"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(today)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
          >
            Minggu ini
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, bahasan, peserta..."
            className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm sm:w-64"
          />
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Notulen baru
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["week", "Minggu ini"],
            ["follow", "Tindak lanjut"],
            ["notes", "Semua notulen"],
            ["report", "Laporan"],
          ] as Array<[View, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              view === id
                ? "bg-brand text-white"
                : "border border-line text-ink-muted hover:bg-bg-elevated"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={save} className="panel space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              {editingId ? "Edit notulen" : "Notulen baru"}
            </h2>
            <button
              type="button"
              onClick={pullOpenItems}
              className="rounded-lg border border-line px-3 py-1.5 text-xs"
            >
              Tarik bahasan yang belum selesai
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Judul</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly IT — 17 Okt 2026"
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <div className="text-sm sm:col-span-2">
              <span className="text-xs text-ink-muted">Departemen</span>
              <div className="mt-1 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-line bg-bg-elevated px-3 py-2">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allDepartments}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setAllDepartments(on);
                      setDepartmentIds(on ? departments.map((dept) => dept.id) : []);
                    }}
                  />
                  Semua departemen
                </label>
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allDepartments || departmentIds.includes(dept.id)}
                      onChange={(e) => {
                        if (allDepartments) {
                          setAllDepartments(false);
                          setDepartmentIds(
                            e.target.checked
                              ? departments.map((item) => item.id)
                              : departments
                                  .map((item) => item.id)
                                  .filter((id) => id !== dept.id),
                          );
                          return;
                        }
                        setDepartmentIds((prev) =>
                          e.target.checked
                            ? [...prev, dept.id]
                            : prev.filter((id) => id !== dept.id),
                        );
                      }}
                    />
                    {dept.code} — {dept.name}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Bisa pilih satu, beberapa, atau semua departemen.
              </p>
            </div>
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Tanggal</span>
              <input
                required
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-ink-muted">Waktu</span>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
              />
            </label>
          </div>
          <div className="text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">Peserta karyawan</span>
              <span className="text-[11px] text-ink-muted">
                {attendeeStaffIds.length} dipilih
              </span>
            </div>
            <input
              value={attendeeQuery}
              onChange={(e) => setAttendeeQuery(e.target.value)}
              placeholder="Cari nama karyawan"
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
            {staff.length > 0 ? (
              <label className="mt-2 flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={
                    attendeeStaffIds.length === staff.length && staff.length > 0
                  }
                  onChange={(e) =>
                    setAttendeeStaffIds(
                      e.target.checked ? staff.map((person) => person.id) : [],
                    )
                  }
                />
                Semua karyawan
              </label>
            ) : null}
            <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-line bg-bg-elevated px-3 py-2">
              {visibleStaff.length === 0 ? (
                <p className="text-xs text-ink-muted">Karyawan tidak ditemukan.</p>
              ) : (
                visibleStaff.map((person) => {
                  const dept = departments.find(
                    (item) => item.id === person.departmentId,
                  );
                  return (
                    <label key={person.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={attendeeStaffIds.includes(person.id)}
                        onChange={(e) =>
                          setAttendeeStaffIds((prev) =>
                            e.target.checked
                              ? [...prev, person.id]
                              : prev.filter((id) => id !== person.id),
                          )
                        }
                      />
                      <span>
                        {person.name}
                        {dept ? (
                          <span className="text-ink-muted"> · {dept.code}</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Centang karyawan yang hadir, atau pilih Semua karyawan. Pencarian
              hanya menyaring daftar; pilihan yang sudah dicentang tetap tersimpan.
            </p>
          </div>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Pihak luar</span>
            <input
              value={externalAttendees}
              onChange={(e) => setExternalAttendees(e.target.value)}
              placeholder="Nama dari luar perusahaan, dipisah koma. Kosongkan jika tidak ada."
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Khusus tamu, vendor, konsultan, atau pihak di luar karyawan.
            </p>
          </label>
          <label className="block text-sm">
            <span className="text-xs text-ink-muted">Ringkasan notulen</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Pokok pembahasan, keputusan, dan catatan rapat"
              className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Bahasan & tindak lanjut</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.slice(0, Math.max(0, prev.length - 1)))
                  }
                  disabled={items.length === 0}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  − Bahasan
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                  className="rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
                >
                  + Bahasan
                </button>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Belum ada bahasan. Tekan + Bahasan untuk menambah.
              </p>
            ) : null}
            {items.map((item, index) => (
              <div
                key={item.key}
                className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2"
              >
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs text-ink-muted">Topik</span>
                  <input
                    value={item.topic}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key ? { ...row, topic: e.target.value } : row,
                        ),
                      )
                    }
                    placeholder={`Topik ${index + 1}`}
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs text-ink-muted">
                    Topik detail permasalahan
                  </span>
                  <textarea
                    value={item.problemDetail}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key
                            ? { ...row, problemDetail: e.target.value }
                            : row,
                        ),
                      )
                    }
                    rows={3}
                    placeholder="Uraian masalah yang dibahas"
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs text-ink-muted">Detail / keputusan</span>
                  <input
                    value={item.detail}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key ? { ...row, detail: e.target.value } : row,
                        ),
                      )
                    }
                    placeholder="Keputusan atau tindak lanjut"
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                </label>
                <DepartmentChecks
                  departmentIds={item.departmentIds}
                  departments={departments}
                  companyWide={companyWide}
                  onChange={(next) =>
                    setItems((prev) =>
                      prev.map((row) =>
                        row.key === item.key ? { ...row, departmentIds: next } : row,
                      ),
                    )
                  }
                />
                <div className="text-sm sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-muted">Penanggung jawab</span>
                    <span className="text-[11px] text-ink-muted">
                      {item.ownerStaffIds.length} karyawan
                    </span>
                  </div>
                  <input
                    value={ownerQueryByKey[item.key] || ""}
                    onChange={(e) =>
                      setOwnerQueryByKey((prev) => ({
                        ...prev,
                        [item.key]: e.target.value,
                      }))
                    }
                    placeholder="Cari karyawan"
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                  <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-bg-elevated px-3 py-2">
                    {ownerOptions
                      .filter((person) => {
                        const limited =
                          item.departmentIds.length > 0 &&
                          !item.departmentIds.includes("*");
                        if (
                          limited &&
                          !item.departmentIds.includes(person.departmentId) &&
                          !item.ownerStaffIds.includes(person.id)
                        ) {
                          return false;
                        }
                        const needle = (ownerQueryByKey[item.key] || "")
                          .trim()
                          .toLowerCase();
                        if (!needle) return true;
                        const dept = departments.find(
                          (row) => row.id === person.departmentId,
                        );
                        return `${person.name} ${dept?.code ?? ""}`
                          .toLowerCase()
                          .includes(needle);
                      })
                      .map((person) => {
                        const dept = departments.find(
                          (row) => row.id === person.departmentId,
                        );
                        return (
                          <label key={person.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.ownerStaffIds.includes(person.id)}
                              onChange={(e) => {
                                const nextIds = e.target.checked
                                  ? [...item.ownerStaffIds, person.id]
                                  : item.ownerStaffIds.filter((id) => id !== person.id);
                                const names = nextIds
                                  .map(
                                    (id) =>
                                      ownerOptions.find((row) => row.id === id)?.name,
                                  )
                                  .filter((name): name is string => Boolean(name))
                                  .join(", ");
                                setItems((prev) =>
                                  prev.map((row) =>
                                    row.key === item.key
                                      ? {
                                          ...row,
                                          ownerStaffIds: nextIds,
                                          ownerName: names,
                                        }
                                      : row,
                                  ),
                                );
                              }}
                            />
                            <span>
                              {person.name}
                              {dept ? (
                                <span className="text-ink-muted"> · {dept.code}</span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Bisa pilih lebih dari satu karyawan.
                    {item.departmentIds.length > 0
                      ? " Daftar mengikuti departemen yang dipilih."
                      : ""}
                    {item.ownerName ? ` Terpilih: ${item.ownerName}.` : ""}
                  </p>
                </div>
                <label className="text-sm">
                  <span className="text-xs text-ink-muted">
                    Tanggal awal pembahasan
                  </span>
                  <input
                    type="date"
                    value={item.startDate}
                    max={item.dueDate || undefined}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key
                            ? { ...row, startDate: e.target.value }
                            : row,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-ink-muted">
                    Jadwal / Target selesai pekerjaan
                  </span>
                  <input
                    type="date"
                    value={item.dueDate}
                    min={item.startDate || undefined}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key
                            ? { ...row, dueDate: e.target.value }
                            : row,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                  />
                </label>
                <div className="sm:col-span-2">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key
                            ? {
                                ...row,
                                status: e.target.value as MeetingItemStatus,
                              }
                            : row,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm sm:max-w-xs"
                  >
                    {(Object.keys(MEETING_STATUS_LABEL) as MeetingItemStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {MEETING_STATUS_LABEL[status]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((row) => row.key !== item.key))
                    }
                    className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1 text-xs text-danger"
                  >
                    Hapus bahasan ini
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan notulen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-xl border border-line px-4 py-2 text-sm"
            >
              Batal
            </button>
          </div>
        </form>
      ) : null}

      {view === "week" ? (
        <div className="space-y-3">
          {carryOver.length > 0 ? (
            <div className="panel p-4">
              <h2 className="font-semibold">Masih berjalan di luar minggu ini</h2>
              <p className="mt-1 text-xs text-ink-muted">
                On progress dan overdue dari notulen minggu lain, supaya tidak
                hilang dari pantauan.
              </p>
              <div className="mt-3 space-y-2">
                {carryOver.map((row) => (
                  <FollowRow
                    key={row.item.id}
                    row={row}
                    departments={departments}
                    onOpen={() => openEdit(row.meeting)}
                    onStatus={(status) => changeStatus(row.item.id, status)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {weekMeetings.length === 0 ? (
            <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
              Belum ada notulen pada minggu ini.
            </p>
          ) : (
            weekMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                departments={departments}
                today={today}
                repeats={repeats}
                onEdit={() => openEdit(meeting)}
                onDelete={() => removeMeeting(meeting)}
                onStatus={changeStatus}
              />
            ))
          )}
        </div>
      ) : null}

      {view === "notes" ? (
        <div className="space-y-3">
          {allMeetings.length === 0 ? (
            <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
              Belum ada notulen.
            </p>
          ) : (
            allMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                departments={departments}
                today={today}
                repeats={repeats}
                onEdit={() => openEdit(meeting)}
                onDelete={() => removeMeeting(meeting)}
                onStatus={changeStatus}
              />
            ))
          )}
        </div>
      ) : null}

      {view === "follow" ? (
        <div className="panel p-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Belum selesai"],
                ["in_progress", "On progress"],
                ["overdue", "Overdue"],
                ["open", "Belum mulai"],
                ["done", "Selesai"],
                ["repeated", "Repeated"],
              ] as Array<[TrackFilter, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === id
                    ? "bg-brand text-white"
                    : "border border-line text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {filter === "repeated" ? (
            <div className="mt-4 space-y-3">
              {visibleRepeats.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">
                  Belum ada topik yang dibahas di lebih dari satu rapat.
                </p>
              ) : (
                visibleRepeats.map(([key, info]) => (
                  <div key={key} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium capitalize">{key}</p>
                      <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                        {info.count}x rapat
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                      {info.meetings.map((meeting) => (
                        <li key={meeting.id}>
                          <button
                            type="button"
                            onClick={() => {
                              const found = meetings.find((row) => row.id === meeting.id);
                              if (found) openEdit(found);
                            }}
                            className="text-left hover:text-brand"
                          >
                            {formatIsoDateId(meeting.date)} · {meeting.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          ) : followRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Tidak ada bahasan pada filter ini.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {followRows.map((row) => (
                <FollowRow
                  key={row.item.id}
                  row={row}
                  departments={departments}
                  onOpen={() => openEdit(row.meeting)}
                  onStatus={(status) => changeStatus(row.item.id, status)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {view === "report" ? (
        <MeetingReportPanel
          meetings={meetings}
          departments={departments}
          query={search}
          onOpen={openEdit}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  active,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  active: boolean;
  onClick: () => void;
  tone?: "danger" | "warn";
}) {
  const valueClass =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel p-4 text-left ${active ? "ring-2 ring-brand" : ""}`}
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
    </button>
  );
}

function DepartmentChecks({
  departmentIds,
  departments,
  companyWide,
  onChange,
}: {
  departmentIds: string[];
  departments: Department[];
  companyWide: boolean;
  onChange: (next: string[]) => void;
}) {
  const allIds = departments.map((dept) => dept.id);
  const allOn =
    departmentIds.includes("*") ||
    (allIds.length > 0 && allIds.every((id) => departmentIds.includes(id)));
  const explicit = departmentIds.includes("*") ? allIds : departmentIds;
  const selectedCount = departmentIds.includes("*")
    ? allIds.length
    : explicit.filter((id) => allIds.includes(id)).length;

  function toggleAll(on: boolean) {
    if (!on) {
      onChange([]);
      return;
    }
    onChange(companyWide ? ["*"] : allIds);
  }

  function toggleOne(id: string, on: boolean) {
    const next = on
      ? [...new Set([...explicit, id])]
      : explicit.filter((row) => row !== id);
    if (companyWide && allIds.length > 0 && next.length === allIds.length) {
      onChange(["*"]);
      return;
    }
    onChange(next);
  }

  return (
    <div className="text-sm sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">Departemen</span>
        <span className="text-[11px] text-ink-muted">
          {allOn ? "Semua departemen" : `${selectedCount} departemen`}
        </span>
      </div>
      <div className="mt-1 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-bg-elevated px-3 py-2">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={allOn}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          Semua departemen
        </label>
        {departments.map((dept) => (
          <label key={dept.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allOn || departmentIds.includes(dept.id)}
              onChange={(e) => toggleOne(dept.id, e.target.checked)}
            />
            {dept.code} — {dept.name}
          </label>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">
        Bisa pilih satu, dua, beberapa, atau semua departemen.
      </p>
    </div>
  );
}

function MeetingCard({
  meeting,
  departments,
  today,
  repeats,
  onEdit,
  onDelete,
  onStatus,
}: {
  meeting: MeetingNote;
  departments: Department[];
  today: string;
  repeats: Map<string, RepeatInfo>;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (itemId: string, status: MeetingItemStatus) => void;
}) {
  return (
    <article className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">
            {formatIsoDateId(meeting.meetingDate)}
            {meeting.meetingTime ? ` · ${meeting.meetingTime}` : ""}
            {` · ${meetingDepartmentLabel(meeting, departments)}`}
          </p>
          <h2 className="mt-0.5 font-semibold">{meeting.title}</h2>
          {meeting.attendees ? (
            <p className="mt-1 text-xs text-ink-muted">
              Peserta: {meeting.attendees}
            </p>
          ) : null}
          {meeting.externalAttendees ? (
            <p className="text-xs text-ink-muted">
              Pihak luar: {meeting.externalAttendees}
            </p>
          ) : null}
          {meeting.createdByName ? (
            <p className="text-[11px] text-ink-muted">Dicatat {meeting.createdByName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-line px-2.5 py-1 text-xs"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1 text-xs text-danger"
          >
            Hapus
          </button>
        </div>
      </div>
      {meeting.summary ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{meeting.summary}</p>
      ) : null}
      {meeting.items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {meeting.items.map((item) => {
            const track = itemTrack(item.status, item.dueDate, today);
            const repeat = repeats.get(normalizeTopic(item.topic));
            const repeated = (repeat?.count ?? 0) >= 2;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.topic}</p>
                  {item.problemDetail ? (
                    <p className="whitespace-pre-wrap text-xs text-ink">
                      {item.problemDetail}
                    </p>
                  ) : null}
                  {item.detail ? (
                    <p className="text-xs text-ink-muted">{item.detail}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {itemDepartmentLabel(item.departmentIds, departments)
                      ? `${itemDepartmentLabel(item.departmentIds, departments)} · `
                      : ""}
                    {item.ownerName || "Tanpa PIC"}
                    {item.startDate
                      ? ` · mulai ${formatIsoDateId(item.startDate)}`
                      : ""}
                    {item.dueDate
                      ? ` · selesai ${formatIsoDateId(item.dueDate)}`
                      : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] ${TRACK_CLASS[track]}`}>
                      {MEETING_TRACK_LABEL[track]}
                    </span>
                    {repeated ? (
                      <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                        Repeated · {repeat?.count}x
                      </span>
                    ) : null}
                  </div>
                </div>
                <select
                  value={item.status}
                  onChange={(e) =>
                    onStatus(item.id, e.target.value as MeetingItemStatus)
                  }
                  className="rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs"
                >
                  {(Object.keys(MEETING_STATUS_LABEL) as MeetingItemStatus[]).map(
                    (status) => (
                      <option key={status} value={status}>
                        {MEETING_STATUS_LABEL[status]}
                      </option>
                    ),
                  )}
                </select>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}

function FollowRow({
  row,
  departments,
  onOpen,
  onStatus,
}: {
  row: {
    item: MeetingItem;
    meeting: MeetingNote;
    track: MeetingTrack;
    repeated: boolean;
    repeat?: RepeatInfo;
  };
  departments: Department[];
  onOpen: () => void;
  onStatus: (status: MeetingItemStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{row.item.topic}</p>
        {row.item.problemDetail ? (
          <p className="line-clamp-2 text-xs text-ink">{row.item.problemDetail}</p>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-xs text-ink-muted hover:text-brand"
        >
          {formatIsoDateId(row.meeting.meetingDate)} · {row.meeting.title}
        </button>
        <p className="text-[11px] text-ink-muted">
          {itemDepartmentLabel(row.item.departmentIds, departments)
            ? `${itemDepartmentLabel(row.item.departmentIds, departments)} · `
            : ""}
          {row.item.ownerName || "Tanpa PIC"}
          {row.item.startDate
            ? ` · mulai ${formatIsoDateId(row.item.startDate)}`
            : ""}
          {row.item.dueDate
            ? ` · selesai ${formatIsoDateId(row.item.dueDate)}`
            : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className={`rounded-md px-2 py-0.5 text-[11px] ${TRACK_CLASS[row.track]}`}>
            {MEETING_TRACK_LABEL[row.track]}
          </span>
          {row.repeated ? (
            <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
              Repeated · {row.repeat?.count}x
            </span>
          ) : null}
        </div>
      </div>
      <select
        value={row.item.status}
        onChange={(e) => onStatus(e.target.value as MeetingItemStatus)}
        className="rounded-lg border border-line bg-bg-elevated px-2 py-1 text-xs"
      >
        {(Object.keys(MEETING_STATUS_LABEL) as MeetingItemStatus[]).map((status) => (
          <option key={status} value={status}>
            {MEETING_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
