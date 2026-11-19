import { notFound } from "next/navigation";
import { DepartmentForm } from "@/components/master/DepartmentForm";
import { requireMasterAccess } from "@/lib/session";
import { getDepartment } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMasterAccess();
  const { id } = await params;
  const department = getDepartment(id);
  if (!department) notFound();

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
          Edit departemen
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {department.code} — {department.name}
        </p>
      </div>
      <DepartmentForm initial={department} />
    </div>
  );
}
