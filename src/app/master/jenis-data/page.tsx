import { JenisDataMaster } from "@/components/master/JenisDataMaster";
import { listJenisData } from "@/lib/jenis-data-ops";
import { requireMasterAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JenisDataPage() {
  await requireMasterAccess();
  const items = listJenisData();

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
          Master Jenis Data
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Kelola pilihan jenis data pada pengajuan Perubahan Data Orlansoft.
          Kode 2 digit dipakai di nomor perubahan. Jenis yang nonaktif tidak
          muncul di form baru.
        </p>
      </div>
      <JenisDataMaster initial={items} />
    </div>
  );
}
