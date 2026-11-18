import { StaffMaster } from "@/components/master/StaffMaster";
import { listJabatan } from "@/lib/jabatan-ops";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ jabatan?: string }>;
}) {
  await requireMasterAccess();
  const params = await searchParams;
  const staff = listStaff();
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
          Master Staf
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Data karyawan & manager. Jabatan dipilih dari Master Jabatan.
        </p>
      </div>
      <StaffMaster
        initial={staff}
        departments={departments}
        jabatan={jabatan}
        initialJabatanId={params.jabatan || "all"}
      />
    </div>
  );
}
