"use client";

import React, { useState, useEffect, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import RbacGuard from "@/components/common/RbacGuard";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
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
    Empty, Badge, Avatar, Typography, theme, Input, Form
} from "antd";
import {
    PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined,
    FolderOpenOutlined, EyeOutlined, ReloadOutlined, DashboardOutlined,
    AppstoreOutlined, UnorderedListOutlined, ProjectOutlined,
    RocketOutlined, CheckCircleOutlined, ClockCircleOutlined,
    DollarOutlined, TeamOutlined, ExperimentOutlined,
    ThunderboltOutlined, AimOutlined, FlagOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined, BuildOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

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
      linkedDealIds
      linkedTicketIds
      owner {
        id
        firstName
        lastName
      }
      linkedDealIds
      linkedTicketIds
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
      linkedDealIds
      linkedTicketIds
    }
  }
`;

const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdatePmProjectInput!) {
    updatePmProject(id: $id, input: $input) {
      id
      name
      status
      linkedDealIds
      linkedTicketIds
    }
  }
`;

const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deletePmProject(id: $id)
  }
`;

// â”€â”€ PMBOK Edition Presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PMBOK_PRESETS: Record<string, { label: string; description: string; modules: string[] }> = {
    agile_light: {
        label: 'Agile Light',
        description: 'Minimal tracking â€” Kanban board only, no formal knowledge areas.',
        modules: [],
    },
    pmbok6_predictive: {
        label: 'PMBOK 6 â€” Predictive / Waterfall',
        description: 'Full 10 knowledge areas for plan-driven projects.',
        modules: ['integration', 'scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'procurement', 'stakeholder'],
    },
    pmbok7_adaptive: {
        label: 'PMBOK 7 â€” Principle-Based',
        description: '12 PMBOK 7 principles + 8 performance domains. Value-driven delivery.',
        modules: ['scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'stakeholder'],
    },
    pmbok8_integrated: {
        label: 'PMBOK 8 â€” Integrated / ESG',
        description: 'All PMBOK 6/7/8 features including Focus Areas, Governance & Sustainability.',
        modules: ['integration', 'scope', 'schedule', 'cost', 'quality', 'resource', 'comms', 'risk', 'procurement', 'stakeholder'],
    },
    hybrid: {
        label: 'Hybrid',
        description: 'Custom selection of knowledge areas. Good for mixed methodology teams.',
        modules: ['scope', 'schedule', 'cost', 'risk'],
    },
};

// â”€â”€ Status / Priority Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// Need state to parse URL params for auto-creation
const useUrlParams = () => {
  const [params, setParams] = useState<any>({});
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('createFromDeal')) {
        setParams({ dealId: searchParams.get('createFromDeal'), dealName: searchParams.get('dealName') });
      }
    }
  }, []);
  return params;
};

export default function ProjectsPage() {
    const urlParams = useUrlParams();
    const router = useRouter();
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
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
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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

    useEffect(() => {
        if (urlParams.dealId && !isModalOpen && !loading) {
            setIsModalOpen(true);
            form.setFieldsValue({ 
                name: `Delivery: ${urlParams.dealName || 'Project'}`, 
                linkedDealIds: [urlParams.dealId] 
            });
        }
    }, [urlParams, loading]);

    // ——— Glassmorphism styles —————————————————————————————————————————————————————
    const glassCard = useMemo(() => ({
        background: isDark ? 'rgba(15, 15, 23, 0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
    }), [isDark]);

    // â”€â”€ Computed stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // -- Filtered projects for grid view --
    const filteredProjects = useMemo(() => {
        let result = projects;
        if (filterStatus) result = result.filter(p => p.status === filterStatus);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.projectNumber?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [projects, filterStatus, searchQuery]);

    // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                linkedDealIds: values.linkedDealIds || [],
                linkedTicketIds: values.linkedTicketIds || [],
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

    // â”€â”€ Progress calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Table Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    { key: 'board', icon: <AppstoreOutlined />, label: 'Kanban Board', onClick: () => router.push(`/admin/pm/board?projectId=${record.id}`) },
                    { key: 'timeline', icon: <ClockCircleOutlined />, label: 'Timeline / Gantt', onClick: () => router.push(`/admin/pm/timeline?projectId=${record.id}`) },
                    { key: 'workload', icon: <TeamOutlined />, label: 'Team Workload', onClick: () => router.push(`/admin/pm/workload?projectId=${record.id}`) },
                    { key: 'bim3d', icon: <BuildOutlined />, label: '3D BIM Model', onClick: () => router.push(`/admin/pm/construction-3d?projectId=${record.id}`) },
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

    // â”€â”€ Stat Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Project Card (Grid View) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ProjectCard = ({ project }: { project: any }) => {
        const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
        const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;
        const methCfg = METHODOLOGY_LABELS[project.methodology] || METHODOLOGY_LABELS.hybrid;
        const progress = getProjectProgress(project);
        const budgetPct = project.budget > 0 ? Math.min(100, Math.round(((project.spent || 0) / project.budget) * 100)) : 0;
        const isOverdue = project.endDate && dayjs(project.endDate).isBefore(dayjs()) && project.status === 'active';

        const items: MenuProps['items'] = [
            { key: 'view', icon: <EyeOutlined />, label: 'View Details', onClick: () => setViewingProject(project) },
            { key: 'board', icon: <AppstoreOutlined />, label: 'Kanban Board', onClick: () => router.push(`/admin/pm/board?projectId=${project.id}`) },
            { key: 'timeline', icon: <ClockCircleOutlined />, label: 'Timeline / Gantt', onClick: () => router.push(`/admin/pm/timeline?projectId=${project.id}`) },
            { key: 'workload', icon: <TeamOutlined />, label: 'Team Workload', onClick: () => router.push(`/admin/pm/workload?projectId=${project.id}`) },
            { key: 'bim3d', icon: <BuildOutlined />, label: '3D BIM Model', onClick: () => router.push(`/admin/pm/construction-3d?projectId=${project.id}`) },
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

    // â”€â”€ PMBOK Preset Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Projects</AuroraText>}
            subTitle={<DecryptedText text="Manage all your project portfolios" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            {contextHolder}

            {/* â”€â”€ BentoGrid Stat Cards â”€â”€ */}
            <BentoGrid className="max-w-full mb-6">
                <BentoGridItem
                    title="Total Projects"
                    description="Portfolio scope"
                    icon={<ProjectOutlined style={{ color: themeColor }} />}
                    header={
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: themeColor }}>{stats.total}</div>
                            <div className="flex gap-1 flex-wrap justify-center mt-2 px-2">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                    const count = projects.filter(p => p.status === key).length;
                                    return count > 0 ? (
                                        <Tag key={key} style={{ borderRadius: 10, fontSize: 9, padding: '0 4px', margin: 0, background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                                            {count} {cfg.label}
                                        </Tag>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    }
                    className="col-span-4 lg:col-span-1"
                />
                
                <BentoGridItem
                    title="Active Projects"
                    description="Currently in progress"
                    icon={<RocketOutlined style={{ color: "#10b981" }} />}
                    header={
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: "#10b98115" }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{stats.active}</div>
                            <div className="mt-2">
                                {stats.overdue > 0 ? (
                                    <Tag color="red" style={{ borderRadius: 10, fontSize: 10 }}>{stats.overdue} overdue</Tag>
                                ) : (
                                    <span style={{ fontSize: 11, color: "rgba(16, 185, 129, 0.8)" }}>All on schedule âœ“</span>
                                )}
                            </div>
                        </div>
                    }
                    className="col-span-4 lg:col-span-1"
                />

                <BentoGridItem
                    title="Budget Utilization"
                    description="Total spent vs budget"
                    icon={<DollarOutlined style={{ color: stats.budgetPct > 90 ? "#ef4444" : "#f59e0b" }} />}
                    header={
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: stats.budgetPct > 90 ? "#ef444415" : "#f59e0b15" }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: stats.budgetPct > 90 ? "#ef4444" : "#f59e0b" }}>{stats.budgetPct}%</div>
                            <div className="mt-2 text-xs" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                                ${stats.totalSpent.toLocaleString()} / ${stats.totalBudget.toLocaleString()}
                            </div>
                        </div>
                    }
                    className="col-span-4 lg:col-span-1"
                />

                <BentoGridItem
                    title="Completed"
                    description="Successfully delivered"
                    icon={<CheckCircleOutlined style={{ color: "#22c55e" }} />}
                    header={
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: "#22c55e15" }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#22c55e" }}>{stats.completed}</div>
                            <div className="mt-2 w-3/4">
                                {stats.total > 0 && (
                                    <Progress percent={Math.round((stats.completed / stats.total) * 100)} size="small" showInfo={false} strokeColor={{ '0%': '#22c55e', '100%': '#4ade80' }} trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} />
                                )}
                            </div>
                        </div>
                    }
                    className="col-span-4 lg:col-span-1"
                />
            </BentoGrid>

            {/* -- Quick Filters + Search -- */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Tag
                            style={{
                                cursor: 'pointer', borderRadius: 12, fontSize: 11, padding: '2px 12px', margin: 0,
                                background: !filterStatus ? `${themeColor}20` : 'transparent',
                                color: !filterStatus ? themeColor : (isDark ? '#94a3b8' : '#64748b'),
                                border: !filterStatus ? `1px solid ${themeColor}44` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                fontWeight: !filterStatus ? 600 : 400,
                            }}
                            onClick={() => setFilterStatus(null)}
                        >
                            All ({stats.total})
                        </Tag>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                            const count = projects.filter(p => p.status === key).length;
                            if (count === 0) return null;
                            const isActive = filterStatus === key;
                            return (
                                <Tag
                                    key={key}
                                    style={{
                                        cursor: 'pointer', borderRadius: 12, fontSize: 11, padding: '2px 12px', margin: 0,
                                        background: isActive ? `${cfg.color}20` : 'transparent',
                                        color: isActive ? cfg.color : (isDark ? '#94a3b8' : '#64748b'),
                                        border: isActive ? `1px solid ${cfg.color}44` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                        fontWeight: isActive ? 600 : 400,
                                        transition: 'all 0.2s ease',
                                    }}
                                    onClick={() => setFilterStatus(isActive ? null : key)}
                                >
                                    {cfg.icon} {cfg.label} ({count})
                                </Tag>
                            );
                        })}
                        <div style={{ flex: 1 }} />
                        <Input
                            prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8' }} />}
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            allowClear
                            style={{ width: 220, borderRadius: 8 }}
                        />
                    </div>
                </Card>
            </motion.div>

            {/* ——— View Toggle + Actions ——— */}
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
                    <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'pm_projects', title: 'PM Projects Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'projectNumber' }, { header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Budget', key: 'budget' }, { header: 'Spent', key: 'spent' }], data: projects })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'pm_projects', title: 'PM Projects Report', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'projectNumber' }, { header: 'Name', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Priority', key: 'priority' }, { header: 'Budget', key: 'budget' }, { header: 'Spent', key: 'spent' }], data: projects })} /></Tooltip></RbacGuard>
                    <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>New Project</Button>
                </Space>
            </div>

            {/* â”€â”€ Grid View â”€â”€ */}
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
                        {filteredProjects.length === 0 ? (
                            <Col span={24}>
                                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                                    <Card style={{ ...glassCard, padding: 40, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2 }}>
                                        <Empty description={
                                            <span style={{ fontSize: 16, fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {searchQuery || filterStatus ? "No projects match your current filters" : "No projects found"}
                                            </span>
                                        } image={Empty.PRESENTED_IMAGE_SIMPLE}>
                                            {(searchQuery || filterStatus) && (
                                                <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => { setFilterStatus(null); setSearchQuery(""); }} style={{ marginTop: 16, borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}>
                                                    Clear All Filters
                                                </Button>
                                            )}
                                        </Empty>
                                    </Card>
                                </motion.div>
                            </Col>
                        ) : filteredProjects.map((project, index) => (
                            <Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3 }} style={{ height: '100%' }}>
                                    <ProjectCard project={project} />
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                )
            )}

            {/* â”€â”€ Table View â”€â”€ */}
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

            {/* â”€â”€ Create/Edit Modal with PMBOK Selector â”€â”€ */}
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
                            { label: 'ðŸ“‹ Planning', value: 'planning' },
                            { label: 'ðŸš€ Active', value: 'active' },
                            { label: 'â¸ï¸ Paused', value: 'paused' },
                            { label: 'âœ… Completed', value: 'completed' },
                            { label: 'âŒ Cancelled', value: 'cancelled' },
                        ]}
                    />
                    <ProFormSelect
                        name="priority"
                        label="Priority"
                        width="sm"
                        options={[
                            { label: 'ðŸ”´ Critical', value: 'critical' },
                            { label: 'ðŸŸ  High', value: 'high' },
                            { label: 'ðŸ”µ Medium', value: 'medium' },
                            { label: 'âšª Low', value: 'low' },
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
                                // Need to access form ref â€” handled via parent ModalForm
                                setSelectedPmbokPreset(val);
                            },
                        }}
                        options={Object.entries(PMBOK_PRESETS).map(([key, preset]) => ({
                            label: `${preset.label} â€” ${preset.description}`,
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
                        { label: 'ðŸ“‘ Integration (Project Charter)', value: 'integration' },
                        { label: 'ðŸŽ¯ Scope Management', value: 'scope' },
                        { label: 'ðŸ“… Schedule Management', value: 'schedule' },
                        { label: 'ðŸ’° Cost Management (EVM)', value: 'cost' },
                        { label: 'âœ… Quality Management', value: 'quality' },
                        { label: 'ðŸ‘¥ Resource Management', value: 'resource' },
                        { label: 'ðŸ“¢ Communications', value: 'comms' },
                        { label: 'âš ï¸ Risk Management', value: 'risk' },
                        { label: 'ðŸ›’ Procurement', value: 'procurement' },
                        { label: 'ðŸ¤ Stakeholder Management', value: 'stakeholder' },
                    ]}
                />

                <ProFormTextArea
                    name="description"
                    label="Description & Objectives"
                    width="xl"
                    placeholder="Describe the goals, scope, and deliverables of this project..."
                />
                
                <ProFormSelect
                    name="linkedDealIds"
                    label="Linked CRM Deals"
                    mode="tags"
                    placeholder="Enter Deal IDs to link"
                />
                <ProFormSelect
                    name="linkedTicketIds"
                    label="Linked ITSM Tickets"
                    mode="tags"
                    placeholder="Enter Ticket IDs to link"
                />
            </ModalForm>

            {/* â”€â”€ Detail Drawer â”€â”€ */}
            <Drawer
                title="Project Details"
                size={600}
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
                            {viewingProject.startDate ? dayjs(viewingProject.startDate).format("MMM D, YYYY") : "N/A"} â€”{" "}
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


