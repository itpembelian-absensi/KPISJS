import { NextRequest, NextResponse } from "next/server";
import { createAccountByUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const role = body.role === "manager" ? "manager" : body.role === "staff" ? "staff" : "";
  if (!role) {
    return NextResponse.json(
      { error: "Jabatan hanya boleh Manager atau Staf" },
      { status: 400 },
    );
  }

  const password = String(body.password || "");
  const confirm = String(body.passwordConfirm || "");
  if (password !== confirm) {
    return NextResponse.json(
      { error: "Konfirmasi password tidak sama" },
      { status: 400 },
    );
  }

  const result = createAccountByUser({
    name: String(body.name || ""),
    username: String(body.username || ""),
    password,
    role,
    departmentId: String(body.departmentId || ""),
    position: String(body.position || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ user: result });
}
