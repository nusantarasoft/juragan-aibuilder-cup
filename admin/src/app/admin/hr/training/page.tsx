"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Space, Segmented, Badge, Tooltip, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Switch, message } from "antd";
import { ReadOutlined, BookOutlined, SafetyCertificateOutlined, AppstoreOutlined, UnorderedListOutlined, ClockCircleOutlined, DollarOutlined, CalendarOutlined, PlusOutlined, ThunderboltOutlined, DeleteOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const TR_Q = `query($t:String!){hrTrainingPrograms(tenantId:$t){id name description category durationHours provider cost startDate endDate status isMandatory certificationName createdAt}}`;
const CREATE_M = `mutation($t:String!,$n:String!,$cat:String,$desc:String,$dur:Int,$prov:String,$cost:Float,$sd:String,$ed:String,$mand:Boolean,$cert:String){createHrTrainingProgram(tenantId:$t,name:$n,category:$cat,description:$desc,durationHours:$dur,provider:$prov,cost:$cost,startDate:$sd,endDate:$ed,isMandatory:$mand,certificationName:$cert){id}}`;
const DELETE_M = `mutation($id:String!){deleteHrTrainingProgram(id:$id)}`;

const statusCfg: Record<string, { color: string; label: string; icon: string }> = {
    upcoming: { color: '#3b82f6', label: 'Upcoming', icon: 'ðŸ“…' },
    ongoing: { color: '#f59e0b', label: 'In Progress', icon: 'ðŸ”„' },
    completed: { color: '#10b981', label: 'Completed', icon: 'âœ…' },
    cancelled: { color: '#6b7280', label: 'Cancelled', icon: 'âŒ' },
};
const catCfg: Record<string, { color: string; icon: string; gradient: string }> = {
    technical: { color: '#3b82f6', icon: 'ðŸ’»', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    leadership: { color: '#8b5cf6', icon: 'ðŸ‘‘', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    compliance: { color: '#ef4444', icon: 'ðŸ“‹', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    soft_skills: { color: '#06b6d4', icon: 'ðŸ¤', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
};

function ProgramCard({ program, onDelete }: { program: any; onDelete: (id: string) => void }) {
    const cat = catCfg[program.category] || catCfg.technical;
    const status = statusCfg[program.status] || statusCfg.upcoming;
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);
    let progress = 0;
    if (program.status === 'completed') progress = 100;
    else if (program.status === 'ongoing' && program.startDate && program.endDate) {
        const total = dayjs(program.endDate).diff(dayjs(program.startDate), 'day');
        const elapsed = dayjs().diff(dayjs(program.startDate), 'day');
        progress = Math.min(Math.round((elapsed / (total || 1)) * 100), 99);
    }
    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
            style={{ ...glass, padding: 16, borderRadius: 14, borderTop: `3px solid ${cat.color}`, height: '100%', cursor: 'default', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete program?', onOk: () => onDelete(program.id) })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cat.icon}</div>
                <Space size={4}>
                    {program.isMandatory && <Tag color="red" style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>Required</Tag>}
                    <Tag color={status.color} style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>{status.icon} {status.label}</Tag>
                </Space>
            </div>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{program.name}</Text>
            {program.description && <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8 }} ellipsis>{program.description}</Text>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag color={cat.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{program.category?.replace('_', ' ')}</Tag>
                {program.certificationName && <Tag color="gold" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}><SafetyCertificateOutlined /> {program.certificationName}</Tag>}
            </div>
            {(program.status === 'ongoing' || program.status === 'completed') && <Progress percent={progress} size="small" strokeColor={cat.color} style={{ marginBottom: 8 }} />}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <Space size={8}>
                    <Tooltip title="Duration"><Space size={3}><ClockCircleOutlined style={{ color: '#6b7280' }} /><Text style={{ fontSize: 10 }}>{program.durationHours}h</Text></Space></Tooltip>
                    {program.provider && <Text style={{ fontSize: 10, color: '#6b7280' }}>{program.provider}</Text>}
                </Space>
                {program.cost > 0 ? <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Rp {fmt(program.cost)}</Text> : <Tag color="green" style={{ fontSize: 9, borderRadius: 10, margin: 0 }}>Free</Tag>}
            </div>
            {program.startDate && <div style={{ marginTop: 6 }}><CalendarOutlined style={{ color: '#9ca3af', marginRight: 4, fontSize: 10 }} /><Text style={{ fontSize: 10, color: '#9ca3af' }}>{dayjs(program.startDate).format('MMM D')} â†’ {dayjs(program.endDate).format('MMM D, YYYY')}</Text></div>}
        </motion.div>
    );
}

export default function TrainingPage() {
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<string>('grid');
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    const load = async () => {
        setLoading(true);
        const d = await gql(TR_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrTrainingPrograms: [] }));
        setPrograms(d.hrTrainingPrograms || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async (values: any) => {
        try {
            await gql(CREATE_M, {
                t: DEFAULT_TENANT_ID, n: values.name, cat: values.category, desc: values.description,
                dur: values.durationHours, prov: values.provider, cost: values.cost,
                sd: values.startDate?.format('YYYY-MM-DD'), ed: values.endDate?.format('YYYY-MM-DD'),
                mand: values.isMandatory, cert: values.certificationName,
            });
            message.success('Training program created'); setModalOpen(false); form.resetFields(); load();
        } catch (e: any) { message.error(e.message || 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_M, { id }); message.success('Deleted'); load(); } catch { message.error('Failed'); }
    };

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const completed = programs.filter(p => p.status === 'completed').length;
    const ongoing = programs.filter(p => p.status === 'ongoing').length;
    const mandatory = programs.filter(p => p.isMandatory).length;
    const totalCost = programs.reduce((s, p) => s + (p.cost || 0), 0);
    const totalHours = programs.reduce((s, p) => s + (p.durationHours || 0), 0);

    const catDist = useMemo(() => Object.keys(catCfg).map(c => ({
        name: c.replace('_', ' '), count: programs.filter(p => p.category === c).length, ...catCfg[c],
    })).filter(c => c.count > 0), [programs]);

    const columns = [
        { title: 'Program', key: 'name', render: (_: any, r: any) => <Space>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${(catCfg[r.category] || catCfg.technical).color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{(catCfg[r.category] || catCfg.technical).icon}</div>
            <div><Text strong style={{ fontSize: 13 }}>{r.name}</Text>{r.certificationName && <><br/><Tag color="gold" style={{ borderRadius: 10, fontSize: 9 }}><SafetyCertificateOutlined /> {r.certificationName}</Tag></>}</div>
        </Space> },
        { title: 'Category', dataIndex: 'category', render: (v: string) => <Tag color={(catCfg[v] || catCfg.technical).color} style={{ borderRadius: 10 }}>{v?.replace('_', ' ')}</Tag> },
        { title: 'Provider', dataIndex: 'provider', render: (v: string) => v || 'â€”' },
        { title: 'Duration', dataIndex: 'durationHours', render: (v: number) => <Space size={4}><ClockCircleOutlined style={{ color: '#6b7280' }} /><Text>{v}h</Text></Space>, align: 'center' as const },
        { title: 'Cost', dataIndex: 'cost', render: (v: number) => v > 0 ? <Text style={{ color: '#f59e0b' }}>{fmt(v)}</Text> : <Tag color="green" style={{ borderRadius: 10 }}>Free</Tag>, align: 'right' as const },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={(statusCfg[v] || statusCfg.upcoming).color} style={{ borderRadius: 20 }}>{(statusCfg[v] || statusCfg.upcoming).icon} {(statusCfg[v] || statusCfg.upcoming).label}</Tag> },
        { title: '', key: 'actions', width: 50, render: (_: any, r: any) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete?', onOk: () => handleDelete(r.id) })} /> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Training & Development</AuroraText>}
            subTitle={<DecryptedText text="Training programs, certifications & skill development" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Space key="actions">
                <Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'hr_training', title: 'HR Training', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'trainingType' }, { header: 'Status', key: 'status' }], data: programs })} /></Tooltip>,
                <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'hr_training', title: 'HR Training', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'trainingType' }, { header: 'Status', key: 'status' }], data: programs })} /></Tooltip>,
                <Segmented value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Cards</>, value: 'grid' }, { label: <><UnorderedListOutlined /> Table</>, value: 'table' }]} />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: 8 }}>Add Program</Button>
            </Space>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Programs', value: programs.length, icon: <ReadOutlined />, color: '#06b6d4' },
                        { title: 'In Progress', value: ongoing, icon: <ThunderboltOutlined />, color: '#f59e0b' },
                        { title: 'Completed', value: completed, icon: <BookOutlined />, color: '#10b981' },
                        { title: 'Mandatory', value: mandatory, icon: <SafetyCertificateOutlined />, color: '#ef4444' },
                        { title: 'Total Hours', value: totalHours, icon: <ClockCircleOutlined />, color: '#8b5cf6', suffix: 'h' },
                        { title: 'Budget', value: fmt(totalCost), icon: <DollarOutlined />, color: '#f59e0b', size: 14 },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} suffix={(s as any).suffix} valueStyle={{ color: s.color, fontSize: (s as any).size || undefined }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {catDist.length > 0 && (
                    <Card size="small" style={glass}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Text strong style={{ fontSize: 12, minWidth: 100 }}>Categories:</Text>
                            {catDist.map((c, i) => (
                                <motion.div key={c.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${c.color}10`, border: `1px solid ${c.color}33` }}>
                                    <span>{c.icon}</span><Text style={{ fontSize: 11 }}>{c.name}</Text><Badge count={c.count} style={{ backgroundColor: c.color }} size="small" />
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                )}

                {viewMode === 'grid' ? (
                    <Row gutter={[12, 12]}>
                        {programs.map(p => <Col xs={24} sm={12} md={8} lg={6} key={p.id}><ProgramCard program={p} onDelete={handleDelete} /></Col>)}
                    </Row>
                ) : (
                    <Card style={glass}><Table dataSource={programs} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" /></Card>
                )}
            </motion.div>

            <Modal title="New Training Program" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={() => form.submit()} okText="Create Program" width={560}>
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ paddingTop: 8 }}>
                    <Form.Item name="name" label="Program Name" rules={[{ required: true }]}><Input placeholder="e.g. Advanced React Workshop" /></Form.Item>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="category" label="Category" initialValue="technical">
                            <Select options={Object.entries(catCfg).map(([k, v]) => ({ value: k, label: <Space>{v.icon} {k.replace('_', ' ')}</Space> }))} />
                        </Form.Item></Col>
                        <Col span={12}><Form.Item name="provider" label="Provider"><Input placeholder="e.g. Internal, Udemy" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Brief program description..." /></Form.Item>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="durationHours" label="Duration (hrs)" initialValue={8}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="cost" label="Cost (IDR)" initialValue={0}><InputNumber min={0} step={100000} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="isMandatory" label="Mandatory" valuePropName="checked"><Switch /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="startDate" label="Start Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="endDate" label="End Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="certificationName" label="Certification (optional)"><Input placeholder="e.g. AWS Solutions Architect" /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}

