import { ScoreGuideClient } from "@/components/ScoreGuideClient";
import { getEffectiveDepartmentScope } from "@/lib/auth";
import { requireMenu } from "@/lib/session";
import { listDepartments, listKpiFunctions } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ScoreGuidePage() {
  const user = await requireMenu("/kpi/score-guide");

  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));

  if (departments.length === 0) redirect("/");

  const deptIds = new Set(departments.map((d) => d.id));
  const functions = listKpiFunctions(true).filter(
    (f) => f.departmentId && deptIds.has(f.departmentId),
  );

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Panduan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Panduan Skor KPI Departemen
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Penjelasan rumus skor otomatis dan daftar fungsi + bobot untuk setiap
          departemen, sesuai Master Fungsi KPI yang aktif.
        </p>
      </div>

      <ScoreGuideClient
        departments={departments}
        functions={functions}
        defaultDepartmentId={
          departments.length === 1 ? departments[0].id : "all"
        }
      />
    </div>
  );
}
