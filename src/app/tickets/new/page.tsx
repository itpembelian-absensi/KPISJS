import { CreateTicketForm } from "@/components/CreateTicketForm";
import { SlaTargetHint } from "@/components/SlaTargetHint";
import { canAssignTickets, canViewAllTickets } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listAgents, listDepartments, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const user = await requireUser();
  const agents = listAgents();
  const departments = listDepartments(true);
  const allStaff = listStaff(true);
  const canPickOthers = canViewAllTickets(user.role);
  const staffList = canPickOthers
    ? allStaff
    : allStaff.filter((s) => s.id === user.staffId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Request baru
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Buat Tiket Support
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Semua masalah user harus masuk tiket agar bisa diukur: waktu
          penyelesaian, SLA, handler, dan repeat issue.
        </p>
        <div className="mt-3">
          <SlaTargetHint />
        </div>
      </div>
      <CreateTicketForm
        agents={agents}
        departments={departments}
        staffList={staffList}
        defaultStaffId={user.staffId ?? staffList[0]?.id ?? ""}
        canAssign={canAssignTickets(user.role)}
        lockRequester={!canPickOthers}
      />
    </div>
  );
}
