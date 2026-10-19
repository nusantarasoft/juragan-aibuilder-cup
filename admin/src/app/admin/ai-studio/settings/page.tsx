"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CMSLayout, { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import {
    Button,
    Form,
    Skeleton,
    Tabs,
    Tooltip,
    message,
} from "antd";
import {
    AppstoreOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    DatabaseOutlined,
    ReloadOutlined,
    RobotOutlined,
    SaveOutlined,
    SettingOutlined,
    UndoOutlined,
    WhatsAppOutlined,
} from "@ant-design/icons";
import { studioService } from "@/lib/studioService";
import { useAuth } from "@/context/AuthContext";
import { useStudioUserId } from "../useStudioUserId";
import SettingsOverview from "./components/SettingsOverview";
import ActiveProviderSelector from "./components/ActiveProviderSelector";
import ProviderPanel from "./components/ProviderPanel";
import OptionalProvidersPanel from "./components/OptionalProvidersPanel";
import EmbeddingPanel from "./components/EmbeddingPanel";
import WhatsAppGatewayPanel, { type WaGatewaySummary } from "./components/WhatsAppGatewayPanel";
import type { LlmProvider, StudioAiStatus, StudioSettingsFormValues } from "./types";
import { PROVIDER_LABELS } from "./types";
import { buildSavePayload, validateActiveProvider } from "./utils/buildSavePayload";

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
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get("tab");
    const tenantFromUrl = searchParams.get("tenant") || "default";

    const { darkMode, themeColor = "#fb923c" } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();

    const [form] = Form.useForm<StudioSettingsFormValues>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<StudioAiStatus | null>(null);
    const [dirty, setDirty] = useState(false);
    const [waSummary, setWaSummary] = useState<WaGatewaySummary | null>(null);

    const [activeTab, setActiveTab] = useState<string>(() => {
        if (tabFromUrl === "whatsapp" || searchParams.get("tenant")) return "whatsapp";
        if (tabFromUrl === "chat_llm" || tabFromUrl === "embeddings" || tabFromUrl === "overview") {
            return tabFromUrl;
        }
        return "overview";
    });

    // Layout visibility controls
    const [showLeftPane, setShowLeftPane] = useState(true);
    const [showRightPane, setShowRightPane] = useState(true);

    const activeProvider = Form.useWatch("default_llm_provider", form) as LlmProvider | undefined;

    useEffect(() => {
        if (tabFromUrl === "whatsapp" || searchParams.get("tenant")) {
            setActiveTab("whatsapp");
        } else if (tabFromUrl && ["overview", "chat_llm", "embeddings"].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl, searchParams]);

    const handleResetLayout = useCallback(() => {
        setShowLeftPane(true);
        setShowRightPane(true);
    }, []);

    useEffect(() => {
        const onGlobalReset = () => handleResetLayout();
        window.addEventListener("cms-reset-layout", onGlobalReset);
        return () => window.removeEventListener("cms-reset-layout", onGlobalReset);
    }, [handleResetLayout]);

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
        void loadAll();
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

    const activeProviderReady = status?.providers.find((p) => p.provider === activeProvider)?.configured;

    const tabItems = [
        {
            key: "overview",
            label: (
                <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    <AppstoreOutlined style={{ marginRight: 5 }} />
                    Overview
                </span>
            ),
            children: (
                <SettingsOverview
                    status={status}
                    loading={loading}
                    waSummary={waSummary}
                    onOpenTab={(k) => setActiveTab(k)}
                />
            ),
        },
        {
            key: "whatsapp",
            label: (
                <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    <WhatsAppOutlined style={{ color: "#22c55e", marginRight: 5 }} />
                    WhatsApp Gateway
                </span>
            ),
            children: (
                <WhatsAppGatewayPanel
                    initialTenant={tenantFromUrl}
                    userId={userId}
                    authLoading={authLoading}
                    onSummaryChange={setWaSummary}
                />
            ),
        },
        {
            key: "chat_llm",
            label: (
                <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    <RobotOutlined style={{ color: themeColor, marginRight: 5 }} />
                    Chat LLM
                </span>
            ),
            children: loading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
                <OptionalProvidersPanel activeProvider={activeProvider} status={status} />
            ),
        },
        {
            key: "embeddings",
            label: (
                <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    <DatabaseOutlined style={{ color: "#38bdf8", marginRight: 5 }} />
                    Embeddings
                </span>
            ),
            children: loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
                <EmbeddingPanel activeProvider={activeProvider} />
            ),
        },
    ];

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "calc(100vh - 134px)",
                minHeight: 540,
                gap: 6,
                overflow: "hidden",
            }}
        >
            {/* TOP 36PX TACTICAL TELEMETRY & CONTROL RIBBON */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "5px 10px",
                    background: darkMode ? "#0b0e13" : "#ffffff",
                    border: `1px solid ${t.border}`,
                    borderTop: `2px solid ${themeColor}`,
                    flexShrink: 0,
                    flexWrap: "wrap",
                }}
            >
                {/* Left: Heading + Central AI Configuration + Live Runtime & Gateway Telemetry */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <h3
                        className="font-mono uppercase"
                        style={{
                            margin: 0,
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            padding: "2px 6px",
                            background: `${themeColor}18`,
                            border: `1px solid ${themeColor}55`,
                            color: themeColor,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        <SettingOutlined /> Settings
                    </h3>
                    <span
                        className="font-mono uppercase"
                        style={{
                            fontSize: 9.5,
                            color: t.textSecondary,
                            letterSpacing: "0.06em",
                            fontWeight: 600,
                        }}
                    >
                        Central AI Configuration
                    </span>
                    <span style={{ color: t.border }}>·</span>
                    <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                        LLM{" "}
                        <strong style={{ color: t.textPrimary }}>
                            {activeProvider ? PROVIDER_LABELS[activeProvider] : status?.llmProvider || "—"}
                        </strong>
                    </span>
                    <span style={{ color: t.border }}>·</span>
                    <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                        EMBED{" "}
                        <strong className="uppercase" style={{ color: "#38bdf8" }}>
                            {status?.embeddingProvider || "auto"}
                        </strong>
                    </span>
                    <span style={{ color: t.border }}>·</span>
                    <button
                        type="button"
                        onClick={() => {
                            if (!showRightPane) setShowRightPane(true);
                            setActiveTab("whatsapp");
                        }}
                        className="font-mono uppercase"
                        style={{
                            fontSize: 9.5,
                            padding: "1px 6px",
                            background: waSummary?.connected ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                            border: `1px solid ${waSummary?.connected ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
                            color: waSummary?.connected ? "#22c55e" : "#f59e0b",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 700,
                        }}
                    >
                        <WhatsAppOutlined /> WA: {waSummary?.connected ? "WORKING" : waSummary?.status || "GATEWAY"}
                    </button>

                    {dirty && (
                        <span
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                background: "rgba(245,158,11,0.15)",
                                border: "1px solid rgba(245,158,11,0.5)",
                                color: "#f59e0b",
                                fontWeight: 700,
                            }}
                        >
                            UNSAVED CHANGES
                        </span>
                    )}
                </div>

                {/* Right: Layout Toggles + Refresh + Save */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <Tooltip title={showLeftPane ? "Hide Active LLM Matrix" : "Show Active LLM Matrix"}>
                        <button
                            type="button"
                            onClick={() => {
                                if (showLeftPane && !showRightPane) setShowRightPane(true);
                                setShowLeftPane((v) => !v);
                            }}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                padding: "2px 6px",
                                border: `1px solid ${t.border}`,
                                background: showLeftPane ? "transparent" : `${themeColor}1f`,
                                color: showLeftPane ? t.textSecondary : themeColor,
                                cursor: "pointer",
                            }}
                        >
                            {showLeftPane ? "◀ HIDE MATRIX" : "◀ SHOW MATRIX"}
                        </button>
                    </Tooltip>

                    <button
                        type="button"
                        onClick={handleResetLayout}
                        className="font-mono uppercase"
                        style={{
                            fontSize: 9.5,
                            padding: "2px 6px",
                            border: `1px solid ${t.border}`,
                            background: "transparent",
                            color: t.textSecondary,
                            cursor: "pointer",
                        }}
                    >
                        RESET LAYOUT
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (showLeftPane && showRightPane) {
                                setShowLeftPane(false);
                            } else {
                                setShowLeftPane(true);
                                setShowRightPane(true);
                            }
                        }}
                        className="font-mono uppercase"
                        style={{
                            fontSize: 9.5,
                            padding: "2px 6px",
                            border: `1px solid ${!showLeftPane && showRightPane ? themeColor : t.border}`,
                            background: !showLeftPane && showRightPane ? `${themeColor}1f` : "transparent",
                            color: !showLeftPane && showRightPane ? themeColor : t.textSecondary,
                            cursor: "pointer",
                        }}
                    >
                        {!showLeftPane && showRightPane ? "SPLIT VIEW" : "FOCUS DECK"}
                    </button>

                    <Tooltip title={showRightPane ? "Hide Configuration Deck" : "Show Configuration Deck"}>
                        <button
                            type="button"
                            onClick={() => {
                                if (showRightPane && !showLeftPane) setShowLeftPane(true);
                                setShowRightPane((v) => !v);
                            }}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                padding: "2px 6px",
                                border: `1px solid ${t.border}`,
                                background: showRightPane ? "transparent" : `${themeColor}1f`,
                                color: showRightPane ? t.textSecondary : themeColor,
                                cursor: "pointer",
                            }}
                        >
                            {showRightPane ? "HIDE DECK ▶" : "◀ SHOW DECK"}
                        </button>
                    </Tooltip>

                    {dirty && (
                        <Button
                            size="small"
                            icon={<UndoOutlined />}
                            onClick={() => {
                                form.resetFields();
                                setDirty(false);
                                void loadAll();
                            }}
                            style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                        >
                            Discard
                        </Button>
                    )}

                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={loadAll}
                        disabled={loading}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                    >
                        Refresh
                    </Button>

                    <Button
                        size="small"
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={() => form.submit()}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24, background: themeColor }}
                    >
                        Save Settings
                    </Button>
                </div>
            </div>

            {/* 2-PANE VIEWPORT-LOCKED WORKSPACE (component={false} avoids nested HTML <form> tags) */}
            <Form
                form={form}
                component={false}
                layout="vertical"
                onFinish={handleSave}
                onFinishFailed={() => message.error("Please complete the active provider fields first.")}
                initialValues={DEFAULT_VALUES}
                onValuesChange={() => setDirty(true)}
            >
                {/* Always mounted hidden fields */}
                <Form.Item name="default_llm_provider" hidden>
                    <input type="hidden" />
                </Form.Item>
                <Form.Item name="anthropic_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="google_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="google_service_account_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="openai_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="groq_api_key_configured" hidden><input type="hidden" /></Form.Item>
                <Form.Item name="openrouter_api_key_configured" hidden><input type="hidden" /></Form.Item>

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        gap: 6,
                        overflow: "hidden",
                    }}
                >
                    {/* LEFT PANE: ACTIVE LLM MATRIX & PROVIDER COMMAND */}
                    {showLeftPane && (
                        <div
                            style={{
                                width: showRightPane ? 390 : "100%",
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                                background: darkMode ? "#0b0e13" : "#ffffff",
                                border: `1px solid ${t.border}`,
                                borderTop: `2px solid ${themeColor}`,
                                overflow: "hidden",
                            }}
                        >
                            {/* Sticky Left Pane Header */}
                            <div
                                style={{
                                    padding: "6px 10px",
                                    borderBottom: `1px solid ${t.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: darkMode ? "rgba(255,255,255,0.02)" : "#f8fafc",
                                    flexShrink: 0,
                                }}
                            >
                                <span
                                    className="font-mono uppercase"
                                    style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}
                                >
                                    <RobotOutlined style={{ color: themeColor, marginRight: 6 }} />
                                    Active LLM Runtime
                                </span>
                                <span
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 9,
                                        padding: "0px 5px",
                                        background: activeProviderReady ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                                        color: activeProviderReady ? "#22c55e" : "#f59e0b",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                    }}
                                >
                                    {activeProviderReady ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                    {activeProviderReady ? "ONLINE" : "NEEDS KEY"}
                                </span>
                            </div>

                            {/* Scrollable Left Pane Body */}
                            <div
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    padding: "8px 10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                <div style={{ fontSize: 11, color: t.textSecondary }}>
                                    Single active LLM for the entire platform — CRM, ITSM, PM, AI Studio, and RAG use the active provider below.
                                </div>

                                {loading ? (
                                    <Skeleton active paragraph={{ rows: 4 }} />
                                ) : (
                                    <>
                                        <ActiveProviderSelector status={status} />
                                        {activeProvider && (
                                            <ProviderPanel
                                                provider={activeProvider}
                                                isActive
                                                configured={activeProviderReady}
                                            />
                                        )}
                                    </>
                                )}

                                {/* Compact WhatsApp Hermes Bridge Status Card inside Left Matrix */}
                                <div
                                    style={{
                                        marginTop: "auto",
                                        padding: "8px 10px",
                                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                                        border: `1px solid ${t.border}`,
                                        borderLeft: `2px solid ${waSummary?.connected ? "#22c55e" : "#f59e0b"}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            className="font-mono uppercase"
                                            style={{ fontSize: 9.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.05em" }}
                                        >
                                            <WhatsAppOutlined style={{ color: "#22c55e", marginRight: 5 }} />
                                            Hermes WhatsApp Gateway
                                        </div>
                                        <div className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                            {waSummary?.connected
                                                ? `Paired: +${waSummary.businessPhone || "active"}`
                                                : `Status: ${waSummary?.status || "Standby"}`}
                                        </div>
                                    </div>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            if (!showRightPane) setShowRightPane(true);
                                            setActiveTab("whatsapp");
                                        }}
                                        style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                    >
                                        Configure WA →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT PANE: MULTI-SYSTEM CONFIGURATION & WHATSAPP GATEWAY DECK */}
                    {showRightPane && (
                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                background: darkMode ? "#0b0e13" : "#ffffff",
                                border: `1px solid ${t.border}`,
                                borderTop: `2px solid ${activeTab === "whatsapp" ? "#22c55e" : "#38bdf8"}`,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    padding: "4px 10px 10px 10px",
                                }}
                            >
                                <Tabs
                                    size="small"
                                    activeKey={activeTab}
                                    onChange={setActiveTab}
                                    destroyInactiveTabPane={false}
                                    items={tabItems}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Form>
        </div>
    );
}

export default function AiStudioSettingsPage() {
    return (
        <CMSLayout
            title="Settings"
            subTitle="Central AI Configuration · LLM Providers · Vector Embeddings · WhatsApp Hermes Gateway"
            breadcrumb={[{ title: "AI Studio" }, { title: "Settings" }]}
        >
            <Suspense fallback={<div style={{ padding: 20 }}>Loading settings...</div>}>
                <AiStudioSettingsInner />
            </Suspense>
        </CMSLayout>
    );
}
