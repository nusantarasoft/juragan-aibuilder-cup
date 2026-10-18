"use client";

import React from "react";
import { Alert, Card, Tag, Typography, Button, Space, List } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import type { StudioAiStatus } from "../types";
import { AFFECTED_MODULES, PROVIDER_LABELS } from "../types";

const { Text } = Typography;

type Props = {
    status: StudioAiStatus | null;
    loading?: boolean;
};

export default function SettingsOverview({ status, loading }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);

    if (loading || !status) {
        return <Card loading={loading} bordered={false} style={{ background: "transparent" }} />;
    }

    const activeReady = status.providers.find((p) => p.provider === status.llmProvider)?.configured;

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
                type={activeReady ? "success" : "warning"}
                showIcon
                style={{ borderRadius: 0 }}
                message={
                    activeReady
                        ? `Active runtime: ${PROVIDER_LABELS[status.llmProvider]} / ${status.llmModel}`
                        : `Active provider (${PROVIDER_LABELS[status.llmProvider]}) is not ready — complete configuration then Save.`
                }
            />

            <div>
                <Text strong style={{ display: "block", marginBottom: 8, color: t.textPrimary }}>
                    Currently in use
                </Text>
                <Space wrap size={[8, 8]}>
                    <Tag color="orange" style={{ borderRadius: 0 }}>Chat: {PROVIDER_LABELS[status.llmProvider]}</Tag>
                    <Tag className="font-mono" style={{ borderRadius: 0 }}>{status.llmModel}</Tag>
                    <Tag color="geekblue" style={{ borderRadius: 0 }}>Embedding: {status.embeddingProvider}</Tag>
                    <Tag className="font-mono" style={{ borderRadius: 0 }}>{status.embeddingModel}</Tag>
                </Space>
                <div style={{ marginTop: 12 }}>
                    <Link href="/admin/ai-studio">
                        <Button icon={<ExperimentOutlined />} style={{ borderRadius: 0 }}>Open AI Studio</Button>
                    </Link>
                </div>
            </div>

            <div>
                <Text strong style={{ display: "block", marginBottom: 4, color: t.textPrimary }}>
                    Modules using active LLM
                </Text>
                <Text style={{ display: "block", marginBottom: 8, color: t.textSecondary }}>
                    All modules below use the same chat provider and model.
                </Text>
                <List
                    size="small"
                    dataSource={AFFECTED_MODULES}
                    split={false}
                    renderItem={(item) => (
                        <List.Item style={{ padding: "4px 0" }}>
                            <CheckCircleOutlined style={{ color: "#34d399", marginRight: 8 }} />
                            <span style={{ color: t.textSecondary }}>{item}</span>
                        </List.Item>
                    )}
                />
            </div>

            <div>
                <Text strong style={{ display: "block", marginBottom: 8, color: t.textPrimary }}>
                    Other providers (inactive)
                </Text>
                <Space wrap size={[8, 8]}>
                    {status.providers
                        .filter((p) => p.provider !== status.llmProvider)
                        .map((p) => (
                            <Tag key={p.provider} icon={<CloseCircleOutlined />} style={{ borderRadius: 0 }}>
                                {PROVIDER_LABELS[p.provider]}
                            </Tag>
                        ))}
                </Space>
            </div>
        </Space>
    );
}
