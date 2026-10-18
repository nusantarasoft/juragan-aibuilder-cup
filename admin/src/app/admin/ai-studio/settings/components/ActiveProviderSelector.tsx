"use client";

import React from "react";
import { Form, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import type { LlmProvider, StudioAiStatus } from "../types";
import { PROVIDER_LABELS } from "../types";

const { Text } = Typography;

const PROVIDERS: LlmProvider[] = ["anthropic", "google", "openai", "groq", "openrouter", "ollama"];

/** Short labels for compact cards (full name still in title attr). */
const SHORT_LABELS: Record<LlmProvider, string> = {
    anthropic: "Anthropic",
    google: "Google",
    openai: "OpenAI",
    groq: "Groq",
    openrouter: "OpenRouter",
    ollama: "Ollama",
};

type Props = {
    status: StudioAiStatus | null;
};

export default function ActiveProviderSelector({ status }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const form = Form.useFormInstance();
    const active = Form.useWatch("default_llm_provider") as LlmProvider | undefined;

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
            }}
        >
            {PROVIDERS.map((p) => {
                const meta = status?.providers.find((x) => x.provider === p);
                const selected = active === p;
                return (
                    <div
                        key={p}
                        role="button"
                        tabIndex={0}
                        title={PROVIDER_LABELS[p]}
                        onClick={() => {
                            form.setFieldValue("default_llm_provider", p);
                            if (p === "ollama") {
                                form.setFieldValue("default_embedding_provider", "ollama");
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                form.setFieldValue("default_llm_provider", p);
                                if (p === "ollama") {
                                    form.setFieldValue("default_embedding_provider", "ollama");
                                }
                            }
                        }}
                        style={{
                            padding: "12px 14px",
                            borderRadius: 0,
                            border: selected ? "1px solid #fb923c" : `1px solid ${t.cardBorder}`,
                            borderTop: selected ? "2px solid #fb923c" : `1px solid ${t.cardBorder}`,
                            background: selected ? "rgba(251,146,60,0.08)" : t.surfaceBg,
                            cursor: "pointer",
                            minHeight: 96,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            transition: "border-color 0.15s, background 0.15s",
                        }}
                    >
                        <Text
                            strong
                            className="font-mono uppercase tracking-[0.04em]"
                            style={{
                                fontSize: 12,
                                lineHeight: 1.3,
                                color: selected ? "#fb923c" : t.textPrimary,
                            }}
                        >
                            {SHORT_LABELS[p]}
                        </Text>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {selected && (
                                <Tag color="orange" style={{ margin: 0, borderRadius: 0 }}>
                                    Active
                                </Tag>
                            )}
                            <Tag
                                color={meta?.configured ? "success" : "default"}
                                icon={
                                    meta?.configured ? (
                                        <CheckCircleOutlined />
                                    ) : (
                                        <CloseCircleOutlined />
                                    )
                                }
                                style={{ margin: 0, borderRadius: 0 }}
                            >
                                {meta?.configured ? "Ready" : "Setup"}
                            </Tag>
                        </div>

                        {meta?.model && (
                            <Text
                                ellipsis
                                className="font-mono"
                                style={{ fontSize: 11, lineHeight: 1.3, maxWidth: "100%", color: t.textMuted }}
                                title={meta.model}
                            >
                                {meta.model}
                            </Text>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
