"use client";

import React, { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    ProCard,
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormDateRangePicker,
    ModalForm,
    ProFormDigit,
    ProFormTextArea,
    ProFormInstance,
    PageContainer
} from "@ant-design/pro-components";
import {
    Button, message, Tag, Space, Select, Typography, Avatar, Dropdown,
    Popconfirm, Spin, Modal, List, Row, Col, Card, Empty, Badge, Tooltip, Input
} from "antd";
import {
    PlusOutlined, FireOutlined, ClockCircleOutlined, CheckCircleOutlined,
    MoreOutlined, UserOutlined, RobotOutlined, ReloadOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined,
    ProjectOutlined, ApartmentOutlined, SafetyCertificateOutlined,
    TeamOutlined, DollarOutlined, BugOutlined, FileProtectOutlined,
    FundProjectionScreenOutlined, ScheduleOutlined, ShoppingCartOutlined,
    AuditOutlined, SolutionOutlined, SearchOutlined, BookOutlined,
    ExperimentOutlined, RadarChartOutlined, TrophyOutlined, ToolOutlined,
    FlagOutlined, BankOutlined, GlobalOutlined, BarChartOutlined,
    ArrowLeftOutlined
} from "@ant-design/icons";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useSearchParams, useRouter } from "next/navigation";
import dayjs from "dayjs";

// Tab Components
import ProjectCharterTab from "./components/ProjectCharterTab";
import RiskRegisterTab from "./components/RiskRegisterTab";
import EvmTab from "./components/EvmTab";
import GanttTab from "./components/GanttTab";
import ScopeTab from "./components/ScopeTab";
import QualityTab from "./components/QualityTab";
import ResourceTab from "./components/ResourceTab";
import CommunicationsTab from "./components/CommunicationsTab";
import ProcurementTab from "./components/ProcurementTab";
import StakeholderTab from "./components/StakeholderTab";
import ChangeControlTab from "./components/ChangeControlTab";
import ScheduleTab from "./components/ScheduleTab";

// PMBOK 7 Tab Components
import PrinciplesTab from "./components/PrinciplesTab";
import PerformanceDomainsTab from "./components/PerformanceDomainsTab";
import BenefitsTab from "./components/BenefitsTab";
import TailoringTab from "./components/TailoringTab";

// PMBOK 8 Tab Components
import FocusAreasTab from "./components/FocusAreasTab";
import GovernanceTab from "./components/GovernanceTab";
import SustainabilityTab from "./components/SustainabilityTab";

const { Text, Title } = Typography;

// --- GRAPHQL ---
const GET_PROJECT = `
  query GetProjectDetails($id: ID!) {
    pmProject(id: $id) {
      id name projectNumber status priority budget spent
      methodology pmbokScopeEnabled pmbokCostEnabled pmbokRiskEnabled
      pmbokScheduleEnabled pmbokQualityEnabled pmbokResourceEnabled
      pmbokCommsEnabled pmbokProcurementEnabled pmbokStakeholderEnabled
      owner { firstName lastName avatarUrl }
    }
  }
`;

const GET_SPRINTS = `
  query GetSprints($projectId: String!) {
    pmSprints(projectId: $projectId) {
      id name goal status startDate endDate
    }
  }
`;

const GET_TASKS = `
  query GetTasks($tenantId: String!, $projectId: String, $sprintId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId, sprintId: $sprintId) {
      id title status priority type estimatedHours loggedHours startDate dueDate sprintId isArchived
      assignee { firstName lastName avatarUrl }
    }
  }
`;

const CREATE_SPRINT = `
  mutation CreateSprint($tenantId: String!, $input: CreatePmSprintInput!) {
    createPmSprint(tenantId: $tenantId, input: $input) { id name }
  }
`;

const CREATE_TASK = `
  mutation CreateTask($tenantId: String!, $input: CreatePmTaskInput!) {
    createPmTask(tenantId: $tenantId, input: $input) { id title status }
  }
`;

const UPDATE_TASK = `
  mutation UpdateTask($id: ID!, $input: UpdatePmTaskInput!) {
    updatePmTask(id: $id, input: $input) { id status priority type }
  }
`;

const AI_GENERATE_TASK = `
  query GenerateTaskDesc($title: String!) {
    generatePmTaskDescription(title: $title)
  }
`;

const AI_ANALYZE_SPRINT = `
  query AnalyzeSprint($sprintId: String!) {
    analyzePmSprintRisk(sprintId: $sprintId) {
      riskLevel riskScore summary
      identifiedRisks { taskTitle reason }
      recommendations
    }
  }
`;

const AI_GENERATE_RETRO = `
  query GenerateRetro($sprintId: String!) {
    generatePmSprintRetrospective(sprintId: $sprintId)
  }
`;

// --- Navigation Configuration ---
interface NavItem {
    key: string;
    label: string;
    icon: React.ReactNode;
    pmbokFlag?: string; // project flag to check
}

interface NavSection {
    title: string;
    badge?: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: "Execution",
        items: [
            { key: "sprint", label: "Kanban Board", icon: <DashboardOutlined /> },
            { key: "gantt", label: "Gantt Chart", icon: <BarChartOutlined /> },
        ]
    },
    {
        title: "PMBOK 6",
        badge: "11",
        items: [
            { key: "charter", label: "Project Charter", icon: <FileProtectOutlined />, pmbokFlag: "pmbokScopeEnabled" },
            { key: "scope", label: "Scope / WBS", icon: <ApartmentOutlined />, pmbokFlag: "pmbokScopeEnabled" },
            { key: "schedule", label: "Schedule", icon: <ScheduleOutlined />, pmbokFlag: "pmbokScheduleEnabled" },
            { key: "quality", label: "Quality", icon: <SafetyCertificateOutlined />, pmbokFlag: "pmbokQualityEnabled" },
            { key: "resources", label: "Resources", icon: <TeamOutlined />, pmbokFlag: "pmbokResourceEnabled" },
            { key: "communications", label: "Communications", icon: <SolutionOutlined />, pmbokFlag: "pmbokCommsEnabled" },
            { key: "risk", label: "Risk Register", icon: <BugOutlined />, pmbokFlag: "pmbokRiskEnabled" },
            { key: "procurement", label: "Procurement", icon: <ShoppingCartOutlined />, pmbokFlag: "pmbokProcurementEnabled" },
            { key: "stakeholders", label: "Stakeholders", icon: <TeamOutlined />, pmbokFlag: "pmbokStakeholderEnabled" },
            { key: "evm", label: "Cost / EVM", icon: <DollarOutlined />, pmbokFlag: "pmbokCostEnabled" },
            { key: "change_control", label: "Change Control", icon: <AuditOutlined /> },
        ]
    },
    {
        title: "PMBOK 7",
        badge: "4",
        items: [
            { key: "principles", label: "Principles", icon: <RadarChartOutlined /> },
            { key: "domains", label: "Performance Domains", icon: <FundProjectionScreenOutlined /> },
            { key: "benefits", label: "Benefits", icon: <TrophyOutlined /> },
            { key: "tailoring", label: "Tailoring", icon: <ToolOutlined /> },
        ]
    },
    {
        title: "PMBOK 8",
        badge: "3",
        items: [
            { key: "focus_areas", label: "Focus Areas", icon: <FlagOutlined /> },
            { key: "governance", label: "Governance", icon: <BankOutlined /> },
            { key: "sustainability", label: "Sustainability", icon: <GlobalOutlined /> },
        ]
    }
];

function PmDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get('projectId');
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // Navigation state
    const [showExplorer, setShowExplorer] = useState(true);
    const [activeTab, setActiveTab] = useState("sprint");

    // Core state
    const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
    const [isSprintModal, setIsSprintModal] = useState(false);
    const [isTaskModal, setIsTaskModal] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const formRef = React.useRef<ProFormInstance>(null);

    // Data States
    const [project, setProject] = useState<any>(null);
    const [sprints, setSprints] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projLoading, setProjLoading] = useState(true);
    const [tasksLoading, setTasksLoading] = useState(false);

    // AI States
    const [aiLoading, setAiLoading] = useState(false);
    const [aiTaskTitle, setAiTaskTitle] = useState("");
    const [sprintAnalysis, setSprintAnalysis] = useState<any>(null);
    const [isAnalysisModal, setIsAnalysisModal] = useState(false);
    const [retroContent, setRetroContent] = useState("");
    const [isRetroModal, setIsRetroModal] = useState(false);

    // --- DATA LOADERS ---
    const loadProjectAndSprints = useCallback(async () => {
        if (!projectId) return;
        setProjLoading(true);
        try {
            const pData = await gql(GET_PROJECT, { id: projectId });
            setProject(pData.pmProject);
            const sData = await gql(GET_SPRINTS, { projectId });
            const loadedSprints = sData.pmSprints || [];
            setSprints(loadedSprints);
            if (loadedSprints.length > 0 && !activeSprintId) {
                const active = loadedSprints.find((s: any) => s.status === 'active');
                setActiveSprintId(active ? active.id : loadedSprints[0].id);
            }
        } catch (error: any) {
            messageApi.error("Failed to load project details.");
        } finally {
            setProjLoading(false);
        }
    }, [projectId, activeSprintId, messageApi]);

    const loadTasks = useCallback(async () => {
        if (!projectId) return;
        setTasksLoading(true);
        try {
            const tData = await gql(GET_TASKS, {
                tenantId: DEFAULT_TENANT_ID,
                projectId,
                sprintId: activeSprintId || undefined
            });
            setTasks(tData.pmTasks || []);
        } catch (error: any) {
            messageApi.error("Failed to load tasks.");
        } finally {
            setTasksLoading(false);
        }
    }, [projectId, activeSprintId, messageApi]);

    useEffect(() => { loadProjectAndSprints(); }, [loadProjectAndSprints]);
    useEffect(() => { if (activeSprintId !== undefined) loadTasks(); }, [activeSprintId, loadTasks]);

    // Build filtered navigation based on project flags
    const filteredNavSections = useMemo(() => {
        if (!project) return NAV_SECTIONS;
        return NAV_SECTIONS.map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (!item.pmbokFlag) return true;
                // Treat null/undefined as enabled (default show); only hide when explicitly false
                return project[item.pmbokFlag] !== false;
            })
        })).filter(section => section.items.length > 0);
    }, [project]);

    // --- EMPTY STATE ---
    if (!projectId) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 24 }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <ProjectOutlined style={{ fontSize: 64, color: '#8b5cf6', opacity: 0.4 }} />
                </motion.div>
                <Title level={4} style={{ color: isDark ? '#a78bfa' : '#6d28d9', margin: 0 }}>No Project Selected</Title>
                <Text type="secondary">Select a project from the Projects list to view its dashboard.</Text>
                <Button
                    type="primary"
                    icon={<ProjectOutlined />}
                    onClick={() => router.push('/admin/pm/projects')}
                    style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        border: 'none',
                        borderRadius: 8,
                        height: 40,
                    }}
                >
                    Go to Projects
                </Button>
            </div>
        );
    }

    // Kanban
    const taskStatusMap = {
        todo: { title: "To Do", color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf620, #8b5cf610)" },
        in_progress: { title: "In Progress", color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f620, #3b82f610)" },
        review: { title: "In Review", color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b20, #f59e0b10)" },
        done: { title: "Done", color: "#10b981", gradient: "linear-gradient(135deg, #10b98120, #10b98110)" }
    };

    const getTasksByStatus = (status: string) => tasks.filter((t: any) => t.status === status);

    const onDragStart = (e: any, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        setDragActive(true);
    };
    const onDragOver = (e: any) => e.preventDefault();
    const onDrop = async (e: any, newStatus: string) => {
        setDragActive(false);
        const taskId = e.dataTransfer.getData("taskId");
        const draggedTask = tasks.find((t: any) => t.id === taskId);
        if (!draggedTask || draggedTask.status === newStatus) return;
        try {
            await gql(UPDATE_TASK, { id: taskId, input: { status: newStatus } });
            messageApi.success(`Task moved to ${taskStatusMap[newStatus as keyof typeof taskStatusMap].title}`);
            loadTasks();
        } catch (error) { messageApi.error("Failed to move task."); }
    };

    // AI handlers
    const handleAiTaskDescription = async () => {
        if (!aiTaskTitle?.trim()) { messageApi.warning("Please enter a task title first."); return; }
        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_TASK, { title: aiTaskTitle });
            if (data?.generatePmTaskDescription) {
                formRef.current?.setFieldsValue({ description: data.generatePmTaskDescription });
                messageApi.success("AI generated a description!");
            }
        } catch (error) { messageApi.error("AI Generation failed."); }
        finally { setAiLoading(false); }
    };

    const handleAiSprintAnalysis = async () => {
        if (!activeSprintId) { messageApi.warning("No active sprint selected."); return; }
        setAiLoading(true);
        try {
            const data = await gql(AI_ANALYZE_SPRINT, { sprintId: activeSprintId });
            setSprintAnalysis(data?.analyzePmSprintRisk);
            setIsAnalysisModal(true);
        } catch (error) { messageApi.error("AI Analysis failed."); }
        finally { setAiLoading(false); }
    };

    const handleAiSprintRetro = async () => {
        if (!activeSprintId) { messageApi.warning("No active sprint selected."); return; }
        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_RETRO, { sprintId: activeSprintId });
            setRetroContent(data?.generatePmSprintRetrospective);
            setIsRetroModal(true);
        } catch (error) { messageApi.error("AI Retrospective failed."); }
        finally { setAiLoading(false); }
    };

    const handleTaskFinish = async (values: any) => {
        try {
            await gql(CREATE_TASK, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId, title: values.title, description: values.description,
                    status: values.status, priority: values.priority, type: values.type,
                    estimatedHours: values.estimatedHours, sprintId: activeSprintId,
                }
            });
            messageApi.success("Task created");
            setIsTaskModal(false);
            loadTasks();
            return true;
        } catch (error: any) { messageApi.error(`Failed: ${error.message}`); return false; }
    };

    const handleSprintFinish = async (values: any) => {
        try {
            const input: any = { projectId, name: values.name, status: values.status };
            if (values.dateRange?.length === 2) {
                input.startDate = values.dateRange[0];
                input.endDate = values.dateRange[1];
            }
            await gql(CREATE_SPRINT, { tenantId: DEFAULT_TENANT_ID, input });
            messageApi.success("Sprint created");
            setIsSprintModal(false);
            loadProjectAndSprints();
            return true;
        } catch (error: any) { messageApi.error(`Failed: ${error.message}`); return false; }
    };

    // Priority border colors
    const getPriorityBorder = (priority: string) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return 'transparent';
        }
    };

    const renderTaskCard = (t: any) => (
        <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            draggable
            onDragStart={(e: any) => onDragStart(e, t.id)}
            style={{
                background: isDark ? 'rgba(30, 30, 44, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                padding: 14,
                marginBottom: 10,
                borderRadius: 10,
                border: isDark ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(0,0,0,0.06)',
                borderLeft: `3px solid ${getPriorityBorder(t.priority)}`,
                cursor: "grab",
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13 }}>{t.title}</Text>
                <Dropdown menu={{
                    items: [
                        { key: 'edit', label: 'Edit Task' },
                        { key: 'log', label: 'Log Time' },
                        { key: 'del', label: 'Delete', danger: true },
                    ]
                }}>
                    <MoreOutlined style={{ color: isDark ? '#a78bfa' : '#8b5cf6', cursor: 'pointer' }} />
                </Dropdown>
            </div>
            <Space size={4} style={{ marginBottom: 8 }}>
                {t.type === 'bug' && <Tag color="error" style={{ borderRadius: 6, fontSize: 10, padding: '0 6px' }}>Bug</Tag>}
                {t.type === 'story' && <Tag color="success" style={{ borderRadius: 6, fontSize: 10, padding: '0 6px' }}>Story</Tag>}
                {t.type === 'task' && <Tag color="purple" style={{ borderRadius: 6, fontSize: 10, padding: '0 6px' }}>Task</Tag>}
                {t.priority === 'high' && <FireOutlined style={{ color: '#ef4444', fontSize: 12 }} />}
            </Space>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888', display: "flex", alignItems: "center", gap: 4 }}>
                    <ClockCircleOutlined /> {t.loggedHours || 0} / {t.estimatedHours || 0}h
                </span>
                <Avatar size="small" icon={<UserOutlined />} src={t.assignee?.avatarUrl}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }} />
            </div>
        </motion.div>
    );

    // --- Render active tab content ---
    const renderTabContent = () => {
        switch (activeTab) {
            case "sprint":
                return (
                    <>
                        {/* Sprint header */}
                        <Card size="small"
                            style={{
                                background: isDark ? 'rgba(15, 15, 23, 0.6)' : 'rgba(255,255,255,0.7)',
                                backdropFilter: 'blur(12px)',
                                border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(0,0,0,0.06)',
                                borderRadius: 12,
                                marginBottom: 16,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space align="center" size="large">
                                    <span style={{ fontWeight: 600, fontSize: 13, background: 'linear-gradient(to right, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        Active Sprint:
                                    </span>
                                    <Select
                                        value={activeSprintId}
                                        style={{ width: 200 }}
                                        onChange={(val) => setActiveSprintId(val)}
                                        options={[
                                            { value: null as any, label: "Backlog (No Sprint)" },
                                            ...sprints.map((s: any) => ({ value: s.id, label: s.name }))
                                        ]}
                                    />
                                </Space>
                                <Space>
                                    <Button size="small" type="dashed" icon={<RobotOutlined />} onClick={handleAiSprintRetro} loading={aiLoading}>
                                        AI Retrospective
                                    </Button>
                                    <Button size="small" icon={<RobotOutlined />} onClick={handleAiSprintAnalysis} loading={aiLoading}>
                                        AI Risk Analysis
                                    </Button>
                                </Space>
                            </div>
                        </Card>

                        {/* Kanban Board */}
                        <div style={{
                            background: isDark ? 'rgba(15, 15, 23, 0.4)' : 'rgba(245,243,255,0.5)',
                            borderRadius: 12,
                            padding: 16,
                            border: isDark ? '1px solid rgba(139,92,246,0.1)' : '1px solid rgba(139,92,246,0.1)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, background: 'linear-gradient(to right, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Sprint Kanban Board
                                </span>
                                <Space>
                                    <Button size="small" type="text" icon={<ReloadOutlined />} onClick={loadTasks} />
                                    <Button size="small" onClick={() => setIsSprintModal(true)}>New Sprint</Button>
                                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsTaskModal(true)}
                                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', borderRadius: 8 }}>
                                        Create Task
                                    </Button>
                                </Space>
                            </div>

                            {tasksLoading ? (
                                <div style={{ textAlign: 'center', padding: 80 }}><Spin /></div>
                            ) : (
                                <div style={{ display: "flex", gap: 14, overflowX: "auto" }}>
                                    {Object.entries(taskStatusMap).map(([status, config]) => (
                                        <div
                                            key={status}
                                            onDragOver={onDragOver}
                                            onDrop={(e) => onDrop(e, status)}
                                            style={{
                                                flex: 1,
                                                minWidth: 260,
                                                background: isDark ? 'rgba(20, 20, 32, 0.5)' : 'rgba(255,255,255,0.4)',
                                                border: isDark ? '1px dashed rgba(139,92,246,0.2)' : '1px dashed rgba(139,92,246,0.15)',
                                                borderRadius: 12,
                                                padding: 12,
                                                display: "flex",
                                                flexDirection: "column",
                                                transition: 'background 0.2s ease',
                                            }}
                                        >
                                            {/* Column header */}
                                            <div style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                                marginBottom: 14, padding: '6px 10px',
                                                background: config.gradient,
                                                borderRadius: 8,
                                            }}>
                                                <Text strong style={{ fontSize: 12, color: config.color }}>{config.title}</Text>
                                                <Badge count={getTasksByStatus(status).length}
                                                    style={{ backgroundColor: config.color, fontSize: 10, boxShadow: 'none' }}
                                                    size="small" />
                                            </div>
                                            <div style={{ flex: 1, minHeight: 350 }}>
                                                {getTasksByStatus(status).map(renderTaskCard)}
                                                {getTasksByStatus(status).length === 0 && (
                                                    <div style={{
                                                        height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        opacity: 0.3, fontSize: 12, color: isDark ? '#64748b' : '#94a3b8'
                                                    }}>
                                                        Drop tasks here
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                );
            case "gantt":
                return <GanttTab sprints={sprints} tasks={tasks} projectId={projectId} />;
            case "charter":
                return <ProjectCharterTab projectId={projectId} />;
            case "scope":
                return <ScopeTab projectId={projectId} />;
            case "schedule":
                return <ScheduleTab projectId={projectId} />;
            case "quality":
                return <QualityTab projectId={projectId} />;
            case "resources":
                return <ResourceTab projectId={projectId} />;
            case "communications":
                return <CommunicationsTab projectId={projectId} />;
            case "risk":
                return <RiskRegisterTab projectId={projectId} />;
            case "procurement":
                return <ProcurementTab projectId={projectId} />;
            case "stakeholders":
                return <StakeholderTab projectId={projectId} />;
            case "evm":
                return <EvmTab projectId={projectId} />;
            case "change_control":
                return <ChangeControlTab projectId={projectId} />;
            // PMBOK 7
            case "principles":
                return <PrinciplesTab projectId={projectId} />;
            case "domains":
                return <PerformanceDomainsTab projectId={projectId} />;
            case "benefits":
                return <BenefitsTab projectId={projectId} />;
            case "tailoring":
                return <TailoringTab projectId={projectId} />;
            // PMBOK 8
            case "focus_areas":
                return <FocusAreasTab projectId={projectId} />;
            case "governance":
                return <GovernanceTab projectId={projectId} />;
            case "sustainability":
                return <SustainabilityTab projectId={projectId} />;
            default:
                return null;
        }
    };

    // Find active item label
    const activeItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.key === activeTab);

    return (
        <div className="relative" style={{ zIndex: 1 }}>
            {contextHolder}
            <div style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
                {/* ─── Left Side Navigation ─── */}
                <AnimatePresence mode="wait">
                    {showExplorer && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, x: -20 }}
                            animate={{ width: 260, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                            style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ position: 'sticky', top: 16 }}>
                                <Card
                                    size="small"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                Modules
                                            </span>
                                        </div>
                                    }
                                    extra={
                                        <Tooltip title="Collapse sidebar">
                                            <Button
                                                type="text" size="small"
                                                icon={<MenuFoldOutlined style={{ fontSize: 14 }} />}
                                                onClick={() => setShowExplorer(false)}
                                                className="text-gray-400 hover:text-violet-500"
                                            />
                                        </Tooltip>
                                    }
                                    style={{
                                        display: 'flex', flexDirection: 'column',
                                        minHeight: 'calc(100vh - 220px)',
                                        background: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                    }}
                                    className="dark:!bg-transparent dark:!border-none"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: { padding: '8px 0', flex: 1, overflow: 'auto' }
                                    }}
                                >
                                    {/* Project Info Bar */}
                                    {project && (
                                        <div style={{
                                            padding: '10px 12px',
                                            marginBottom: 8,
                                            background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
                                            borderRadius: 8,
                                            margin: '0 8px 12px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <ProjectOutlined style={{ color: '#8b5cf6', fontSize: 13 }} />
                                                <Text strong style={{ fontSize: 12, lineHeight: 1.2 }}>{project.name}</Text>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                <Tag bordered={false} style={{ fontSize: 10, borderRadius: 6, padding: '0 6px', margin: 0, background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                                                    {project.projectNumber}
                                                </Tag>
                                                <Tag bordered={false} color={project.status === 'active' ? 'green' : 'default'} style={{ fontSize: 10, borderRadius: 6, padding: '0 6px', margin: 0 }}>
                                                    {project.status?.toUpperCase()}
                                                </Tag>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation Sections */}
                                    <div className="px-1 custom-scrollbar overflow-x-hidden overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                                        {filteredNavSections.map((section, si) => (
                                            <div key={section.title} style={{ marginBottom: 8 }}>
                                                {/* Section Header */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '6px 12px 4px',
                                                    marginBottom: 2,
                                                }}>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                                        letterSpacing: 1,
                                                        color: isDark ? '#64748b' : '#94a3b8',
                                                    }}>
                                                        {section.title}
                                                    </span>
                                                    {section.badge && section.badge !== "Soon" && (
                                                        <span style={{
                                                            fontSize: 9, padding: '1px 6px', borderRadius: 10,
                                                            background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                                                            color: '#8b5cf6', fontWeight: 600,
                                                        }}>
                                                            {section.badge}
                                                        </span>
                                                    )}
                                                    {section.badge === "Soon" && (
                                                        <Tag bordered={false} style={{
                                                            fontSize: 9, padding: '0 5px', borderRadius: 6, margin: 0, lineHeight: '18px',
                                                            background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                                                            color: '#f59e0b',
                                                        }}>
                                                            Soon
                                                        </Tag>
                                                    )}
                                                </div>

                                                {/* Section Items */}
                                                {section.items.map(item => {
                                                    const isActive = activeTab === item.key;
                                                    const isDisabled = section.badge === "Soon";
                                                    return (
                                                        <motion.div
                                                            key={item.key}
                                                            whileHover={!isDisabled ? { x: 3 } : {}}
                                                            onClick={() => !isDisabled && setActiveTab(item.key)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 10,
                                                                padding: '7px 12px',
                                                                marginLeft: 4, marginRight: 4,
                                                                borderRadius: 8,
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                opacity: isDisabled ? 0.4 : 1,
                                                                background: isActive
                                                                    ? (isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)')
                                                                    : 'transparent',
                                                                borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid transparent',
                                                                transition: 'all 0.15s ease',
                                                                fontSize: 12,
                                                                fontWeight: isActive ? 600 : 400,
                                                                color: isActive
                                                                    ? '#8b5cf6'
                                                                    : (isDark ? '#94a3b8' : '#64748b'),
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontSize: 14,
                                                                color: isActive ? '#8b5cf6' : (isDark ? '#64748b' : '#94a3b8'),
                                                                transition: 'color 0.15s ease',
                                                            }}>
                                                                {item.icon}
                                                            </span>
                                                            <span style={{ flex: 1 }}>{item.label}</span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Back to Projects */}
                                    <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(139, 92, 246, 0.1)', marginTop: 'auto' }}>
                                        <Button
                                            type="text"
                                            block
                                            size="small"
                                            icon={<ArrowLeftOutlined />}
                                            onClick={() => router.push('/admin/pm/projects')}
                                            style={{
                                                fontSize: 12, color: isDark ? '#64748b' : '#94a3b8',
                                                borderRadius: 8, textAlign: 'left',
                                            }}
                                        >
                                            Back to Projects
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Main Content Area ─── */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Toolbar */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 16, padding: '0 4px',
                    }}>
                        <Space align="center" size={12}>
                            {!showExplorer && (
                                <Tooltip title="Show Explorer">
                                    <Button
                                        type="text" size="small"
                                        icon={<MenuUnfoldOutlined />}
                                        onClick={() => setShowExplorer(true)}
                                        style={{ fontSize: 16 }}
                                    />
                                </Tooltip>
                            )}
                            <span style={{
                                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 600, fontSize: 16,
                            }}>
                                {activeItem?.label || 'Dashboard'}
                            </span>
                            {activeItem && (
                                <span style={{ color: activeItem.key === activeTab ? '#8b5cf6' : '#94a3b8', fontSize: 16 }}>
                                    {activeItem.icon}
                                </span>
                            )}
                        </Space>

                        <Space>
                            <Button size="small" type="text" icon={<ReloadOutlined />}
                                onClick={() => { loadProjectAndSprints(); loadTasks(); }}
                                className="text-gray-400 hover:text-violet-500" />
                        </Space>
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {projLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                                    <Spin size="large" />
                                </div>
                            ) : (
                                renderTabContent()
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ─── Modals ─── */}
            <ModalForm title="New Sprint" open={isSprintModal} onOpenChange={setIsSprintModal} onFinish={handleSprintFinish}>
                <ProFormText name="name" label="Sprint Name" placeholder="e.g. Sprint 1" rules={[{ required: true }]} />
                <ProFormSelect name="status" label="Status" initialValue="active" options={[{ value: 'planned', label: 'Planned' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
                <ProFormDateRangePicker name="dateRange" label="Timeline" />
            </ModalForm>

            <ModalForm title="New Task" open={isTaskModal} formRef={formRef}
                onOpenChange={(open) => { setIsTaskModal(open); if (!open) setAiTaskTitle(""); }}
                onFinish={handleTaskFinish}>
                <ProFormText name="title" label="Task Title" rules={[{ required: true }]}
                    fieldProps={{ onChange: (e) => setAiTaskTitle(e.target.value) }} />
                <Space style={{ marginBottom: 24 }}>
                    <Button type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiTaskDescription}>
                        Auto-write Description with AI
                    </Button>
                </Space>
                <ProFormTextArea name="description" label="Description" placeholder="Task requirements..." />
                <ProForm.Group>
                    <ProFormSelect name="type" label="Type" width="sm" initialValue="task" options={[{ value: 'task', label: 'Task' }, { value: 'bug', label: 'Bug' }, { value: 'story', label: 'Story' }]} />
                    <ProFormSelect name="priority" label="Priority" width="sm" initialValue="medium" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
                    <ProFormSelect name="status" label="Status" width="sm" initialValue="todo" options={[{ value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' }, { value: 'review', label: 'In Review' }, { value: 'done', label: 'Done' }]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="estimatedHours" label="Estimated Hours" width="sm" />
                </ProForm.Group>
            </ModalForm>

            {/* AI Sprint Analysis Modal */}
            <Modal
                title={<Space><RobotOutlined style={{ color: '#8b5cf6' }} /><span>AI Sprint Risk Analysis</span></Space>}
                open={isAnalysisModal}
                onCancel={() => setIsAnalysisModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsAnalysisModal(false)}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none' }}>Got it</Button>]}
                width={700}
            >
                {sprintAnalysis && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 24 }}>
                            <Text type="secondary">Executive Summary</Text>
                            <div style={{ fontSize: 16, marginTop: 8 }}>{sprintAnalysis.summary}</div>
                        </div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <ProCard title="Risk Assessment" bordered>
                                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                                        <div style={{ fontSize: 48, fontWeight: 'bold', color: sprintAnalysis.riskScore > 50 ? '#ef4444' : '#10b981' }}>
                                            {sprintAnalysis.riskScore}/100
                                        </div>
                                        <Tag color={sprintAnalysis.riskLevel === 'critical' || sprintAnalysis.riskLevel === 'high' ? 'error' : (sprintAnalysis.riskLevel === 'medium' ? 'warning' : 'success')}>
                                            {sprintAnalysis.riskLevel?.toUpperCase()} RISK
                                        </Tag>
                                    </div>
                                </ProCard>
                            </Col>
                            <Col span={12}>
                                <ProCard title="Identified Risks" bordered>
                                    <List size="small" dataSource={sprintAnalysis.identifiedRisks}
                                        renderItem={(item: any) => (
                                            <List.Item>
                                                <List.Item.Meta title={item.taskTitle} description={item.reason} />
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: "No specific risks identified." }} />
                                </ProCard>
                            </Col>
                        </Row>
                        <div style={{ marginTop: 24 }}>
                            <Text strong>AI Recommendations</Text>
                            <List style={{ marginTop: 8 }} size="small" dataSource={sprintAnalysis.recommendations}
                                renderItem={(item: any) => <List.Item><CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} /> {item}</List.Item>} />
                        </div>
                    </div>
                )}
            </Modal>

            {/* AI Sprint Retrospective Modal */}
            <Modal
                title={<Space><RobotOutlined style={{ color: '#8b5cf6' }} /><span>AI Sprint Retrospective</span></Space>}
                open={isRetroModal}
                onCancel={() => setIsRetroModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsRetroModal(false)}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none' }}>Got it</Button>]}
                width={800}
            >
                <div style={{
                    marginTop: 16, padding: 16, borderRadius: 12, maxHeight: 600, overflowY: 'auto',
                    background: isDark ? 'rgba(15,15,23,0.6)' : '#fafafa',
                }}>
                    {retroContent ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: retroContent.replace(/\\n/g, '<br/>') }} />
                    ) : <Spin />}
                </div>
            </Modal>
        </div>
    );
}

export default function PmDashboardPage() {
    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>Project Management</AuroraText>}
            subTitle={
                <DecryptedText
                    text="PMBOK Dashboard — Sprint & Task Tracking"
                    animateOn="view"
                    revealDirection="center"
                    speed={50}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><Spin size="large" /></div>}>
                <PmDashboardContent />
            </Suspense>
        </CMSLayout>
    );
}
