'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Spin, Empty, Modal, Form, Input, Select, InputNumber, Statistic, message, Tooltip, Badge, Row, Col, Popconfirm, Drawer, List } from 'antd';
import { RobotOutlined, PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, HistoryOutlined, ReloadOutlined, GlobalOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ThunderboltOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { newsService, NewsCrawlJob, NewsCrawlHistory } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const statusColors: Record<string, string> = { active: 'green', paused: 'orange', error: 'red', completed: 'blue' };

export default function WebCrawlerPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<NewsCrawlJob[]>([]);
    const [addModal, setAddModal] = useState(false);
    const [historyDrawer, setHistoryDrawer] = useState<string | null>(null);
    const [history, setHistory] = useState<NewsCrawlHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [form] = Form.useForm();
    const [running, setRunning] = useState<Set<string>>(new Set());

    const load = useCallback(async () => { setLoading(true); try { setJobs(await newsService.getCrawlJobs()); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const addJob = async () => { try { const v = await form.validateFields(); await newsService.createCrawlJob(undefined, { name: v.name, jobType: v.jobType || 'rss', targetUrl: v.targetUrl, schedule: v.schedule, selectors: v.selectors ? JSON.parse(v.selectors) : {}, maxDepth: v.maxDepth || 1 }); message.success('Crawler created'); setAddModal(false); form.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const runJob = async (id: string) => { setRunning(p => new Set(p).add(id)); try { await newsService.executeCrawl(id); message.success('Crawl completed'); load(); } catch (e: any) { message.error(e.message); } finally { setRunning(p => { const n = new Set(p); n.delete(id); return n; }); } };
    const togglePause = async (id: string, current: string) => { try { await newsService.updateCrawlJob(id, { status: current === 'active' ? 'paused' : 'active' }); load(); } catch (e: any) { message.error(e.message); } };
    const delJob = async (id: string) => { try { await newsService.deleteCrawlJob(id); message.success('Deleted'); load(); } catch (e: any) { message.error(e.message); } };
    const showHistory = async (id: string) => { setHistoryDrawer(id); setHistoryLoading(true); try { setHistory(await newsService.getCrawlHistory(id)); } catch {} finally { setHistoryLoading(false); } };

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const totalPages = jobs.reduce((s, j) => s + (j.totalPagesCrawled || 0), 0);
    const totalArticles = jobs.reduce((s, j) => s + (j.totalArticlesExtracted || 0), 0);

    const cols: any[] = [
        { title: 'Name', key: 'name', render: (_: any, r: NewsCrawlJob) => (<div><Text strong style={{ fontSize: 13 }}>{r.name}</Text><br /><Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{r.targetUrl?.slice(0, 50)}{(r.targetUrl?.length || 0) > 50 ? '...' : ''}</Text></div>) },
        { title: 'Type', dataIndex: 'jobType', width: 80, render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag> },
        { title: 'Pages', dataIndex: 'totalPagesCrawled', width: 70, align: 'center' as const },
        { title: 'Articles', dataIndex: 'totalArticlesExtracted', width: 80, align: 'center' as const },
        { title: 'Last Run', key: 'lr', width: 140, render: (_: any, r: NewsCrawlJob) => r.lastRunAt ? <Text style={{ fontSize: 11 }}>{dayjs(r.lastRunAt).format('DD MMM HH:mm')}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>Never</Text> },
        { title: 'Actions', key: 'a', width: 160, render: (_: any, r: NewsCrawlJob) => (<Space size={4}>
            <Tooltip title="Run now"><Button type="text" size="small" icon={<ThunderboltOutlined />} loading={running.has(r.id)} onClick={() => runJob(r.id)} style={{ color: '#10b981' }} /></Tooltip>
            <Tooltip title={r.status === 'active' ? 'Pause' : 'Resume'}><Button type="text" size="small" icon={r.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => togglePause(r.id, r.status)} /></Tooltip>
            <Tooltip title="History"><Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => showHistory(r.id)} /></Tooltip>
            <Popconfirm title="Delete?" onConfirm={() => delJob(r.id)}><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Popconfirm>
        </Space>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981']}>Web Crawler</AuroraText>} subTitle={<DecryptedText text="Configure web scrapers and RSS feeds for automated content ingestion" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>New Crawler</Button>,
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'crawlers', title: 'Web Crawlers', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'URL', key: 'targetUrl' }, { header: 'Type', key: 'jobType' }, { header: 'Status', key: 'status' }, { header: 'Pages', key: 'totalPagesCrawled' }, { header: 'Articles', key: 'totalArticlesExtracted' }], data: jobs })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Jobs', v: totalJobs, c: '#3b82f6' }, { t: 'Active', v: activeJobs, c: '#10b981' }, { t: 'Pages Crawled', v: totalPages, c: '#f59e0b' }, { t: 'Articles Found', v: totalArticles, c: '#8b5cf6' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card style={glass}>
                    {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div> : jobs.length === 0 ? <Empty description="No crawlers configured yet" /> :
                        <Table columns={cols} dataSource={jobs.map(j => ({ ...j, key: j.id }))} size="middle" scroll={{ x: 800 }} pagination={{ pageSize: 20 }} />
                    }
                </Card>
            </motion.div>

            <Modal title="New Crawler" open={addModal} onOk={addJob} onCancel={() => setAddModal(false)} okText="Create" width={520}>
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="Tech News RSS" /></Form.Item>
                    <Form.Item name="targetUrl" label="Target URL" rules={[{ required: true }]}><Input placeholder="https://example.com/rss.xml" /></Form.Item>
                    <Row gutter={12}><Col span={12}><Form.Item name="jobType" label="Type" initialValue="rss"><Select options={[{ label: 'RSS Feed', value: 'rss' }, { label: 'Web Page', value: 'web' }, { label: 'Sitemap', value: 'sitemap' }, { label: 'API', value: 'api' }]} /></Form.Item></Col><Col span={12}><Form.Item name="maxDepth" label="Max Depth" initialValue={1}><InputNumber min={1} max={5} style={{ width: '100%' }} /></Form.Item></Col></Row>
                    <Form.Item name="schedule" label="Schedule (cron)" initialValue="0 */6 * * *"><Input placeholder="0 */6 * * *" /></Form.Item>
                    <Form.Item name="selectors" label="CSS Selectors (JSON, optional)"><Input.TextArea rows={3} placeholder='{"title":"h1","content":".article-body"}' /></Form.Item>
                </Form>
            </Modal>

            <Drawer title="Crawl History" open={!!historyDrawer} onClose={() => setHistoryDrawer(null)} width={420}>
                {historyLoading ? <Spin /> : history.length === 0 ? <Empty description="No crawl history" /> :
                    <List size="small" dataSource={history} renderItem={(h, i) => (
                        <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                            <List.Item>
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Tag color={h.status === 'completed' ? 'green' : h.status === 'failed' ? 'red' : 'blue'}>{h.status}</Tag>
                                        <Text style={{ fontSize: 11 }}>{h.startedAt ? dayjs(h.startedAt).format('DD MMM HH:mm') : ''}</Text>
                                    </div>
                                    <Space style={{ marginTop: 4, fontSize: 11 }} split="·">
                                        <Text type="secondary">Pages: {h.pagesCrawled}</Text>
                                        <Text type="secondary">Found: {h.articlesFound}</Text>
                                        <Text type="secondary">New: {h.articlesNew}</Text>
                                        <Text type="secondary">{h.durationMs}ms</Text>
                                    </Space>
                                </div>
                            </List.Item>
                        </motion.div>
                    )} />
                }
            </Drawer>
        </CMSLayout>
    );
}
