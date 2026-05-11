'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Spin, Empty, Input, Select, Drawer, message, Tooltip, Badge, Row, Col, Statistic, Modal, Form } from 'antd';
import { FileSearchOutlined, BookOutlined, StarOutlined, StarFilled, EyeOutlined, PlusOutlined, LinkOutlined, ReloadOutlined, FileExcelOutlined, FilePdfOutlined, SmileOutlined, FrownOutlined, MehOutlined, SearchOutlined } from '@ant-design/icons';
import { newsService, NewsArticle } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const sentColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8', mixed: '#f59e0b' };
const sentIcons: Record<string, React.ReactNode> = { positive: <SmileOutlined />, negative: <FrownOutlined />, neutral: <MehOutlined /> };

export default function NewsFeedPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | undefined>();
    const [filterSentiment, setFilterSentiment] = useState<string | undefined>();
    const [selected, setSelected] = useState<NewsArticle | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => { setLoading(true); try { setArticles(await newsService.getArticles(undefined, { search: search || undefined, category: filterCategory, sentiment: filterSentiment })); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, [search, filterCategory, filterSentiment]);
    useEffect(() => { load(); }, [load]);

    const addArticle = async () => { try { const v = await form.validateFields(); await newsService.createArticle(undefined, v); message.success('Article added'); setAddModal(false); form.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };

    const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];
    const posCount = articles.filter(a => a.sentimentLabel === 'positive').length;
    const negCount = articles.filter(a => a.sentimentLabel === 'negative').length;
    const neuCount = articles.filter(a => a.sentimentLabel === 'neutral').length;

    const cols: any[] = [
        { title: 'Article', key: 'title', render: (_: any, r: NewsArticle) => (<div style={{ maxWidth: 400 }}><Text strong style={{ fontSize: 13 }}>{r.title}</Text>{r.author && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.author}</Text></>}{r.publishedAt && <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>{dayjs(r.publishedAt).fromNow()}</Text>}</div>) },
        { title: 'Category', dataIndex: 'category', width: 110, render: (v: string) => <Tag>{v || 'general'}</Tag> },
        { title: 'Sentiment', key: 'sent', width: 120, render: (_: any, r: NewsArticle) => (<Space><span style={{ color: sentColors[r.sentimentLabel] }}>{sentIcons[r.sentimentLabel]}</span><Tag color={sentColors[r.sentimentLabel]} style={{ borderRadius: 8 }}>{r.sentimentLabel}</Tag></Space>), filters: [{ text: 'Positive', value: 'positive' }, { text: 'Negative', value: 'negative' }, { text: 'Neutral', value: 'neutral' }], onFilter: (v: any, r: NewsArticle) => r.sentimentLabel === v },
        { title: 'Score', dataIndex: 'sentimentScore', width: 80, align: 'center' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace', fontSize: 12, color: v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#94a3b8' }}>{v > 0 ? '+' : ''}{v}</Text>, sorter: (a: NewsArticle, b: NewsArticle) => a.sentimentScore - b.sentimentScore },
        { title: '', key: 'a', width: 60, render: (_: any, r: NewsArticle) => (<Space><Tooltip title="Preview"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)} /></Tooltip>{r.url && <Tooltip title="Open source"><a href={r.url} target="_blank" rel="noopener"><LinkOutlined /></a></Tooltip>}</Space>) },
    ];

    const expData = articles.map(a => ({ title: a.title, author: a.author || '', category: a.category || '', sentiment: a.sentimentLabel, score: a.sentimentScore, published: a.publishedAt ? dayjs(a.publishedAt).format('YYYY-MM-DD') : '' }));

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#06b6d4']}>News Feed</AuroraText>} subTitle={<DecryptedText text="Aggregated news from all sources with sentiment scoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>Add Article</Button>,
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'news_feed', title: 'News Feed', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Author', key: 'author' }, { header: 'Category', key: 'category' }, { header: 'Sentiment', key: 'sentiment' }, { header: 'Score', key: 'score' }], data: expData })} /></Tooltip><Tooltip title="PDF"><Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({ fileName: 'news_feed', title: 'News Feed', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Category', key: 'category' }, { header: 'Sentiment', key: 'sentiment' }, { header: 'Score', key: 'score' }], data: expData })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total', v: articles.length, c: '#3b82f6' }, { t: 'Positive', v: posCount, c: '#10b981' }, { t: 'Negative', v: negCount, c: '#ef4444' }, { t: 'Neutral', v: neuCount, c: '#94a3b8' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass}>
                    <Space wrap>
                        <Input.Search placeholder="Search articles..." style={{ width: 260 }} allowClear value={search} onChange={e => setSearch(e.target.value)} onSearch={load} prefix={<SearchOutlined />} />
                        <Select placeholder="Category" allowClear style={{ width: 150 }} value={filterCategory} onChange={v => { setFilterCategory(v); }} options={categories.map(c => ({ label: c, value: c }))} />
                        <Select placeholder="Sentiment" allowClear style={{ width: 140 }} value={filterSentiment} onChange={v => { setFilterSentiment(v); }} options={[{ label: '😊 Positive', value: 'positive' }, { label: '😞 Negative', value: 'negative' }, { label: '😐 Neutral', value: 'neutral' }]} />
                    </Space>
                </Card>

                <Card style={glass}>
                    {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div> : articles.length === 0 ? <Empty description="No articles found" /> :
                        <Table columns={cols} dataSource={articles.map(a => ({ ...a, key: a.id }))} size="middle" scroll={{ x: 800 }} pagination={{ pageSize: 20, showTotal: t => `${t} articles` }} />
                    }
                </Card>
            </motion.div>

            <Drawer title={selected?.title} open={!!selected} onClose={() => setSelected(null)} width={520}>
                {selected && (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Space><Tag color={sentColors[selected.sentimentLabel]}>{selected.sentimentLabel}</Tag><Text type="secondary">{selected.author}</Text><Text type="secondary">{selected.publishedAt ? dayjs(selected.publishedAt).format('DD MMM YYYY') : ''}</Text></Space>
                    {selected.summary && <Card size="small" style={{ background: '#f8fafc' }}><Paragraph style={{ fontSize: 13 }}>{selected.summary}</Paragraph></Card>}
                    {selected.content && <Paragraph style={{ fontSize: 13 }}>{selected.content}</Paragraph>}
                    {selected.url && <a href={selected.url} target="_blank" rel="noopener"><Button icon={<LinkOutlined />} block>Open Source</Button></a>}
                    {selected.keywords && (selected.keywords as string[]).length > 0 && <div><Text type="secondary" style={{ fontSize: 11 }}>Keywords:</Text><br />{(selected.keywords as string[]).map((k, i) => <Tag key={i} style={{ fontSize: 10, marginTop: 4 }}>{k}</Tag>)}</div>}
                </div>)}
            </Drawer>

            <Modal title="Add Article" open={addModal} onOk={addArticle} onCancel={() => setAddModal(false)} okText="Add">
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="Article title" /></Form.Item>
                    <Form.Item name="url" label="URL"><Input placeholder="https://..." /></Form.Item>
                    <Form.Item name="author" label="Author"><Input placeholder="Author name" /></Form.Item>
                    <Form.Item name="summary" label="Summary"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="category" label="Category" initialValue="general"><Select options={[{ label: 'General', value: 'general' }, { label: 'Technology', value: 'technology' }, { label: 'Finance', value: 'finance' }, { label: 'Industry', value: 'industry' }, { label: 'Crawled', value: 'crawled' }]} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
