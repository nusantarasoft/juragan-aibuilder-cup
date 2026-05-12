'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Row, Col, Statistic, Tooltip, Switch, Tabs, Progress, Badge } from 'antd';
import { CreditCardOutlined, DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, BankOutlined, SettingOutlined, BarChartOutlined, ReloadOutlined, ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmt = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

const GATEWAYS = [
    { id: 'midtrans', name: 'Midtrans', logo: '🏦', status: 'active', mode: 'sandbox', txCount: 234, revenue: 45600000, successRate: 97.2, color: '#0ea5e9' },
    { id: 'xendit', name: 'Xendit', logo: '💳', status: 'active', mode: 'production', txCount: 156, revenue: 32100000, successRate: 98.5, color: '#8b5cf6' },
    { id: 'stripe', name: 'Stripe', logo: '💰', status: 'inactive', mode: 'sandbox', txCount: 0, revenue: 0, successRate: 0, color: '#6366f1' },
    { id: 'manual', name: 'Bank Transfer', logo: '🏧', status: 'active', mode: 'production', txCount: 89, revenue: 18400000, successRate: 100, color: '#10b981' },
];

const TRANSACTIONS = [
    { id: 'tx-1', orderId: 'ORD-2024-001', gateway: 'Midtrans', method: 'QRIS', amount: 450000, status: 'success', customerName: 'Ahmad Santoso', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'tx-2', orderId: 'ORD-2024-002', gateway: 'Xendit', method: 'VA BCA', amount: 1250000, status: 'success', customerName: 'Siti Rahayu', createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'tx-3', orderId: 'ORD-2024-003', gateway: 'Midtrans', method: 'GoPay', amount: 89000, status: 'pending', customerName: 'Budi Pratama', createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'tx-4', orderId: 'ORD-2024-004', gateway: 'Bank Transfer', method: 'BNI', amount: 3200000, status: 'success', customerName: 'Dewi Lestari', createdAt: new Date(Date.now() - 1200000).toISOString() },
    { id: 'tx-5', orderId: 'ORD-2024-005', gateway: 'Midtrans', method: 'Credit Card', amount: 780000, status: 'failed', customerName: 'Rudi Setiawan', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'tx-6', orderId: 'ORD-2024-006', gateway: 'Xendit', method: 'OVO', amount: 155000, status: 'success', customerName: 'Maya Indah', createdAt: new Date(Date.now() - 2400000).toISOString() },
];

const METHOD_BREAKDOWN = [
    { method: 'QRIS', count: 89, revenue: 12500000, color: '#3b82f6' },
    { method: 'Virtual Account', count: 67, revenue: 18700000, color: '#8b5cf6' },
    { method: 'E-Wallet', count: 145, revenue: 8900000, color: '#10b981' },
    { method: 'Credit Card', count: 42, revenue: 22300000, color: '#f59e0b' },
    { method: 'Bank Transfer', count: 89, revenue: 18400000, color: '#06b6d4' },
];

export default function PaymentsPage() {
    const { themeColor } = usePreferencesStore();
    const totalTx = GATEWAYS.reduce((s, g) => s + g.txCount, 0);
    const totalRev = GATEWAYS.reduce((s, g) => s + g.revenue, 0);
    const maxMethodRev = Math.max(...METHOD_BREAKDOWN.map(m => m.revenue));

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#f59e0b']}>Payment Gateway</AuroraText>} subTitle={<DecryptedText text="Payment provider configuration & transaction monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Transactions', v: totalTx, c: '#3b82f6', i: <ShoppingCartOutlined /> }, { t: 'Total Revenue', v: fmt(totalRev), c: '#10b981', i: <DollarOutlined /> }, { t: 'Active Gateways', v: GATEWAYS.filter(g => g.status === 'active').length, c: '#8b5cf6', i: <CreditCardOutlined /> }, { t: 'Avg Success Rate', v: `${(GATEWAYS.filter(g => g.txCount > 0).reduce((s, g) => s + g.successRate, 0) / Math.max(GATEWAYS.filter(g => g.txCount > 0).length, 1)).toFixed(1)}%`, c: '#06b6d4', i: <ThunderboltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    {GATEWAYS.map((g, i) => (
                        <Col key={g.id} xs={24} sm={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" hoverable style={{ ...glass, borderLeft: `3px solid ${g.color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Space><span style={{ fontSize: 24 }}>{g.logo}</span><div><Text strong style={{ fontSize: 14 }}>{g.name}</Text><br /><Tag color={g.status === 'active' ? 'green' : 'default'} style={{ fontSize: 10, borderRadius: 10 }}>{g.status}</Tag><Tag style={{ fontSize: 9 }}>{g.mode}</Tag></div></Space>
                                        <Switch checked={g.status === 'active'} size="small" />
                                    </div>
                                    <Row gutter={8}>
                                        <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>Transactions</Text><br /><Text strong style={{ fontSize: 14, color: g.color }}>{g.txCount}</Text></Col>
                                        <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>Success</Text><br /><Text strong style={{ fontSize: 14, color: '#10b981' }}>{g.successRate}%</Text></Col>
                                        <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>Revenue</Text><br /><Text strong style={{ fontSize: 11, color: '#10b981' }}>{(g.revenue / 1e6).toFixed(1)}M</Text></Col>
                                    </Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={glass} title={<Space><BarChartOutlined style={{ color: '#8b5cf6' }} /><Text strong style={{ fontSize: 13 }}>Revenue by Method</Text></Space>}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {METHOD_BREAKDOWN.map((m, i) => (
                                    <motion.div key={m.method} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Space size={6}><div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} /><Text style={{ fontSize: 12 }}>{m.method}</Text></Space>
                                            <Space size={8}><Text style={{ fontSize: 11, color: '#6b7280' }}>{m.count} tx</Text><Text strong style={{ fontSize: 11, color: m.color }}>{fmt(m.revenue)}</Text></Space>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(m.revenue / maxMethodRev) * 100}%` }} transition={{ delay: 0.4 + i * 0.08 }} style={{ height: '100%', borderRadius: 3, background: m.color }} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><CreditCardOutlined style={{ color: '#3b82f6' }} /><Text strong style={{ fontSize: 13 }}>Recent Transactions</Text><Badge count={TRANSACTIONS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                            <Table dataSource={TRANSACTIONS} rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 700 }} columns={[
                                { title: 'Order', dataIndex: 'orderId', render: (v: string) => <Text strong style={{ fontSize: 12, color: '#3b82f6' }}>{v}</Text> },
                                { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Gateway', dataIndex: 'gateway', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                                { title: 'Method', dataIndex: 'method', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Amount', dataIndex: 'amount', align: 'right' as const, render: (v: number) => <Text strong style={{ fontSize: 12, color: '#10b981' }}>{fmt(v)}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'success' ? 'green' : v === 'failed' ? 'red' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Time', dataIndex: 'createdAt', width: 100, render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(v).format('HH:mm:ss')}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
