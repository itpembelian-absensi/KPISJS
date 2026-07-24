import { notFound, redirect } from "next/navigation";
import { TicketDetailClient } from "@/components/TicketDetailClient";
import { canAccessTicket, canAssignTickets } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { getTicket, listAgents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) notFound();
  if (!canAccessTicket(user.role, user.staffId, ticket.requesterStaffId)) {
    redirect("/tickets");
  }

  const agents = listAgents();
  const related = ticket.relatedTicketId
    ? getTicket(ticket.relatedTicketId)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Detail tiket
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Siapa handle & berapa lama
        </h1>
      </div>
      <TicketDetailClient
        ticket={ticket}
        agents={agents}
        related={related}
        canAssign={canAssignTickets(user.role)}
        actorId={user.itMemberId}
      />
    </div>
  );
}
