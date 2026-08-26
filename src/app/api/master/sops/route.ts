import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, canManageSop, SESSION_COOKIE } from "@/lib/auth";
import { deleteSop, getSop, listSopsForUser, setSopActive, upsertSop } from "@/lib/sop-ops";
import { getUserBySessionToken } from "@/lib/store";
import type {
  SopAttachment,
  SopDisposition,
  SopStep,
} from "@/lib/types";

export const runtime = "nodejs";

function requireSop(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canAccessSop(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireSop(req);
  if ("error" in gate && gate.error) return gate.error;
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const departmentId = req.nextUrl.searchParams.get("departmentId") || undefined;
  return NextResponse.json({
    sops: listSopsForUser(gate.user, { activeOnly, departmentId }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireSop(req);
    if ("error" in gate && gate.error) return gate.error;

    const body = await req.json();
    const departmentId = String(body.departmentId || "");
    if (!canManageSop(gate.user, departmentId || undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.id) {
      const existing = getSop(String(body.id));
      if (!existing) {
        return NextResponse.json({ error: "SOP tidak ditemukan" }, { status: 404 });
      }
      if (!canManageSop(gate.user, existing.departmentId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = upsertSop({
      id: body.id ? String(body.id) : undefined,
      departmentId,
      code: body.code != null ? String(body.code) : undefined,
      title: String(body.title || ""),
      divisionLabel: body.divisionLabel != null ? String(body.divisionLabel) : undefined,
      documentType: body.documentType != null ? String(body.documentType) : undefined,
      effectiveDate:
        body.effectiveDate != null ? String(body.effectiveDate) : undefined,
      revision: body.revision != null ? String(body.revision) : undefined,
      revisionDate:
        body.revisionDate != null ? String(body.revisionDate) : undefined,
      purpose: body.purpose != null ? String(body.purpose) : undefined,
      materials: body.materials != null ? String(body.materials) : undefined,
      qualifications:
        body.qualifications != null ? String(body.qualifications) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      steps: Array.isArray(body.steps) ? (body.steps as SopStep[]) : [],
      dispositions: Array.isArray(body.dispositions)
        ? (body.dispositions as SopDisposition[])
        : undefined,
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as SopAttachment[])
        : [],
      active: body.active ?? true,
      createdBy: gate.user.id,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ sop: result });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan SOP" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const gate = requireSop(req);
    if ("error" in gate && gate.error) return gate.error;

    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id wajib" }, { status: 400 });
    }
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active wajib" }, { status: 400 });
    }
    const existing = getSop(id);
    if (!existing) {
      return NextResponse.json({ error: "SOP tidak ditemukan" }, { status: 404 });
    }
    if (!canManageSop(gate.user, existing.departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = setSopActive(id, body.active);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ sop: result });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah status SOP" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const gate = requireSop(req);
  if ("error" in gate && gate.error) return gate.error;

  const ids = new Set<string>();
  const single = req.nextUrl.searchParams.get("id")?.trim();
  if (single) ids.add(single);
  const many = req.nextUrl.searchParams.get("ids");
  if (many) {
    for (const part of many.split(",")) {
      const t = part.trim();
      if (t) ids.add(t);
    }
  }
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | { id?: unknown; ids?: unknown }
      | null;
    if (body?.id != null && String(body.id).trim()) {
      ids.add(String(body.id).trim());
    }
    if (Array.isArray(body?.ids)) {
      for (const raw of body.ids) {
        const t = String(raw || "").trim();
        if (t) ids.add(t);
      }
    }
  }

  if (ids.size === 0) {
    return NextResponse.json({ error: "id wajib" }, { status: 400 });
  }

  const deleted: string[] = [];
  const errors: string[] = [];
  for (const id of ids) {
    const existing = getSop(id);
    if (!existing) {
      errors.push(`${id}: SOP tidak ditemukan`);
      continue;
    }
    if (!canManageSop(gate.user, existing.departmentId)) {
      errors.push(`${existing.code}: tidak diizinkan`);
      continue;
    }
    const result = deleteSop(id);
    if ("error" in result) {
      errors.push(`${existing.code}: ${result.error}`);
      continue;
    }
    deleted.push(id);
  }

  if (deleted.length === 0) {
    const status = errors.some((e) => e.includes("tidak diizinkan"))
      ? 403
      : 400;
    return NextResponse.json(
      { error: errors[0] || "Gagal menghapus SOP", errors },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: deleted.length,
    ids: deleted,
    errors: errors.length ? errors : undefined,
  });
}
