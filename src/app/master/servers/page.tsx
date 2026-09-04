import { ServerMaster } from "@/components/master/ServerMaster";
import { requireMasterAccess } from "@/lib/session";
import { getServers } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const session = await requireMasterAccess();
  const servers = getServers();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Master Data
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Dokumentasi IT
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Kelola dokumentasi Server, Aplikasi, Domain, dan Email beserta kredensialnya.
        </p>
      </div>
      <ServerMaster initial={servers} />
    </div>
  );
}
