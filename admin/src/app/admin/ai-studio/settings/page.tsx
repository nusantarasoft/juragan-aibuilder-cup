"use client";

import React, { useCallback, useEffect, useState } from "react";
import CMSLayout, { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import {
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
    openrouter_model: "qwen/qwen3.7-flash",
    ollama_base_url: "http://127.0.0.1:11434",
    ollama_model: "llama3",
    ollama_embedding_model: "nomic-embed-text",
};

function AiStudioSettingsInner() {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const [form] = Form.useForm<StudioSettingsFormValues>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<StudioAiStatus | null>(null);
    const [dirty, setDirty] = useState(false);
    const activeProvider = Form.useWatch("default_llm_provider", form) as LlmProvider | undefined;

    const panelCard: React.CSSProperties = {
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderTop: "2px solid #fb923c",
        borderRadius: 0,
        boxShadow: t.cardShadow,
    };

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
            message.success(`Saved. All modules now use ${PROVIDER_LABELS[provider]}.`);
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
            key: "chat_llm",
            label: <span><RobotOutlined /> Chat LLM</span>,
            children: loading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
                <OptionalProvidersPanel activeProvider={activeProvider} status={status} />
            ),
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
    ];

    return (
        <div style={{ margin: "0 auto", paddingBottom: dirty ? 56 : 8, position: "relative", zIndex: 1 }}>
            <div
                style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderLeft: "2px solid #fb923c",
                    borderRadius: 0,
                    padding: "8px 12px",
                }}
            >
                <div className="flex items-center flex-wrap gap-2 min-w-0">
                    <span className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold" style={{ color: "#fb923c" }}>
                        Central AI Configuration
                    </span>
                    <span style={{ color: t.cardBorder }}>|</span>
                    <Text strong style={{ fontSize: 13, color: t.textPrimary }}>
                        Single active LLM for the entire platform
                    </Text>
                    <Text className="hidden xl:inline" style={{ fontSize: 11, color: t.textSecondary }}>
                        — CRM, ITSM, PM, AI Studio, and RAG use the active provider below.
                    </Text>
                </div>
                <Space size={6} wrap>
                    <Button size="small" icon={<ReloadOutlined />} onClick={loadAll} disabled={loading} style={{ borderRadius: 0 }}>
                        Refresh
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={() => form.submit()}
                        style={{ borderRadius: 0 }}
                    >
                        Save Settings
                    </Button>
                </Space>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                onFinishFailed={() => message.error("Please complete the active provider fields first.")}
                initialValues={DEFAULT_VALUES}
                onValuesChange={() => setDirty(true)}
            >
                {/* Always mounted — must not be inside a destroyed tab */}
                <Form.Item name="default_llm_provider" hidden>
                    <input type="hidden" />
                </Form.Item>
                <Form.Item name="anthropic_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="google_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="google_service_account_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="openai_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="groq_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="openrouter_api_key_configured" hidden><input type="hidden" /></Form.Item>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
                    <Card
                        size="small"
                        className="lg:col-span-5"
                        style={panelCard}
                        styles={{ body: { padding: 10 } }}
                        title={
                            <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: t.textPrimary }}>
                                <RobotOutlined style={{ color: "#fb923c", marginRight: 6 }} /> Active LLM
                            </span>
                        }
                    >
                        {loading ? (
                            <Skeleton active paragraph={{ rows: 3 }} />
                        ) : (
                            <>
                                <Text style={{ display: "block", marginBottom: 8, fontSize: 11, color: t.textSecondary }}>
                                    Select one provider. Only this provider is used at runtime.
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

                    <Card
                        size="small"
                        className="lg:col-span-7"
                        style={panelCard}
                        styles={{ body: { padding: "4px 10px 10px 10px" } }}
                    >
                        <Tabs size="small" destroyInactiveTabPane={false} items={tabItems} />
                    </Card>
                </div>
            </Form>

            {dirty && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "12px 24px",
                        background: t.cardBg,
                        borderTop: `1px solid ${t.cardBorder}`,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 12,
                        zIndex: 100,
                        boxShadow: t.cardShadow,
                    }}
                >
                    <Text type="warning" className="font-mono text-xs">Unsaved changes</Text>
                    <Button
                        style={{ borderRadius: 0 }}
                        onClick={() => {
                            form.resetFields();
                            setDirty(false);
                            loadAll();
                        }}
                    >
                        Discard
                    </Button>
                    <Button type="primary" loading={saving} onClick={() => form.submit()} style={{ borderRadius: 0 }}>
                        Save Settings
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function AiStudioSettingsPage() {
    return (
        <CMSLayout
            title="AI Models & Configuration"
            subTitle="Central AI Configuration"
            breadcrumb={[{ title: "AI Studio" }, { title: "Settings" }]}
        >
            <AiStudioSettingsInner />
        </CMSLayout>
    );
}
