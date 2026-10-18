/**
 * Agentic OS / Virtual Office theme tokens.
 *
 * Mirrors the HUD and desktop shell look of Agentic OS (`components/agentic-os/AgenticOsDesktop.tsx`
 * & `app/admin/virtual-office/hud/shared.tsx`):
 *   border-white/15 · bg-[#0b0e13]/95 · text-slate-100 · shadow-[0_24px_60px_-15px_rgba(0,0,0,0.92)]
 * with crisp square edges, monospace chrome, white/5 hover, orange (#fb923c) / sky (#38bdf8) accents,
 * and synchronized dark/light surfaces.
 */

export interface VOTheme {
    /** Page backdrop behind everything (Agentic OS canvas colour). */
    canvas: string;
    /** Primary navigation surface (outer sider / panel). */
    surfaceStrong: string;
    /** Secondary surface (inner sider / elevated card). */
    surface: string;
    /** Floating panel surface (docks / windows / side panels). */
    glass: string;
    /** Dock surface used by floating docks. */
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
    /** Primary accent used for selected icons, focus rings, indicators (#fb923c). */
    accent: string;
    accentSoft: string;
    accentGradient: string;
    accentGlow: string;
    /** Ring around avatars/badges so they "cut out" of the surface. */
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
    text: "#f1f5f9", // slate-100
    textMuted: "#94a3b8", // slate-400
    textDim: "#64748b", // slate-500
    hoverBg: "rgba(255, 255, 255, 0.04)",
    selectedBg: "rgba(251, 146, 60, 0.14)",
    selectedBorder: "rgba(251, 146, 60, 0.65)",
    accent: "#fb923c", // orange-400 (Agentic OS signature accent)
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
    text: "#0f172a", // slate-900
    textMuted: "#475569", // slate-600
    textDim: "#64748b", // slate-500
    hoverBg: "rgba(15, 23, 42, 0.04)",
    selectedBg: "rgba(251, 146, 60, 0.12)",
    selectedBorder: "rgba(234, 88, 12, 0.55)",
    accent: "#ea580c", // orange-600
    accentSoft: "rgba(251, 146, 60, 0.12)",
    accentGradient: ACCENT_GRADIENT_LIGHT,
    accentGlow: "0 10px 24px -8px rgba(234, 88, 12, 0.35)",
    ring: "#ffffff",
};

export const getVOTheme = (darkMode: boolean): VOTheme => (darkMode ? VO_DARK : VO_LIGHT);

/** Agentic OS / VO status palette. */
export const VO_STATUS = {
    working: "#22c55e",
    thinking: "#a855f7",
    meeting: "#f59e0b",
    info: "#38bdf8",
    error: "#ef4444",
} as const;

