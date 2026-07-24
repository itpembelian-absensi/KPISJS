import { ItTeamMaster } from "@/components/master/ItTeamMaster";
import { requireMasterAccess } from "@/lib/session";
import { listItTeam, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ItTeamPage() {
  await requireMasterAccess();
  const itTeam = listItTeam();
  const staff = listStaff(true);

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
          Master Tim IT
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Daftarkan IT Staff dan IT Manager sebagai handler tiket support.
        </p>
      </div>
      <ItTeamMaster initial={itTeam} staff={staff} />
    </div>
  );
}
