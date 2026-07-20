"use client";

import React from "react";
import { Card, Col, Form, Input, InputNumber, Row, Typography } from "antd";
import ApiKeyField from "./ApiKeyField";
import ModelSelect from "./ModelSelect";
import ConnectionTestButton from "./ConnectionTestButton";
import type { LlmProvider } from "../types";
import { PROVIDER_LABELS } from "../types";

const { Text } = Typography;

type Props = {
    provider: LlmProvider;
    isActive?: boolean;
    configured?: boolean;
};

export default function ProviderPanel({ provider, isActive = true, configured }: Props) {
    const anthropicKeyConfigured = Form.useWatch("anthropic_api_key_configured");
    const googleKeyConfigured = Form.useWatch("google_api_key_configured");
    const openaiKeyConfigured = Form.useWatch("openai_api_key_configured");
    const groqKeyConfigured = Form.useWatch("groq_api_key_configured");

    const req = isActive ? [{ required: true, message: "Wajib diisi untuk provider aktif" }] : [];

    const inner = (
        <>
            {provider === "anthropic" && (
                <>
                    <ApiKeyField
                        name="anthropic_api_key"
                        label="API Key"
                        configured={!!anthropicKeyConfigured}
                        clearFieldName="clear_anthropic_api_key"
                        placeholder="sk-ant-api03-..."
                    />
                    <ModelSelect
                        name="anthropic_model"
                        label="Chat Model"
                        provider="anthropic"
                        rules={req}
                    />
                    <Form.Item name="anthropic_max_tokens" label="Max Output Tokens" preserve>
                        <InputNumber min={64} max={8192} style={{ width: "100%" }} />
                    </Form.Item>
                </>
            )}

            {provider === "google" && (
                <Row gutter={16}>
                    <Col span={24}>
                        <ApiKeyField
                            name="google_api_key"
                            label="Google AI Studio API Key"
                            configured={!!googleKeyConfigured}
                            clearFieldName="clear_google_api_key"
                            placeholder="AIzaSy..."
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="google_project_id" label="Vertex Project ID" preserve>
                            <Input placeholder="my-gcp-project" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="google_location" label="Vertex Location" preserve>
                            <Input placeholder="us-central1" />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <ModelSelect
                            name="google_model"
                            label="Generative Model"
                            provider="google"
                            rules={req}
                        />
                    </Col>
                </Row>
            )}

            {provider === "openai" && (
                <>
                    <ApiKeyField
                        name="openai_api_key"
                        label="API Key"
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
                        label="API Key"
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
                    <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                        Ambil key di{" "}
                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                            console.groq.com/keys
                        </a>
                        . Embedding tetap pakai provider terpisah (Google / OpenAI / Ollama).
                    </Text>
                </>
            )}

            {provider === "ollama" && (
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="ollama_base_url"
                            label="Ollama Endpoint"
                            rules={req}
                            preserve
                            extra="Windows/Mac lokal: http://127.0.0.1:11434"
                        >
                            <Input placeholder="http://127.0.0.1:11434" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
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
                <div style={{ marginTop: 16 }}>
                    <ConnectionTestButton provider={provider} />
                </div>
            )}
        </>
    );

    if (!isActive) {
        return inner;
    }

    return (
        <Card
            title={
                <span style={{ color: "#111827" }}>
                    Konfigurasi {PROVIDER_LABELS[provider]}
                </span>
            }
            extra={
                configured ? (
                    <Text type="success">Siap digunakan</Text>
                ) : (
                    <Text type="warning">Lengkapi lalu Save</Text>
                )
            }
            style={{
                marginTop: 16,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
            }}
            styles={{ header: { borderBottom: "1px solid #e5e7eb" } }}
        >
            {inner}
        </Card>
    );
}
