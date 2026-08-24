import { StaffMaster } from "@/components/master/StaffMaster";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireMasterAccess();
  const staff = listStaff();
  const departments = listDepartments(true);

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
          Master Staf
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Data karyawan & manager. Dipakai untuk login user dan pemohon tiket.
        </p>
      </div>
      <StaffMaster initial={staff} departments={departments} />
    </div>
  );
}
