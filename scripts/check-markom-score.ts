import { MARKOM_SCORE_TEMPLATE } from "../src/lib/kpi-markom-template";
import {
  computeFunctionScoreFromIndicators,
  computeIndicatorScore,
} from "../src/lib/kpi-score-compute";
import { kpiGrade, weightedPoints } from "../src/lib/kpi-grade";
import { rollupMaju } from "../src/lib/kpi-maju";
import type { KpiScoreIndicator } from "../src/lib/types";

const actuals: Record<string, number | null> = {
  M1: 80,
  M2: 4,
  M3: 0,
  M4: 1,
  A1: 89,
  A2: 90,
  A3: 90,
  J1: 90,
  J2: 70,
  J3: 76,
  U1: null,
  U2: null,
  U3: 56,
  U4: 63,
};

const indicators: KpiScoreIndicator[] = [];
for (const fn of MARKOM_SCORE_TEMPLATE) {
  for (const ind of fn.indicators) {
    indicators.push({
      id: ind.config.code || ind.name,
      departmentId: "mkt",
      kpiFunctionId: fn.groupCode || fn.name,
      name: ind.name,
      description: ind.description,
      weightPercent: ind.weightPercent,
      metricType: ind.metricType,
      config: ind.config,
      sortOrder: ind.sortOrder,
      active: true,
      jabatanId: "markom",
      createdAt: "",
      updatedAt: "",
    });
  }
}

const lines: string[] = [];
for (const ind of indicators) {
  const code = ind.config.code || "";
  const actual = actuals[code];
  if (actual == null) {
    lines.push(`${code} kosong`);
    continue;
  }
  lines.push(
    `${code} ${computeIndicatorScore(ind, actual, null)}`,
  );
}

const items = MARKOM_SCORE_TEMPLATE.map((fn) => {
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
  const points = weightedPoints(result.score, fn.weightPercent);
  lines.push(
    `${fn.groupCode} fungsi ${result.score} terisi ${result.filledCount} tertimbang ${points}`,
  );
  return {
    groupCode: fn.groupCode || "U",
    weightPercent: fn.weightPercent,
    score: result.filledCount > 0 ? result.score : null,
  };
});

const rolled = rollupMaju(items);
const grade = kpiGrade(rolled.overall);
lines.push(`nilai ${rolled.overall} huruf ${grade?.letter} bobot ${rolled.weightUsed}`);

const text = lines.join("\n");
const ok =
  text.includes("M1 84.2") &&
  text.includes("A1 90.8") &&
  text.includes("A2 94.7") &&
  text.includes("J3 80") &&
  text.includes("U3 70") &&
  text.includes("M fungsi 96.05") &&
  text.includes("A fungsi 93.4") &&
  text.includes("J fungsi 83.3333") &&
  text.includes("U fungsi 70") &&
  text.includes("nilai 80.9 huruf B");

console.log(text);
if (!ok) {
  console.error("Hasil tidak sama dengan lembar Markom");
  process.exit(1);
}
console.log("cocok dengan lembar");
