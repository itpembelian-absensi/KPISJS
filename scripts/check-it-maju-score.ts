import {
  IT_MANAGER_SCORE_TEMPLATE,
  IT_SUPPORT_SCORE_TEMPLATE,
} from "../src/lib/kpi-it-maju-template";
import {
  computeFunctionScoreFromIndicators,
  computeIndicatorScore,
} from "../src/lib/kpi-score-compute";
import { kpiGrade } from "../src/lib/kpi-grade";
import { rollupMaju } from "../src/lib/kpi-maju";
import type { ScoreFunctionTemplate } from "../src/lib/kpi-score-templates";
import type { KpiScoreIndicator } from "../src/lib/types";

function run(
  label: string,
  template: ScoreFunctionTemplate[],
  actuals: Record<string, number | null>,
) {
  const indicators: KpiScoreIndicator[] = [];
  for (const fn of template) {
    for (const ind of fn.indicators) {
      indicators.push({
        id: ind.config.code || ind.name,
        departmentId: "it",
        kpiFunctionId: fn.groupCode || fn.name,
        name: ind.name,
        description: ind.description,
        weightPercent: ind.weightPercent,
        metricType: ind.metricType,
        config: ind.config,
        sortOrder: ind.sortOrder,
        active: true,
        jabatanId: label,
        createdAt: "",
        updatedAt: "",
      });
    }
  }
  const lines: string[] = [label];
  for (const ind of indicators) {
    const code = ind.config.code || "";
    const actual = actuals[code];
    if (actual == null) {
      lines.push(`${code} kosong`);
      continue;
    }
    lines.push(`${code} ${computeIndicatorScore(ind, actual, null)}`);
  }
  const items = template.map((fn) => {
    const result = computeFunctionScoreFromIndicators(
      fn.groupCode || fn.name,
      indicators,
      (ind) => {
        const actual = actuals[ind.config.code || ""];
        if (actual == null) return null;
        return { actualValue: actual };
      },
      { scoreMethod: "rata-rata" },
    );
    lines.push(
      `${fn.groupCode} fungsi ${result.filledCount > 0 ? result.score : "kosong"} terisi ${result.filledCount}`,
    );
    return {
      groupCode: fn.groupCode || "U",
      weightPercent: fn.weightPercent,
      score: result.filledCount > 0 ? result.score : null,
    };
  });
  const rolled = rollupMaju(items);
  const grade = kpiGrade(rolled.overall);
  lines.push(`nilai ${rolled.overall} huruf ${grade?.letter}`);
  return lines.join("\n");
}

const support = run("IT Support", IT_SUPPORT_SCORE_TEMPLATE, {
  M1: null,
  M2: 92,
  M3: null,
  A1: null,
  A2: null,
  A3: null,
  J1: null,
  J2: null,
  J3: null,
  U1: null,
  U2: null,
  U3: null,
});

const manager = run("IT Manager", IT_MANAGER_SCORE_TEMPLATE, {
  M3: 0,
  M4: 80,
  A1: 90,
  A2: 35,
  A3: 79,
  J1: 3,
  J2: 20,
  J3: 20,
  U1: 29,
  U2: 20,
  U3: 20,
  U4: 1,
});

const text = `${support}\n${manager}`;
console.log(text);

const ok =
  support.includes("M2 96.8") &&
  support.includes("M fungsi 96.8") &&
  support.includes("nilai 96.8 huruf A") &&
  manager.includes("M3 100") &&
  manager.includes("M4 84.2") &&
  manager.includes("A1 91.8") &&
  manager.includes("A2 36.8") &&
  manager.includes("A3 83.2") &&
  manager.includes("J1 75") &&
  manager.includes("J2 20") &&
  manager.includes("J3 20") &&
  manager.includes("U1 32.2") &&
  manager.includes("U2 20.2") &&
  manager.includes("U3 22.2") &&
  manager.includes("U4 100") &&
  manager.includes("M fungsi 92.1") &&
  manager.includes("A fungsi 70.6") &&
  manager.includes("J fungsi 38.3333") &&
  manager.includes("U fungsi 43.65") &&
  manager.includes("nilai 57.7 huruf E");

if (!ok) {
  console.error("Hasil tidak sama dengan lembar IT");
  process.exit(1);
}
console.log("cocok dengan rumus");
