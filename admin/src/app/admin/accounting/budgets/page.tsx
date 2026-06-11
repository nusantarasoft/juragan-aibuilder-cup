'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Spin, Empty, Row, Col, Select, Modal, Form, Input, Statistic, Progress, Tooltip, message, theme } from 'antd';
import { DollarOutlined, PlusOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined, RiseOutlined, FallOutlined, FileExcelOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { accountingService, AcctBudget, BudgetVsActualRow } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

export default function BudgetsPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState<AcctBudget[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [bva, setBva] = useState<BudgetVsActualRow[]>([]);
    const [bvaLoading, setBvaLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();
    const [msgApi, ctxHolder] = message.useMessage();

    const load = useCallback(async () => { setLoading(true); try { setBudgets(await accountingService.getBudgets()); } catch {} finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const loadBva = useCallback(async (budgetId: string) => {
        setSelectedBudget(budgetId);
        setBvaLoading(true);
        try { setBva(await accountingService.getBudgetVsActual(undefined, budgetId)); }
        catch {} finally { setBvaLoading(false); }
    }, []);

    const createBudget = async () => {
        try {
            const vals = await form.validateFields();
            await accountingService.createBudget(undefined, vals);
            msgApi.success('Budget created');
            setModal(false); form.resetFields(); load();
        } catch (e: any) { if (e.message) msgApi.error(e.message); }
    };

    const totalBudgeted = useMemo(() => bva.reduce((s, r) => s + r.budgeted, 0), [bva]);
    const totalActual = useMemo(() => bva.reduce((s, r) => s + r.actual, 0), [bva]);
    const totalVariance = totalBudgeted - totalActual;
    const overBudgetCount = bva.filter(r => r.actual > r.budgeted && r.budgeted > 0).length;
    const underBudgetCount = bva.filter(r => r.actual <= r.budgeted && r.budgeted > 0).length;

    const bvaColumns = [
        { title: 'Code', dataIndex: 'accountCode', key: 'code', width: 90, render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: 'Account', dataIndex: 'accountName', key: 'name', ellipsis: true },
        { title: 'Budgeted', dataIndex: 'budgeted', key: 'b', width: 160, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{fmt(v)}</Text> },
        { title: 'Actual', dataIndex: 'actual', key: 'a', width: 160, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{fmt(v)}</Text> },
        {
            title: 'Variance', dataIndex: 'variance', key: 'v', width: 160, align: 'right' as const,
            render: (v: number) => <Text strong style={{ fontFamily: 'monospace', color: v >= 0 ? '#10b981' : '#ef4444' }}>{v >= 0 ? '+' : ''}{fmt(v)}</Text>,
            sorter: (a: BudgetVsActualRow, b: BudgetVsActualRow) => a.variance - b.variance,
        },
        {
            title: 'Var %', dataIndex: 'variancePct', key: 'vp', width: 100, align: 'right' as const,
            render: (v: number, r: BudgetVsActualRow) => r.budgeted > 0 ? (
                <Tag color={v >= 0 ? 'green' : Math.abs(v) > 20 ? 'red' : 'orange'} icon={v >= 0 ? <FallOutlined /> : <RiseOutlined />} style={{ fontSize: 11 }}>
                    {v >= 0 ? '-' : '+'}{Math.abs(v).toFixed(1)}%
                </Tag>
            ) : '—',
        },
        {
            title: 'Usage', key: 'usage', width: 120,
            render: (_: any, r: BudgetVsActualRow) => {
                if (r.budgeted <= 0) return '—';
                const pct = Math.min(100, Math.round((r.actual / r.budgeted) * 100));
                return <Progress percent={pct} size="small" strokeColor={pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'} />;
            },
        },
    ];

    const expData = bva.map(r => ({ code: r.accountCode, name: r.accountName, budgeted: r.budgeted, actual: r.actual, variance: r.variance, variancePct: `${r.variancePct}%` }));

    if (loading) return <CMSLayout title="Budgets"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Budgets & Forecasting</AuroraText>}
            subTitle={<DecryptedText text="Track budget vs actual spending by account" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<RbacGuard key="e" requiredRole="manager"><Tooltip title="Export Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'budgets', title: 'Budget vs Actual', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'code' }, { header: 'Account', key: 'name' }, { header: 'Budgeted', key: 'budgeted' }, { header: 'Actual', key: 'actual' }, { header: 'Variance', key: 'variance' }], data: expData })} /></Tooltip> <Tooltip title="Export PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'budgets', title: 'Budget vs Actual', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'code' }, { header: 'Account', key: 'name' }, { header: 'Budgeted', key: 'budgeted' }, { header: 'Actual', key: 'actual' }, { header: 'Variance', key: 'variance' }], data: expData })} /></Tooltip></RbacGuard>]}>
            {ctxHolder}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Budget Selector */}
                <Card style={glass} size="small">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <BarChartOutlined style={{ fontSize: 18, color: themeColor }} />
                        <Text strong>Budget:</Text>
                        <Select placeholder="Select budget" value={selectedBudget} onChange={loadBva} style={{ minWidth: 280 }}
                            options={budgets.map(b => ({ value: b.id, label: `${b.name} (${b.status})` }))} allowClear showSearch optionFilterProp="label" />
                        <Button icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }}>Create Budget</Button>
                        {selectedBudget && <Button icon={<ReloadOutlined />} onClick={() => loadBva(selectedBudget)} />}
                    </div>
                </Card>

                {/* Summary KPIs */}
                {selectedBudget && bva.length > 0 && (
                    <Row gutter={[14, 14]}>
                        {[
                            { t: 'Total Budgeted', v: totalBudgeted, c: '#6366f1', icon: <DollarOutlined /> },
                            { t: 'Total Actual', v: totalActual, c: totalActual > totalBudgeted ? '#ef4444' : '#10b981', icon: <DollarOutlined /> },
                            { t: 'Variance', v: totalVariance, c: totalVariance >= 0 ? '#10b981' : '#ef4444', icon: totalVariance >= 0 ? <CheckCircleOutlined /> : <WarningOutlined /> },
                            { t: 'Over Budget', v: overBudgetCount, c: '#ef4444', icon: <RiseOutlined /> },
                        ].map((s, i) => (
                            <Col key={i} xs={12} sm={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}>
                                    <Statistic title={<span style={{ fontSize: 11 }}>{s.t}</span>} value={typeof s.v === 'number' && s.t !== 'Over Budget' ? s.v : s.v}
                                        formatter={v => s.t !== 'Over Budget' ? fmt(Number(v)) : String(v)}
                                        prefix={s.icon} valueStyle={{ fontSize: 20, fontWeight: 700, color: s.c }} />
                                </Card>
                            </motion.div></Col>
                        ))}
                    </Row>
                )}

                {/* Overall Budget Utilization */}
                {selectedBudget && totalBudgeted > 0 && (
                    <Card style={glass} size="small">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Text strong style={{ fontSize: 13 }}>Overall Utilization:</Text>
                            <Progress percent={Math.min(100, Math.round((totalActual / totalBudgeted) * 100))} style={{ flex: 1, maxWidth: 400 }}
                                strokeColor={totalActual > totalBudgeted ? '#ef4444' : { '0%': themeColor, '100%': '#10b981' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>{fmt(totalActual)} / {fmt(totalBudgeted)}</Text>
                            <Tag color={underBudgetCount > overBudgetCount ? 'green' : 'red'}>{underBudgetCount} under • {overBudgetCount} over</Tag>
                        </div>
                    </Card>
                )}

                {/* Budget vs Actual Table */}
                {selectedBudget && (
                    <Card title={<Space><BarChartOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Budget vs Actual</span><Tag color="purple">{bva.length} accounts</Tag></Space>} style={glass}>
                        {bvaLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div> :
                            bva.length === 0 ? <Empty description="No budget data. Add budget lines to accounts." /> :
                                <Table scroll={{ x: 900 }} dataSource={bva.map(r => ({ ...r, key: r.accountId }))} columns={bvaColumns} size="small"
                                    pagination={{ pageSize: 25, showTotal: t => `${t} accounts` }}
                                    summary={() => (
                                        <Table.Summary.Row style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5' }}>
                                            <Table.Summary.Cell index={0} colSpan={2}><Text strong>TOTAL</Text></Table.Summary.Cell>
                                            <Table.Summary.Cell index={1} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{fmt(totalBudgeted)}</Text></Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{fmt(totalActual)}</Text></Table.Summary.Cell>
                                            <Table.Summary.Cell index={3} align="right"><Text strong style={{ fontFamily: 'monospace', color: totalVariance >= 0 ? '#10b981' : '#ef4444' }}>{totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}</Text></Table.Summary.Cell>
                                            <Table.Summary.Cell index={4} colSpan={2} />
                                        </Table.Summary.Row>
                                    )} />
                        }
                    </Card>
                )}

                {!selectedBudget && <Card style={{ ...glass, textAlign: 'center', padding: 40 }}><BarChartOutlined style={{ fontSize: 48, color: themeColor, opacity: 0.3 }} /><div style={{ marginTop: 16 }}><Text type="secondary">Select or create a budget to view variance analysis.</Text></div></Card>}
            </motion.div>

            <Modal title="Create Budget" open={modal} onOk={createBudget} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Budget Name" rules={[{ required: true }]}><Input placeholder="FY 2026 Operating Budget" /></Form.Item>
                    <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} placeholder="Budget notes..." /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
