import { redirect } from "next/navigation";
import { SopForm } from "@/components/master/SopForm";
import { canManageSop, departmentsVisibleToUser } from "@/lib/auth";
import { requireSopAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewSopPage() {
  const user = await requireSopAccess();
  if (!canManageSop(user)) redirect("/master/sops");
  const departments = departmentsVisibleToUser(user, listDepartments(true));
  const defaultDepartmentId =
    user.departmentId && departments.some((d) => d.id === user.departmentId)
      ? user.departmentId
      : (departments[0]?.id ?? "");

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
          Tambah SOP
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Satu SOP per departemen: judul, nomor, dan satu file. Setelah simpan,
          SOP muncul di daftar.
        </p>
      </div>
      <SopForm
        departments={departments}
        defaultDepartmentId={defaultDepartmentId}
      />
    </div>
  );
}
