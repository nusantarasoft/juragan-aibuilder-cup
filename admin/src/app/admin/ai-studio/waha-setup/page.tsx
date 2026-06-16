'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
    message,
    Spin,
    Alert,
} from 'antd';
import {
    WhatsAppOutlined,
    ReloadOutlined,
    LinkOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    QrcodeOutlined,
    PlayCircleOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    studioService,
    StudioWhatsAppSessionStatus,
    StudioWahaAuthQr,
} from '@/lib/studioService';

const { Text, Paragraph } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

const WAHA_DASHBOARD =
    process.env.NEXT_PUBLIC_WAHA_DASHBOARD_URL || 'http://127.0.0.1:3010/dashboard';

export default function WahaSetupPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<StudioWhatsAppSessionStatus | null>(null);
    const [authQr, setAuthQr] = useState<StudioWahaAuthQr | null>(null);

    const loadStatus = useCallback(async () => {
        try {
            setSessionStatus(await studioService.getWhatsAppSessionStatus());
        } catch {
            setSessionStatus(null);
        }
    }, []);

    const loadQr = useCallback(async () => {
        try {
            setAuthQr(await studioService.getWahaAuthQr());
        } catch {
            setAuthQr(null);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            await loadStatus();
            await loadQr();
        } finally {
            setLoading(false);
        }
    }, [loadStatus, loadQr]);

    useEffect(() => {
        load();
    }, [load]);

    const sess = sessionStatus?.session;
    const connected = sess?.connected === true;
    const pairedButStuck = sess?.pairedButStuck === true;
    const status = (sess?.status || 'UNKNOWN').toUpperCase();
    const needsQr = !connected && (status === 'SCAN_QR_CODE' || status === 'STARTING' || status === 'FAILED');
    const wahaUnreachable = !loading && sessionStatus?.session === null;
    const businessPhone = sess?.meId?.split('@')[0]?.replace(/\D/g, '');
    const wahaVersion = sessionStatus?.version?.version;

    useEffect(() => {
        if (loading || connected) return;
        const statusTimer = setInterval(() => {
            loadStatus();
        }, 6000);
        return () => clearInterval(statusTimer);
    }, [loading, connected, loadStatus]);

    useEffect(() => {
        if (loading || connected || !needsQr) return;
        const qrTimer = setInterval(() => {
            loadQr();
        }, 5000);
        return () => clearInterval(qrTimer);
    }, [loading, connected, needsQr, loadQr]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const r = await studioService.startWahaSession();
            if (r.connected) {
                message.success('WhatsApp sudah terhubung');
            } else {
                message.info(`Sesi dimulai — status: ${r.status}. Scan QR di bawah.`);
            }
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal memulai sesi WAHA');
        } finally {
            setStarting(false);
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await studioService.restartWahaSession();
            message.info('Sesi di-restart. Tunggu QR muncul lalu scan ulang jika perlu.');
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal restart sesi');
        } finally {
            setRestarting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const r = await studioService.syncWahaSession();
            if (r.connected) {
                message.success(`Status WAHA: ${r.status}`);
            } else {
                message.warning(`Masih ${r.status}. Coba upgrade image WAHA jika stuck SCAN QR.`);
            }
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal sync status');
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await studioService.logoutWahaSession();
            message.info('Logout berhasil. Scan QR baru untuk pairing ulang.');
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal logout sesi');
        } finally {
            setLoggingOut(false);
        }
    };

    const qrDataUrl =
        authQr?.available && authQr.imageBase64
            ? `data:${authQr.mimetype || 'image/png'};base64,${authQr.imageBase64}`
            : null;

    return (
        <CMSLayout
            title={
                <AuroraText colors={[themeColor, '#25d366', '#8b5cf6']}>
                    Setup WAHA
                </AuroraText>
            }
            subTitle={
                <DecryptedText
                    text="Pair WhatsApp langsung dari admin — tanpa buka WAHA Dashboard"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential
                />
            }
            extra={[
                <Link key="wa-config" href="/admin/ai-studio/ai-gateway">
                    <Button>Konfigurasi WhatsApp</Button>
                </Link>,
                pairedButStuck ? (
                    <Button key="sync" loading={syncing} onClick={handleSync} type="primary">
                        Sync status → WORKING
                    </Button>
                ) : null,
                <Button key="restart" loading={restarting} onClick={handleRestart} disabled={connected}>
                    Restart sesi
                </Button>,
                connected ? (
                    <Button key="logout" loading={loggingOut} onClick={handleLogout} danger icon={<LogoutOutlined />}>
                        Logout & scan ulang
                    </Button>
                ) : null,
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
                {wahaUnreachable && (
                    <Alert
                        type="error"
                        showIcon
                        title="WAHA tidak dapat dihubungi"
                        description={
                            <div style={{ fontSize: 12 }}>
                                <p style={{ margin: '0 0 8px' }}>
                                    Middleware tidak bisa reach container WAHA. Pastikan WAHA berjalan:
                                </p>
                                <code>docker compose up -d waha</code>
                            </div>
                        }
                    />
                )}

                {!loading && pairedButStuck && (
                    <Alert
                        type="warning"
                        showIcon
                        title="Sudah login, tapi status API masih SCAN QR (bug versi lama)"
                        description={
                            <div style={{ fontSize: 12 }}>
                                Nomor terdeteksi: <strong>{businessPhone || '—'}</strong>
                                {wahaVersion ? <> · WAHA v<strong>{wahaVersion}</strong></> : null}
                                {' — '}klik <strong>Sync status → WORKING</strong> di kanan atas.
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
                                    <Text strong>Status sesi</Text>
                                    <br />
                                    {loading ? (
                                        <Spin size="small" />
                                    ) : connected ? (
                                        <Tag icon={<CheckCircleOutlined />} color="success">
                                            WORKING
                                        </Tag>
                                    ) : (
                                        <Tag icon={<ExclamationCircleOutlined />} color="warning">
                                            {status}
                                        </Tag>
                                    )}
                                </div>
                            </Space>
                            {connected && businessPhone && (
                                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                                    Nomor terhubung: <Text strong>{businessPhone}</Text>
                                    {wahaVersion ? <> · WAHA v{wahaVersion}</> : null}
                                </Paragraph>
                            )}
                            {!connected && !loading && (
                                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                                    Session <Text code>default</Text>
                                    {wahaVersion ? <> · WAHA v{wahaVersion}</> : null}
                                </Paragraph>
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Alert
                            type="info"
                            showIcon
                            title="Langkah pairing"
                            description={
                                <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                                    <li>Klik <strong>Mulai sesi</strong> jika belum ada QR</li>
                                    <li>Buka WhatsApp di HP → Perangkat Tertaut → Tautkan perangkat</li>
                                    <li>Scan QR code di bawah</li>
                                    <li>Tunggu status <strong>WORKING</strong></li>
                                    <li>
                                        Lanjut ke{' '}
                                        <Link href="/admin/ai-studio/ai-gateway">Konfigurasi WhatsApp</Link>
                                    </li>
                                </ol>
                            }
                        />
                    </Col>
                </Row>

                {connected ? (
                    <Card size="small" style={{ ...glass, borderTop: '3px solid #25d366' }}>
                        <Space orientation="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <CheckCircleOutlined style={{ fontSize: 48, color: '#25d366' }} />
                            <Text strong style={{ fontSize: 16 }}>
                                WhatsApp terhubung
                            </Text>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                Nomor <strong>{businessPhone}</strong> siap menerima dan membalas pesan.
                            </Paragraph>
                            <Link href="/admin/ai-studio/ai-gateway">
                                <Button
                                    type="primary"
                                    style={{
                                        background: `linear-gradient(135deg, ${themeColor}, #25d366)`,
                                        border: 'none',
                                    }}
                                >
                                    Lanjut ke Konfigurasi WhatsApp
                                </Button>
                            </Link>
                        </Space>
                    </Card>
                ) : (
                    <Card
                        size="small"
                        style={glass}
                        title={
                            <Space>
                                <QrcodeOutlined />
                                <Text strong>QR Code Pairing</Text>
                            </Space>
                        }
                    >
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <Spin size="large" />
                            </div>
                        ) : (
                            <Space orientation="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
                                {qrDataUrl ? (
                                    <div
                                        style={{
                                            padding: 16,
                                            background: '#fff',
                                            borderRadius: 12,
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={qrDataUrl}
                                            alt="WhatsApp QR Code"
                                            width={280}
                                            height={280}
                                            style={{ display: 'block' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                        {needsQr ? (
                                            <>
                                                <Spin style={{ marginBottom: 16 }} />
                                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                                    {authQr?.error || 'Menunggu QR code...'}
                                                </Paragraph>
                                            </>
                                        ) : (
                                            <>
                                                <Paragraph type="secondary">
                                                    Sesi belum dimulai atau status: <strong>{status}</strong>
                                                </Paragraph>
                                                <Button
                                                    type="primary"
                                                    icon={<PlayCircleOutlined />}
                                                    loading={starting}
                                                    onClick={handleStart}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${themeColor}, #25d366)`,
                                                        border: 'none',
                                                    }}
                                                >
                                                    Mulai sesi
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                                {needsQr && !qrDataUrl && (
                                    <Button
                                        type="primary"
                                        icon={<PlayCircleOutlined />}
                                        loading={starting}
                                        onClick={handleStart}
                                    >
                                        Mulai sesi
                                    </Button>
                                )}
                                {qrDataUrl && (
                                    <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, textAlign: 'center' }}>
                                        QR diperbarui otomatis setiap 5 detik. Scan sebelum expired.
                                    </Paragraph>
                                )}
                            </Space>
                        )}
                    </Card>
                )}
            </motion.div>
        </CMSLayout>
    );
}
