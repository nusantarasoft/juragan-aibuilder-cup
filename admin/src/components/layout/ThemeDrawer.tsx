"use client";

import React, { useState, useEffect } from "react";
import { Drawer, Typography, Space, Tooltip, Divider, Input, Button, message } from "antd";
import { CheckOutlined, BgColorsOutlined, FormatPainterOutlined } from "@ant-design/icons";
import { usePreferencesStore, type ThemePalette, DEFAULT_PALETTE, contrastText, darkenHex } from "@/store/usePreferencesStore";

const { Text, Title } = Typography;

// ─── Preset Palettes (5 colors each) ─────────────────────────────────────
const PRESET_THEMES: { name: string; description: string; palette: ThemePalette }[] = [
    {
        name: "Violet Dream",
        description: "Default NusantaraSoft theme",
        palette: { primary: "var(--theme-color, #8b5cf6)", secondary: "#6366f1", accent: "#a78bfa", sidebarBg: "#1e1b4b", headerBg: "#f5f3ff" },
    },
    {
        name: "Ocean Blue",
        description: "Clean and professional",
        palette: { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#60a5fa", sidebarBg: "#0f172a", headerBg: "#eff6ff" },
    },
    {
        name: "Emerald",
        description: "Fresh and natural",
        palette: { primary: "#10b981", secondary: "#059669", accent: "#34d399", sidebarBg: "#022c22", headerBg: "#ecfdf5" },
    },
    {
        name: "Sunset Rose",
        description: "Bold and energetic",
        palette: { primary: "#f43f5e", secondary: "#e11d48", accent: "#fb7185", sidebarBg: "#1c0a10", headerBg: "#fff1f2" },
    },
    {
        name: "Amber Gold",
        description: "Warm and inviting",
        palette: { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24", sidebarBg: "#1c1208", headerBg: "#fffbeb" },
    },
    {
        name: "Coral Pink",
        description: "Playful and modern",
        palette: { primary: "#ec4899", secondary: "#db2777", accent: "#f472b6", sidebarBg: "#1a0812", headerBg: "#fdf2f8" },
    },
    {
        name: "Teal",
        description: "Calm and balanced",
        palette: { primary: "#14b8a6", secondary: "#0d9488", accent: "#2dd4bf", sidebarBg: "#042f2e", headerBg: "#f0fdfa" },
    },
    {
        name: "Indigo Night",
        description: "Deep and focused",
        palette: { primary: "#6366f1", secondary: "#4f46e5", accent: "#818cf8", sidebarBg: "#1e1b4b", headerBg: "#eef2ff" },
    },
    {
        name: "Slate",
        description: "Minimal and neutral",
        palette: { primary: "#64748b", secondary: "#475569", accent: "#94a3b8", sidebarBg: "#0f172a", headerBg: "#f8fafc" },
    },
    {
        name: "Crimson",
        description: "Powerful and striking",
        palette: { primary: "#dc2626", secondary: "#b91c1c", accent: "#f87171", sidebarBg: "#1a0505", headerBg: "#fef2f2" },
    },
    {
        name: "Sky",
        description: "Light and airy",
        palette: { primary: "#0ea5e9", secondary: "#0284c7", accent: "#38bdf8", sidebarBg: "#0c1929", headerBg: "#f0f9ff" },
    },
    {
        name: "Lime",
        description: "Vibrant and fresh",
        palette: { primary: "#84cc16", secondary: "#65a30d", accent: "#a3e635", sidebarBg: "#141a08", headerBg: "#f7fee7" },
    },
];

const COLOR_LABELS: { key: keyof ThemePalette; label: string; desc: string }[] = [
    { key: "primary", label: "Primary", desc: "Buttons, active states, links" },
    { key: "secondary", label: "Secondary", desc: "Badges, accents" },
    { key: "accent", label: "Accent", desc: "Highlights, gradients" },
    { key: "sidebarBg", label: "Sidebar", desc: "Sidebar background" },
    { key: "headerBg", label: "Card Header", desc: "Card header tint" },
];

interface ThemeDrawerProps {
    visible: boolean;
    onClose: () => void;
    darkMode: boolean;
}

export default function ThemeDrawer({ visible, onClose, darkMode }: ThemeDrawerProps) {
    const { themePalette, setThemePalette } = usePreferencesStore();
    const [customPalette, setCustomPalette] = useState<ThemePalette>(themePalette);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        setCustomPalette(themePalette);
    }, [themePalette]);

    const handleSelectTheme = (palette: ThemePalette) => {
        setThemePalette(palette);
        setCustomPalette(palette);
        messageApi.success({ content: "Theme applied!", duration: 1.5 });
    };

    const handleCustomApply = () => {
        setThemePalette(customPalette);
        messageApi.success({ content: "Custom palette applied!", duration: 1.5 });
    };

    const updateCustomField = (key: keyof ThemePalette, value: string) => {
        setCustomPalette(prev => ({ ...prev, [key]: value }));
    };

    const isActivePreset = (palette: ThemePalette) =>
        palette.primary === themePalette.primary &&
        palette.secondary === themePalette.secondary &&
        palette.accent === themePalette.accent;

    const activePresetName = PRESET_THEMES.find(t => isActivePreset(t.palette))?.name || "Custom";

    const bgCard = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)";
    const borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

    return (
        <Drawer
            title={
                <Space>
                    <BgColorsOutlined style={{ color: themePalette.primary, fontSize: 20 }} />
                    <span>Theme Customizer</span>
                </Space>
            }
            placement="right"
            width={400}
            onClose={onClose}
            open={visible}
            styles={{
                body: { padding: 0 },
                header: { borderBottom: `2px solid ${themePalette.primary}` },
            }}
        >
            {contextHolder}
            <div style={{ padding: "20px 24px" }}>
                {/* ─── Active Theme Banner ─────── */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${themePalette.primary} 0%, ${themePalette.secondary} 50%, ${themePalette.accent} 100%)`,
                        borderRadius: 16,
                        padding: "20px 20px 16px",
                        marginBottom: 24,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ position: "absolute", bottom: -10, left: -10, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: 2 }}>
                        Active Theme
                    </Text>
                    <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                        {activePresetName}
                    </div>
                    {/* 5 color dots */}
                    <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                        {COLOR_LABELS.map(({ key }) => (
                            <Tooltip key={key} title={key}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: 6,
                                    background: themePalette[key],
                                    border: "2px solid rgba(255,255,255,0.4)",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }} />
                            </Tooltip>
                        ))}
                    </div>
                </div>

                {/* ─── Preset Themes Grid ─────── */}
                <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.6 }}>
                        Preset Themes
                    </Text>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
                    {PRESET_THEMES.map((preset) => {
                        const isActive = isActivePreset(preset.palette);
                        return (
                            <Tooltip key={preset.name} title={preset.description} placement="top">
                                <div
                                    onClick={() => handleSelectTheme(preset.palette)}
                                    style={{
                                        cursor: "pointer",
                                        borderRadius: 12,
                                        padding: "10px 12px",
                                        background: isActive ? `${preset.palette.primary}12` : bgCard,
                                        border: isActive ? `2px solid ${preset.palette.primary}` : `1px solid ${borderColor}`,
                                        transition: "all 0.25s ease",
                                        position: "relative",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = `0 4px 12px ${preset.palette.primary}30`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    {/* Checkmark */}
                                    {isActive && (
                                        <div style={{
                                            position: "absolute", top: 6, right: 6,
                                            width: 18, height: 18, borderRadius: 9,
                                            background: preset.palette.primary,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <CheckOutlined style={{ color: "#fff", fontSize: 10 }} />
                                        </div>
                                    )}
                                    {/* 5 color swatches */}
                                    <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                                        {COLOR_LABELS.map(({ key }) => (
                                            <div key={key} style={{
                                                flex: 1, height: 18, borderRadius: 4,
                                                background: preset.palette[key],
                                                border: key === "headerBg" ? `1px solid ${borderColor}` : "none",
                                            }} />
                                        ))}
                                    </div>
                                    <Text style={{
                                        fontSize: 11, fontWeight: isActive ? 700 : 500, display: "block",
                                        color: isActive ? preset.palette.primary : undefined,
                                    }}>
                                        {preset.name}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* ─── Custom Palette Section ─────── */}
                <Divider style={{ margin: "16px 0" }}>
                    <Space size={4}>
                        <FormatPainterOutlined style={{ color: themePalette.primary }} />
                        <Text style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.6 }}>Custom Palette</Text>
                    </Space>
                </Divider>

                <div style={{
                    background: bgCard,
                    borderRadius: 12,
                    padding: 16,
                    border: `1px solid ${borderColor}`,
                }}>
                    {/* 5 color pickers */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                        {COLOR_LABELS.map(({ key, label, desc }) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {/* Color picker swatch */}
                                <div style={{ position: "relative", flexShrink: 0 }}>
                                    <input
                                        type="color"
                                        value={customPalette[key]}
                                        onChange={(e) => updateCustomField(key, e.target.value)}
                                        style={{
                                            width: 36, height: 36, border: "none",
                                            borderRadius: 8, cursor: "pointer", padding: 0,
                                            background: "transparent",
                                        }}
                                    />
                                    <div style={{
                                        position: "absolute", inset: 0,
                                        borderRadius: 8, border: "2px solid rgba(0,0,0,0.08)",
                                        pointerEvents: "none",
                                    }} />
                                </div>
                                {/* Label + hex */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text strong style={{ fontSize: 12, display: "block" }}>{label}</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{desc}</Text>
                                </div>
                                {/* Hex input */}
                                <Input
                                    size="small"
                                    value={customPalette[key]}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        updateCustomField(key, v);
                                    }}
                                    style={{ width: 82, fontFamily: "monospace", fontSize: 11 }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Preview strip */}
                    <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{
                            background: `linear-gradient(135deg, ${customPalette.primary} 0%, ${customPalette.secondary} 50%, ${customPalette.accent} 100%)`,
                            padding: "10px 14px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                            <Text style={{ color: contrastText(customPalette.primary), fontSize: 12, fontWeight: 600 }}>Header Preview</Text>
                            <Space size={4}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.8)" }} />
                            </Space>
                        </div>
                        <div style={{
                            background: customPalette.headerBg,
                            padding: "10px 14px",
                            display: "flex", gap: 8,
                            borderBottom: `1px solid ${borderColor}`,
                        }}>
                            <div style={{
                                padding: "3px 10px", borderRadius: 6,
                                background: customPalette.primary, color: contrastText(customPalette.primary),
                                fontSize: 10, fontWeight: 600,
                            }}>Primary</div>
                            <div style={{
                                padding: "3px 10px", borderRadius: 6,
                                background: customPalette.secondary, color: contrastText(customPalette.secondary),
                                fontSize: 10, fontWeight: 600,
                            }}>Secondary</div>
                            <div style={{
                                padding: "3px 10px", borderRadius: 6,
                                background: customPalette.accent, color: contrastText(customPalette.accent),
                                fontSize: 10, fontWeight: 600,
                            }}>Accent</div>
                        </div>
                        <div style={{
                            background: customPalette.sidebarBg,
                            padding: "8px 14px",
                            display: "flex", alignItems: "center", gap: 6,
                        }}>
                            <div style={{
                                width: 6, height: 20, borderRadius: 3,
                                background: customPalette.primary,
                            }} />
                            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Sidebar Preview</Text>
                        </div>
                    </div>

                    <Button
                        type="primary"
                        block
                        onClick={handleCustomApply}
                        style={{
                            background: `linear-gradient(135deg, ${customPalette.primary}, ${customPalette.secondary})`,
                            border: "none",
                            borderRadius: 8,
                            height: 36,
                            fontWeight: 600,
                        }}
                    >
                        Apply Custom Palette
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
