"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Card, Table, Tag, Typography, Row, Col, Statistic, Space, Button, Badge, Tooltip, Progress, Drawer, Modal, Input, message, Divider } from "antd";
import { WalletOutlined, DollarOutlined, TeamOutlined, CalculatorOutlined, BankOutlined, RiseOutlined, DownloadOutlined, PlusOutlined, PlayCircleOutlined, CheckCircleOutlined, DeleteOutlined, EyeOutlined, ClockCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const PR_Q = `query($t:String!){hrPayrollRuns(tenantId:$t){id period name status totalGross totalDeductions totalNet employeeCount processedAt paidAt createdAt}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName baseSalary}}`;
const SLIP_Q = `query($r:String!){hrPayrollSlips(runId:$r){id employeeId employeeName baseSalary grossSalary totalDeductions netSalary components status}}`;
const CREATE_M = `mutation($t:String!,$p:String!,$n:String){createHrPayrollRun(tenantId:$t,period:$p,name:$n){id period name status totalGross totalNet employeeCount createdAt}}`;
const PROCESS_M = `mutation($id:String!){processHrPayrollRun(id:$id){id status processedAt}}`;
const PAID_M = `mutation($id:String!){markHrPayrollPaid(id:$id){id status paidAt}}`;
const DELETE_M = `mutation($id:String!){deleteHrPayrollRun(id:$id)}`;

const statusCfg: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    draft: { color: '#6b7280', label: 'Draft', icon: <ClockCircleOutlined /> },
    processing: { color: '#3b82f6', label: 'Processing', icon: <PlayCircleOutlined /> },
    completed: { color: '#10b981', label: 'Completed', icon: <CheckCircleOutlined /> },
    paid: { color: '#06b6d4', label: 'Paid', icon: <DollarOutlined /> },
};

function PayrollTrend({ runs }: { runs: any[] }) {
    const sorted = [...runs].sort((a, b) => a.period?.localeCompare(b.period));
    const data = sorted.slice(-8);
    if (data.length < 2) return <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block', padding: 20 }}>Not enough data for trend</Text>;
    const maxNet = Math.max(...data.map(r => r.totalNet || 0), 1);
    const w = 320, h = 90;
    const pts = data.map((r, i) => `${(i / (data.length - 1)) * w},${h - 8 - ((r.totalNet || 0) / maxNet) * (h - 16)}`).join(' ');
    return (
        <div>
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
                <defs><linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.2" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.02" /></linearGradient></defs>
                <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#payGrad)"><animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" /></polygon>
                <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((r, i) => <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - 8 - ((r.totalNet || 0) / maxNet) * (h - 16)} r="3.5" fill="#10b981" stroke="#fff" strokeWidth="1.5"><animate attributeName="r" from="0" to="3.5" dur="0.3s" begin={`${0.3 + i * 0.08}s`} fill="freeze" /></circle>)}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 4px' }}>
                {data.map((r, i) => <Text key={i} style={{ fontSize: 9, color: '#9ca3af' }}>{r.period?.slice(-7)}</Text>)}
            </div>
        </div>
    );
}

function DeductionBreakdown({ latest }: { latest: any }) {
    const gross = latest.totalGross || 0;
    const ded = latest.totalDeductions || 0;
    const net = latest.totalNet || 0;
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);
    const items = [
        { label: 'Income Tax (PPh 21)', amount: Math.round(ded * 0.45), color: '#ef4444' },
        { label: 'BPJS Kesehatan', amount: Math.round(ded * 0.25), color: '#f59e0b' },
        { label: 'BPJS Ketenagakerjaan', amount: Math.round(ded * 0.2), color: '#3b82f6' },
        { label: 'Other Deductions', amount: Math.round(ded * 0.1), color: '#8b5cf6' },
    ];
    if (gross === 0) return <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>No payroll data</Text>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(net / gross) * 100}%` }} transition={{ duration: 0.8 }}
                    style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>Net</Text></motion.div>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(ded / gross) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>Ded</Text></motion.div>
            </div>
            {items.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: `${item.color}08` }}>
                    <Space size={6}><div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.color }} /><Text style={{ fontSize: 11 }}>{item.label}</Text></Space>
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
    const [slipDrawer, setSlipDrawer] = useState(false);
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [slips, setSlips] = useState<any[]>([]);
    const [slipLoading, setSlipLoading] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));
    const [runName, setRunName] = useState('');
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    // Filter runs by global date range
    const filteredRuns = runs.filter(r => {
        if (!r.period) return true;
        return r.period >= startDate.slice(0, 7) && r.period <= endDate.slice(0, 7);
    });

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const [p, e] = await Promise.all([
            gql(PR_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrPayrollRuns: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
        ]);
        setRuns(p.hrPayrollRuns || []);
        setEmployees(e.hrEmployees || []);
        setLoading(false);
    };

    const viewSlips = async (run: any) => {
        setSelectedRun(run); setSlipDrawer(true); setSlipLoading(true);
        try { const d = await gql(SLIP_Q, { r: run.id }); setSlips(d.hrPayrollSlips || []); } catch { setSlips([]); }
        setSlipLoading(false);
    };

    const handleCreate = async () => {
        try {
            await gql(CREATE_M, { t: DEFAULT_TENANT_ID, p: period, n: runName || undefined });
            message.success('Payroll run created with salary slips');
            setCreateModal(false); setPeriod(dayjs().format('YYYY-MM')); setRunName('');
            load();
        } catch (e: any) { message.error(e.message || 'Failed'); }
    };

    const handleProcess = async (id: string) => {
        try { await gql(PROCESS_M, { id }); message.success('Payroll processed'); load(); } catch { message.error('Failed'); }
    };
    const handlePaid = async (id: string) => {
        try { await gql(PAID_M, { id }); message.success('Marked as paid'); load(); } catch { message.error('Failed'); }
    };
    const handleDelete = async (id: string) => {
        try { await gql(DELETE_M, { id }); message.success('Deleted'); load(); } catch { message.error('Failed'); }
    };

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const latest = runs[0] || {};
    const totalGrossAll = runs.reduce((s, r) => s + (r.totalGross || 0), 0);
    const totalNetAll = runs.reduce((s, r) => s + (r.totalNet || 0), 0);
    const completed = runs.filter(r => r.status === 'completed' || r.status === 'paid').length;
    const totalBaseSalary = employees.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);

    // Department payroll breakdown
    const deptMap: Record<string, { count: number; total: number }> = {};
    employees.forEach(e => {
        const d = e.departmentName || 'Unassigned';
        if (!deptMap[d]) deptMap[d] = { count: 0, total: 0 };
        deptMap[d].count++; deptMap[d].total += Number(e.baseSalary) || 0;
    });
    const deptBreakdown = Object.entries(deptMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
    const maxDeptTotal = Math.max(...deptBreakdown.map(d => d.total), 1);
    const deptColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444'];

    const columns = [
        { title: 'Period', dataIndex: 'period', render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
        { title: 'Emps', dataIndex: 'employeeCount', align: 'center' as const, width: 70,
            render: (v: number) => <Badge count={v} style={{ backgroundColor: '#3b82f6' }} showZero /> },
        { title: 'Gross', dataIndex: 'totalGross', render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Deductions', dataIndex: 'totalDeductions',
            render: (v: number, r: any) => <Tooltip title={`${Math.round((v / (r.totalGross || 1)) * 100)}%`}><Text type="danger" style={{ fontSize: 12 }}>-{fmt(v)}</Text></Tooltip>, align: 'right' as const },
        { title: 'Net Pay', dataIndex: 'totalNet',
            render: (v: number) => <Text strong style={{ color: '#10b981', fontSize: 13 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Status', dataIndex: 'status',
            render: (v: string) => { const c = statusCfg[v] || statusCfg.draft; return <Tag icon={c.icon} color={c.color} style={{ borderRadius: 20 }}>{c.label}</Tag>; } },
        { title: 'Processed', dataIndex: 'processedAt', width: 100,
            render: (v: string) => v ? <Text style={{ fontSize: 11 }}>{dayjs(v).format('MMM D, YY')}</Text> : <Text type="secondary">—</Text> },
        { title: '', key: 'actions', width: 200,
            render: (_: any, r: any) => (
                <Space size={4}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => viewSlips(r)}>Slips</Button>
                    {r.status === 'draft' && <Button size="small" type="primary" icon={<PlayCircleOutlined />} style={{ background: '#3b82f6' }} onClick={() => handleProcess(r.id)}>Process</Button>}
                    {r.status === 'completed' && <Button size="small" type="primary" icon={<DollarOutlined />} style={{ background: '#06b6d4' }} onClick={() => handlePaid(r.id)}>Pay</Button>}
                    {r.status === 'draft' && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete payroll run?', onOk: () => handleDelete(r.id) })} />}
                </Space>
            ) },
    ];

    const slipColumns = [
        { title: 'Employee', dataIndex: 'employeeName', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
        { title: 'Base', dataIndex: 'baseSalary', render: (v: number) => <Text style={{ fontSize: 11 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Gross', dataIndex: 'grossSalary', render: (v: number) => <Text style={{ fontSize: 11 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Deductions', dataIndex: 'totalDeductions', render: (v: number) => <Text type="danger" style={{ fontSize: 11 }}>-{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Net', dataIndex: 'netSalary', render: (v: number) => <Text strong style={{ color: '#10b981', fontSize: 12 }}>{fmt(v)}</Text>, align: 'right' as const },
        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={statusCfg[v]?.color || '#6b7280'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#f59e0b', themeColor]} className="text-[22px] font-bold tracking-tight">Payroll</AuroraText>}
            subTitle={<DecryptedText text="Payroll processing, salary slips & tax calculations" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <RbacGuard requiredRole="manager"><Tooltip key="excel" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => {
                    const fmtN = (v: number) => new Intl.NumberFormat('id-ID').format(v);
                    exportToExcel({
                        fileName: 'payroll_report',
                        title: 'Payroll Report',
                        dateRange: { start: startDate, end: endDate },
                        columns: [
                            { header: 'Period', key: 'period' },
                            { header: 'Name', key: 'name', format: v => v || '—' },
                            { header: 'Employees', key: 'employeeCount' },
                            { header: 'Gross (Rp)', key: 'totalGross', format: v => fmtN(v || 0) },
                            { header: 'Deductions (Rp)', key: 'totalDeductions', format: v => fmtN(v || 0) },
                            { header: 'Net (Rp)', key: 'totalNet', format: v => fmtN(v || 0) },
                            { header: 'Status', key: 'status' },
                        ],
                        data: filteredRuns,
                    });
                }}>Excel</Button></Tooltip>, <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => {
                    const fmtN = (v: number) => new Intl.NumberFormat('id-ID').format(v);
                    exportToPdf({
                        fileName: 'payroll_report',
                        title: 'Payroll Report',
                        dateRange: { start: startDate, end: endDate },
                        columns: [
                            { header: 'Period', key: 'period' },
                            { header: 'Name', key: 'name', format: v => v || '—' },
                            { header: 'Employees', key: 'employeeCount' },
                            { header: 'Gross (Rp)', key: 'totalGross', format: v => fmtN(v || 0) },
                            { header: 'Deductions (Rp)', key: 'totalDeductions', format: v => fmtN(v || 0) },
                            { header: 'Net (Rp)', key: 'totalNet', format: v => fmtN(v || 0) },
                            { header: 'Status', key: 'status' },
                        ],
                        data: filteredRuns,
                    });
                }}>PDF</Button></Tooltip></RbacGuard>,
                <Button key="run" type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8 }}>New Payroll Run</Button>,
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Latest Gross', value: fmt(latest.totalGross || 0), color: '#3b82f6', icon: <DollarOutlined /> },
                        { title: 'Deductions', value: fmt(latest.totalDeductions || 0), color: '#ef4444', icon: <BankOutlined /> },
                        { title: 'Net Pay', value: fmt(latest.totalNet || 0), color: '#10b981', icon: <WalletOutlined /> },
                        { title: 'Employees', value: latest.employeeCount || 0, color: '#8b5cf6', icon: <TeamOutlined /> },
                        { title: 'Total Runs', value: runs.length, color: '#06b6d4', icon: <CalculatorOutlined /> },
                        { title: 'Base Payroll', value: fmt(totalBaseSalary), color: '#f59e0b', icon: <RiseOutlined /> },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}12`, color: s.color, fontSize: 16 }}>{s.icon}</div>
                                        <div><Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{s.title}</Text><Text strong style={{ fontSize: 14, color: s.color }}>{s.value}</Text></div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Charts */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={10}>
                        <Card title={<><RiseOutlined /> Net Pay Trend</>} size="small" style={{ ...glass, height: '100%' }}>
                            <PayrollTrend runs={runs} />
                        </Card>
                    </Col>
                    <Col xs={24} md={7}>
                        <Card title={<><BankOutlined /> Deduction Breakdown</>} size="small" style={{ ...glass, height: '100%' }}>
                            <DeductionBreakdown latest={latest} />
                        </Card>
                    </Col>
                    <Col xs={24} md={7}>
                        <Card title={<><TeamOutlined /> Dept Payroll</>} size="small" style={{ ...glass, height: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {deptBreakdown.slice(0, 5).map((d, i) => (
                                    <motion.div key={d.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Text style={{ fontSize: 11 }}>{d.name}</Text>
                                            <Text style={{ fontSize: 10, color: deptColors[i % deptColors.length], fontWeight: 600 }}>{d.count} emp</Text>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.total / maxDeptTotal) * 100}%` }} transition={{ delay: 0.4 + i * 0.08 }}
                                                style={{ height: '100%', borderRadius: 3, background: deptColors[i % deptColors.length] }} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Payroll Runs Table */}
                <Card style={glass} title={<Space><WalletOutlined /><Text strong>Payroll Runs</Text><Badge count={filteredRuns.length} style={{ backgroundColor: themeColor }} /></Space>}
                    extra={<Button icon={<DownloadOutlined />} size="small">Export</Button>}>
                    <Table dataSource={filteredRuns} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" scroll={{ x: 900 }} />
                </Card>
            </motion.div>

            {/* Slip Drawer */}
            <Drawer title={`Salary Slips — ${selectedRun?.name || selectedRun?.period || ''}`} open={slipDrawer} onClose={() => setSlipDrawer(false)} width={700}
                styles={{ body: { padding: 16 } }}>
                {selectedRun && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Row gutter={12}>
                            {[
                                { label: 'Total Gross', value: fmt(selectedRun.totalGross || 0), color: '#3b82f6' },
                                { label: 'Total Deductions', value: fmt(selectedRun.totalDeductions || 0), color: '#ef4444' },
                                { label: 'Total Net', value: fmt(selectedRun.totalNet || 0), color: '#10b981' },
                            ].map((s, i) => (
                                <Col span={8} key={i}>
                                    <div style={{ padding: 10, borderRadius: 10, background: `${s.color}08`, borderLeft: `3px solid ${s.color}`, textAlign: 'center' }}>
                                        <Text style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</Text>
                                        <Text strong style={{ fontSize: 14, color: s.color, display: 'block' }}>{s.value}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                        <Table dataSource={slips} columns={slipColumns} rowKey="id" loading={slipLoading} size="small" scroll={{ x: 700 }}
                            pagination={false} expandable={{
                                expandedRowRender: (r: any) => {
                                    const c = r.components || {};
                                    return (
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            {Object.entries(c).map(([k, v]) => (
                                                <Tag key={k} color="blue" style={{ borderRadius: 8 }}>{k}: {fmt(v as number)}</Tag>
                                            ))}
                                        </div>
                                    );
                                },
                            }} />
                    </div>
                )}
            </Drawer>

            {/* Create Modal */}
            <Modal title="New Payroll Run" open={createModal} onCancel={() => setCreateModal(false)} onOk={handleCreate} okText="Create & Generate Slips">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
                    <div><Text strong style={{ fontSize: 12 }}>Period</Text><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="YYYY-MM" style={{ marginTop: 4 }} /></div>
                    <div><Text strong style={{ fontSize: 12 }}>Name (optional)</Text><Input value={runName} onChange={e => setRunName(e.target.value)} placeholder={`Payroll ${period}`} style={{ marginTop: 4 }} /></div>
                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <Text style={{ fontSize: 12 }}>This will generate salary slips for <Text strong style={{ color: '#10b981' }}>{employees.length} active employees</Text> with automatic tax & deduction calculations.</Text>
                    </div>
                </div>
            </Modal>
        </CMSLayout>
    );
}
