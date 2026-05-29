"use client";
import React, { useState } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Input, Select, Badge, Tabs, message, Modal, Divider } from "antd";
import {
    AppstoreOutlined, SearchOutlined, DownloadOutlined, EyeOutlined,
    StarOutlined, StarFilled, CheckCircleOutlined, FormOutlined,
    TeamOutlined, TrophyOutlined, SafetyOutlined, HeartOutlined,
    BulbOutlined, BarChartOutlined, FileTextOutlined, RocketOutlined,
    ClockCircleOutlined, ToolOutlined, BookOutlined, AuditOutlined,
    CheckSquareOutlined, MessageOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    module: string;
    fields: number;
    scoring: boolean;
    icon: React.ReactNode;
    color: string;
    popular?: boolean;
    tags: string[];
}

const LIBRARY: Template[] = [
    // KPI & Performance
    { id: 'kpi-quarterly', name: 'Quarterly KPI Review', description: 'Comprehensive KPI evaluation with weighted dimensions for leadership, teamwork, innovation, and results.', category: 'kpi', module: 'HR', fields: 15, scoring: true, icon: <TrophyOutlined />, color: '#f59e0b', popular: true, tags: ['kpi', 'performance', 'hr'] },
    { id: 'kpi-360', name: '360° Feedback Form', description: 'Multi-rater evaluation form for collecting feedback from peers, managers, and direct reports.', category: 'kpi', module: 'HR', fields: 20, scoring: true, icon: <TeamOutlined />, color: '#8b5cf6', popular: true, tags: ['360', 'feedback', 'peer'] },
    { id: 'kpi-probation', name: 'Probation Review', description: 'End-of-probation assessment covering job knowledge, attitude, and performance.', category: 'kpi', module: 'HR', fields: 12, scoring: true, icon: <ClockCircleOutlined />, color: '#3b82f6', tags: ['probation', 'review'] },
    { id: 'kpi-goals', name: 'Goal Setting Template', description: 'OKR-style goal setting with key results tracking and progress indicators.', category: 'kpi', module: 'HR', fields: 10, scoring: false, icon: <RocketOutlined />, color: '#10b981', tags: ['goals', 'okr'] },

    // Surveys & Feedback
    { id: 'survey-csat', name: 'Customer Satisfaction (CSAT)', description: 'Standard CSAT survey with Likert scales measuring overall satisfaction and specific touchpoints.', category: 'survey', module: 'CRM', fields: 8, scoring: true, icon: <HeartOutlined />, color: '#ec4899', popular: true, tags: ['csat', 'customer', 'satisfaction'] },
    { id: 'survey-nps', name: 'Net Promoter Score (NPS)', description: 'NPS survey with follow-up questions for promoters and detractors.', category: 'survey', module: 'CRM', fields: 5, scoring: true, icon: <StarOutlined />, color: '#3b82f6', tags: ['nps', 'loyalty'] },
    { id: 'survey-employee', name: 'Employee Engagement Survey', description: 'Anonymous employee engagement survey covering culture, growth, and work-life balance.', category: 'survey', module: 'HR', fields: 25, scoring: true, icon: <BulbOutlined />, color: '#f59e0b', popular: true, tags: ['engagement', 'culture'] },
    { id: 'survey-exit', name: 'Exit Interview', description: 'Structured exit interview form to understand reasons for departure and gather improvement suggestions.', category: 'survey', module: 'HR', fields: 15, scoring: false, icon: <MessageOutlined />, color: '#ef4444', tags: ['exit', 'offboarding'] },

    // Checklists & Assessments
    { id: 'check-sprint', name: 'Sprint QA Checklist', description: 'Quality assurance checklist for sprint deliverables including testing, documentation, and code review.', category: 'checklist', module: 'PM', fields: 12, scoring: true, icon: <CheckSquareOutlined />, color: '#3b82f6', tags: ['qa', 'sprint', 'agile'] },
    { id: 'check-release', name: 'Release Readiness', description: 'Pre-release checklist covering build verification, staging tests, rollback plan, and monitoring.', category: 'checklist', module: 'PM', fields: 18, scoring: true, icon: <RocketOutlined />, color: '#10b981', tags: ['release', 'deployment'] },
    { id: 'check-onboard', name: 'New Employee Onboarding', description: 'Employee onboarding checklist with equipment setup, access provisioning, and orientation tasks.', category: 'checklist', module: 'HR', fields: 20, scoring: false, icon: <TeamOutlined />, color: '#8b5cf6', popular: true, tags: ['onboarding', 'new-hire'] },

    // Audit & Compliance
    { id: 'audit-security', name: 'IT Security Assessment', description: 'Comprehensive security audit form covering infrastructure, access controls, encryption, and incident response.', category: 'audit', module: 'ITSM', fields: 25, scoring: true, icon: <SafetyOutlined />, color: '#ef4444', popular: true, tags: ['security', 'audit', 'compliance'] },
    { id: 'audit-gdpr', name: 'GDPR Compliance Check', description: 'Data protection assessment aligned with GDPR requirements for data handling and privacy.', category: 'audit', module: 'ITSM', fields: 20, scoring: true, icon: <AuditOutlined />, color: '#722ed1', tags: ['gdpr', 'privacy', 'data'] },
    { id: 'audit-vendor', name: 'Vendor Assessment', description: 'Third-party vendor evaluation form covering capabilities, security posture, and SLA compliance.', category: 'audit', module: 'ITSM', fields: 15, scoring: true, icon: <BarChartOutlined />, color: '#06b6d4', tags: ['vendor', 'procurement'] },

    // Operations
    { id: 'ops-incident', name: 'Incident Post-Mortem', description: 'Structured post-incident review template with timeline, root cause analysis, and action items.', category: 'assessment', module: 'ITSM', fields: 12, scoring: false, icon: <ThunderboltOutlined />, color: '#f59e0b', tags: ['incident', 'postmortem'] },
    { id: 'ops-change', name: 'Change Request Form', description: 'Standard change management request form with risk assessment, impact analysis, and approval workflow.', category: 'assessment', module: 'ITSM', fields: 14, scoring: false, icon: <ToolOutlined />, color: '#3b82f6', tags: ['change', 'request'] },
];

const CATEGORIES = ['all', 'kpi', 'survey', 'checklist', 'audit', 'assessment'];
const MODULES = ['all', 'HR', 'CRM', 'PM', 'ITSM'];

export default function FormLibraryPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [module, setModule] = useState('all');
    const [previewId, setPreviewId] = useState<string | null>(null);

    const filtered = LIBRARY.filter(t => {
        if (category !== 'all' && t.category !== category) return false;
        if (module !== 'all' && t.module !== module) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tags.some(tag => tag.includes(search.toLowerCase()))) return false;
        return true;
    });

    const popular = LIBRARY.filter(t => t.popular);
    const preview = LIBRARY.find(t => t.id === previewId);

    const handleInstall = (tpl: Template) => {
        messageApi.success(`"${tpl.name}" template installed! Redirecting to builder...`);
        setTimeout(() => router.push('/admin/forms/builder'), 1000);
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#ec4899']}>Template Library</AuroraText>}
            subTitle={<DecryptedText text="Pre-built form templates — install with one click" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="custom" type="primary" icon={<FormOutlined />} onClick={() => router.push('/admin/forms/builder')}
                    style={{ background: themeColor, borderColor: themeColor }}>Build Custom</Button>,
            ]}
        >
            {contextHolder}
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Search & Filter */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                    <Space wrap>
                        <Input prefix={<SearchOutlined />} placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: 240 }} allowClear />
                        <Select value={category} onChange={setCategory} style={{ width: 140 }}
                            options={CATEGORIES.map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1) }))} />
                        <Select value={module} onChange={setModule} style={{ width: 120 }}
                            options={MODULES.map(m => ({ value: m, label: m === 'all' ? 'All Modules' : m }))} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{filtered.length} templates</Text>
                    </Space>
                </Card>

                {/* Popular Row (only when no filters) */}
                {category === 'all' && module === 'all' && !search && (
                    <div style={{ marginBottom: 16 }}>
                        <Space style={{ marginBottom: 8 }}>
                            <StarFilled style={{ color: '#f59e0b' }} />
                            <Text strong style={{ fontSize: 13 }}>Popular Templates</Text>
                        </Space>
                        <Row gutter={[12, 12]}>
                            {popular.map((tpl, i) => (
                                <Col xs={24} sm={12} md={6} key={tpl.id}>
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                        <Card hoverable size="small" style={{ borderRadius: 12, borderTop: `3px solid ${tpl.color}`, cursor: 'pointer' }}
                                            onClick={() => setPreviewId(tpl.id)}>
                                            <Space align="start">
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tpl.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: tpl.color }}>
                                                    {tpl.icon}
                                                </div>
                                                <div>
                                                    <Text strong style={{ fontSize: 11 }}>{tpl.name}</Text>
                                                    <div>
                                                        <Tag style={{ fontSize: 9 }}>{tpl.module}</Tag>
                                                        <StarFilled style={{ color: '#f59e0b', fontSize: 10, marginLeft: 2 }} />
                                                    </div>
                                                </div>
                                            </Space>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}

                {/* Template Grid */}
                <Row gutter={[16, 16]}>
                    <AnimatePresence>
                        {filtered.map((tpl, i) => (
                            <Col xs={24} sm={12} md={8} key={tpl.id}>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                                    <Card hoverable style={{ ...glass, borderLeft: `4px solid ${tpl.color}`, height: '100%' }}>
                                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Space>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tpl.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: tpl.color }}>
                                                        {tpl.icon}
                                                    </div>
                                                    <div>
                                                        <Text strong style={{ fontSize: 13 }}>{tpl.name}</Text>
                                                        {tpl.popular && <StarFilled style={{ color: '#f59e0b', fontSize: 11, marginLeft: 4 }} />}
                                                        <div>
                                                            <Tag color={tpl.color} style={{ fontSize: 9, borderRadius: 8 }}>{tpl.module}</Tag>
                                                            <Tag style={{ fontSize: 9, borderRadius: 8 }}>{tpl.category}</Tag>
                                                        </div>
                                                    </div>
                                                </Space>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>{tpl.description}</Text>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Space size={4}>
                                                    <Tag style={{ fontSize: 9 }}>{tpl.fields} fields</Tag>
                                                    {tpl.scoring && <Tag color="purple" style={{ fontSize: 9, borderRadius: 8 }}>Scoring</Tag>}
                                                </Space>
                                                <Space size={4}>
                                                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setPreviewId(tpl.id)}>Preview</Button>
                                                    <Button type="primary" size="small" icon={<DownloadOutlined />}
                                                        style={{ background: tpl.color, borderColor: tpl.color, borderRadius: 6 }}
                                                        onClick={() => handleInstall(tpl)}>Install</Button>
                                                </Space>
                                            </div>
                                        </Space>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </AnimatePresence>
                </Row>

                {filtered.length === 0 && (
                    <Card style={{ ...glass, textAlign: 'center', padding: 40 }}>
                        <Text type="secondary">No templates match your filters</Text>
                    </Card>
                )}
            </div>

            {/* Preview Modal */}
            <Modal title={preview?.name} open={!!previewId} onCancel={() => setPreviewId(null)}
                footer={[
                    <Button key="close" onClick={() => setPreviewId(null)}>Close</Button>,
                    <Button key="install" type="primary" icon={<DownloadOutlined />}
                        style={{ background: preview?.color, borderColor: preview?.color }}
                        onClick={() => { if (preview) handleInstall(preview); setPreviewId(null); }}>Install Template</Button>,
                ]} width={500}>
                {preview && (
                    <div style={{ padding: '8px 0' }}>
                        <Space style={{ marginBottom: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${preview.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: preview.color }}>{preview.icon}</div>
                            <div>
                                <Tag color={preview.color}>{preview.module}</Tag>
                                <Tag>{preview.category}</Tag>
                                {preview.scoring && <Tag color="purple">Scoring Enabled</Tag>}
                            </div>
                        </Space>
                        <Paragraph style={{ fontSize: 13 }}>{preview.description}</Paragraph>
                        <Divider style={{ margin: '10px 0' }} />
                        <Row gutter={16}>
                            <Col span={8}><Text type="secondary" style={{ fontSize: 11 }}>Fields</Text><div><Text strong>{preview.fields}</Text></div></Col>
                            <Col span={8}><Text type="secondary" style={{ fontSize: 11 }}>Category</Text><div><Text strong>{preview.category}</Text></div></Col>
                            <Col span={8}><Text type="secondary" style={{ fontSize: 11 }}>Module</Text><div><Text strong>{preview.module}</Text></div></Col>
                        </Row>
                        <Divider style={{ margin: '10px 0' }} />
                        <Space wrap>
                            {preview.tags.map(tag => <Tag key={tag} style={{ borderRadius: 8 }}>{tag}</Tag>)}
                        </Space>
                    </div>
                )}
            </Modal>
        </CMSLayout>
    );
}
