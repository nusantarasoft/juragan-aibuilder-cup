'use client';
import React, { useEffect, useState, useMemo } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Statistic, Row, Col, Table, Tag, Spin, Typography, Space, Button, Empty, Segmented, Divider } from 'antd';
import {
    DollarOutlined, RiseOutlined, FallOutlined, BankOutlined,
    FileTextOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined,
    ArrowUpOutlined, ArrowDownOutlined, AccountBookOutlined,
    TransactionOutlined, WalletOutlined, MoneyCollectOutlined,
    PieChartOutlined, ProfileOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { accountingService, AcctDashboard, AcctJournal } from '@/lib/accountingService';

const { Title, Text } = Typography;

const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);

// Convert snake_case DB rows to camelCase for display
const snakeToCamel = (row: any) => {
    if (!row) return row;
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
        out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    }
    return out;
};

const statusColor: Record<string, string> = { draft: 'gold', posted: 'green', reversed: 'volcano', void: 'default' };
const typeColor: Record<string, string> = { general: 'blue', adjusting: 'purple', closing: 'orange', opening: 'cyan', reversal: 'red' };

export default function AccountingDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AcctDashboard | null>(null);

    useEffect(() => {
        (async () => {
            try { setData(await accountingService.getDashboard()); } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <CMSLayout title="Accounting Dashboard" subTitle="Loading..."><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div></CMSLayout>;
    if (!data) return <CMSLayout title="Accounting Dashboard"><Empty description="Failed to load dashboard" /></CMSLayout>;

    const kpis = [
        { title: 'Total Revenue', value: data.totalRevenue, icon: <RiseOutlined />, color: '#52c41a', bg: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' },
        { title: 'Total Expenses', value: data.totalExpenses, icon: <FallOutlined />, color: '#ff4d4f', bg: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)' },
        { title: 'Net Income', value: data.netIncome, icon: <DollarOutlined />, color: data.netIncome >= 0 ? '#1890ff' : '#ff4d4f', bg: data.netIncome >= 0 ? 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' : 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)' },
        { title: 'Total Assets', value: data.totalAssets, icon: <BankOutlined />, color: '#722ed1', bg: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)' },
    ];

    const columns = [
        { title: 'Number', dataIndex: 'journalNumber', key: 'journalNumber', render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: 'Date', dataIndex: 'journalDate', key: 'journalDate', width: 110 },
        { title: 'Type', dataIndex: 'journalType', key: 'journalType', width: 100, render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag> },
        { title: 'Memo', dataIndex: 'memo', key: 'memo', ellipsis: true },
        { title: 'Debit', dataIndex: 'totalDebit', key: 'totalDebit', width: 140, align: 'right' as const, render: (v: number) => formatCurrency(v) },
        { title: 'Credit', dataIndex: 'totalCredit', key: 'totalCredit', width: 140, align: 'right' as const, render: (v: number) => formatCurrency(v) },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
    ];

    return (
        <CMSLayout title="Accounting Dashboard" subTitle="Financial overview and recent activity">
        <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Accounting Dashboard</Title>
                    <Text type="secondary">Financial overview and recent activity</Text>
                </div>
                <Space>
                    <Button icon={<PlusOutlined />} type="primary" onClick={() => router.push('/admin/accounting/journals')}>New Journal Entry</Button>
                    <Button icon={<ProfileOutlined />} onClick={() => router.push('/admin/accounting/accounts')}>Chart of Accounts</Button>
                </Space>
            </div>

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {kpis.map((kpi, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <Card hoverable style={{ background: kpi.bg, border: 'none', borderRadius: 12 }}>
                            <Statistic
                                title={<Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>{kpi.title}</Text>}
                                value={kpi.value}
                                formatter={(val) => formatCurrency(Number(val))}
                                prefix={React.cloneElement(kpi.icon, { style: { color: kpi.color, fontSize: 20, marginRight: 4 } })}
                                valueStyle={{ color: kpi.color, fontWeight: 700, fontSize: 22 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Secondary Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderRadius: 10 }}>
                        <Statistic title="Total Accounts" value={data.totalAccounts} prefix={<AccountBookOutlined style={{ color: '#1890ff' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderRadius: 10 }}>
                        <Statistic title="Posted Journals" value={data.postedJournals} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderRadius: 10 }}>
                        <Statistic title="Draft Journals" value={data.draftJournals} prefix={<EditOutlined style={{ color: '#faad14' }} />} valueStyle={{ color: '#faad14' }} />
                    </Card>
                </Col>
            </Row>

            {/* Balance Equation Check */}
            <Card size="small" style={{ marginBottom: 24, borderRadius: 10, background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)' }}>
                <Row gutter={16} align="middle" justify="center">
                    <Col><Statistic title="Assets" value={data.totalAssets} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ fontSize: 16, fontWeight: 600 }} /></Col>
                    <Col><Text style={{ fontSize: 24, color: '#8c8c8c' }}>=</Text></Col>
                    <Col><Statistic title="Liabilities" value={data.totalLiabilities} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ fontSize: 16, fontWeight: 600 }} /></Col>
                    <Col><Text style={{ fontSize: 24, color: '#8c8c8c' }}>+</Text></Col>
                    <Col><Statistic title="Equity" value={data.totalEquity} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ fontSize: 16, fontWeight: 600 }} /></Col>
                </Row>
            </Card>

            {/* Recent Journals */}
            <Card title="Recent Journal Entries" extra={<Button type="link" onClick={() => router.push('/admin/accounting/journals')}>View All</Button>} style={{ borderRadius: 12 }}>
                <Table
                    dataSource={(data.recentJournals as any[] || []).map((j: any) => { const c = snakeToCamel(j); return { ...c, key: c.id }; })}
                    columns={columns}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: <Empty description="No journal entries yet" /> }}
                />
            </Card>

            {/* Quick Navigation */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                {[
                    { title: 'Chart of Accounts', icon: <ProfileOutlined />, path: '/admin/accounting/accounts', desc: 'Manage your account structure' },
                    { title: 'Journal Entries', icon: <TransactionOutlined />, path: '/admin/accounting/journals', desc: 'Create and post journals' },
                    { title: 'General Ledger', icon: <AccountBookOutlined />, path: '/admin/accounting/ledger', desc: 'View account transactions' },
                    { title: 'Financial Reports', icon: <PieChartOutlined />, path: '/admin/accounting/reports', desc: 'Trial balance & statements' },
                ].map((item, i) => (
                    <Col xs={24} sm={12} md={6} key={i}>
                        <Card hoverable onClick={() => router.push(item.path)} style={{ borderRadius: 10, textAlign: 'center', cursor: 'pointer' }}>
                            <div style={{ fontSize: 28, color: '#1890ff', marginBottom: 8 }}>{item.icon}</div>
                            <Text strong>{item.title}</Text><br />
                            <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
        </CMSLayout>
    );
}
