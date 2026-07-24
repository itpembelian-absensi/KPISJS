import { notFound } from "next/navigation";
import { KpiFunctionForm } from "@/components/master/KpiFunctionForm";
import { requireMasterAccess } from "@/lib/session";
import { getKpiFunction, listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditKpiFunctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ departmentId?: string }>;
}) {
  await requireMasterAccess();
  const { id } = await params;
  const query = await searchParams;
  const item = getKpiFunction(id);
  if (!item) notFound();

  const departments = listDepartments(true);
  const returnDepartmentId =
    query.departmentId === "all" ||
    (query.departmentId &&
      departments.some((d) => d.id === query.departmentId))
      ? query.departmentId
      : item.departmentId;

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
          Change fungsi KPI
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Ubah nama, bobot, fokus, atau status aktif fungsi ini.
        </p>
      </div>
      <KpiFunctionForm
        departments={departments}
        initial={item}
        returnDepartmentId={returnDepartmentId}
      />
    </div>
  );
}
