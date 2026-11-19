import { ensureDepartmentScoreRules } from "../src/lib/kpi-score-ops";
import { getDb } from "../src/lib/db";
import { MAJU_WORKBOOK } from "../src/lib/kpi-maju-workbook";
import {
  computeFunctionScoreFromIndicators,
  computeIndicatorScore,
} from "../src/lib/kpi-score-compute";
import { kpiGrade } from "../src/lib/kpi-grade";
import { majuGroupsWeightedByItems, rollupMaju } from "../src/lib/kpi-maju";
import type { KpiScoreIndicator } from "../src/lib/types";

function scoreSheet(
  jabatanName: string,
  actuals: Record<string, number | null>,
) {
  const sheet = MAJU_WORKBOOK.find((item) => item.jabatanName === jabatanName);
  if (!sheet) throw new Error(`Lembar ${jabatanName} tidak ada`);
  const indicators: KpiScoreIndicator[] = [];
  for (const fn of sheet.functions) {
    for (const ind of fn.indicators) {
      indicators.push({
        id: ind.config.code || ind.name,
        departmentId: "dept",
        kpiFunctionId: fn.groupCode || fn.name,
        name: ind.name,
        description: ind.description,
        weightPercent: ind.weightPercent,
        metricType: ind.metricType,
        config: ind.config,
        sortOrder: ind.sortOrder,
        active: true,
        jabatanId: jabatanName,
        createdAt: "",
        updatedAt: "",
      });
    }
  }
  const items = sheet.functions.map((fn) => {
    const result = computeFunctionScoreFromIndicators(
      fn.groupCode || fn.name,
      indicators,
      (ind) => {
        const actual = actuals[ind.config.code || ""];
        if (actual == null) return null;
        return { actualValue: actual };
      },
      { scoreMethod: sheet.scoreMethod },
    );
    return {
      code: fn.groupCode || "U",
      score: result.filledCount > 0 ? result.score : null,
      weight:
        sheet.scoreMethod === "bobot" && result.filledCount > 0
          ? result.weightUsed
          : fn.weightPercent,
      sample: indicators
        .filter((ind) => ind.kpiFunctionId === (fn.groupCode || fn.name))
        .filter((ind) => actuals[ind.config.code || ""] != null)
        .map(
          (ind) =>
            `${ind.config.code} ${computeIndicatorScore(ind, actuals[ind.config.code || ""], null)}`,
        ),
    };
  });
  const majuItems = items.map((item) => ({
    groupCode: item.code as "M" | "A" | "J" | "U",
    weightPercent: item.score == null ? 0 : item.weight,
    score: item.score,
  }));
  const rolled = rollupMaju(
    majuItems,
    sheet.scoreMethod === "bobot"
      ? majuGroupsWeightedByItems(majuItems)
      : undefined,
  );
  return {
    lines: items.flatMap((item) => [
      ...item.sample,
      `${item.code} fungsi ${item.score ?? "kosong"}`,
    ]),
    overall: rolled.overall,
    letter: kpiGrade(rolled.overall)?.letter,
  };
}

const kejadian = [0, 1, 2, 3, 4].map((n) => {
  const indicator = {
    id: "k",
    departmentId: "d",
    kpiFunctionId: "M",
    name: "Kejadian",
    description: "",
    weightPercent: 1,
    metricType: "ratio" as const,
    config: { rule: "kejadian" as const, defaultTarget: 0 },
    sortOrder: 1,
    active: true,
    jabatanId: null,
    createdAt: "",
    updatedAt: "",
  };
  return `${n}=${computeIndicatorScore(indicator, n, null)}`;
});

const batas = computeIndicatorScore(
  {
    id: "b",
    departmentId: "d",
    kpiFunctionId: "M",
    name: "Batas",
    description: "",
    weightPercent: 1,
    metricType: "ratio",
    config: { rule: "batas", direction: "lower", defaultTarget: 0.5 },
    sortOrder: 1,
    active: true,
    jabatanId: null,
    createdAt: "",
    updatedAt: "",
  },
  1,
  null,
);

ensureDepartmentScoreRules();
const db = getDb();
const installed = MAJU_WORKBOOK.map((sheet) => {
  const row = db
    .prepare(
      `SELECT j.indicator_count AS indicator_count, j.score_method AS score_method,
              j.department_id AS department_id,
              (SELECT COUNT(*) FROM kpi_score_indicators i
               WHERE i.jabatan_id = j.id AND i.active = 1) AS active_count
       FROM jabatan j WHERE lower(j.name) = lower(?)`,
    )
    .get(sheet.jabatanName) as
    | {
        indicator_count: number;
        score_method: string;
        department_id: string | null;
        active_count: number;
      }
    | undefined;
  const expected = sheet.functions.reduce(
    (sum, fn) => sum + fn.indicators.length,
    0,
  );
  return {
    name: sheet.jabatanName,
    method: sheet.scoreMethod,
    expected,
    active: row?.active_count ?? 0,
    stored: row?.indicator_count ?? 0,
    scoreMethod: row?.score_method ?? "",
    linked: Boolean(row?.department_id),
  };
});

const manager = scoreSheet("IT Manager", {
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
const support = scoreSheet("IT Support", { M2: 92 });

const problems = installed.filter(
  (row) =>
    !row.linked ||
    row.active !== row.expected ||
    row.stored !== row.expected ||
    row.scoreMethod !== row.method,
);

console.log(kejadian.join(" "));
console.log(`batas 1 atas 0,5 = ${batas}`);
console.log(manager.lines.join("\n"));
console.log(`IT Manager nilai ${manager.overall} ${manager.letter}`);
console.log(support.lines.join("\n"));
console.log(`IT Support nilai ${support.overall} ${support.letter}`);
console.log(
  installed
    .map(
      (row) =>
        `${row.name} ${row.method} aktif ${row.active}/${row.expected} metode ${row.scoreMethod} departemen ${row.linked ? "ada" : "kosong"}`,
    )
    .join("\n"),
);

const ok =
  kejadian.join(" ") === "0=100 1=70 2=40 3=0 4=0" &&
  batas === 50 &&
  manager.overall === 57.7 &&
  manager.letter === "E" &&
  support.overall === 96.8 &&
  support.letter === "A" &&
  problems.length === 0;

if (!ok) {
  console.error("Tidak cocok", problems);
  process.exit(1);
}
console.log("lembar terpasang");
