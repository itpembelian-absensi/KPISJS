"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  addDays,
  formatIsoDateId,
  formatWeekLabel,
  itemBucket,
  itemTrack,
  MEETING_BUCKET_LABEL,
  MEETING_STATUS_LABEL,
  MEETING_TRACK_LABEL,
  meetingTouchDates,
  findSameTopicKey,
  normalizeTopic,
  sameTopic,
  todayIso,
  weekBounds,
  type MeetingBucket,
  type MeetingTrack,
} from "@/lib/meeting-track";
import { MeetingReportPanel } from "@/components/MeetingReportPanel";
import {
  groupReminderTargets,
  meetingReminderText,
  whatsAppChatUrl,
  type ReminderPerson,
  type ReminderRow,
  type WaReminderTarget,
} from "@/lib/meeting-wa";
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
  continuedFromId?: string;
  sessionNote?: string;
};

type View = "week" | "notes" | "follow" | "report";
type TrackFilter = MeetingTrack | "repeated";

type RepeatInfo = {
  count: number;
  meetings: Array<{ id: string; title: string; date: string }>;
};

const BUCKET_CLASS: Record<MeetingBucket, string> = {
  open: "bg-line text-ink-muted",
  in_progress: "bg-brand-soft text-brand",
  overdue: "bg-danger-soft text-danger",
  done: "bg-ok-soft text-ok",
  repeated: "bg-warn-soft text-warn",
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

function itemDepartmentNames(
  ids: string[] | undefined,
  departments: Department[],
): string {
  if (!ids || ids.length === 0) return "";
  if (ids.includes("*")) return "Semua departemen";
  return ids
    .map((id) => departments.find((dept) => dept.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

function bahasanDepartmentName(
  item: MeetingItem,
  departments: Department[],
  staff: StaffOption[],
): string {
  const assigned = itemDepartmentNames(item.departmentIds, departments);
  if (assigned) return assigned;
  const ownerIds = item.ownerStaffIds?.length
    ? item.ownerStaffIds
    : item.ownerStaffId
      ? [item.ownerStaffId]
      : [];
  const names = [
    ...new Set(
      ownerIds
        .map((id) => (staff ?? []).find((person) => person.id === id)?.departmentId)
        .filter((id): id is string => Boolean(id))
        .map((id) => departments.find((dept) => dept.id === id)?.name || "")
        .filter(Boolean),
    ),
  ];
  return names.join(", ");
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
  phoneBook,
  initialMeetings,
}: {
  departments: Department[];
  companyWide: boolean;
  staff: StaffOption[];
  phoneBook: ReminderPerson[];
  initialMeetings: MeetingNote[];
}) {
  const today = todayIso();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [view, setView] = useState<View>("week");
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [filter, setFilter] = useState<TrackFilter>("overdue");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  const pathname = usePathname();
  const [liveSearch, setLiveSearch] = useState("");
  const screenQuery = new URLSearchParams(liveSearch);
  const noteParam = screenQuery.get("note");
  const itemParam = screenQuery.get("item");
  const focusParam = screenQuery.get("focus");
  const isNew = screenQuery.get("new") === "1";
  const isEdit = screenQuery.get("edit") === "1" && Boolean(noteParam);
  const showForm = isNew || isEdit;
  const viewingId = isNew ? null : noteParam;
  const onBahasan = Boolean(!showForm && viewingId && itemParam);
  const editingId = isEdit ? noteParam : null;
  const loadedScreen = useRef<string | null>(null);
  const [bahasanDraft, setBahasanDraft] = useState<DraftItem | null>(null);
  const [bahasanSaving, setBahasanSaving] = useState(false);
  const [markingDate, setMarkingDate] = useState(false);
  const [dateEdit, setDateEdit] = useState<{
    itemId: string;
    from: string;
    topic: string;
  } | null>(null);
  const [dateBusy, setDateBusy] = useState(false);
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
  const [continued, setContinued] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [waTargets, setWaTargets] = useState<WaReminderTarget[] | null>(null);
  const [waBusy, setWaBusy] = useState(false);

  function remember(search: string) {
    const url = search ? `${pathname}?${search}` : pathname;
    window.history.pushState(window.history.state, "", url);
    setLiveSearch(search);
  }

  useEffect(() => {
    function syncFromLocation() {
      if (window.location.pathname !== pathname) return;
      setLiveSearch(window.location.search.replace(/^\?/, ""));
    }
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [pathname]);

  const week = weekBounds(weekAnchor);

  const meetingDateOptions = useMemo(() => {
    const map = new Map<string, { date: string; titles: string[] }>();
    for (const m of meetings) {
      if (!m.meetingDate) continue;
      const existing = map.get(m.meetingDate);
      if (existing) {
        if (!existing.titles.includes(m.title)) existing.titles.push(m.title);
      } else {
        map.set(m.meetingDate, { date: m.meetingDate, titles: [m.title] });
      }
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings]);

  const allMeetingDates = useMemo(() => {
    return meetingDateOptions.map((opt) => opt.date);
  }, [meetingDateOptions]);

  function prevMeetingDate() {
    const older = allMeetingDates.filter((d) => d < weekAnchor);
    if (older.length > 0) {
      setWeekAnchor(older[0]);
    } else {
      setWeekAnchor(addDays(week.start, -7));
    }
  }

  function nextMeetingDate() {
    const newer = allMeetingDates.filter((d) => d > weekAnchor).reverse();
    if (newer.length > 0) {
      setWeekAnchor(newer[0]);
    } else {
      setWeekAnchor(addDays(week.start, 7));
    }
  }

  const repeats = useMemo(() => {
    const map = new Map<string, RepeatInfo>();
    const titleById = new Map(meetings.map((meeting) => [meeting.id, meeting.title]));
    for (const meeting of meetings) {
      const seen = new Set<string>();
      for (const item of [...meeting.items, ...(meeting.linkedItems ?? [])]) {
        const key = normalizeTopic(item.topic);
        if (key.length < 3 || seen.has(key)) continue;
        seen.add(key);
        const canonical = findSameTopicKey(map.keys(), key) ?? key;
        const info = map.get(canonical) ?? { count: 0, meetings: [] };
        const add = (id: string, date: string) => {
          const clean = date.slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return;
          if (info.meetings.some((row) => row.date === clean)) return;
          info.meetings.push({
            id,
            title: titleById.get(id) || meeting.title,
            date: clean,
          });
        };
        const sessions = item.sessions ?? [];
        const visible = sessions.filter((session) => !session.hidden);
        if (visible.length === 0 && sessions.length === 0) {
          add(meeting.id, meeting.meetingDate);
        } else {
          for (const session of visible) {
            add(session.meetingId || meeting.id, session.sessionDate);
          }
        }
        info.meetings.sort((a, b) => a.date.localeCompare(b.date));
        info.count = info.meetings.length;
        map.set(canonical, info);
        if (canonical !== key) map.set(key, info);
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
          bucket: itemBucket(
            item.status,
            item.dueDate,
            (repeat?.count ?? 0) >= 2,
            today,
          ),
          repeated: (repeat?.count ?? 0) >= 2,
          repeat,
        };
      }),
    );
  }, [meetings, repeats, today]);

  const stats = {
    progress: tracked.filter((row) => row.bucket === "in_progress").length,
    overdue: tracked.filter((row) => row.bucket === "overdue").length,
    repeated: tracked.filter((row) => row.bucket === "repeated").length,
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

  function matchesDept(meeting: MeetingNote) {
    if (selectedDeptId === "all") return true;
    return (
      meeting.departmentIds.includes("*") ||
      meeting.departmentIds.includes(selectedDeptId) ||
      meeting.departmentId === selectedDeptId
    );
  }

  function matchesDate(dateStr: string) {
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  }

  const weekMeetings = meetings.filter(
    (m) =>
      m.meetingDate >= week.start &&
      m.meetingDate <= week.end &&
      matchesQuery(m) &&
      matchesDept(m),
  );
  const allMeetings = meetings
    .filter(
      (m) => matchesQuery(m) && matchesDept(m) && matchesDate(m.meetingDate),
    )
    .slice()
    .sort((a, b) => {
      const byDate = a.meetingDate.localeCompare(b.meetingDate);
      if (byDate !== 0) return byDate;
      return a.createdAt.localeCompare(b.createdAt);
    });
  const uniqueTopics = (() => {
    const groups = new Map<
      string,
      {
        item: MeetingItem;
        meeting: MeetingNote;
        dates: Set<string>;
        firstDate: string;
      }
    >();
    for (const meeting of allMeetings) {
      const seen = new Set<string>();
      for (const item of [...meeting.items, ...(meeting.linkedItems ?? [])]) {
        const key = normalizeTopic(item.topic);
        if (key.length < 3 || seen.has(key)) continue;
        seen.add(key);
        const canonical = findSameTopicKey(groups.keys(), key) ?? key;
        const dates = meetingTouchDates(item.sessions, [meeting.meetingDate]);
        const current = groups.get(canonical);
        if (!current) {
          groups.set(canonical, {
            item,
            meeting,
            dates: new Set(dates),
            firstDate: dates[0] || meeting.meetingDate,
          });
          continue;
        }
        for (const date of dates) current.dates.add(date);
        const earliest = [...current.dates].sort()[0] || current.firstDate;
        if (earliest < current.firstDate) current.firstDate = earliest;
        if (meeting.meetingDate >= current.meeting.meetingDate) {
          current.item = item;
          current.meeting = meeting;
        }
      }
    }
    return [...groups.entries()]
      .map(([key, group]) => {
        const dates = [...group.dates].sort();
        const repeat: RepeatInfo = {
          count: dates.length,
          meetings: dates.map((date) => ({
            id: group.meeting.id,
            title: group.meeting.title,
            date,
          })),
        };
        return {
          key,
          item: group.item,
          meeting: group.meeting,
          firstDate: dates[0] || group.firstDate,
          track: itemTrack(group.item.status, group.item.dueDate, today),
          bucket: itemBucket(group.item.status, group.item.dueDate, false, today),
          repeated: dates.length >= 2,
          repeat,
        };
      })
      .sort(
        (a, b) =>
          a.firstDate.localeCompare(b.firstDate) ||
          a.item.topic.localeCompare(b.item.topic, "id"),
      );
  })();
  const finishedRows = uniqueTopics
    .filter((row) => row.bucket === "done")
    .sort(compareByPicDepartment);
  const followRows = tracked.filter((row) => {
    if (!matchesQuery(row.meeting)) return false;
    if (!matchesDept(row.meeting)) return false;
    if (!matchesDate(row.meeting.meetingDate)) return false;
    return rowMatchesFilter(row);
  });
  const weekTopicKeys = new Set<string>();
  for (const meeting of weekMeetings) {
    for (const item of [...meeting.items, ...(meeting.linkedItems ?? [])]) {
      const key = normalizeTopic(item.topic);
      if (key) weekTopicKeys.add(findSameTopicKey(weekTopicKeys, key) ?? key);
      weekTopicKeys.add(item.id);
    }
  }
  const carryBest = new Map<string, (typeof tracked)[number]>();
  for (const row of tracked) {
    if (row.item.status === "done") continue;
    if (!matchesQuery(row.meeting) || !matchesDept(row.meeting)) continue;
    if (
      row.meeting.meetingDate >= week.start &&
      row.meeting.meetingDate <= week.end
    ) {
      continue;
    }
    const key = normalizeTopic(row.item.topic) || row.item.id;
    if (weekTopicKeys.has(row.item.id)) continue;
    if (normalizeTopic(row.item.topic) && findSameTopicKey(weekTopicKeys, key)) continue;
    const canonical = findSameTopicKey(carryBest.keys(), key) ?? key;
    const prev = carryBest.get(canonical);
    if (!prev || row.meeting.meetingDate > prev.meeting.meetingDate) {
      carryBest.set(canonical, row);
    }
  }
  const carryOver = [...carryBest.values()].sort(compareByPicDepartment);
  const reminderSource: ReminderRow[] =
    view === "follow"
      ? followRows.map((row) => ({ item: row.item, meeting: row.meeting }))
      : view === "notes"
        ? allMeetings.flatMap((meeting) =>
            meeting.items.map((item) => ({ item, meeting })),
          )
        : [
            ...weekMeetings.flatMap((meeting) =>
              meeting.items.map((item) => ({ item, meeting })),
            ),
            ...carryOver.map((row) => ({ item: row.item, meeting: row.meeting })),
          ];
  const openReminderRows = reminderSource.filter((row) => row.item.status !== "done");

  function pendingDrafts(excludeMeetingId = ""): DraftItem[] {
    const best = new Map<string, (typeof tracked)[number]>();
    for (const row of tracked) {
      if (row.item.status === "done") continue;
      if (excludeMeetingId && row.meeting.id === excludeMeetingId) continue;
      const key = normalizeTopic(row.item.topic) || row.item.id;
      const canonical = findSameTopicKey(best.keys(), key) ?? key;
      const prev = best.get(canonical);
      if (!prev || row.meeting.meetingDate > prev.meeting.meetingDate) {
        best.set(canonical, row);
      }
    }
    return [...best.values()]
      .sort((a, b) => a.item.topic.localeCompare(b.item.topic, "id"))
      .map((row) => ({
        ...draftFromItem(row.item, staff, departments, companyWide),
        continuedFromId: row.item.id,
        sessionNote: "",
      }));
  }

  function resetNewForm() {
    setAllDepartments(false);
    setDepartmentIds(departments[0] ? [departments[0].id] : []);
    setTitle("");
    setMeetingDate(today);
    setMeetingTime("");
    setAttendeeStaffIds([]);
    setExternalAttendees("");
    setAttendeeQuery("");
    setSummary("");
    setContinued([]);
    setItems([emptyItem()]);
    setBahasanDraft(null);
    setError(null);
    setMessage(null);
  }

  function openNew() {
    resetNewForm();
    loadedScreen.current = "new";
    remember(new URLSearchParams({ new: "1" }).toString());
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeForm() {
    setError(null);
    window.history.back();
  }

  function openView(meeting: MeetingNote, item?: MeetingItem) {
    setError(null);
    setMessage(null);
    const params = new URLSearchParams({ note: meeting.id });
    if (item) params.set("focus", item.id);
    loadedScreen.current = `view:${meeting.id}:${item?.id ?? ""}`;
    remember(params.toString());
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeView() {
    setError(null);
    window.history.back();
  }

  function openBahasan(item: MeetingItem) {
    if (!viewingId) return;
    setBahasanDraft(draftFromItem(item, staff, departments, companyWide));
    setError(null);
    setMessage(null);
    loadedScreen.current = `item:${viewingId}:${item.id}`;
    remember(new URLSearchParams({ note: viewingId, item: item.id }).toString());
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openEdit(meeting: MeetingNote) {
    fillFromMeeting(meeting);
    loadedScreen.current = `edit:${meeting.id}`;
    remember(new URLSearchParams({ note: meeting.id, edit: "1" }).toString());
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function fillFromMeeting(meeting: MeetingNote) {
    setBahasanDraft(null);
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
    setContinued(
      (meeting.linkedItems ?? []).map((item) => {
        const session = (item.sessions ?? []).find((row) => row.meetingId === meeting.id);
        return {
          ...draftFromItem(item, staff, departments, companyWide),
          continuedFromId: item.id,
          sessionNote: session?.note || "",
          status: session?.status || item.status,
        };
      }),
    );
    setItems(
      meeting.items.length > 0
        ? meeting.items.map((item) =>
            draftFromItem(item, staff, departments, companyWide),
          )
        : [emptyItem()],
    );
    setError(null);
    setMessage(null);
    setWeekAnchor(meeting.meetingDate);
  }

  useEffect(() => {
    const key = isNew
      ? "new"
      : isEdit && noteParam
        ? `edit:${noteParam}`
        : onBahasan && viewingId && itemParam
          ? `item:${viewingId}:${itemParam}`
          : `view:${viewingId ?? ""}:${focusParam ?? ""}`;
    if (loadedScreen.current === key) return;
    if (isNew) {
      loadedScreen.current = key;
      resetNewForm();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (isEdit && noteParam) {
      const meeting = meetings.find((row) => row.id === noteParam);
      if (!meeting) return;
      loadedScreen.current = key;
      fillFromMeeting(meeting);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (onBahasan && viewingId && itemParam) {
      const meeting = meetings.find((row) => row.id === viewingId);
      const item = meeting
        ? [...meeting.items, ...(meeting.linkedItems ?? [])].find(
            (row) => row.id === itemParam,
          )
        : undefined;
      if (!item) return;
      loadedScreen.current = key;
      setBahasanDraft(draftFromItem(item, staff, departments, companyWide));
      setError(null);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    loadedScreen.current = key;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [
    isNew,
    isEdit,
    onBahasan,
    noteParam,
    itemParam,
    focusParam,
    viewingId,
    meetings,
    staff,
    departments,
    companyWide,
  ]);

  async function markDiscussedToday(itemId: string): Promise<boolean> {
    setMarkingDate(true);
    setError(null);
    const date = todayIso();
    try {
      const res = await fetch("/api/kpi/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-date", itemId, date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mencatat tanggal");
        return false;
      }
      const saved = (Array.isArray(data.meetings) ? data.meetings : []) as MeetingNote[];
      for (const meeting of saved) {
        if (meeting?.id) upsertMeeting(meeting);
      }
      setMessage(`Tanggal ${formatIsoDateId(date)} ditambahkan.`);
      return true;
    } catch {
      setError("Koneksi gagal. Coba lagi.");
      return false;
    } finally {
      setMarkingDate(false);
    }
  }

  function openDateRevision(topic: string, date: string, preferredItemId?: string) {
    const matches: MeetingItem[] = [];
    for (const meeting of meetings) {
      for (const item of [...meeting.items, ...(meeting.linkedItems ?? [])]) {
        if (!sameTopic(item.topic, topic)) continue;
        const sessions = item.sessions ?? [];
        const visible = sessions.filter((session) => !session.hidden);
        const hasDate = visible.some((session) => session.sessionDate.slice(0, 10) === date);
        const bareMeetingDate =
          visible.length === 0 &&
          sessions.length === 0 &&
          meeting.meetingDate.slice(0, 10) === date &&
          item.meetingId === meeting.id;
        if (hasDate || bareMeetingDate) matches.push(item);
      }
    }
    const unique = [...new Map(matches.map((item) => [item.id, item])).values()];
    const owner = unique.find((item) => item.id === preferredItemId) ?? unique[0];
    if (!owner) {
      setError("Tanggal pembahasan tidak ditemukan");
      return;
    }
    setError(null);
    setDateEdit({ itemId: owner.id, from: date, topic: owner.topic });
  }

  async function reviseDiscussionDate(itemId: string, from: string, to: string): Promise<string | null> {
    setDateBusy(true);
    try {
      const res = await fetch("/api/kpi/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise-date",
          itemId,
          fromDate: from,
          toDate: to,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Gagal mengubah tanggal";
      const saved = (Array.isArray(data.meetings) ? data.meetings : []) as MeetingNote[];
      for (const meeting of saved) {
        if (meeting?.id) upsertMeeting(meeting);
      }
      setMessage(
        to
          ? `Tanggal diubah menjadi ${formatIsoDateId(to)}.`
          : `Tanggal ${formatIsoDateId(from)} dihapus.`,
      );
      setDateEdit(null);
      return null;
    } catch {
      return "Koneksi gagal. Coba lagi.";
    } finally {
      setDateBusy(false);
    }
  }

  async function upsertMeeting(meeting: MeetingNote) {
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
          items: [
            ...items
              .filter((item) => item.topic.trim())
              .map((item) => ({
                id: item.id,
                topic: item.topic,
                problemDetail: item.problemDetail,
                detail: item.detail,
                departmentIds: item.departmentIds,
                ownerStaffIds: item.ownerStaffIds,
                ownerName: item.ownerName,
                startDate: item.startDate || meetingDate,
                dueDate: item.dueDate,
                status: item.status,
              })),
            ...continued
              .filter((item) => item.continuedFromId && item.topic.trim())
              .map((item) => ({
                continuedFromId: item.continuedFromId,
                topic: item.topic,
                problemDetail: item.problemDetail,
                detail: item.detail,
                departmentIds: item.departmentIds,
                ownerStaffIds: item.ownerStaffIds,
                ownerName: item.ownerName,
                startDate: item.startDate,
                dueDate: item.dueDate,
                status: item.status,
                sessionNote: item.sessionNote || "",
              })),
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan notulen");
        return;
      }
      const saved = (
        Array.isArray(data.meetings) ? data.meetings : [data.meeting]
      ) as MeetingNote[];
      for (const meeting of saved) {
        if (meeting?.id) upsertMeeting(meeting);
      }
      setMessage("Notulen tersimpan.");
      setWeekAnchor(meetingDate);
      setView("week");
      closeForm();
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
    if (noteParam === meeting.id) window.history.back();
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
    const saved = (
      Array.isArray(data.meetings)
        ? data.meetings
        : data.meeting
          ? [data.meeting]
          : []
    ) as MeetingNote[];
    for (const meeting of saved) {
      if (meeting?.id) upsertMeeting(meeting);
    }
  }

  async function saveBahasan(draft: DraftItem) {
    if (!draft.id) return;
    if (draft.startDate && draft.dueDate && draft.startDate > draft.dueDate) {
      setError("Jadwal / Target selesai tidak boleh sebelum tanggal awal pembahasan.");
      return;
    }
    setBahasanSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kpi/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "item",
          itemId: draft.id,
          topic: draft.topic,
          problemDetail: draft.problemDetail,
          detail: draft.detail,
          departmentIds: draft.departmentIds,
          ownerStaffIds: draft.ownerStaffIds,
          ownerName: draft.ownerName,
          startDate: draft.startDate,
          dueDate: draft.dueDate,
          status: draft.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan bahasan");
        return;
      }
      const saved = (Array.isArray(data.meetings) ? data.meetings : []) as MeetingNote[];
      for (const meeting of saved) {
        if (meeting?.id) upsertMeeting(meeting);
      }
      setMessage("Bahasan tersimpan.");
      if (itemParam) window.history.back();
      else setBahasanDraft(null);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setBahasanSaving(false);
    }
  }

  function focusFilter(next: TrackFilter) {
    setFilter(next);
    setView("week");
  }

  function rowMatchesFilter(row: { bucket: MeetingBucket }) {
    if (filter === "repeated") return row.bucket === "repeated";
    if (filter === "in_progress") return row.bucket === "in_progress";
    if (filter === "overdue") return row.bucket === "overdue";
    if (filter === "open") return row.bucket === "open";
    return row.bucket === "done";
  }

  function picDepartmentLabel(item: MeetingItem): string {
    const assigned = itemDepartmentLabel(item.departmentIds, departments);
    if (assigned) return assigned;
    const ownerIds = item.ownerStaffIds?.length
      ? item.ownerStaffIds
      : item.ownerStaffId
        ? [item.ownerStaffId]
        : [];
    const codes = ownerIds
      .map((id) => staff.find((person) => person.id === id)?.departmentId)
      .filter((id): id is string => Boolean(id))
      .map((id) => departments.find((dept) => dept.id === id)?.code || "")
      .filter(Boolean);
    return [...new Set(codes)].sort((a, b) => a.localeCompare(b, "id")).join(", ");
  }

  function compareByPicDepartment<T extends { item: MeetingItem }>(a: T, b: T): number {
    const deptA = picDepartmentLabel(a.item) || "\uffff";
    const deptB = picDepartmentLabel(b.item) || "\uffff";
    const byDept = deptA.localeCompare(deptB, "id");
    if (byDept !== 0) return byDept;
    const byPic = (a.item.ownerName || "").localeCompare(b.item.ownerName || "", "id");
    if (byPic !== 0) return byPic;
    return a.item.topic.localeCompare(b.item.topic, "id");
  }

  function meetingBahasanRows(meeting: MeetingNote) {
    const own = tracked.filter(
      (row) => row.meeting.id === meeting.id && rowMatchesFilter(row),
    );
    const linked = (meeting.linkedItems ?? [])
      .map((item) => {
        const repeat = repeats.get(normalizeTopic(item.topic));
        const repeated = (repeat?.count ?? 0) >= 2;
        const track = itemTrack(item.status, item.dueDate, today);
        return {
          item,
          meeting,
          track,
          bucket: itemBucket(item.status, item.dueDate, repeated, today),
          repeated,
          repeat,
        };
      })
      .filter((row) => rowMatchesFilter(row));
    return [...own, ...linked].sort(compareByPicDepartment);
  }

  function openReminderChat(target: WaReminderTarget) {
    const url = whatsAppChatUrl(
      target.phone,
      meetingReminderText(target.name, target.items, today),
    );
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendReminder(rows: ReminderRow[], fallback?: WaReminderTarget[]) {
    const itemIds = [...new Set(rows.map((row) => row.item.id))];
    if (itemIds.length === 0) return;
    setWaBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/kpi/meetings/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengirim WhatsApp");
        if (fallback) setWaTargets(fallback);
        return;
      }
      const sent = Array.isArray(data.sent)
        ? data.sent.map((row: { name?: string }) => row.name).filter(Boolean)
        : [];
      const failed = Array.isArray(data.failed)
        ? data.failed.map((row: { name?: string; error?: string }) =>
            `${row.name || "PIC"}: ${row.error || "gagal"}`,
          )
        : [];
      const skipped = Array.isArray(data.skipped)
        ? data.skipped.map((row: { name?: string; reason?: string }) =>
            `${row.name || "PIC"} (${row.reason || "dilewati"})`,
          )
        : [];
      const parts = [
        sent.length ? `WhatsApp terkirim ke ${sent.join(", ")}.` : "",
        failed.length ? `Gagal: ${failed.join("; ")}.` : "",
        skipped.length ? `Dilewati: ${skipped.join("; ")}.` : "",
      ].filter(Boolean);
      const summary = parts.join(" ") || "Tidak ada PIC yang dikirimi.";
      if (failed.length > 0) {
        setError(summary);
        if (fallback) setWaTargets(fallback);
        return;
      }
      setMessage(summary);
      setWaTargets(null);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
      if (fallback) setWaTargets(fallback);
    } finally {
      setWaBusy(false);
    }
  }

  function remindRows(rows: ReminderRow[], direct: boolean) {
    const targets = groupReminderTargets(rows, phoneBook);
    const ready = targets.filter((target) => target.wa);
    if (direct && ready.length > 0 && ready.length === targets.length) {
      void sendReminder(rows, targets);
      return;
    }
    setWaTargets(targets);
  }

  async function importExcel(file: File) {
    setImporting(true);
    setError(null);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/kpi/meetings/import", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      const details = Array.isArray(data.errors)
        ? data.errors.map((item: unknown) => String(item)).filter(Boolean)
        : [];
      setError(
        details.length > 0
          ? [String(data.error || "Gagal unggah Excel"), ...details].join("\n")
          : String(data.error || "Gagal unggah Excel"),
      );
      return;
    }
    const created = (Array.isArray(data.meetings) ? data.meetings : []) as MeetingNote[];
    setMeetings((prev) => {
      const map = new Map(prev.map((meeting) => [meeting.id, meeting]));
      for (const meeting of created) map.set(meeting.id, meeting);
      return [...map.values()].sort((a, b) => {
        const byDate = b.meetingDate.localeCompare(a.meetingDate);
        if (byDate !== 0) return byDate;
        return b.createdAt.localeCompare(a.createdAt);
      });
    });
    if (created.length > 0) {
      const weeks = new Set(created.map((meeting) => weekBounds(meeting.meetingDate).start));
      if (weeks.size === 1) {
        setView("week");
        setWeekAnchor(created[0].meetingDate);
      } else {
        setView("notes");
      }
      setSearch("");
    }
    const names = created.map((meeting) => meeting.title);
    const shown = names.slice(0, 3).join(", ");
    const rest = names.length > 3 ? `, dan ${names.length - 3} lainnya` : "";
    const warnings = Array.isArray(data.warnings)
      ? data.warnings.map((item: unknown) => String(item)).filter(Boolean)
      : [];
    setMessage(
      [
        `${created.length} notulen diimpor${shown ? `: ${shown}${rest}` : ""} · ${Number(data.itemCount) || 0} bahasan.`,
        ...warnings,
      ].join("\n"),
    );
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
        <p className="whitespace-pre-line rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
          {message}
        </p>
      ) : null}
      {error && !showForm ? (
        <p className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!showForm && !viewingId ? (
      <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On progress"
          value={stats.progress}
          hint="Bahasan yang sedang dikerjakan"
          active={view === "week" && filter === "in_progress"}
          onClick={() => focusFilter("in_progress")}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          hint="Lewat jatuh tempo dan belum selesai"
          active={view === "week" && filter === "overdue"}
          onClick={() => focusFilter("overdue")}
          tone="danger"
        />
        <StatCard
          label="Repeated discussions"
          value={stats.repeated}
          hint="Topik yang muncul di 2 rapat atau lebih"
          active={view === "week" && filter === "repeated"}
          onClick={() => focusFilter("repeated")}
          tone="warn"
        />
        <StatCard
          label="Weekly meeting minggu ini"
          value={stats.weekNotes}
          hint={formatWeekLabel(week.start, week.end)}
          active={view === "week"}
          onClick={() => setView("week")}
        />
      </div>

      <div className="panel flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {view === "week" || view === "follow" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={prevMeetingDate}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
                aria-label="Weekly meeting sebelumnya"
                title="Weekly meeting sebelumnya"
              >
                ‹
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {weekMeetings.length > 0
                    ? `Weekly: ${formatIsoDateId(weekMeetings[0].meetingDate)}`
                    : formatWeekLabel(week.start, week.end)}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {weekMeetings.length > 0
                    ? (weekMeetings[0].title || "Weekly meeting")
                    : "Tidak ada weekly meeting minggu ini"}
                </p>
              </div>
              <button
                type="button"
                onClick={nextMeetingDate}
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
                aria-label="Weekly meeting berikutnya"
                title="Weekly meeting berikutnya"
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
          ) : view === "notes" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Semua Notulen</p>
                <p className="text-[11px] text-ink-muted">
                  {uniqueTopics.length} bahasan · tiap bahasan sekali · pembahasan berikutnya melanjutkan bahasan yang sama
                  {dateFrom || dateTo ? " · Filter tanggal aktif" : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-sm font-medium">Laporan Rekapitulasi</p>
              <p className="text-[11px] text-ink-muted">Rekap bahasan &amp; tindak lanjut</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, bahasan, peserta..."
              className="w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm sm:w-64"
            />
            <button
              type="button"
              onClick={() => remindRows(openReminderRows, false)}
              disabled={view === "report" || openReminderRows.length === 0 || waBusy}
              className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-2 text-sm font-medium text-ok disabled:opacity-50"
            >
              Ingatkan PIC
            </button>
            <a
              href="/api/kpi/meetings/template"
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-bg-elevated"
            >
              Template Excel
            </a>
            <label
              className={`rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-bg-elevated ${
                importing ? "pointer-events-none opacity-60" : "cursor-pointer"
              }`}
            >
              {importing ? "Mengunggah..." : "Unggah Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importExcel(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={openNew}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Notulen baru
            </button>
          </div>
        </div>
        <p className="text-[11px] text-ink-muted">
          Untuk banyak bahasan sekaligus: unduh Template Excel, isi satu baris
          per bahasan di sheet Notulen, lalu Unggah Excel. Baris dengan Kode
          grup yang sama menjadi satu notulen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["week", "Weekly meeting"],
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
            {id === "notes" && (dateFrom || dateTo || selectedDeptId !== "all") ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" />
            ) : null}
          </button>
        ))}
      </div>
      </>
      ) : null}

      {showForm ? (
        <form onSubmit={save} className="panel space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
            <button
              type="button"
              onClick={closeForm}
              className="text-xs text-ink-muted hover:text-brand"
            >
              {viewingId ? "← Kembali ke notulen" : "← Kembali ke daftar"}
            </button>
            <h2 className="mt-1 font-semibold">
              {editingId ? "Edit notulen" : "Notulen baru"}
            </h2>
          </div>
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

          {editingId && continued.length > 0 ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Bahasan yang dilanjutkan</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Tanggal pembahasan mengikuti tanggal notulen ini.
              </p>
            </div>
            {continued.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-ink-muted">
                Tidak ada bahasan pending. Bahasan baru diisi di bagian bawah.
              </p>
            ) : (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {continued.map((item) => (
                <div
                  key={item.key}
                  className="space-y-2 rounded-xl border border-brand/20 bg-brand-soft/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.topic}</p>
                      {item.problemDetail ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-ink">
                          {item.problemDetail}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {itemDepartmentLabel(item.departmentIds, departments)
                          ? `${itemDepartmentLabel(item.departmentIds, departments)} · `
                          : ""}
                        {item.ownerName || "Tanpa PIC"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setContinued((prev) => prev.filter((row) => row.key !== item.key))
                      }
                      className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs"
                    >
                      Tidak dibahas kali ini
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="text-xs text-ink-muted">Status sekarang</span>
                      <select
                        value={item.status}
                        onChange={(e) =>
                          setContinued((prev) =>
                            prev.map((row) =>
                              row.key === item.key
                                ? { ...row, status: e.target.value as MeetingItemStatus }
                                : row,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                      >
                        {(Object.keys(MEETING_STATUS_LABEL) as MeetingItemStatus[]).map(
                          (status) => (
                            <option key={status} value={status}>
                              {MEETING_STATUS_LABEL[status]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="text-xs text-ink-muted">Catatan meeting ini</span>
                      <input
                        value={item.sessionNote || ""}
                        onChange={(e) =>
                          setContinued((prev) =>
                            prev.map((row) =>
                              row.key === item.key
                                ? { ...row, sessionNote: e.target.value }
                                : row,
                            ),
                          )
                        }
                        placeholder="Perkembangan pada tanggal ini"
                        className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{editingId ? "Bahasan baru" : "Bahasan"}</p>
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
                    rows={10}
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
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Kosongkan untuk memakai tanggal notulen.
                  </p>
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
              onClick={closeForm}
              className="rounded-xl border border-line px-4 py-2 text-sm"
            >
              Batal
            </button>
          </div>
        </form>
      ) : null}

      {!showForm && onBahasan && bahasanDraft ? (
        <BahasanEditor
          draft={bahasanDraft}
          departments={departments}
          staff={staff}
          companyWide={companyWide}
          saving={bahasanSaving}
          marking={markingDate}
          discussedOn={discussionDates(
            repeats.get(normalizeTopic(bahasanDraft.topic)),
            meetings.find((row) => row.id === viewingId)?.meetingDate,
          )}
          error={error}
          onCancel={() => {
            setError(null);
            window.history.back();
          }}
          onSave={saveBahasan}
          onMarkToday={() =>
            bahasanDraft.id ? markDiscussedToday(bahasanDraft.id) : Promise.resolve(false)
          }
          onPickDate={(date) =>
            openDateRevision(bahasanDraft.topic, date, bahasanDraft.id)
          }
        />
      ) : null}

      {!showForm && viewingId && !onBahasan ? (
        <MeetingNoteView
          meeting={meetings.find((row) => row.id === viewingId) ?? null}
          departments={departments}
          staff={staff}
          repeats={repeats}
          focusItemId={focusParam}
          onBack={closeView}
          onEdit={(meeting) => openEdit(meeting)}
          onEditBahasan={openBahasan}
          onStatus={changeStatus}
          onPickDate={(topic, date, itemId) => openDateRevision(topic, date, itemId)}
        />
      ) : null}

      {!showForm && !viewingId && (view === "week" || view === "follow") ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["overdue", "Overdue"],
                ["repeated", "Repeated"],
                ["in_progress", "On progress"],
                ["open", "Belum mulai"],
                ["done", "Selesai"],
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
          {filter === "done" ? (
            finishedRows.length === 0 ? (
              <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
                Belum ada bahasan selesai.
              </p>
            ) : (
              <section className="panel p-4">
                <h2 className="font-semibold">Selesai</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Semua bahasan yang statusnya selesai, dari meeting mana pun.
                </p>
                <div className="mt-3 space-y-2">
                  {finishedRows.map((row) => (
                    <FollowRow
                      key={row.key}
                      row={row}
                      departments={departments}
                      staff={staff}
                      onOpen={() => openView(row.meeting, row.item)}
                      onStatus={(status) => changeStatus(row.item.id, status)}
                      onPickDate={(date) => openDateRevision(row.item.topic, date, row.item.id)}
                      onRemind={() =>
                        remindRows([{ item: row.item, meeting: row.meeting }], true)
                      }
                      busy={waBusy}
                    />
                  ))}
                </div>
              </section>
            )
          ) : weekMeetings.length === 0 ? (
            <p className="panel px-4 py-8 text-center text-sm text-ink-muted">
              Belum ada notulen pada minggu ini.
            </p>
          ) : (
            weekMeetings.map((meeting) => {
              const rows = meetingBahasanRows(meeting);
              const pending =
                weekMeetings.length === 1
                  ? carryOver.filter((row) => rowMatchesFilter(row))
                  : [];
              return (
                <section key={meeting.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-ink-muted">
                        {formatIsoDateId(meeting.meetingDate)}
                        {meeting.meetingTime ? ` · ${meeting.meetingTime}` : ""}
                        {` · ${meetingDepartmentLabel(meeting, departments)}`}
                      </p>
                      <h2 className="mt-0.5 text-lg font-semibold">{meeting.title}</h2>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openView(meeting)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMeeting(meeting)}
                        className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1 text-xs text-danger"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">Daftar bahasan</h3>
                  {rows.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">
                      Tidak ada bahasan pada filter ini.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {rows.map((row) => (
                        <FollowRow
                          key={row.item.id}
                          row={row}
                          departments={departments}
                          staff={staff}
                          onOpen={() => openView(row.meeting, row.item)}
                          onStatus={(status) => changeStatus(row.item.id, status)}
                      onPickDate={(date) => openDateRevision(row.item.topic, date, row.item.id)}
                          onRemind={() =>
                            remindRows([{ item: row.item, meeting: row.meeting }], true)
                          }
                          busy={waBusy}
                        />
                      ))}
                    </div>
                  )}
                  {pending.length > 0 ? (
                    <div className="mt-5 border-t border-line pt-4">
                      <h3 className="text-sm font-semibold">Masih berjalan</h3>
                      <p className="mt-1 text-xs text-ink-muted">
                        Bahasan dari meeting sebelumnya yang belum selesai.
                      </p>
                      <div className="mt-3 space-y-2">
                        {pending.map((row) => (
                          <FollowRow
                            key={row.item.id}
                            row={row}
                            departments={departments}
                            staff={staff}
                            onOpen={() => openView(row.meeting, row.item)}
                            onStatus={(status) => changeStatus(row.item.id, status)}
                      onPickDate={(date) => openDateRevision(row.item.topic, date, row.item.id)}
                            onRemind={() =>
                              remindRows([{ item: row.item, meeting: row.meeting }], true)
                            }
                            busy={waBusy}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
          {weekMeetings.length !== 1 &&
          carryOver.filter((row) => rowMatchesFilter(row)).length > 0 ? (
            <section className="panel p-4">
              <h2 className="font-semibold">Masih berjalan</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Bahasan dari meeting sebelumnya yang belum selesai.
              </p>
              <div className="mt-3 space-y-2">
                {carryOver
                  .filter((row) => rowMatchesFilter(row))
                  .map((row) => (
                    <FollowRow
                      key={row.item.id}
                      row={row}
                      departments={departments}
                      staff={staff}
                      onOpen={() => openView(row.meeting, row.item)}
                      onStatus={(status) => changeStatus(row.item.id, status)}
                      onPickDate={(date) => openDateRevision(row.item.topic, date, row.item.id)}
                      onRemind={() =>
                        remindRows([{ item: row.item, meeting: row.meeting }], true)
                      }
                      busy={waBusy}
                    />
                  ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!showForm && !viewingId && view === "notes" ? (
        <div className="space-y-3">
          <div className="panel space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Filter Notulen &amp; Tanggal
                </span>
                {(dateFrom || dateTo || selectedDeptId !== "all") && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                    Filter aktif
                  </span>
                )}
              </div>
              {(dateFrom || dateTo || selectedDeptId !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setSelectedDeptId("all");
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="text-xs text-ink-muted">Tanggal Weekly Meeting</span>
                <select
                  value={
                    dateFrom && dateFrom === dateTo && allMeetingDates.includes(dateFrom)
                      ? dateFrom
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setDateFrom(val);
                      setDateTo(val);
                    } else {
                      setDateFrom("");
                      setDateTo("");
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                >
                  <option value="">Semua tanggal meeting</option>
                  {meetingDateOptions.map((opt) => (
                    <option key={opt.date} value={opt.date}>
                      {formatIsoDateId(opt.date)} {opt.titles.length > 0 ? `· ${opt.titles.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs text-ink-muted">Departemen</span>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
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
                <span className="text-xs text-ink-muted">Dari tanggal</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-ink-muted">Sampai tanggal</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-xs text-ink-muted">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-muted mr-1">Preset cepat:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom(today);
                    setDateTo(today);
                  }}
                  className={`rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-bg-elevated ${
                    dateFrom === today && dateTo === today
                      ? "border-brand bg-brand text-white"
                      : ""
                  }`}
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom(week.start);
                    setDateTo(week.end);
                  }}
                  className={`rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-bg-elevated ${
                    dateFrom === week.start && dateTo === week.end
                      ? "border-brand bg-brand text-white"
                      : ""
                  }`}
                >
                  Minggu ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstDay = `${today.slice(0, 7)}-01`;
                    setDateFrom(firstDay);
                    setDateTo(today);
                  }}
                  className="rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-bg-elevated"
                >
                  Bulan ini
                </button>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-ink-muted hover:bg-bg-elevated"
                  >
                    Semua tanggal
                  </button>
                )}
              </div>
              <span>
                Menampilkan <strong>{uniqueTopics.length}</strong> bahasan dari {meetings.length} notulen
                {dateFrom || dateTo ? (
                  <span>
                    {" "}· Periode: {dateFrom ? formatIsoDateId(dateFrom) : "Awal"} s/d{" "}
                    {dateTo ? formatIsoDateId(dateTo) : "Sekarang"}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          {uniqueTopics.length === 0 ? (
            <div className="panel space-y-3 px-4 py-8 text-center text-sm text-ink-muted">
              <p>Tidak ada notulen yang cocok dengan filter tanggal atau pencarian.</p>
              {(dateFrom || dateTo || selectedDeptId !== "all" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setSelectedDeptId("all");
                    setSearch("");
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-brand hover:bg-bg-elevated"
                >
                  Reset semua filter &amp; pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="panel space-y-2 p-4">
              {[...uniqueTopics].sort(compareByPicDepartment).map((row) => (
                <FollowRow
                  key={row.key}
                  row={row}
                  departments={departments}
                  staff={staff}
                  onOpen={() => openView(row.meeting, row.item)}
                  onStatus={(status) => changeStatus(row.item.id, status)}
                      onPickDate={(date) => openDateRevision(row.item.topic, date, row.item.id)}
                  onRemind={() =>
                    remindRows([{ item: row.item, meeting: row.meeting }], true)
                  }
                  busy={waBusy}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!showForm && !viewingId && view === "report" ? (
        <MeetingReportPanel
          meetings={meetings}
          departments={departments}
          query={search}
          onOpen={openView}
        />
      ) : null}

      {waTargets ? (
        <WaReminderDialog
          targets={waTargets}
          today={today}
          busy={waBusy}
          onOpen={openReminderChat}
          onSend={() => sendReminder(waTargets.flatMap((target) => target.items), waTargets)}
          onClose={() => {
            if (!waBusy) setWaTargets(null);
          }}
        />
      ) : null}
      {dateEdit ? (
        <DateRevisionDialog
          topic={dateEdit.topic}
          from={dateEdit.from}
          busy={dateBusy}
          onClose={() => {
            if (!dateBusy) setDateEdit(null);
          }}
          onConfirm={(to) => reviseDiscussionDate(dateEdit.itemId, dateEdit.from, to)}
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

function discussionDates(repeat: RepeatInfo | undefined, fallback = ""): string[] {
  if (repeat) {
    return [
      ...new Set(
        repeat.meetings
          .map((row) => row.date.slice(0, 10))
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
      ),
    ].sort();
  }
  const day = fallback.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? [day] : [];
}

function DiscussedOn({
  dates,
  onPick,
}: {
  dates: string[];
  onPick?: (date: string) => void;
}) {
  if (dates.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-[11px] text-ink-muted">
        {dates.length > 1 ? `Dibahas ${dates.length} kali` : "Dibahas"}
      </span>
      {dates.map((date) =>
        onPick ? (
          <button
            key={date}
            type="button"
            onClick={() => onPick(date)}
            title="Ubah atau hapus tanggal"
            className="rounded-md border border-line bg-bg-elevated px-1.5 py-0.5 text-[11px] text-ink hover:border-brand hover:text-brand"
          >
            {formatIsoDateId(date)}
          </button>
        ) : (
          <span
            key={date}
            className="rounded-md border border-line bg-bg-elevated px-1.5 py-0.5 text-[11px] text-ink"
          >
            {formatIsoDateId(date)}
          </span>
        ),
      )}
    </div>
  );
}

function MeetingNoteView({
  meeting,
  departments,
  staff,
  repeats,
  focusItemId,
  onBack,
  onEdit,
  onEditBahasan,
  onStatus,
  onPickDate,
}: {
  meeting: MeetingNote | null;
  departments: Department[];
  staff: StaffOption[];
  repeats: Map<string, RepeatInfo>;
  focusItemId: string | null;
  onBack: () => void;
  onEdit: (meeting: MeetingNote) => void;
  onEditBahasan: (item: MeetingItem) => void;
  onStatus: (itemId: string, status: MeetingItemStatus) => void;
  onPickDate: (topic: string, date: string, itemId: string) => void;
}) {
  if (!meeting) {
    return (
      <div className="panel p-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-ink-muted hover:text-brand"
        >
          ← Kembali ke daftar
        </button>
        <p className="mt-3 text-sm text-ink-muted">Notulen tidak ditemukan.</p>
      </div>
    );
  }

  const bahasan = [
    ...meeting.items.map((item) => ({ item, linked: false })),
    ...(meeting.linkedItems ?? []).map((item) => ({ item, linked: true })),
  ].filter(({ item }) => !focusItemId || item.id === focusItemId);

  return (
    <article className="panel space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {focusItemId ? null : (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-ink-muted hover:text-brand"
            >
              ← Kembali ke daftar
            </button>
          )}
          <h2 className={`text-lg font-semibold ${focusItemId ? "" : "mt-1"}`}>{meeting.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {formatIsoDateId(meeting.meetingDate)}
            {meeting.meetingTime ? ` · ${meeting.meetingTime}` : ""}
            {` · ${meetingDepartmentLabel(meeting, departments)}`}
          </p>
          {focusItemId ? null : meeting.attendees ? (
            <p className="mt-1 text-xs text-ink-muted">Peserta: {meeting.attendees}</p>
          ) : null}
          {focusItemId ? null : meeting.externalAttendees ? (
            <p className="text-xs text-ink-muted">Pihak luar: {meeting.externalAttendees}</p>
          ) : null}
          {focusItemId ? null : meeting.createdByName ? (
            <p className="text-[11px] text-ink-muted">Dicatat {meeting.createdByName}</p>
          ) : null}
        </div>
        {focusItemId ? null : (
          <button
            type="button"
            onClick={() => onEdit(meeting)}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            Edit
          </button>
        )}
      </div>
      {!focusItemId && meeting.summary ? (
        <p className="whitespace-pre-wrap text-sm text-ink">{meeting.summary}</p>
      ) : null}
      <div>
        <h3 className="text-sm font-semibold">
          {focusItemId ? "Bahasan" : "Daftar bahasan"}
        </h3>
        {bahasan.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            {focusItemId
              ? "Bahasan tidak ditemukan pada notulen ini."
              : "Belum ada bahasan pada notulen ini."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bahasan.map(({ item, linked }) => {
              const departmentName = bahasanDepartmentName(item, departments, staff);
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                    linked ? "border-brand/20 bg-brand-soft/30" : "border-line"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.topic}</p>
                  {departmentName ? (
                    <p className="text-xs font-medium text-brand">{departmentName}</p>
                  ) : null}
                  {linked ? (
                    <p className="text-[11px] text-ink-muted">Lanjutan dari meeting sebelumnya</p>
                  ) : null}
                  {item.problemDetail ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink">{item.problemDetail}</p>
                  ) : null}
                  {item.detail ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">{item.detail}</p>
                  ) : null}
                  {(item.sessions ?? [])
                    .filter((row) => {
                      const note = row.note.trim();
                      if (!note) return false;
                      const body = `${item.problemDetail}\n${item.detail}`;
                      return !body.includes(note);
                    })
                    .map((row) => (
                      <p key={row.id} className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">
                        {formatIsoDateId(row.sessionDate)}: {row.note}
                      </p>
                    ))}
                  <DiscussedOn
                    dates={discussionDates(
                      repeats.get(normalizeTopic(item.topic)),
                      meeting.meetingDate,
                    )}
                    onPick={(date) => onPickDate(item.topic, date, item.id)}
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {itemDepartmentLabel(item.departmentIds, departments)
                      ? `${itemDepartmentLabel(item.departmentIds, departments)} · `
                      : ""}
                    {item.ownerName || "Tanpa PIC"}
                    {item.startDate ? ` · mulai ${formatIsoDateId(item.startDate)}` : ""}
                    {item.dueDate ? ` · selesai ${formatIsoDateId(item.dueDate)}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                  </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {focusItemId ? (
                      <button
                        type="button"
                        onClick={onBack}
                        className="rounded-lg bg-[#d5ddd8] px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        ← Kembali ke daftar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEditBahasan(item)}
                      className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white"
                    >
                      Edit bahasan
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}

function BahasanEditor({
  draft,
  departments,
  staff,
  companyWide,
  saving,
  marking,
  discussedOn,
  error,
  onCancel,
  onSave,
  onMarkToday,
  onPickDate,
}: {
  draft: DraftItem;
  departments: Department[];
  staff: StaffOption[];
  companyWide: boolean;
  saving: boolean;
  marking: boolean;
  discussedOn: string[];
  error: string | null;
  onCancel: () => void;
  onSave: (draft: DraftItem) => void;
  onMarkToday: () => Promise<boolean>;
  onPickDate: (date: string) => void;
}) {
  const [item, setItem] = useState(draft);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [showAssignment, setShowAssignment] = useState(false);
  const [dates, setDates] = useState(discussedOn);
  const discussedKey = discussedOn.join("|");
  useEffect(() => {
    setDates((prev) =>
      prev.join("|") === discussedKey ? prev : discussedKey.split("|").filter(Boolean),
    );
  }, [discussedKey]);
  const today = todayIso();
  const alreadyToday = dates.includes(today);
  const deptSummary = item.departmentIds.includes("*")
    ? "Semua departemen"
    : item.departmentIds.length === 0
      ? "Belum pilih departemen"
      : itemDepartmentLabel(item.departmentIds, departments) ||
        `${item.departmentIds.length} departemen`;
  const picSummary = item.ownerName || "Belum pilih PIC";
  const people = [...staff].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const needle = ownerQuery.trim().toLowerCase();
  const visiblePeople = people.filter((person) => {
    const limited = item.departmentIds.length > 0 && !item.departmentIds.includes("*");
    if (
      limited &&
      !item.departmentIds.includes(person.departmentId) &&
      !item.ownerStaffIds.includes(person.id)
    ) {
      return false;
    }
    if (!needle) return true;
    const dept = departments.find((row) => row.id === person.departmentId);
    return `${person.name} ${dept?.code ?? ""}`.toLowerCase().includes(needle);
  });

  return (
    <form
      className="panel space-y-3 p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(item);
      }}
    >
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-[#d5ddd8] px-2.5 py-1 text-xs font-medium text-ink"
        >
          ← Kembali ke notulen
        </button>
        <h2 className="mt-1 font-semibold">Edit bahasan</h2>
      </div>
      <div className="rounded-xl border border-line px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Tanggal pembahasan</p>
          <button
            type="button"
            disabled={marking || alreadyToday || !draft.id}
            onClick={() => {
              void onMarkToday().then((ok) => {
                if (!ok) return;
                setDates((prev) =>
                  prev.includes(today) ? prev : [...prev, today].sort(),
                );
              });
            }}
            className="rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand disabled:opacity-60"
          >
            {alreadyToday
              ? "Tanggal hari ini sudah tercatat"
              : marking
                ? "Mencatat..."
                : `Catat tanggal hari ini · ${formatIsoDateId(today)}`}
          </button>
        </div>
        <DiscussedOn dates={dates} onPick={onPickDate} />
        <p className="mt-1 text-[11px] text-ink-muted">
          Tanggal hari ini ditambahkan setelah tanggal pembahasan sebelumnya.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Topik</span>
        <input
          required
          value={item.topic}
          onChange={(e) => setItem((row) => ({ ...row, topic: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Topik detail permasalahan</span>
        <textarea
          value={item.problemDetail}
          onChange={(e) => setItem((row) => ({ ...row, problemDetail: e.target.value }))}
          rows={10}
          className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-ink-muted">Detail / keputusan</span>
        <input
          value={item.detail}
          onChange={(e) => setItem((row) => ({ ...row, detail: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
        />
      </label>
      <div className="rounded-xl border border-line">
        <button
          type="button"
          onClick={() => setShowAssignment((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium">Departemen &amp; penanggung jawab</span>
            <span className="block truncate text-[11px] text-ink-muted">
              {deptSummary} · {picSummary}
            </span>
          </span>
          <span className="shrink-0 text-xs text-brand">
            {showAssignment ? "Sembunyikan" : "Tampilkan"}
          </span>
        </button>
        {showAssignment ? (
          <div className="space-y-3 border-t border-line px-3 py-3">
      <DepartmentChecks
        departmentIds={item.departmentIds}
        departments={departments}
        companyWide={companyWide}
        onChange={(departmentIds) => setItem((row) => ({ ...row, departmentIds }))}
      />
      <div className="text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">Penanggung jawab</span>
          <span className="text-[11px] text-ink-muted">{item.ownerStaffIds.length} karyawan</span>
        </div>
        <input
          value={ownerQuery}
          onChange={(e) => setOwnerQuery(e.target.value)}
          placeholder="Cari karyawan"
          className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
        />
        <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-bg-elevated px-3 py-2">
          {visiblePeople.map((person) => {
            const dept = departments.find((row) => row.id === person.departmentId);
            return (
              <label key={person.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.ownerStaffIds.includes(person.id)}
                  onChange={(e) => {
                    const ownerStaffIds = e.target.checked
                      ? [...item.ownerStaffIds, person.id]
                      : item.ownerStaffIds.filter((id) => id !== person.id);
                    const ownerName = ownerStaffIds
                      .map((id) => people.find((row) => row.id === id)?.name)
                      .filter((name): name is string => Boolean(name))
                      .join(", ");
                    setItem((row) => ({ ...row, ownerStaffIds, ownerName }));
                  }}
                />
                <span>
                  {person.name}
                  {dept ? <span className="text-ink-muted"> · {dept.code}</span> : null}
                </span>
              </label>
            );
          })}
        </div>
      </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Tanggal awal pembahasan</span>
          <input
            type="date"
            value={item.startDate}
            max={item.dueDate || undefined}
            onChange={(e) => setItem((row) => ({ ...row, startDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-ink-muted">Jadwal / Target selesai pekerjaan</span>
          <input
            type="date"
            value={item.dueDate}
            min={item.startDate || undefined}
            onChange={(e) => setItem((row) => ({ ...row, dueDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
          />
        </label>
      </div>
      <select
        value={item.status}
        onChange={(e) =>
          setItem((row) => ({ ...row, status: e.target.value as MeetingItemStatus }))
        }
        className="w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm sm:max-w-xs"
      >
        {(Object.keys(MEETING_STATUS_LABEL) as MeetingItemStatus[]).map((status) => (
          <option key={status} value={status}>
            {MEETING_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan bahasan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-line px-4 py-2 text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function FollowRow({
  row,
  departments,
  staff,
  onOpen,
  onStatus,
  onRemind,
  onPickDate,
  busy,
}: {
  row: {
    item: MeetingItem;
    meeting: MeetingNote;
    track: MeetingTrack;
    bucket: MeetingBucket;
    repeated: boolean;
    repeat?: RepeatInfo;
  };
  departments: Department[];
  staff: StaffOption[];
  onOpen: () => void;
  onStatus: (status: MeetingItemStatus) => void;
  onRemind: () => void;
  onPickDate: (date: string) => void;
  busy: boolean;
}) {
  const departmentName = bahasanDepartmentName(row.item, departments, staff);
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{row.item.topic}</p>
        {departmentName ? (
          <p className="text-xs font-medium text-brand">{departmentName}</p>
        ) : null}
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
        <DiscussedOn
          dates={discussionDates(row.repeat, row.meeting.meetingDate)}
          onPick={onPickDate}
        />
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
          <span className={`rounded-md px-2 py-0.5 text-[11px] ${BUCKET_CLASS[row.bucket]}`}>
            {MEETING_BUCKET_LABEL[row.bucket]}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg border border-line px-2.5 py-1 text-xs"
        >
          View notulen
        </button>
        <button
          type="button"
          onClick={onRemind}
          className="rounded-lg border border-ok/30 bg-ok-soft px-2.5 py-1 text-xs text-ok disabled:opacity-50"
          disabled={busy}
        >
          WA PIC
        </button>
      </div>
    </div>
  );
}

function DateRevisionDialog({
  topic,
  from,
  busy,
  onClose,
  onConfirm,
}: {
  topic: string;
  from: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (to: string) => Promise<string | null>;
}) {
  const [nextDate, setNextDate] = useState(from);
  const [confirming, setConfirming] = useState<"" | "edit" | "delete">("");
  const [localError, setLocalError] = useState<string | null>(null);
  const removing = confirming === "delete";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-revision-title"
        className="panel w-full max-w-sm p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="date-revision-title" className="font-semibold">
          Tanggal pembahasan
        </h2>
        <p className="mt-1 text-xs text-ink-muted">{topic}</p>
        {confirming ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              {removing
                ? `Yakin mau menghapus tanggal ${formatIsoDateId(from)}?`
                : `Yakin mau mengubah tanggal ${formatIsoDateId(from)} menjadi ${formatIsoDateId(nextDate)}?`}
            </p>
            {localError ? <p className="text-sm text-danger">{localError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void onConfirm(removing ? "" : nextDate).then((message) => {
                    if (message) setLocalError(message);
                  });
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 ${
                  removing ? "bg-danger" : "bg-brand"
                }`}
              >
                {busy ? "Menyimpan..." : removing ? "Ya, hapus" : "Ya, ubah"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirming("");
                  setLocalError(null);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-xs text-ink-muted">Tanggal</span>
              <input
                type="date"
                value={nextDate}
                onChange={(event) => setNextDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm"
              />
            </label>
            {localError ? <p className="text-sm text-danger">{localError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
                    setLocalError("Tanggal tidak valid");
                    return;
                  }
                  if (nextDate === from) {
                    setLocalError("Tanggal tidak berubah");
                    return;
                  }
                  setLocalError(null);
                  setConfirming("edit");
                }}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setConfirming("delete");
                }}
                className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-3 py-1.5 text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WaReminderDialog({
  targets,
  today,
  busy,
  onOpen,
  onSend,
  onClose,
}: {
  targets: WaReminderTarget[];
  today: string;
  busy: boolean;
  onOpen: (target: WaReminderTarget) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const ready = targets.filter((target) => target.wa);
  const missing = targets.filter((target) => !target.wa);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-reminder-title"
        className="panel max-h-[85vh] w-full max-w-lg overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="wa-reminder-title" className="font-semibold">
              Ingatkan PIC via WhatsApp
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Pesan berisi isi bahasan dan jadwal, lalu dikirim otomatis ke
              nomor PIC. Chat manual hanya cadangan jika gateway gagal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-2 py-1 text-xs"
          >
            Tutup
          </button>
        </div>
        {targets.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Tidak ada bahasan yang bisa diingatkan.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ready.map((target) => (
              <li key={target.key} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{target.name}</p>
                    <p className="text-[11px] text-ink-muted">{target.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpen(target)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs"
                  >
                    Manual
                  </button>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {target.items.map((row) => {
                    const track = itemTrack(row.item.status, row.item.dueDate, today);
                    const schedule = [
                      row.item.startDate
                        ? `mulai ${formatIsoDateId(row.item.startDate)}`
                        : "",
                      row.item.dueDate
                        ? `selesai ${formatIsoDateId(row.item.dueDate)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" – ");
                    return (
                      <li key={row.item.id}>
                        {row.item.topic}
                        {schedule ? ` · ${schedule}` : ""}
                        {` · ${MEETING_TRACK_LABEL[track]}`}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {missing.map((target) => (
              <li
                key={target.key}
                className="rounded-xl border border-warn/30 bg-warn-soft p-3"
              >
                <p className="text-sm font-medium">{target.name}</p>
                <p className="mt-1 text-xs text-warn">
                  {target.key === "none"
                    ? "Bahasan ini belum punya PIC."
                    : "Nomor HP belum diisi di data karyawan, jadi pesan tidak terkirim."}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {target.items.map((row) => (
                    <li key={row.item.id}>{row.item.topic}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {ready.length > 0 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={onSend}
              disabled={busy}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Mengirim..." : `Kirim ke ${ready.length} PIC`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
