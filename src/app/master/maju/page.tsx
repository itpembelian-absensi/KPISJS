import { MajuMaster } from "@/components/master/MajuMaster";
import { listMajuGroups, majuGroupUsage } from "@/lib/kpi-maju-ops";
import { requireMasterMenu } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MajuMasterPage() {
  await requireMasterMenu("/master/maju");
  const items = listMajuGroups().map((group) => ({
    ...group,
    functionCount: majuGroupUsage(group.code),
  }));

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
          Master Grup MAJU
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Kerangka di atas fungsi KPI. Setiap fungsi masuk ke salah satu grup,
          lalu skor akhir memakai bobot grup yang aktif. Ubah nama, keterangan,
          atau bobot di sini.
        </p>
      </div>
      <MajuMaster initial={items} />
    </div>
  );
}
