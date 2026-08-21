import { NextRequest, NextResponse } from "next/server";
import { canAccessTicket, canAssignTickets, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteTicketPhotoFiles,
  MAX_TICKET_PHOTOS,
  parseTicketPhotoKind,
  saveTicketPhotoFiles,
  type TicketPhotoKind,
} from "@/lib/ticket-photos";
import {
  appendTicketPhotos,
  getTicket,
  getUserBySessionToken,
  removeTicketPhoto,
} from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const ticketId = String(form.get("ticketId") || "");
    const removeUrl = form.get("removeUrl");
    const kind: TicketPhotoKind = parseTicketPhotoKind(form.get("kind"));
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId wajib" }, { status: 400 });
    }

    const existing = getTicket(ticketId);
    if (!existing) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan" },
        { status: 404 },
      );
    }
    if (
      !canAccessTicket(user.role, user.staffId, existing.requesterStaffId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Foto pekerjaan hanya IT / admin yang boleh unggah & hapus
    if (kind === "work" && !canAssignTickets(user.role)) {
      return NextResponse.json(
        { error: "Hanya IT yang boleh kelola foto pekerjaan" },
        { status: 403 },
      );
    }

    if (typeof removeUrl === "string" && removeUrl) {
      const result = removeTicketPhoto(ticketId, removeUrl, kind);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deleteTicketPhotoFiles([removeUrl]);
      return NextResponse.json({ ticket: result });
    }

    const files = form.getAll("photos").filter((f): f is File => {
      return (
        typeof f === "object" &&
        f !== null &&
        "arrayBuffer" in f &&
        typeof (f as File).arrayBuffer === "function" &&
        Number((f as File).size) > 0
      );
    });
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada foto yang diunggah" },
        { status: 400 },
      );
    }

    const current =
      kind === "work" ? existing.workPhotoUrls : existing.photoUrls;
    if (current.length + files.length > MAX_TICKET_PHOTOS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_TICKET_PHOTOS} foto ${kind === "work" ? "pekerjaan" : "laporan"} (sudah ${current.length})`,
        },
        { status: 400 },
      );
    }

    const saved = await saveTicketPhotoFiles(ticketId, files, kind);
    if (saved.error) {
      deleteTicketPhotoFiles(saved.urls);
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    const result = appendTicketPhotos(ticketId, saved.urls, kind);
    if ("error" in result) {
      deleteTicketPhotoFiles(saved.urls);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ticket: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunggah foto tiket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
