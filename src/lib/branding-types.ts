export const THEME_IDS = [
  "default",
  "ocean",
  "forest",
  "sunset",
  "slate",
  "orchid",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_OPTIONS: Array<{
  id: ThemeId;
  label: string;
  hint: string;
  swatch: string;
}> = [
  {
    id: "default",
    label: "Default",
    hint: "Mint sage — warna asli aplikasi",
    swatch: "#2a9b86",
  },
  {
    id: "ocean",
    label: "Ocean",
    hint: "Biru laut",
    swatch: "#2a7ab8",
  },
  {
    id: "forest",
    label: "Hutan",
    hint: "Hijau daun",
    swatch: "#3d7a45",
  },
  {
    id: "sunset",
    label: "Sunset",
    hint: "Oranye hangat",
    swatch: "#c45c26",
  },
  {
    id: "slate",
    label: "Slate",
    hint: "Abu profesional",
    swatch: "#4b6272",
  },
  {
    id: "orchid",
    label: "Orchid",
    hint: "Ungu lembut",
    swatch: "#7a4ea3",
  },
];

export type AppBranding = {
  logoUrl: string | null;
  companyName: string;
  appTitle: string;
  appTagline: string;
  themeId: ThemeId;
};

export const DEFAULT_APP_TITLE = "KPI & IT Helpdesk";
export const DEFAULT_APP_TAGLINE = "Antrian support, master data, dan KPI.";

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}
