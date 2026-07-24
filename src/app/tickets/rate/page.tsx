import { RateTicketsClient } from "@/components/RateTicketsClient";
import { canViewAllSatisfaction } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { listAgents, listTickets } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RateTicketsPage() {
  const user = await requireUser();
  const agents = listAgents();
  const itOverview = canViewAllSatisfaction(user.role);

  const doneFilter = (t: { status: string }) =>
    t.status === "resolved" || t.status === "closed";

  const rateable = itOverview
    ? listTickets({ status: "all" }).filter(doneFilter)
    : user.staffId
      ? listTickets({
          status: "all",
          requesterStaffId: user.staffId,
        }).filter(doneFilter)
      : [];

  const inProgress =
    !itOverview && user.staffId
      ? listTickets({
          status: "all",
          requesterStaffId: user.staffId,
        }).filter(
          (t) =>
            t.status === "open" ||
            t.status === "in_progress" ||
            t.status === "pending",
        )
      : [];

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          {itOverview ? "Monitoring IT" : "Feedback pemohon"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Nilai Hasil Kerja
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {itOverview ? (
            <>
              Ringkasan penilaian kepuasan dari{" "}
              <span className="font-medium text-ink">semua user</span> untuk
              tiket yang sudah selesai. Penilaian diisi oleh pemohon, bukan
              oleh IT.
            </>
          ) : (
            <>
              Beri rating kepuasan untuk tiket{" "}
              <span className="font-medium text-ink">yang Anda ajukan</span> dan
              statusnya sudah{" "}
              <span className="font-medium text-ink">Selesai</span> / Ditutup.
            </>
          )}
        </p>
        {!itOverview && !user.staffId ? (
          <p className="mt-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            Akun belum terhubung ke data staff — tidak ada tiket pemohon yang
            bisa dinilai. Hubungkan di User &amp; Role.
          </p>
        ) : null}
      </div>

      <RateTicketsClient
        tickets={rateable}
        inProgress={inProgress}
        agents={agents}
        mode={itOverview ? "it_overview" : "user_rate"}
        currentStaffId={user.staffId}
      />
    </div>
  );
}
