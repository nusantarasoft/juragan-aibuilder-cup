"use client";

import React from "react";

/* ═══ Design Reference Tokens ═══ */
export const DASH_COLORS = {
    primary: '#7c3aed',
    primaryLight: '#8b5cf6',
    surface: '#ffffff',
    background: '#f5f5f7',
    textPrimary: '#1a1a2e',
    textSecondary: '#6b7280',
    textOnPrimary: '#ffffff',
    /* Accent card backgrounds */
    incidentGreen: 'linear-gradient(135deg, #e8faf0 0%, #d1fae5 50%, #f0fdf4 100%)',
    pipelinePurple: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #faf5ff 100%)',
    availBlue: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #f0f9ff 100%)',
    workforcePeach: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fffbeb 100%)',
    /* Stat accent colors */
    green: '#10b981',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    red: '#ef4444',
    cyan: '#06b6d4',
    teal: '#13c2c2',
    pink: '#ec4899',
    rose: '#f43f5e',
};

export const DASH_CARD = {
    borderRadius: 14,
    shadow: '0 1px 3px rgba(0,0,0,0.05)',
    shadowHover: '0 4px 12px rgba(0,0,0,0.08)',
    padding: 20,
    border: '1px solid rgba(0,0,0,0.06)',
};

/* ═══ Animation Keyframes ═══ */
export const dashboardAnimStyles = `
@keyframes dashFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes dashScaleIn {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
}
.dash-card-new {
    animation: dashFadeUp 0.45s ease both;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border-radius: ${DASH_CARD.borderRadius}px !important;
    box-shadow: ${DASH_CARD.shadow};
}
.dash-card-new:hover {
    transform: translateY(-2px);
    box-shadow: ${DASH_CARD.shadowHover};
}
.dash-stat-lg .ant-statistic-content-value {
    font-weight: 700 !important;
}
.dash-stat-lg .ant-statistic-title {
    font-size: 12px !important;
    color: ${DASH_COLORS.textSecondary} !important;
}
`;

/* ═══ DashboardStyles Component ═══ */
export const DashboardStyles: React.FC = () => <style>{dashboardAnimStyles}</style>;
export default DashboardStyles;
