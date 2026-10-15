import { NextRequest, NextResponse } from "next/server";
import {
  listAssetCategories,
  upsertAssetCategory,
} from "@/lib/asset-category-ops";
import { canManageMaster, SESSION_COOKIE } from "@/lib/auth";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireMaster(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageMaster(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const gate = requireMaster(req);
  if ("error" in gate && gate.error) return gate.error;
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  return NextResponse.json({ categories: listAssetCategories(activeOnly) });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireMaster(req);
    if ("error" in gate && gate.error) return gate.error;
    const body = await req.json();
    const result = upsertAssetCategory({
      id: typeof body.id === "string" ? body.id : undefined,
      name: String(body.name || ""),
      sortOrder: body.sortOrder,
      active: body.active !== false,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ category: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan kategori";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
