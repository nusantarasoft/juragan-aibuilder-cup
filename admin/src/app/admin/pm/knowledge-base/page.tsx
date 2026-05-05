"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Button, Card, Col, Descriptions, Drawer, Empty, Input, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import {
    BookOutlined, BulbOutlined, SearchOutlined, FilterOutlined,
    FolderOpenOutlined, TagOutlined, CalendarOutlined,
    ExclamationCircleOutlined, CheckCircleOutlined,
    InfoCircleOutlined, WarningOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
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
    const [viewingLesson, setViewingLesson] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_ALL_LESSONS, { tenantId: DEFAULT_TENANT_ID });
            setLessons(data.pmAllLessonsLearned || []);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // â”€â”€ Filters â”€â”€
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
        return result;
    }, [lessons, search, categoryFilter, phaseFilter]);

    // â”€â”€ Computed stats â”€â”€
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

    const columns = [
        {
            title: 'Lesson',
            dataIndex: 'title',
            key: 'title',
            render: (_: any, record: any) => (
                <div>
                    <a onClick={() => setViewingLesson(record)} style={{ fontWeight: 600, fontSize: 14 }}>
                        {record.title || 'Untitled Lesson'}
                    </a>
                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888', marginTop: 2 }}>
                        {record.project?.name && (
                            <Tag
                                icon={<FolderOpenOutlined />}
                                color="geekblue"
                                style={{ fontSize: 10, cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/pm/dashboard?projectId=${record.project.id}`);
                                }}
                            >
                                {record.project.name}
                            </Tag>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (category: string) => {
                const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                return (
                    <Tag color={cfg.color} icon={cfg.icon} style={{ textTransform: 'capitalize' }}>
                        {category || 'other'}
                    </Tag>
                );
            },
            filters: allCategories.map(c => ({ text: c, value: c })),
            onFilter: (value: any, record: any) => record.category === value,
        },
        {
            title: 'Phase',
            dataIndex: 'phase',
            key: 'phase',
            width: 110,
            render: (phase: string) => phase ? (
                <Tag color="default" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                    {phase}
                </Tag>
            ) : <Text type="secondary">â€”</Text>,
        },
        {
            title: 'Impact',
            dataIndex: 'impact',
            key: 'impact',
            width: 200,
            ellipsis: { showTitle: false },
            render: (impact: string) => impact ? (
                <Tooltip title={impact}>
                    <Text style={{ fontSize: 12 }}>{impact}</Text>
                </Tooltip>
            ) : <Text type="secondary">â€”</Text>,
        },
        {
            title: 'Tags',
            dataIndex: 'tags',
            key: 'tags',
            width: 160,
            render: (tags: string[]) => (
                <Space size={2} wrap>
                    {(tags || []).slice(0, 3).map(tag => (
                        <Tag key={tag} color="cyan" style={{ fontSize: 10 }}>{tag}</Tag>
                    ))}
                    {(tags || []).length > 3 && (
                        <Tag style={{ fontSize: 10 }}>+{tags.length - 3}</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Submitted',
            dataIndex: 'submitted_date',
            key: 'submitted_date',
            width: 110,
            sorter: (a: any, b: any) => dayjs(a.submitted_date).unix() - dayjs(b.submitted_date).unix(),
            render: (date: string) => date ? (
                <Text style={{ fontSize: 11 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(date).format('MMM D, YYYY')}
                </Text>
            ) : <Text type="secondary">â€”</Text>,
        },
    ];

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Knowledge Base</AuroraText>}
            subTitle={<DecryptedText text="Cross-project lessons learned repository" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'pm_knowledge_base', title: 'Lessons Learned', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Project', key: 'projectName' }, { header: 'Category', key: 'category' }, { header: 'Impact', key: 'impact' }], data: lessons })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'pm_knowledge_base', title: 'Lessons Learned', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Project', key: 'projectName' }, { header: 'Category', key: 'category' }, { header: 'Impact', key: 'impact' }], data: lessons })} /></Tooltip></RbacGuard>]}>
                <div style={{ textAlign: 'center', padding: 120 }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Knowledge Base</AuroraText>}
            subTitle={<DecryptedText text="Cross-project lessons learned repository" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'pm_knowledge_base', title: 'Lessons Learned', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Project', key: 'projectName' }, { header: 'Category', key: 'category' }, { header: 'Impact', key: 'impact' }], data: lessons })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'pm_knowledge_base', title: 'Lessons Learned', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Project', key: 'projectName' }, { header: 'Category', key: 'category' }, { header: 'Impact', key: 'impact' }], data: lessons })} /></Tooltip></RbacGuard>]}>
            {/* â”€â”€ Stats Row â”€â”€ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8} lg={6}>
                    <Card style={{ ...glassCard, borderTop: `3px solid ${themeColor}` }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Total Lessons</span>}
                            value={lessons.length}
                            prefix={<BookOutlined style={{ color: themeColor }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: themeColor }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #3b82f6' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Contributing Projects</span>}
                            value={allProjects.length}
                            prefix={<FolderOpenOutlined style={{ color: '#3b82f6' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #10b981' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Categories</span>}
                            value={allCategories.length}
                            prefix={<TagOutlined style={{ color: '#10b981' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8} lg={6}>
                    <Card style={{ ...glassCard, borderTop: '3px solid #f59e0b' }} size="small">
                        <Statistic
                            title={<span style={{ fontSize: 12 }}>Unique Tags</span>}
                            value={allTags.length}
                            prefix={<BulbOutlined style={{ color: '#f59e0b' }} />}
                            valueStyle={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* â”€â”€ Category Distribution â”€â”€ */}
            {categoryDistribution.length > 0 && (
                <Card
                    title={<Space><TagOutlined style={{ color: themeColor }} /> Category Distribution</Space>}
                    size="small"
                    style={{ ...glassCard, marginBottom: 24 }}
                >
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {categoryDistribution.map(c => (
                            <Card
                                key={c.category}
                                size="small"
                                hoverable
                                onClick={() => setCategoryFilter(prev => prev === c.category ? null : c.category)}
                                style={{
                                    flex: '1 1 120px',
                                    maxWidth: 180,
                                    textAlign: 'center',
                                    borderColor: categoryFilter === c.category ? c.color : undefined,
                                    borderWidth: categoryFilter === c.category ? 2 : 1,
                                    background: categoryFilter === c.category
                                        ? (isDark ? 'rgba(139,92,246,0.12)' : 'rgba(99,102,241,0.06)')
                                        : undefined,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ fontSize: 22, color: c.color }}>{c.icon}</div>
                                <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{c.count}</div>
                                <Text style={{ fontSize: 11, textTransform: 'capitalize' }}>{c.category}</Text>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {/* â”€â”€ Search & Filters â”€â”€ */}
            <Card style={{ ...glassCard, marginBottom: 16 }} size="small">
                <Space size={12} wrap style={{ width: '100%' }}>
                    <Input
                        placeholder="Search lessons, tags, recommendations..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        style={{ width: 320 }}
                    />
                    <Select
                        placeholder="Category"
                        allowClear
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        style={{ width: 160 }}
                        options={allCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))}
                    />
                    <Select
                        placeholder="Phase"
                        allowClear
                        value={phaseFilter}
                        onChange={setPhaseFilter}
                        style={{ width: 160 }}
                        options={allPhases.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))}
                    />
                    {(search || categoryFilter || phaseFilter) && (
                        <Tag color="blue">{filtered.length} results</Tag>
                    )}
                </Space>
            </Card>

            {/* â”€â”€ Lessons Table â”€â”€ */}
            <Card
                title={
                    <Space>
                        <BookOutlined style={{ color: themeColor }} />
                        <span style={{ fontWeight: 600 }}>Lessons Learned</span>
                        <Tag color="purple">{filtered.length}</Tag>
                    </Space>
                }
                style={glassCard}
            >
                {filtered.length === 0 ? (
                    <Empty
                        description={
                            lessons.length === 0
                                ? "No lessons recorded yet. Add lessons from individual project dashboards."
                                : "No lessons match your current filters."
                        }
                    />
                ) : (
                    <Table
                        dataSource={filtered}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size="small"
                        style={{ fontSize: 13 }}
                        onRow={(record) => ({
                            onClick: () => setViewingLesson(record),
                            style: { cursor: 'pointer' },
                        })}
                    />
                )}
            </Card>

            {/* â”€â”€ Detail Drawer â”€â”€ */}
            <Drawer
                title={
                    <Space>
                        <BulbOutlined style={{ color: '#f59e0b' }} />
                        <span>Lesson Details</span>
                    </Space>
                }
                width={600}
                open={!!viewingLesson}
                onClose={() => setViewingLesson(null)}
                extra={
                    viewingLesson?.project && (
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => router.push(`/admin/pm/dashboard?projectId=${viewingLesson.project.id}`)}
                        >
                            Open Project
                        </Button>
                    )
                }
            >
                {viewingLesson && (
                    <div>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Title">
                                <Text strong>{viewingLesson.title || 'Untitled'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Project">
                                {viewingLesson.project ? (
                                    <Tag icon={<FolderOpenOutlined />} color="geekblue">
                                        {viewingLesson.project.name} ({viewingLesson.project.project_number})
                                    </Tag>
                                ) : 'â€”'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Category">
                                {(() => {
                                    const cfg = CATEGORY_CONFIG[viewingLesson.category] || CATEGORY_CONFIG.other;
                                    return <Tag color={cfg.color} icon={cfg.icon}>{viewingLesson.category || 'other'}</Tag>;
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phase">
                                {viewingLesson.phase ? <Tag>{viewingLesson.phase}</Tag> : 'â€”'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Submitted By">
                                {viewingLesson.submitted_by || 'â€”'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Submitted Date">
                                {viewingLesson.submitted_date
                                    ? dayjs(viewingLesson.submitted_date).format('MMMM D, YYYY')
                                    : 'â€”'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Card
                            title={<Space><ExclamationCircleOutlined style={{ color: '#f59e0b' }} /> Situation</Space>}
                            size="small"
                            style={{ marginTop: 16, borderLeft: '3px solid #f59e0b' }}
                        >
                            <Paragraph style={{ margin: 0 }}>
                                {viewingLesson.situation || 'No situation described.'}
                            </Paragraph>
                        </Card>

                        <Card
                            title={<Space><WarningOutlined style={{ color: '#ef4444' }} /> Impact</Space>}
                            size="small"
                            style={{ marginTop: 12, borderLeft: '3px solid #ef4444' }}
                        >
                            <Paragraph style={{ margin: 0 }}>
                                {viewingLesson.impact || 'No impact described.'}
                            </Paragraph>
                        </Card>

                        <Card
                            title={<Space><BulbOutlined style={{ color: themeColor }} /> Lesson</Space>}
                            size="small"
                            style={{ marginTop: 12, borderLeft: `3px solid ${themeColor}` }}
                        >
                            <Paragraph style={{ margin: 0 }}>
                                {viewingLesson.lesson || 'No lesson documented.'}
                            </Paragraph>
                        </Card>

                        <Card
                            title={<Space><CheckCircleOutlined style={{ color: '#10b981' }} /> Recommendation</Space>}
                            size="small"
                            style={{ marginTop: 12, borderLeft: '3px solid #10b981' }}
                        >
                            <Paragraph style={{ margin: 0 }}>
                                {viewingLesson.recommendation || 'No recommendation provided.'}
                            </Paragraph>
                        </Card>

                        {(viewingLesson.tags || []).length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                    <TagOutlined /> Tags
                                </Text>
                                <Space size={4} wrap>
                                    {viewingLesson.tags.map((tag: string) => (
                                        <Tag key={tag} color="cyan">{tag}</Tag>
                                    ))}
                                </Space>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}





