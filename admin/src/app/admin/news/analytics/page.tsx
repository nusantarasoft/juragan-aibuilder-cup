'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Spin, Statistic, message, Tooltip, Table, Tag, Space, Empty, Badge } from 'antd';
import { BarChartOutlined, SmileOutlined, FrownOutlined, MehOutlined, RiseOutlined, EyeOutlined, ShareAltOutlined, HeartOutlined, GlobalOutlined, ReloadOutlined, FileExcelOutlined, FilePdfOutlined, FileSearchOutlined } from '@ant-design/icons';
import { newsService, NewsDashboard, NewsArticle, NewsSocialPost } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const sentColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8' };

function HorizontalBar({ items }: { items: { label: string; value: number; color: string }[] }) {
    const max = Math.max(...items.map(i => i.value), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 11, minWidth: 80, textAlign: 'right' }}>{item.label}</Text>
                    <div style={{ flex: 1, height: 22, borderRadius: 11, background: 'rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / max) * 100}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                            style={{ height: '100%', borderRadius: 11, background: item.color, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: item.value > 0 ? 30 : 0 }}>
                            {item.value > 0 && <Text style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{item.value}</Text>}
                        </motion.div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<NewsDashboard | null>(null);
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [posts, setPosts] = useState<NewsSocialPost[]>([]);

    const load = useCallback(async () => { setLoading(true); try { const [d, a, p] = await Promise.all([newsService.getDashboard(), newsService.getArticles(), newsService.getSocialPosts()]); setDashboard(d); setArticles(a); setPosts(p); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    if (loading || !dashboard) return <CMSLayout title="Analytics"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    const s = dashboard.sentiment;
    const catCounts = new Map<string, number>();
    for (const a of articles) { catCounts.set(a.category || 'general', (catCounts.get(a.category || 'general') || 0) + 1); }
    const catItems = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map((c, i) => ({ label: c[0], value: c[1], color: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6'][i % 8] }));

    const platformCounts = new Map<string, number>();
    for (const p of posts) { platformCounts.set(p.platform, (platformCounts.get(p.platform) || 0) + 1); }
    const platformItems = [...platformCounts.entries()].map(p => ({ label: p[0], value: p[1], color: { twitter: '#1DA1F2', facebook: '#4267B2', linkedin: '#0077B5', instagram: '#E4405F' }[p[0]] || '#94a3b8' }));

    const topArticles = [...articles].sort((a, b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore)).slice(0, 10);

    const expData = articles.map(a => ({ title: a.title, category: a.category, sentiment: a.sentimentLabel, score: a.sentimentScore, author: a.author || '', published: a.publishedAt ? dayjs(a.publishedAt).format('YYYY-MM-DD') : '' }));

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Analytics & Reports</AuroraText>} subTitle={<DecryptedText text="Cross-channel performance metrics and intelligence reports" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'news_analytics', title: 'News Analytics Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Category', key: 'category' }, { header: 'Sentiment', key: 'sentiment' }, { header: 'Score', key: 'score' }], data: expData })} /></Tooltip><Tooltip title="PDF"><Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({ fileName: 'news_analytics', title: 'News Analytics Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Category', key: 'category' }, { header: 'Sentiment', key: 'sentiment' }, { header: 'Score', key: 'score' }], data: expData })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Total Articles', value: dashboard.totalArticles, icon: <FileSearchOutlined />, color: '#3b82f6' },
                        { title: 'Social Posts', value: posts.length, icon: <ShareAltOutlined />, color: '#8b5cf6' },
                        { title: 'Total Reach', value: dashboard.totalReach, icon: <EyeOutlined />, color: '#06b6d4' },
                        { title: 'Avg Sentiment', value: `${s.avgScore > 0 ? '+' : ''}${s.avgScore}`, icon: s.avgScore >= 0 ? <SmileOutlined /> : <FrownOutlined />, color: s.avgScore >= 0 ? '#10b981' : '#ef4444' },
                        { title: 'Positive %', value: `${s.total ? Math.round(s.positive / s.total * 100) : 0}%`, icon: <SmileOutlined />, color: '#10b981' },
                        { title: 'Sources', value: dashboard.activeSources, icon: <GlobalOutlined />, color: '#f59e0b' },
                    ].map((st, i) => (
                        <Col key={i} xs={12} md={4}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${st.color}` }}><Statistic title={st.title} value={st.value} prefix={st.icon} valueStyle={{ color: st.color, fontSize: 18 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<><BarChartOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Articles by Category</Text></>}>
                            {catItems.length === 0 ? <Empty description="No data" /> : <HorizontalBar items={catItems} />}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<><ShareAltOutlined style={{ color: '#8b5cf6' }} /> <Text strong style={{ fontSize: 13 }}>Posts by Platform</Text></>}>
                            {platformItems.length === 0 ? <Empty description="No social posts" /> : <HorizontalBar items={platformItems} />}
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<><SmileOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Sentiment Breakdown</Text></>}>
                            <HorizontalBar items={[{ label: 'Positive', value: s.positive, color: '#10b981' }, { label: 'Neutral', value: s.neutral, color: '#94a3b8' }, { label: 'Negative', value: s.negative, color: '#ef4444' }]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<><RiseOutlined style={{ color: '#f59e0b' }} /> <Text strong style={{ fontSize: 13 }}>Top Impact Articles</Text></>}>
                            {topArticles.length === 0 ? <Empty description="No articles" /> :
                                <Table size="small" dataSource={topArticles.map(a => ({ ...a, key: a.id }))} pagination={false} scroll={{ x: 500 }} columns={[
                                    { title: 'Title', dataIndex: 'title', ellipsis: true },
                                    { title: 'Sentiment', dataIndex: 'sentimentLabel', width: 90, render: (v: string) => <Tag color={sentColors[v]} style={{ borderRadius: 8 }}>{v}</Tag> },
                                    { title: 'Score', dataIndex: 'sentimentScore', width: 70, align: 'center' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace', fontWeight: 700, color: v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#94a3b8' }}>{v > 0 ? '+' : ''}{v}</Text> },
                                ]} />}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
