import { WorkOrderBoard } from "@/components/WorkOrderBoard";
import { canAssignWorkOrders, canManageWorkOrders } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listAgents, listKpiFunctions } from "@/lib/store";
import { listWorkOrders } from "@/lib/work-orders";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  const user = await requireUser();
  if (!canManageWorkOrders(user.role)) redirect("/");

  const workOrders = listWorkOrders();
  const functions = listKpiFunctions(true);
  const agents = listAgents();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Work order
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Antrian Tugas / Perintah Kerja
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Terima dan proses perintah untuk fungsi KPI non-support: project,
          inovasi, security & governance.
        </p>
      </div>

      <WorkOrderBoard
        workOrders={workOrders}
        functions={functions}
        agents={agents}
        canDelete={canAssignWorkOrders(user.role)}
      />
    </div>
  );
}
