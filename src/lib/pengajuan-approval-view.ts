import { canSeePengajuan } from "./auth";
import type {
  Pengajuan,
  PengajuanApprovalProgress,
  PengajuanApprovalStepView,
  PengajuanStatus,
  SessionUser,
  UserRole,
} from "./types";

export function fallbackApproval(input: {
  status: PengajuanStatus;
  reviewerName: string;
  reviewerNote: string;
  reviewedAt: string | null;
  completedBy?: string;
  completedAt?: string | null;
  completionNote?: string;
}): PengajuanApprovalProgress {
  const finished = input.status === "approved" || input.status === "done";
  const rejected = input.status === "rejected";
  const status = rejected ? "rejected" : finished ? "approved" : "pending";
  const actorName = input.reviewerName || (finished ? input.completedBy || "" : "");
  const note = input.reviewerNote || (finished ? input.completionNote || "" : "");
  const actedAt = input.reviewedAt || (finished ? input.completedAt || null : null);
  return {
    mode: "fallback",
    currentOrder: status === "pending" ? 1 : null,
    steps: [
      {
        id: "fallback",
        order: 1,
        label: "Persetujuan",
        status,
        actorUserId: "",
        actorName,
        note,
        actedAt,
        assignees: [],
      },
    ],
  };
}

export function chainApproval(
  steps: PengajuanApprovalStepView[],
  submissionStatus: PengajuanStatus,
): PengajuanApprovalProgress {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const pending = ordered.find((step) => step.status === "pending");
  return {
    mode: "chain",
    steps: ordered,
    currentOrder:
      submissionStatus === "submitted" && pending ? pending.order : null,
  };
}

export function currentApprovalStep(
  item: Pengajuan,
): PengajuanApprovalStepView | null {
  if (item.approval.currentOrder == null) return null;
  return (
    item.approval.steps.find(
      (step) =>
        step.order === item.approval.currentOrder && step.status === "pending",
    ) ?? null
  );
}

export function approvalActorNames(
  item: Pengajuan,
  step: PengajuanApprovalStepView,
): string {
  if (item.approval.mode === "fallback") return "Admin atau Manager";
  const names = step.assignees.map((person) => person.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

/** Nama user yang sudah menyetujui. Kosong bila belum ada persetujuan. */
export function approvedSignerNames(item: Pengajuan): string[] {
  const names = item.approval.steps
    .filter((step) => step.status === "approved" && step.actorName.trim())
    .map((step) => step.actorName.trim());
  if (names.length > 0) return names;
  if (
    (item.status === "approved" || item.status === "done") &&
    item.reviewerName.trim()
  ) {
    return [item.reviewerName.trim()];
  }
  return [];
}

/** Teks singkat untuk daftar: level yang sedang menunggu dan siapa yang boleh menyetujui. */
export function approvalWaitingText(item: Pengajuan): string | null {
  if (item.status !== "submitted") return null;
  const step = currentApprovalStep(item);
  if (!step) return null;
  return `Menunggu ${step.label} · ${approvalActorNames(item, step)}`;
}

/** Tingkat terakhir yang sudah disetujui dan masih bisa dibatalkan. */
export function unapproveTarget(
  item: Pengajuan,
): PengajuanApprovalStepView | null {
  if (
    item.status !== "submitted" &&
    item.status !== "approved" &&
    item.status !== "done"
  ) {
    return null;
  }
  const approved = item.approval.steps
    .filter((step) => step.status === "approved")
    .sort((a, b) => a.order - b.order);
  return approved.at(-1) ?? null;
}

export function canUnapprovePengajuan(
  viewer: { id: string; role: UserRole; staffId: string | null },
  item: Pengajuan,
): boolean {
  const step = unapproveTarget(item);
  if (!step) return false;
  const own = Boolean(
    viewer.staffId && item.requesterStaffId === viewer.staffId,
  );
  if (own && viewer.role !== "admin") return false;
  if (viewer.role === "admin") return true;
  if (item.approval.mode === "fallback") return viewer.role === "manager";
  if (step.actorUserId && step.actorUserId === viewer.id) return true;
  return step.assignees.some((person) => person.userId === viewer.id);
}

export function canActOnPengajuan(
  viewer: { id: string; role: UserRole; staffId: string | null },
  item: Pengajuan,
): boolean {
  if (item.status !== "submitted") return false;
  const own = Boolean(
    viewer.staffId && item.requesterStaffId === viewer.staffId,
  );
  if (own && viewer.role !== "admin") return false;
  if (item.approval.mode === "fallback") {
    return viewer.role === "admin" || viewer.role === "manager";
  }
  const step = currentApprovalStep(item);
  if (!step) return false;
  return step.assignees.some((person) => person.userId === viewer.id);
}

/** Visibility biasa, plus user yang masuk rantai approval pengajuan ini. */
export function canSeePengajuanItem(
  user: SessionUser,
  item: Pengajuan,
): boolean {
  if (canSeePengajuan(user, item)) return true;
  return item.approval.steps.some((step) =>
    step.assignees.some((person) => person.userId === user.id),
  );
}
