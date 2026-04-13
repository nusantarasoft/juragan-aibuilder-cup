"use client";

import React, { useState, useEffect, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    ProTable,
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormDateRangePicker,
    ProFormDigit,
    ProFormTextArea,
    ModalForm,
    ActionType,
    ProColumns
} from "@ant-design/pro-components";
import {
    Button, message, Tag, Space, Dropdown, MenuProps, Popconfirm,
    Drawer, Descriptions, Progress, Card, Row, Col, Tooltip, Segmented,
    Empty, Badge, Avatar, Typography, theme
} from "antd";
import {
    PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined,
    FolderOpenOutlined, EyeOutlined, ReloadOutlined, DashboardOutlined,
    AppstoreOutlined, UnorderedListOutlined, ProjectOutlined,
    RocketOutlined, CheckCircleOutlined, ClockCircleOutlined,
    DollarOutlined, TeamOutlined, ExperimentOutlined,
    ThunderboltOutlined, AimOutlined, FlagOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title } = Typography;

// --- GRAPHQL ---
const GET_PROJECTS = `
  query GetProjects($tenantId: String!, $status: String, $search: String) {
    pmProjects(tenantId: $tenantId, status: $status, search: $search) {
      id
      projectNumber
      name
      description
      status
      priority
      startDate
      endDate
      budget
      spent
      methodology
      pmbokEdition
      pmbokScopeEnabled
      pmbokScheduleEnabled
      pmbokCostEnabled
      pmbokQualityEnabled
      pmbokResourceEnabled
      pmbokCommsEnabled
      pmbokRiskEnabled
      pmbokProcurementEnabled
      pmbokStakeholderEnabled
      createdAt
      owner {
        id
        firstName
        lastName
      }
    }
  }
`;

const CREATE_PROJECT = `
  mutation CreateProject($tenantId: String!, $input: CreatePmProjectInput!) {
    createPmProject(tenantId: $tenantId, input: $input) {
      id
      projectNumber
      name
      status
    }
  }
`;

const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdatePmProjectInput!) {
    updatePmProject(id: $id, input: $input) {
      id
      name
      status
    }
  }
`;

const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deletePmProject(id: $id)
  }
`;

// ── PMBOK Edition Presets ────────────────────────────────────
const PMBOK_PRESETS: Record<string, { label: string; description: string; modules: string[] }> = {
    agile_light: {
        label: 'Agile Light',
        description: 'Minimal tracking — Kanban board only, no formal knowledge areas.',
        modules: [],
    },
    pmbok6_predictive: {
        label: 'PMBOK 6 — Predictive / Waterfall',
        description: 'Full 10 knowledge areas for plan-driven projects.',
        modules: ['integration', 'scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'procurement', 'stakeholder'],
    },
    pmbok7_adaptive: {
        label: 'PMBOK 7 — Principle-Based',
        description: '12 PMBOK 7 principles + 8 performance domains. Value-driven delivery.',
        modules: ['scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'stakeholder'],
    },
    pmbok8_integrated: {
        label: 'PMBOK 8 — Integrated / ESG',
        description: 'All PMBOK 6/7/8 features including Focus Areas, Governance & Sustainability.',
        modules: ['integration', 'scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'procurement', 'stakeholder'],
    },
    hybrid: {
        label: 'Hybrid',
        description: 'Custom selection of knowledge areas. Good for mixed methodology teams.',
        modules: ['scope', 'schedule', 'cost', 'risk'],
    },
};

// ── Status / Priority Config ────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; gradient: string; icon: React.ReactNode; label: string }> = {
    planning: { color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', icon: <ProjectOutlined />, label: 'Planning' },
    active: { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)', icon: <RocketOutlined />, label: 'Active' },
    paused: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', icon: <ClockCircleOutlined />, label: 'Paused' },
    completed: { color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #4ade80)', icon: <CheckCircleOutlined />, label: 'Completed' },
    cancelled: { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)', icon: <FlagOutlined />, label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    critical: { color: '#ef4444', icon: <ThunderboltOutlined /> },
    high: { color: '#f59e0b', icon: <AimOutlined /> },
    medium: { color: '#3b82f6', icon: <FlagOutlined /> },
    low: { color: '#6b7280', icon: <FlagOutlined /> },
};

const METHODOLOGY_LABELS: Record<string, { label: string; color: string }> = {
    agile: { label: 'Agile', color: '#06b6d4' },
    pmbok: { label: 'Predictive', color: '#6366f1' },
    hybrid: { label: 'Hybrid', color: 'var(--theme-color, #8b5cf6)' },
};

export default function ProjectsPage() {
    const router = useRouter();
    const { token } = theme.useToken();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { themeColor } = usePreferencesStore();
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [messageApi, contextHolder] = message.useMessage();
    const formRef = React.useRef<ActionType>(null);

    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [viewingProject, setViewingProject] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedPmbokPreset, setSelectedPmbokPreset] = useState<string | null>(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID });
            setProjects(data.pmProjects || []);
        } catch (error) {
            messageApi.error("Failed to load projects.");
        } finally {
            setLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Glassmorphism styles ──────────────────────────────────
    const glassCard = useMemo(() => ({
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
    }), [isDark]);

    // ── Computed stats ────────────────────────────────────────
    const stats = useMemo(() => {
        const active = projects.filter(p => p.status === 'active').length;
        const completed = projects.filter(p => p.status === 'completed').length;
        const total = projects.length;
        const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
        const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
        const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        const overdue = projects.filter(p => p.endDate && dayjs(p.endDate).isBefore(dayjs()) && p.status === 'active').length;
        return { active, completed, total, totalBudget, totalSpent, budgetPct, overdue };
    }, [projects]);

    // ── Handlers ──────────────────────────────────────────────
    const handleAdd = () => {
        setEditingProject(null);
        setSelectedPmbokPreset(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: any) => {
        setEditingProject(record);
        setSelectedPmbokPreset(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(DELETE_PROJECT, { id });
            messageApi.success("Project deleted successfully");
            loadData();
        } catch (error: any) {
            messageApi.error(`Failed to delete: ${error.message}`);
        }
    };

    const handleOpenDashboard = (id: string) => {
        router.push(`/admin/pm/dashboard?projectId=${id}`);
    };

    const handleFinish = async (values: any) => {
        try {
            const input: any = {
                name: values.name,
                description: values.description,
                status: values.status,
                priority: values.priority,
                budget: values.budget,
                methodology: values.methodology || 'hybrid',
            };

            // Map pmbokModules array to boolean fields
            if (values.pmbokModules) {
                input.pmbokScopeEnabled = values.pmbokModules.includes('scope');
                input.pmbokScheduleEnabled = values.pmbokModules.includes('schedule');
                input.pmbokCostEnabled = values.pmbokModules.includes('cost');
                input.pmbokQualityEnabled = values.pmbokModules.includes('quality');
                input.pmbokResourceEnabled = values.pmbokModules.includes('resource');
                input.pmbokCommsEnabled = values.pmbokModules.includes('comms');
                input.pmbokRiskEnabled = values.pmbokModules.includes('risk');
                input.pmbokProcurementEnabled = values.pmbokModules.includes('procurement');
                input.pmbokStakeholderEnabled = values.pmbokModules.includes('stakeholder');
            }

            if (values.dateRange && values.dateRange.length === 2) {
                input.startDate = values.dateRange[0];
                input.endDate = values.dateRange[1];
            }

            if (editingProject) {
                await gql(UPDATE_PROJECT, { id: editingProject.id, input });
                messageApi.success("Project updated successfully");
            } else {
                await gql(CREATE_PROJECT, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success("Project created successfully");
            }
            setIsModalOpen(false);
            loadData();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed to save: ${error.message}`);
            return false;
        }
    };

    // ── Progress calculation ──────────────────────────────────
    const getProjectProgress = (project: any) => {
        if (!project.startDate || !project.endDate) return 0;
        const start = dayjs(project.startDate);
        const end = dayjs(project.endDate);
        const now = dayjs();
        if (project.status === 'completed') return 100;
        if (now.isBefore(start)) return 0;
        const total = end.diff(start, 'day');
        const elapsed = now.diff(start, 'day');
        return total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
    };

    const getBudgetBurnColor = (pct: number) => {
        if (pct >= 90) return '#ef4444';
        if (pct >= 70) return '#f59e0b';
        return '#10b981';
    };

    // ── Table Columns ─────────────────────────────────────────
    const columns: ProColumns<any>[] = [
        {
            title: "Project",
            dataIndex: "projectNumber",
            width: "30%",
            render: (_, record) => (
                <Space>
                    <FolderOpenOutlined style={{ fontSize: 20, color: themeColor }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <a onClick={() => handleOpenDashboard(record.id)} style={{ fontWeight: 600, fontSize: 15 }}>
                            {record.name}
                        </a>
                        <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888' }}>{record.projectNumber}</span>
                    </div>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            valueType: "select",
            valueEnum: {
                planning: { text: 'Planning', status: 'Default' },
                active: { text: 'Active', status: 'Processing' },
                paused: { text: 'Paused', status: 'Warning' },
                completed: { text: 'Completed', status: 'Success' },
                cancelled: { text: 'Cancelled', status: 'Error' },
            },
            render: (_, record) => {
                const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.planning;
                return <Tag color={cfg.color}>{cfg.label.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Priority",
            dataIndex: "priority",
            render: (_, record) => {
                const cfg = PRIORITY_CONFIG[record.priority] || PRIORITY_CONFIG.medium;
                return <Tag color={cfg.color}>{record.priority?.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Budget Burn",
            hideInSearch: true,
            width: '15%',
            render: (_, record) => {
                if (!record.budget || record.budget === 0) return "-";
                const spent = record.spent || 0;
                const percent = Math.min(100, Math.round((spent / record.budget) * 100));
                return (
                    <div style={{ width: 120 }}>
                        <Progress percent={percent} size="small" showInfo={false}
                            strokeColor={getBudgetBurnColor(percent)} />
                        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#666', marginTop: 4 }}>
                            ${spent.toLocaleString()} / ${record.budget.toLocaleString()}
                        </div>
                    </div>
                );
            }
        },
        {
            title: "Timeline",
            hideInSearch: true,
            render: (_, record) => {
                if (!record.startDate || !record.endDate) return "-";
                return (
                    <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#555' }}>
                        {dayjs(record.startDate).format("MMM D, YYYY")} - {dayjs(record.endDate).format("MMM D, YYYY")}
                    </span>
                );
            }
        },
        {
            title: "Owner",
            dataIndex: ["owner", "firstName"],
            hideInSearch: true,
            render: (_, record) => (
                <span>
                    {record.owner ? `${record.owner.firstName} ${record.owner.lastName}` : "Unassigned"}
                </span>
            )
        },
        {
            title: "Actions",
            valueType: "option",
            key: "option",
            render: (text, record) => {
                const items: MenuProps['items'] = [
                    { key: 'view', icon: <EyeOutlined />, label: 'View Details', onClick: () => setViewingProject(record) },
                    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Open Dashboard', onClick: () => handleOpenDashboard(record.id) },
                    { key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: () => handleEdit(record) },
                    { type: 'divider' },
                    {
                        key: 'delete', icon: <DeleteOutlined style={{ color: 'red' }} />,
                        label: (
                            <Popconfirm title="Delete this project?" description="This action cannot be undone." onConfirm={() => handleDelete(record.id)}>
                                <span style={{ color: 'red' }}>Delete</span>
                            </Popconfirm>
                        ),
                    },
                ];
                return <Dropdown menu={{ items }} trigger={['click']}><Button type="text" icon={<MoreOutlined />} /></Dropdown>;
            },
        },
    ];

    // ── Stat Card Component ───────────────────────────────────
    const StatCard = ({ title, value, suffix, icon, gradient, extra }: {
        title: string; value: number | string; suffix?: string;
        icon: React.ReactNode; gradient: string; extra?: React.ReactNode;
    }) => (
        <Card
            size="small"
            style={{
                ...glassCard,
                overflow: 'hidden',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            styles={{ body: { padding: '20px 16px', position: 'relative', zIndex: 1 } }}
            hoverable
        >
            <div
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                    background: gradient, borderRadius: '16px 16px 0 0',
                }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
                    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginTop: 4, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {value}{suffix && <span style={{ fontSize: 18 }}>{suffix}</span>}
                    </div>
                </div>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#fff', opacity: 0.85
                }}>
                    {icon}
                </div>
            </div>
            {extra && <div style={{ marginTop: 10 }}>{extra}</div>}
        </Card>
    );

    // ── Project Card (Grid View) ──────────────────────────────
    const ProjectCard = ({ project }: { project: any }) => {
        const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
        const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;
        const methCfg = METHODOLOGY_LABELS[project.methodology] || METHODOLOGY_LABELS.hybrid;
        const progress = getProjectProgress(project);
        const budgetPct = project.budget > 0 ? Math.min(100, Math.round(((project.spent || 0) / project.budget) * 100)) : 0;
        const isOverdue = project.endDate && dayjs(project.endDate).isBefore(dayjs()) && project.status === 'active';

        const items: MenuProps['items'] = [
            { key: 'view', icon: <EyeOutlined />, label: 'View Details', onClick: () => setViewingProject(project) },
            { key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: () => handleEdit(project) },
            { type: 'divider' },
            {
                key: 'delete', icon: <DeleteOutlined style={{ color: 'red' }} />,
                label: (
                    <Popconfirm title="Delete project?" description="This action cannot be undone." onConfirm={() => handleDelete(project.id)}>
                        <span style={{ color: 'red' }}>Delete</span>
                    </Popconfirm>
                ),
            },
        ];

        return (
            <Card
                hoverable
                onClick={() => handleOpenDashboard(project.id)}
                style={{
                    ...glassCard,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    height: '100%',
                }}
                styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
                {/* Card Top Accent */}
                <div style={{
                    height: 4, background: statusCfg.gradient,
                    borderRadius: '16px 16px 0 0',
                }} />

                <div style={{ padding: '16px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Text type="secondary" style={{ fontSize: 11, letterSpacing: 0.3 }}>{project.projectNumber}</Text>
                            <div style={{
                                fontSize: 15, fontWeight: 700, lineHeight: '20px',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                            }}>
                                {project.name}
                            </div>
                        </div>
                        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                            <Button type="text" size="small" icon={<MoreOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{ marginLeft: 8, marginTop: -4 }}
                            />
                        </Dropdown>
                    </div>

                    {/* Tags Row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        <Tag style={{ borderRadius: 12, fontSize: 11, lineHeight: '18px', padding: '0 8px', margin: 0, background: statusCfg.color + '18', color: statusCfg.color, border: `1px solid ${statusCfg.color}33` }}>
                            {statusCfg.label}
                        </Tag>
                        <Tag style={{ borderRadius: 12, fontSize: 11, lineHeight: '18px', padding: '0 8px', margin: 0, background: priorityCfg.color + '18', color: priorityCfg.color, border: `1px solid ${priorityCfg.color}33` }}>
                            {(project.priority || 'medium').toUpperCase()}
                        </Tag>
                        <Tag style={{ borderRadius: 12, fontSize: 11, lineHeight: '18px', padding: '0 8px', margin: 0, background: methCfg.color + '18', color: methCfg.color, border: `1px solid ${methCfg.color}33` }}>
                            {methCfg.label}
                        </Tag>
                        {isOverdue && (
                            <Tag style={{ borderRadius: 12, fontSize: 11, lineHeight: '18px', padding: '0 8px', margin: 0, background: '#ef444418', color: '#ef4444', border: '1px solid #ef444433' }}>
                                OVERDUE
                            </Tag>
                        )}
                    </div>

                    {/* Description */}
                    {project.description && (
                        <Text type="secondary" style={{
                            fontSize: 12, lineHeight: '16px', marginBottom: 12,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                        }}>
                            {project.description}
                        </Text>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Progress Ring */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Tooltip title={`Timeline Progress: ${progress}%`}>
                            <Progress
                                type="circle"
                                percent={progress}
                                size={48}
                                strokeWidth={8}
                                strokeColor={{
                                    '0%': statusCfg.color,
                                    '100%': statusCfg.color + 'cc',
                                }}
                                trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                format={(pct) => <span style={{ fontSize: 11, fontWeight: 700 }}>{pct}%</span>}
                            />
                        </Tooltip>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {project.budget > 0 ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={{ fontSize: 11 }}>Budget</Text>
                                        <Text style={{ fontSize: 11, color: getBudgetBurnColor(budgetPct) }}>{budgetPct}%</Text>
                                    </div>
                                    <Progress
                                        percent={budgetPct}
                                        size="small"
                                        showInfo={false}
                                        strokeColor={getBudgetBurnColor(budgetPct)}
                                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                    />
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                        ${(project.spent || 0).toLocaleString()} / ${project.budget.toLocaleString()}
                                    </Text>
                                </>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 11 }}>No budget set</Text>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                        paddingTop: 10,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar size={22} style={{ background: statusCfg.color, fontSize: 10 }}>
                                {project.owner ? `${project.owner.firstName?.[0]}${project.owner.lastName?.[0]}` : '?'}
                            </Avatar>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {project.owner ? `${project.owner.firstName} ${project.owner.lastName}` : 'Unassigned'}
                            </Text>
                        </div>
                        {project.endDate && (
                            <Tooltip title={`Due: ${dayjs(project.endDate).format('MMM D, YYYY')}`}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    {dayjs(project.endDate).format('MMM D')}
                                </Text>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    // ── PMBOK Preset Handler ──────────────────────────────────
    const handlePmbokPresetChange = (presetKey: string, form: any) => {
        setSelectedPmbokPreset(presetKey);
        const preset = PMBOK_PRESETS[presetKey];
        if (preset) {
            form.setFieldsValue({ pmbokModules: preset.modules });
            // Auto-set methodology based on preset
            if (presetKey === 'agile_light') form.setFieldsValue({ methodology: 'agile' });
            else if (presetKey === 'pmbok6_predictive') form.setFieldsValue({ methodology: 'pmbok' });
            else form.setFieldsValue({ methodology: 'hybrid' });
        }
    };

    return (
        <CMSLayout title="Projects" subTitle="Manage all your project portfolios">
            {contextHolder}

            {/* ── Gradient Stat Cards ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Total Projects"
                        value={stats.total}
                        icon={<ProjectOutlined />}
                        gradient={`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`}
                        extra={
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                    const count = projects.filter(p => p.status === key).length;
                                    return count > 0 ? (
                                        <Tag key={key} style={{
                                            borderRadius: 10, fontSize: 10, lineHeight: '16px',
                                            padding: '0 6px', margin: 0, background: cfg.color + '18',
                                            color: cfg.color, border: `1px solid ${cfg.color}33`
                                        }}>
                                            {count} {cfg.label}
                                        </Tag>
                                    ) : null;
                                })}
                            </div>
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Active Projects"
                        value={stats.active}
                        icon={<RocketOutlined />}
                        gradient="linear-gradient(135deg, #10b981, #34d399)"
                        extra={
                            stats.overdue > 0 ? (
                                <Tag color="red" style={{ borderRadius: 10, fontSize: 10 }}>
                                    {stats.overdue} overdue
                                </Tag>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 11 }}>All on schedule ✓</Text>
                            )
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Budget Utilization"
                        value={stats.budgetPct}
                        suffix="%"
                        icon={<DollarOutlined />}
                        gradient={stats.budgetPct > 90
                            ? 'linear-gradient(135deg, #ef4444, #f87171)'
                            : 'linear-gradient(135deg, #f59e0b, #fbbf24)'}
                        extra={
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                ${stats.totalSpent.toLocaleString()} / ${stats.totalBudget.toLocaleString()}
                            </Text>
                        }
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Completed"
                        value={stats.completed}
                        icon={<CheckCircleOutlined />}
                        gradient="linear-gradient(135deg, #22c55e, #4ade80)"
                        extra={
                            stats.total > 0 ? (
                                <Progress
                                    percent={Math.round((stats.completed / stats.total) * 100)}
                                    size="small" showInfo={false}
                                    strokeColor={{ '0%': '#22c55e', '100%': '#4ade80' }}
                                    trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                                />
                            ) : null
                        }
                    />
                </Col>
            </Row>

            {/* ── View Toggle + Actions ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Segmented
                    value={viewMode}
                    onChange={(val) => setViewMode(val as 'grid' | 'table')}
                    options={[
                        { value: 'grid', icon: <AppstoreOutlined />, label: 'Cards' },
                        { value: 'table', icon: <UnorderedListOutlined />, label: 'Table' },
                    ]}
                />
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>Reload</Button>
                    <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>New Project</Button>
                </Space>
            </div>

            {/* ── Grid View ── */}
            {viewMode === 'grid' && (
                projects.length === 0 ? (
                    <Card style={{ ...glassCard, padding: 48, textAlign: 'center' }}>
                        <div style={{ marginBottom: 16 }}>
                            <ProjectOutlined style={{ fontSize: 64, color: isDark ? '#6366f1' : 'var(--theme-color, #8b5cf6)', opacity: 0.6 }} />
                        </div>
                        <Title level={4} style={{ marginBottom: 8 }}>No projects yet</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                            Start by creating your first project. Choose a PMBOK framework to automatically
                            configure the right knowledge areas for your team.
                        </Text>
                        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd}
                            style={{ borderRadius: 12, height: 44, paddingLeft: 24, paddingRight: 24 }}>
                            Create Your First Project
                        </Button>
                    </Card>
                ) : (
                    <Row gutter={[16, 16]}>
                        {projects.map(project => (
                            <Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
                                <ProjectCard project={project} />
                            </Col>
                        ))}
                    </Row>
                )
            )}

            {/* ── Table View ── */}
            {viewMode === 'table' && (
                <ProTable
                    actionRef={formRef}
                    columns={columns}
                    dataSource={projects}
                    loading={loading}
                    rowKey="id"
                    search={{ layout: "vertical", defaultCollapsed: false }}
                    pagination={{ pageSize: 10 }}
                    toolBarRender={false}
                />
            )}

            {/* ── Create/Edit Modal with PMBOK Selector ── */}
            <ModalForm
                title={editingProject ? "Edit Project" : "New Project"}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleFinish}
                initialValues={editingProject ? {
                    ...editingProject,
                    dateRange: editingProject.startDate && editingProject.endDate
                        ? [editingProject.startDate, editingProject.endDate] : undefined,
                    pmbokModules: [
                        editingProject.pmbokScopeEnabled && 'scope',
                        editingProject.pmbokScheduleEnabled && 'schedule',
                        editingProject.pmbokCostEnabled && 'cost',
                        editingProject.pmbokQualityEnabled && 'quality',
                        editingProject.pmbokResourceEnabled && 'resource',
                        editingProject.pmbokCommsEnabled && 'comms',
                        editingProject.pmbokRiskEnabled && 'risk',
                        editingProject.pmbokProcurementEnabled && 'procurement',
                        editingProject.pmbokStakeholderEnabled && 'stakeholder',
                    ].filter(Boolean)
                } : { status: 'planning', priority: 'medium', methodology: 'hybrid' }}
                modalProps={{ destroyOnClose: true, width: 680 }}
            >
                <ProForm.Group>
                    <ProFormText
                        name="name"
                        label="Project Name"
                        width="lg"
                        rules={[{ required: true, message: "Please enter a project name" }]}
                        placeholder="e.g., ERP Migration Phase 2"
                    />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormSelect
                        name="status"
                        label="Status"
                        width="sm"
                        options={[
                            { label: '📋 Planning', value: 'planning' },
                            { label: '🚀 Active', value: 'active' },
                            { label: '⏸️ Paused', value: 'paused' },
                            { label: '✅ Completed', value: 'completed' },
                            { label: '❌ Cancelled', value: 'cancelled' },
                        ]}
                    />
                    <ProFormSelect
                        name="priority"
                        label="Priority"
                        width="sm"
                        options={[
                            { label: '🔴 Critical', value: 'critical' },
                            { label: '🟠 High', value: 'high' },
                            { label: '🔵 Medium', value: 'medium' },
                            { label: '⚪ Low', value: 'low' },
                        ]}
                    />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormDateRangePicker name="dateRange" label="Project Timeline" width="md" />
                    <ProFormDigit name="budget" label="Budget ($)" width="md" min={0} fieldProps={{ precision: 2 }} />
                </ProForm.Group>

                {/* PMBOK Version Selector */}
                <div style={{
                    marginBottom: 24, padding: 16, borderRadius: 12,
                    background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
                    border: isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(99, 102, 241, 0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <ExperimentOutlined style={{ color: themeColor, fontSize: 16 }} />
                        <Text strong style={{ fontSize: 14 }}>PMBOK Framework Preset</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                        Choose a framework preset to auto-configure knowledge areas, or customize manually below.
                    </Text>
                    <ProFormSelect
                        name="pmbokPreset"
                        width="xl"
                        fieldProps={{
                            onChange: (val: string) => {
                                // Need to access form ref — handled via parent ModalForm
                                setSelectedPmbokPreset(val);
                            },
                        }}
                        options={Object.entries(PMBOK_PRESETS).map(([key, preset]) => ({
                            label: `${preset.label} — ${preset.description}`,
                            value: key,
                        }))}
                        placeholder="Select a preset to auto-fill modules..."
                    />
                </div>

                <ProForm.Group>
                    <ProFormSelect
                        name="methodology"
                        label="Methodology Framework"
                        width="sm"
                        options={[
                            { label: 'Agile (Scrum/Kanban)', value: 'agile' },
                            { label: 'Predictive (PMBOK 6)', value: 'pmbok' },
                            { label: 'Hybrid', value: 'hybrid' },
                        ]}
                        tooltip="Select the core framework that drives this project."
                        rules={[{ required: true }]}
                    />
                </ProForm.Group>

                <ProFormSelect
                    mode="multiple"
                    name="pmbokModules"
                    label="Active PMBOK 6 Knowledge Areas"
                    tooltip="Select which project management disciplines to track. Presets auto-fill this list."
                    width="xl"
                    options={[
                        { label: '📑 Integration (Project Charter)', value: 'integration' },
                        { label: '🎯 Scope Management', value: 'scope' },
                        { label: '📅 Schedule Management', value: 'schedule' },
                        { label: '💰 Cost Management (EVM)', value: 'cost' },
                        { label: '✅ Quality Management', value: 'quality' },
                        { label: '👥 Resource Management', value: 'resource' },
                        { label: '📢 Communications', value: 'comms' },
                        { label: '⚠️ Risk Management', value: 'risk' },
                        { label: '🛒 Procurement', value: 'procurement' },
                        { label: '🤝 Stakeholder Management', value: 'stakeholder' },
                    ]}
                />

                <ProFormTextArea
                    name="description"
                    label="Description & Objectives"
                    width="xl"
                    placeholder="Describe the goals, scope, and deliverables of this project..."
                />
            </ModalForm>

            {/* ── Detail Drawer ── */}
            <Drawer
                title="Project Details"
                width={600}
                open={!!viewingProject}
                onClose={() => setViewingProject(null)}
                extra={
                    <Button type="primary" onClick={() => handleOpenDashboard(viewingProject?.id)}>
                        Go to Dashboard
                    </Button>
                }
            >
                {viewingProject && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="Project Number">{viewingProject.projectNumber}</Descriptions.Item>
                        <Descriptions.Item label="Name">{viewingProject.name}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={(STATUS_CONFIG[viewingProject.status] || STATUS_CONFIG.planning).color}>
                                {viewingProject.status?.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Priority">
                            <Tag color={(PRIORITY_CONFIG[viewingProject.priority] || PRIORITY_CONFIG.medium).color}>
                                {viewingProject.priority?.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Methodology">
                            <Tag color={(METHODOLOGY_LABELS[viewingProject.methodology] || METHODOLOGY_LABELS.hybrid).color}>
                                {viewingProject.methodology?.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Timeline">
                            {viewingProject.startDate ? dayjs(viewingProject.startDate).format("MMM D, YYYY") : "N/A"} —{" "}
                            {viewingProject.endDate ? dayjs(viewingProject.endDate).format("MMM D, YYYY") : "N/A"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Budget">${viewingProject.budget?.toLocaleString() || 0}</Descriptions.Item>
                        <Descriptions.Item label="Spent">${viewingProject.spent?.toLocaleString() || 0}</Descriptions.Item>
                        <Descriptions.Item label="Description">{viewingProject.description || "No description provided."}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}
