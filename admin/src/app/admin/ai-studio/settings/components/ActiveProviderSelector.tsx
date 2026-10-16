"use client";

import React from "react";
import { Form, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
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
                            borderRadius: 10,
                            border: selected ? "2px solid #1677ff" : "1px solid #e5e7eb",
                            background: selected ? "#eff6ff" : "#ffffff",
                            cursor: "pointer",
                            minHeight: 96,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            boxShadow: selected ? "0 0 0 1px rgba(22,119,255,0.15)" : "none",
                            transition: "border-color 0.15s, background 0.15s",
                        }}
                    >
                        <Text
                            strong
                            style={{
                                fontSize: 13,
                                lineHeight: 1.3,
                                color: "#111827",
                            }}
                        >
                            {SHORT_LABELS[p]}
                        </Text>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {selected && (
                                <Tag color="blue" style={{ margin: 0 }}>
                                    Aktif
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
                                style={{ margin: 0 }}
                            >
                                {meta?.configured ? "Siap" : "Setup"}
                            </Tag>
                        </div>

                        {meta?.model && (
                            <Text
                                type="secondary"
                                ellipsis
                                style={{ fontSize: 11, lineHeight: 1.3, maxWidth: "100%" }}
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
