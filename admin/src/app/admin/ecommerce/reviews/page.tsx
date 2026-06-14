"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Typography, Input, Space, Button, Tag, Row, Col, Segmented, Table, message, Select, Tooltip, theme } from "antd";
import { StarOutlined, SearchOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, FlagOutlined, LikeOutlined, WarningOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { supaRest, supaUpdate } from "@/lib/supaRest";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Review {
    id: string; product_id: string; product_name: string; customer_id: string;
    customer_name: string; customer_email: string; rating: number; title: string;
    content: string; status: string; is_verified_purchase: boolean; helpful_count: number;
    report_count: number; admin_response: string; created_at: string; updated_at: string;
}

const RATING_COLORS: Record<number, string> = { 5: '#22c55e', 4: '#84cc16', 3: '#eab308', 2: '#f97316', 1: '#ef4444' };
const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Flagged'];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Rating' }, { value: 'lowest', label: 'Lowest Rating' },
    { value: 'reported', label: 'Most Reported' },
];

const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
            <span key={i} style={{ color: i <= rating ? RATING_COLORS[rating] || '#eab308' : '#d1d5db' }}>★</span>
        ))}
    </span>
);

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [search, setSearch] = useState('');
    const [productFilter, setProductFilter] = useState<string | undefined>();
    const [ratingFilter, setRatingFilter] = useState<number[]>([]);
    const [visibleCount, setVisibleCount] = useState(10);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
    const [replyLoading, setReplyLoading] = useState<string | null>(null);
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await supaRest<Review[]>('ecommerce_reviews', { order: 'created_at.desc' });
            setReviews(data);
        } catch (e) { console.error(e); message.error('Failed to load reviews'); }
        finally { setLoading(false); }
    };

    const handleStatus = async (id: string, status: string) => {
        try {
            await supaUpdate('ecommerce_reviews', id, { status, updated_at: new Date().toISOString() });
            message.success(`Review ${status}`);
            setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch { message.error('Failed to update'); }
    };

    const handleReply = async (id: string) => {
        const text = replyInputs[id]?.trim();
        if (!text) return;
        setReplyLoading(id);
        try {
            await supaUpdate('ecommerce_reviews', id, { admin_response: text, updated_at: new Date().toISOString() });
            message.success('Reply sent');
            setReviews(prev => prev.map(r => r.id === id ? { ...r, admin_response: text } : r));
            setReplyInputs(prev => ({ ...prev, [id]: '' }));
        } catch { message.error('Failed to reply'); }
        finally { setReplyLoading(null); }
    };

    // === Stats ===
    const stats = useMemo(() => {
        const total = reviews.length;
        const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
        const pending = reviews.filter(r => r.status === 'pending').length;
        const approved = reviews.filter(r => r.status === 'approved').length;
        const rejected = reviews.filter(r => r.status === 'rejected').length;
        return { total, avg, pending, approved, rejected };
    }, [reviews]);

    // === Rating distribution ===
    const ratingDist = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
        const total = reviews.length || 1;
        return [5, 4, 3, 2, 1].map(star => ({ star, count: counts[star - 1], pct: Math.round((counts[star - 1] / total) * 100) }));
    }, [reviews]);

    // === Rating trend (12 months) ===
    const trendData = useMemo(() => {
        const map: Record<string, { sum: number; cnt: number }> = {};
        reviews.forEach(r => {
            if (!r.created_at) return;
            const d = new Date(r.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map[key]) map[key] = { sum: 0, cnt: 0 };
            map[key].sum += r.rating; map[key].cnt++;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
            .map(([month, { sum, cnt }]) => ({ month, avg: +(sum / cnt).toFixed(2) }));
    }, [reviews]);

    // === Top reviewed products ===
    const topProducts = useMemo(() => {
        const map: Record<string, { name: string; count: number; sum: number; positive: number; latest: string }> = {};
        reviews.forEach(r => {
            const k = r.product_id || r.product_name;
            if (!map[k]) map[k] = { name: r.product_name, count: 0, sum: 0, positive: 0, latest: '' };
            map[k].count++; map[k].sum += r.rating;
            if (r.rating >= 4) map[k].positive++;
            if (!map[k].latest || r.created_at > map[k].latest) map[k].latest = r.created_at;
        });
        return Object.entries(map).map(([id, v]) => ({ id, ...v, avg: +(v.sum / v.count).toFixed(1), positivePct: Math.round((v.positive / v.count) * 100) }))
            .sort((a, b) => b.count - a.count).slice(0, 10);
    }, [reviews]);

    // === Sentiment ===
    const sentiment = useMemo(() => {
        const pos = reviews.filter(r => r.rating >= 4).length;
        const neu = reviews.filter(r => r.rating === 3).length;
        const neg = reviews.filter(r => r.rating <= 2).length;
        const t = reviews.length || 1;
        return { pos, neu, neg, posPct: Math.round((pos / t) * 100), neuPct: Math.round((neu / t) * 100), negPct: Math.round((neg / t) * 100) };
    }, [reviews]);

    // === Filtered reviews ===
    const productOptions = useMemo(() => {
        const set = new Map<string, string>();
        reviews.forEach(r => set.set(r.product_id || r.product_name, r.product_name));
        return Array.from(set.entries()).map(([v, l]) => ({ value: v, label: l }));
    }, [reviews]);

    const filtered = useMemo(() => {
        let list = [...reviews];
        if (statusTab !== 'All') list = list.filter(r => r.status === statusTab.toLowerCase());
        if (productFilter) list = list.filter(r => (r.product_id || r.product_name) === productFilter);
        if (ratingFilter.length) list = list.filter(r => ratingFilter.includes(r.rating));
        if (search) list = list.filter(r => r.content?.toLowerCase().includes(search.toLowerCase()) || r.title?.toLowerCase().includes(search.toLowerCase()) || r.customer_name?.toLowerCase().includes(search.toLowerCase()));
        switch (sortBy) {
            case 'oldest': list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')); break;
            case 'highest': list.sort((a, b) => b.rating - a.rating); break;
            case 'lowest': list.sort((a, b) => a.rating - b.rating); break;
            case 'reported': list.sort((a, b) => (b.report_count || 0) - (a.report_count || 0)); break;
            default: list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        }
        return list;
    }, [reviews, statusTab, productFilter, ratingFilter, search, sortBy]);

    const kpiCards = [
        { title: 'Total Reviews', value: stats.total, icon: <StarOutlined />, color: themeColor },
        { title: 'Avg Rating', value: stats.avg.toFixed(1), icon: <Stars rating={Math.round(stats.avg)} size={12} />, color: '#eab308', extra: <Stars rating={Math.round(stats.avg)} size={11} /> },
        { title: 'Pending', value: stats.pending, icon: <WarningOutlined />, color: '#f97316' },
        { title: 'Approved', value: stats.approved, icon: <CheckCircleOutlined />, color: '#22c55e' },
        { title: 'Rejected', value: stats.rejected, icon: <CloseCircleOutlined />, color: '#ef4444' },
    ];

    const borderForStatus = (s: string) => s === 'approved' ? '2px solid rgba(34,197,94,0.35)' : s === 'flagged' ? '2px solid #f97316' : s === 'rejected' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.45)';

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#eab308', '#f97316', '#22c55e']}>Reviews & Ratings</AuroraText>}
            subTitle={<DecryptedText text="Product review moderation & analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* KPI Cards */}
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4} lg={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={glass}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>{s.icon}</div>
                                        <div>
                                            <Text type="secondary" className="text-xs block">{s.title}</Text>
                                            <Text strong className="text-lg">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</Text>
                                            {s.extra && <div style={{ marginTop: -2 }}>{s.extra}</div>}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Rating Distribution + Sentiment + Trend */}
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>⭐ Rating Distribution</Text>}>
                            <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                <Text strong style={{ fontSize: 28, color: RATING_COLORS[Math.round(stats.avg)] || '#eab308' }}>{stats.avg.toFixed(1)}</Text>
                                <div><Stars rating={Math.round(stats.avg)} size={18} /></div>
                                <Text type="secondary" style={{ fontSize: 11 }}>{stats.total} reviews</Text>
                            </div>
                            {ratingDist.map(d => (
                                <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, width: 28 }}>{d.star}★</Text>
                                    <div style={{ flex: 1, height: 10, background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${d.pct}%` }} transition={{ delay: 0.2, duration: 0.6 }}
                                            style={{ height: '100%', background: RATING_COLORS[d.star], borderRadius: 5 }} />
                                    </div>
                                    <Text style={{ fontSize: 11, width: 50, textAlign: 'right' }}>{d.count} ({d.pct}%)</Text>
                                </div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>💬 Sentiment Summary</Text>}>
                            <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', marginBottom: 12 }}>
                                {sentiment.posPct > 0 && <div style={{ width: `${sentiment.posPct}%`, background: '#22c55e' }} />}
                                {sentiment.neuPct > 0 && <div style={{ width: `${sentiment.neuPct}%`, background: '#eab308' }} />}
                                {sentiment.negPct > 0 && <div style={{ width: `${sentiment.negPct}%`, background: '#ef4444' }} />}
                            </div>
                            {[
                                { label: 'Positive (4-5★)', value: sentiment.pos, pct: sentiment.posPct, color: '#22c55e' },
                                { label: 'Neutral (3★)', value: sentiment.neu, pct: sentiment.neuPct, color: '#eab308' },
                                { label: 'Negative (1-2★)', value: sentiment.neg, pct: sentiment.negPct, color: '#ef4444' },
                            ].map(s => (
                                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                                        <Text style={{ fontSize: 12 }}>{s.label}</Text>
                                    </div>
                                    <Text strong style={{ fontSize: 12, color: s.color }}>{s.value} ({s.pct}%)</Text>
                                </div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>📈 Rating Trend</Text>}>
                            {trendData.length >= 2 ? (
                                <ResponsiveContainer width="100%" height={150}>
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                                        <RTooltip />
                                        <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 10, fill: '#f59e0b' }} />
                                        <Line type="monotone" dataKey="avg" stroke={themeColor} strokeWidth={2} dot={{ fill: themeColor, r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <Text type="secondary" style={{ fontSize: 12 }}>Not enough data for trend</Text>}
                        </Card>
                    </Col>
                </Row>

                {/* Top Reviewed Products */}
                <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>🏆 Top Reviewed Products</Text>}>
                    <Table dataSource={topProducts} rowKey="id" size="small" pagination={false} scroll={{ x: 600 }}
                        onRow={r => ({ onClick: () => setProductFilter(r.id), style: { cursor: 'pointer' } })}
                        columns={[
                            { title: 'Product', dataIndex: 'name', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v || '—'}</Text> },
                            { title: 'Reviews', dataIndex: 'count', width: 80, sorter: (a: any, b: any) => a.count - b.count },
                            { title: 'Avg Rating', dataIndex: 'avg', width: 120, render: (v: number) => <><Stars rating={Math.round(v)} size={12} /> <Text style={{ fontSize: 11 }}>{v}</Text></> },
                            { title: 'Positive %', dataIndex: 'positivePct', width: 100, render: (v: number) => <Tag color={v >= 70 ? 'green' : v >= 40 ? 'orange' : 'red'} className="rounded-full text-xs">{v}%</Tag> },
                            { title: 'Latest', dataIndex: 'latest', width: 100, render: (v: string) => <Text className="text-xs">{v ? new Date(v).toLocaleDateString() : '—'}</Text> },
                        ]}
                    />
                </Card>

                {/* Moderation Queue */}
                <Card size="small" style={{ ...glass, borderRadius: 12 }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Segmented options={STATUS_TABS} value={statusTab} onChange={v => { setStatusTab(v as string); setVisibleCount(10); }} size="small" />
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search reviews..." value={search}
                                onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 200, borderRadius: 8 }} size="small" />
                        </div>
                        <Space>
                            <Select placeholder="Product" allowClear value={productFilter} onChange={setProductFilter}
                                showSearch filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                                options={productOptions} style={{ minWidth: 150 }} size="small" />
                            <Select placeholder="Rating" allowClear mode="multiple" value={ratingFilter} onChange={setRatingFilter}
                                options={[5, 4, 3, 2, 1].map(r => ({ value: r, label: `${r}★` }))} style={{ minWidth: 100 }} size="small" />
                            <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} style={{ width: 140 }} size="small" />
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} size="small" /></Tooltip>
                        </Space>
                    </div>

                    <Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>{filtered.length} review{filtered.length !== 1 ? 's' : ''}</Text>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <AnimatePresence>
                            {filtered.slice(0, visibleCount).map((r, i) => {
                                const isExpanded = expanded.has(r.id);
                                const contentShort = r.content?.length > 180 && !isExpanded;
                                return (
                                    <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                                        <Card size="small" style={{
                                            ...glass, borderLeft: `4px solid ${RATING_COLORS[r.rating] || '#d1d5db'}`,
                                            border: borderForStatus(r.status),
                                            borderLeftWidth: 4, borderLeftColor: RATING_COLORS[r.rating] || '#d1d5db',
                                            opacity: r.status === 'rejected' ? 0.6 : 1,
                                            boxShadow: r.status === 'approved' ? `0 0 12px ${RATING_COLORS[r.rating]}15` : undefined,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1, minWidth: 200 }}>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Text strong style={{ fontSize: 13 }}>{r.customer_name || 'Anonymous'}</Text>
                                                        {r.is_verified_purchase && <Tag color="blue" className="rounded-full text-xs" icon={<SafetyCertificateOutlined />}>Verified</Tag>}
                                                        <Stars rating={r.rating} size={13} />
                                                        <Tag className="rounded-full text-xs" style={{ margin: 0 }}>{r.product_name}</Tag>
                                                    </div>
                                                    {r.title && <Text strong style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{r.title}</Text>}
                                                    <Text style={{ fontSize: 12, display: 'block', marginTop: 2, lineHeight: 1.5 }}>
                                                        {contentShort ? r.content.slice(0, 180) + '...' : r.content}
                                                        {r.content?.length > 180 && (
                                                            <Button type="link" size="small" style={{ padding: '0 4px', fontSize: 11 }}
                                                                onClick={() => setExpanded(prev => { const n = new Set(prev); isExpanded ? n.delete(r.id) : n.add(r.id); return n; })}>
                                                                {isExpanded ? 'Show less' : 'Read more'}
                                                            </Button>
                                                        )}
                                                    </Text>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <Text type="secondary" style={{ fontSize: 10 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</Text>
                                                        {(r.helpful_count || 0) > 0 && <Text type="secondary" style={{ fontSize: 10 }}><LikeOutlined /> {r.helpful_count}</Text>}
                                                        {(r.report_count || 0) > 0 && <Text type="secondary" style={{ fontSize: 10, color: '#f97316' }}><FlagOutlined /> {r.report_count}</Text>}
                                                        <Tag color={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : r.status === 'flagged' ? 'orange' : 'default'} className="rounded-full text-xs capitalize">{r.status}</Tag>
                                                    </div>
                                                </div>
                                                <Space size={4} wrap>
                                                    {r.status !== 'approved' && <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatus(r.id, 'approved')}
                                                        style={{ background: '#22c55e', border: 'none', fontSize: 11, borderRadius: 6 }}>Approve</Button>}
                                                    {r.status !== 'rejected' && <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleStatus(r.id, 'rejected')}
                                                        style={{ fontSize: 11, borderRadius: 6 }}>Reject</Button>}
                                                    {r.status !== 'flagged' && <Button size="small" icon={<FlagOutlined />} onClick={() => handleStatus(r.id, 'flagged')}
                                                        style={{ color: '#f97316', borderColor: '#f97316', fontSize: 11, borderRadius: 6 }}>Flag</Button>}
                                                </Space>
                                            </div>
                                            {/* Admin response */}
                                            {r.admin_response && (
                                                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff', borderLeft: '3px solid #3b82f6' }}>
                                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Admin Response</Text>
                                                    <Text style={{ fontSize: 12 }}>{r.admin_response}</Text>
                                                </div>
                                            )}
                                            {!r.admin_response && (
                                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                    <Input size="small" placeholder="Write admin response..." value={replyInputs[r.id] || ''}
                                                        onChange={e => setReplyInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                                        onPressEnter={() => handleReply(r.id)} style={{ borderRadius: 6, flex: 1 }} />
                                                    <Button size="small" type="primary" loading={replyLoading === r.id} onClick={() => handleReply(r.id)}
                                                        disabled={!replyInputs[r.id]?.trim()} style={{ borderRadius: 6, fontSize: 11 }}>Reply</Button>
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {visibleCount < filtered.length && (
                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                            <Button onClick={() => setVisibleCount(prev => prev + 10)} style={{ borderRadius: 8 }}>
                                Load More ({filtered.length - visibleCount} remaining)
                            </Button>
                        </div>
                    )}
                    {filtered.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Text type="secondary">No reviews found</Text>
                        </div>
                    )}
                </Card>
            </div>
        </CMSLayout>
    );
}
