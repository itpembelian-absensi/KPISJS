import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDepartment,
  canViewDepartmentKpi,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  deleteWaReportPhotoFiles,
  MAX_WA_PHOTOS,
  saveWaReportPhotoFiles,
} from "@/lib/wa-report-photos";
import {
  appendWaReportPhotos,
  getKpiWaReport,
  removeWaReportPhoto,
} from "@/lib/wa-report-ops";
import { getUserBySessionToken } from "@/lib/store";

export const runtime = "nodejs";

function requireDeptKpi(req: NextRequest) {
  const user = getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!canViewDepartmentKpi(user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireDeptKpi(req);
    if ("error" in gate && gate.error) return gate.error;

    const form = await req.formData();
    const reportId = String(form.get("reportId") || "");
    const removeUrl = form.get("removeUrl");
    if (!reportId) {
      return NextResponse.json({ error: "reportId wajib" }, { status: 400 });
    }

    const existing = getKpiWaReport(reportId);
    if (!existing) {
      return NextResponse.json(
        { error: "Laporan WhatsApp tidak ditemukan" },
        { status: 404 },
      );
    }
    if (!canAccessDepartment(gate.user, existing.departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove photo
    if (typeof removeUrl === "string" && removeUrl) {
      const result = removeWaReportPhoto(reportId, removeUrl);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deleteWaReportPhotoFiles([removeUrl]);
      return NextResponse.json({ report: result });
    }

    // Add photos
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

    if (existing.photoUrls.length + files.length > MAX_WA_PHOTOS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_WA_PHOTOS} foto (sudah ${existing.photoUrls.length})`,
        },
        { status: 400 },
      );
    }

    const saved = await saveWaReportPhotoFiles(reportId, files);
    if (saved.error) {
      deleteWaReportPhotoFiles(saved.urls);
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const result = appendWaReportPhotos(reportId, saved.urls);
    if ("error" in result) {
      deleteWaReportPhotoFiles(saved.urls);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ report: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memproses foto laporan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
