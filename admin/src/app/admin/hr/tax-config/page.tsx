'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Row, Col, Statistic, InputNumber, Form, message, Tabs, Divider } from 'antd';
import { CalculatorOutlined, BankOutlined, DollarOutlined, PercentageOutlined, SaveOutlined, TeamOutlined, WalletOutlined, HeartOutlined, SafetyOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmt = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

const PPH21_BRACKETS = [
    { min: 0, max: 60000000, rate: 5, color: '#10b981' },
    { min: 60000000, max: 250000000, rate: 15, color: '#3b82f6' },
    { min: 250000000, max: 500000000, rate: 25, color: '#f59e0b' },
    { min: 500000000, max: 5000000000, rate: 30, color: '#ef4444' },
    { min: 5000000000, max: Infinity, rate: 35, color: '#8b5cf6' },
];

const BPJS_RATES = {
    kesehatan: { employerRate: 4, employeeRate: 1, maxSalary: 12000000, label: 'BPJS Kesehatan' },
    jht: { employerRate: 3.7, employeeRate: 2, maxSalary: 0, label: 'JHT (Jaminan Hari Tua)' },
    jkk: { employerRate: 0.54, employeeRate: 0, maxSalary: 0, label: 'JKK (Jaminan Kecelakaan Kerja)' },
    jkm: { employerRate: 0.3, employeeRate: 0, maxSalary: 0, label: 'JKM (Jaminan Kematian)' },
    jp: { employerRate: 2, employeeRate: 1, maxSalary: 10042300, label: 'JP (Jaminan Pensiun)' },
};

const PTKP_TABLE = [
    { code: 'TK/0', desc: 'Single, no dependents', amount: 54000000 },
    { code: 'TK/1', desc: 'Single, 1 dependent', amount: 58500000 },
    { code: 'TK/2', desc: 'Single, 2 dependents', amount: 63000000 },
    { code: 'TK/3', desc: 'Single, 3 dependents', amount: 67500000 },
    { code: 'K/0', desc: 'Married, no dependents', amount: 58500000 },
    { code: 'K/1', desc: 'Married, 1 dependent', amount: 63000000 },
    { code: 'K/2', desc: 'Married, 2 dependents', amount: 67500000 },
    { code: 'K/3', desc: 'Married, 3 dependents', amount: 72000000 },
];

export default function TaxConfigPage() {
    const { themeColor } = usePreferencesStore();
    const maxBracket = Math.max(...PPH21_BRACKETS.filter(b => b.max < Infinity).map(b => b.max));

    const items = [
        { key: 'pph21', label: 'PPh 21 Brackets', children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card size="small" style={glass} title={<Space><CalculatorOutlined style={{ color: '#3b82f6' }} /><Text strong>Progressive Tax Brackets (PPh 21)</Text></Space>}>
                    <div style={{ display: 'flex', height: 32, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                        {PPH21_BRACKETS.filter(b => b.max < Infinity).map((b, i) => (
                            <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${(b.max / maxBracket) * 100}%` }} transition={{ delay: 0.3 + i * 0.1 }}
                                style={{ height: '100%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                                <Text style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{b.rate}%</Text>
                            </motion.div>
                        ))}
                    </div>
                    <Table dataSource={PPH21_BRACKETS} rowKey="rate" size="small" pagination={false} columns={[
                        { title: 'Min Income', dataIndex: 'min', render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(v)}</Text> },
                        { title: 'Max Income', dataIndex: 'max', render: (v: number) => v === Infinity ? <Text strong style={{ color: '#8b5cf6' }}>∞</Text> : <Text style={{ fontSize: 12 }}>{fmt(v)}</Text> },
                        { title: 'Rate', dataIndex: 'rate', align: 'center' as const, render: (v: number, r: any) => <Tag color={r.color} style={{ borderRadius: 10, fontWeight: 700, fontSize: 13 }}>{v}%</Tag> },
                        { title: 'Visual', key: 'bar', width: 200, render: (_: any, r: any) => (<div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${(r.rate / 35) * 100}%` }} style={{ height: '100%', background: r.color, borderRadius: 3 }} /></div>) },
                    ]} />
                </Card>
                <Card size="small" style={glass} title={<Space><TeamOutlined style={{ color: '#8b5cf6' }} /><Text strong>PTKP (Non-Taxable Income)</Text></Space>}>
                    <Table dataSource={PTKP_TABLE} rowKey="code" size="small" pagination={false} columns={[
                        { title: 'Code', dataIndex: 'code', width: 80, render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontWeight: 600 }}>{v}</Tag> },
                        { title: 'Description', dataIndex: 'desc', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Annual Amount', dataIndex: 'amount', align: 'right' as const, render: (v: number) => <Text strong style={{ fontSize: 13, color: '#10b981' }}>{fmt(v)}</Text> },
                        { title: 'Monthly', key: 'monthly', align: 'right' as const, render: (_: any, r: any) => <Text style={{ fontSize: 11, color: '#6b7280' }}>{fmt(Math.round(r.amount / 12))}/mo</Text> },
                    ]} />
                </Card>
            </div>
        ) },
        { key: 'bpjs', label: 'BPJS Rates', children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(BPJS_RATES).map(([key, cfg], i) => (
                    <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <Card size="small" style={{ ...glass, borderLeft: `3px solid ${['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i]}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><Text strong style={{ fontSize: 14 }}>{cfg.label}</Text>{cfg.maxSalary > 0 && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Cap: {fmt(cfg.maxSalary)}</Text>}</div>
                                <Space size={16}>
                                    <div style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 10 }}>Employer</Text><br /><Text strong style={{ fontSize: 18, color: '#3b82f6' }}>{cfg.employerRate}%</Text></div>
                                    <div style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 10 }}>Employee</Text><br /><Text strong style={{ fontSize: 18, color: '#ef4444' }}>{cfg.employeeRate}%</Text></div>
                                    <div style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 10 }}>Total</Text><br /><Text strong style={{ fontSize: 18, color: '#10b981' }}>{(cfg.employerRate + cfg.employeeRate).toFixed(1)}%</Text></div>
                                </Space>
                            </div>
                        </Card>
                    </motion.div>
                ))}
                <Card size="small" style={glass} title={<Space><WalletOutlined style={{ color: '#f59e0b' }} /><Text strong>Summary</Text></Space>}>
                    <Row gutter={12}>
                        <Col span={8}><div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#3b82f608' }}><Text type="secondary" style={{ fontSize: 11 }}>Total Employer</Text><br /><Text strong style={{ fontSize: 20, color: '#3b82f6' }}>{Object.values(BPJS_RATES).reduce((s, r) => s + r.employerRate, 0).toFixed(2)}%</Text></div></Col>
                        <Col span={8}><div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#ef444408' }}><Text type="secondary" style={{ fontSize: 11 }}>Total Employee</Text><br /><Text strong style={{ fontSize: 20, color: '#ef4444' }}>{Object.values(BPJS_RATES).reduce((s, r) => s + r.employeeRate, 0).toFixed(1)}%</Text></div></Col>
                        <Col span={8}><div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#10b98108' }}><Text type="secondary" style={{ fontSize: 11 }}>Combined</Text><br /><Text strong style={{ fontSize: 20, color: '#10b981' }}>{Object.values(BPJS_RATES).reduce((s, r) => s + r.employerRate + r.employeeRate, 0).toFixed(2)}%</Text></div></Col>
                    </Row>
                </Card>
            </div>
        ) },
        { key: 'thr', label: 'THR Config', children: (
            <Card size="small" style={glass} title={<Space><HeartOutlined style={{ color: '#ec4899' }} /><Text strong>THR (Tunjangan Hari Raya) Configuration</Text></Space>}>
                <Row gutter={[16, 16]}>
                    {[{ label: 'Full THR Eligibility', desc: 'Employees with ≥12 months tenure', value: '1x Monthly Salary', color: '#10b981' },
                      { label: 'Prorated THR', desc: 'Employees with 1-11 months tenure', value: '(months/12) × Salary', color: '#3b82f6' },
                      { label: 'THR Tax', desc: 'PPh 21 applied to THR separately', value: 'Progressive Rate', color: '#f59e0b' },
                      { label: 'Payment Deadline', desc: 'Must be paid before Hari Raya', value: '7 Days Before', color: '#8b5cf6' },
                    ].map((item, i) => (
                        <Col key={i} xs={24} sm={12}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                                <div style={{ padding: 16, borderRadius: 12, background: `${item.color}06`, borderLeft: `3px solid ${item.color}` }}>
                                    <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.desc}</Text>
                                    <Text strong style={{ fontSize: 16, color: item.color, display: 'block', marginTop: 4 }}>{item.value}</Text>
                                </div>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            </Card>
        ) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b']}>Tax Configuration</AuroraText>} subTitle={<DecryptedText text="Indonesian PPh 21, BPJS rates & THR settings" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="save" type="primary" icon={<SaveOutlined />} style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)`, border: 'none', borderRadius: 8 }}>Save Changes</Button>]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[{ t: 'Tax Brackets', v: PPH21_BRACKETS.length, c: '#3b82f6', i: <CalculatorOutlined /> }, { t: 'BPJS Programs', v: Object.keys(BPJS_RATES).length, c: '#10b981', i: <SafetyOutlined /> }, { t: 'Max Tax Rate', v: '35%', c: '#ef4444', i: <PercentageOutlined /> }, { t: 'PTKP Options', v: PTKP_TABLE.length, c: '#8b5cf6', i: <TeamOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card style={glass}><Tabs items={items} /></Card>
            </motion.div>
        </CMSLayout>
    );
}
