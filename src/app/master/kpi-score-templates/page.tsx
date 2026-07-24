import { KpiScoreTemplatesMaster } from "@/components/master/KpiScoreTemplatesMaster";
import { ensureBuiltInScoreTemplates, listKpiScoreTemplates } from "@/lib/kpi-score-template-ops";
import { requireMasterMenu } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function KpiScoreTemplatesPage() {
  await requireMasterMenu("/master/kpi-score-templates");
  ensureBuiltInScoreTemplates();

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
          Template Indikator
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Kelola template fungsi &amp; indikator skor KPI. Buat manual, salin
          dari departemen, lalu terapkan ke dept mana pun (ACC, HR, IT, dll.).
        </p>
      </div>

      <KpiScoreTemplatesMaster
        initialTemplates={listKpiScoreTemplates()}
        departments={listDepartments(true)}
      />
    </div>
  );
}
