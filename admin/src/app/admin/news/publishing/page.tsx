'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Empty, Table, Statistic, Modal, Form, Input, Select, message, Tooltip, Badge, Popconfirm } from 'antd';
import { EditOutlined, PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, FileExcelOutlined, FilePdfOutlined, ScheduleOutlined } from '@ant-design/icons';
import { newsService, NewsContentDraft, NewsCalendarEntry } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const statusColors: Record<string, string> = { draft: 'default', review: 'blue', approved: 'cyan', scheduled: 'orange', published: 'green', rejected: 'red' };

export default function PublishingPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState<NewsContentDraft[]>([]);
    const [calendar, setCalendar] = useState<NewsCalendarEntry[]>([]);
    const [addModal, setAddModal] = useState(false);
    const [calModal, setCalModal] = useState(false);
    const [form] = Form.useForm();
    const [calForm] = Form.useForm();

    const load = useCallback(async () => { setLoading(true); try { const [d, c] = await Promise.all([newsService.getContentDrafts(), newsService.getContentCalendar()]); setDrafts(d); setCalendar(c); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const addDraft = async () => { try { const v = await form.validateFields(); await newsService.createContentDraft(undefined, v); message.success('Draft created'); setAddModal(false); form.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const addCal = async () => { try { const v = await calForm.validateFields(); await newsService.createCalendarEntry(undefined, { ...v, scheduledDate: v.scheduledDate }); message.success('Added to calendar'); setCalModal(false); calForm.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const updateStatus = async (id: string, status: string) => { try { await newsService.updateContentDraft(id, { status }); message.success(`Status: ${status}`); load(); } catch (e: any) { message.error(e.message); } };
    const delDraft = async (id: string) => { try { await newsService.deleteContentDraft(id); message.success('Deleted'); load(); } catch (e: any) { message.error(e.message); } };

    const total = drafts.length;
    const draftCount = drafts.filter(d => d.status === 'draft').length;
    const published = drafts.filter(d => d.status === 'published').length;
    const scheduled = drafts.filter(d => d.status === 'scheduled').length;

    const cols: any[] = [
        { title: 'Title', key: 'title', render: (_: any, r: NewsContentDraft) => (<div><Text strong style={{ fontSize: 13 }}>{r.title}</Text><br /><Tag style={{ fontSize: 10 }}>{r.contentType}</Tag></div>) },
        { title: 'Channels', key: 'ch', width: 150, render: (_: any, r: NewsContentDraft) => <Space size={4} wrap>{((r.targetChannels as string[]) || []).map((c, i) => <Tag key={i} style={{ fontSize: 10 }}>{c}</Tag>)}</Space> },
        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={statusColors[v]}>{v}</Tag>, filters: Object.keys(statusColors).map(s => ({ text: s, value: s })), onFilter: (v: any, r: any) => r.status === v },
        { title: 'Created', key: 'c', width: 130, render: (_: any, r: NewsContentDraft) => <Text style={{ fontSize: 11 }}>{r.createdAt ? dayjs(r.createdAt).format('DD MMM HH:mm') : '—'}</Text> },
        { title: 'Actions', key: 'a', width: 180, render: (_: any, r: NewsContentDraft) => (<Space size={4}>
            {r.status === 'draft' && <Tooltip title="Submit for Review"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => updateStatus(r.id, 'review')} /></Tooltip>}
            {r.status === 'review' && <><Tooltip title="Approve"><Button type="text" size="small" icon={<CheckCircleOutlined />} style={{ color: '#10b981' }} onClick={() => updateStatus(r.id, 'approved')} /></Tooltip><Tooltip title="Reject"><Button type="text" size="small" icon={<CloseCircleOutlined />} danger onClick={() => updateStatus(r.id, 'rejected')} /></Tooltip></>}
            {r.status === 'approved' && <Tooltip title="Publish"><Button type="text" size="small" icon={<SendOutlined />} style={{ color: '#3b82f6' }} onClick={() => updateStatus(r.id, 'published')} /></Tooltip>}
            <Popconfirm title="Delete?" onConfirm={() => delDraft(r.id)}><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Popconfirm>
        </Space>) },
    ];

    // Calendar grid (simple month view)
    const today = dayjs();
    const daysInMonth = today.daysInMonth();
    const calDays = Array.from({ length: daysInMonth }, (_, i) => {
        const d = today.startOf('month').add(i, 'day');
        const items = calendar.filter(c => c.scheduledDate === d.format('YYYY-MM-DD'));
        return { date: d, items };
    });

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#8b5cf6', '#3b82f6']}>Content Publishing</AuroraText>} subTitle={<DecryptedText text="Create, review, schedule & publish content across channels" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>New Draft</Button>,
            <Button key="cal" icon={<CalendarOutlined />} onClick={() => { calForm.resetFields(); setCalModal(true); }}>Schedule</Button>,
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
            <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({ fileName: 'content_publishing', title: 'Content Publishing', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Type', key: 'contentType' }, { header: 'Status', key: 'status' }], data: drafts })} /></Tooltip></RbacGuard>,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total', v: total, c: '#3b82f6' }, { t: 'Drafts', v: draftCount, c: '#94a3b8' }, { t: 'Published', v: published, c: '#10b981' }, { t: 'Scheduled', v: scheduled, c: '#f59e0b' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card title={<><CalendarOutlined style={{ color: themeColor }} /> <Text strong>Content Calendar — {today.format('MMMM YYYY')}</Text></>} size="small" style={glass}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94a3b8', padding: 4 }}>{d}</div>)}
                        {Array.from({ length: today.startOf('month').day() }, (_, i) => <div key={`e${i}`} />)}
                        {calDays.map(({ date, items }, i) => (
                            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} style={{ padding: 4, minHeight: 50, borderRadius: 6, background: date.isSame(today, 'day') ? `${themeColor}10` : 'rgba(0,0,0,0.02)', border: date.isSame(today, 'day') ? `1px solid ${themeColor}30` : '1px solid transparent', fontSize: 11 }}>
                                <div style={{ fontWeight: date.isSame(today, 'day') ? 700 : 400, color: date.isSame(today, 'day') ? themeColor : undefined, marginBottom: 2 }}>{date.date()}</div>
                                {items.map((it, j) => <div key={j} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: it.color || '#3b82f6', color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>)}
                            </motion.div>
                        ))}
                    </div>
                </Card>

                <Card style={glass} title={<><EditOutlined style={{ color: themeColor }} /> <Text strong>Content Drafts</Text> <Badge count={total} style={{ backgroundColor: themeColor }} /></>}>
                    {loading ? <Spin /> : drafts.length === 0 ? <Empty description="No content drafts" /> :
                        <Table columns={cols} dataSource={drafts.map(d => ({ ...d, key: d.id }))} size="small" scroll={{ x: 700 }} pagination={{ pageSize: 15 }} />}
                </Card>
            </motion.div>

            <Modal title="New Content Draft" open={addModal} onOk={addDraft} onCancel={() => setAddModal(false)} okText="Create" width={520}>
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="Content title" /></Form.Item>
                    <Form.Item name="body" label="Body"><Input.TextArea rows={4} placeholder="Write content..." /></Form.Item>
                    <Row gutter={12}><Col span={12}><Form.Item name="contentType" label="Type" initialValue="article"><Select options={[{ label: 'Article', value: 'article' }, { label: 'Social Post', value: 'social_post' }, { label: 'Newsletter', value: 'newsletter' }, { label: 'Press Release', value: 'press_release' }]} /></Form.Item></Col><Col span={12}><Form.Item name="targetChannels" label="Channels"><Select mode="multiple" options={[{ label: 'Website', value: 'website' }, { label: 'Twitter/X', value: 'twitter' }, { label: 'Facebook', value: 'facebook' }, { label: 'LinkedIn', value: 'linkedin' }]} /></Form.Item></Col></Row>
                    <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags" /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Schedule Content" open={calModal} onOk={addCal} onCancel={() => setCalModal(false)} okText="Schedule">
                <Form form={calForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="scheduledDate" label="Date" rules={[{ required: true }]}><Input type="date" /></Form.Item>
                    <Form.Item name="channel" label="Channel" rules={[{ required: true }]}><Select options={[{ label: 'Website', value: 'website' }, { label: 'Twitter', value: 'twitter' }, { label: 'Facebook', value: 'facebook' }, { label: 'LinkedIn', value: 'linkedin' }]} /></Form.Item>
                    <Form.Item name="description" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
