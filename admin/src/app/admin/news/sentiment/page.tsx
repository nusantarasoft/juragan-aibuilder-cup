'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Empty, Table, Statistic, Input, message, Tooltip, Badge } from 'antd';
import { SmileOutlined, FrownOutlined, MehOutlined, ExperimentOutlined, ReloadOutlined, ThunderboltOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined } from '@ant-design/icons';
import { newsService, NewsSentimentEntry, NewsSentimentSummary } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const sentColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8' };

function SentimentGauge({ summary }: { summary: NewsSentimentSummary }) {
    const total = summary.total || 1;
    const segments = [
        { label: 'Positive', count: summary.positive, color: '#10b981', icon: <SmileOutlined /> },
        { label: 'Neutral', count: summary.neutral, color: '#94a3b8', icon: <MehOutlined /> },
        { label: 'Negative', count: summary.negative, color: '#ef4444', icon: <FrownOutlined /> },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden' }}>
                {segments.map((s, i) => (
                    <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${(s.count / total) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                        style={{ background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: s.count > 0 ? 30 : 0 }}>
                        {s.count > 0 && <Text style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{Math.round((s.count / total) * 100)}%</Text>}
                    </motion.div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {segments.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: s.color, fontSize: 14 }}>{s.icon}</span>
                        <Text style={{ fontSize: 11 }}>{s.label}: <strong>{s.count}</strong></Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KeywordCloud({ entries }: { entries: NewsSentimentEntry[] }) {
    const freqMap = new Map<string, number>();
    for (const e of entries) {
        for (const kw of (e.keywords as string[] || [])) { freqMap.set(kw, (freqMap.get(kw) || 0) + 1); }
    }
    const sorted = [...freqMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
    const max = sorted[0]?.[1] || 1;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', padding: '8px 0' }}>
            {sorted.map(([word, count], i) => {
                const size = 11 + Math.round((count / max) * 12);
                const opacity = 0.4 + (count / max) * 0.6;
                return (<motion.span key={word} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity, scale: 1 }} transition={{ delay: i * 0.02 }} style={{ fontSize: size, fontWeight: count > max * 0.5 ? 700 : 400, color: '#3b82f6', padding: '2px 6px', cursor: 'default' }} title={`${count} occurrences`}>{word}</motion.span>);
            })}
        </div>
    );
}

export default function SentimentAnalysisPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<NewsSentimentEntry[]>([]);
    const [summary, setSummary] = useState<NewsSentimentSummary>({ total: 0, positive: 0, negative: 0, neutral: 0, avgScore: 0 });
    const [analyzeText, setAnalyzeText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const load = useCallback(async () => { setLoading(true); try { const [e, s] = await Promise.all([newsService.getSentimentEntries(), newsService.getSentimentSummary()]); setEntries(e); setSummary(s); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const doAnalyze = async () => { if (!analyzeText.trim()) return; setAnalyzing(true); try { const r = await newsService.analyzeSentiment(undefined, analyzeText); message.success(`Sentiment: ${r.label} (score: ${r.score})`); setAnalyzeText(''); load(); } catch (e: any) { message.error(e.message); } finally { setAnalyzing(false); } };

    const cols: any[] = [
        { title: 'Text', key: 'text', ellipsis: true, render: (_: any, r: NewsSentimentEntry) => <Text style={{ fontSize: 12 }}>{r.textSnippet || '—'}</Text> },
        { title: 'Score', dataIndex: 'score', width: 80, align: 'center' as const, sorter: (a: any, b: any) => a.score - b.score, render: (v: number) => <Text style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#94a3b8' }}>{v > 0 ? '+' : ''}{v}</Text> },
        { title: 'Label', dataIndex: 'label', width: 100, render: (v: string) => <Tag color={sentColors[v]} style={{ borderRadius: 8 }}>{v}</Tag>, filters: [{ text: 'Positive', value: 'positive' }, { text: 'Negative', value: 'negative' }, { text: 'Neutral', value: 'neutral' }], onFilter: (v: any, r: any) => r.label === v },
        { title: 'Confidence', dataIndex: 'magnitude', width: 90, align: 'center' as const, render: (v: number) => <Text style={{ fontSize: 11 }}>{Math.round((v || 0) * 100)}%</Text> },
        { title: 'Source', dataIndex: 'sourceType', width: 90, render: (v: string) => <Tag>{v}</Tag> },
        { title: 'Date', key: 'd', width: 130, render: (_: any, r: NewsSentimentEntry) => <Text style={{ fontSize: 11 }}>{r.analyzedAt ? dayjs(r.analyzedAt).format('DD MMM HH:mm') : '—'}</Text> },
    ];
    const expData = entries.map(e => ({ text: e.textSnippet, score: e.score, label: e.label, confidence: Math.round((e.magnitude || 0) * 100), source: e.sourceType, date: e.analyzedAt ? dayjs(e.analyzedAt).format('YYYY-MM-DD') : '' }));

    if (loading) return <CMSLayout title="Sentiment Analysis"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#ef4444']}>Sentiment Analysis</AuroraText>} subTitle={<DecryptedText text="NLP-powered sentiment tracking across all news sources" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'sentiment', title: 'Sentiment Analysis', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Text', key: 'text' }, { header: 'Score', key: 'score' }, { header: 'Label', key: 'label' }, { header: 'Confidence', key: 'confidence' }], data: expData })} /></Tooltip><Tooltip title="PDF"><Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({ fileName: 'sentiment', title: 'Sentiment Analysis', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Text', key: 'text' }, { header: 'Score', key: 'score' }, { header: 'Label', key: 'label' }], data: expData })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Analyzed', v: summary.total, c: '#3b82f6' }, { t: 'Positive', v: summary.positive, c: '#10b981', i: <SmileOutlined /> }, { t: 'Negative', v: summary.negative, c: '#ef4444', i: <FrownOutlined /> }, { t: 'Avg Score', v: `${summary.avgScore > 0 ? '+' : ''}${summary.avgScore}`, c: summary.avgScore >= 0 ? '#10b981' : '#ef4444' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<><ExperimentOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 13 }}>Sentiment Distribution</Text></>}>
                            <SentimentGauge summary={summary} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card size="small" style={glass} title={<><ThunderboltOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Analyze Text</Text></>}>
                            <Input.TextArea rows={3} value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} placeholder="Paste text here to analyze sentiment..." />
                            <Button type="primary" icon={<ThunderboltOutlined />} loading={analyzing} onClick={doAnalyze} block style={{ marginTop: 8, borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>Analyze Sentiment</Button>
                        </Card>
                    </Col>
                </Row>

                {entries.length > 0 && (
                    <Card size="small" style={glass} title={<><SearchOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Keyword Cloud</Text></>}>
                        <KeywordCloud entries={entries} />
                    </Card>
                )}

                <Card style={glass} title={<><ExperimentOutlined style={{ color: themeColor }} /> <Text strong>All Entries</Text> <Badge count={entries.length} style={{ backgroundColor: themeColor }} /></>}>
                    <Table columns={cols} dataSource={entries.map(e => ({ ...e, key: e.id }))} size="small" scroll={{ x: 700 }} pagination={{ pageSize: 20, showTotal: t => `${t} entries` }} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
