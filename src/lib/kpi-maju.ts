/** Kerangka grup MAJU di atas fungsi KPI. Bobot grup tetap, sama untuk setiap departemen. */

export type MajuCode = string;

export type MajuGroup = {
  id?: string;
  code: string;
  name: string;
  subtitle: string;
  weightPercent: number;
  sortOrder: number;
  active: boolean;
};

export const MAJU_GROUPS: MajuGroup[] = [
  {
    code: "M",
    name: "Mutu",
    subtitle: "Kualitas & Kepatuhan",
    weightPercent: 25,
    sortOrder: 1,
    active: true,
  },
  {
    code: "A",
    name: "Andal",
    subtitle: "Kedisiplinan & Kehadiran",
    weightPercent: 10,
    sortOrder: 2,
    active: true,
  },
  {
    code: "J",
    name: "Jalin Kerja Sama",
    subtitle: "Kolaborasi & Layanan",
    weightPercent: 15,
    sortOrder: 3,
    active: true,
  },
  {
    code: "U",
    name: "Unjuk Kerja",
    subtitle: "Hasil Kerja Utama",
    weightPercent: 50,
    sortOrder: 4,
    active: true,
  },
];

export function isMajuCode(value: string): value is MajuCode {
  return /^[A-Z]{1,3}$/.test(value);
}

export function resolveMajuGroups(groups?: MajuGroup[]): MajuGroup[] {
  const source = groups && groups.length > 0 ? groups : MAJU_GROUPS;
  return [...source].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );
}

export function majuGroup(code: MajuCode, groups?: MajuGroup[]): MajuGroup {
  const list = resolveMajuGroups(groups);
  return (
    list.find((group) => group.code === code) ?? {
      code,
      name: code,
      subtitle: "",
      weightPercent: 0,
      sortOrder: 99,
      active: false,
    }
  );
}

export function majuLabel(code: MajuCode, groups?: MajuGroup[]): string {
  const group = majuGroup(code, groups);
  const detail = group.subtitle ? ` (${group.subtitle})` : "";
  return `${group.code} — ${group.name}${detail}`;
}

/** Kelompokkan fungsi yang sudah ada ke grup terdekat, berdasarkan nama. */
export function inferMajuGroup(name: string): MajuCode {
  const text = name.toLowerCase();
  if (/^andal\b|keandalan|kedisiplinan|kehadiran|disiplin/.test(text)) return "A";
  if (/kolaborasi|kerja sama|kerjasama|engagement/.test(text)) return "J";
  if (
    /mutu|kualitas|quality|kepatuhan|compliance|audit|governance|security|keamanan|safety|akurasi|accuracy/.test(
      text,
    )
  ) {
    return "M";
  }
  return "U";
}

export function parseMajuCode(
  value: string | null | undefined,
  name = "",
): MajuCode {
  const code = (value ?? "").trim().toUpperCase();
  if (isMajuCode(code)) return code;
  return inferMajuGroup(name);
}

export function compareByMaju<
  T extends { groupCode: MajuCode; sortOrder: number; name: string },
>(a: T, b: T, groups?: MajuGroup[]): number {
  const order =
    majuGroup(a.groupCode, groups).sortOrder -
    majuGroup(b.groupCode, groups).sortOrder;
  if (order !== 0) return order;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "id");
}

export function groupKpiFunctions<
  T extends { groupCode: MajuCode; sortOrder?: number; name: string },
>(
  items: T[],
  groups?: MajuGroup[],
): Array<{ group: MajuGroup; items: T[] }> {
  const list = resolveMajuGroups(groups).filter(
    (group) => group.active || items.some((item) => item.groupCode === group.code),
  );
  return list.map((group) => ({
    group,
    items: items
      .filter((item) => item.groupCode === group.code)
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.name.localeCompare(b.name, "id"),
      ),
  }));
}

export type MajuWeightedScore = {
  groupCode: MajuCode;
  weightPercent: number;
  score: number | null;
};

export type MajuRollupGroup = MajuGroup & {
  score: number | null;
  functionWeight: number;
  functionCount: number;
};

/**
 * Skor grup = rata-rata berbobot fungsi di dalamnya.
 * Skor akhir = rata-rata berbobot grup yang sudah punya fungsi.
 * Grup kosong tidak ikut, supaya departemen yang belum punya fungsi di grup itu tidak otomatis jatuh ke nol.
 */
/** Bobot grup mengikuti jumlah bobot indikator yang terisi, seperti lembar berbobot. */
export function majuGroupsWeightedByItems(
  items: MajuWeightedScore[],
  source?: MajuGroup[],
): MajuGroup[] {
  return resolveMajuGroups(source).map((group) => {
    const weight = items
      .filter(
        (item) =>
          item.groupCode === group.code &&
          item.score != null &&
          item.weightPercent > 0,
      )
      .reduce((sum, item) => sum + item.weightPercent, 0);
    if (weight <= 0) return group;
    return { ...group, weightPercent: weight };
  });
}

export function rollupMaju(
  items: MajuWeightedScore[],
  source?: MajuGroup[],
): {
  groups: MajuRollupGroup[];
  overall: number | null;
  weightUsed: number;
} {
  const groups: MajuRollupGroup[] = resolveMajuGroups(source)
    .filter((group) => group.active)
    .map((group) => {
    const kids = items.filter(
      (item) =>
        item.groupCode === group.code &&
        item.weightPercent > 0 &&
        item.score != null,
    );
    let functionWeight = 0;
    let weighted = 0;
    for (const kid of kids) {
      functionWeight += kid.weightPercent;
      weighted += (kid.score ?? 0) * kid.weightPercent;
    }
    const score =
      kids.length > 0 && functionWeight > 0
        ? Math.round((weighted / functionWeight) * 10000) / 10000
        : null;
    return {
      ...group,
      score,
      functionWeight,
      functionCount: kids.length,
    };
  });

  let weightUsed = 0;
  let weighted = 0;
  for (const group of groups) {
    if (group.score == null) continue;
    weightUsed += group.weightPercent;
    weighted += group.score * group.weightPercent;
  }

  return {
    groups,
    overall:
      weightUsed > 0 ? Math.round((weighted / weightUsed) * 10) / 10 : null,
    weightUsed,
  };
}

/** Poin yang fungsi ini sumbangkan ke skor akhir (jumlah semua fungsi = skor akhir). */
export function majuContributionPoints(
  item: MajuWeightedScore,
  items: MajuWeightedScore[],
  groups?: MajuGroup[],
): number {
  const rolled = rollupMaju(items, groups);
  const group = rolled.groups.find((row) => row.code === item.groupCode);
  if (
    !group ||
    group.score == null ||
    group.functionWeight <= 0 ||
    rolled.weightUsed <= 0 ||
    item.weightPercent <= 0
  ) {
    return 0;
  }
  const within = item.weightPercent / group.functionWeight;
  const share = group.weightPercent / rolled.weightUsed;
  return Math.round((item.score ?? 0) * within * share * 100) / 100;
}
