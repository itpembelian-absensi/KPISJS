import { StaffForm } from "@/components/master/StaffForm";
import { listJabatan } from "@/lib/jabatan-ops";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  await requireMasterAccess();
  const departments = listDepartments(true);
  const jabatan = listJabatan(false, false);

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
          Tambah staf
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Jabatan dipilih dari Master Jabatan.
        </p>
      </div>
      <StaffForm departments={departments} jabatan={jabatan} />
    </div>
  );
}
