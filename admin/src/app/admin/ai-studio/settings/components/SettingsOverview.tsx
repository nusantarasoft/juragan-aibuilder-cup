"use client";

import React from "react";
import { Alert, Card, Tag, Typography, Button, Space, List } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { StudioAiStatus } from "../types";
import { AFFECTED_MODULES, PROVIDER_LABELS } from "../types";

const { Text } = Typography;

type Props = {
    status: StudioAiStatus | null;
    loading?: boolean;
};

export default function SettingsOverview({ status, loading }: Props) {
    if (loading || !status) {
        return <Card loading={loading} bordered={false} style={{ background: "transparent" }} />;
    }

    const activeReady = status.providers.find((p) => p.provider === status.llmProvider)?.configured;

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
                type={activeReady ? "success" : "warning"}
                showIcon
                message={
                    activeReady
                        ? `Runtime aktif: ${PROVIDER_LABELS[status.llmProvider]} / ${status.llmModel}`
                        : `Provider aktif (${PROVIDER_LABELS[status.llmProvider]}) belum siap — lengkapi konfigurasi lalu Save.`
                }
            />

            <div>
                <Text strong style={{ display: "block", marginBottom: 8, color: "#111827" }}>
                    Yang dipakai sekarang
                </Text>
                <Space wrap size={[8, 8]}>
                    <Tag color="blue">Chat: {PROVIDER_LABELS[status.llmProvider]}</Tag>
                    <Tag>{status.llmModel}</Tag>
                    <Tag color="geekblue">Embedding: {status.embeddingProvider}</Tag>
                    <Tag>{status.embeddingModel}</Tag>
                </Space>
                <div style={{ marginTop: 12 }}>
                    <Link href="/admin/ai-studio/advanced/playground">
                        <Button icon={<ExperimentOutlined />}>Test di Playground</Button>
                    </Link>
                </div>
            </div>

            <div>
                <Text strong style={{ display: "block", marginBottom: 4, color: "#111827" }}>
                    Modul yang memakai LLM aktif
                </Text>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Semua modul di bawah memakai provider dan model chat yang sama.
                </Text>
                <List
                    size="small"
                    dataSource={AFFECTED_MODULES}
                    split={false}
                    renderItem={(item) => (
                        <List.Item style={{ padding: "4px 0" }}>
                            <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                            <span style={{ color: "#374151" }}>{item}</span>
                        </List.Item>
                    )}
                />
            </div>

            <div>
                <Text strong style={{ display: "block", marginBottom: 8, color: "#111827" }}>
                    Provider lain (tidak aktif)
                </Text>
                <Space wrap size={[8, 8]}>
                    {status.providers
                        .filter((p) => p.provider !== status.llmProvider)
                        .map((p) => (
                            <Tag key={p.provider} icon={<CloseCircleOutlined />}>
                                {PROVIDER_LABELS[p.provider]}
                            </Tag>
                        ))}
                </Space>
            </div>
        </Space>
    );
}
