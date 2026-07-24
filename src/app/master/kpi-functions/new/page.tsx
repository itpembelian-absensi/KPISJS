import { KpiFunctionForm } from "@/components/master/KpiFunctionForm";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewKpiFunctionPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string }>;
}) {
  await requireMasterAccess();
  const departments = listDepartments(true);
  const params = await searchParams;
  const defaultDepartmentId =
    params.departmentId &&
    departments.some((d) => d.id === params.departmentId)
      ? params.departmentId
      : departments[0]?.id;

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Master data
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Add fungsi KPI
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Tambah kerangka fungsi &amp; bobot untuk departemen yang dipilih.
        </p>
      </div>
      <KpiFunctionForm
        departments={departments}
        defaultDepartmentId={defaultDepartmentId}
        returnDepartmentId={defaultDepartmentId}
      />
    </div>
  );
}
