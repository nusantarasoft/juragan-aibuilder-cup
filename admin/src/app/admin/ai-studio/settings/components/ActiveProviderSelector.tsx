"use client";

import React from "react";
import { Form } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import type { LlmProvider, StudioAiStatus } from "../types";
import { PROVIDER_LABELS } from "../types";

const PROVIDERS: LlmProvider[] = ["anthropic", "google", "openai", "groq", "openrouter", "ollama"];

const SHORT_LABELS: Record<LlmProvider, string> = {
    anthropic: "Anthropic",
    google: "Google",
    openai: "OpenAI",
    groq: "Groq",
    openrouter: "OpenRouter",
    ollama: "Ollama",
};

const PROVIDER_CODES: Record<LlmProvider, string> = {
    anthropic: "ANT",
    google: "GGL",
    openai: "OAI",
    groq: "GRQ",
    openrouter: "ORT",
    ollama: "OLM",
};

type Props = {
    status: StudioAiStatus | null;
};

export default function ActiveProviderSelector({ status }: Props) {
    const { darkMode, themeColor = "#fb923c" } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const form = Form.useFormInstance();
    const active = Form.useWatch("default_llm_provider") as LlmProvider | undefined;

    const selectProvider = (p: LlmProvider) => {
        form.setFieldValue("default_llm_provider", p);
        if (p === "ollama") {
            form.setFieldValue("default_embedding_provider", "ollama");
        }
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 5,
            }}
        >
            {PROVIDERS.map((p) => {
                const meta = status?.providers.find((x) => x.provider === p);
                const selected = active === p;
                const ready = !!meta?.configured;

                return (
                    <div
                        key={p}
                        role="button"
                        tabIndex={0}
                        title={PROVIDER_LABELS[p]}
                        onClick={() => selectProvider(p)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                selectProvider(p);
                            }
                        }}
                        style={{
                            padding: "6px 8px",
                            borderRadius: 0,
                            border: `1px solid ${selected ? themeColor : t.border}`,
                            borderTop: `2px solid ${selected ? themeColor : ready ? "#22c55e" : t.border}`,
                            background: selected
                                ? `${themeColor}14`
                                : darkMode
                                  ? "rgba(255,255,255,0.015)"
                                  : "#f8fafc",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            transition: "all 0.12s ease",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: selected ? themeColor : t.textPrimary,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {SHORT_LABELS[p]}
                            </span>
                            <span
                                className="font-mono"
                                style={{
                                    fontSize: 8.5,
                                    padding: "0px 3px",
                                    background: selected ? `${themeColor}25` : "rgba(148,163,184,0.12)",
                                    color: selected ? themeColor : t.textMuted,
                                }}
                            >
                                {PROVIDER_CODES[p]}
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 8.5,
                                    padding: "0px 4px",
                                    background: ready ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
                                    border: `1px solid ${ready ? "rgba(34,197,94,0.35)" : t.border}`,
                                    color: ready ? "#22c55e" : t.textMuted,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                }}
                            >
                                {ready ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                {ready ? "READY" : "SETUP"}
                            </span>
                            {selected && (
                                <span
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 8.5,
                                        padding: "0px 4px",
                                        background: `${themeColor}22`,
                                        border: `1px solid ${themeColor}55`,
                                        color: themeColor,
                                        fontWeight: 700,
                                    }}
                                >
                                    ACTIVE
                                </span>
                            )}
                        </div>

                        <div
                            className="font-mono"
                            style={{
                                fontSize: 9.5,
                                color: t.textMuted,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                            title={meta?.model || "Default model"}
                        >
                            {meta?.model || "—"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
