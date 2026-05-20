'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Empty, Table, Statistic, Modal, Form, Input, Select, message, Tooltip, Badge, Popconfirm, List, Timeline } from 'antd';
import { FundProjectionScreenOutlined, PlusOutlined, GlobalOutlined, RiseOutlined, FallOutlined, MinusOutlined, DeleteOutlined, ReloadOutlined, AimOutlined, ThunderboltOutlined, BulbOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { newsService, NewsCompetitor, NewsMarketSignal } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const impactColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8' };
const impactIcons: Record<string, React.ReactNode> = { positive: <RiseOutlined />, negative: <FallOutlined />, neutral: <MinusOutlined /> };
const signalColors: Record<string, string> = { news: '#3b82f6', price_change: '#f59e0b', product_launch: '#8b5cf6', hiring: '#10b981', funding: '#06b6d4', partnership: '#ec4899' };

export default function MarketSoundingPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [competitors, setCompetitors] = useState<NewsCompetitor[]>([]);
    const [signals, setSignals] = useState<NewsMarketSignal[]>([]);
    const [compModal, setCompModal] = useState(false);
    const [signalModal, setSignalModal] = useState(false);
    const [compForm] = Form.useForm();
    const [signalForm] = Form.useForm();

    const load = useCallback(async () => { setLoading(true); try { const [c, s] = await Promise.all([newsService.getCompetitors(), newsService.getMarketSignals()]); setCompetitors(c); setSignals(s); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const addComp = async () => { try { const v = await compForm.validateFields(); await newsService.createCompetitor(undefined, { ...v, keywords: v.keywords || [] }); message.success('Competitor added'); setCompModal(false); compForm.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const addSignal = async () => { try { const v = await signalForm.validateFields(); await newsService.createMarketSignal(undefined, v); message.success('Signal added'); setSignalModal(false); signalForm.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const delComp = async (id: string) => { try { await newsService.deleteCompetitor(id); message.success('Removed'); load(); } catch (e: any) { message.error(e.message); } };

    if (loading) return <CMSLayout title="Market Sounding"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#06b6d4']}>Market Sounding</AuroraText>} subTitle={<DecryptedText text="Competitive intelligence, market trends & industry benchmarks" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="comp" icon={<PlusOutlined />} onClick={() => { compForm.resetFields(); setCompModal(true); }}>Add Competitor</Button>,
            <Button key="sig" type="primary" icon={<ThunderboltOutlined />} onClick={() => { signalForm.resetFields(); setSignalModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>Add Signal</Button>,
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'market_signals', title: 'Market Signals', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Type', key: 'signalType' }, { header: 'Title', key: 'title' }, { header: 'Impact', key: 'impact' }, { header: 'Confidence', key: 'confidence' }], data: signals })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Competitors', v: competitors.length, c: '#3b82f6' }, { t: 'Market Signals', v: signals.length, c: '#f59e0b' }, { t: 'Positive Impact', v: signals.filter(s => s.impact === 'positive').length, c: '#10b981' }, { t: 'Negative Impact', v: signals.filter(s => s.impact === 'negative').length, c: '#ef4444' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card title={<><AimOutlined style={{ color: themeColor }} /> <Text strong>Competitors</Text> <Badge count={competitors.length} style={{ backgroundColor: themeColor }} /></>} style={glass} size="small">
                    {competitors.length === 0 ? <Empty description="No competitors tracked yet" /> : (
                        <Row gutter={[12, 12]}>
                            {competitors.map((c, i) => (
                                <Col key={c.id} xs={24} sm={12} md={8}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                        <Card size="small" hoverable style={{ borderLeft: `3px solid ${themeColor}`, borderRadius: 10 }} actions={[<Popconfirm key="del" title="Remove?" onConfirm={() => delComp(c.id)}><DeleteOutlined style={{ color: '#ef4444' }} /></Popconfirm>]}>
                                            <Text strong style={{ fontSize: 14 }}>{c.name}</Text>
                                            {c.industry && <><br /><Tag style={{ fontSize: 10, marginTop: 4 }}>{c.industry}</Tag></>}
                                            {c.website && <><br /><a href={c.website} target="_blank" rel="noopener" style={{ fontSize: 11 }}><GlobalOutlined /> {c.website.replace(/https?:\/\//, '').slice(0, 30)}</a></>}
                                            {c.description && <><br /><Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{c.description.slice(0, 80)}</Text></>}
                                            <div style={{ marginTop: 6 }}><Text type="secondary" style={{ fontSize: 10 }}>Signals: {c.signalCount || 0}</Text></div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Card>

                <Card title={<><BulbOutlined style={{ color: '#f59e0b' }} /> <Text strong>Market Signals Timeline</Text> <Badge count={signals.length} style={{ backgroundColor: '#f59e0b' }} /></>} style={glass}>
                    {signals.length === 0 ? <Empty description="No market signals recorded" /> : (
                        <Timeline mode="left" items={signals.slice(0, 20).map((s, i) => ({
                            color: impactColors[s.impact] || '#94a3b8',
                            children: (
                                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} style={{ padding: '4px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Tag color={signalColors[s.signalType] || 'default'} style={{ fontSize: 10, borderRadius: 6 }}>{s.signalType.replace('_', ' ')}</Tag>
                                        <span style={{ color: impactColors[s.impact], fontSize: 12 }}>{impactIcons[s.impact]}</span>
                                    </div>
                                    <Text strong style={{ fontSize: 13, display: 'block', marginTop: 2 }}>{s.title}</Text>
                                    {s.description && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{s.description.slice(0, 120)}</Text>}
                                    <Text type="secondary" style={{ fontSize: 10 }}>{s.detectedAt ? dayjs(s.detectedAt).format('DD MMM YYYY HH:mm') : ''} · Confidence: {Math.round((s.confidence || 0) * 100)}%</Text>
                                </motion.div>
                            ),
                        }))} />
                    )}
                </Card>
            </motion.div>

            <Modal title="Add Competitor" open={compModal} onOk={addComp} onCancel={() => setCompModal(false)} okText="Add">
                <Form form={compForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="Competitor name" /></Form.Item>
                    <Form.Item name="website" label="Website"><Input placeholder="https://..." /></Form.Item>
                    <Form.Item name="industry" label="Industry"><Input placeholder="e.g. Technology, Finance" /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="keywords" label="Tracking Keywords"><Select mode="tags" placeholder="Add keywords" /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Add Market Signal" open={signalModal} onOk={addSignal} onCancel={() => setSignalModal(false)} okText="Add">
                <Form form={signalForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="signalType" label="Signal Type" rules={[{ required: true }]}><Select options={[{ label: 'News', value: 'news' }, { label: 'Price Change', value: 'price_change' }, { label: 'Product Launch', value: 'product_launch' }, { label: 'Hiring', value: 'hiring' }, { label: 'Funding', value: 'funding' }, { label: 'Partnership', value: 'partnership' }]} /></Form.Item>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="Signal headline" /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="competitorId" label="Competitor"><Select allowClear placeholder="Link to competitor" options={competitors.map(c => ({ label: c.name, value: c.id }))} /></Form.Item>
                    <Row gutter={12}><Col span={12}><Form.Item name="impact" label="Impact" initialValue="neutral"><Select options={[{ label: '📈 Positive', value: 'positive' }, { label: '📉 Negative', value: 'negative' }, { label: '➖ Neutral', value: 'neutral' }]} /></Form.Item></Col><Col span={12}><Form.Item name="sourceUrl" label="Source URL"><Input placeholder="https://..." /></Form.Item></Col></Row>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
