import { Suspense } from "react";
import { KpiFunctionMaster } from "@/components/master/KpiFunctionMaster";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments, listKpiFunctions } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function KpiFunctionsMasterPage() {
  await requireMasterAccess();
  const departments = listDepartments(true);
  const kpiFunctions = listKpiFunctions();

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
          Master Fungsi KPI
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Kerangka fungsi & bobot per departemen (IT, Finance, HRD, Marketing,
          Warehouse, Operations, dll). Template standar otomatis terisi dan
          bisa disesuaikan.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-ink-muted">Memuat daftar fungsi KPI...</p>
        }
      >
        <KpiFunctionMaster initial={kpiFunctions} departments={departments} />
      </Suspense>
    </div>
  );
}
