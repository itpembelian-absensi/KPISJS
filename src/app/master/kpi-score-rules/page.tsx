import { KpiScoreRulesMaster } from "@/components/master/KpiScoreRulesMaster";
import {
  ensureDepartmentScoreRules,
  listKpiScoreIndicators,
} from "@/lib/kpi-score-ops";
import { requireMasterMenu } from "@/lib/session";
import { listDepartments, listKpiFunctions } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function KpiScoreRulesPage() {
  await requireMasterMenu("/master/kpi-score-rules");
  ensureDepartmentScoreRules();

  const departments = listDepartments(true);
  const defaultDepartmentId =
    departments.find((d) => d.code.toUpperCase() === "IT")?.id ||
    departments.find((d) => d.code.toUpperCase() === "MTR")?.id ||
    departments[0]?.id ||
    "";

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
          Aturan Skor KPI
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Master indikator terukur per fungsi &amp; departemen: target, skala
          nilai, bobot internal, dan sumber capaian (Manual vs Otomatis dari
          Absensi / Ticket / Kegiatan / Project).
        </p>
      </div>

      <KpiScoreRulesMaster
        departments={departments}
        initialFunctions={listKpiFunctions(true)}
        initialIndicators={listKpiScoreIndicators()}
        defaultDepartmentId={defaultDepartmentId}
      />
    </div>
  );
}
