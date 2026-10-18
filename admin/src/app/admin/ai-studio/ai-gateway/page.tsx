'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { normalizeSingleStoreWaPhone, validateSingleStoreWaPhone } from '@/lib/studioWaPhone';
import {
    Card,
    Row,
    Col,
    Typography,
    Space,
    Tag,
    Button,
    Select,
    Switch,
    Form,
    Input,
    message,
    Spin,
    Alert,
} from 'antd';
import {
    ReloadOutlined,
    SaveOutlined,
    CheckCircleOutlined,
    QrcodeOutlined,
    PlayCircleOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import {
    studioService,
    StudioNotebook,
    StudioWhatsAppConfig,
    StudioWhatsAppSessionStatus,
    StudioWhatsAppSecurityMeta,
    StudioWhatsAppAuthQr,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useStudioUserId } from '../useStudioUserId';
import QRCode from 'qrcode';

const { Text, Paragraph } = Typography;
const tacticalCard: React.CSSProperties = {
    borderRadius: 0,
    borderTop: '2px solid #fb923c',
};

const PROVIDER = 'hermes' as const;

export default function WhatsAppGatewayPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
            <WhatsAppGatewayPageContent />
        </Suspense>
    );
}

function WhatsAppGatewayPageContent() {
    const searchParams = useSearchParams();
    const tenantFromUrl = searchParams.get('tenant') || 'default';

    const { themeColor } = usePreferencesStore();
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [activeTenant, setActiveTenant] = useState(tenantFromUrl);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [sessionStatus, setSessionStatus] = useState<StudioWhatsAppSessionStatus | null>(null);
    const [securityMeta, setSecurityMeta] = useState<StudioWhatsAppSecurityMeta | null>(null);
    const [authQr, setAuthQr] = useState<StudioWhatsAppAuthQr | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        try {
            setSessionStatus(await studioService.getWhatsAppSessionStatus(PROVIDER));
        } catch {
            setSessionStatus(null);
        }
    }, []);

    const loadQr = useCallback(async () => {
        try {
            setAuthQr(await studioService.getWhatsAppAuthQr(undefined, PROVIDER));
        } catch {
            setAuthQr(null);
        }
    }, []);

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
            const [configs, meta] = await Promise.all([
                studioService.listWhatsAppConfigs().catch(() => [] as StudioWhatsAppConfig[]),
                studioService.getWhatsAppSecurityMeta().catch(() => null),
            ]);
            setSecurityMeta(meta);
            const cfg = configs.find((c) => c.tenant_id === activeTenant) || configs[0];
            if (cfg) {
                form.setFieldsValue({
                    tenantId: cfg.tenant_id,
                    notebookId: cfg.notebook_id,
                    enabled: cfg.enabled,
                    ownerWaPhone:
                        cfg.business_phone ||
                        (cfg.allowlist_phones && cfg.allowlist_phones[0]) ||
                        '',
                    useGuidedFlow: cfg.use_guided_flow,
                    sessionName: cfg?.session_name ?? '',
                    businessPhone: cfg.business_phone || '',
                    label: cfg.label || '',
                });
            }
            await Promise.all([loadStatus(), loadQr()]);
        } finally {
            setLoading(false);
        }
    }, [form, userId, activeTenant, loadStatus, loadQr]);

    useEffect(() => {
        setActiveTenant(tenantFromUrl);
    }, [tenantFromUrl]);

    useEffect(() => {
        if (authLoading) return;
        load();
    }, [load, authLoading]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (authQr?.available && authQr.imageBase64) {
                setQrDataUrl(`data:${authQr.mimetype || 'image/png'};base64,${authQr.imageBase64}`);
                return;
            }
            if (authQr?.available && authQr.qr) {
                try {
                    const url = await QRCode.toDataURL(authQr.qr, { width: 240, margin: 2 });
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
    const status = (sess?.status || 'UNKNOWN').toUpperCase();
    const needsQr = !connected && (status === 'SCAN_QR_CODE' || status === 'STARTING' || status === 'FAILED');
    const hermesUnreachable = !loading && sessionStatus?.session === null;
    const businessPhone = sess?.meId?.split('@')[0]?.split(':')[0]?.replace(/\D/g, '');
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
            if (r.connected) message.success('WhatsApp is already connected');
            else message.info(`Session started — status: ${r.status}. Scan QR below.`);
            await load();
        } catch {
            message.error('Failed to start Hermes session');
        } finally {
            setStarting(false);
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await studioService.restartWhatsAppSession(PROVIDER);
            message.info('Session restarted. Wait for QR to appear and re-scan if needed.');
            await load();
        } catch {
            message.error('Failed to restart session');
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
            message.error('Failed to sync status');
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await studioService.logoutWhatsAppSession(undefined, PROVIDER);
            message.info('Logged out successfully. Old phone session cleared — scan new QR for another number.');
            setQrDataUrl(null);
            await load();
        } catch {
            message.error('Failed to log out session');
        } finally {
            setLoggingOut(false);
        }
    };

    const handleChangeNumber = async () => {
        setStarting(true);
        try {
            const r = await studioService.rebindHermesSession();
            if (r.error) message.warning(r.error);
            else message.info('Old session cleared. Scan QR with the new number now.');
            setQrDataUrl(null);
            await load();
        } catch {
            message.error('Failed to change number');
        } finally {
            setStarting(false);
        }
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        if (allowlistRequired && values.enabled && !normalizeSingleStoreWaPhone(values.ownerWaPhone)) {
            message.error('Store owner phone number is required when WhatsApp is enabled.');
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
                sessionName: 'default',
                businessPhone: ownerPhone,
                label: values.label || null,
            });
            message.success('WhatsApp configuration saved');
            await load();
        } catch {
            message.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <CMSLayout
            title="WhatsApp Gateway"
            subTitle="Pair WhatsApp number via Hermes and configure SME bot"
            extra={[
                pairedButStuck && (
                    <Button key="sync" loading={syncing} onClick={handleSync} type="primary" style={{ borderRadius: 0 }}>
                        Sync status → WORKING
                    </Button>
                ),
                <Button key="restart" loading={restarting} onClick={handleRestart} disabled={connected} style={{ borderRadius: 0 }}>
                    Restart Hermes
                </Button>,
                <Button key="rebind" loading={starting} onClick={handleChangeNumber} danger style={{ borderRadius: 0 }}>
                    Change number
                </Button>,
                <Button key="logout" loading={loggingOut} onClick={handleLogout} danger icon={<LogoutOutlined />} style={{ borderRadius: 0 }}>
                    Logout Hermes
                </Button>,
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 0 }} />,
            ].filter(Boolean)}
        >
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hermesUnreachable && (
                    <Alert
                        type="error"
                        showIcon
                        style={{ borderRadius: 0, padding: '6px 10px' }}
                        message="Hermes is unreachable — make sure nsoft3-hermes (:8765) + kasir-pipe plugin are running."
                    />
                )}
                {!loading && pairedButStuck && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ borderRadius: 0, padding: '6px 10px' }}
                        message="Logged in but status is stuck at SCAN QR — click Sync status → WORKING at the top right."
                    />
                )}
                {!connected && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ borderRadius: 0, padding: '6px 10px' }}
                        message={
                            <span className="text-xs">
                                <strong>Hermes Pairing:</strong> Restarting Hermes does not change the number. For a new number, click <strong>Change number</strong> (logout + wipe + new QR), then scan immediately.
                            </span>
                        }
                    />
                )}
                {connected && (
                    <Alert
                        type="success"
                        showIcon
                        style={{ borderRadius: 0, padding: '6px 10px' }}
                        message={
                            <span className="text-xs">
                                <strong>Hermes active:</strong>{' '}
                                {businessPhone
                                    ? `Session WORKING for ${businessPhone}. Cashier replies are routed via Hermes bridge.`
                                    : 'Session WORKING. If the phone number is not displayed yet, click Sync/refresh.'}
                            </span>
                        }
                    />
                )}

                <Row gutter={[8, 8]}>
                    <Col xs={24} md={10} lg={8}>
                        <Card size="small" style={tacticalCard} title={<Space><QrcodeOutlined style={{ color: '#fb923c' }} /><Text strong className="font-mono text-xs uppercase tracking-[0.06em]">1. Device Connection (Hermes)</Text></Space>}>
                            {connected ? (
                                <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
                                    <CheckCircleOutlined style={{ fontSize: 48, color: '#25d366' }} />
                                    <Text strong style={{ fontSize: 16 }}>WhatsApp connected via Hermes</Text>
                                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                        Number <strong className="font-mono">{businessPhone || '—'}</strong> is ready to receive and reply to messages.
                                    </Paragraph>
                                    {hermesVersion && (
                                        <Tag className="font-mono" style={{ borderRadius: 0 }}>Hermes {hermesVersion}</Tag>
                                    )}
                                </Space>
                            ) : loading ? (
                                <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                            ) : (
                                <Space direction="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
                                    {qrDataUrl ? (
                                        <div style={{ padding: 16, background: '#fff', borderRadius: 0, border: '2px solid #25d366' }}>
                                            <img src={qrDataUrl} alt="WhatsApp QR Code" width={240} height={240} style={{ display: 'block' }} />
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                            {needsQr ? (
                                                <><Spin style={{ marginBottom: 16 }} /><Paragraph type="secondary">{authQr?.error || 'Waiting for QR code...'}</Paragraph></>
                                            ) : (
                                                <>
                                                    <Paragraph type="secondary">Session not started or status: <strong className="font-mono">{status}</strong></Paragraph>
                                                    <Button type="primary" icon={<PlayCircleOutlined />} loading={starting} onClick={handleStart} style={{ background: themeColor, border: 'none', borderRadius: 0 }}>
                                                        Start session
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {needsQr && !qrDataUrl && (
                                        <Button type="primary" icon={<PlayCircleOutlined />} loading={starting} onClick={handleStart} style={{ borderRadius: 0 }}>
                                            Start session
                                        </Button>
                                    )}
                                    {qrDataUrl && <Paragraph type="secondary" className="font-mono" style={{ fontSize: 11, textAlign: 'center' }}>QR updates automatically every 5 seconds.</Paragraph>}
                                </Space>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} md={14} lg={16}>
                        <Card size="small" style={tacticalCard} title={<Text strong className="font-mono text-xs uppercase tracking-[0.06em]">2. AI Bot Configuration</Text>}>
                            {allowlistRequired && (
                                <Alert
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16, borderRadius: 0 }}
                                    message="STUDIO_WHATSAPP_REQUIRE_ALLOWLIST Active"
                                    description="Production mode active — enter at least one customer phone number before enabling WhatsApp replies."
                                />
                            )}

                            <Form form={form} layout="vertical" onFinish={handleSave}>
                                <Row gutter={16}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="label" label="SME Label / Business Name">
                                            <Input placeholder="Delicious Bakery" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="tenantId" label="Tenant ID (Auto)" required>
                                            <Input disabled />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="businessPhone" label="Business WhatsApp Number">
                                            <Input placeholder="08123456789 (Your Number)" disabled />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="sessionName" label="Session Name">
                                            <Input placeholder="default" disabled />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    name="notebookId"
                                    label="Select Knowledge Notebook (RAG)"
                                    rules={[{ required: true, message: 'Please select a Notebook for the AI database.' }]}
                                >
                                    <Select placeholder="-- Select Notebook --" loading={loading}>
                                        {notebooks.map((n) => (
                                            <Select.Option key={n.id} value={n.id}>
                                                {n.name}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="ownerWaPhone"
                                    label="Store owner WhatsApp number"
                                    tooltip="One number per store (D-40). AI only replies to messages from this number."
                                >
                                    <Input placeholder="6288123456789" />
                                </Form.Item>

                                <Row gutter={16} align="middle">
                                    <Col xs={24} sm={8}>
                                        <Form.Item name="enabled" label="Enable AI Bot" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Switch checkedChildren="Active" unCheckedChildren="Off" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Form.Item name="useGuidedFlow" label="Use Guide Flow" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Switch checkedChildren="Yes" unCheckedChildren="No" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<SaveOutlined />}
                                            loading={saving}
                                            style={{ background: themeColor, width: '100%', borderRadius: 0 }}
                                        >
                                            Save Configuration
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
