"use client";

import React from "react";
import { Collapse } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import ProviderPanel from "./ProviderPanel";
import type { LlmProvider, StudioAiStatus } from "../types";
import { PROVIDER_LABELS } from "../types";

type Props = {
    activeProvider: LlmProvider | undefined;
    status: StudioAiStatus | null;
};

export default function OptionalProvidersPanel({ activeProvider, status }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);

    const inactive = (["anthropic", "google", "openai", "groq", "openrouter", "ollama"] as LlmProvider[]).filter(
        (p) => p !== activeProvider,
    );

    if (inactive.length === 0) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
                style={{
                    padding: "6px 10px",
                    background: "rgba(56,189,248,0.08)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    borderLeft: "2px solid #38bdf8",
                    fontSize: 11,
                    color: t.textSecondary,
                }}
            >
                <strong className="font-mono uppercase" style={{ fontSize: 10, color: "#38bdf8", marginRight: 6 }}>
                    STANDBY VAULT:
                </strong>
                Only the provider marked <strong>ACTIVE</strong> is used at runtime across CRM, ITSM, PM, and AI Studio. Pre-store credentials below for 1-click failover switching.
            </div>

            <Collapse
                size="small"
                defaultActiveKey={[inactive[0]]}
                style={{ borderRadius: 0, border: `1px solid ${t.border}`, background: "transparent" }}
                items={inactive.map((p) => {
                    const ready = status?.providers.find((x) => x.provider === p)?.configured;
                    const model = status?.providers.find((x) => x.provider === p)?.model;
                    return {
                        key: p,
                        label: (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 700, color: t.textPrimary }}>
                                        {PROVIDER_LABELS[p]}
                                    </span>
                                    <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                                        (standby)
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {model && (
                                        <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                            {model}
                                        </span>
                                    )}
                                    <span
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 9,
                                            padding: "0px 5px",
                                            background: ready ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
                                            border: `1px solid ${ready ? "rgba(34,197,94,0.35)" : t.border}`,
                                            color: ready ? "#22c55e" : t.textMuted,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 3,
                                        }}
                                    >
                                        {ready ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                        {ready ? "CONFIGURED" : "UNSET"}
                                    </span>
                                </div>
                            </div>
                        ),
                        children: (
                            <ProviderPanel
                                provider={p}
                                isActive={false}
                                configured={ready}
                            />
                        ),
                    };
                })}
            />
        </div>
    );
}
