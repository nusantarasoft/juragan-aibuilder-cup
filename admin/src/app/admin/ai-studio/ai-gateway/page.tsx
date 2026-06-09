'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    studioService,
    StudioNotebook,
    StudioWhatsAppSessionStatus,
    StudioWhatsAppSecurityMeta,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/useAuthStore';

const { Text, Paragraph } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

const WAHA_DASHBOARD =
    process.env.NEXT_PUBLIC_WAHA_DASHBOARD_URL || 'http://localhost:3010/dashboard';

export default function WhatsAppGatewayPage() {
    const { themeColor } = usePreferencesStore();
    const { user: contextUser, loading: authLoading } = useAuth();
    const authUser = useAuthStore((s) => s.user);
    const userId = authUser?.id ?? contextUser?.id;
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [sessionStatus, setSessionStatus] = useState<StudioWhatsAppSessionStatus | null>(null);
    const [securityMeta, setSecurityMeta] = useState<StudioWhatsAppSecurityMeta | null>(null);
    const [restartingWaha, setRestartingWaha] = useState(false);
    const [syncingWaha, setSyncingWaha] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (userId) {
                try {
                    setNotebooks(await studioService.getNotebooks(userId));
                } catch (e: unknown) {
                    const err = e as { message?: string };
                    message.error(err.message || 'Gagal memuat notebooks');
                    setNotebooks([]);
                }
            } else {
                setNotebooks([]);
                message.warning('Login dulu agar daftar notebook bisa dimuat.');
            }

            try {
                const cfg = await studioService.getWhatsAppConfig();
                form.setFieldsValue({
                    notebookId: cfg?.notebook_id ?? undefined,
                    enabled: cfg?.enabled ?? false,
                    allowlistPhones: cfg?.allowlist_phones ?? [],
                    useGuidedFlow: cfg?.use_guided_flow ?? false,
                });
            } catch (e: unknown) {
                const err = e as { message?: string };
                message.error(err.message || 'Gagal memuat konfigurasi WhatsApp');
            }

            try {
                setSessionStatus(await studioService.getWhatsAppSessionStatus());
            } catch {
                setSessionStatus(null);
            }

            try {
                setSecurityMeta(await studioService.getWhatsAppSecurityMeta());
            } catch {
                setSecurityMeta(null);
            }
        } finally {
            setLoading(false);
        }
    }, [form, userId]);

    useEffect(() => {
        if (authLoading) return;
        load();
    }, [load, authLoading]);

    const wahaConnected = sessionStatus?.session?.connected === true;

    useEffect(() => {
        if (authLoading || wahaConnected) return;
        const t = setInterval(() => {
            studioService.getWhatsAppSessionStatus().then(setSessionStatus).catch(() => {});
        }, 8000);
        return () => clearInterval(t);
    }, [authLoading, wahaConnected]);

    const allowlistRequired = securityMeta?.allowlistRequired ?? false;

    const handleSave = async () => {
        const values = await form.validateFields();
        if (
            allowlistRequired &&
            values.enabled &&
            (!values.allowlistPhones || values.allowlistPhones.length === 0)
        ) {
            message.error('Allowlist nomor wajib diisi saat WhatsApp diaktifkan.');
            return;
        }
        setSaving(true);
        try {
            await studioService.updateWhatsAppConfig({
                notebookId: values.notebookId || null,
                enabled: values.enabled,
                allowlistPhones: values.allowlistPhones || [],
                useGuidedFlow: values.useGuidedFlow,
            });
            message.success('Konfigurasi WhatsApp disimpan');
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const sess = sessionStatus?.session;
    const connected = sess?.connected === true;
    const pairedButStuck = sess?.pairedButStuck === true;
    const wahaVersion = sessionStatus?.version?.version;
    const businessPhone = sess?.meId?.split('@')[0]?.replace(/\D/g, '');

    const handleSyncWaha = async () => {
        setSyncingWaha(true);
        try {
            const r = await studioService.syncWahaSession();
            if (r.connected) {
                message.success(`Status WAHA: ${r.status}`);
            } else {
                message.warning(
                    `Masih ${r.status}. Upgrade WAHA ke 2025.12.1+ (docker pull devlikeapro/waha:latest-2025.12.3) lalu recreate container.`,
                );
            }
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal sync status WAHA');
        } finally {
            setSyncingWaha(false);
        }
    };

    const handleRestartWaha = async () => {
        setRestartingWaha(true);
        try {
            await studioService.restartWahaSession();
            message.info('Sesi WAHA di-restart. Buka WAHA Dashboard dan scan QR sampai WORKING.');
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal restart sesi WAHA');
        } finally {
            setRestartingWaha(false);
        }
    };

    return (
        <CMSLayout
            title={
                <AuroraText colors={[themeColor, '#25d366', '#8b5cf6']}>
                    WhatsApp (WAHA)
                </AuroraText>
            }
            subTitle={
                <DecryptedText
                    text="Hubungkan AI Studio ke WhatsApp — chat RAG & data penjualan lewat WA"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential
                />
            }
            extra={[
                pairedButStuck ? (
                    <Button key="sync" loading={syncingWaha} onClick={handleSyncWaha} type="primary">
                        Sync status → WORKING
                    </Button>
                ) : null,
                <Button
                    key="restart"
                    loading={restartingWaha}
                    onClick={handleRestartWaha}
                    disabled={connected}
                >
                    Restart sesi
                </Button>,
                <Button
                    key="dash"
                    icon={<LinkOutlined />}
                    onClick={() => window.open(WAHA_DASHBOARD, '_blank')}
                >
                    WAHA Dashboard
                </Button>,
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} />,
            ]}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                {!loading && pairedButStuck && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Sudah login di WAHA, tapi status API masih SCAN QR (bug versi lama)"
                        description={
                            <div style={{ fontSize: 12 }}>
                                <p style={{ margin: '0 0 8px' }}>
                                    Nomor terdeteksi: <strong>{businessPhone || '—'}</strong>
                                    {wahaVersion ? (
                                        <>
                                            {' '}
                                            · WAHA v<strong>{wahaVersion}</strong> (butuh ≥ 2025.12.1)
                                        </>
                                    ) : null}
                                </p>
                                <ol style={{ margin: 0, paddingLeft: 18 }}>
                                    <li>
                                        Klik <strong>Sync status → WORKING</strong> di kanan atas
                                    </li>
                                    <li>
                                        Jika masih SCAN QR: upgrade image lalu recreate —{' '}
                                        <code>docker compose pull waha &amp;&amp; docker compose up -d waha --force-recreate</code>
                                    </li>
                                </ol>
                            </div>
                        }
                    />
                )}

                {!loading && !connected && !pairedButStuck && (
                    <Alert
                        type="error"
                        showIcon
                        message="WhatsApp belum terhubung — pesan tidak akan dibalas"
                        description={
                            <div style={{ fontSize: 12 }}>
                                <p style={{ margin: '0 0 8px' }}>
                                    Status sesi: <strong>{sess?.status || 'UNKNOWN'}</strong>
                                    {businessPhone ? (
                                        <>
                                            {' '}
                                            — chat ke nomor bisnis: <strong>{businessPhone}</strong>
                                        </>
                                    ) : null}
                                </p>
                                <ol style={{ margin: 0, paddingLeft: 18 }}>
                                    <li>
                                        Klik <strong>WAHA Dashboard</strong> → session <code>default</code> → scan QR
                                        WhatsApp <strong>bisnis</strong> (bukan HP pengirim tes)
                                    </li>
                                    <li>Tunggu status <strong>WORKING</strong> (kartu hijau di atas)</li>
                                    <li>Baru kirim pesan dari nomor lain ke nomor bisnis tersebut</li>
                                </ol>
                            </div>
                        }
                    />
                )}

                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, borderTop: '3px solid #25d366' }}>
                            <Space>
                                <WhatsAppOutlined style={{ color: '#25d366', fontSize: 22 }} />
                                <div>
                                    <Text strong>Status sesi WAHA</Text>
                                    <br />
                                    {loading ? (
                                        <Spin size="small" />
                                    ) : connected ? (
                                        <Tag icon={<CheckCircleOutlined />} color="success">
                                            {sess?.status || 'WORKING'}
                                        </Tag>
                                    ) : (
                                        <Tag icon={<ExclamationCircleOutlined />} color="warning">
                                            {sess?.status || 'SCAN QR di Dashboard'}
                                        </Tag>
                                    )}
                                </div>
                            </Space>
                            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                                Scan QR di WAHA Dashboard, lalu pastikan session <Text code>default</Text>{' '}
                                berstatus <Text strong>WORKING</Text>
                                {wahaVersion ? <> (WAHA v{wahaVersion})</> : null}.
                            </Paragraph>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Alert
                            type="info"
                            showIcon
                            message="Alur singkat"
                            description={
                                <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                                    <li>Pair WhatsApp di WAHA Dashboard</li>
                                    <li>Pilih notebook AI Studio di bawah</li>
                                    <li>Aktifkan WhatsApp & simpan</li>
                                    <li>Kirim pesan ke nomor bisnis yang terhubung</li>
                                </ol>
                            }
                        />
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Text strong>Konfigurasi AI Studio ↔ WhatsApp</Text>}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin />
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSave}>
                            <Form.Item
                                name="enabled"
                                label="Aktifkan balasan WhatsApp"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            <Form.Item
                                name="notebookId"
                                label="Notebook AI Studio"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Pilih notebook untuk konteks RAG & database',
                                    },
                                ]}
                            >
                                <Select
                                    placeholder="Pilih notebook"
                                    allowClear
                                    options={notebooks.map((n) => ({
                                        value: n.id,
                                        label: n.name,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item
                                name="useGuidedFlow"
                                label="Gunakan guided flow (published) jika ada"
                                valuePropName="checked"
                                extra="Jika notebook punya guide flow published, chat WA mengikuti alur tersebut."
                            >
                                <Switch />
                            </Form.Item>
                            {allowlistRequired ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message="Allowlist wajib"
                                    description="Mode production / STUDIO_WHATSAPP_REQUIRE_ALLOWLIST aktif — isi minimal satu nomor sebelum mengaktifkan balasan WhatsApp."
                                />
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message="Mode development"
                                    description="Allowlist kosong mengizinkan semua nomor. Di production, allowlist otomatis wajib."
                                />
                            )}
                            <Form.Item
                                name="allowlistPhones"
                                label="Allowlist nomor"
                                rules={
                                    allowlistRequired
                                        ? [
                                              ({ getFieldValue }) => ({
                                                  validator(_, value: string[] | undefined) {
                                                      if (
                                                          !getFieldValue('enabled') ||
                                                          (value && value.length > 0)
                                                      ) {
                                                          return Promise.resolve();
                                                      }
                                                      return Promise.reject(
                                                          new Error(
                                                              'Isi minimal satu nomor saat WhatsApp aktif',
                                                          ),
                                                      );
                                                  },
                                              }),
                                          ]
                                        : undefined
                                }
                                extra={
                                    securityMeta
                                        ? `Format: 628123456789 tanpa +. Batas: ${securityMeta.rateLimitPerMinute} pesan/menit per nomor.`
                                        : 'Format: 628123456789 tanpa +.'
                                }
                            >
                                <Select mode="tags" placeholder="628..." tokenSeparators={[',', ' ']} />
                            </Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={saving}
                                style={{
                                    background: `linear-gradient(135deg, ${themeColor}, #25d366)`,
                                    border: 'none',
                                }}
                            >
                                Simpan
                            </Button>
                        </Form>
                    )}
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
