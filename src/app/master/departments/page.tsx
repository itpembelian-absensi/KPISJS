import { DepartmentMaster } from "@/components/master/DepartmentMaster";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requireMasterAccess();
  const departments = listDepartments();

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
          Master Departemen
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Kelola daftar departemen yang dipakai di tiket dan master staf.
        </p>
      </div>
      <DepartmentMaster initial={departments} />
    </div>
  );
}
