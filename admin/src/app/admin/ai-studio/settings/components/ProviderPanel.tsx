"use client";

import React from "react";
import { Col, Form, Input, InputNumber, Row } from "antd";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import ApiKeyField from "./ApiKeyField";
import ModelSelect from "./ModelSelect";
import ConnectionTestButton from "./ConnectionTestButton";
import VertexServiceAccountField from "./VertexServiceAccountField";
import type { LlmProvider } from "../types";
import { PROVIDER_LABELS } from "../types";

type Props = {
    provider: LlmProvider;
    isActive?: boolean;
    configured?: boolean;
};

export default function ProviderPanel({ provider, isActive = true, configured }: Props) {
    const { darkMode, themeColor = "#fb923c" } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const anthropicKeyConfigured = Form.useWatch("anthropic_api_key_configured");
    const googleKeyConfigured = Form.useWatch("google_api_key_configured");
    const googleSaConfigured = Form.useWatch("google_service_account_configured");
    const openaiKeyConfigured = Form.useWatch("openai_api_key_configured");
    const groqKeyConfigured = Form.useWatch("groq_api_key_configured");
    const openrouterKeyConfigured = Form.useWatch("openrouter_api_key_configured");

    const req = isActive ? [{ required: true, message: "Required for active provider" }] : [];

    const labelSpan = (txt: string) => (
        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
            {txt}
        </span>
    );

    const inner = (
        <div>
            {provider === "anthropic" && (
                <>
                    <ApiKeyField
                        name="anthropic_api_key"
                        label="Anthropic API Key"
                        configured={!!anthropicKeyConfigured}
                        clearFieldName="clear_anthropic_api_key"
                        placeholder="sk-ant-api03-..."
                    />
                    <Row gutter={8}>
                        <Col xs={24} sm={16}>
                            <ModelSelect
                                name="anthropic_model"
                                label="Chat Model"
                                provider="anthropic"
                                rules={req}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="anthropic_max_tokens"
                                label={labelSpan("Max Output Tokens")}
                                preserve
                                style={{ marginBottom: 8 }}
                            >
                                <InputNumber size="small" min={64} max={8192} style={{ width: "100%", borderRadius: 0 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            )}

            {provider === "google" && (
                <>
                    <ApiKeyField
                        name="google_api_key"
                        label="Google AI Studio API Key"
                        configured={!!googleKeyConfigured}
                        clearFieldName="clear_google_api_key"
                        placeholder="AIzaSy..."
                    />
                    <Row gutter={8}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="google_project_id"
                                label={labelSpan("Vertex Project ID")}
                                preserve
                                style={{ marginBottom: 8 }}
                            >
                                <Input size="small" placeholder="my-gcp-project" style={{ borderRadius: 0, fontSize: 11.5 }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="google_location"
                                label={labelSpan("Vertex Location")}
                                preserve
                                style={{ marginBottom: 8 }}
                            >
                                <Input size="small" placeholder="us-central1" style={{ borderRadius: 0, fontSize: 11.5 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <ModelSelect
                        name="google_model"
                        label="Generative Model"
                        provider="google"
                        rules={req}
                    />
                    <VertexServiceAccountField configured={!!googleSaConfigured} />
                </>
            )}

            {provider === "openai" && (
                <>
                    <ApiKeyField
                        name="openai_api_key"
                        label="OpenAI API Key"
                        configured={!!openaiKeyConfigured}
                        clearFieldName="clear_openai_api_key"
                        placeholder="sk-..."
                    />
                    <ModelSelect
                        name="openai_model"
                        label="Chat Model"
                        provider="openai"
                        rules={req}
                    />
                </>
            )}

            {provider === "groq" && (
                <>
                    <ApiKeyField
                        name="groq_api_key"
                        label="Groq API Key"
                        configured={!!groqKeyConfigured}
                        clearFieldName="clear_groq_api_key"
                        placeholder="gsk_..."
                    />
                    <ModelSelect
                        name="groq_model"
                        label="Chat Model"
                        provider="groq"
                        rules={req}
                    />
                    <div className="font-mono" style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>
                        Key from{" "}
                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                            console.groq.com/keys
                        </a>{" "}
                        · Embeddings use Google / OpenAI / Ollama.
                    </div>
                </>
            )}

            {provider === "openrouter" && (
                <>
                    <ApiKeyField
                        name="openrouter_api_key"
                        label="OpenRouter API Key"
                        configured={!!openrouterKeyConfigured}
                        clearFieldName="clear_openrouter_api_key"
                        placeholder="sk-or-..."
                    />
                    <ModelSelect
                        name="openrouter_model"
                        label="Chat Model"
                        provider="openrouter"
                        rules={req}
                    />
                    <div className="font-mono" style={{ fontSize: 10, color: t.textMuted, marginBottom: 6 }}>
                        Key from{" "}
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                            openrouter.ai/keys
                        </a>{" "}
                        or env <code>OPENROUTER_API_KEY</code>.
                    </div>
                </>
            )}

            {provider === "ollama" && (
                <Row gutter={8}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="ollama_base_url"
                            label={labelSpan("Ollama Endpoint")}
                            rules={req}
                            preserve
                            style={{ marginBottom: 8 }}
                            extra={
                                <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                                    Local default: http://127.0.0.1:11434
                                </span>
                            }
                        >
                            <Input size="small" placeholder="http://127.0.0.1:11434" style={{ borderRadius: 0, fontSize: 11.5 }} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <ModelSelect
                            name="ollama_model"
                            label="Chat Model"
                            provider="ollama"
                            rules={req}
                        />
                    </Col>
                </Row>
            )}

            {isActive && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
                    <ConnectionTestButton provider={provider} />
                </div>
            )}
        </div>
    );

    if (!isActive) {
        return inner;
    }

    return (
        <div
            style={{
                marginTop: 8,
                background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                border: `1px solid ${t.border}`,
                borderLeft: `2px solid ${themeColor}`,
                padding: "8px 10px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingBottom: 6,
                    marginBottom: 8,
                    borderBottom: `1px solid ${t.border}`,
                }}
            >
                <span className="font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                    {PROVIDER_LABELS[provider]} Configuration
                </span>
                <span
                    className="font-mono uppercase"
                    style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        background: configured ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                        border: `1px solid ${configured ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
                        color: configured ? "#22c55e" : "#f59e0b",
                        fontWeight: 700,
                    }}
                >
                    {configured ? "READY TO USE" : "COMPLETE THEN SAVE"}
                </span>
            </div>
            {inner}
        </div>
    );
}
