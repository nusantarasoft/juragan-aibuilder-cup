"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import { AuroraText } from '@/components/magicui/aurora-text';
import { BentoGrid } from "@/components/magicui/bento-grid";
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Button, Card, Col, Descriptions, Drawer, Empty, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Spin, Statistic, Steps, Table, Tag, Tooltip, Typography, Segmented } from "antd";
import {
    BookOutlined, BulbOutlined, SearchOutlined, FilterOutlined,
    FolderOpenOutlined, TagOutlined, CalendarOutlined,
    ExclamationCircleOutlined, CheckCircleOutlined,
    InfoCircleOutlined, WarningOutlined, FileExcelOutlined, FilePdfOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, ReloadOutlined, AppstoreOutlined, BarsOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text, Paragraph } = Typography;

const GET_ALL_LESSONS = `
  query GetAllLessonsLearned($tenantId: String!) {
    pmAllLessonsLearned(tenantId: $tenantId)
  }
`;

const GET_PROJECTS = `
  query GetProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber }
  }
`;

const CREATE_LESSON = `
  mutation CreateLesson($tenantId: String!, $input: CreatePmLessonLearnedInput!) {
    createPmLessonLearned(tenantId: $tenantId, input: $input) { id }
  }
`;

const UPDATE_LESSON = `
  mutation UpdateLesson($id: ID!, $input: UpdatePmLessonLearnedInput!) {
    updatePmLessonLearned(id: $id, input: $input) { id }
  }
`;

const DELETE_LESSON = `
  mutation DeleteLesson($id: ID!) {
    deletePmLessonLearned(id: $id)
  }
`;

const CATEGORY_OPTIONS = ['process', 'technical', 'management', 'communication', 'risk', 'quality', 'other'];
const PHASE_OPTIONS = ['initiation', 'planning', 'execution', 'monitoring', 'closing'];

const CATEGORY_COLORS: Record<string, string> = {
    process: '#3b82f6',
    technical: '#8b5cf6',
    management: '#f59e0b',
    communication: '#10b981',
    risk: '#ef4444',
    quality: '#06b6d4',
    other: '#6b7280',
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    process: { color: 'var(--theme-color, #8b5cf6)', icon: <BookOutlined /> },
    technical: { color: '#3b82f6', icon: <BulbOutlined /> },
    management: { color: '#6366f1', icon: <FolderOpenOutlined /> },
    communication: { color: '#10b981', icon: <InfoCircleOutlined /> },
    risk: { color: '#f59e0b', icon: <WarningOutlined /> },
    quality: { color: '#22c55e', icon: <CheckCircleOutlined /> },
    other: { color: '#6b7280', icon: <TagOutlined /> },
};

export default function KnowledgeBasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [lessons, setLessons] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<string | null>(null);
    const [viewingLesson, setViewingLesson] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // ── CRUD state ──
    const [createOpen, setCreateOpen] = useState(false);
    const [createStep, setCreateStep] = useState(0);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_ALL_LESSONS, { tenantId: DEFAULT_TENANT_ID });
            setLessons(data.pmAllLessonsLearned || []);
        } catch { /* optional PM data */ } finally {
            setLoading(false);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        try {
            const data = await gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID });
            setProjects(data.pmProjects || []);
        } catch { /* optional PM data */ }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Create ──
    const openCreateModal = async () => {
        if (projects.length === 0) await loadProjects();
        createForm.resetFields();
        setCreateStep(0);
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setSaving(true);
            await gql(CREATE_LESSON, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId: values.projectId,
                    title: values.title,
                    category: values.category,
                    phase: values.phase,
                    situation: values.situation,
                    impact: values.impact,
                    lesson: values.lesson,
                    recommendation: values.recommendation,
                    submittedBy: values.submittedBy,
                    tags: values.tags,
                },
            });
            message.success('Lesson created successfully');
            setCreateOpen(false);
            loadData();
        } catch (e: any) {
            if (e?.errorFields) return; // validation error
            message.error('Failed to create lesson');
        } finally {
            setSaving(false);
        }
    };

    // ── Edit ──
    const startEdit = () => {
        if (!viewingLesson) return;
        editForm.setFieldsValue({
            title: viewingLesson.title,
            category: viewingLesson.category,
            phase: viewingLesson.phase,
            situation: viewingLesson.situation,
            impact: viewingLesson.impact,
            lesson: viewingLesson.lesson,
            recommendation: viewingLesson.recommendation,
            submittedBy: viewingLesson.submitted_by,
            tags: viewingLesson.tags || [],
        });
        setEditing(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await editForm.validateFields();
            setSaving(true);
            await gql(UPDATE_LESSON, {
                id: viewingLesson.id,
                input: {
                    title: values.title,
                    category: values.category,
                    phase: values.phase,
                    situation: values.situation,
                    impact: values.impact,
                    lesson: values.lesson,
                    recommendation: values.recommendation,
                    submittedBy: values.submittedBy,
                    tags: values.tags,
                },
            });
            message.success('Lesson updated successfully');
            setEditing(false);
            setViewingLesson(null);
            loadData();
        } catch (e: any) {
            if (e?.errorFields) return;
            message.error('Failed to update lesson');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async () => {
        try {
            setSaving(true);
            await gql(DELETE_LESSON, { id: viewingLesson.id });
            message.success('Lesson deleted');
            setViewingLesson(null);
            setEditing(false);
            loadData();
        } catch {
            message.error('Failed to delete lesson');
        } finally {
            setSaving(false);
        }
    };

    // ── Filters ──
    const filtered = useMemo(() => {
        let result = [...lessons];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(l =>
                (l.title || '').toLowerCase().includes(q) ||
                (l.lesson || '').toLowerCase().includes(q) ||
                (l.situation || '').toLowerCase().includes(q) ||
                (l.recommendation || '').toLowerCase().includes(q) ||
                (l.tags || []).some((t: string) => t.toLowerCase().includes(q))
            );
        }
        if (categoryFilter) result = result.filter(l => l.category === categoryFilter);
        if (phaseFilter) result = result.filter(l => l.phase === phaseFilter);
        if (projectFilter) result = result.filter(l => l.project?.name === projectFilter);
        return result;
    }, [lessons, search, categoryFilter, phaseFilter, projectFilter]);

    // ── Computed stats ──
    const allCategories = useMemo(() => {
        const cats = new Set(lessons.map(l => l.category).filter(Boolean));
        return Array.from(cats);
    }, [lessons]);

    const allPhases = useMemo(() => {
        const phases = new Set(lessons.map(l => l.phase).filter(Boolean));
        return Array.from(phases);
    }, [lessons]);

    const allProjects = useMemo(() => {
        const projs = new Map();
        lessons.forEach(l => {
            if (l.project) projs.set(l.project.id, l.project);
        });
        return Array.from(projs.values());
    }, [lessons]);

    const allProjectNames = useMemo(() => {
        const names = new Set<string>();
        lessons.forEach(l => { if (l.project?.name) names.add(l.project.name); });
        return Array.from(names).sort();
    }, [lessons]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        lessons.forEach(l => (l.tags || []).forEach((t: string) => tags.add(t)));
        return Array.from(tags);
    }, [lessons]);

    const categoryDistribution = useMemo(() => {
        return allCategories.map(c => ({
            category: c,
            count: lessons.filter(l => l.category === c).length,
            ...(CATEGORY_CONFIG[c] || CATEGORY_CONFIG.other),
        }));
    }, [lessons, allCategories]);

    const glassCard = {
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
    };

    const exportCols = [{ header: 'Title', key: 'title' }, { header: 'Project', key: 'projectName' }, { header: 'Category', key: 'category' }, { header: 'Impact', key: 'impact' }];
    const exportPayload = { fileName: 'pm_knowledge_base', title: 'Lessons Learned', dateRange: { start: startDate, end: endDate }, columns: exportCols, data: lessons };

    const headerExtra = [
        <RbacGuard key="crud" requiredRole="manager">
            <Tooltip title="New Lesson"><Button icon={<PlusOutlined />} type="primary" size="small" onClick={openCreateModal} /></Tooltip>
        </RbacGuard>,
        <Tooltip key="reload" title="Reload"><Button icon={<ReloadOutlined />} size="small" onClick={loadData} loading={loading} /></Tooltip>,
        <RbacGuard key="exports" requiredRole="manager">
            <Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel(exportPayload)} /></Tooltip>
            <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf(exportPayload)} /></Tooltip>
        </RbacGuard>,
    ];

    const columns = [
        {
            title: 'Lesson', dataIndex: 'title', key: 'title',
            sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || ''),
            render: (_: any, record: any) => (
                <div>
                    <a onClick={() => setViewingLesson(record)} style={{ fontWeight: 600, fontSize: 14 }}>
                        {record.title || 'Untitled Lesson'}
                    </a>
                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888', marginTop: 2 }}>
                        {record.project?.name && (
                            <Tag icon={<FolderOpenOutlined />} color="geekblue" style={{ fontSize: 10, cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); router.push(`/admin/pm/dashboard?projectId=${record.project.id}`); }}>
                                {record.project.name}
                            </Tag>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'Category', dataIndex: 'category', key: 'category', width: 120,
            sorter: (a: any, b: any) => (a.category || '').localeCompare(b.category || ''),
            render: (category: string) => {
                const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                return <Tag color={cfg.color} icon={cfg.icon} style={{ textTransform: 'capitalize' }}>{category || 'other'}</Tag>;
            },
            filters: allCategories.map(c => ({ text: c, value: c })),
            onFilter: (value: any, record: any) => record.category === value,
        },
        {
            title: 'Phase', dataIndex: 'phase', key: 'phase', width: 110,
            render: (phase: string) => phase ? <Tag color="default" style={{ textTransform: 'capitalize', fontSize: 11 }}>{phase}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Impact', dataIndex: 'impact', key: 'impact', width: 200, ellipsis: { showTitle: false },
            render: (impact: string) => impact ? <Tooltip title={impact}><Text style={{ fontSize: 12 }}>{impact}</Text></Tooltip> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Tags', dataIndex: 'tags', key: 'tags', width: 160,
            render: (tags: string[]) => (
                <Space size={2} wrap>
                    {(tags || []).slice(0, 3).map(tag => <Tag key={tag} color="cyan" style={{ fontSize: 10 }}>{tag}</Tag>)}
                    {(tags || []).length > 3 && <Tag style={{ fontSize: 10 }}>+{tags.length - 3}</Tag>}
                </Space>
            ),
        },
        {
            title: 'Submitted', dataIndex: 'submitted_date', key: 'submitted_date', width: 110,
            sorter: (a: any, b: any) => dayjs(a.submitted_date).unix() - dayjs(b.submitted_date).unix(),
            render: (date: string) => date ? <Text style={{ fontSize: 11 }}><CalendarOutlined style={{ marginRight: 4 }} />{dayjs(date).format('MMM D, YYYY')}</Text> : <Text type="secondary">—</Text>,
        },
    ];

    // ── Create step content ──
    const createStepItems = [
        { title: 'Basic', content: (
            <>
                <Form.Item name="projectId" label="Project" rules={[{ required: true, message: 'Select a project' }]}>
                    <Select placeholder="Select project" showSearch optionFilterProp="label"
                        options={projects.map(p => ({ label: `${p.name} (${p.projectNumber || ''})`, value: p.id }))} />
                </Form.Item>
                <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
                    <Input placeholder="Lesson title" />
                </Form.Item>
                <Form.Item name="category" label="Category">
                    <Select placeholder="Category" allowClear options={CATEGORY_OPTIONS.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))} />
                </Form.Item>
                <Form.Item name="phase" label="Phase">
                    <Select placeholder="Phase" allowClear options={PHASE_OPTIONS.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))} />
                </Form.Item>
            </>
        )},
        { title: 'Details', content: (
            <>
                <Form.Item name="situation" label="Situation"><Input.TextArea rows={3} placeholder="Describe the situation..." /></Form.Item>
                <Form.Item name="impact" label="Impact"><Input.TextArea rows={3} placeholder="What was the impact?" /></Form.Item>
                <Form.Item name="lesson" label="Lesson Learned"><Input.TextArea rows={3} placeholder="What was the lesson?" /></Form.Item>
                <Form.Item name="recommendation" label="Recommendation"><Input.TextArea rows={3} placeholder="Recommendations..." /></Form.Item>
            </>
        )},
        { title: 'Meta', content: (
            <>
                <Form.Item name="submittedBy" label="Submitted By"><Input placeholder="Name" /></Form.Item>
                <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags" /></Form.Item>
            </>
        )},
    ];

    const cmsTitle = <AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Knowledge Base</AuroraText>;
    const cmsSubTitle = <DecryptedText text="Cross-project lessons learned repository" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />;

    if (loading && lessons.length === 0) {
        return (
            <CMSLayout title={cmsTitle} subTitle={cmsSubTitle} extra={headerExtra}>
                <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={cmsTitle} subTitle={cmsSubTitle} extra={headerExtra}>
            {/* ── Stats BentoGrid ── */}
            <BentoGrid className="max-w-none md:auto-rows-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <Card style={{ ...glassCard, borderTop: `3px solid ${themeColor}`, height: '100%' }} size="small">
                        <Statistic title={<span style={{ fontSize: 12 }}>Total Lessons</span>} value={lessons.length}
                            prefix={<BookOutlined style={{ color: themeColor }} />} valueStyle={{ fontSize: 28, fontWeight: 700, color: themeColor }} />
                    </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #3b82f6', height: '100%' }} size="small">
                        <Statistic title={<span style={{ fontSize: 12 }}>Contributing Projects</span>} value={allProjects.length}
                            prefix={<FolderOpenOutlined style={{ color: '#3b82f6' }} />} valueStyle={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }} />
                    </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #10b981', height: '100%' }} size="small">
                        <Statistic title={<span style={{ fontSize: 12 }}>Categories</span>} value={allCategories.length}
                            prefix={<TagOutlined style={{ color: '#10b981' }} />} valueStyle={{ fontSize: 28, fontWeight: 700, color: '#10b981' }} />
                    </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #f59e0b', height: '100%' }} size="small">
                        <Statistic title={<span style={{ fontSize: 12 }}>Unique Tags</span>} value={allTags.length}
                            prefix={<BulbOutlined style={{ color: '#f59e0b' }} />} valueStyle={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }} />
                    </Card>
                </motion.div>
            </BentoGrid>

            <BentoGrid className="max-w-none md:auto-rows-auto grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-4">
                {/* ── Category Distribution Donut ── */}
            {categoryDistribution.length > 0 && (
                <Card size="small" title={<Space><FolderOpenOutlined style={{ color: themeColor }} />Category Distribution</Space>} style={{ ...glassCard, marginBottom: 0 }}>
                    <Row gutter={16} align="middle">
                        <Col xs={24} md={10}>
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={categoryDistribution.filter((c: any) => c.count > 0)}
                                            dataKey="count"
                                            nameKey="category"
                                            cx="50%" cy="50%"
                                            innerRadius={45} outerRadius={70}
                                            paddingAngle={3}
                                            strokeWidth={0}
                                        >
                                            {categoryDistribution.filter((c: any) => c.count > 0).map((entry: any, i: number) => (
                                                <Cell key={i} fill={entry.color || CATEGORY_COLORS[entry.category] || themeColor} />
                                            ))}
                                        </Pie>
                                        <RTooltip formatter={(value: number, name: string) => [`${value} lessons`, name]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Col>
                        <Col xs={24} md={14}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {categoryDistribution.map((cat: any) => (
                                    <div
                                        key={cat.category}
                                        onClick={() => setCategoryFilter(categoryFilter === cat.category ? null : cat.category)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                            background: categoryFilter === cat.category ? `${themeColor}15` : 'transparent',
                                            border: categoryFilter === cat.category ? `1px solid ${themeColor}30` : '1px solid transparent',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || CATEGORY_COLORS[cat.category] || themeColor, flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 12, fontWeight: categoryFilter === cat.category ? 600 : 400, textTransform: 'capitalize' }}>{cat.category}</span>
                                        <Tag style={{ margin: 0, borderRadius: 10, fontSize: 11 }}>{cat.count}</Tag>
                                    </div>
                                ))}
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

                </div>
                <div className="flex flex-col gap-4">
                {/* ── Phase Distribution Mini Bars ── */}
            {allPhases.length > 0 && (
                <Card size="small" title={<Space><CalendarOutlined style={{ color: themeColor }} />Phase Distribution</Space>} style={{ ...glassCard, marginBottom: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {allPhases.map((phase: string) => {
                            const count = lessons.filter(l => l.phase === phase).length;
                            const pct = lessons.length > 0 ? Math.round((count / lessons.length) * 100) : 0;
                            return (
                                <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 100, fontSize: 11, textTransform: 'capitalize', flexShrink: 0, color: isDark ? '#94a3b8' : '#64748b' }}>{phase}</span>
                                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                                            style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${themeColor}, ${themeColor}88)` }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, width: 40, textAlign: 'right' }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}


                </div>
            </BentoGrid>

            {/* ── Search & Filters ── */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                <Space size={12} wrap style={{ width: '100%' }}>
                    <Input placeholder="Search lessons, tags, recommendations..." prefix={<SearchOutlined />}
                        value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ width: 320 }} />
                    <Select placeholder="Category" allowClear value={categoryFilter} onChange={setCategoryFilter} style={{ width: 160 }}
                        options={allCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))} />
                    <Select placeholder="Phase" allowClear value={phaseFilter} onChange={setPhaseFilter} style={{ width: 160 }}
                        options={allPhases.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))} />
                    <Select
                        placeholder="Project"
                        allowClear
                        value={projectFilter}
                        onChange={setProjectFilter}
                        style={{ width: 180 }}
                        showSearch
                        filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                        options={allProjectNames.map((p: string) => ({ label: p, value: p }))}
                    />
                    {(search || categoryFilter || phaseFilter || projectFilter) && <Tag color="blue">{filtered.length} results</Tag>}
                </Space>
            </Card>

            {/* ── Lessons Display ── */}
            <Card 
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space><BookOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Lessons Learned</span><Tag color="purple">{filtered.length}</Tag></Space>
                        <Segmented 
                            options={[
                                { value: 'grid', icon: <AppstoreOutlined /> },
                                { value: 'table', icon: <BarsOutlined /> }
                            ]} 
                            value={viewMode} 
                            onChange={(val) => setViewMode(val as 'grid' | 'table')} 
                        />
                    </div>
                } 
                style={glassCard}
            >
                {filtered.length === 0 ? (
                    <Empty description={lessons.length === 0 ? "No lessons recorded yet. Click 'New Lesson' to add one." : "No lessons match your current filters."} />
                ) : viewMode === 'table' ? (
                    <Table scroll={{ x: 900 }} dataSource={filtered} columns={columns} rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: true }} size="small" style={{ fontSize: 13 }}
                        onRow={(record) => ({ onClick: () => setViewingLesson(record), style: { cursor: 'pointer' } })} />
                ) : (
                    <Row gutter={[16, 16]}>
                        {filtered.map(lesson => {
                            const cfg = CATEGORY_CONFIG[lesson.category] || CATEGORY_CONFIG.other;
                            return (
                                <Col xs={24} sm={12} md={8} xl={6} key={lesson.id}>
                                    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                                        <Card 
                                            hoverable 
                                            onClick={() => setViewingLesson(lesson)}
                                            bodyStyle={{ padding: '16px' }}
                                            style={{ 
                                                ...glassCard, 
                                                height: '100%', 
                                                borderTop: `3px solid ${cfg.color}`,
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <Tag color={cfg.color} icon={cfg.icon} style={{ textTransform: 'capitalize', margin: 0 }}>
                                                    {lesson.category || 'other'}
                                                </Tag>
                                                {lesson.phase && <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{lesson.phase}</span>}
                                            </div>
                                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, color: isDark ? '#fff' : '#111' }}>
                                                {lesson.title || 'Untitled Lesson'}
                                            </div>
                                            {lesson.project?.name && (
                                                <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <FolderOpenOutlined /> {lesson.project.name}
                                                </div>
                                            )}
                                            <div style={{ flex: 1, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 16, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                                {lesson.lesson || 'No lesson content provided.'}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                                                <Space size={2} wrap style={{ maxWidth: '70%' }}>
                                                    {(lesson.tags || []).slice(0, 2).map((tag: string) => <Tag key={tag} color="cyan" style={{ fontSize: 9, margin: 0 }}>{tag}</Tag>)}
                                                    {(lesson.tags || []).length > 2 && <Tag style={{ fontSize: 9, margin: 0 }}>+{lesson.tags.length - 2}</Tag>}
                                                </Space>
                                                <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                    {lesson.submitted_date ? dayjs(lesson.submitted_date).format('MMM D, YYYY') : ''}
                                                </span>
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            );
                        })}
                    </Row>
                )}
            </Card>

            {/* ── Detail Drawer ── */}
            <Drawer
                title={<Space><BulbOutlined style={{ color: '#f59e0b' }} /><span>{editing ? 'Edit Lesson' : 'Lesson Details'}</span></Space>}
                size={600} open={!!viewingLesson}
                onClose={() => { setViewingLesson(null); setEditing(false); }}
                extra={
                    <Space>
                        {viewingLesson?.project && !editing && (
                            <Button size="small" onClick={() => router.push(`/admin/pm/dashboard?projectId=${viewingLesson.project.id}`)}>Open Project</Button>
                        )}
                        {!editing ? (
                            <RbacGuard requiredRole="manager">
                                <Button icon={<EditOutlined />} size="small" onClick={startEdit}>Edit</Button>
                                <Popconfirm title="Delete this lesson?" description="This action cannot be undone." onConfirm={handleDelete} okButtonProps={{ danger: true, loading: saving }}>
                                    <Button icon={<DeleteOutlined />} size="small" danger>Delete</Button>
                                </Popconfirm>
                            </RbacGuard>
                        ) : (
                            <>
                                <Button icon={<CloseOutlined />} size="small" onClick={() => setEditing(false)}>Cancel</Button>
                                <Button icon={<SaveOutlined />} size="small" type="primary" loading={saving} onClick={handleUpdate}>Save</Button>
                            </>
                        )}
                    </Space>
                }
            >
                {viewingLesson && !editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ padding: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 12, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{viewingLesson.title || 'Untitled Lesson'}</h2>
                                    {viewingLesson.project && (
                                        <div style={{ marginTop: 8 }}>
                                            <Tag icon={<FolderOpenOutlined />} color="geekblue" style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/pm/dashboard?projectId=${viewingLesson.project.id}`)}>
                                                {viewingLesson.project.name} ({viewingLesson.project.project_number})
                                            </Tag>
                                        </div>
                                    )}
                                </div>
                                {(() => { const cfg = CATEGORY_CONFIG[viewingLesson.category] || CATEGORY_CONFIG.other; return <Tag color={cfg.color} icon={cfg.icon} style={{ margin: 0 }}>{viewingLesson.category || 'other'}</Tag>; })()}
                            </div>

                            {viewingLesson.phase && (
                                <div style={{ marginBottom: 16 }}>
                                    <Steps size="small" current={PHASE_OPTIONS.indexOf(viewingLesson.phase)} items={PHASE_OPTIONS.map(p => ({ title: p.charAt(0).toUpperCase() + p.slice(1) }))} />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 24, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                <div><span style={{ fontWeight: 600 }}>Submitted by:</span> {viewingLesson.submitted_by || '—'}</div>
                                <div><span style={{ fontWeight: 600 }}>Date:</span> {viewingLesson.submitted_date ? dayjs(viewingLesson.submitted_date).format('MMMM D, YYYY') : '—'}</div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><ExclamationCircleOutlined /> Situation</h3>
                            <div style={{ padding: 16, background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderRadius: 8, borderLeft: '4px solid #f59e0b', fontSize: 14, lineHeight: 1.6 }}>
                                {viewingLesson.situation || 'No situation described.'}
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><WarningOutlined /> Impact</h3>
                            <div style={{ padding: 16, background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderRadius: 8, borderLeft: '4px solid #ef4444', fontSize: 14, lineHeight: 1.6 }}>
                                {viewingLesson.impact || 'No impact described.'}
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: themeColor, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><BulbOutlined /> Lesson Learned</h3>
                            <div style={{ padding: 16, background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderRadius: 8, borderLeft: `4px solid ${themeColor}`, fontSize: 14, lineHeight: 1.6 }}>
                                {viewingLesson.lesson || 'No lesson documented.'}
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircleOutlined /> Recommendation</h3>
                            <div style={{ padding: 16, background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderRadius: 8, borderLeft: '4px solid #10b981', fontSize: 14, lineHeight: 1.6 }}>
                                {viewingLesson.recommendation || 'No recommendation provided.'}
                            </div>
                        </div>

                        {(viewingLesson.tags || []).length > 0 && (
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><TagOutlined /> Tags</h3>
                                <Space size={6} wrap>{viewingLesson.tags.map((tag: string) => <Tag key={tag} color="cyan">{tag}</Tag>)}</Space>
                            </div>
                        )}
                    </div>
                )}
                {viewingLesson && editing && (
                    <Form form={editForm} layout="vertical" size="small">
                        <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
                        <Row gutter={12}>
                            <Col span={12}><Form.Item name="category" label="Category"><Select allowClear options={CATEGORY_OPTIONS.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="phase" label="Phase"><Select allowClear options={PHASE_OPTIONS.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="situation" label="Situation"><Input.TextArea rows={3} /></Form.Item>
                        <Form.Item name="impact" label="Impact"><Input.TextArea rows={3} /></Form.Item>
                        <Form.Item name="lesson" label="Lesson Learned"><Input.TextArea rows={3} /></Form.Item>
                        <Form.Item name="recommendation" label="Recommendation"><Input.TextArea rows={3} /></Form.Item>
                        <Form.Item name="submittedBy" label="Submitted By"><Input /></Form.Item>
                        <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags" /></Form.Item>
                    </Form>
                )}
            </Drawer>

            {/* ── Create Modal ── */}
            <Modal title={<Space><PlusOutlined style={{ color: themeColor }} /> New Lesson Learned</Space>}
                open={createOpen} onCancel={() => setCreateOpen(false)} width={560}
                footer={
                    <Space>
                        {createStep > 0 && <Button onClick={() => setCreateStep(s => s - 1)}>Back</Button>}
                        {createStep < 2 ? (
                            <Button type="primary" onClick={async () => {
                                try {
                                    if (createStep === 0) await createForm.validateFields(['projectId', 'title']);
                                    setCreateStep(s => s + 1);
                                } catch { /* optional PM data */ }
                            }}>Next</Button>
                        ) : (
                            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleCreate}>Create Lesson</Button>
                        )}
                    </Space>
                }
            >
                <Steps current={createStep} size="small" style={{ marginBottom: 24 }}
                    items={createStepItems.map(s => ({ title: s.title }))} />
                <Form form={createForm} layout="vertical" size="small">
                    <div style={{ display: createStep === 0 ? 'block' : 'none' }}>{createStepItems[0].content}</div>
                    <div style={{ display: createStep === 1 ? 'block' : 'none' }}>{createStepItems[1].content}</div>
                    <div style={{ display: createStep === 2 ? 'block' : 'none' }}>{createStepItems[2].content}</div>
                </Form>
            </Modal>
        </CMSLayout>
    );
}

