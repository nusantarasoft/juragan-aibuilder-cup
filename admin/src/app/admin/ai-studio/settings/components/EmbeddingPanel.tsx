"use client";

import React from "react";
import { Alert, Card, Form, Select, Typography } from "antd";
import ModelSelect from "./ModelSelect";
import { EMBEDDING_PROVIDER_OPTIONS } from "../constants/modelCatalog";
import type { LlmProvider } from "../types";
import { PROVIDER_LABELS } from "../types";

const { Text } = Typography;

type Props = {
    activeProvider?: LlmProvider;
};

export default function EmbeddingPanel({ activeProvider }: Props) {
    const embeddingProvider = Form.useWatch("default_embedding_provider");

    return (
        <>
            {activeProvider === "ollama" && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Active LLM: ${PROVIDER_LABELS.ollama}. For RAG, select Embedding Provider = Ollama and pull the nomic-embed-text model.`}
                />
            )}
            {activeProvider === "groq" && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Active LLM: ${PROVIDER_LABELS.groq}. Groq is not used for embeddings — select Google / OpenAI / Ollama for RAG.`}
                />
            )}
            {activeProvider === "openrouter" && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Active LLM: ${PROVIDER_LABELS.openrouter}. OpenRouter is not used for embeddings — select Google / OpenAI / Ollama for RAG.`}
                />
            )}
            <Card title="Embedding (RAG / document search)" bordered={false} styles={{ body: { padding: 0 } }}>
                <Form.Item
                    name="default_embedding_provider"
                    label="Embedding Provider"
                    rules={[{ required: true }]}
                    preserve
                >
                    <Select options={EMBEDDING_PROVIDER_OPTIONS} />
                </Form.Item>

                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                    Separate from chat LLM — dedicated to document vectorization in AI Studio.
                </Text>

                {(embeddingProvider === "auto" || embeddingProvider === "google_ai" || embeddingProvider === "vertex") && (
                    <>
                        {embeddingProvider === "vertex" && (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                                message="Vertex embedding uses Project ID / Service Account from the Google panel (Settings & Models)."
                            />
                        )}
                        <ModelSelect
                            name="google_embedding_model"
                            label="Google Embedding Model"
                            embeddingProvider="google"
                        />
                    </>
                )}

                {(embeddingProvider === "openai" || embeddingProvider === "auto") && (
                    <ModelSelect
                        name="openai_embedding_model"
                        label="OpenAI Embedding Model"
                        embeddingProvider="openai"
                    />
                )}

                {(embeddingProvider === "ollama" || embeddingProvider === "auto") && (
                    <ModelSelect
                        name="ollama_embedding_model"
                        label="Ollama Embedding Model"
                        embeddingProvider="ollama"
                    />
                )}
            </Card>
        </>
    );
}
