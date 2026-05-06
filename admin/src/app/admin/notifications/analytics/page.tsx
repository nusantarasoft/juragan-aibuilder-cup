"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Statistic, Tag, Space, Typography, Spin,
    Progress, Empty, Button, Tooltip,
} from "antd";
import { motion } from "framer-motion";
import {
    MailOutlined, ApiOutlined, BellOutlined, SendOutlined,
    CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
    BarChartOutlined, PieChartOutlined, DashboardOutlined,
    ReloadOutlined, InboxOutlined, RiseOutlined,
    FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const CHANNEL_COLORS: Record<string, string> = {
    email: '#3b82f6', whatsapp: '#22c55e', webhook: '#f59e0b', in_app: '#8b5cf6',
};
const CHANNEL_LABELS: Record<string, string> = {
    email: 'Email', whatsapp: 'WhatsApp', webhook: 'Webhook', in_app: 'In-App',
};
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    email: <MailOutlined />, whatsapp: <SendOutlined />, webhook: <ApiOutlined />, in_app: <BellOutlined />,
};

interface NotifStats {
    totalLogs: number;
    sentLogs: number;
    failedLogs: number;
    totalNotifications: number;
    unreadNotifications: number;
    activeChannels: number;
    channelBreakdown: { type: string; count: number }[];
}

export default function NotificationAnalyticsPage() {
    const { themeColor } = usePreferencesStore();
    const [stats, setStats] = useState<NotifStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const statsData = await gql(`query($t: String!) { notificationStats(tenantId: $t) {
                totalLogs sentLogs failedLogs totalNotifications unreadNotifications activeChannels
                channelBreakdown { type count }
            } }`, { t: DEFAULT_TENANT_ID });
            setStats(statsData.notificationStats || null);
        } catch (e: any) { console.warn('Stats load failed:', e.message); }
        try {
            const chData = await gql(`query($t: String!) { notificationChannels(tenantId: $t) {
                id name channelType isActive createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            setChannels(chData.notificationChannels || []);
        } catch (e: any) { console.warn('Channels load failed:', e.message); }
        try {
            const rData = await gql(`query($t: String!) { notificationRules(tenantId: $t) {
                id name event channelType isActive
            } }`, { t: DEFAULT_TENANT_ID });
            setRules(rData.notificationRules || []);
        } catch (e: any) { console.warn('Rules load failed:', e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const successRate = stats && stats.totalLogs > 0
        ? Math.round((stats.sentLogs / stats.totalLogs) * 100) : 0;
    const failureRate = stats && stats.totalLogs > 0
        ? Math.round((stats.failedLogs / stats.totalLogs) * 100) : 0;
    const readRate = stats && stats.totalNotifications > 0
        ? Math.round(((stats.totalNotifications - stats.unreadNotifications) / stats.totalNotifications) * 100) : 0;

    const totalChannelLogs = stats?.channelBreakdown?.reduce((s, c) => s + c.count, 0) || 1;
    const activeRules = rules.filter(r => r.isActive).length;

    const topStats = [
        { title: 'Total Dispatched', value: stats?.totalLogs || 0, icon: <SendOutlined />, color: '#3b82f6' },
        { title: 'Delivered', value: stats?.sentLogs || 0, icon: <CheckCircleOutlined />, color: '#22c55e' },
        { title: 'Failed', value: stats?.failedLogs || 0, icon: <CloseCircleOutlined />, color: '#ef4444' },
        { title: 'Success Rate', value: successRate, suffix: '%', icon: <RiseOutlined />, color: '#10b981' },
        { title: 'Inbox Total', value: stats?.totalNotifications || 0, icon: <InboxOutlined />, color: '#8b5cf6' },
        { title: 'Unread', value: stats?.unreadNotifications || 0, icon: <BellOutlined />, color: '#f59e0b' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Analytics</AuroraText>}
            subTitle={<DecryptedText text="Notification delivery performance and system health analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'notification_analytics', title: 'Notification Analytics', columns: [{ header: 'Metric', key: 'title' }, { header: 'Value', key: 'value' }], data: topStats.map(s => ({ title: s.title, value: typeof s.value === 'number' ? s.value : 0 })) })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'notification_analytics', title: 'Notification Analytics', columns: [{ header: 'Metric', key: 'title' }, { header: 'Value', key: 'value' }], data: topStats.map(s => ({ title: s.title, value: typeof s.value === 'number' ? s.value : 0 })) })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Spin spinning={loading}>
                {/* Top Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    {topStats.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic
                                        title={s.title} value={s.value} suffix={(s as any).suffix}
                                        prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }}
                                    />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Row 1: Success Rate Circle + Channel Distribution + Read Rate */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            <Card title={<Space><DashboardOutlined /> Delivery Success Rate</Space>} size="small" style={glass}>
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <Progress
                                        type="dashboard" percent={successRate} size={140}
                                        strokeColor={successRate >= 80 ? { '0%': '#22c55e', '100%': '#10b981' } : successRate >= 50 ? { '0%': '#f59e0b', '100%': '#eab308' } : { '0%': '#ef4444', '100%': '#dc2626' }}
                                    />
                                    <br />
                                    <Text type="secondary">{stats?.sentLogs || 0} of {stats?.totalLogs || 0} dispatched successfully</Text>
                                    {failureRate > 20 && (
                                        <div style={{ marginTop: 8 }}>
                                            <Tag color="red" icon={<CloseCircleOutlined />}>High failure rate: {failureRate}%</Tag>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                            <Card title={<Space><PieChartOutlined /> Channel Distribution</Space>} size="small" style={glass}>
                                {(!stats?.channelBreakdown || stats.channelBreakdown.length === 0) ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                        {stats.channelBreakdown.sort((a, b) => b.count - a.count).map(ch => (
                                            <div key={ch.type}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <Space size={6}>
                                                        {CHANNEL_ICONS[ch.type] || <SendOutlined />}
                                                        <Text style={{ fontSize: 12 }}>{CHANNEL_LABELS[ch.type] || ch.type}</Text>
                                                    </Space>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{ch.count} ({Math.round((ch.count / totalChannelLogs) * 100)}%)</Text>
                                                </div>
                                                <Progress
                                                    percent={Math.round((ch.count / totalChannelLogs) * 100)}
                                                    showInfo={false}
                                                    strokeColor={CHANNEL_COLORS[ch.type] || '#94a3b8'}
                                                    size="small"
                                                />
                                            </div>
                                        ))}
                                    </Space>
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                            <Card title={<Space><BarChartOutlined /> Inbox Health</Space>} size="small" style={glass}>
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
                                        <div>
                                            <Progress type="circle" percent={readRate} size={80}
                                                strokeColor={{ '0%': '#8b5cf6', '100%': '#6d28d9' }}
                                                format={() => `${readRate}%`}
                                            />
                                            <div style={{ marginTop: 6 }}><Text type="secondary" style={{ fontSize: 11 }}>Read Rate</Text></div>
                                        </div>
                                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                                            <div><Text style={{ fontSize: 12 }}>📬 Total: <Text strong>{stats?.totalNotifications || 0}</Text></Text></div>
                                            <div><Text style={{ fontSize: 12 }}>📖 Read: <Text strong>{(stats?.totalNotifications || 0) - (stats?.unreadNotifications || 0)}</Text></Text></div>
                                            <div><Text style={{ fontSize: 12 }}>🔔 Unread: <Text strong style={{ color: '#f59e0b' }}>{stats?.unreadNotifications || 0}</Text></Text></div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Row 2: Active Channels + Active Rules */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                            <Card title={<Space><SendOutlined /> Channel Status</Space>} size="small" style={glass}>
                                {channels.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No channels configured" />
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                                        {channels.map(ch => (
                                            <div key={ch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                <Space size={8}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ch.isActive ? '#22c55e' : '#94a3b8' }} />
                                                    {CHANNEL_ICONS[ch.channelType] || <SendOutlined />}
                                                    <Text strong style={{ fontSize: 13 }}>{ch.name}</Text>
                                                </Space>
                                                <Space>
                                                    <Tag color={CHANNEL_COLORS[ch.channelType] || 'default'} style={{ fontSize: 10 }}>
                                                        {CHANNEL_LABELS[ch.channelType] || ch.channelType}
                                                    </Tag>
                                                    <Tag color={ch.isActive ? 'success' : 'default'} style={{ fontSize: 10 }}>
                                                        {ch.isActive ? 'Active' : 'Inactive'}
                                                    </Tag>
                                                </Space>
                                            </div>
                                        ))}
                                    </Space>
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Card title={<Space><BellOutlined /> Automation Rules</Space>} size="small" style={glass}
                                extra={<Tag color="blue">{activeRules} active</Tag>}>
                                {rules.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rules configured" />
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                                        {rules.map(r => (
                                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                <Space size={8}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.isActive ? '#22c55e' : '#94a3b8' }} />
                                                    <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
                                                </Space>
                                                <Space>
                                                    <Tag style={{ fontSize: 10 }}>{r.event}</Tag>
                                                    <Tag color={CHANNEL_COLORS[r.channelType] || 'default'} style={{ fontSize: 10 }}>
                                                        {CHANNEL_LABELS[r.channelType] || r.channelType}
                                                    </Tag>
                                                    <Tag color={r.isActive ? 'success' : 'default'} style={{ fontSize: 10 }}>
                                                        {r.isActive ? 'Active' : 'Off'}
                                                    </Tag>
                                                </Space>
                                            </div>
                                        ))}
                                    </Space>
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Spin>
        </CMSLayout>
    );
}
