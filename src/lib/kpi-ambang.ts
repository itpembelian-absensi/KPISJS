export const AMBANG_ITEMS = [
  { key: "kehadiran", label: "Kehadiran" },
  { key: "alpa", label: "Alpa" },
  { key: "sp", label: "SP" },
  { key: "integritas", label: "Integritas" },
  { key: "k3", label: "K3" },
] as const;

export type AmbangKey = (typeof AMBANG_ITEMS)[number]["key"];
export type AmbangMark = "" | "lulus" | "tidak";

export type KpiAmbangCheck = {
  id: string;
  staffId: string;
  periodLabel: string;
  kehadiran: AmbangMark;
  alpa: AmbangMark;
  sp: AmbangMark;
  integritas: AmbangMark;
  k3: AmbangMark;
  notes: string;
  checkedBy: string;
  updatedAt: string;
};

export function ambangStatus(
  row: Pick<KpiAmbangCheck, AmbangKey> | null,
): "belum" | "lulus" | "tidak" {
  if (!row) return "belum";
  const marks = AMBANG_ITEMS.map((item) => row[item.key]);
  if (marks.some((mark) => mark === "tidak")) return "tidak";
  if (marks.every((mark) => mark === "lulus")) return "lulus";
  return "belum";
}
