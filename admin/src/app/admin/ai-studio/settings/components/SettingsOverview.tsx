"use client";

import React from "react";
import { Alert, Card, Tag, Typography, Button, Space, List } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { StudioAiStatus } from "../types";
import { AFFECTED_MODULES, PROVIDER_LABELS } from "../types";

const { Text } = Typography;

const glass = {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: 14,
};

type Props = {
    status: StudioAiStatus | null;
    loading?: boolean;
};

export default function SettingsOverview({ status, loading }: Props) {
    if (loading || !status) {
        return <Card style={glass} loading={loading} />;
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

            <Card style={glass} title="Yang dipakai sekarang">
                <Space wrap size={[8, 12]}>
                    <Tag color="blue">Chat LLM: {PROVIDER_LABELS[status.llmProvider]}</Tag>
                    <Tag>{status.llmModel}</Tag>
                    <Tag color="purple">Embedding: {status.embeddingProvider}</Tag>
                    <Tag>{status.embeddingModel}</Tag>
                </Space>
                <div style={{ marginTop: 16 }}>
                    <Link href="/admin/ai-studio/advanced/playground">
                        <Button icon={<ExperimentOutlined />} type="primary" ghost>
                            Test di Playground
                        </Button>
                    </Link>
                </div>
            </Card>

            <Card style={glass} title="Modul yang memakai LLM aktif">
                <Text type="secondary">
                    Semua modul di bawah memakai provider dan model chat yang sama dari halaman ini.
                </Text>
                <List
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={AFFECTED_MODULES}
                    renderItem={(item) => (
                        <List.Item style={{ padding: "4px 0", border: "none" }}>
                            <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                            {item}
                        </List.Item>
                    )}
                />
            </Card>

            <Card style={glass} title="Provider lain (tidak aktif)">
                <Space wrap>
                    {status.providers
                        .filter((p) => p.provider !== status.llmProvider)
                        .map((p) => (
                            <Tag
                                key={p.provider}
                                color="default"
                                icon={<CloseCircleOutlined />}
                            >
                                {PROVIDER_LABELS[p.provider]} — tidak dipakai
                            </Tag>
                        ))}
                </Space>
            </Card>
        </Space>
    );
}
