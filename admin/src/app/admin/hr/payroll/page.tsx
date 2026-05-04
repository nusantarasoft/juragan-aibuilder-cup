"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Typography, Row, Col, Statistic, Select, Space, Button, Badge, Tooltip, Progress } from "antd";
import { WalletOutlined, DollarOutlined, TeamOutlined, CalculatorOutlined, BankOutlined, RiseOutlined, DownloadOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const PR_Q = `query($t:String!){hrPayrollRuns(tenantId:$t){id period name status totalGross totalDeductions totalNet employeeCount processedAt createdAt}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName baseSalary}}`;

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    draft: { color: '#6b7280', label: 'Draft', bg: 'rgba(107,114,128,0.08)' },
    processing: { color: '#3b82f6', label: 'Processing', bg: 'rgba(59,130,246,0.08)' },
    completed: { color: '#10b981', label: 'Completed', bg: 'rgba(16,185,129,0.08)' },
    paid: { color: '#06b6d4', label: 'Paid', bg: 'rgba(6,182,212,0.08)' },
};

// Payroll Trend Mini Chart
function PayrollTrend({ runs }: { runs: any[] }) {
    const sorted = [...runs].sort((a, b) => a.period?.localeCompare(b.period));
    const data = sorted.slice(-6);
    if (data.length < 2) return <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block', padding: 20 }}>Not enough data for trend</Text>;

    const maxNet = Math.max(...data.map(r => r.totalNet || 0), 1);
    const width = 280;
    const height = 80;
    const points = data.map((r, i) => `${(i / (data.length - 1)) * width},${height - ((r.totalNet || 0) / maxNet) * (height - 8)}`).join(' ');
    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
                <defs><linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.2" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.02" /></linearGradient></defs>
                <polygon points={areaPoints} fill="url(#payGrad)"><animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" /></polygon>
                <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <animate attributeName="stroke-dasharray" from={`0 ${width * 3}`} to={`${width * 3} 0`} dur="1.2s" fill="freeze" />
                </polyline>
                {data.map((r, i) => (
                    <circle key={i} cx={(i / (data.length - 1)) * width} cy={height - ((r.totalNet || 0) / maxNet) * (height - 8)} r="3" fill="#10b981">
                        <animate attributeName="r" from="0" to="3" dur="0.3s" begin={`${0.3 + i * 0.1}s`} fill="freeze" />
                    </circle>
                ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {data.map((r, i) => <Text key={i} style={{ fontSize: 8, color: '#9ca3af' }}>{r.period?.slice(-2)}</Text>)}
            </div>
        </div>
    );
}

// Deduction Breakdown Component
function DeductionBreakdown({ latest }: { latest: any }) {
    const gross = latest.totalGross || 0;
    const deductions = latest.totalDeductions || 0;
    const net = latest.totalNet || 0;
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);

    // Simulated breakdown
    const breakdownItems = [
        { label: 'Income Tax (PPh 21)', amount: Math.round(deductions * 0.45), color: '#ef4444' },
        { label: 'BPJS Kesehatan', amount: Math.round(deductions * 0.25), color: '#f59e0b' },
        { label: 'BPJS Ketenagakerjaan', amount: Math.round(deductions * 0.2), color: '#3b82f6' },
        { label: 'Other Deductions', amount: Math.round(deductions * 0.1), color: '#8b5cf6' },
    ];

    if (gross === 0) return <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>No payroll data</Text>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Stacked Bar */}
            <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(net / gross) * 100}%` }} transition={{ duration: 0.8 }}
                    style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>Net</Text>
                </motion.div>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(deductions / gross) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>Ded</Text>
                </motion.div>
            </div>

            {breakdownItems.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: `${item.color}08` }}>
                    <Space size={6}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.color }} />
                        <Text style={{ fontSize: 11 }}>{item.label}</Text>
                    </Space>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: item.color }}>Rp {fmt(item.amount)}</Text>
                </motion.div>
            ))}
        </div>
    );
}

export default function PayrollPage() {
    const [runs, setRuns] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        Promise.all([
            gql(PR_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrPayrollRuns: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
        ]).then(([p, e]) => { setRuns(p.hrPayrollRuns || []); setEmployees(e.hrEmployees || []); })
            .finally(() => setLoading(false));
    }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const latest = runs[0] || {};
    const totalGrossAll = runs.reduce((s, r) => s + (r.totalGross || 0), 0);
    const totalNetAll = runs.reduce((s, r) => s + (r.totalNet || 0), 0);
    const avgNet = runs.length > 0 ? Math.round(totalNetAll / runs.length) : 0;
    const completed = runs.filter(r => r.status === 'completed' || r.status === 'paid').length;

    // Salary summary from employees
    const totalBaseSalary = employees.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);

    const columns = [
        { title: 'Period', dataIndex: 'period', key: 'period', render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
        { title: 'Employees', dataIndex: 'employeeCount', key: 'count', align: 'center' as const,
            render: (v: number) => <Badge count={v} style={{ backgroundColor: '#3b82f6' }} showZero /> },
        { title: 'Gross', dataIndex: 'totalGross', key: 'gross', render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Deductions', dataIndex: 'totalDeductions', key: 'ded',
            render: (v: number, r: any) => <Tooltip title={`${Math.round((v / (r.totalGross || 1)) * 100)}% of gross`}>
                <Text type="danger" style={{ fontSize: 12 }}>-{fmt(v)}</Text>
            </Tooltip>, align: 'right' as const },
        { title: 'Net Pay', dataIndex: 'totalNet', key: 'net',
            render: (v: number) => <Text strong style={{ color: '#10b981', fontSize: 13 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Status', dataIndex: 'status', key: 'status',
            render: (v: string) => <Tag color={statusConfig[v]?.color} style={{ borderRadius: 20 }}>{statusConfig[v]?.label || v}</Tag> },
        { title: 'Processed', dataIndex: 'processedAt', key: 'proc',
            render: (v: string) => v ? <Text style={{ fontSize: 11 }}>{dayjs(v).format('MMM D, YYYY')}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#f59e0b', themeColor]} className="text-[22px] font-bold tracking-tight">Payroll</AuroraText>}
            subTitle={<DecryptedText text="Payroll processing, salary slips & tax calculations" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Button key="run" type="primary" icon={<CalculatorOutlined />} style={{ background: '#10b981' }}>Run Payroll</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Latest Gross" value={fmt(latest.totalGross || 0)} valueStyle={{ color: '#3b82f6', fontSize: 14 }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #ef4444' }}><Statistic title="Deductions" value={fmt(latest.totalDeductions || 0)} valueStyle={{ color: '#ef4444', fontSize: 14 }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Net Pay" value={fmt(latest.totalNet || 0)} prefix={<WalletOutlined />} valueStyle={{ color: '#10b981', fontSize: 14 }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Employees" value={latest.employeeCount || 0} prefix={<TeamOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #06b6d4' }}><Statistic title="Total Runs" value={runs.length} valueStyle={{ color: '#06b6d4' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Base Payroll" value={fmt(totalBaseSalary)} valueStyle={{ color: '#f59e0b', fontSize: 14 }} /></Card></Col>
                </Row>

                {/* Charts */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <Card title={<><RiseOutlined /> Net Pay Trend</>} size="small" style={{ ...glass, height: '100%' }}>
                            <PayrollTrend runs={runs} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card title={<><BankOutlined /> Deduction Breakdown (Latest)</>} size="small" style={{ ...glass, height: '100%' }}>
                            <DeductionBreakdown latest={latest} />
                        </Card>
                    </Col>
                </Row>

                {/* Payroll Runs Table */}
                <Card style={glass}
                    title={<Space><WalletOutlined /> <Text strong>Payroll Runs</Text></Space>}
                    extra={<Button icon={<DownloadOutlined />} size="small">Export</Button>}>
                    <Table dataSource={runs} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
