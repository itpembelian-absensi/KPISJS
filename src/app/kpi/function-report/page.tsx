import { KpiFunctionReportClient } from "@/components/KpiFunctionReportClient";
import { canAccessMenu, getEffectiveDepartmentScope } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listDepartments, listKpiFunctions } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function KpiFunctionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string; print?: string; active?: string }>;
}) {
  const user = await requireUser();
  if (
    !canAccessMenu(user, "/kpi/function-report") &&
    !canAccessMenu(user, "/master/kpi-functions")
  ) {
    redirect("/");
  }
  const params = await searchParams;

  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  const deptIds = new Set(departments.map((d) => d.id));
  const functions = listKpiFunctions().filter(
    (f) => f.departmentId && deptIds.has(f.departmentId),
  );

  const requested = params.departmentId || "all";
  const defaultDepartmentId =
    requested !== "all" && departments.some((d) => d.id === requested)
      ? requested
      : departments.length === 1
        ? departments[0].id
        : "all";

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Laporan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Laporan Fungsi KPI
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Daftar fungsi &amp; bobot penilaian, dikelompokkan per departemen.
          Bisa dicetak atau diexport ke Excel dan PDF.
        </p>
      </div>

      <KpiFunctionReportClient
        departments={departments}
        functions={functions}
        defaultDepartmentId={defaultDepartmentId}
        initialActiveOnly={params.active === "1"}
        autoPrint={params.print === "1"}
      />
    </div>
  );
}
