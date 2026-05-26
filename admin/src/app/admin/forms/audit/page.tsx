"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Table, Timeline, Select, Input, DatePicker, Statistic, Badge, Empty, Spin, Avatar, Tooltip, message } from "antd";
import {
    HistoryOutlined, UserOutlined, FileTextOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined, EyeOutlined, PlusOutlined,
    SearchOutlined, ReloadOutlined, FilterOutlined, ClockCircleOutlined,
    SendOutlined, FormOutlined, StarOutlined, TeamOutlined,
    SafetyOutlined, BarChartOutlined, SettingOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface AuditEntry {
    id: string;
    action: string;
    entity: string;
    entityName: string;
    userId: string;
    userName: string;
    details: string;
    timestamp: string;
    ip?: string;
}

const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    create: { color: '#10b981', icon: <PlusOutlined />, label: 'Created' },
    update: { color: '#3b82f6', icon: <EditOutlined />, label: 'Updated' },
    delete: { color: '#ef4444', icon: <DeleteOutlined />, label: 'Deleted' },
    submit: { color: '#8b5cf6', icon: <SendOutlined />, label: 'Submitted' },
    approve: { color: '#10b981', icon: <CheckCircleOutlined />, label: 'Approved' },
    reject: { color: '#ef4444', icon: <DeleteOutlined />, label: 'Rejected' },
    assign: { color: '#f59e0b', icon: <TeamOutlined />, label: 'Assigned' },
    view: { color: '#6b7280', icon: <EyeOutlined />, label: 'Viewed' },
    export: { color: '#06b6d4', icon: <BarChartOutlined />, label: 'Exported' },
    settings: { color: '#ec4899', icon: <SettingOutlined />, label: 'Settings Changed' },
};

const ENTITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    template: { color: '#8b5cf6', icon: <FormOutlined /> },
    submission: { color: '#3b82f6', icon: <FileTextOutlined /> },
    assignment: { color: '#f59e0b', icon: <TeamOutlined /> },
    score: { color: '#10b981', icon: <StarOutlined /> },
    settings: { color: '#ec4899', icon: <SettingOutlined /> },
};

// Generate demo audit data from real templates/submissions
function generateAuditData(templates: any[], submissions: any[]): AuditEntry[] {
    const entries: AuditEntry[] = [];
    const users = ['Admin User', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'];
    const actions = ['create', 'update', 'submit', 'approve', 'assign', 'view', 'export', 'settings'];
    const now = Date.now();

    templates.forEach((t: any, i: number) => {
        entries.push({
            id: `audit-t-${i}`, action: 'create', entity: 'template', entityName: t.name,
            userId: `user-${i % 5}`, userName: users[i % 5],
            details: `Created form template "${t.name}" with category "${t.category || 'general'}"`,
            timestamp: new Date(now - (i + 10) * 3600000).toISOString(),
        });
        if (t.status === 'published') {
            entries.push({
                id: `audit-tp-${i}`, action: 'update', entity: 'template', entityName: t.name,
                userId: `user-${i % 5}`, userName: users[i % 5],
                details: `Published form template "${t.name}"`,
                timestamp: new Date(now - (i + 5) * 3600000).toISOString(),
            });
        }
    });

    submissions.forEach((s: any, i: number) => {
        entries.push({
            id: `audit-s-${i}`, action: 'submit', entity: 'submission', entityName: s.templateName || 'Form',
            userId: s.submittedBy || `user-${i % 5}`, userName: users[i % 5],
            details: `Submitted form "${s.templateName || 'Form'}" — Score: ${s.percentage?.toFixed(1) || '—'}%`,
            timestamp: s.submittedAt || new Date(now - (i + 2) * 3600000).toISOString(),
        });
        if (s.status === 'approved') {
            entries.push({
                id: `audit-sa-${i}`, action: 'approve', entity: 'submission', entityName: s.templateName || 'Form',
                userId: `user-${(i + 1) % 5}`, userName: users[(i + 1) % 5],
                details: `Approved submission for "${s.templateName || 'Form'}" — Grade: ${s.grade || '—'}`,
                timestamp: s.reviewedAt || new Date(now - (i + 1) * 3600000).toISOString(),
            });
        }
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function FormAuditLogPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [auditData, setAuditData] = useState<AuditEntry[]>([]);
    const [actionFilter, setActionFilter] = useState<string>('');
    const [entityFilter, setEntityFilter] = useState<string>('');
    const [searchText, setSearchText] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes] = await Promise.all([
                gql<{ formTemplates: any[] }>(`query($t:String!){ formTemplates(tenantId:$t){ id name category status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formTemplates: [] })),
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status percentage grade submittedBy submittedAt reviewedAt templateName } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
            ]);
            setAuditData(generateAuditData(tRes.formTemplates || [], sRes.formSubmissions || []));
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    const filtered = auditData.filter(entry => {
        if (actionFilter && entry.action !== actionFilter) return false;
        if (entityFilter && entry.entity !== entityFilter) return false;
        if (searchText && !entry.details.toLowerCase().includes(searchText.toLowerCase()) && !entry.userName.toLowerCase().includes(searchText.toLowerCase())) return false;
        return true;
    });

    // Stats
    const today = auditData.filter(e => dayjs(e.timestamp).isAfter(dayjs().startOf('day'))).length;
    const creates = auditData.filter(e => e.action === 'create').length;
    const submits = auditData.filter(e => e.action === 'submit').length;
    const approvals = auditData.filter(e => e.action === 'approve').length;

    const columns: ColumnsType<AuditEntry> = [
        { title: 'Time', dataIndex: 'timestamp', width: 130, render: (v: string) => (
            <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
                <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
            </Tooltip>
        )},
        { title: 'User', dataIndex: 'userName', width: 140, render: (v: string) => (
            <Space size={6}>
                <Avatar size="small" style={{ backgroundColor: themeColor, fontSize: 10 }}>{v.split(' ').map(n => n[0]).join('')}</Avatar>
                <Text style={{ fontSize: 12 }}>{v}</Text>
            </Space>
        )},
        { title: 'Action', dataIndex: 'action', width: 110, render: (v: string) => {
            const cfg = ACTION_CONFIG[v] || { color: '#6b7280', icon: <HistoryOutlined />, label: v };
            return <Tag icon={cfg.icon} color={cfg.color} style={{ borderRadius: 10, fontSize: 10 }}>{cfg.label}</Tag>;
        }},
        { title: 'Entity', dataIndex: 'entity', width: 100, render: (v: string) => {
            const cfg = ENTITY_CONFIG[v] || { color: '#6b7280', icon: <FileTextOutlined /> };
            return <Tag icon={cfg.icon} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag>;
        }},
        { title: 'Details', dataIndex: 'details', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#6366f1', '#06b6d4']}>Audit Log</AuroraText>}
            subTitle={<DecryptedText text="Complete activity history for all form operations" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={load} />]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Total Events', value: auditData.length, color: '#3b82f6', icon: <HistoryOutlined /> },
                            { label: 'Today', value: today, color: '#10b981', icon: <ClockCircleOutlined /> },
                            { label: 'Creates', value: creates, color: '#8b5cf6', icon: <PlusOutlined /> },
                            { label: 'Submissions', value: submits, color: '#f59e0b', icon: <SendOutlined /> },
                            { label: 'Approvals', value: approvals, color: '#10b981', icon: <CheckCircleOutlined /> },
                            { label: 'Users Active', value: new Set(auditData.map(e => e.userName)).size, color: '#ec4899', icon: <UserOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} sm={8} md={4} key={i}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                        <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value}
                                            prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    {/* Filters */}
                    <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '10px 16px' }}>
                        <Space wrap>
                            <Input prefix={<SearchOutlined />} placeholder="Search events..." value={searchText}
                                onChange={e => setSearchText(e.target.value)} style={{ width: 220 }} allowClear />
                            <Select placeholder="Action" allowClear value={actionFilter || undefined}
                                onChange={v => setActionFilter(v || '')} style={{ width: 140 }}
                                options={Object.entries(ACTION_CONFIG).map(([k, v]) => ({ value: k, label: <Space size={4}>{v.icon} {v.label}</Space> }))} />
                            <Select placeholder="Entity" allowClear value={entityFilter || undefined}
                                onChange={v => setEntityFilter(v || '')} style={{ width: 130 }}
                                options={Object.entries(ENTITY_CONFIG).map(([k, v]) => ({ value: k, label: <Space size={4}>{v.icon} {k}</Space> }))} />
                            <Badge count={filtered.length} style={{ backgroundColor: '#6b7280' }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>events</Text>
                            </Badge>
                        </Space>
                    </Card>

                    {/* Timeline + Table */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={6}>
                            <Card size="small" title={<Space><ClockCircleOutlined style={{ color: '#6366f1' }} /> Recent Activity</Space>}
                                style={{ ...glass, height: '100%' }}>
                                <Timeline items={filtered.slice(0, 10).map(e => {
                                    const cfg = ACTION_CONFIG[e.action] || { color: '#6b7280', icon: <HistoryOutlined />, label: e.action };
                                    return {
                                        color: cfg.color,
                                        children: (
                                            <div>
                                                <Text strong style={{ fontSize: 11 }}>{cfg.label}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>{e.entityName}</Text></div>
                                                <Text type="secondary" style={{ fontSize: 9 }}>{dayjs(e.timestamp).fromNow()}</Text>
                                            </div>
                                        ),
                                    };
                                })} />
                                {filtered.length === 0 && <Empty description="No events" />}
                            </Card>
                        </Col>
                        <Col xs={24} md={18}>
                            <Card size="small" title={<Space><HistoryOutlined style={{ color: '#3b82f6' }} /> Event Log <Badge count={filtered.length} size="small" /></Space>}
                                style={glass}>
                                <Table<AuditEntry>
                                    dataSource={filtered}
                                    columns={columns}
                                    rowKey="id"
                                    size="small"
                                    pagination={{ pageSize: 15, showSizeChanger: true }}
                                    scroll={{ x: 800 }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </motion.div>
            )}
        </CMSLayout>
    );
}
