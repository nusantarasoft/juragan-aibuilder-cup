'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Alert, Empty, Spin, Table } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, BarChartOutlined, AlertOutlined, CloudServerOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { useTheme } from 'next-themes';
import { isPlatformMetricsLive, type PlatformMetricsState } from '@/lib/platformMetricsView';

const { Text } = Typography;

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: 24,
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
};

const darkGlassStyle = {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
};

export default function PlatformMetricsPage() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const activeGlassStyle = isDark ? darkGlassStyle : glassStyle;
    const textColor = isDark ? '#f8fafc' : '#0f172a';

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<PlatformMetricsState | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/observability/prometheus-summary', { cache: 'no-store' });
            const json = (await res.json()) as PlatformMetricsState;
            setSummary(json);
        } catch {
            setSummary({ available: false, reason: 'Could not load Prometheus summary from the admin API.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const live = isPlatformMetricsLive(summary);

    return (
        <CMSLayout
            title={
                <Space wrap>
                    <AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Platform Metrics</AuroraText>
                    {live ? <Tag color="success">Live</Tag> : <Tag color="default">Demo</Tag>}
                </Space>
            }
            subTitle={
                <DecryptedText
                    text={
                        live
                            ? 'Scrape targets and request rates from Prometheus'
                            : 'Connect Prometheus to replace this empty dashboard — no sample SLO numbers shown as live'
                    }
                    animateOn="view"
                    speed={40}
                    maxIterations={15}
                />
            }
            extra={[
                <Button
                    key="r"
                    icon={<ReloadOutlined />}
                    type="primary"
                    shape="circle"
                    style={{ background: themeColor, border: 'none' }}
                    onClick={() => void load()}
                    title="Refresh metrics"
                />,
            ]}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}
            >
                {loading && (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" />
                    </div>
                )}

                {!loading && !live && (
                    <>
                        <Alert
                            type="info"
                            showIcon
                            message="Prometheus not connected"
                            description={
                                summary && !summary.available
                                    ? summary.reason
                                    : 'Start the Prometheus service (docker-compose.full) or set PROMETHEUS_URL for this admin app.'
                            }
                        />
                        <Card style={activeGlassStyle}>
                            <Empty
                                description={
                                    <span style={{ color: textColor }}>
                                        Platform SLO, latency charts, and endpoint tables appear here when Prometheus is reachable.
                                        Infrastructure overview remains under{' '}
                                        <a href="/admin/infrastructure/prometheus">Infrastructure → Prometheus</a>.
                                    </span>
                                }
                            />
                        </Card>
                    </>
                )}

                {!loading && live && (
                    <>
                        <Row gutter={[16, 16]}>
                            {[
                                {
                                    t: 'Targets up',
                                    v: summary.targetsUp,
                                    c: '#10b981',
                                    i: <CheckCircleOutlined />,
                                },
                                {
                                    t: 'Targets down',
                                    v: summary.targetsDown,
                                    c: summary.targetsDown > 0 ? '#ef4444' : '#10b981',
                                    i: <AlertOutlined />,
                                },
                                {
                                    t: 'Requests/min',
                                    v: summary.requestsPerMinute != null ? summary.requestsPerMinute.toLocaleString() : '—',
                                    c: '#3b82f6',
                                    i: <ThunderboltOutlined />,
                                },
                                {
                                    t: 'Error rate',
                                    v: summary.errorRatePercent != null ? `${summary.errorRatePercent}%` : '—',
                                    c: '#f59e0b',
                                    i: <ClockCircleOutlined />,
                                },
                            ].map((s, i) => (
                                <Col key={i} xs={12} md={6}>
                                    <Card size="small" style={{ ...activeGlassStyle, overflow: 'hidden' }}>
                                        <Statistic
                                            title={
                                                <span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                                                    {s.t}
                                                </span>
                                            }
                                            value={s.v}
                                            prefix={s.i}
                                            valueStyle={{ color: s.c, fontSize: 28, fontWeight: 800 }}
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        <Card
                            style={activeGlassStyle}
                            title={
                                <Space>
                                    <BarChartOutlined style={{ color: themeColor }} />
                                    <Text strong style={{ color: textColor }}>
                                        Prometheus scrape targets
                                    </Text>
                                </Space>
                            }
                        >
                            <Table
                                size="small"
                                pagination={false}
                                rowKey={(r) => `${r.job}-${r.lastScrape ?? ''}`}
                                dataSource={summary.targets}
                                columns={[
                                    { title: 'Job', dataIndex: 'job', render: (v: string) => <Text code>{v}</Text> },
                                    {
                                        title: 'Health',
                                        dataIndex: 'health',
                                        render: (v: string) => (
                                            <Tag color={v === 'up' ? 'green' : v === 'down' ? 'red' : 'default'}>{v}</Tag>
                                        ),
                                    },
                                    {
                                        title: 'Last scrape',
                                        dataIndex: 'lastScrape',
                                        render: (v?: string) => v ?? '—',
                                    },
                                ]}
                            />
                            <div style={{ marginTop: 16 }}>
                                <Button
                                    type="link"
                                    icon={<CloudServerOutlined />}
                                    href="/admin/infrastructure/prometheus"
                                >
                                    Open infrastructure Prometheus view
                                </Button>
                            </div>
                        </Card>
                    </>
                )}
            </motion.div>
        </CMSLayout>
    );
}
