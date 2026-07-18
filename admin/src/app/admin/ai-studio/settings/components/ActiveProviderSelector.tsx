"use client";

import React from "react";
import { Col, Form, Row, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { LlmProvider, StudioAiStatus } from "../types";
import { PROVIDER_LABELS } from "../types";

const { Text } = Typography;

const PROVIDERS: LlmProvider[] = ["anthropic", "google", "openai", "groq", "ollama"];

type Props = {
    status: StudioAiStatus | null;
};

export default function ActiveProviderSelector({ status }: Props) {
    const form = Form.useFormInstance();
    const active = Form.useWatch("default_llm_provider") as LlmProvider | undefined;

    return (
        <Row gutter={[12, 12]}>
            {PROVIDERS.map((p) => {
                const meta = status?.providers.find((x) => x.provider === p);
                const selected = active === p;
                return (
                    <Col xs={12} md={8} lg={4} key={p}>
                        <div
                            role="button"
                            tabIndex={0}
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
                                padding: "14px 16px",
                                borderRadius: 12,
                                border: selected ? "2px solid #1677ff" : "1px solid #f0f0f0",
                                background: selected ? "rgba(22,119,255,0.04)" : "#fafafa",
                                cursor: "pointer",
                                height: "100%",
                            }}
                        >
                            <Text strong style={{ fontSize: 13, display: "block" }}>
                                {PROVIDER_LABELS[p]}
                            </Text>
                            {selected && (
                                <Tag color="blue" style={{ marginTop: 8 }}>
                                    Aktif — dipakai semua modul
                                </Tag>
                            )}
                            <div style={{ marginTop: 8 }}>
                                <Tag
                                    color={meta?.configured ? "success" : "default"}
                                    icon={meta?.configured ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                >
                                    {meta?.configured ? "Siap" : "Perlu setup"}
                                </Tag>
                            </div>
                            {meta?.model && (
                                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
                                    {meta.model}
                                </Text>
                            )}
                        </div>
                    </Col>
                );
            })}
        </Row>
    );
}
