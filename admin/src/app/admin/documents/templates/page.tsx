'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Typography, Tag, Spin, Empty, Row, Col, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { FileTextOutlined, PlusOutlined, CopyOutlined, DeleteOutlined, TagOutlined, EditOutlined } from '@ant-design/icons';
import { documentService, DocTemplate } from '@/lib/documentService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const catColors: Record<string, string> = { general: '#6366f1', contract: '#10b981', policy: '#3b82f6', sop: '#f59e0b', report: '#8b5cf6', hr: '#ef4444', legal: '#06b6d4' };

export default function TemplatesPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<DocTemplate[]>([]);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();
    const [msgApi, ctxHolder] = message.useMessage();

    useEffect(() => { (async () => { setLoading(true); try { setTemplates(await documentService.getTemplates()); } catch {} finally { setLoading(false); } })(); }, []);

    const createTpl = async () => {
        try {
            const vals = await form.validateFields();
            await documentService.createTemplate(undefined, vals);
            msgApi.success('Template created');
            setModal(false); form.resetFields();
            setTemplates(await documentService.getTemplates());
        } catch (e: any) { if (e.message) msgApi.error(e.message); }
    };
    const deleteTpl = async (id: string) => { try { await documentService.deleteTemplate(id); msgApi.success('Deleted'); setTemplates(await documentService.getTemplates()); } catch { msgApi.error('Failed'); } };

    const categories = [...new Set(templates.map(t => t.category))];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Document Templates</AuroraText>}
            subTitle={<DecryptedText text="Reusable templates for contracts, SOPs, and policies" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>New Template</Button>]}>
            {ctxHolder}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Category Filter */}
                {categories.length > 0 && (
                    <Card style={glass} size="small">
                        <Space wrap>
                            <Text strong style={{ fontSize: 12 }}>Categories:</Text>
                            {categories.map(c => <Tag key={c} color={catColors[c] || 'default'} style={{ cursor: 'pointer', borderRadius: 12 }}>{c} ({templates.filter(t => t.category === c).length})</Tag>)}
                        </Space>
                    </Card>
                )}

                {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> :
                    templates.length === 0 ? <Card style={glass}><Empty description="No templates yet. Create one to get started." /></Card> :
                    <Row gutter={[14, 14]}>
                        {templates.map((tpl, i) => (
                            <Col key={tpl.id} xs={24} sm={12} lg={8} xl={6}>
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card hoverable style={{ ...glass, height: '100%', borderLeft: `3px solid ${catColors[tpl.category] || themeColor}` }} styles={{ body: { padding: '16px 18px' } }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${catColors[tpl.category] || themeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileTextOutlined style={{ color: catColors[tpl.category] || themeColor, fontSize: 16 }} />
                                            </div>
                                            <Space size={4}>
                                                <Popconfirm title="Delete?" onConfirm={() => deleteTpl(tpl.id)}><Button size="small" type="text" icon={<DeleteOutlined />} danger /></Popconfirm>
                                            </Space>
                                        </div>
                                        <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>{tpl.name}</Text>
                                        {tpl.description && <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8 }} ellipsis={{ rows: 2 }}>{tpl.description}</Paragraph>}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Tag color={catColors[tpl.category] || 'default'} style={{ fontSize: 10, borderRadius: 10 }}>{tpl.category}</Tag>
                                            <Text type="secondary" style={{ fontSize: 10 }}>Used {tpl.usageCount}×</Text>
                                        </div>
                                        {tpl.tags?.length > 0 && <div style={{ marginTop: 6 }}><Space wrap size={4}>{tpl.tags.slice(0, 3).map(t => <Tag key={t} style={{ fontSize: 9 }}>{t}</Tag>)}</Space></div>}
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                }
            </motion.div>

            <Modal title="New Template" open={modal} onOk={createTpl} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Template Name" rules={[{ required: true }]}><Input placeholder="Employment Contract" /></Form.Item>
                    <Form.Item name="category" label="Category" initialValue="general">
                        <Select options={[{ value: 'general', label: 'General' }, { value: 'contract', label: 'Contract' }, { value: 'policy', label: 'Policy' }, { value: 'sop', label: 'SOP' }, { value: 'report', label: 'Report' }, { value: 'hr', label: 'HR' }, { value: 'legal', label: 'Legal' }]} />
                    </Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Template description..." /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
