import { NextResponse } from "next/server";
import { getServerLogs, insertServerLog } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const serverId = params.id;
    const logs = getServerLogs(serverId);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const serverId = params.id;
    const body = await request.json();

    if (!body.actionType) {
      return NextResponse.json({ error: "Jenis perubahan wajib diisi" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const log = {
      id: randomUUID(),
      serverId: serverId,
      actionType: body.actionType,
      description: body.description || "",
      logDate: body.logDate || now,
      createdByName: body.createdByName || "System",
      createdByStaffId: body.createdByStaffId || null,
      createdAt: now,
    };

    insertServerLog(log);
    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
