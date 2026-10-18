"use client";

import React from "react";

/* ═══ Design Reference Tokens (Agentic OS aligned) ═══ */
export const DASH_COLORS = {
    primary: '#fb923c',
    primaryLight: '#fdba74',
    surface: '#0b0e13',
    background: '#080a0f',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textOnPrimary: '#0b0e13',
    /* Accent card backgrounds */
    incidentGreen: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
    pipelinePurple: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.04) 100%)',
    availBlue: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.04) 100%)',
    workforcePeach: 'linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(251,146,60,0.04) 100%)',
    /* Stat accent colors */
    green: '#22c55e',
    blue: '#38bdf8',
    purple: '#a855f7',
    amber: '#f59e0b',
    red: '#ef4444',
    cyan: '#22d3ee',
    teal: '#14b8a6',
    pink: '#ec4899',
    rose: '#f43f5e',
};

export const DASH_CARD = {
    borderRadius: 0,
    shadow: 'none',
    shadowHover: '0 12px 30px -10px rgba(0,0,0,0.35)',
    padding: 16,
    border: '1px solid rgba(148,163,184,0.18)',
};

/* ═══ Animation Keyframes ═══ */
export const dashboardAnimStyles = `
@keyframes dashFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes dashScaleIn {
    from { opacity: 0; transform: scale(0.98); }
    to   { opacity: 1; transform: scale(1); }
}
.dash-card-new {
    animation: dashFadeUp 0.3s ease both;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    border-radius: 0px !important;
    box-shadow: ${DASH_CARD.shadow};
}
.dash-card-new:hover {
    border-color: rgba(251, 146, 60, 0.45) !important;
    box-shadow: ${DASH_CARD.shadowHover};
}
.dash-stat-lg .ant-statistic-content-value {
    font-weight: 600 !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}
.dash-stat-lg .ant-statistic-title {
    font-size: 10px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.14em !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    color: ${DASH_COLORS.textSecondary} !important;
}
.aos-root.aos-light .dash-card-new {
    background: #ffffff !important;
    border-color: rgba(15, 23, 42, 0.12) !important;
    color: #0f172a !important;
}
.aos-root.aos-light .dash-card-new .ant-typography,
.aos-root.aos-light .dash-main-title {
    color: #0f172a !important;
}
.aos-root.aos-light .dash-card-new .ant-typography-secondary {
    color: #475569 !important;
}
.dash-module-tile:hover {
    border-color: rgba(251, 146, 60, 0.5) !important;
    background: rgba(251, 146, 60, 0.08) !important;
}
.aos-root.aos-light .dash-module-tile {
    background: #f8fafc !important;
    border-top-color: rgba(15, 23, 42, 0.1) !important;
    border-right-color: rgba(15, 23, 42, 0.1) !important;
    border-bottom-color: rgba(15, 23, 42, 0.1) !important;
}
`;

/* ═══ DashboardStyles Component ═══ */
export const DashboardStyles: React.FC = () => <style>{dashboardAnimStyles}</style>;
export default DashboardStyles;
