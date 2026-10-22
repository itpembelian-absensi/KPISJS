import { sendGowaText } from "./gowa";
import { listMeetingNotes } from "./meeting-ops";
import { itemTrack, todayIso } from "./meeting-track";
import {
  groupReminderTargets,
  meetingReminderText,
  type ReminderRow,
} from "./meeting-wa";
import { listStaff } from "./store";

export type WaDelivery = {
  sent: Array<{ name: string }>;
  failed: Array<{ name: string; error: string }>;
  skipped: Array<{ name: string; reason: string }>;
};

/** Bahasan yang belum selesai. `overdue` hanya yang lewat jatuh tempo. */
export function openReminderRows(scope: "open" | "overdue"): ReminderRow[] {
  const today = todayIso();
  const rows: ReminderRow[] = [];
  for (const meeting of listMeetingNotes()) {
    for (const item of meeting.items) {
      if (item.status === "done") continue;
      if (
        scope === "overdue" &&
        itemTrack(item.status, item.dueDate, today) !== "overdue"
      ) {
        continue;
      }
      rows.push({ item, meeting });
    }
  }
  return rows;
}

export async function deliverMeetingReminders(
  rows: ReminderRow[],
): Promise<WaDelivery> {
  const people = listStaff(true).map((person) => ({
    id: person.id,
    name: person.name,
    phone: person.phone,
  }));
  const targets = groupReminderTargets(rows, people);
  const today = todayIso();
  const sent: WaDelivery["sent"] = [];
  const failed: WaDelivery["failed"] = [];
  const skipped: WaDelivery["skipped"] = [];

  for (const target of targets) {
    if (target.key === "none") {
      skipped.push({ name: target.name, reason: "Belum punya PIC" });
      continue;
    }
    if (!target.wa) {
      skipped.push({
        name: target.name,
        reason: "Nomor HP kosong di data karyawan",
      });
      continue;
    }
    const result = await sendGowaText(
      target.wa,
      meetingReminderText(target.name, target.items, today),
    );
    if (result.ok) sent.push({ name: target.name });
    else failed.push({ name: target.name, error: result.error || "Gagal mengirim" });
  }

  return { sent, failed, skipped };
}

export function deliverySummary(result: WaDelivery, empty = false): string {
  if (empty) return "Tidak ada bahasan yang perlu dikirim.";
  const parts = [
    result.sent.length
      ? `Terkirim ke ${result.sent.map((row) => row.name).join(", ")}.`
      : "",
    result.failed.length
      ? `Gagal: ${result.failed.map((row) => `${row.name}: ${row.error}`).join("; ")}.`
      : "",
    result.skipped.length
      ? `Dilewati: ${result.skipped.map((row) => `${row.name} (${row.reason})`).join("; ")}.`
      : "",
  ].filter(Boolean);
  const text = parts.join(" ") || "Tidak ada PIC yang dikirimi.";
  return text.length > 500 ? `${text.slice(0, 480).trim()}…` : text;
}
