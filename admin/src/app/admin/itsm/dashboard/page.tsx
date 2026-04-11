"use client";

import React, { useState, useEffect } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Table, Space, Progress, message, Typography, Badge } from "antd";
import {
    AlertOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, TeamOutlined, ThunderboltOutlined,
    WarningOutlined, CustomerServiceOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";

const { Title, Text } = Typography;

const GET_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalSlaBreach avgResolutionHours slaCompliance totalTickets byCritical byHigh byMedium byLow statusNew statusOpen statusInProgress statusPending statusResolved statusClosed } }`;
const GET_RECENT = `query { itsmTickets { id ticketNumber title priority status reporterName assignedTo createdAt slaResolutionDue } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };

export default function ItsmDashboardPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [stats, setStats] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [s, t] = await Promise.all([gql(GET_STATS), gql(GET_RECENT)]);
                setStats(s.itsmDashboardStats);
                setTickets((t.itsmTickets || []).slice(0, 10));
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    const columns = [
        { title: 'Ticket #', dataIndex: 'ticketNumber', width: 110, render: (v: string) => <Tag color="purple">{v}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 100, render: (v: string) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (v: string) => <Tag color={statusColors[v]}>{(v || '').replace('_', ' ').toUpperCase()}</Tag> },
        { title: 'Reporter', dataIndex: 'reporterName', width: 140, ellipsis: true },
        { title: 'Assigned To', dataIndex: 'assignedTo', width: 140, ellipsis: true, render: (v: string) => v || <Text type="secondary">Unassigned</Text> },
        {
            title: 'SLA', dataIndex: 'slaResolutionDue', width: 100,
            render: (v: string) => {
                if (!v) return '-';
                const due = new Date(v);
                const now = new Date();
                return due > now ? <Tag color="green">On Track</Tag> : <Tag color="red">Breach</Tag>;
            }
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Space align="center" style={{ marginBottom: 24 }}>
                <CustomerServiceOutlined style={{ fontSize: 28, color: '#722ed1' }} />
                <Title level={3} style={{ margin: 0 }}>ITSM Helpdesk Dashboard</Title>
            </Space>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #1890ff' }}>
                        <Statistic title="Open Tickets" value={stats?.totalOpen || 0} prefix={<AlertOutlined style={{ color: '#1890ff' }} />} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #fa8c16' }}>
                        <Statistic title="Unassigned" value={stats?.totalUnassigned || 0} prefix={<TeamOutlined style={{ color: '#fa8c16' }} />} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #f5222d' }}>
                        <Statistic title="SLA Breach" value={stats?.totalSlaBreach || 0} prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #52c41a' }}>
                        <Statistic title="Avg Resolution" value={stats?.avgResolutionHours || 0} suffix="hrs" prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />} loading={loading} />
                    </ProCard>
                </Col>
            </Row>

            {/* Priority + Status + SLA */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><ThunderboltOutlined /> Tickets by Priority</Space>} bordered loading={loading}>
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            {[
                                { label: 'Critical', key: 'byCritical', color: '#f5222d' },
                                { label: 'High', key: 'byHigh', color: '#fa8c16' },
                                { label: 'Medium', key: 'byMedium', color: '#1890ff' },
                                { label: 'Low', key: 'byLow', color: '#52c41a' },
                            ].map(p => (
                                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Badge color={p.color} />
                                    <Text style={{ width: 60 }}>{p.label}</Text>
                                    <Progress
                                        percent={stats?.totalOpen ? Math.round((stats[p.key] / stats.totalOpen) * 100) : 0}
                                        strokeColor={p.color}
                                        format={() => stats?.[p.key] || 0}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            ))}
                        </Space>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><CheckCircleOutlined /> Tickets by Status</Space>} bordered loading={loading}>
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {[
                                { label: 'New', key: 'statusNew', color: 'blue' },
                                { label: 'Open', key: 'statusOpen', color: 'cyan' },
                                { label: 'In Progress', key: 'statusInProgress', color: 'geekblue' },
                                { label: 'Pending', key: 'statusPending', color: 'orange' },
                                { label: 'Resolved', key: 'statusResolved', color: 'green' },
                                { label: 'Closed', key: 'statusClosed', color: 'default' },
                            ].map(s => (
                                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Tag color={s.color}>{s.label}</Tag>
                                    <Text strong>{stats?.[s.key] || 0}</Text>
                                </div>
                            ))}
                        </Space>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><WarningOutlined /> SLA Compliance</Space>} bordered loading={loading}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                            <Progress
                                type="dashboard"
                                percent={stats?.slaCompliance || 0}
                                strokeColor={
                                    (stats?.slaCompliance || 100) >= 90 ? '#52c41a' :
                                    (stats?.slaCompliance || 100) >= 70 ? '#fa8c16' : '#f5222d'
                                }
                                format={(pct) => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 12, color: '#999' }}>Compliance</div></div>}
                                size={180}
                            />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <Text type="secondary">Total tickets with SLA: {stats?.totalTickets || 0}</Text>
                        </div>
                    </ProCard>
                </Col>
            </Row>

            {/* Recent Tickets Table */}
            <ProCard title={<Space><AlertOutlined /> Recent Tickets</Space>} bordered>
                <Table dataSource={tickets} columns={columns} rowKey="id" pagination={false} size="small" loading={loading} />
            </ProCard>
        </div>
    );
}
