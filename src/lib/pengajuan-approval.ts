import { randomUUID } from "crypto";
import { getDb } from "./db";
import { chainApproval } from "./pengajuan-approval-view";
import type {
  ApprovalChainLevel,
  ApprovalChainUserOption,
  Pengajuan,
  PengajuanApprovalPerson,
  PengajuanApprovalStepStatus,
  PengajuanApprovalStepView,
  UserRole,
} from "./types";

const MAX_LEVELS = 10;

type ChainUserRow = {
  id: string;
  username: string;
  role: UserRole;
  active: number;
  name: string;
};

type StepRow = {
  id: string;
  submission_id: string;
  sort_order: number;
  label: string;
  status: PengajuanApprovalStepStatus;
  actor_user_id: string | null;
  actor_name: string;
  note: string;
  acted_at: string | null;
};

type AssigneeRow = {
  step_id: string;
  user_id: string;
  user_name: string;
};

class ApprovalDecisionError extends Error {}

function displayNameSql() {
  return `COALESCE(NULLIF(trim(s.name), ''), u.username)`;
}

export function listApprovalChainUsers(): ApprovalChainUserOption[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.username, u.role, u.active, ${displayNameSql()} AS name
       FROM users u
       LEFT JOIN staff s ON s.id = u.staff_id
       ORDER BY name COLLATE NOCASE, u.username COLLATE NOCASE`,
    )
    .all() as ChainUserRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    active: row.active === 1,
  }));
}

export function listApprovalChain(): ApprovalChainLevel[] {
  const db = getDb();
  const levels = db
    .prepare(
      `SELECT id, sort_order, label
       FROM pengajuan_approval_levels
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all() as Array<{ id: string; sort_order: number; label: string }>;
  const users = db
    .prepare(
      `SELECT level_id, user_id
       FROM pengajuan_approval_level_users
       ORDER BY created_at ASC`,
    )
    .all() as Array<{ level_id: string; user_id: string }>;
  const byLevel = new Map<string, string[]>();
  for (const row of users) {
    const list = byLevel.get(row.level_id) ?? [];
    list.push(row.user_id);
    byLevel.set(row.level_id, list);
  }
  return levels.map((level, index) => ({
    id: level.id,
    order: index + 1,
    label: level.label || `Level ${index + 1}`,
    userIds: byLevel.get(level.id) ?? [],
  }));
}

export function saveApprovalChain(
  input: Array<{ label: string; userIds: string[] }>,
): { error: string } | { levels: ApprovalChainLevel[] } {
  if (input.length > MAX_LEVELS) {
    return { error: `Maksimal ${MAX_LEVELS} tingkat approval` };
  }

  const users = listApprovalChainUsers();
  const byId = new Map(users.map((user) => [user.id, user]));
  const normalized: Array<{ label: string; userIds: string[] }> = [];

  for (let index = 0; index < input.length; index += 1) {
    const label = String(input[index]?.label || "").trim();
    if (label.length > 80) {
      return { error: "Nama tingkat terlalu panjang (maksimal 80 karakter)" };
    }
    const userIds = [
      ...new Set(
        (input[index]?.userIds || []).map((id) => String(id || "").trim()),
      ),
    ].filter(Boolean);
    if (userIds.length === 0) {
      return {
        error: `Tingkat ${index + 1} wajib punya minimal satu user`,
      };
    }
    for (const userId of userIds) {
      const user = byId.get(userId);
      if (!user) return { error: "Ada user yang tidak ditemukan" };
      if (!user.active) {
        return { error: `${user.name} tidak aktif dan tidak bisa ditugaskan` };
      }
    }
    normalized.push({
      label: label || `Level ${index + 1}`,
      userIds,
    });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const insertLevel = db.prepare(
    `INSERT INTO pengajuan_approval_levels (id, sort_order, label, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertUser = db.prepare(
    `INSERT INTO pengajuan_approval_level_users (id, level_id, user_id, created_at)
     VALUES (?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    db.exec(`DELETE FROM pengajuan_approval_level_users`);
    db.exec(`DELETE FROM pengajuan_approval_levels`);
    normalized.forEach((level, index) => {
      const levelId = randomUUID();
      insertLevel.run(levelId, index + 1, level.label, now, now);
      for (const userId of level.userIds) {
        insertUser.run(randomUUID(), levelId, userId, now);
      }
    });
  });
  tx();
  return { levels: listApprovalChain() };
}

function userName(userId: string): { name: string } | undefined {
  return getDb()
    .prepare(
      `SELECT ${displayNameSql()} AS name
       FROM users u
       LEFT JOIN staff s ON s.id = u.staff_id
       WHERE u.id = ? AND u.active = 1`,
    )
    .get(userId) as { name: string } | undefined;
}

/** Salin rantai yang sedang berlaku ke pengajuan baru. Kosong = fallback Admin/Manager. */
export function snapshotApprovalChain(submissionId: string) {
  const levels = listApprovalChain();
  if (levels.length === 0) return;

  const prepared = levels.map((level) => {
    const people: PengajuanApprovalPerson[] = [];
    for (const userId of level.userIds) {
      const row = userName(userId);
      if (row) people.push({ userId, name: row.name });
    }
    if (people.length === 0) {
      throw new Error(
        "Rantai approval tidak lengkap. Periksa pengaturan tingkat persetujuan.",
      );
    }
    return { level, people };
  });

  const db = getDb();
  const now = new Date().toISOString();
  const insertStep = db.prepare(
    `INSERT INTO submission_approval_steps (
      id, submission_id, sort_order, label, status, created_at
    ) VALUES (?, ?, ?, ?, 'pending', ?)`,
  );
  const insertAssignee = db.prepare(
    `INSERT INTO submission_approval_assignees (id, step_id, user_id, user_name)
     VALUES (?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const { level, people } of prepared) {
      const stepId = randomUUID();
      insertStep.run(
        stepId,
        submissionId,
        level.order,
        level.label || `Level ${level.order}`,
        now,
      );
      for (const person of people) {
        insertAssignee.run(randomUUID(), stepId, person.userId, person.name);
      }
    }
  });
  tx();
}

export function overlayApprovalChains(items: Pengajuan[]): Pengajuan[] {
  if (items.length === 0) return items;
  const db = getDb();
  const steps = db
    .prepare(
      `SELECT id, submission_id, sort_order, label, status,
              actor_user_id, actor_name, note, acted_at
       FROM submission_approval_steps`,
    )
    .all() as StepRow[];
  if (steps.length === 0) return items;

  const assignees = db
    .prepare(`SELECT step_id, user_id, user_name FROM submission_approval_assignees`)
    .all() as AssigneeRow[];
  const peopleByStep = new Map<string, PengajuanApprovalPerson[]>();
  for (const row of assignees) {
    const list = peopleByStep.get(row.step_id) ?? [];
    list.push({ userId: row.user_id, name: row.user_name });
    peopleByStep.set(row.step_id, list);
  }

  const stepsBySubmission = new Map<string, PengajuanApprovalStepView[]>();
  for (const row of steps) {
    const list = stepsBySubmission.get(row.submission_id) ?? [];
    list.push({
      id: row.id,
      order: row.sort_order,
      label: row.label || `Level ${row.sort_order}`,
      status: row.status,
      actorUserId: row.actor_user_id || "",
      actorName: row.actor_name,
      note: row.note,
      actedAt: row.acted_at,
      assignees: peopleByStep.get(row.id) ?? [],
    });
    stepsBySubmission.set(row.submission_id, list);
  }

  return items.map((item) => {
    const chain = stepsBySubmission.get(item.id);
    if (!chain || chain.length === 0) return item;
    return { ...item, approval: chainApproval(chain, item.status) };
  });
}

export function decidePengajuanApproval(input: {
  submissionId: string;
  action: "approve" | "reject";
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  actorStaffId: string | null;
  note: string;
}): { error: string } | { ok: true } {
  const db = getDb();
  const now = new Date().toISOString();
  const note = input.note.trim();

  const tx = db.transaction(() => {
    const submission = db
      .prepare(
        `SELECT status, requester_staff_id FROM submissions WHERE id = ?`,
      )
      .get(input.submissionId) as
      | { status: string; requester_staff_id: string | null }
      | undefined;
    if (!submission) throw new ApprovalDecisionError("Pengajuan tidak ditemukan");
    if (input.action !== "approve" && input.action !== "reject") {
      throw new ApprovalDecisionError("Aksi tidak valid");
    }
    if (submission.status !== "submitted") {
      throw new ApprovalDecisionError(
        "Pengajuan ini sudah tidak menunggu persetujuan",
      );
    }

    const own = Boolean(
      input.actorStaffId &&
        submission.requester_staff_id === input.actorStaffId,
    );
    if (own && input.actorRole !== "admin") {
      throw new ApprovalDecisionError(
        "Anda tidak dapat menyetujui pengajuan sendiri",
      );
    }

    const steps = db
      .prepare(
        `SELECT id, sort_order, status
         FROM submission_approval_steps
         WHERE submission_id = ?
         ORDER BY sort_order ASC`,
      )
      .all(input.submissionId) as Array<{
      id: string;
      sort_order: number;
      status: PengajuanApprovalStepStatus;
    }>;

    if (steps.length === 0) {
      if (input.actorRole !== "admin" && input.actorRole !== "manager") {
        throw new ApprovalDecisionError(
          "Anda tidak berhak menyetujui pengajuan ini",
        );
      }
      const status = input.action === "approve" ? "approved" : "rejected";
      const result = db
        .prepare(
          `UPDATE submissions
           SET status = ?, reviewer_name = ?, reviewer_note = ?, reviewed_at = ?, updated_at = ?
           WHERE id = ? AND status = 'submitted'`,
        )
        .run(status, input.actorName, note, now, now, input.submissionId);
      if (result.changes !== 1) {
        throw new ApprovalDecisionError("Status pengajuan sudah berubah");
      }
      return;
    }

    const current = steps.find((step) => step.status === "pending");
    if (!current) {
      throw new ApprovalDecisionError(
        "Pengajuan ini sudah tidak menunggu persetujuan",
      );
    }
    const blocked = steps.some(
      (step) => step.sort_order < current.sort_order && step.status !== "approved",
    );
    if (blocked) {
      throw new ApprovalDecisionError("Level sebelumnya belum disetujui");
    }

    const assignees = db
      .prepare(
        `SELECT user_id FROM submission_approval_assignees WHERE step_id = ?`,
      )
      .all(current.id) as Array<{ user_id: string }>;
    if (!assignees.some((row) => row.user_id === input.actorUserId)) {
      throw new ApprovalDecisionError("Level ini belum giliran Anda");
    }

    const stepStatus = input.action === "approve" ? "approved" : "rejected";
    const stepResult = db
      .prepare(
        `UPDATE submission_approval_steps
         SET status = ?, actor_user_id = ?, actor_name = ?, note = ?, acted_at = ?
         WHERE id = ? AND status = 'pending'`,
      )
      .run(
        stepStatus,
        input.actorUserId,
        input.actorName,
        note,
        now,
        current.id,
      );
    if (stepResult.changes !== 1) {
      throw new ApprovalDecisionError("Status pengajuan sudah berubah");
    }

    if (input.action === "reject") {
      const result = db
        .prepare(
          `UPDATE submissions
           SET status = 'rejected', reviewer_name = ?, reviewer_note = ?, reviewed_at = ?, updated_at = ?
           WHERE id = ? AND status = 'submitted'`,
        )
        .run(input.actorName, note, now, now, input.submissionId);
      if (result.changes !== 1) {
        throw new ApprovalDecisionError("Status pengajuan sudah berubah");
      }
      return;
    }

    const remaining = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM submission_approval_steps
         WHERE submission_id = ? AND status = 'pending'`,
      )
      .get(input.submissionId) as { total: number };
    if (remaining.total === 0) {
      const result = db
        .prepare(
          `UPDATE submissions
           SET status = 'approved', reviewer_name = ?, reviewer_note = ?, reviewed_at = ?, updated_at = ?
           WHERE id = ? AND status = 'submitted'`,
        )
        .run(input.actorName, note, now, now, input.submissionId);
      if (result.changes !== 1) {
        throw new ApprovalDecisionError("Status pengajuan sudah berubah");
      }
      return;
    }

    db.prepare(`UPDATE submissions SET updated_at = ? WHERE id = ?`).run(
      now,
      input.submissionId,
    );
  });

  try {
    tx();
  } catch (error) {
    if (error instanceof ApprovalDecisionError) return { error: error.message };
    throw error;
  }
  return { ok: true };
}

export function undoPengajuanApproval(input: {
  submissionId: string;
  actorUserId: string;
  actorRole: UserRole;
  actorStaffId: string | null;
}): { error: string } | { ok: true; reopened: boolean } {
  const db = getDb();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const submission = db
      .prepare(
        `SELECT status, requester_staff_id FROM submissions WHERE id = ?`,
      )
      .get(input.submissionId) as
      | { status: string; requester_staff_id: string | null }
      | undefined;
    if (!submission) throw new ApprovalDecisionError("Pengajuan tidak ditemukan");
    if (
      submission.status !== "submitted" &&
      submission.status !== "approved" &&
      submission.status !== "done"
    ) {
      throw new ApprovalDecisionError(
        "Persetujuan pada pengajuan ini tidak bisa dibatalkan",
      );
    }

    const own = Boolean(
      input.actorStaffId &&
        submission.requester_staff_id === input.actorStaffId,
    );
    if (own && input.actorRole !== "admin") {
      throw new ApprovalDecisionError(
        "Anda tidak dapat membatalkan persetujuan pengajuan sendiri",
      );
    }

    const steps = db
      .prepare(
        `SELECT id, sort_order, status, actor_user_id
         FROM submission_approval_steps
         WHERE submission_id = ?
         ORDER BY sort_order ASC`,
      )
      .all(input.submissionId) as Array<{
      id: string;
      sort_order: number;
      status: PengajuanApprovalStepStatus;
      actor_user_id: string | null;
    }>;

    const reopen = submission.status === "approved" || submission.status === "done";

    if (steps.length === 0) {
      if (input.actorRole !== "admin" && input.actorRole !== "manager") {
        throw new ApprovalDecisionError(
          "Anda tidak berhak membatalkan persetujuan ini",
        );
      }
      if (!reopen) {
        throw new ApprovalDecisionError("Belum ada persetujuan yang bisa dibatalkan");
      }
      const result = db
        .prepare(
          `UPDATE submissions
           SET status = 'submitted', reviewer_name = '', reviewer_note = '',
               reviewed_at = NULL, updated_at = ?
           WHERE id = ? AND status IN ('approved', 'done')`,
        )
        .run(now, input.submissionId);
      if (result.changes !== 1) {
        throw new ApprovalDecisionError("Status pengajuan sudah berubah");
      }
      return true;
    }

    const latest = [...steps]
      .reverse()
      .find((step) => step.status === "approved");
    if (!latest) {
      throw new ApprovalDecisionError("Belum ada persetujuan yang bisa dibatalkan");
    }

    if (input.actorRole !== "admin") {
      const assignees = db
        .prepare(
          `SELECT user_id FROM submission_approval_assignees WHERE step_id = ?`,
        )
        .all(latest.id) as Array<{ user_id: string }>;
      const allowed =
        latest.actor_user_id === input.actorUserId ||
        assignees.some((row) => row.user_id === input.actorUserId);
      if (!allowed) {
        throw new ApprovalDecisionError(
          "Anda tidak berhak membatalkan persetujuan ini",
        );
      }
    }

    const stepResult = db
      .prepare(
        `UPDATE submission_approval_steps
         SET status = 'pending', actor_user_id = NULL, actor_name = '',
             note = '', acted_at = NULL
         WHERE id = ? AND status = 'approved'`,
      )
      .run(latest.id);
    if (stepResult.changes !== 1) {
      throw new ApprovalDecisionError("Status pengajuan sudah berubah");
    }

    if (reopen) {
      const result = db
        .prepare(
          `UPDATE submissions
           SET status = 'submitted', reviewer_name = '', reviewer_note = '',
               reviewed_at = NULL, updated_at = ?
           WHERE id = ? AND status IN ('approved', 'done')`,
        )
        .run(now, input.submissionId);
      if (result.changes !== 1) {
        throw new ApprovalDecisionError("Status pengajuan sudah berubah");
      }
      return true;
    }

    db.prepare(`UPDATE submissions SET updated_at = ? WHERE id = ?`).run(
      now,
      input.submissionId,
    );
    return false;
  });

  try {
    const reopened = tx();
    return { ok: true, reopened };
  } catch (error) {
    if (error instanceof ApprovalDecisionError) return { error: error.message };
    throw error;
  }
}
