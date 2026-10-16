import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  canAccessDepartment,
  canUserSeeWaReport,
  canViewDepartmentKpi,
  getEffectiveDepartmentScope,
  isStaffDeptKpiLimited,
  SESSION_COOKIE,
} from "@/lib/auth";
import type { SessionUser } from "@/lib/types";
import { getUserBySessionToken } from "@/lib/store";
import {
  deleteKpiWaReport,
  getKpiWaReport,
  listKpiWaReports,
  upsertKpiWaReport,
} from "@/lib/wa-report-ops";
import {
  deleteWaReportPhotoFiles,
  saveWaReportPhotoFiles,
} from "@/lib/wa-report-photos";

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

function assertDeptAccess(user: SessionUser, departmentId: string) {
  if (user.role === "admin" || user.role === "it_staff") return null;
  if (user.departmentId && user.departmentId === departmentId) return null;
  if (!canAccessDepartment(user, departmentId)) {
    return NextResponse.json(
      { error: "Tidak punya akses ke departemen ini" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const gate = requireDeptKpi(req);
  if ("error" in gate && gate.error) return gate.error;

  let departmentId =
    req.nextUrl.searchParams.get("departmentId") || undefined;
  const activityId =
    req.nextUrl.searchParams.get("activityId") || undefined;

  const scope = getEffectiveDepartmentScope(gate.user);
  if (scope !== "all") {
    if (scope.length === 1) departmentId = scope[0];
    else if (departmentId && !scope.includes(departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (isStaffDeptKpiLimited(gate.user.role)) {
    departmentId = gate.user.departmentId || undefined;
  }

  return NextResponse.json({
    reports: listKpiWaReports(departmentId, activityId, gate.user),
  });
}

export async function POST(req: NextRequest) {
  try {
    const gate = requireDeptKpi(req);
    if ("error" in gate && gate.error) return gate.error;

    const contentType = req.headers.get("content-type") || "";

    // Multipart form data (upload with photos)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const id = String(form.get("id") || "").trim() || undefined;
      const departmentId =
        String(form.get("departmentId") || "").trim() ||
        gate.user.departmentId ||
        "";
      let title = String(form.get("title") || "").trim();
      let leaderName = String(form.get("leaderName") || "").trim();
      const reportDate = String(form.get("reportDate") || "").trim() || null;
      const notes = String(form.get("notes") || "").trim();
      const activityId = String(form.get("activityId") || "").trim() || null;
      const projectId = String(form.get("projectId") || "").trim() || null;

      if (!departmentId) {
        return NextResponse.json(
          { error: "Departemen wajib dipilih" },
          { status: 400 },
        );
      }

      if (!leaderName) {
        leaderName = "Adytirta Widjaja";
      }

      if (!title) {
        title = `Laporan WhatsApp ke ${leaderName}`;
      }

      const denied = assertDeptAccess(gate.user, departmentId);
      if (denied) return denied;

      // Extract photo files
      const files = form.getAll("photos").filter((f): f is File => {
        return (
          typeof f === "object" &&
          f !== null &&
          "arrayBuffer" in f &&
          typeof (f as File).arrayBuffer === "function" &&
          Number((f as File).size) > 0
        );
      });

      // Target ID
      const targetId = id || randomUUID();

      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        const saved = await saveWaReportPhotoFiles(targetId, files);
        if (saved.error) {
          deleteWaReportPhotoFiles(saved.urls);
          return NextResponse.json({ error: saved.error }, { status: 400 });
        }
        uploadedUrls = saved.urls;
      }

      // If updating, merge with existing photo urls
      let existing: ReturnType<typeof getKpiWaReport> = null;
      let finalPhotoUrls: string[] | undefined = undefined;
      if (id) {
        existing = getKpiWaReport(id);
        if (!existing) {
          deleteWaReportPhotoFiles(uploadedUrls);
          return NextResponse.json(
            { error: "Laporan WhatsApp tidak ditemukan" },
            { status: 404 },
          );
        }
        if (!canUserSeeWaReport(gate.user, existing)) {
          deleteWaReportPhotoFiles(uploadedUrls);
          return NextResponse.json(
            { error: "Tidak memiliki hak akses untuk mengubah laporan ini" },
            { status: 403 },
          );
        }
        finalPhotoUrls = [...existing.photoUrls, ...uploadedUrls];
      } else {
        finalPhotoUrls = uploadedUrls;
      }

      const formUsername = String(form.get("username") || "").trim();

      const result = upsertKpiWaReport({
        id: targetId,
        departmentId,
        userId: existing ? existing.userId : gate.user.id,
        userName: existing ? existing.userName : gate.user.name,
        username: existing ? (existing.username || formUsername || gate.user.username) : (formUsername || gate.user.username),
        activityId,
        projectId,
        title,
        leaderName,
        reportDate,
        notes,
        photoUrls: finalPhotoUrls,
      });

      if ("error" in result) {
        deleteWaReportPhotoFiles(uploadedUrls);
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ report: result });
    }

    // JSON body
    const body = await req.json();

    if (body.deleteId) {
      const existing = getKpiWaReport(String(body.deleteId));
      if (!existing) {
        return NextResponse.json(
          { error: "Laporan WhatsApp tidak ditemukan" },
          { status: 404 },
        );
      }
      const denied = assertDeptAccess(gate.user, existing.departmentId);
      if (denied) return denied;

      if (!canUserSeeWaReport(gate.user, existing)) {
        return NextResponse.json(
          { error: "Tidak memiliki hak akses untuk menghapus laporan ini" },
          { status: 403 },
        );
      }

      const result = deleteKpiWaReport(existing.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (!body.title || !body.departmentId || !body.leaderName) {
      return NextResponse.json(
        { error: "Departemen, perihal, dan nama pimpinan wajib diisi" },
        { status: 400 },
      );
    }

    const departmentId = String(body.departmentId);
    const denied = assertDeptAccess(gate.user, departmentId);
    if (denied) return denied;

    const existing = body.id ? getKpiWaReport(String(body.id)) : null;
    const bodyUsername = String(body.username || "").trim();

    const result = upsertKpiWaReport({
      id: body.id,
      departmentId,
      userId: existing ? existing.userId : gate.user.id,
      userName: existing ? existing.userName : gate.user.name,
      username: existing ? (existing.username || bodyUsername || gate.user.username) : (bodyUsername || gate.user.username),
      activityId: body.activityId || null,
      projectId: body.projectId || null,
      title: String(body.title),
      leaderName: String(body.leaderName),
      reportDate: body.reportDate || null,
      notes: String(body.notes || ""),
      status: body.status,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ report: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memproses laporan WhatsApp";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
