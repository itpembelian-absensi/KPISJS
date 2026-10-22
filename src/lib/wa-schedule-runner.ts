import {
  deliverMeetingReminders,
  deliverySummary,
  openReminderRows,
} from "./meeting-wa-send";
import {
  claimWaScheduleSlot,
  claimedScheduleDate,
  getWaSchedule,
  isScheduleDue,
  jakartaNow,
  recordWaScheduleRun,
} from "./wa-schedule";

declare global {
  // eslint-disable-next-line no-var
  var __waScheduleTimer: { unref?: () => void } | undefined;
  // eslint-disable-next-line no-var
  var __waScheduleBootTimer: { unref?: () => void } | undefined;
  // eslint-disable-next-line no-var
  var __waScheduleRunning: boolean | undefined;
}

export async function runWaScheduleIfDue(now = new Date()): Promise<void> {
  if (global.__waScheduleRunning) return;
  const config = getWaSchedule();
  if (!isScheduleDue(config, now, claimedScheduleDate())) return;
  const clock = jakartaNow(now);
  if (!claimWaScheduleSlot(clock.date)) return;

  global.__waScheduleRunning = true;
  try {
    const rows = openReminderRows(config.scope);
    const result =
      rows.length === 0
        ? { sent: [], failed: [], skipped: [] }
        : await deliverMeetingReminders(rows);
    recordWaScheduleRun({
      source: "schedule",
      summary: deliverySummary(result, rows.length === 0),
      sent: result.sent.length,
      failed: result.failed.length,
      skipped: result.skipped.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengiriman gagal.";
    recordWaScheduleRun({
      source: "schedule",
      summary: message,
      sent: 0,
      failed: 1,
      skipped: 0,
    });
  } finally {
    global.__waScheduleRunning = false;
  }
}

export function startWaScheduleRunner() {
  if (global.__waScheduleTimer) return;
  const tick = () => {
    void runWaScheduleIfDue().catch(() => {
      global.__waScheduleRunning = false;
    });
  };
  const boot = setTimeout(tick, 5000) as unknown as { unref?: () => void };
  const timer = setInterval(tick, 30_000) as unknown as { unref?: () => void };
  boot.unref?.();
  timer.unref?.();
  global.__waScheduleBootTimer = boot;
  global.__waScheduleTimer = timer;
}
