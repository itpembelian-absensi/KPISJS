import { StatCard } from "@/components/StatCard";
import { computeIndicatorScore } from "@/lib/kpi-score-compute";
import { dataSourceBadgeLabel } from "@/lib/kpi-score-templates";
import type {
  KpiFunction,
  KpiIndicatorActual,
  KpiScoreIndicator,
} from "@/lib/types";

function trimNum(n: number) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function toneOf(score: number | null): "default" | "ok" | "warn" | "danger" {
  if (score == null) return "default";
  if (score >= 80) return "ok";
  if (score >= 50) return "warn";
  return "danger";
}

function formatRealization(indicator: KpiScoreIndicator, value: number) {
  if (indicator.metricType === "scale_count") return trimNum(value);
  return `${trimNum(value)}%`;
}

export function DepartmentKpiBoard({
  functions,
  indicators,
  actuals,
}: {
  functions: KpiFunction[];
  indicators: KpiScoreIndicator[];
  actuals: KpiIndicatorActual[];
}) {
  const active = indicators.filter((i) => i.active);

  if (functions.length === 0) {
    return (
      <p className="panel px-4 py-8 text-sm text-ink-muted">
        Belum ada fungsi KPI aktif di departemen ini.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {functions.map((fn) => {
        const inds = active
          .filter((i) => i.kpiFunctionId === fn.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <section key={fn.id} className="space-y-3">
            <div>
              <h2 className="font-semibold">
                {fn.name}{" "}
                <span className="text-sm font-normal text-ink-muted">
                  {fn.weightPercent}%
                </span>
              </h2>
              {fn.focus ? (
                <p className="mt-1 text-xs text-ink-muted">{fn.focus}</p>
              ) : null}
            </div>
            {inds.length === 0 ? (
              <p className="panel px-4 py-4 text-sm text-ink-muted">
                Belum ada indikator pada fungsi ini.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {inds.map((ind) => {
                  const rows = actuals.filter(
                    (a) =>
                      a.indicatorId === ind.id &&
                      a.actualValue != null &&
                      Number.isFinite(a.actualValue),
                  );
                  const period = rows
                    .map((a) => a.periodLabel)
                    .sort()
                    .reverse()[0];
                  const latest = period
                    ? rows.filter((a) => a.periodLabel === period)
                    : [];
                  const avg =
                    latest.length === 0
                      ? null
                      : latest.reduce((s, a) => s + (a.actualValue ?? 0), 0) /
                        latest.length;
                  const score =
                    avg == null
                      ? null
                      : Math.round(
                          (latest.reduce(
                            (s, a) =>
                              s +
                              computeIndicatorScore(
                                ind,
                                a.actualValue,
                                a.targetOverride,
                              ),
                            0,
                          ) /
                            latest.length) *
                            10,
                        ) / 10;
                  const source = dataSourceBadgeLabel(
                    ind.metricType,
                    ind.config,
                  );
                  const rawNote = ind.config.notes || ind.description;
                  const note =
                    rawNote.length > 90 ? `${rawNote.slice(0, 87)}…` : rawNote;
                  return (
                    <StatCard
                      key={ind.id}
                      label={ind.name}
                      value={
                        avg == null ? "—" : formatRealization(ind, avg)
                      }
                      hint={
                        avg == null
                          ? `${source.label} · bobot ${ind.weightPercent}% · belum ada capaian`
                          : `Skor ${trimNum(score ?? 0)} · ${period} · ${latest.length} staf · ${note}`
                      }
                      tone={toneOf(score)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
