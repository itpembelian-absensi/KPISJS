import { GRAPHIC_DESIGN_SCORE_TEMPLATE } from "../src/lib/kpi-graphic-design-template";
import { computeFunctionScoreFromIndicators, computeIndicatorScore } from "../src/lib/kpi-score-compute";
import { kpiGrade } from "../src/lib/kpi-grade";
import { rollupMaju } from "../src/lib/kpi-maju";
import type { KpiScoreIndicator } from "../src/lib/types";

const actuals: Record<string, number> = {
  A1: 80,
  A2: 80,
  A3: 80,
  J1: 80,
  J2: 1,
  U1: 80,
  U2: 80,
  U3: 0,
  U4: 1,
};

const indicators: KpiScoreIndicator[] = [];
for (const fn of GRAPHIC_DESIGN_SCORE_TEMPLATE) {
  for (const ind of fn.indicators) {
    indicators.push({
      id: ind.config.code || ind.name,
      departmentId: "dgm",
      kpiFunctionId: fn.groupCode || fn.name,
      name: ind.name,
      description: ind.description,
      weightPercent: ind.weightPercent,
      metricType: ind.metricType,
      config: ind.config,
      sortOrder: ind.sortOrder,
      active: true,
      jabatanId: "graphic-design",
      createdAt: "",
      updatedAt: "",
    });
  }
}

const lines: string[] = [];
for (const ind of indicators) {
  const code = ind.config.code || "";
  lines.push(`${code} ${computeIndicatorScore(ind, actuals[code], null)}`);
}

const items = GRAPHIC_DESIGN_SCORE_TEMPLATE.map((fn) => {
  const result = computeFunctionScoreFromIndicators(
    fn.groupCode || fn.name,
    indicators,
    (ind) => ({ actualValue: actuals[ind.config.code || ""] }),
    { scoreMethod: "rata-rata" },
  );
  lines.push(
    `${fn.groupCode} fungsi ${result.score} terisi ${result.filledCount}`,
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

const text = lines.join("\n");
const ok =
  text.includes("A1 81.6") &&
  text.includes("A2 84.2") &&
  text.includes("J1 88.9") &&
  text.includes("J2 33.3") &&
  text.includes("U1 100") &&
  text.includes("U2 88.9") &&
  text.includes("U3 100") &&
  text.includes("U4 20") &&
  text.includes("A fungsi 83.3333") &&
  text.includes("J fungsi 61.1") &&
  text.includes("U fungsi 77.225") &&
  text.includes("nilai 74.8 huruf C");

console.log(text);
if (!ok) {
  console.error("Hasil tidak sama dengan rumus lembar Graphic Design");
  process.exit(1);
}
console.log("cocok dengan rumus");
