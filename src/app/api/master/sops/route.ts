import { NextRequest, NextResponse } from "next/server";
import { canAccessSop, SESSION_COOKIE } from "@/lib/auth";
import { deleteSop, listSops, upsertSop } from "@/lib/sop-ops";
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
  return NextResponse.json({ sops: listSops(activeOnly) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireSop(req);
    if ("error" in gate && gate.error) return gate.error;

    const body = await req.json();
    const result = upsertSop({
      id: body.id ? String(body.id) : undefined,
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

export async function DELETE(req: NextRequest) {
  const gate = requireSop(req);
  if ("error" in gate && gate.error) return gate.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib" }, { status: 400 });
  }
  const result = deleteSop(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
