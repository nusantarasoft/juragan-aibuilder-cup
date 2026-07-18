"use client";

import React, { useCallback, useEffect, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    Alert,
    Button,
    Card,
    Form,
    Tabs,
    Typography,
    message,
    Skeleton,
    Space,
} from "antd";
import {
    SaveOutlined,
    ReloadOutlined,
    RobotOutlined,
    GlobalOutlined,
    DatabaseOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { studioService } from "@/lib/studioService";
import SettingsOverview from "./components/SettingsOverview";
import ActiveProviderSelector from "./components/ActiveProviderSelector";
import ProviderPanel from "./components/ProviderPanel";
import OptionalProvidersPanel from "./components/OptionalProvidersPanel";
import EmbeddingPanel from "./components/EmbeddingPanel";
import IntegrationsPanel from "./components/IntegrationsPanel";
import type { LlmProvider, StudioAiStatus, StudioSettingsFormValues } from "./types";
import { PROVIDER_LABELS } from "./types";
import { buildSavePayload, validateActiveProvider } from "./utils/buildSavePayload";

const { Title, Text } = Typography;

const glass = {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: 14,
};

const DEFAULT_VALUES: Partial<StudioSettingsFormValues> = {
    default_llm_provider: "google",
    default_embedding_provider: "auto",
    anthropic_model: "claude-3-5-haiku-20241022",
    anthropic_max_tokens: 4096,
    google_location: "us-central1",
    google_model: "gemini-2.5-flash",
    google_embedding_model: "gemini-embedding-001",
    openai_model: "gpt-4o",
    openai_embedding_model: "text-embedding-3-small",
    groq_model: "openai/gpt-oss-20b",
    ollama_base_url: "http://127.0.0.1:11434",
    ollama_model: "llama3",
    ollama_embedding_model: "nomic-embed-text",
    waha_dashboard_url: "http://127.0.0.1:3010/dashboard",
};

export default function AiStudioSettingsPage() {
    const [form] = Form.useForm<StudioSettingsFormValues>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<StudioAiStatus | null>(null);
    const [dirty, setDirty] = useState(false);
    const activeProvider = Form.useWatch("default_llm_provider", form) as LlmProvider | undefined;

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [settings, aiStatus] = await Promise.all([
                studioService.getSettings(),
                studioService.getAiStatus(),
            ]);
            if (settings) {
                form.setFieldsValue({ ...DEFAULT_VALUES, ...settings });
            }
            setStatus(aiStatus);
            setDirty(false);
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : "Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, [form]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (dirty) e.preventDefault();
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    const handleSave = async (values: StudioSettingsFormValues) => {
        const provider = (values.default_llm_provider || "google") as LlmProvider;
        const validationError = validateActiveProvider(provider, values);
        if (validationError) {
            message.error(validationError);
            return;
        }

        setSaving(true);
        try {
            await studioService.updateSettings(buildSavePayload(values));
            message.success(`Disimpan. Semua modul memakai ${PROVIDER_LABELS[provider]}.`);
            setDirty(false);
            await loadAll();
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const tabItems = [
        {
            key: "overview",
            label: "Overview",
            children: <SettingsOverview status={status} loading={loading} />,
        },
        {
            key: "embeddings",
            label: <span><DatabaseOutlined /> Embeddings</span>,
            children: loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
                <EmbeddingPanel activeProvider={activeProvider} />
            ),
        },
        {
            key: "integrations",
            label: <span><GlobalOutlined /> Integrations</span>,
            children: loading ? <Skeleton active paragraph={{ rows: 2 }} /> : <IntegrationsPanel />,
        },
        {
            key: "other",
            label: <span><SettingOutlined /> Provider Lain</span>,
            children: loading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
                <OptionalProvidersPanel activeProvider={activeProvider} status={status} />
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText>AI Models & Configuration</AuroraText>}
            breadcrumb={[{ title: "AI Studio" }, { title: "Settings" }]}
        >
            <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 88 }}>
                <div
                    style={{
                        marginBottom: 24,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            Satu LLM aktif untuk seluruh platform
                        </Title>
                        <Text type="secondary">
                            CRM, ITSM, PM, AI Studio, RAG, dan modul lain hanya memakai provider yang Anda pilih di bawah.
                        </Text>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={loadAll} disabled={loading}>
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={() => form.submit()}
                        >
                            Save Settings
                        </Button>
                    </Space>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    onFinishFailed={() => message.error("Lengkapi field provider aktif terlebih dahulu.")}
                    initialValues={DEFAULT_VALUES}
                    onValuesChange={() => setDirty(true)}
                >
                    {/* Always mounted — tidak boleh di dalam tab yang di-destroy */}
                    <Form.Item name="default_llm_provider" hidden>
                        <input type="hidden" />
                    </Form.Item>
                    <Form.Item name="anthropic_api_key_configured" hidden><input type="hidden" /></Form.Item>
                    <Form.Item name="google_api_key_configured" hidden><input type="hidden" /></Form.Item>
                    <Form.Item name="openai_api_key_configured" hidden><input type="hidden" /></Form.Item>
                    <Form.Item name="groq_api_key_configured" hidden><input type="hidden" /></Form.Item>

                    <Card
                        style={{ ...glass, marginBottom: 16 }}
                        title={
                            <span>
                                <RobotOutlined /> LLM Aktif
                            </span>
                        }
                    >
                        {loading ? (
                            <Skeleton active paragraph={{ rows: 3 }} />
                        ) : (
                            <>
                                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                                    Pilih satu provider. Hanya provider ini yang dipakai runtime.
                                </Text>
                                <ActiveProviderSelector status={status} />
                                {activeProvider && (
                                    <ProviderPanel
                                        provider={activeProvider}
                                        isActive
                                        configured={
                                            status?.providers.find((p) => p.provider === activeProvider)?.configured
                                        }
                                    />
                                )}
                            </>
                        )}
                    </Card>

                    <Card style={glass}>
                        <Tabs destroyInactiveTabPane={false} items={tabItems} />
                    </Card>
                </Form>

                {dirty && (
                    <div
                        style={{
                            position: "fixed",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "12px 24px",
                            background: "rgba(255,255,255,0.95)",
                            borderTop: "1px solid #f0f0f0",
                            display: "flex",
                            justifyContent: "center",
                            gap: 12,
                            zIndex: 100,
                        }}
                    >
                        <Text type="warning">Perubahan belum disimpan</Text>
                        <Button
                            onClick={() => {
                                form.resetFields();
                                setDirty(false);
                                loadAll();
                            }}
                        >
                            Discard
                        </Button>
                        <Button type="primary" loading={saving} onClick={() => form.submit()}>
                            Save Settings
                        </Button>
                    </div>
                )}
            </div>
        </CMSLayout>
    );
}
