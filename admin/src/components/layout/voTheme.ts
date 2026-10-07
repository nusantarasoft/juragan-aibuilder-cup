/**
 * Virtual Office theme tokens.
 *
 * Mirrors the HUD look of the 3D Virtual Office (`app/admin/virtual-office/hud/shared.tsx` → `GLASS`):
 *   border-white/10 · bg-slate-950/70 · text-slate-100 · shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] · backdrop-blur-xl
 * with rounded-2xl panels, rounded-xl items, white/5 hover, white/10 + white/25-border selection,
 * and an indigo → cyan accent gradient.
 *
 * Dark mode is the exact VO palette; light mode is a matching light-glass variant
 * (same shapes, hairlines and accents, inverted surfaces).
 */

export interface VOTheme {
    /** Page backdrop behind everything (VO canvas colour). */
    canvas: string;
    /** Primary navigation surface (outer sider). */
    surfaceStrong: string;
    /** Secondary surface (inner sider). */
    surface: string;
    /** Floating glass (docks / orb children). */
    glass: string;
    /** Low-alpha glass used by the docks (kept very transparent on purpose). */
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
    /** Accent used for selected icons, focus rings, etc. */
    accent: string;
    accentSoft: string;
    accentGradient: string;
    accentGlow: string;
    /** Ring around avatars/badges so they "cut out" of the surface. */
    ring: string;
}

const ACCENT_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)"; // indigo-500 → cyan-400

export const VO_DARK: VOTheme = {
    canvas: "#05070d",
    surfaceStrong: "rgba(2, 6, 23, 0.92)", // slate-950
    surface: "rgba(2, 6, 23, 0.78)",
    glass: "rgba(2, 6, 23, 0.70)", // exact VO GLASS
    glassFaint: "rgba(2, 6, 23, 0.05)",
    blur: "blur(24px) saturate(160%)",
    border: "rgba(255, 255, 255, 0.10)",
    borderStrong: "rgba(255, 255, 255, 0.25)",
    shadow: "0 20px 60px -20px rgba(0, 0, 0, 0.7)",
    text: "#f1f5f9", // slate-100
    textMuted: "#94a3b8", // slate-400
    textDim: "#64748b", // slate-500
    hoverBg: "rgba(255, 255, 255, 0.05)",
    selectedBg: "rgba(255, 255, 255, 0.10)",
    selectedBorder: "rgba(255, 255, 255, 0.25)",
    accent: "#67e8f9", // cyan-300
    accentSoft: "rgba(34, 211, 238, 0.15)",
    accentGradient: ACCENT_GRADIENT,
    accentGlow: "0 10px 30px -8px rgba(99, 102, 241, 0.55)",
    ring: "#020617", // slate-950
};

export const VO_LIGHT: VOTheme = {
    canvas: "#f1f5f9",
    surfaceStrong: "rgba(255, 255, 255, 0.92)",
    surface: "rgba(255, 255, 255, 0.78)",
    glass: "rgba(255, 255, 255, 0.72)",
    glassFaint: "rgba(255, 255, 255, 0.05)",
    blur: "blur(24px) saturate(160%)",
    border: "rgba(15, 23, 42, 0.08)",
    borderStrong: "rgba(15, 23, 42, 0.16)",
    shadow: "0 20px 60px -24px rgba(15, 23, 42, 0.25)",
    text: "#0f172a", // slate-900
    textMuted: "#64748b", // slate-500
    textDim: "#94a3b8", // slate-400
    hoverBg: "rgba(15, 23, 42, 0.04)",
    selectedBg: "rgba(15, 23, 42, 0.06)",
    selectedBorder: "rgba(15, 23, 42, 0.16)",
    accent: "#4f46e5", // indigo-600
    accentSoft: "rgba(99, 102, 241, 0.12)",
    accentGradient: ACCENT_GRADIENT,
    accentGlow: "0 10px 30px -8px rgba(99, 102, 241, 0.45)",
    ring: "#ffffff",
};

export const getVOTheme = (darkMode: boolean): VOTheme => (darkMode ? VO_DARK : VO_LIGHT);

/** VO status palette (from `virtual-office/lib/floorplan.ts` STATUS_META / TopBar stats). */
export const VO_STATUS = {
    working: "#22c55e",
    thinking: "#a855f7",
    meeting: "#f59e0b",
    info: "#38bdf8",
    error: "#ef4444",
} as const;
