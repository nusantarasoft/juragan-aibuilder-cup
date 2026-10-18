/**
 * Agentic OS / Virtual Office theme tokens — synchronized with Admin CMS
 * (`admin/src/components/layout/voTheme.ts` & `admin/src/store/usePreferencesStore.ts`):
 *   border-white/15 · bg-[#0b0e13]/95 · text-slate-100 · shadow-[0_24px_60px_-15px_rgba(0,0,0,0.92)]
 *   crisp square edges, monospace chrome, orange (#fb923c) / sky (#38bdf8) accents.
 */

export interface VOTheme {
  canvas: string;
  surfaceStrong: string;
  surface: string;
  glass: string;
  glassFaint: string;
  blur: string;
  border: string;
  borderStrong: string;
  shadow: string;
  text: string;
  textMuted: string;
  textDim: string;
  hoverBg: string;
  selectedBg: string;
  selectedBorder: string;
  accent: string;
  accentSoft: string;
  accentGradient: string;
  accentGlow: string;
  ring: string;
}

const ACCENT_GRADIENT_DARK = "linear-gradient(135deg, #fb923c 0%, #f97316 100%)";
const ACCENT_GRADIENT_LIGHT = "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)";

export const VO_DARK: VOTheme = {
  canvas: "#0b0e13",
  surfaceStrong: "#0b0e13",
  surface: "#080a0f",
  glass: "rgba(11, 14, 19, 0.95)",
  glassFaint: "rgba(11, 14, 19, 0.90)",
  blur: "blur(16px)",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  shadow: "0 24px 60px -15px rgba(0, 0, 0, 0.92)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  hoverBg: "rgba(255, 255, 255, 0.04)",
  selectedBg: "rgba(251, 146, 60, 0.14)",
  selectedBorder: "rgba(251, 146, 60, 0.65)",
  accent: "#fb923c",
  accentSoft: "rgba(251, 146, 60, 0.15)",
  accentGradient: ACCENT_GRADIENT_DARK,
  accentGlow: "0 10px 24px -8px rgba(251, 146, 60, 0.45)",
  ring: "#0b0e13",
};

export const VO_LIGHT: VOTheme = {
  canvas: "#f8fafc",
  surfaceStrong: "#ffffff",
  surface: "#f1f5f9",
  glass: "rgba(255, 255, 255, 0.95)",
  glassFaint: "rgba(255, 255, 255, 0.94)",
  blur: "blur(16px)",
  border: "rgba(15, 23, 42, 0.10)",
  borderStrong: "rgba(15, 23, 42, 0.22)",
  shadow: "0 20px 50px -12px rgba(15, 23, 42, 0.16)",
  text: "#0f172a",
  textMuted: "#475569",
  textDim: "#64748b",
  hoverBg: "rgba(15, 23, 42, 0.04)",
  selectedBg: "rgba(251, 146, 60, 0.12)",
  selectedBorder: "rgba(234, 88, 12, 0.55)",
  accent: "#ea580c",
  accentSoft: "rgba(251, 146, 60, 0.12)",
  accentGradient: ACCENT_GRADIENT_LIGHT,
  accentGlow: "0 10px 24px -8px rgba(234, 88, 12, 0.35)",
  ring: "#ffffff",
};

export const getVOTheme = (darkMode: boolean, customAccent?: string): VOTheme => {
  const base = darkMode ? VO_DARK : VO_LIGHT;
  if (!customAccent) return base;
  const { r, g, b } = hexToRgb(customAccent);
  return {
    ...base,
    accent: customAccent,
    accentSoft: `rgba(${r}, ${g}, ${b}, 0.15)`,
    selectedBg: `rgba(${r}, ${g}, ${b}, 0.14)`,
    selectedBorder: `rgba(${r}, ${g}, ${b}, 0.65)`,
    accentGlow: `0 10px 24px -8px rgba(${r}, ${g}, ${b}, 0.45)`,
  };
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = (hex || "").match(/#?([0-9a-fA-F]{6})/);
  const h = match ? match[1] : "fb923c";
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export const THEME_PRESETS = [
  { name: "Agentic Orange", color: "#fb923c", secondary: "#38bdf8" },
  { name: "Telemetry Sky", color: "#38bdf8", secondary: "#818cf8" },
  { name: "Sovereign Emerald", color: "#22c55e", secondary: "#10b981" },
  { name: "Quantum Violet", color: "#a855f7", secondary: "#ec4899" },
  { name: "Crimson Signal", color: "#f43f5e", secondary: "#fb923c" },
] as const;
