import { requireMasterAccess } from "@/lib/session";
import { getServerById, getServerLogs } from "@/lib/store";
import { notFound } from "next/navigation";
import { ServerDetail } from "@/components/master/ServerDetail";

export const dynamic = "force-dynamic";

export default async function ServerDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const session = await requireMasterAccess();
  const params = await props.params;
  const server = getServerById(params.id);

  if (!server) {
    notFound();
  }

  const logs = getServerLogs(server.id);

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Dokumentasi Server
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {server.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Detail server dan riwayat perubahannya (logbook).
        </p>
      </div>

      <ServerDetail server={server} initialLogs={logs} sessionUser={session} />
    </div>
  );
}
