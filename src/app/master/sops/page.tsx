import { SopMaster } from "@/components/master/SopMaster";
import {
  canManageSop,
  departmentsVisibleToUser,
} from "@/lib/auth";
import { requireSopAccess } from "@/lib/session";
import { listSopsForUser } from "@/lib/sop-ops";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MasterSopsPage() {
  const user = await requireSopAccess();
  const departments = departmentsVisibleToUser(user, listDepartments(true));
  const sops = listSopsForUser(user);
  const canManage = canManageSop(user);
  const defaultDepartmentId =
    user.departmentId && departments.some((d) => d.id === user.departmentId)
      ? user.departmentId
      : (departments[0]?.id ?? "");
  const scopeLabel =
    departments.length === 1
      ? departments[0].name
      : departments.length === 0
        ? "Departemen"
        : "Semua departemen";

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          {scopeLabel}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          SOP
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Prosedur kerja per departemen: header nomor dokumen, bagian A–D
          (Tujuan, Bahan, Kualifikasi, Prosedur), dan tabel disposisi. Baca di
          web atau unduh PDF/Word per dokumen / digabung.
        </p>
      </div>
      <SopMaster
        initial={sops}
        departments={departments}
        canManage={canManage}
        defaultDepartmentId={defaultDepartmentId}
      />
    </div>
  );
}
