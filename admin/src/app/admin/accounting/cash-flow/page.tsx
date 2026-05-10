'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Typography, Spin, Empty, Row, Col, Statistic, Tag, DatePicker, Space, Button, Tooltip, Divider } from 'antd';
import { DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, BankOutlined, SwapOutlined, RiseOutlined, FallOutlined, FileExcelOutlined, FilePdfOutlined, FundOutlined } from '@ant-design/icons';
import { accountingService, CashFlowStatement, CashFlowSection } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

function SectionCard({ title, icon, color, section }: { title: string; icon: React.ReactNode; color: string; section?: CashFlowSection }) {
    if (!section) return null;
    return (
        <Card style={{ ...glass, borderTop: `3px solid ${color}` }} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Space><span style={{ color, fontSize: 16 }}>{icon}</span><Text strong style={{ fontSize: 14 }}>{title}</Text></Space>
                <Text strong style={{ fontFamily: 'monospace', fontSize: 16, color: section.total >= 0 ? '#10b981' : '#ef4444' }}>{fmt(section.total)}</Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(section.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <Text style={{ fontSize: 13 }}>{item.name}</Text>
                        <Text style={{ fontFamily: 'monospace', fontSize: 13, color: item.amount >= 0 ? '#10b981' : '#ef4444' }}>{fmt(item.amount)}</Text>
                    </div>
                ))}
                {(section.items || []).length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No items in this period</Text>}
            </div>
            <div style={{ marginTop: 8, borderTop: `2px solid ${color}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 13 }}>Net {title}</Text>
                <Text strong style={{ fontFamily: 'monospace', fontSize: 14, color: section.total >= 0 ? '#10b981' : '#ef4444' }}>{fmt(section.total)}</Text>
            </div>
        </Card>
    );
}

export default function CashFlowPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CashFlowStatement | null>(null);
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));

    useEffect(() => {
        (async () => {
            setLoading(true);
            try { setData(await accountingService.getCashFlowStatement(undefined, dateFrom, dateTo)); }
            catch { /* empty */ }
            finally { setLoading(false); }
        })();
    }, [dateFrom, dateTo]);

    const expData = data ? [
        ...(data.operating?.items || []).map(i => ({ section: 'Operating', name: i.name, amount: i.amount })),
        { section: 'Operating', name: 'TOTAL', amount: data.operating?.total || 0 },
        ...(data.investing?.items || []).map(i => ({ section: 'Investing', name: i.name, amount: i.amount })),
        { section: 'Investing', name: 'TOTAL', amount: data.investing?.total || 0 },
        ...(data.financing?.items || []).map(i => ({ section: 'Financing', name: i.name, amount: i.amount })),
        { section: 'Financing', name: 'TOTAL', amount: data.financing?.total || 0 },
        { section: 'Summary', name: 'Net Change', amount: data.netChange || 0 },
    ] : [];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Cash Flow Statement</AuroraText>}
            subTitle={<DecryptedText text="Operating, Investing & Financing cash flows" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<RbacGuard key="e" requiredRole="manager"><Tooltip title="Export Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'cash_flow', title: 'Cash Flow Statement', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Section', key: 'section' }, { header: 'Item', key: 'name' }, { header: 'Amount', key: 'amount' }], data: expData })} /></Tooltip> <Tooltip title="Export PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'cash_flow', title: 'Cash Flow Statement', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Section', key: 'section' }, { header: 'Item', key: 'name' }, { header: 'Amount', key: 'amount' }], data: expData })} /></Tooltip></RbacGuard>]}>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Date Range */}
                <Card style={glass} size="small">
                    <Space>
                        <Text strong style={{ fontSize: 13 }}>Period:</Text>
                        <DatePicker value={dayjs(dateFrom)} onChange={d => d && setDateFrom(d.format('YYYY-MM-DD'))} />
                        <Text type="secondary">to</Text>
                        <DatePicker value={dayjs(dateTo)} onChange={d => d && setDateTo(d.format('YYYY-MM-DD'))} />
                    </Space>
                </Card>

                {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div> :
                    !data ? <Empty description="No cash flow data for this period." /> : (<>

                    {/* Summary KPIs */}
                    <Row gutter={[14, 14]}>
                        {[
                            { t: 'Opening Cash', v: data.openingCash, c: '#6366f1', icon: <BankOutlined /> },
                            { t: 'Net Change', v: data.netChange, c: data.netChange >= 0 ? '#10b981' : '#ef4444', icon: data.netChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined /> },
                            { t: 'Closing Cash', v: data.closingCash, c: '#3b82f6', icon: <DollarOutlined /> },
                        ].map((s, i) => (
                            <Col key={i} xs={24} sm={8}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}>
                                    <Statistic title={<span style={{ fontSize: 11 }}>{s.t}</span>} value={s.v} formatter={v => fmt(Number(v))} prefix={s.icon}
                                        valueStyle={{ fontSize: 22, fontWeight: 700, color: s.c, fontFamily: 'monospace' }} />
                                </Card>
                            </motion.div></Col>
                        ))}
                    </Row>

                    {/* Cash Flow Waterfall */}
                    <Card style={glass} size="small">
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Cash Flow Waterfall</Text>
                        <div style={{ display: 'flex', gap: 0, height: 36, borderRadius: 8, overflow: 'hidden' }}>
                            {[
                                { v: Math.abs(data.operating?.total || 0), c: data.operating?.total >= 0 ? '#10b981' : '#ef4444', l: 'Operating' },
                                { v: Math.abs(data.investing?.total || 0), c: data.investing?.total >= 0 ? '#3b82f6' : '#f59e0b', l: 'Investing' },
                                { v: Math.abs(data.financing?.total || 0), c: data.financing?.total >= 0 ? '#8b5cf6' : '#ef4444', l: 'Financing' },
                            ].map((b, i) => {
                                const total = Math.abs(data.operating?.total || 0) + Math.abs(data.investing?.total || 0) + Math.abs(data.financing?.total || 0);
                                const pct = total > 0 ? (b.v / total) * 100 : 33;
                                return pct > 0 ? (
                                    <Tooltip key={i} title={`${b.l}: ${fmt(b.v)}`}>
                                        <div style={{ width: `${pct}%`, background: b.c, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' }}>
                                            {pct > 15 && <Text style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{b.l}</Text>}
                                        </div>
                                    </Tooltip>
                                ) : null;
                            })}
                        </div>
                    </Card>

                    {/* Three Sections */}
                    <Row gutter={[14, 14]}>
                        <Col xs={24} lg={8}><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <SectionCard title="Operating" icon={<SwapOutlined />} color="#10b981" section={data.operating} />
                        </motion.div></Col>
                        <Col xs={24} lg={8}><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <SectionCard title="Investing" icon={<FundOutlined />} color="#3b82f6" section={data.investing} />
                        </motion.div></Col>
                        <Col xs={24} lg={8}><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                            <SectionCard title="Financing" icon={<BankOutlined />} color="#8b5cf6" section={data.financing} />
                        </motion.div></Col>
                    </Row>

                    {/* Net Summary */}
                    <Card style={{ ...glass, borderTop: '3px double #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong style={{ fontSize: 15, display: 'block' }}>Net Increase/(Decrease) in Cash</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(dateFrom).format('DD MMM YYYY')} — {dayjs(dateTo).format('DD MMM YYYY')}</Text>
                            </div>
                            <Text strong style={{ fontFamily: 'monospace', fontSize: 24, color: data.netChange >= 0 ? '#10b981' : '#ef4444' }}>{fmt(data.netChange)}</Text>
                        </div>
                    </Card>
                </>)}
            </motion.div>
        </CMSLayout>
    );
}
