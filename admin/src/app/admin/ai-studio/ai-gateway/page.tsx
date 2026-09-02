'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
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
    WhatsAppOutlined,
    ReloadOutlined,
    LinkOutlined,
    SaveOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
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
    StudioWahaAuthQr,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useStudioUserId } from '../useStudioUserId';
import QRCode from 'qrcode';

const { Text, Paragraph } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

const DEFAULT_WAHA_DASHBOARD = 'http://127.0.0.1:3010/dashboard';
type WaProvider = 'waha' | 'hermes';

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
    
    // States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    
    const [activeTenant, setActiveTenant] = useState(tenantFromUrl);
    const [waConfigs, setWaConfigs] = useState<StudioWhatsAppConfig[]>([]);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [sessionStatus, setSessionStatus] = useState<StudioWhatsAppSessionStatus | null>(null);
    const [securityMeta, setSecurityMeta] = useState<StudioWhatsAppSecurityMeta | null>(null);
    const [authQr, setAuthQr] = useState<StudioWahaAuthQr | null>(null);
    const [wahaDashboard, setWahaDashboard] = useState(DEFAULT_WAHA_DASHBOARD);
    const [provider, setProvider] = useState<WaProvider>('hermes');
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        studioService.getSettings().then((s) => {
            if (s?.waha_dashboard_url) setWahaDashboard(s.waha_dashboard_url);
        }).catch(() => {});
    }, []);

    const loadStatus = useCallback(async () => {
        try {
            setSessionStatus(await studioService.getWhatsAppSessionStatus(provider));
        } catch {
            setSessionStatus(null);
        }
    }, [provider]);

    const loadQr = useCallback(async () => {
        try {
            setAuthQr(await studioService.getWahaAuthQr(undefined, provider));
        } catch {
            setAuthQr(null);
        }
    }, [provider]);

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
            setWaConfigs(configs);
            setSecurityMeta(meta);
            if (meta?.whatsappProvider === 'waha' || meta?.whatsappProvider === 'hermes') {
                setProvider(meta.whatsappProvider);
            }
            const cfg = configs.find((c) => c.tenant_id === activeTenant) || configs[0];
            if (cfg) {
                form.setFieldsValue({
                    tenantId: cfg.tenant_id,
                    notebookId: cfg.notebook_id,
                    enabled: cfg.enabled,
                    allowlistPhones: cfg.allowlist_phones || [],
                    useGuidedFlow: cfg.use_guided_flow,
                    wahaSession: cfg?.waha_session ?? '',
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

    useEffect(() => {
        // Reload session/QR when transport changes
        if (authLoading || loading) return;
        void Promise.all([loadStatus(), loadQr()]);
    }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

    // Connection derived states
    const sess = sessionStatus?.session;
    const connected = sess?.connected === true;
    const pairedButStuck = sess?.pairedButStuck === true;
    const status = (sess?.status || 'UNKNOWN').toUpperCase();
    const needsQr = !connected && (status === 'SCAN_QR_CODE' || status === 'STARTING' || status === 'FAILED');
    const wahaUnreachable = !loading && sessionStatus?.session === null;
    const businessPhone = sess?.meId?.split('@')[0]?.replace(/\D/g, '');
    const wahaVersion = sessionStatus?.version?.version;
    const allowlistRequired = securityMeta?.allowlistRequired ?? false;
    const providerLabel = provider === 'hermes' ? 'Hermes' : 'WAHA';

    // Polling effects
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

    // Handlers
    const handleStart = async () => {
        setStarting(true);
        try {
            const r = await studioService.startWahaSession(undefined, provider);
            if (r.connected) message.success('WhatsApp sudah terhubung');
            else message.info(`Sesi dimulai — status: ${r.status}. Scan QR di bawah.`);
            await load();
        } catch {
            message.error(`Gagal memulai sesi ${providerLabel}`);
        } finally {
            setStarting(false);
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await studioService.restartWahaSession(provider);
            message.info('Sesi di-restart. Tunggu QR muncul lalu scan ulang jika perlu.');
            await load();
        } catch {
            message.error('Gagal restart sesi');
        } finally {
            setRestarting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const r = await studioService.syncWahaSession(provider);
            if (r.connected) message.success(`Status ${providerLabel}: ${r.status}`);
            else message.warning(`Masih ${r.status}. Coba Sync lagi atau Mulai sesi untuk QR.`);
            await load();
        } catch {
            message.error('Gagal sync status');
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await studioService.logoutWahaSession(undefined, provider);
            message.info('Logout berhasil. Session nomor lama dihapus — scan QR baru untuk nomor lain.');
            setQrDataUrl(null);
            await load();
        } catch {
            message.error('Gagal logout sesi');
        } finally {
            setLoggingOut(false);
        }
    };

    const handleChangeNumber = async () => {
        setStarting(true);
        try {
            if (provider === 'hermes') {
                const r = await studioService.rebindHermesSession();
                if (r.error) message.warning(r.error);
                else message.info('Session lama dihapus. Scan QR dengan nomor baru sekarang.');
            } else {
                await studioService.logoutWahaSession(undefined, provider);
                const r = await studioService.startWahaSession(undefined, provider);
                message.info(`Sesi dimulai — status: ${r.status}. Scan QR nomor baru.`);
            }
            setQrDataUrl(null);
            await load();
        } catch {
            message.error('Gagal ganti nomor');
        } finally {
            setStarting(false);
        }
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        if (allowlistRequired && values.enabled && (!values.allowlistPhones || values.allowlistPhones.length === 0)) {
            message.error('Allowlist nomor wajib diisi saat WhatsApp diaktifkan.');
            return;
        }
        setSaving(true);
        try {
            await studioService.updateWhatsAppConfig({
                tenantId: values.tenantId || activeTenant,
                notebookId: values.notebookId || null,
                enabled: values.enabled,
                allowlistPhones: values.allowlistPhones || [],
                useGuidedFlow: values.useGuidedFlow,
                wahaSession: 'default',
                businessPhone: values.businessPhone?.replace(/\D/g, '') || null,
                label: values.label || null,
            });
            message.success('Konfigurasi WhatsApp disimpan');
            await load();
        } catch {
            message.error('Gagal menyimpan konfigurasi');
        } finally {
            setSaving(false);
        }
    };

    return (
        <CMSLayout
            title="WhatsApp Gateway"
            subTitle={
                securityMeta?.whatsappProvider === 'hermes'
                    ? 'Pair nomor WhatsApp via Hermes dan konfigurasi bot UMKM'
                    : 'Pair nomor WhatsApp dari aplikasi (Hermes atau WAHA) dan konfigurasi bot UMKM'
            }
            extra={[
                <Select
                    key="provider"
                    value={provider}
                    style={{ width: 160 }}
                    onChange={(v: WaProvider) => setProvider(v)}
                    options={
                        securityMeta?.whatsappProvider === 'hermes'
                            ? [{ value: 'hermes', label: 'Hermes' }]
                            : [
                                  { value: 'hermes', label: 'Hermes' },
                                  { value: 'waha', label: 'WAHA' },
                              ]
                    }
                />,
                pairedButStuck && (
                    <Button key="sync" loading={syncing} onClick={handleSync} type="primary">
                        Sync status → WORKING
                    </Button>
                ),
                <Button key="restart" loading={restarting} onClick={handleRestart} disabled={connected}>
                    Restart {providerLabel}
                </Button>,
                provider === 'hermes' && (
                    <Button key="rebind" loading={starting} onClick={handleChangeNumber} danger>
                        Ganti nomor
                    </Button>
                ),
                (connected || provider === 'hermes') && (
                    <Button key="logout" loading={loggingOut} onClick={handleLogout} danger icon={<LogoutOutlined />}>
                        Logout {providerLabel}
                    </Button>
                ),
                provider === 'waha' && (
                    <Button key="dash" icon={<LinkOutlined />} onClick={() => window.open(wahaDashboard, '_blank')}>
                        WAHA Dashboard
                    </Button>
                ),
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} />,
            ].filter(Boolean)}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Connection Alerts */}
                {wahaUnreachable && (
                    <Alert
                        type="error"
                        showIcon
                        title={`${providerLabel} tidak dapat dihubungi`}
                        description={
                            provider === 'hermes'
                                ? 'Middleware tidak reach Hermes bridge proxy (:8765). Pastikan nsoft3-hermes + plugin kasir-pipe berjalan.'
                                : 'Middleware tidak bisa reach container WAHA. Pastikan WAHA berjalan.'
                        }
                    />
                )}
                {!loading && pairedButStuck && (
                    <Alert type="warning" showIcon title="Bug sinkronisasi terdeteksi" description="Sudah login tapi status stuck di SCAN QR. Klik Sync status → WORKING di kanan atas." />
                )}
                {provider === 'hermes' && !connected && (
                    <Alert
                        type="info"
                        showIcon
                        title="Pairing Hermes"
                        description={
                            <>
                                Restart Hermes <strong>tidak</strong> ganti nomor — session lama tetap di disk.
                                Untuk nomor baru: klik <strong>Ganti nomor</strong> (logout + wipe + QR baru), lalu scan segera.
                                {securityMeta?.whatsappProvider === 'hermes'
                                    ? ' Transport production memakai Hermes; WAHA UI disembunyikan.'
                                    : ' Jangan pakai nomor yang masih aktif di WAHA.'}
                            </>
                        }
                    />
                )}
                {provider === 'hermes' && connected && (
                    <Alert
                        type="success"
                        showIcon
                        title="Hermes aktif"
                        description={
                            businessPhone
                                ? `Session WORKING untuk ${businessPhone}. Balasan kasir keluar lewat Hermes bridge.`
                                : 'Session WORKING. Jika nomor belum tampil, Sync/refresh setelah deploy pair.py terbaru (meId dari creds.json).'
                        }
                    />
                )}

                <Row gutter={[24, 24]}>
                    {/* LEFT COL: QR CODE PAIRING */}
                    <Col xs={24} md={10} lg={8}>
                        <Card size="small" style={glass} title={<Space><QrcodeOutlined /><Text strong>1. Koneksi Perangkat ({providerLabel})</Text></Space>}>
                            {connected ? (
                                <Space orientation="vertical" size="middle" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
                                    <CheckCircleOutlined style={{ fontSize: 48, color: '#25d366' }} />
                                    <Text strong style={{ fontSize: 16 }}>WhatsApp terhubung via {providerLabel}</Text>
                                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                        Nomor <strong>{businessPhone || '—'}</strong> siap menerima dan membalas pesan.
                                    </Paragraph>
                                    {wahaVersion && (
                                        <Tag>{providerLabel} {wahaVersion}</Tag>
                                    )}
                                </Space>
                            ) : loading ? (
                                <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                            ) : (
                                <Space orientation="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
                                    {qrDataUrl ? (
                                        <div style={{ padding: 16, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                                            <img src={qrDataUrl} alt="WhatsApp QR Code" width={240} height={240} style={{ display: 'block' }} />
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                            {needsQr ? (
                                                <><Spin style={{ marginBottom: 16 }} /><Paragraph type="secondary">{authQr?.error || 'Menunggu QR code...'}</Paragraph></>
                                            ) : (
                                                <>
                                                    <Paragraph type="secondary">Sesi belum dimulai atau status: <strong>{status}</strong></Paragraph>
                                                    <Button type="primary" icon={<PlayCircleOutlined />} loading={starting} onClick={handleStart} style={{ background: `linear-gradient(135deg, ${themeColor}, #25d366)`, border: 'none' }}>
                                                        Mulai sesi
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {needsQr && !qrDataUrl && (
                                        <Button type="primary" icon={<PlayCircleOutlined />} loading={starting} onClick={handleStart}>
                                            Mulai sesi
                                        </Button>
                                    )}
                                    {qrDataUrl && <Paragraph type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>QR diperbarui otomatis setiap 5 detik.</Paragraph>}
                                </Space>
                            )}
                        </Card>
                    </Col>

                    {/* RIGHT COL: AI STUDIO CONFIGURATION */}
                    <Col xs={24} md={14} lg={16}>
                        <Card size="small" style={glass} title={<Text strong>2. Konfigurasi AI Bot</Text>}>
                            {allowlistRequired && (
                                <Alert
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message="STUDIO_WHATSAPP_REQUIRE_ALLOWLIST Aktif"
                                    description="Mode production aktif — isi minimal satu nomor HP pelanggan sebelum mengaktifkan balasan WhatsApp."
                                />
                            )}
                            
                            <Form form={form} layout="vertical" onFinish={handleSave}>
                                <Row gutter={16}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="label" label="Label UMKM / Nama Bisnis">
                                            <Input placeholder="Toko Kue Enak" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="tenantId" label="Tenant ID (Otomatis)" required>
                                            <Input disabled />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="businessPhone" label="Nomor WhatsApp Bisnis">
                                            <Input placeholder="08123456789 (Milik Anda)" disabled />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item
                                            name="wahaSession"
                                            label={provider === 'hermes' ? 'Nama Sesi (legacy)' : 'Nama Sesi WAHA'}
                                        >
                                            <Input placeholder="default" disabled />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    name="notebookId"
                                    label="Pilih Notebook Pengetahuan (RAG)"
                                    rules={[{ required: true, message: 'Harap pilih Notebook untuk database AI.' }]}
                                >
                                    <Select placeholder="-- Pilih Notebook --" loading={loading}>
                                        {notebooks.map((n) => (
                                            <Select.Option key={n.id} value={n.id}>
                                                {n.title}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="allowlistPhones"
                                    label="Daftar Nomor Pelanggan (Allowlist)"
                                    tooltip="AI hanya akan membalas pesan dari nomor-nomor ini. Jika kosong, akan membalas SEMUA orang (tidak disarankan jika token AI terbatas)."
                                >
                                    <Select
                                        mode="tags"
                                        placeholder="Ketik nomor lalu Enter (misal: 62812...)"
                                        tokenSeparators={[',', ' ']}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>

                                <Row gutter={16} align="middle">
                                    <Col xs={24} sm={8}>
                                        <Form.Item name="enabled" label="Aktifkan AI Bot" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Switch checkedChildren="Aktif" unCheckedChildren="Mati" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Form.Item name="useGuidedFlow" label="Gunakan Guide Flow" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<SaveOutlined />}
                                            loading={saving}
                                            style={{ background: themeColor, width: '100%' }}
                                        >
                                            Simpan Konfigurasi
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
