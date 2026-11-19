import { notFound } from "next/navigation";
import { StaffForm } from "@/components/master/StaffForm";
import { listJabatan } from "@/lib/jabatan-ops";
import { requireMasterAccess } from "@/lib/session";
import { getStaff, listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMasterAccess();
  const { id } = await params;
  const staff = getStaff(id);
  if (!staff) notFound();

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
          Edit staf
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {staff.employeeCode} — {staff.name}
        </p>
      </div>
      <StaffForm
        departments={departments}
        jabatan={jabatan}
        initial={staff}
      />
    </div>
  );
}
