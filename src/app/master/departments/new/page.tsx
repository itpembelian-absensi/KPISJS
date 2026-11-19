import { DepartmentForm } from "@/components/master/DepartmentForm";
import { requireMasterAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewDepartmentPage() {
  await requireMasterAccess();

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
          Tambah departemen
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Departemen baru dipakai di tiket dan master staf.
        </p>
      </div>
      <DepartmentForm />
    </div>
  );
}
