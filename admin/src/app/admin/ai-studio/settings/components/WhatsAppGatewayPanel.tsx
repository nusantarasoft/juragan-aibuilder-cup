"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    Col,
    Form,
    Input,
    Row,
    Select,
    Spin,
    Switch,
    message,
} from "antd";
import {
    CheckCircleOutlined,
    DisconnectOutlined,
    LogoutOutlined,
    PlayCircleOutlined,
    QrcodeOutlined,
    ReloadOutlined,
    RobotOutlined,
    SaveOutlined,
    SwapOutlined,
    SyncOutlined,
    WhatsAppOutlined,
} from "@ant-design/icons";
import QRCode from "qrcode";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import { normalizeSingleStoreWaPhone, validateSingleStoreWaPhone } from "@/lib/studioWaPhone";
import {
    studioService,
    type StudioNotebook,
    type StudioWhatsAppAuthQr,
    type StudioWhatsAppConfig,
    type StudioWhatsAppSecurityMeta,
    type StudioWhatsAppSessionStatus,
} from "@/lib/studioService";

const PROVIDER = "hermes" as const;

export interface WaGatewaySummary {
    connected: boolean;
    status: string;
    businessPhone?: string;
    hermesVersion?: string;
    activeTenant: string;
    botEnabled: boolean;
}

type Props = {
    initialTenant?: string;
    userId?: string | null;
    authLoading?: boolean;
    onSummaryChange?: (summary: WaGatewaySummary) => void;
};

export default function WhatsAppGatewayPanel({
    initialTenant = "default",
    userId,
    authLoading = false,
    onSummaryChange,
}: Props) {
    const { darkMode, themeColor = "#fb923c" } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const [waForm] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [activeTenant, setActiveTenant] = useState(initialTenant || "default");
    const [configs, setConfigs] = useState<StudioWhatsAppConfig[]>([]);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [sessionStatus, setSessionStatus] = useState<StudioWhatsAppSessionStatus | null>(null);
    const [securityMeta, setSecurityMeta] = useState<StudioWhatsAppSecurityMeta | null>(null);
    const [authQr, setAuthQr] = useState<StudioWhatsAppAuthQr | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (initialTenant) {
            setActiveTenant(initialTenant);
        }
    }, [initialTenant]);

    const loadStatus = useCallback(async () => {
        try {
            const st = await studioService.getWhatsAppSessionStatus(PROVIDER);
            setSessionStatus(st);
            return st;
        } catch {
            setSessionStatus(null);
            return null;
        }
    }, []);

    const loadQr = useCallback(async () => {
        try {
            setAuthQr(await studioService.getWhatsAppAuthQr(undefined, PROVIDER));
        } catch {
            setAuthQr(null);
        }
    }, []);

    const applyTenantConfig = useCallback(
        (tenantId: string, list: StudioWhatsAppConfig[]) => {
            const cfg = list.find((c) => c.tenant_id === tenantId) || list[0];
            if (cfg) {
                waForm.setFieldsValue({
                    tenantId: cfg.tenant_id,
                    notebookId: cfg.notebook_id,
                    enabled: cfg.enabled,
                    ownerWaPhone:
                        cfg.business_phone ||
                        (cfg.allowlist_phones && cfg.allowlist_phones[0]) ||
                        "",
                    useGuidedFlow: cfg.use_guided_flow,
                    sessionName: cfg?.session_name ?? "default",
                    businessPhone: cfg.business_phone || "",
                    label: cfg.label || "",
                });
            } else {
                waForm.setFieldsValue({
                    tenantId,
                    notebookId: undefined,
                    enabled: false,
                    ownerWaPhone: "",
                    useGuidedFlow: false,
                    sessionName: "default",
                    businessPhone: "",
                    label: "",
                });
            }
        },
        [waForm],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (userId) {
                try {
                    setNotebooks(await studioService.getNotebooks(userId));
                } catch {
                    setNotebooks([]);
                }
            }
            const [cfgList, meta, st] = await Promise.all([
                studioService.listWhatsAppConfigs().catch(() => [] as StudioWhatsAppConfig[]),
                studioService.getWhatsAppSecurityMeta().catch(() => null),
                loadStatus(),
            ]);
            setConfigs(cfgList);
            setSecurityMeta(meta);
            applyTenantConfig(activeTenant, cfgList);
            await loadQr();

            const sess = st?.session;
            const connected = sess?.connected === true;
            const status = (sess?.status || "UNKNOWN").toUpperCase();
            const businessPhone = sess?.meId?.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");
            const currentCfg = cfgList.find((c) => c.tenant_id === activeTenant) || cfgList[0];
            onSummaryChange?.({
                connected,
                status,
                businessPhone,
                hermesVersion: st?.version?.version,
                activeTenant: currentCfg?.tenant_id || activeTenant,
                botEnabled: !!currentCfg?.enabled,
            });
        } finally {
            setLoading(false);
        }
    }, [userId, activeTenant, loadStatus, loadQr, applyTenantConfig, onSummaryChange]);

    useEffect(() => {
        if (authLoading) return;
        void load();
    }, [load, authLoading]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (authQr?.available && authQr.imageBase64) {
                setQrDataUrl(`data:${authQr.mimetype || "image/png"};base64,${authQr.imageBase64}`);
                return;
            }
            if (authQr?.available && authQr.qr) {
                try {
                    const url = await QRCode.toDataURL(authQr.qr, { width: 200, margin: 1 });
                    if (!cancelled) setQrDataUrl(url);
                } catch {
                    if (!cancelled) setQrDataUrl(null);
                }
                return;
            }
            if (!cancelled) setQrDataUrl(null);
        })();
        return () => {
            cancelled = true;
        };
    }, [authQr]);

    const sess = sessionStatus?.session;
    const connected = sess?.connected === true;
    const pairedButStuck = sess?.pairedButStuck === true;
    const status = (sess?.status || "UNKNOWN").toUpperCase();
    const needsQr = !connected && (status === "SCAN_QR_CODE" || status === "STARTING" || status === "FAILED");
    const hermesUnreachable = !loading && sessionStatus?.session === null;
    const businessPhone = sess?.meId?.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");
    const hermesVersion = sessionStatus?.version?.version;
    const allowlistRequired = securityMeta?.allowlistRequired ?? false;

    useEffect(() => {
        if (loading || connected) return;
        const statusTimer = setInterval(loadStatus, 6000);
        return () => clearInterval(statusTimer);
    }, [loading, connected, loadStatus]);

    useEffect(() => {
        if (loading || connected || !needsQr) return;
        const qrTimer = setInterval(loadQr, 5000);
        return () => clearInterval(qrTimer);
    }, [loading, connected, needsQr, loadQr]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const r = await studioService.startWhatsAppSession(undefined, PROVIDER);
            if (r.connected) message.success("WhatsApp is already connected");
            else message.info(`Session started — status: ${r.status}. Scan QR below.`);
            await load();
        } catch {
            message.error("Failed to start Hermes session");
        } finally {
            setStarting(false);
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await studioService.restartWhatsAppSession(PROVIDER);
            message.info("Session restarted. Wait for QR to appear and re-scan if needed.");
            await load();
        } catch {
            message.error("Failed to restart session");
        } finally {
            setRestarting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const r = await studioService.syncWhatsAppSession(PROVIDER);
            if (r.connected) message.success(`Hermes status: ${r.status}`);
            else message.warning(`Still ${r.status}. Try Sync again or Start session for QR.`);
            await load();
        } catch {
            message.error("Failed to sync status");
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await studioService.logoutWhatsAppSession(undefined, PROVIDER);
            message.info("Logged out successfully. Old phone session cleared — scan new QR for another number.");
            setQrDataUrl(null);
            await load();
        } catch {
            message.error("Failed to log out session");
        } finally {
            setLoggingOut(false);
        }
    };

    const handleChangeNumber = async () => {
        setStarting(true);
        try {
            const r = await studioService.rebindHermesSession();
            if (r.error) message.warning(r.error);
            else message.info("Old session cleared. Scan QR with the new number now.");
            setQrDataUrl(null);
            await load();
        } catch {
            message.error("Failed to change number");
        } finally {
            setStarting(false);
        }
    };

    const handleSave = async () => {
        const values = await waForm.validateFields();
        if (allowlistRequired && values.enabled && !normalizeSingleStoreWaPhone(values.ownerWaPhone)) {
            message.error("Store owner phone number is required when WhatsApp is enabled.");
            return;
        }
        setSaving(true);
        try {
            const ownerPhone = values.ownerWaPhone
                ? validateSingleStoreWaPhone(values.ownerWaPhone)
                : null;
            await studioService.updateWhatsAppConfig({
                tenantId: values.tenantId || activeTenant,
                notebookId: values.notebookId || null,
                enabled: values.enabled,
                allowlistPhones: [],
                useGuidedFlow: values.useGuidedFlow,
                sessionName: "default",
                businessPhone: ownerPhone,
                label: values.label || null,
            });
            message.success("WhatsApp configuration saved");
            await load();
        } catch {
            message.error("Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const labelSpan = (txt: string) => (
        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
            {txt}
        </span>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* HERMES CONTROL & TELEMETRY STRIP */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "6px 10px",
                    background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                    border: `1px solid ${t.border}`,
                    borderLeft: `2px solid ${connected ? "#22c55e" : "#f59e0b"}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                        className="font-mono uppercase"
                        style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            background: connected ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                            border: `1px solid ${connected ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
                            color: connected ? "#22c55e" : "#f59e0b",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <WhatsAppOutlined /> HERMES {status}
                    </span>
                    {businessPhone && (
                        <span className="font-mono" style={{ fontSize: 10.5, color: t.textPrimary, fontWeight: 600 }}>
                            +{businessPhone}
                        </span>
                    )}
                    {hermesVersion && (
                        <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                            v{hermesVersion}
                        </span>
                    )}
                    <span style={{ color: t.border }}>·</span>
                    <span style={{ fontSize: 11, color: t.textSecondary }}>
                        {hermesUnreachable
                            ? "Hermes unreachable — verify nsoft3-hermes (:8765) + kasir-pipe plugin."
                            : pairedButStuck
                              ? "Session paired but stuck at SCAN QR — click Sync status → WORKING."
                              : connected
                                ? "Cashier replies are actively routed via Hermes bridge."
                                : "For a new number, click Change number (logout + wipe + new QR), then scan immediately."}
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {pairedButStuck && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<SyncOutlined />}
                            loading={syncing}
                            onClick={handleSync}
                            style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                        >
                            Sync status → WORKING
                        </Button>
                    )}
                    <Button
                        size="small"
                        loading={restarting}
                        onClick={handleRestart}
                        disabled={connected}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                    >
                        Restart Hermes
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<SwapOutlined />}
                        loading={starting}
                        onClick={handleChangeNumber}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                    >
                        Change number
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<LogoutOutlined />}
                        loading={loggingOut}
                        onClick={handleLogout}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                    >
                        Logout Hermes
                    </Button>
                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={load}
                        loading={loading}
                        style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                    />
                </div>
            </div>

            {/* 2-COLUMN TACTICAL SPLIT: 1. DEVICE CONNECTION + 2. AI BOT CONFIGURATION */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 items-start">
                {/* 1. DEVICE CONNECTION (HERMES) */}
                <div
                    className="xl:col-span-5"
                    style={{
                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                        border: `1px solid ${t.border}`,
                        borderTop: `2px solid ${connected ? "#22c55e" : "#fb923c"}`,
                        padding: "8px 10px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingBottom: 6,
                            marginBottom: 8,
                            borderBottom: `1px solid ${t.border}`,
                        }}
                    >
                        <span className="font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                            <QrcodeOutlined style={{ color: connected ? "#22c55e" : "#fb923c", marginRight: 6 }} />
                            1. Device Connection (Hermes)
                        </span>
                        <span
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9,
                                padding: "0px 5px",
                                background: connected ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                border: `1px solid ${connected ? "rgba(34,197,94,0.35)" : "rgba(245,158,11,0.35)"}`,
                                color: connected ? "#22c55e" : "#f59e0b",
                            }}
                        >
                            {connected ? "ONLINE" : status}
                        </span>
                    </div>

                    {connected ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                padding: "18px 10px",
                                gap: 6,
                            }}
                        >
                            <CheckCircleOutlined style={{ fontSize: 28, color: "#22c55e" }} />
                            <div className="font-mono uppercase" style={{ fontSize: 11.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                                WhatsApp connected via Hermes
                            </div>
                            <div style={{ fontSize: 11, color: t.textSecondary }}>
                                Number <strong className="font-mono" style={{ color: t.textPrimary }}>{businessPhone || "—"}</strong> is ready to receive and reply to messages.
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                {hermesVersion && (
                                    <span
                                        className="font-mono"
                                        style={{
                                            fontSize: 9.5,
                                            padding: "1px 6px",
                                            background: "rgba(34,197,94,0.1)",
                                            border: "1px solid rgba(34,197,94,0.3)",
                                            color: "#22c55e",
                                        }}
                                    >
                                        Hermes {hermesVersion}
                                    </span>
                                )}
                                <Button
                                    size="small"
                                    icon={<SyncOutlined />}
                                    loading={syncing}
                                    onClick={handleSync}
                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                >
                                    Sync Session
                                </Button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div style={{ textAlign: "center", padding: 24 }}>
                            <Spin size="small" />
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "8px 0" }}>
                            {qrDataUrl ? (
                                <div style={{ padding: 10, background: "#fff", border: "2px solid #22c55e" }}>
                                    <img
                                        src={qrDataUrl}
                                        alt="WhatsApp QR Code"
                                        width={190}
                                        height={190}
                                        style={{ display: "block" }}
                                    />
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "14px 8px" }}>
                                    {needsQr ? (
                                        <>
                                            <Spin size="small" style={{ marginBottom: 8 }} />
                                            <div className="font-mono" style={{ fontSize: 11, color: t.textSecondary }}>
                                                {authQr?.error || "Waiting for QR code..."}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <DisconnectOutlined style={{ fontSize: 22, color: t.textMuted, marginBottom: 6 }} />
                                            <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8 }}>
                                                Session status: <strong className="font-mono">{status}</strong>
                                            </div>
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={<PlayCircleOutlined />}
                                                loading={starting}
                                                onClick={handleStart}
                                                style={{ background: themeColor, border: "none", borderRadius: 0, fontSize: 11 }}
                                            >
                                                Start session
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                            {needsQr && !qrDataUrl && (
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    loading={starting}
                                    onClick={handleStart}
                                    style={{ borderRadius: 0, fontSize: 11 }}
                                >
                                    Start session
                                </Button>
                            )}
                            {qrDataUrl && (
                                <div className="font-mono" style={{ fontSize: 10, color: t.textMuted, textAlign: "center" }}>
                                    QR auto-refreshes every 5s · Scan from WhatsApp Linked Devices
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. AI BOT CONFIGURATION */}
                <div
                    className="xl:col-span-7"
                    style={{
                        background: darkMode ? "rgba(255,255,255,0.015)" : "#f8fafc",
                        border: `1px solid ${t.border}`,
                        borderTop: `2px solid ${themeColor}`,
                        padding: "8px 10px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 6,
                            paddingBottom: 6,
                            marginBottom: 8,
                            borderBottom: `1px solid ${t.border}`,
                        }}
                    >
                        <span className="font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.06em" }}>
                            <RobotOutlined style={{ color: themeColor, marginRight: 6 }} />
                            2. AI Bot Configuration
                        </span>

                        {configs.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span className="font-mono uppercase" style={{ fontSize: 9.5, color: t.textMuted }}>
                                    TENANT:
                                </span>
                                <Select
                                    size="small"
                                    value={activeTenant}
                                    onChange={(val) => {
                                        setActiveTenant(val);
                                        applyTenantConfig(val, configs);
                                    }}
                                    style={{ minWidth: 150, borderRadius: 0, fontSize: 11 }}
                                    options={configs.map((c) => ({
                                        value: c.tenant_id,
                                        label: `${c.label || c.tenant_id} (${c.tenant_id})`,
                                    }))}
                                />
                            </div>
                        )}
                    </div>

                    {allowlistRequired && (
                        <div
                            style={{
                                padding: "5px 8px",
                                marginBottom: 8,
                                background: "rgba(56,189,248,0.08)",
                                border: "1px solid rgba(56,189,248,0.3)",
                                fontSize: 10.5,
                                color: t.textSecondary,
                            }}
                        >
                            <strong className="font-mono" style={{ color: "#38bdf8" }}>
                                STUDIO_WHATSAPP_REQUIRE_ALLOWLIST:
                            </strong>{" "}
                            Enter the store owner phone number before enabling WhatsApp replies.
                        </div>
                    )}

                    <Form form={waForm} layout="vertical" onFinish={handleSave}>
                        <Row gutter={8}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="label" label={labelSpan("SME Label / Business Name")} style={{ marginBottom: 8 }}>
                                    <Input size="small" placeholder="Delicious Bakery" style={{ borderRadius: 0, fontSize: 11.5 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="tenantId" label={labelSpan("Tenant ID (Auto)")} required style={{ marginBottom: 8 }}>
                                    <Input size="small" disabled style={{ borderRadius: 0, fontSize: 11.5 }} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={8}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="businessPhone" label={labelSpan("Business WhatsApp Number")} style={{ marginBottom: 8 }}>
                                    <Input size="small" placeholder="08123456789 (Your Number)" disabled style={{ borderRadius: 0, fontSize: 11.5 }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="sessionName" label={labelSpan("Session Name")} style={{ marginBottom: 8 }}>
                                    <Input size="small" placeholder="default" disabled style={{ borderRadius: 0, fontSize: 11.5 }} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={8}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="notebookId"
                                    label={labelSpan("Select Knowledge Notebook (RAG)")}
                                    rules={[{ required: true, message: "Please select a Notebook for the AI database." }]}
                                    style={{ marginBottom: 8 }}
                                >
                                    <Select
                                        size="small"
                                        placeholder="-- Select Notebook --"
                                        loading={loading}
                                        style={{ borderRadius: 0, fontSize: 11.5 }}
                                    >
                                        {notebooks.map((n) => (
                                            <Select.Option key={n.id} value={n.id}>
                                                {n.name}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="ownerWaPhone"
                                    label={labelSpan("Store owner WhatsApp number")}
                                    tooltip="One number per store (D-40). AI only replies to messages from this number."
                                    style={{ marginBottom: 8 }}
                                >
                                    <Input size="small" placeholder="6288123456789" style={{ borderRadius: 0, fontSize: 11.5 }} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 10,
                                marginTop: 4,
                                paddingTop: 8,
                                borderTop: `1px solid ${t.border}`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <Form.Item
                                    name="enabled"
                                    label={labelSpan("Enable AI Bot")}
                                    valuePropName="checked"
                                    style={{ marginBottom: 0 }}
                                >
                                    <Switch size="small" checkedChildren="Active" unCheckedChildren="Off" />
                                </Form.Item>
                                <Form.Item
                                    name="useGuidedFlow"
                                    label={labelSpan("Use Guide Flow")}
                                    valuePropName="checked"
                                    style={{ marginBottom: 0 }}
                                >
                                    <Switch size="small" checkedChildren="Yes" unCheckedChildren="No" />
                                </Form.Item>
                            </div>

                            <Button
                                size="small"
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={saving}
                                style={{ background: themeColor, borderRadius: 0, fontSize: 11, height: 26, paddingInline: 12 }}
                            >
                                Save Configuration
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
}
