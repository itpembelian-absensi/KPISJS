import { JabatanMaster } from "@/components/master/JabatanMaster";
import { listJabatan } from "@/lib/jabatan-ops";
import { requireMasterAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JabatanPage() {
  await requireMasterAccess();
  const jabatan = listJabatan();

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
          Master Jabatan
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Jabatan paket KPI MAJU dan jabatan yang sudah dipakai di data staf.
          Setiap staf terhubung ke satu jabatan.
        </p>
      </div>
      <JabatanMaster initial={jabatan} />
    </div>
  );
}
