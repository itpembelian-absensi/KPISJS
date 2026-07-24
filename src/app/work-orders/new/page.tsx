import { CreateWorkOrderForm } from "@/components/CreateWorkOrderForm";
import { canManageWorkOrders } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  listAgents,
  listDepartments,
  listKpiFunctions,
} from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  const user = await requireUser();
  if (!canManageWorkOrders(user.role)) redirect("/");

  const departments = listDepartments(true);
  const functions = listKpiFunctions(true);
  const agents = listAgents();

  const defaultDepartmentId =
    user.role === "admin" || user.role === "it_staff"
      ? departments.find((d) => d.code === "IT")?.id || departments[0]?.id || ""
      : user.departmentId || departments[0]?.id || "";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Beri perintah
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Buat Perintah Kerja
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Pilih departemen dulu, lalu fungsi KPI-nya. Masalah support harian
          tetap lewat tiket.
        </p>
      </div>

      <CreateWorkOrderForm
        departments={departments}
        functions={functions}
        agents={agents}
        defaultDepartmentId={defaultDepartmentId}
        defaultRequesterName={user.name}
        defaultRequesterStaffId={user.staffId}
      />
    </div>
  );
}
