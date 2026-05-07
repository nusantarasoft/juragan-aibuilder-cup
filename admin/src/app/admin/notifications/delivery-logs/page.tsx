"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Space, Tag, Card, Select, Statistic,
    message, Typography, Row, Col, Tooltip, Empty, Badge,
} from "antd";
import { motion } from "framer-motion";
import {
    ReloadOutlined, MailOutlined, WhatsAppOutlined, ApiOutlined,
    BellOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, SendOutlined, UserOutlined,
    ExclamationCircleOutlined, FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface DeliveryLog {
    id: string;
    channelType: string;
    recipient: string;
    subject: string;
    status: string;
    errorMessage: string;
    sentAt: string;
    createdAt: string;
}

const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    email:    { icon: <MailOutlined />,      color: '#3b82f6', label: 'Email' },
    whatsapp: { icon: <WhatsAppOutlined />,  color: '#22c55e', label: 'WhatsApp' },
    webhook:  { icon: <ApiOutlined />,       color: '#f59e0b', label: 'Webhook' },
    in_app:   { icon: <BellOutlined />,      color: '#8b5cf6', label: 'In-App' },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    sent:    { icon: <CheckCircleOutlined />, color: 'success', label: 'Sent' },
    failed:  { icon: <CloseCircleOutlined />, color: 'error',   label: 'Failed' },
    pending: { icon: <ClockCircleOutlined />, color: 'processing', label: 'Pending' },
};

export default function DeliveryLogsPage() {
    const { themeColor } = usePreferencesStore();
    const [logs, setLogs] = useState<DeliveryLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterChannel, setFilterChannel] = useState<string | undefined>();
    const [filterStatus, setFilterStatus] = useState<string | undefined>();

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql<{ notificationLogs: DeliveryLog[] }>(`
                query($tenantId: String!, $limit: Float) {
                    notificationLogs(tenantId: $tenantId, limit: $limit) {
                        id channelType recipient subject status
                        errorMessage sentAt createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, limit: 200 });

            let items = data.notificationLogs || [];

            // Client-side filtering
            if (filterChannel) items = items.filter(l => l.channelType === filterChannel);
            if (filterStatus) items = items.filter(l => l.status === filterStatus);

            setLogs(items);
        } catch (err: any) {
            message.error("Failed to load delivery logs: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [filterChannel, filterStatus]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    // Stats
    const total = logs.length;
    const sentCount = logs.filter(l => l.status === 'sent').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    const pendingCount = logs.filter(l => l.status === 'pending').length;
    const successRate = total > 0 ? Math.round((sentCount / total) * 100) : 0;

    const channelBreakdown: Record<string, number> = {};
    logs.forEach(l => { channelBreakdown[l.channelType] = (channelBreakdown[l.channelType] || 0) + 1; });

    const columns: ColumnsType<DeliveryLog> = [
        {
            title: "Time",
            key: "createdAt",
            width: 140,
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            defaultSortOrder: 'descend',
            render: (_, r) => (
                <Tooltip title={dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                    <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#94a3b8' }} />
                        <Text style={{ fontSize: 12 }}>{dayjs(r.createdAt).fromNow()}</Text>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: "Channel",
            key: "channelType",
            width: 120,
            align: 'center',
            filters: Object.entries(CHANNEL_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
            onFilter: (val, r) => r.channelType === val,
            render: (_, r) => {
                const cfg = CHANNEL_CONFIG[r.channelType] || { icon: <SendOutlined />, color: '#64748b', label: r.channelType };
                return (
                    <Tag icon={cfg.icon} color={cfg.color} style={{ fontWeight: 500 }}>
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: "Status",
            key: "status",
            width: 100,
            align: 'center',
            filters: [
                { text: 'Sent', value: 'sent' },
                { text: 'Failed', value: 'failed' },
                { text: 'Pending', value: 'pending' },
            ],
            onFilter: (val, r) => r.status === val,
            render: (_, r) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return <Badge status={cfg.color as any} text={cfg.label} />;
            },
        },
        {
            title: "Recipient",
            key: "recipient",
            width: 220,
            render: (_, r) => (
                <Space size={4}>
                    <UserOutlined style={{ color: '#94a3b8' }} />
                    <Text style={{ fontSize: 12 }}>{r.recipient}</Text>
                </Space>
            ),
        },
        {
            title: "Subject",
            dataIndex: "subject",
            key: "subject",
            ellipsis: true,
            render: (v) => (
                <Tooltip title={v}>
                    <Text strong style={{ fontSize: 13 }}>{v || '—'}</Text>
                </Tooltip>
            ),
        },
        {
            title: "Error",
            dataIndex: "errorMessage",
            key: "errorMessage",
            width: 200,
            render: (v) => v ? (
                <Tooltip title={v}>
                    <Tag icon={<ExclamationCircleOutlined />} color="red" style={{ fontSize: 11 }}>
                        {v.length > 30 ? v.slice(0, 30) + '...' : v}
                    </Tag>
                </Tooltip>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
        },
        {
            title: "Delivered",
            key: "sentAt",
            width: 130,
            render: (_, r) => r.sentAt ? (
                <Tooltip title={dayjs(r.sentAt).format('YYYY-MM-DD HH:mm:ss')}>
                    <Text type="success" style={{ fontSize: 12 }}>
                        <CheckCircleOutlined /> {dayjs(r.sentAt).fromNow()}
                    </Text>
                </Tooltip>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
        },
    ];

    const stats = [
        { title: 'Total Dispatched', value: total, icon: <SendOutlined />, color: '#3b82f6' },
        { title: 'Delivered', value: sentCount, icon: <CheckCircleOutlined />, color: '#22c55e' },
        { title: 'Failed', value: failedCount, icon: <CloseCircleOutlined />, color: '#ef4444' },
        { title: 'Pending', value: pendingCount, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'Success Rate', value: successRate, suffix: '%', icon: <CheckCircleOutlined />, color: '#10b981' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Delivery Logs</AuroraText>}
            subTitle={<DecryptedText text="Track all notification dispatch attempts across channels" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'notification_delivery_logs', title: 'Delivery Logs', columns: [{ header: 'Time', key: 'createdAt' }, { header: 'Channel', key: 'channelType' }, { header: 'Status', key: 'status' }, { header: 'Recipient', key: 'recipient' }, { header: 'Subject', key: 'subject' }, { header: 'Error', key: 'errorMessage' }], data: logs })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'notification_delivery_logs', title: 'Delivery Logs', columns: [{ header: 'Time', key: 'createdAt' }, { header: 'Channel', key: 'channelType' }, { header: 'Status', key: 'status' }, { header: 'Recipient', key: 'recipient' }, { header: 'Subject', key: 'subject' }], data: logs })} /></Tooltip></RbacGuard>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadLogs} />,
            ]}
        >
            {/* Stats Row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {stats.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4} lg={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic
                                    title={s.title}
                                    value={s.value}
                                    suffix={(s as any).suffix}
                                    prefix={s.icon}
                                    valueStyle={{ color: s.color, fontSize: 20 }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Channel Breakdown */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <Card size="small" style={{ ...glass, marginBottom: 16 }}>
                    <Space size={24} wrap>
                        {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                            <Space key={key} size={6}>
                                <Tag icon={cfg.icon} color={cfg.color}>{cfg.label}</Tag>
                                <Text strong>{channelBreakdown[key] || 0}</Text>
                            </Space>
                        ))}
                    </Space>
                </Card>
            </motion.div>

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Select
                        placeholder="Filter by channel"
                        allowClear
                        style={{ width: 160 }}
                        value={filterChannel}
                        onChange={setFilterChannel}
                        options={Object.entries(CHANNEL_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))}
                    />
                    <Select
                        placeholder="Filter by status"
                        allowClear
                        style={{ width: 140 }}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { label: 'Sent', value: 'sent' },
                            { label: 'Failed', value: 'failed' },
                            { label: 'Pending', value: 'pending' },
                        ]}
                    />
                    {(filterChannel || filterStatus) && (
                        <Button type="link" onClick={() => { setFilterChannel(undefined); setFilterStatus(undefined); }}>
                            Clear filters
                        </Button>
                    )}
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={logs.map(l => ({ ...l, key: l.id }))}
                    loading={loading}
                    pagination={{
                        pageSize: 25,
                        showSizeChanger: false,
                        showTotal: (t) => `${t} delivery records`,
                    }}
                    size="middle"
                    scroll={{ x: 900 }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No delivery logs yet. Dispatched notifications will appear here."
                            />
                        ),
                    }}
                />
            </Card>
        </CMSLayout>
    );
}
