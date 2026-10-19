"use client";

import React from "react";
import { Col, Form, Row, Select } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import ModelSelect from "./ModelSelect";
import { EMBEDDING_PROVIDER_OPTIONS } from "../constants/modelCatalog";
import type { LlmProvider } from "../types";
import { PROVIDER_LABELS } from "../types";

type Props = {
    activeProvider?: LlmProvider;
};

export default function EmbeddingPanel({ activeProvider }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const embeddingProvider = Form.useWatch("default_embedding_provider");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeProvider === "ollama" && (
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
                        LOCAL RAG NOTE:
                    </strong>
                    Active LLM is <strong>{PROVIDER_LABELS.ollama}</strong>. For local RAG, select Embedding Provider = <strong>Ollama</strong> and pull <code>nomic-embed-text</code>.
                </div>
            )}
            {(activeProvider === "groq" || activeProvider === "openrouter") && (
                <div
                    style={{
                        padding: "6px 10px",
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        borderLeft: "2px solid #f59e0b",
                        fontSize: 11,
                        color: t.textSecondary,
                    }}
                >
                    <strong className="font-mono uppercase" style={{ fontSize: 10, color: "#f59e0b", marginRight: 6 }}>
                        EXTERNAL EMBEDDING:
                    </strong>
                    Active LLM is <strong>{PROVIDER_LABELS[activeProvider]}</strong> (chat-only). Select <strong>Google / OpenAI / Ollama</strong> below for document vectorization.
                </div>
            )}

            <div
                style={{
                    background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                    border: `1px solid ${t.border}`,
                    borderTop: "2px solid #38bdf8",
                    padding: "10px 12px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: 6,
                        marginBottom: 8,
                        borderBottom: `1px solid ${t.border}`,
                    }}
                >
                    <span className="font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                        <DatabaseOutlined style={{ color: "#38bdf8", marginRight: 6 }} />
                        Vector Embedding Engine (RAG & Document Search)
                    </span>
                    <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                        Independent from Chat LLM
                    </span>
                </div>

                <Form.Item
                    name="default_embedding_provider"
                    label={
                        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
                            Embedding Provider
                        </span>
                    }
                    rules={[{ required: true }]}
                    preserve
                    style={{ marginBottom: 8 }}
                >
                    <Select size="small" options={EMBEDDING_PROVIDER_OPTIONS} style={{ borderRadius: 0, fontSize: 11.5 }} />
                </Form.Item>

                {embeddingProvider === "vertex" && (
                    <div
                        className="font-mono"
                        style={{
                            padding: "5px 8px",
                            marginBottom: 8,
                            background: "rgba(56,189,248,0.08)",
                            border: "1px solid rgba(56,189,248,0.28)",
                            fontSize: 10.5,
                            color: t.textSecondary,
                        }}
                    >
                        Vertex embedding uses Project ID &amp; Service Account from the Google panel.
                    </div>
                )}

                <Row gutter={8}>
                    {(embeddingProvider === "auto" || embeddingProvider === "google_ai" || embeddingProvider === "vertex") && (
                        <Col xs={24} md={embeddingProvider === "auto" ? 8 : 24}>
                            <ModelSelect
                                name="google_embedding_model"
                                label="Google Embedding Model"
                                embeddingProvider="google"
                            />
                        </Col>
                    )}

                    {(embeddingProvider === "openai" || embeddingProvider === "auto") && (
                        <Col xs={24} md={embeddingProvider === "auto" ? 8 : 24}>
                            <ModelSelect
                                name="openai_embedding_model"
                                label="OpenAI Embedding Model"
                                embeddingProvider="openai"
                            />
                        </Col>
                    )}

                    {(embeddingProvider === "ollama" || embeddingProvider === "auto") && (
                        <Col xs={24} md={embeddingProvider === "auto" ? 8 : 24}>
                            <ModelSelect
                                name="ollama_embedding_model"
                                label="Ollama Embedding Model"
                                embeddingProvider="ollama"
                            />
                        </Col>
                    )}
                </Row>
            </div>
        </div>
    );
}
