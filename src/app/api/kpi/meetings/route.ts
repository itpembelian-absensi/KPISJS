import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDepartment,
  canAccessMenu,
  getEffectiveDepartmentScope,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  deleteMeetingNote,
  getMeetingNote,
  listMeetingNotes,
  meetingAccessByItem,
  meetingMatchesScope,
  saveMeetingNote,
  updateMeetingItemStatus,
} from "@/lib/meeting-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function authorize(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!canAccessMenu(user, "/kpi/meetings")) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, response: null };
}

export async function GET(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  const scope = getEffectiveDepartmentScope(user);
  const meetings = listMeetingNotes(scope === "all" ? undefined : scope);
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (body.action === "status") {
    const itemId = String(body.itemId || "");
    const access = meetingAccessByItem(itemId);
    if (!access) {
      return NextResponse.json({ error: "Bahasan tidak ditemukan" }, { status: 404 });
    }
    const scope = getEffectiveDepartmentScope(user);
    if (scope !== "all" && !meetingMatchesScope(access.departmentIds, scope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = updateMeetingItemStatus(itemId, String(body.status || ""));
    if (result.error || !result.meeting) {
      return NextResponse.json(
        { error: result.error || "Gagal mengubah status" },
        { status: 400 },
      );
    }
    return NextResponse.json({ meeting: result.meeting });
  }

  const rawIds = Array.isArray(body.departmentIds)
    ? body.departmentIds.map((id: unknown) => String(id))
    : body.departmentId
      ? [String(body.departmentId)]
      : [];
  const departmentIds: string[] = Array.from(
    new Set(rawIds.map((id: string) => id.trim()).filter(Boolean)),
  );
  const scope = getEffectiveDepartmentScope(user);
  const current = body.id ? getMeetingNote(String(body.id)) : null;
  if (body.id && !current) {
    return NextResponse.json({ error: "Notulen tidak ditemukan" }, { status: 404 });
  }
  if (
    current &&
    scope !== "all" &&
    !meetingMatchesScope(current.departmentIds, scope)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (departmentIds.includes("*")) {
    const alreadyAll = current?.departmentIds.includes("*") ?? false;
    if (scope !== "all" && !alreadyAll) {
      return NextResponse.json(
        { error: "Semua departemen hanya bisa dipilih akun dengan akses seluruh departemen" },
        { status: 403 },
      );
    }
  } else if (
    scope !== "all" &&
    departmentIds.some((id) => !canAccessDepartment(user, id))
  ) {
    return NextResponse.json({ error: "Departemen di luar akses Anda" }, { status: 403 });
  }

  const result = saveMeetingNote(
    {
      id: body.id ? String(body.id) : undefined,
      departmentIds,
      title: String(body.title || ""),
      meetingDate: String(body.meetingDate || ""),
      meetingTime: String(body.meetingTime || ""),
      attendeeStaffIds: Array.isArray(body.attendeeStaffIds)
        ? body.attendeeStaffIds.map((id: unknown) => String(id))
        : [],
      externalAttendees: String(body.externalAttendees || ""),
      summary: String(body.summary || ""),
      items: Array.isArray(body.items) ? body.items : [],
    },
    { id: user.id, name: user.name },
  );
  if (result.error || !result.meeting) {
    return NextResponse.json(
      { error: result.error || "Gagal menyimpan" },
      { status: 400 },
    );
  }
  return NextResponse.json({ meeting: result.meeting });
}

export async function DELETE(req: NextRequest) {
  const { user, response } = authorize(req);
  if (!user) return response;
  const id = req.nextUrl.searchParams.get("id") || "";
  const current = getMeetingNote(id);
  if (!current) {
    return NextResponse.json({ error: "Notulen tidak ditemukan" }, { status: 404 });
  }
  const scope = getEffectiveDepartmentScope(user);
  if (scope !== "all" && !meetingMatchesScope(current.departmentIds, scope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = deleteMeetingNote(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
