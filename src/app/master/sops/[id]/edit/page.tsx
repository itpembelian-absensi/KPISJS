import { notFound, redirect } from "next/navigation";
import { SopForm } from "@/components/master/SopForm";
import { canManageSop, departmentsVisibleToUser } from "@/lib/auth";
import { requireSopAccess } from "@/lib/session";
import { getSop, userCanViewSop } from "@/lib/sop-ops";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditSopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSopAccess();
  const { id } = await params;
  const sop = getSop(id);
  if (!sop || !userCanViewSop(user, sop)) notFound();
  if (!canManageSop(user, sop.departmentId)) redirect("/master/sops");

  const departments = departmentsVisibleToUser(user, listDepartments(true));
  const defaultDepartmentId = sop.departmentId || departments[0]?.id || "";

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          SOP
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Edit SOP
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {sop.code} — cukup satu file untuk seluruh SOP departemen ini.
        </p>
      </div>
      <SopForm
        departments={departments}
        defaultDepartmentId={defaultDepartmentId}
        initial={sop}
      />
    </div>
  );
}
