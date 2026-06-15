'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Statistic, Typography, Spin, message, Tag, Badge, Space, List, Empty, Tooltip, Button } from 'antd';
import { GlobalOutlined, FileSearchOutlined, RobotOutlined, ShareAltOutlined, AlertOutlined, RiseOutlined, SmileOutlined, FrownOutlined, MehOutlined, ReloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { newsService, NewsDashboard, NewsArticle } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const sentColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8' };

function SentimentDonut({ pos, neg, neu }: { pos: number; neg: number; neu: number }) {
    const total = pos + neg + neu || 1;
    const r = 38, cx = 50, cy = 50, c = 2 * Math.PI * r;
    const segments = [
        { pct: pos / total, color: '#10b981' },
        { pct: neg / total, color: '#ef4444' },
        { pct: neu / total, color: '#94a3b8' },
    ];
    let offset = 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg viewBox="0 0 100 100" width={80} height={80}>
                {segments.map((s, i) => { const dash = s.pct * c; const o = offset; offset += dash; return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={8} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-o} style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />; })}
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{total}</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{ l: 'Positive', v: pos, c: '#10b981', i: <SmileOutlined /> }, { l: 'Negative', v: neg, c: '#ef4444', i: <FrownOutlined /> }, { l: 'Neutral', v: neu, c: '#94a3b8', i: <MehOutlined /> }].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.c }} />
                        <Text style={{ fontSize: 11 }}>{s.l}: <strong>{s.v}</strong> ({Math.round((s.v / total) * 100)}%)</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function NewsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<NewsDashboard | null>(null);
    const [recentArticles, setRecentArticles] = useState<NewsArticle[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [d, articles] = await Promise.all([newsService.getDashboard(), newsService.getArticles(undefined, {})]);
            setDashboard(d);
            setRecentArticles(articles.slice(0, 8));
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    if (loading || !dashboard) return <CMSLayout title="News Intelligence"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;
    const s = dashboard.sentiment;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6']}>News Intelligence</AuroraText>}
            subTitle={<DecryptedText text="Media monitoring, sentiment analysis & competitive intelligence" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="r" icon={<ReloadOutlined />} onClick={load}>Refresh</Button>]}
        >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <BentoGrid className="max-w-full">
                    <BentoGridItem
                        title="Total Articles"
                        description="Indexed across all sources"
                        icon={<FileSearchOutlined style={{ color: '#3b82f6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{dashboard.totalArticles.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Active Sources"
                        description="Tracked media outlets"
                        icon={<GlobalOutlined style={{ color: '#10b981' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-emerald-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{dashboard.activeSources.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Active Crawlers"
                        description="Automated scrapers"
                        icon={<RobotOutlined style={{ color: '#f59e0b' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>{dashboard.activeCrawlers.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Social Accounts"
                        description="Connected API integrations"
                        icon={<ShareAltOutlined style={{ color: '#8b5cf6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-purple-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{dashboard.connectedAccounts.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Total Reach"
                        description="Estimated audience footprint"
                        icon={<RiseOutlined style={{ color: '#06b6d4' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-cyan-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#06b6d4' }}>{dashboard.totalReach.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Active Alerts"
                        description="Real-time notifications"
                        icon={<AlertOutlined style={{ color: '#ef4444' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-red-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{dashboard.activeAlerts.toLocaleString()}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                </BentoGrid>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card size="small" style={{ ...glass, height: '100%' }} title={<><SmileOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Sentiment Overview</Text></>}>
                                <SentimentDonut pos={s.positive} neg={s.negative} neu={s.neutral} />
                                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: `${s.avgScore >= 0 ? '#10b98110' : '#ef444410'}`, border: `1px solid ${s.avgScore >= 0 ? '#10b98130' : '#ef444430'}` }}>
                                    <Text style={{ fontSize: 12 }}>Average Score: <strong style={{ color: s.avgScore >= 0 ? '#10b981' : '#ef4444' }}>{s.avgScore > 0 ? '+' : ''}{s.avgScore}</strong></Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} md={14}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                            <Card size="small" style={{ ...glass, height: '100%' }} title={<><FileSearchOutlined style={{ color: '#3b82f6' }} /> <Text strong style={{ fontSize: 13 }}>Recent Articles</Text> <Badge count={recentArticles.length} style={{ backgroundColor: themeColor }} /></>}>
                                {recentArticles.length === 0 ? <Empty description="No articles yet — set up sources or run a crawler" /> : (
                                    <List size="small" dataSource={recentArticles} renderItem={(a, i) => (
                                        <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.04 }}>
                                            <List.Item style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sentColors[a.sentimentLabel] || '#94a3b8', flexShrink: 0 }} />
                                                        <Text strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</Text>
                                                    </div>
                                                    <Text type="secondary" style={{ fontSize: 10, marginLeft: 12 }}>{a.author || 'Unknown'} · {a.publishedAt ? dayjs(a.publishedAt).fromNow() : '—'}</Text>
                                                </div>
                                                <Tag color={sentColors[a.sentimentLabel]} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{a.sentimentLabel}</Tag>
                                            </List.Item>
                                        </motion.div>
                                    )} />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
