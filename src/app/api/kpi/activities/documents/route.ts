import { NextRequest, NextResponse } from "next/server";
import {
  canViewDepartmentKpi,
  isStaffDeptKpiLimited,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  deleteActivityDocumentFiles,
  MAX_ACTIVITY_DOCS,
  saveActivityDocumentFiles,
} from "@/lib/activity-documents";
import {
  appendActivityDocuments,
  listKpiActivities,
  removeActivityDocument,
} from "@/lib/kpi-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireDeptKpi(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canViewDepartmentKpi(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireDeptKpi(req);
    if ("error" in gate && gate.error) return gate.error;

    const form = await req.formData();
    const activityId = String(form.get("activityId") || "");
    const removeUrl = form.get("removeUrl");
    if (!activityId) {
      return NextResponse.json({ error: "activityId wajib" }, { status: 400 });
    }

    const existing = listKpiActivities().find((a) => a.id === activityId);
    if (!existing) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan" },
        { status: 404 },
      );
    }
    if (
      isStaffDeptKpiLimited(gate.user.role) &&
      gate.user.departmentId !== existing.departmentId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof removeUrl === "string" && removeUrl) {
      const result = removeActivityDocument(activityId, removeUrl);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deleteActivityDocumentFiles([removeUrl]);
      return NextResponse.json({ activity: result });
    }

    const files = form.getAll("documents").filter((f): f is File => {
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
        { error: "Tidak ada dokumen yang diunggah" },
        { status: 400 },
      );
    }
    if (existing.documents.length + files.length > MAX_ACTIVITY_DOCS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_ACTIVITY_DOCS} dokumen (sudah ${existing.documents.length})`,
        },
        { status: 400 },
      );
    }

    const saved = await saveActivityDocumentFiles(activityId, files);
    if (saved.error) {
      deleteActivityDocumentFiles(saved.documents.map((d) => d.url));
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    const result = appendActivityDocuments(activityId, saved.documents);
    if ("error" in result) {
      deleteActivityDocumentFiles(saved.documents.map((d) => d.url));
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ activity: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunggah dokumen kegiatan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
