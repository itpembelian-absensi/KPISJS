import { NextResponse } from "next/server";
import { getServers, insertServer } from "@/lib/store";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const servers = getServers();
    return NextResponse.json(servers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: "Nama server wajib diisi" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const server = {
      id: randomUUID(),
      category: body.category || "Server",
      name: body.name,
      ipAddress: body.ipAddress || "",
      url: body.url || "",
      username: body.username || "",
      password: body.password || "",
      hardwareSpec: body.hardwareSpec || "",
      os: body.os || "",
      location: body.location || "",
      notes: body.notes || "",
      active: true,
      osCredentials: body.osCredentials || [],
      apps: body.apps || [],
      createdAt: now,
      updatedAt: now,
    };

    insertServer(server);
    return NextResponse.json(server, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
