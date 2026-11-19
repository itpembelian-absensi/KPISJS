import { JabatanMaster } from "@/components/master/JabatanMaster";
import { listJabatan } from "@/lib/jabatan-ops";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function JabatanPage() {
  await requireMasterAccess();
  const jabatan = listJabatan();
  const departments = listDepartments(true).map((dept) => ({
    id: dept.id,
    code: dept.code,
    name: dept.name,
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
          Master Jabatan
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Setiap jabatan terhubung ke satu departemen. Skor jabatan itu
          dihitung di halaman KPI departemen tersebut.
        </p>
      </div>
      <JabatanMaster initial={jabatan} departments={departments} />
    </div>
  );
}
