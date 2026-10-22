import { formatIsoDateId, itemTrack, MEETING_TRACK_LABEL, todayIso } from "./meeting-track";
import type { MeetingItem, MeetingNote } from "./types";

export type ReminderPerson = {
  id: string;
  name: string;
  phone: string;
};

export type ReminderRow = {
  item: MeetingItem;
  meeting: MeetingNote;
};

export type WaReminderTarget = {
  key: string;
  name: string;
  phone: string;
  wa: string | null;
  items: ReminderRow[];
};

/** Nomor lokal 08… menjadi 62… agar bisa dipakai di tautan WhatsApp. */
export function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function scheduleLine(item: MeetingItem): string {
  const start = item.startDate ? `mulai ${formatIsoDateId(item.startDate)}` : "";
  const due = item.dueDate ? `selesai ${formatIsoDateId(item.dueDate)}` : "";
  return [start, due].filter(Boolean).join(" – ");
}

export function meetingReminderText(
  name: string,
  rows: ReminderRow[],
  today = todayIso(),
): string {
  const lines = [
    `Halo ${name},`,
    "",
    rows.length === 1
      ? "Pengingat pembahasan yang menjadi tanggung jawab Anda:"
      : `Pengingat ${rows.length} pembahasan yang menjadi tanggung jawab Anda:`,
    "",
  ];
  rows.forEach((row, index) => {
    const track = itemTrack(row.item.status, row.item.dueDate, today);
    const schedule = scheduleLine(row.item);
    lines.push(`${index + 1}. *${row.item.topic.trim()}*`);
    if (row.item.problemDetail.trim()) lines.push(row.item.problemDetail.trim());
    if (row.item.detail.trim()) lines.push(row.item.detail.trim());
    if (schedule) lines.push(`Jadwal: ${schedule}`);
    lines.push(`Status: ${MEETING_TRACK_LABEL[track]}`);
    lines.push(
      `Rapat: ${row.meeting.title} (${formatIsoDateId(row.meeting.meetingDate)})`,
    );
    lines.push("");
  });
  lines.push("Mohon ditindaklanjuti sesuai jadwal.");
  lines.push("_Dikirim dari SJS KPI_");
  let text = lines.join("\n").trim();
  if (text.length > 3500) {
    text = `${text.slice(0, 3480).trim()}\n… (dipotong)`;
  }
  return text;
}

export function whatsAppChatUrl(phone: string, text: string): string | null {
  const wa = toWhatsAppNumber(phone);
  if (!wa) return null;
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

function splitNames(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Satu chat per PIC. Beberapa bahasan milik orang yang sama digabung. */
export function groupReminderTargets(
  rows: ReminderRow[],
  people: ReminderPerson[],
): WaReminderTarget[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const byName = new Map(
    people.map((person) => [person.name.trim().toLowerCase(), person]),
  );
  const buckets = new Map<string, WaReminderTarget>();

  for (const row of rows) {
    const owners: Array<{ key: string; name: string; phone: string }> = [];
    const ids = [
      ...new Set(
        [...(row.item.ownerStaffIds || []), row.item.ownerStaffId || ""].filter(
          Boolean,
        ),
      ),
    ];
    for (const id of ids) {
      const person = byId.get(id);
      if (person) {
        owners.push({ key: person.id, name: person.name, phone: person.phone });
      }
    }
    if (owners.length === 0 && row.item.ownerName.trim()) {
      for (const name of splitNames(row.item.ownerName)) {
        const person = byName.get(name.toLowerCase());
        owners.push({
          key: person?.id || `name:${name.toLowerCase()}`,
          name: person?.name || name,
          phone: person?.phone || "",
        });
      }
    }
    if (owners.length === 0) {
      owners.push({ key: "none", name: "Tanpa PIC", phone: "" });
    }
    for (const owner of owners) {
      const wa = toWhatsAppNumber(owner.phone);
      const existing = buckets.get(owner.key);
      if (existing) {
        if (!existing.items.some((entry) => entry.item.id === row.item.id)) {
          existing.items.push(row);
        }
        continue;
      }
      buckets.set(owner.key, {
        key: owner.key,
        name: owner.name,
        phone: owner.phone.trim(),
        wa,
        items: [row],
      });
    }
  }

  return [...buckets.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "id"),
  );
}
