export type HomeVisualId =
  | "1erVisuel"
  | "2eVisuel"
  | "3eVisuel"
  | "4eVisuel"
  | "5eVisuel"
  | "6eVisuel"
  | "7eVisuel"
  | "8eVisuel"
  | "9eVisuel"
  | "10eVisuel"
  | "11eVisuel"
  | "12eVisuel"
  | "13eVisuel";

export const HOME_VISUAL_IDS: HomeVisualId[] = [
  "1erVisuel",
  "2eVisuel",
  "3eVisuel",
  "4eVisuel",
  "5eVisuel",
  "6eVisuel",
  "7eVisuel",
  "8eVisuel",
  "9eVisuel",
  "10eVisuel",
  "11eVisuel",
  "12eVisuel",
  "13eVisuel",
];

export const DEFAULT_HOME_VISUAL: HomeVisualId = "3eVisuel";

export function normalizeHomeVisual(value: string | undefined | null): HomeVisualId {
  if (value && (HOME_VISUAL_IDS as string[]).includes(value)) {
    return value as HomeVisualId;
  }
  return DEFAULT_HOME_VISUAL;
}

export const MARKETPLACE_HOME_TITLE = "3K-Négoce — Marketplace fixation et outillage";
export const MARKETPLACE_HOME_DESCRIPTION =
  "Un négoce, huit univers spécialisés. Fixation et outillage pour artisans et particuliers. Livraison 24/48h.";

export type AiryHomeTheme = {
  id: HomeVisualId;
  label: string;
  description: string;
  pageBg: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentContrast: string;
  navBar: string;
  navText: string;
  heroBg: string;
  tileBg: string;
  tileText: string;
  promoA: string;
  promoAText: string;
  promoB: string;
  promoBText: string;
  footerBar: string;
  heroLayout?: "fullBleed";
  /** 12eVisuel : 8 univers sur une seule ligne. */
  universColumns?: string;
};

export const AIRY_HOME_THEMES: AiryHomeTheme[] = [
  {
    id: "5eVisuel",
    label: "5eVisuel",
    description: "Catalogue blanc · accents orange logo",
    pageBg: "#ffffff",
    text: "#000d4f",
    muted: "rgba(0,13,79,0.55)",
    accent: "#ff7900",
    accentHover: "#e86b00",
    accentContrast: "#000d4f",
    navBar: "#000d4f",
    navText: "#ffffff",
    heroBg: "#f3f5f9",
    tileBg: "#ff7900",
    tileText: "#000d4f",
    promoA: "#000d4f",
    promoAText: "#ffffff",
    promoB: "#ff7900",
    promoBText: "#000d4f",
    footerBar: "#000d4f",
  },
  {
    id: "6eVisuel",
    label: "6eVisuel",
    description: "Catalogue blanc · navy · bannière pleine largeur + blog",
    pageBg: "#ffffff",
    text: "#000d4f",
    muted: "rgba(0,13,79,0.55)",
    accent: "#000d4f",
    accentHover: "#001a7a",
    accentContrast: "#ffffff",
    navBar: "#000d4f",
    navText: "#ffffff",
    heroBg: "#eef1f8",
    tileBg: "#000d4f",
    tileText: "#ffffff",
    promoA: "#ff7900",
    promoAText: "#000d4f",
    promoB: "#000d4f",
    promoBText: "#ffffff",
    footerBar: "#000d4f",
    heroLayout: "fullBleed",
  },
  {
    id: "7eVisuel",
    label: "7eVisuel",
    description: "Blanc aéré · acier bleuté",
    pageBg: "#fafbfc",
    text: "#1a2332",
    muted: "rgba(26,35,50,0.55)",
    accent: "#3b6ea5",
    accentHover: "#2f5a8a",
    accentContrast: "#ffffff",
    navBar: "#1a2332",
    navText: "#ffffff",
    heroBg: "#eef2f6",
    tileBg: "#3b6ea5",
    tileText: "#ffffff",
    promoA: "#1a2332",
    promoAText: "#ffffff",
    promoB: "#3b6ea5",
    promoBText: "#ffffff",
    footerBar: "#1a2332",
  },
  {
    id: "8eVisuel",
    label: "8eVisuel",
    description: "Blanc · ambre chaud",
    pageBg: "#ffffff",
    text: "#2a2118",
    muted: "rgba(42,33,24,0.55)",
    accent: "#d97706",
    accentHover: "#b45309",
    accentContrast: "#ffffff",
    navBar: "#2a2118",
    navText: "#ffffff",
    heroBg: "#faf6f0",
    tileBg: "#f59e0b",
    tileText: "#2a2118",
    promoA: "#2a2118",
    promoAText: "#ffffff",
    promoB: "#f59e0b",
    promoBText: "#2a2118",
    footerBar: "#2a2118",
  },
  {
    id: "9eVisuel",
    label: "9eVisuel",
    description: "Blanc · vert atelier",
    pageBg: "#ffffff",
    text: "#14352a",
    muted: "rgba(20,53,42,0.55)",
    accent: "#0f766e",
    accentHover: "#0d9488",
    accentContrast: "#ffffff",
    navBar: "#14352a",
    navText: "#ffffff",
    heroBg: "#f0f7f5",
    tileBg: "#0f766e",
    tileText: "#ffffff",
    promoA: "#14352a",
    promoAText: "#ffffff",
    promoB: "#14b8a6",
    promoBText: "#14352a",
    footerBar: "#14352a",
  },
  {
    id: "10eVisuel",
    label: "10eVisuel",
    description: "Blanc · graphite + touche orange",
    pageBg: "#ffffff",
    text: "#1c1c1e",
    muted: "rgba(28,28,30,0.55)",
    accent: "#ff7900",
    accentHover: "#e86b00",
    accentContrast: "#1c1c1e",
    navBar: "#1c1c1e",
    navText: "#ffffff",
    heroBg: "#f4f4f5",
    tileBg: "#e4e4e7",
    tileText: "#1c1c1e",
    promoA: "#1c1c1e",
    promoAText: "#ffffff",
    promoB: "#ff7900",
    promoBText: "#1c1c1e",
    footerBar: "#1c1c1e",
  },
  {
    id: "12eVisuel",
    label: "12eVisuel",
    description: "Comme le 6e · 8 univers sur une seule ligne",
    pageBg: "#ffffff",
    text: "#000d4f",
    muted: "rgba(0,13,79,0.55)",
    accent: "#000d4f",
    accentHover: "#001a7a",
    accentContrast: "#ffffff",
    navBar: "#000d4f",
    navText: "#ffffff",
    heroBg: "#eef1f8",
    tileBg: "#000d4f",
    tileText: "#ffffff",
    promoA: "#ff7900",
    promoAText: "#000d4f",
    promoB: "#000d4f",
    promoBText: "#ffffff",
    footerBar: "#000d4f",
    heroLayout: "fullBleed",
    universColumns: "grid-cols-4 sm:grid-cols-8",
  },
];

export function findAiryHomeTheme(id: string): AiryHomeTheme | undefined {
  return AIRY_HOME_THEMES.find((theme) => theme.id === id);
}
