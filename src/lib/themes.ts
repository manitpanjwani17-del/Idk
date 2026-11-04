/** Looks a creator can give their test page. Values feed CSS custom properties. */

export interface Theme {
  id: string;
  name: string;
  vibe: string;
  font: "display" | "serif";
  effect: "sparkle" | "grain" | "bubbles" | "none";
  vars: {
    bg: string; // page background (can be a gradient)
    surface: string; // cards
    text: string;
    muted: string;
    accent: string; // main button
    accentText: string;
    border: string;
    chip: string; // small pills
    end: string; // solid colour at the bottom of the viewport (CTA backdrop)
  };
}

export const THEMES = [
  {
    id: "acid",
    name: "Acid",
    vibe: "dark, loud, streetwear",
    font: "display",
    effect: "grain",
    vars: {
      bg: "#0b0b0b",
      surface: "#171717",
      text: "#f6f6ef",
      muted: "#a9a9a0",
      accent: "#c8ff2e",
      accentText: "#0b0b0b",
      border: "#2c2c2c",
      chip: "#232323",
      end: "#0b0b0b",
    },
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
    vibe: "cute, pink, playful",
    font: "display",
    effect: "bubbles",
    vars: {
      bg: "linear-gradient(180deg,#ffd9ee 0%,#ffc2e2 100%)",
      surface: "#fff6fb",
      text: "#3b0b40",
      muted: "#7d4a82",
      accent: "#ff2e93",
      accentText: "#ffffff",
      border: "#3b0b40",
      chip: "#ffe3f2",
      end: "#ffc2e2",
    },
  },
  {
    id: "matcha",
    name: "Matcha",
    vibe: "calm, clean, aesthetic",
    font: "serif",
    effect: "none",
    vars: {
      bg: "#eef1e3",
      surface: "#fbfcf6",
      text: "#1f3a1a",
      muted: "#5a6a52",
      accent: "#2f6b22",
      accentText: "#ffffff",
      border: "#c9d2b6",
      chip: "#e1e8cf",
      end: "#eef1e3",
    },
  },
  {
    id: "chrome",
    name: "Y2K Chrome",
    vibe: "shiny, techy, 2003",
    font: "display",
    effect: "sparkle",
    vars: {
      bg: "linear-gradient(160deg,#f2f5fb 0%,#c9d4e8 55%,#e8ecf6 100%)",
      surface: "rgba(255,255,255,0.78)",
      text: "#0f1b3d",
      muted: "#4b5a80",
      accent: "#2e5bff",
      accentText: "#ffffff",
      border: "#0f1b3d",
      chip: "rgba(255,255,255,0.9)",
      end: "#e8ecf6",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    vibe: "warm, bold, summer",
    font: "display",
    effect: "grain",
    vars: {
      bg: "linear-gradient(170deg,#ff8a3d 0%,#ff4f6d 60%,#e8337f 100%)",
      surface: "rgba(255,255,255,0.14)",
      text: "#fff8f0",
      muted: "#ffe2d2",
      accent: "#fff8f0",
      accentText: "#b3124f",
      border: "rgba(255,255,255,0.45)",
      chip: "rgba(255,255,255,0.18)",
      end: "#e8337f",
    },
  },
  {
    id: "clean",
    name: "Clean",
    vibe: "minimal, premium",
    font: "serif",
    effect: "none",
    vars: {
      bg: "#ffffff",
      surface: "#f5f5f3",
      text: "#111111",
      muted: "#5f5f5a",
      accent: "#111111",
      accentText: "#ffffff",
      border: "#e3e3de",
      chip: "#efefeb",
      end: "#ffffff",
    },
  },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** CSS custom properties for a theme, ready for a style prop. */
export function themeStyle(theme: Theme): Record<string, string> {
  const v = theme.vars;
  return {
    "--t-bg": v.bg,
    "--t-surface": v.surface,
    "--t-text": v.text,
    "--t-muted": v.muted,
    "--t-accent": v.accent,
    "--t-accent-text": v.accentText,
    "--t-border": v.border,
    "--t-chip": v.chip,
    "--t-end": v.end,
  };
}
