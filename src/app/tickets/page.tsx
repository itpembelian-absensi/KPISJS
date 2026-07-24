import { TicketBoard } from "@/components/TicketBoard";
import { SlaTargetHint } from "@/components/SlaTargetHint";
import { canAssignTickets, canViewAllTickets } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listAgents, listTickets } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const user = await requireUser();
  const agents = listAgents();
  const ownOnly = !canViewAllTickets(user.role);
  const tickets = listTickets({
    status: "all",
    requesterStaffId: ownOnly ? user.staffId ?? undefined : undefined,
  });

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Queue management
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {ownOnly ? "Tiket Saya" : "Antrian Tiket Support"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Dipisah tab antrian, sedang dikerjakan, dan selesai — plus jadwal
          pengerjaan di tab yang sedang dikerjakan.
        </p>
        <div className="mt-3 max-w-2xl">
          <SlaTargetHint />
        </div>
      </div>

      <TicketBoard
        tickets={tickets}
        agents={agents}
        canDelete={canAssignTickets(user.role)}
        canSchedule={canAssignTickets(user.role)}
      />
    </div>
  );
}
