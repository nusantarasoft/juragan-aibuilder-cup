"use client";

import React from "react";
import { Button, Skeleton } from "antd";
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DatabaseOutlined,
    ExperimentOutlined,
    RobotOutlined,
    WhatsAppOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import type { StudioAiStatus } from "../types";
import { AFFECTED_MODULES, PROVIDER_LABELS } from "../types";
import type { WaGatewaySummary } from "./WhatsAppGatewayPanel";

type Props = {
    status: StudioAiStatus | null;
    loading?: boolean;
    waSummary?: WaGatewaySummary | null;
    onOpenTab?: (tabKey: string) => void;
};

export default function SettingsOverview({ status, loading, waSummary, onOpenTab }: Props) {
    const { darkMode, themeColor = "#fb923c" } = useAdminLayout();
    const t = getVOTheme(darkMode);

    if (loading || !status) {
        return <Skeleton active paragraph={{ rows: 4 }} />;
    }

    const activeReady = status.providers.find((p) => p.provider === status.llmProvider)?.configured;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* RUNTIME READINESS BANNER */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "6px 10px",
                    background: activeReady ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${activeReady ? "rgba(34,197,94,0.35)" : "rgba(245,158,11,0.4)"}`,
                    borderLeft: `2px solid ${activeReady ? "#22c55e" : "#f59e0b"}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.textPrimary }}>
                    {activeReady ? (
                        <CheckCircleOutlined style={{ color: "#22c55e" }} />
                    ) : (
                        <CloseCircleOutlined style={{ color: "#f59e0b" }} />
                    )}
                    <span>
                        {activeReady
                            ? `Active runtime: ${PROVIDER_LABELS[status.llmProvider]} / ${status.llmModel}`
                            : `Active provider (${PROVIDER_LABELS[status.llmProvider]}) is not ready — complete configuration then Save.`}
                    </span>
                </div>
                <Link href="/admin/ai-studio">
                    <Button size="small" icon={<ExperimentOutlined />} style={{ borderRadius: 0, fontSize: 10.5, height: 22 }}>
                        Open AI Studio
                    </Button>
                </Link>
            </div>

            {/* 3-COLUMN TELEMETRY STRIP: CHAT LLM + VECTOR EMBEDDING + WHATSAPP GATEWAY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 1. Chat LLM */}
                <div
                    style={{
                        padding: "8px 10px",
                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                        border: `1px solid ${t.border}`,
                        borderTop: `2px solid ${themeColor}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="font-mono uppercase" style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.06em" }}>
                            <RobotOutlined style={{ color: themeColor, marginRight: 4 }} /> ACTIVE CHAT LLM
                        </span>
                        <span
                            className="font-mono uppercase"
                            style={{
                                fontSize: 8.5,
                                padding: "0px 4px",
                                background: activeReady ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                                color: activeReady ? "#22c55e" : "#f59e0b",
                            }}
                        >
                            {activeReady ? "READY" : "SETUP"}
                        </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                        {PROVIDER_LABELS[status.llmProvider]}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10.5, color: themeColor }}>
                        {status.llmModel}
                    </div>
                </div>

                {/* 2. Vector Embedding */}
                <div
                    style={{
                        padding: "8px 10px",
                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                        border: `1px solid ${t.border}`,
                        borderTop: "2px solid #38bdf8",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        cursor: onOpenTab ? "pointer" : "default",
                    }}
                    onClick={() => onOpenTab?.("embeddings")}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="font-mono uppercase" style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.06em" }}>
                            <DatabaseOutlined style={{ color: "#38bdf8", marginRight: 4 }} /> VECTOR EMBEDDING
                        </span>
                        <span className="font-mono uppercase" style={{ fontSize: 8.5, color: "#38bdf8" }}>
                            RAG ENGINE
                        </span>
                    </div>
                    <div className="font-mono uppercase" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                        {status.embeddingProvider}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10.5, color: "#38bdf8" }}>
                        {status.embeddingModel}
                    </div>
                </div>

                {/* 3. WhatsApp Gateway (Hermes) */}
                <div
                    style={{
                        padding: "8px 10px",
                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                        border: `1px solid ${t.border}`,
                        borderTop: `2px solid ${waSummary?.connected ? "#22c55e" : "#f59e0b"}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        cursor: onOpenTab ? "pointer" : "default",
                    }}
                    onClick={() => onOpenTab?.("whatsapp")}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="font-mono uppercase" style={{ fontSize: 9.5, color: t.textMuted, letterSpacing: "0.06em" }}>
                            <WhatsAppOutlined style={{ color: waSummary?.connected ? "#22c55e" : "#f59e0b", marginRight: 4 }} /> WHATSAPP GATEWAY
                        </span>
                        <span
                            className="font-mono uppercase"
                            style={{
                                fontSize: 8.5,
                                padding: "0px 4px",
                                background: waSummary?.connected ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                                color: waSummary?.connected ? "#22c55e" : "#f59e0b",
                            }}
                        >
                            {waSummary?.connected ? "WORKING" : waSummary?.status || "CHECK"}
                        </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                        {waSummary?.businessPhone ? `+${waSummary.businessPhone}` : "Hermes Bridge"}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10.5, color: t.textSecondary }}>
                        Tenant: <strong>{waSummary?.activeTenant || "default"}</strong> · Bot {waSummary?.botEnabled ? "Active" : "Off"}
                    </div>
                </div>
            </div>

            {/* PLATFORM MODULES BOUND TO ACTIVE LLM */}
            <div
                style={{
                    padding: "8px 10px",
                    background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                    border: `1px solid ${t.border}`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        paddingBottom: 5,
                        borderBottom: `1px solid ${t.border}`,
                    }}
                >
                    <span className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                        Modules Bound to Active LLM Runtime
                    </span>
                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                        {AFFECTED_MODULES.length} SURFACES SYNCED
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {AFFECTED_MODULES.map((item) => (
                        <div
                            key={item}
                            style={{
                                padding: "4px 8px",
                                background: darkMode ? "#0b0e13" : "#ffffff",
                                border: `1px solid ${t.border}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 11,
                                color: t.textSecondary,
                            }}
                        >
                            <CheckCircleOutlined style={{ color: "#22c55e", fontSize: 11 }} />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* STANDBY PROVIDERS STRIP */}
            <div
                style={{
                    padding: "8px 10px",
                    background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                    border: `1px solid ${t.border}`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                    }}
                >
                    <span className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                        Other Providers (Standby)
                    </span>
                    {onOpenTab && (
                        <button
                            type="button"
                            onClick={() => onOpenTab("chat_llm")}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                padding: "1px 6px",
                                border: `1px solid ${t.border}`,
                                background: "transparent",
                                color: themeColor,
                                cursor: "pointer",
                            }}
                        >
                            Configure Standby Keys →
                        </button>
                    )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {status.providers
                        .filter((p) => p.provider !== status.llmProvider)
                        .map((p) => (
                            <span
                                key={p.provider}
                                className="font-mono"
                                style={{
                                    fontSize: 10,
                                    padding: "2px 7px",
                                    background: darkMode ? "#0b0e13" : "#ffffff",
                                    border: `1px solid ${p.configured ? "rgba(34,197,94,0.35)" : t.border}`,
                                    color: p.configured ? "#22c55e" : t.textMuted,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                {p.configured ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                {PROVIDER_LABELS[p.provider]}
                            </span>
                        ))}
                </div>
            </div>
        </div>
    );
}
