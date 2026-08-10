import fs from "fs";
import path from "path";
import { ensureDepartmentScoreRules, listKpiScoreIndicators } from "../src/lib/kpi-score-ops";
import {
  syncTicketScoreActuals,
  listKpiIndicatorActuals,
} from "../src/lib/kpi-indicator-actuals-ops";
import {
  listDepartments,
  listKpiFunctions,
  listTickets,
} from "../src/lib/store";
import { listKpiAssessments } from "../src/lib/kpi-ops";
import {
  computeTicketScoreMetrics,
  filterTicketsForScoreMetrics,
  ticketActualValueForIndicator,
  ticketPeriodLabels,
} from "../src/lib/ticket-score-metrics";
import { computeFunctionScoreFromIndicators } from "../src/lib/kpi-score-compute";

ensureDepartmentScoreRules();
const sync = syncTicketScoreActuals();

const it = listDepartments(true).find((d) => d.code.toUpperCase() === "IT")!;
const ym = ticketPeriodLabels(listTickets())[0];
const metrics = computeTicketScoreMetrics(
  filterTicketsForScoreMetrics(listTickets(), {
    periodYm: ym,
    assigneeIds: null,
  }),
);
const op = listKpiFunctions(true, it.id).find((f) =>
  /operation/i.test(f.name),
)!;
const inds = listKpiScoreIndicators(it.id).filter(
  (i) => i.kpiFunctionId === op.id,
);
const result = computeFunctionScoreFromIndicators(op.id, inds, (ind) => {
  const v = ticketActualValueForIndicator(ind, metrics);
  return v == null ? null : { actualValue: v };
});
const actuals = listKpiIndicatorActuals({
  departmentId: it.id,
  periodLabel: ym,
});
const asms = listKpiAssessments().filter(
  (a) =>
    a.departmentId === it.id &&
    a.periodLabel === ym &&
    a.kpiFunctionId === op.id,
);

const report = {
  sync,
  period: ym,
  metrics,
  score: result.score,
  filledCount: result.filledCount,
  weightUsed: result.weightUsed,
  indicators: result.indicatorScores,
  actualsSaved: actuals.length,
  assessments: asms.map((a) => ({
    staffId: a.staffId,
    score: a.score,
    notes: a.notes,
  })),
};

const out = path.join(process.cwd(), "data", "sync-ticket-score-log.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
