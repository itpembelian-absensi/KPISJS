import { SopMaster } from "@/components/master/SopMaster";
import { requireSopAccess } from "@/lib/session";
import { listSops } from "@/lib/sop-ops";

export const dynamic = "force-dynamic";

export default async function MasterSopsPage() {
  await requireSopAccess();
  const sops = listSops();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Divisi IT
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          SOP IT
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Format formal Divisi IT: header nomor dokumen, bagian A–D (Tujuan,
          Bahan, Kualifikasi, Prosedur), dan tabel disposisi. Baca di web atau
          unduh PDF/Word per dokumen / digabung.
        </p>
      </div>
      <SopMaster initial={sops} />
    </div>
  );
}
