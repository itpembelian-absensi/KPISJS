import { randomUUID } from "crypto";
import { boolToInt, getDb, intToBool } from "./db";
import { deleteSopUploadFolder } from "./sop-files";
import type {
  SopAttachment,
  SopDisposition,
  SopDocument,
  SopStep,
} from "./types";
import { DEFAULT_SOP_DISPOSITIONS } from "./types";

type SopRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  version: string;
  steps_json: string;
  attachments_json: string;
  active: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  division_label?: string;
  document_type?: string;
  effective_date?: string;
  revision?: string;
  revision_date?: string;
  purpose?: string;
  materials?: string;
  qualifications?: string;
  notes?: string;
  dispositions_json?: string;
};

function parseSteps(raw: string | null | undefined): SopStep[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SopStep[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s, i) => ({
        order: Number(s.order ?? i + 1),
        title: String(s.title || "").trim(),
        body: String(s.body || "").trim(),
      }))
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

function normalizeAttachment(a: Partial<SopAttachment>): SopAttachment | null {
  const url = String(a.url || "").trim();
  if (!url) return null;
  const originalName = a.originalName
    ? String(a.originalName).trim()
    : undefined;
  const mimeType = a.mimeType ? String(a.mimeType).trim() : undefined;
  const kind: "link" | "file" =
    a.kind === "file" || url.startsWith("/uploads/sops/") ? "file" : "link";
  const label =
    String(a.label || "").trim() ||
    originalName ||
    (kind === "file" ? url.split("/").pop() || url : url);
  if (kind === "link" && !String(a.label || "").trim()) {
    // Link manual tetap butuh label; fallback ke URL
  }
  return {
    label,
    url,
    ...(originalName ? { originalName } : {}),
    ...(mimeType ? { mimeType } : {}),
    kind,
  };
}

function parseAttachments(raw: string | null | undefined): SopAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SopAttachment[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((a) => normalizeAttachment(a))
      .filter((a): a is SopAttachment => Boolean(a));
  } catch {
    return [];
  }
}

function parseDispositions(raw: string | null | undefined): SopDisposition[] {
  if (!raw) return [...DEFAULT_SOP_DISPOSITIONS];
  try {
    const parsed = JSON.parse(raw) as SopDisposition[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_SOP_DISPOSITIONS];
    }
    return parsed.map((d) => ({
      role: String(d.role || "").trim(),
      name: String(d.name || "").trim(),
      position: String(d.position || "").trim(),
    }));
  } catch {
    return [...DEFAULT_SOP_DISPOSITIONS];
  }
}

function mapSop(row: SopRow): SopDocument {
  const purpose =
    (row.purpose || "").trim() || (row.description || "").trim() || "";
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    divisionLabel: row.division_label || "DIVISI IT",
    documentType: row.document_type || "STANDARD OPERATING PROCEDURE",
    effectiveDate: row.effective_date || "",
    revision: row.revision || row.version || "-",
    revisionDate: row.revision_date || "",
    purpose,
    materials: row.materials || "",
    qualifications: row.qualifications || "",
    steps: parseSteps(row.steps_json),
    notes: row.notes || "",
    dispositions: parseDispositions(row.dispositions_json),
    attachments: parseAttachments(row.attachments_json),
    active: intToBool(row.active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSops(activeOnly = false): SopDocument[] {
  let sql = "SELECT * FROM sops";
  if (activeOnly) sql += " WHERE active = 1";
  sql += " ORDER BY title COLLATE NOCASE";
  return (getDb().prepare(sql).all() as SopRow[]).map(mapSop);
}

export function getSop(id: string): SopDocument | null {
  const row = getDb()
    .prepare("SELECT * FROM sops WHERE id = ?")
    .get(id) as SopRow | undefined;
  return row ? mapSop(row) : null;
}

export function getSopsByIds(ids: string[]): SopDocument[] {
  if (ids.length === 0) return [];
  const byId = new Map(listSops().map((s) => [s.id, s]));
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is SopDocument => Boolean(s));
}

function nextSopCode(): string {
  const year = new Date().getFullYear();
  const prefix = `IT-SOP/${year}/`;
  const rows = getDb()
    .prepare("SELECT code FROM sops WHERE code LIKE ?")
    .all(`${prefix}%`) as Array<{ code: string }>;
  let max = 0;
  for (const r of rows) {
    const n = Number(r.code.slice(prefix.length));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function upsertSop(input: {
  id?: string;
  code?: string;
  title: string;
  divisionLabel?: string;
  documentType?: string;
  effectiveDate?: string;
  revision?: string;
  revisionDate?: string;
  purpose?: string;
  materials?: string;
  qualifications?: string;
  notes?: string;
  steps?: SopStep[];
  dispositions?: SopDisposition[];
  attachments?: SopAttachment[];
  active?: boolean;
  createdBy?: string | null;
}): SopDocument | { error: string } {
  const title = String(input.title || "").trim();
  if (!title) return { error: "Judul SOP wajib diisi" };

  const steps = (input.steps ?? [])
    .map((s, i) => ({
      order: Number(s.order ?? i + 1),
      title: String(s.title || "").trim(),
      body: String(s.body || "").trim(),
    }))
    .filter((s) => s.title || s.body)
    .map((s, i) => ({ ...s, order: i + 1 }));

  const attachments = (input.attachments ?? [])
    .map((a) => normalizeAttachment(a))
    .filter((a): a is SopAttachment => Boolean(a))
    .filter((a) => a.kind === "file" || (Boolean(a.label) && Boolean(a.url)));

  const dispositions = (input.dispositions ?? DEFAULT_SOP_DISPOSITIONS).map(
    (d) => ({
      role: String(d.role || "").trim(),
      name: String(d.name || "").trim(),
      position: String(d.position || "").trim(),
    }),
  );

  const now = new Date().toISOString();
  const db = getDb();
  const purpose = String(input.purpose ?? "");
  const notes = String(input.notes ?? "");
  const revision = String(input.revision ?? "-") || "-";

  if (input.id) {
    const existing = getSop(input.id);
    if (!existing) return { error: "SOP tidak ditemukan" };

    const code = String(input.code || existing.code).trim();
    if (!code) return { error: "Nomor dokumen wajib diisi" };

    const clash = db
      .prepare("SELECT id FROM sops WHERE lower(code) = lower(?) AND id != ?")
      .get(code, input.id) as { id: string } | undefined;
    if (clash) return { error: `Nomor "${code}" sudah dipakai` };

    db.prepare(
      `UPDATE sops SET
        code = ?, title = ?, description = ?, version = ?,
        steps_json = ?, attachments_json = ?, active = ?, updated_at = ?,
        division_label = ?, document_type = ?, effective_date = ?,
        revision = ?, revision_date = ?, purpose = ?, materials = ?,
        qualifications = ?, notes = ?, dispositions_json = ?
      WHERE id = ?`,
    ).run(
      code,
      title,
      purpose,
      revision,
      JSON.stringify(steps),
      JSON.stringify(attachments),
      boolToInt(input.active ?? existing.active),
      now,
      String(input.divisionLabel ?? existing.divisionLabel),
      String(input.documentType ?? existing.documentType),
      String(input.effectiveDate ?? existing.effectiveDate),
      revision,
      String(input.revisionDate ?? existing.revisionDate),
      purpose,
      String(input.materials ?? existing.materials),
      String(input.qualifications ?? existing.qualifications),
      String(input.notes ?? existing.notes),
      JSON.stringify(dispositions),
      input.id,
    );
    return getSop(input.id)!;
  }

  const code = String(input.code || "").trim() || nextSopCode();
  const clash = db
    .prepare("SELECT id FROM sops WHERE lower(code) = lower(?)")
    .get(code) as { id: string } | undefined;
  if (clash) return { error: `Nomor "${code}" sudah dipakai` };

  const id = randomUUID();
  db.prepare(
    `INSERT INTO sops (
      id, code, title, description, version,
      steps_json, attachments_json, active, created_by, created_at, updated_at,
      division_label, document_type, effective_date, revision, revision_date,
      purpose, materials, qualifications, notes, dispositions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    code,
    title,
    purpose,
    revision,
    JSON.stringify(steps),
    JSON.stringify(attachments),
    boolToInt(input.active ?? true),
    input.createdBy ?? null,
    now,
    now,
    String(input.divisionLabel || "DIVISI IT"),
    String(input.documentType || "STANDARD OPERATING PROCEDURE"),
    String(input.effectiveDate || ""),
    revision,
    String(input.revisionDate || ""),
    purpose,
    String(input.materials || ""),
    String(input.qualifications || ""),
    notes,
    JSON.stringify(dispositions),
  );
  return getSop(id)!;
}

export function appendSopAttachments(
  sopId: string,
  attachments: SopAttachment[],
  maxTotal = 10,
): SopDocument | { error: string } {
  const existing = getSop(sopId);
  if (!existing) return { error: "SOP tidak ditemukan" };
  const current = existing.attachments;
  if (current.length + attachments.length > maxTotal) {
    return {
      error: `Maksimal ${maxTotal} lampiran (sudah ${current.length})`,
    };
  }
  const next = [...current, ...attachments];
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sops SET attachments_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, sopId);
  return getSop(sopId)!;
}

export function removeSopAttachment(
  sopId: string,
  url: string,
): SopDocument | { error: string } {
  const existing = getSop(sopId);
  if (!existing) return { error: "SOP tidak ditemukan" };
  const next = existing.attachments.filter((a) => a.url !== url);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sops SET attachments_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, sopId);
  return getSop(sopId)!;
}

/** Ganti satu lampiran file (hapus URL lama, sisipkan lampiran baru) */
export function replaceSopAttachment(
  sopId: string,
  oldUrl: string,
  replacement: SopAttachment[],
  maxTotal = 10,
): SopDocument | { error: string } {
  const existing = getSop(sopId);
  if (!existing) return { error: "SOP tidak ditemukan" };
  if (!oldUrl) return { error: "URL file lama wajib" };
  if (replacement.length === 0) return { error: "File pengganti wajib" };

  const withoutOld = existing.attachments.filter((a) => a.url !== oldUrl);
  if (withoutOld.length + replacement.length > maxTotal) {
    return {
      error: `Maksimal ${maxTotal} lampiran`,
    };
  }
  const next = [...withoutOld, ...replacement];
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sops SET attachments_json = ?, updated_at = ? WHERE id = ?`,
    )
    .run(JSON.stringify(next), now, sopId);
  return getSop(sopId)!;
}

export function deleteSop(id: string): { ok: true } | { error: string } {
  const existing = getSop(id);
  if (!existing) return { error: "SOP tidak ditemukan" };
  getDb().prepare("DELETE FROM sops WHERE id = ?").run(id);
  deleteSopUploadFolder(id);
  return { ok: true };
}
