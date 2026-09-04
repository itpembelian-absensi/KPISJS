import { NextResponse } from "next/server";
import { getServerById, updateServer, deleteServer } from "@/lib/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const server = getServerById(id);
    if (!server) {
      return NextResponse.json({ error: "Server tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(server);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const existing = getServerById(id);
    if (!existing) {
      return NextResponse.json({ error: "Server tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const updated = {
      ...existing,
      category: body.category ?? existing.category,
      name: body.name ?? existing.name,
      ipAddress: body.ipAddress ?? existing.ipAddress,
      url: body.url ?? existing.url,
      username: body.username ?? existing.username,
      password: body.password ?? existing.password,
      hardwareSpec: body.hardwareSpec ?? existing.hardwareSpec,
      os: body.os ?? existing.os,
      location: body.location ?? existing.location,
      notes: body.notes ?? existing.notes,
      active: body.active ?? existing.active,
      osCredentials: body.osCredentials ?? existing.osCredentials,
      apps: body.apps ?? existing.apps,
      updatedAt: new Date().toISOString(),
    };

    updateServer(updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const existing = getServerById(id);
    if (!existing) {
      return NextResponse.json({ error: "Server tidak ditemukan" }, { status: 404 });
    }
    deleteServer(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
