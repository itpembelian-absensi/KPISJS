import { notFound, redirect } from "next/navigation";
import { WorkOrderDetailClient } from "@/components/WorkOrderDetailClient";
import { canAssignWorkOrders, canManageWorkOrders } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listAgents, listKpiFunctions } from "@/lib/store";
import { getWorkOrder } from "@/lib/work-orders";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canManageWorkOrders(user.role)) redirect("/");

  const { id } = await params;
  const workOrder = getWorkOrder(id);
  if (!workOrder) notFound();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Detail tugas
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Proses perintah kerja
        </h1>
      </div>

      <WorkOrderDetailClient
        workOrder={workOrder}
        functions={listKpiFunctions()}
        agents={listAgents()}
        canAssign={canAssignWorkOrders(user.role)}
        actorName={user.name}
      />
    </div>
  );
}
