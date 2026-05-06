"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Table, Button, Tag, Space, Card, message, Typography, Row, Col, Statistic, Select, DatePicker } from "antd";
import { motion } from "framer-motion";
import { ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined, FieldTimeOutlined, WarningOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(duration);
const { Text } = Typography;
const { RangePicker } = DatePicker;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function HistoryPage() {
    const { themeColor } = usePreferencesStore();
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string | undefined>();

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { opsRuns(tenantId: $t) {
                id name status playbookName playbookPriority startedBy startedAt completedAt dueAt createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            const completed = (data.opsRuns || []).filter((r: any) => ['completed', 'cancelled', 'failed'].includes(r.status));
            setRuns(filterStatus ? completed.filter((r: any) => r.status === filterStatus) : completed);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { loadRuns(); }, [loadRuns]);

    const completedCount = runs.filter(r => r.status === 'completed').length;
    const cancelledCount = runs.filter(r => r.status === 'cancelled').length;
    const failedCount = runs.filter(r => r.status === 'failed').length;

    const avgDuration = (() => {
        const withDuration = runs.filter(r => r.startedAt && r.completedAt);
        if (!withDuration.length) return '—';
        const total = withDuration.reduce((s, r) => s + dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute'), 0);
        return `${Math.round(total / withDuration.length)} min`;
    })();

    const columns: ColumnsType<any> = [
        {
            title: "Run", key: "name",
            render: (_, r) => (
                <div>
                    <Text strong>{r.name}</Text><br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.playbookName}</Text>
                </div>
            ),
        },
        {
            title: "Status", dataIndex: "status", width: 110,
            render: (v: string) => (
                <Tag color={v === 'completed' ? 'success' : v === 'failed' ? 'error' : 'warning'} icon={v === 'completed' ? <CheckCircleOutlined /> : <WarningOutlined />}>
                    {v}
                </Tag>
            ),
        },
        {
            title: "Duration", key: "duration", width: 110,
            render: (_, r) => {
                if (!r.startedAt || !r.completedAt) return '—';
                const mins = dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute');
                return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
            },
        },
        { title: "Completed", key: "completedAt", width: 150, render: (_, r) => r.completedAt ? dayjs(r.completedAt).format('MMM D, HH:mm') : '—' },
        { title: "Started By", dataIndex: "startedBy", width: 130, render: (v: string) => v || '—' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>History</AuroraText>}
            subTitle={<DecryptedText text="Completed operational runs with duration and outcome tracking" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={loadRuns} />]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Completed', value: completedCount, icon: <CheckCircleOutlined />, color: '#22c55e' },
                    { title: 'Cancelled', value: cancelledCount, icon: <WarningOutlined />, color: '#f59e0b' },
                    { title: 'Failed', value: failedCount, icon: <WarningOutlined />, color: '#ef4444' },
                    { title: 'Avg Duration', value: avgDuration, icon: <ClockCircleOutlined />, color: '#3b82f6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Card size="small" style={{ marginBottom: 16 }}>
                <Space>
                    <Select placeholder="Filter by status" allowClear style={{ width: 160 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }, { label: 'Failed', value: 'failed' }]} />
                </Space>
            </Card>

            <Card><Table columns={columns} dataSource={runs.map(r => ({ ...r, key: r.id }))} loading={loading} pagination={{ pageSize: 20 }} size="middle" /></Card>
        </CMSLayout>
    );
}
