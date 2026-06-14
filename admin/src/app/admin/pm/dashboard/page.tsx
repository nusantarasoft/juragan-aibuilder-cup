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
    Button, message, Tag, Space, Select, Typography, Avatar,
    Spin, Modal, List, Row, Col, Card, Empty, Badge, Tooltip, Input
} from "antd";
import {
    PlusOutlined, FireOutlined, ClockCircleOutlined, CheckCircleOutlined,
    UserOutlined, RobotOutlined, ReloadOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined,
    ProjectOutlined, ApartmentOutlined, SafetyCertificateOutlined,
    TeamOutlined, DollarOutlined, BugOutlined, FileProtectOutlined,
    FundProjectionScreenOutlined, ScheduleOutlined, ShoppingCartOutlined,
    AuditOutlined, SolutionOutlined, SearchOutlined, BookOutlined,
    ExperimentOutlined, RadarChartOutlined, TrophyOutlined, ToolOutlined,
    FlagOutlined, BankOutlined, GlobalOutlined, BarChartOutlined,
    SwapOutlined, FormOutlined
} from "@ant-design/icons";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useSearchParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import FormIntegrationWidget from "@/components/forms/FormIntegrationWidget";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

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
import SprintAnalyticsTab from "./components/SprintAnalyticsTab";
import KanbanBoard from "./components/KanbanBoard";
import PortfolioDashboard from "./components/PortfolioDashboard";
import AiInsightsTab from "./components/AiInsightsTab";
import PmCommandPalette from "./components/PmCommandPalette";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// --- GRAPHQL ---
const GET_PROJECTS_LIST = `
  query GetProjectsList($tenantId: String!) {
    pmProjects(tenantId: $tenantId) {
      id name projectNumber status priority budget spent methodology
      startDate endDate
      owner { firstName lastName avatarUrl }
    }
  }
`;

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
        title: "Work",
        items: [
            { key: "ai_insights", label: "AI Insights", icon: <RobotOutlined /> },
            { key: "sprint", label: "Kanban Board", icon: <DashboardOutlined /> },
            { key: "analytics", label: "Sprint Analytics", icon: <BarChartOutlined /> },
            { key: "gantt", label: "Gantt Chart", icon: <FundProjectionScreenOutlined /> },
            { key: "forms", label: "Forms & Checklists", icon: <FormOutlined /> },
        ]
    },
    {
        title: "Planning",
        items: [
            { key: "charter", label: "Project Charter", icon: <FileProtectOutlined />, pmbokFlag: "pmbokScopeEnabled" },
            { key: "scope", label: "Scope / WBS", icon: <ApartmentOutlined />, pmbokFlag: "pmbokScopeEnabled" },
            { key: "schedule", label: "Schedule", icon: <ScheduleOutlined />, pmbokFlag: "pmbokScheduleEnabled" },
            { key: "resources", label: "Resources", icon: <TeamOutlined />, pmbokFlag: "pmbokResourceEnabled" },
            { key: "stakeholders", label: "Stakeholders", icon: <SolutionOutlined />, pmbokFlag: "pmbokStakeholderEnabled" },
            { key: "communications", label: "Communications", icon: <BookOutlined />, pmbokFlag: "pmbokCommsEnabled" },
        ]
    },
    {
        title: "Monitoring",
        items: [
            { key: "quality", label: "Quality", icon: <SafetyCertificateOutlined />, pmbokFlag: "pmbokQualityEnabled" },
            { key: "risk", label: "Risk Register", icon: <BugOutlined />, pmbokFlag: "pmbokRiskEnabled" },
            { key: "evm", label: "Cost / EVM", icon: <DollarOutlined />, pmbokFlag: "pmbokCostEnabled" },
            { key: "change_control", label: "Change Control", icon: <AuditOutlined /> },
            { key: "procurement", label: "Procurement", icon: <ShoppingCartOutlined />, pmbokFlag: "pmbokProcurementEnabled" },
        ]
    },
    {
        title: "Governance",
        items: [
            { key: "principles", label: "Principles", icon: <RadarChartOutlined /> },
            { key: "domains", label: "Performance Domains", icon: <TrophyOutlined /> },
            { key: "benefits", label: "Benefits", icon: <FlagOutlined /> },
            { key: "tailoring", label: "Tailoring", icon: <ToolOutlined /> },
            { key: "focus_areas", label: "Focus Areas", icon: <ExperimentOutlined /> },
            { key: "governance", label: "Governance", icon: <BankOutlined /> },
            { key: "sustainability", label: "Sustainability", icon: <GlobalOutlined /> },
        ]
    }
];

function PmDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlProjectId = searchParams.get('projectId');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId);
    const projectId = selectedProjectId;
    const [messageApi, contextHolder] = message.useMessage();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { themeColor } = usePreferencesStore();
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    // Sync URL param to internal state
    useEffect(() => {
        if (urlProjectId && urlProjectId !== selectedProjectId) {
            setSelectedProjectId(urlProjectId);
        }
    }, [urlProjectId]);

    // Project list state (for picker)
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [projectsListLoading, setProjectsListLoading] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');

    // Navigation state
    const [showExplorer, setShowExplorer] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sprint');
    const [navSearch, setNavSearch] = useState('');

    // Core state
    const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
    const [isSprintModal, setIsSprintModal] = useState(false);
    const [isTaskModal, setIsTaskModal] = useState(false);

    const formRef = React.useRef<ProFormInstance>(null);

    // Data States
    const [project, setProject] = useState<any>(null);
    const [sprints, setSprints] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projLoading, setProjLoading] = useState(!!projectId);
    const [tasksLoading, setTasksLoading] = useState(false);

    // AI States
    const [aiLoading, setAiLoading] = useState(false);
    const [aiTaskTitle, setAiTaskTitle] = useState("");
    const [sprintAnalysis, setSprintAnalysis] = useState<any>(null);
    const [isAnalysisModal, setIsAnalysisModal] = useState(false);
    const [retroContent, setRetroContent] = useState("");
    const [isRetroModal, setIsRetroModal] = useState(false);

    // Command Palette State
    const [showCommandPalette, setShowCommandPalette] = useState(false);

    // Keyboard listener for Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Load projects list for picker
    const loadProjectsList = useCallback(async () => {
        setProjectsListLoading(true);
        try {
            const data = await gql(GET_PROJECTS_LIST, { tenantId: DEFAULT_TENANT_ID });
            setProjectsList(data.pmProjects || []);
        } catch (err: any) { console.error("PM Error", err); 
            messageApi.error("Failed to load projects.");
        } finally {
            setProjectsListLoading(false);
        }
    }, [messageApi]);

    useEffect(() => {
        if (!projectId) {
            loadProjectsList();
        }
    }, [projectId, loadProjectsList]);

    // Handle project selection
    const handleSelectProject = useCallback((id: string) => {
        setSelectedProjectId(id);
        // Update URL without full navigation
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', id);
        window.history.replaceState({}, '', url.toString());
    }, []);

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

    // ── Realtime sync for pm_tasks ──
    const { isConnected: realtimeConnected } = useRealtimeSync({
        table: 'pm_tasks',
        filter: projectId ? `project_id=eq.${projectId}` : undefined,
        enabled: !!projectId,
        onEvent: useCallback((eventType: string, newRecord: any, oldRecord: any) => {
            const title = newRecord?.title || oldRecord?.title || 'Task';
            if (eventType === 'INSERT') {
                messageApi.info(`🆕 New task created: ${title}`);
            } else if (eventType === 'UPDATE') {
                messageApi.info(`✏️ Task updated: ${title}`);
            } else if (eventType === 'DELETE') {
                messageApi.info(`🗑️ Task deleted: ${title}`);
            }
            // Refetch tasks on any event
            loadTasks();
        }, [messageApi, loadTasks]),
    });

    // Sync active tab to URL
    useEffect(() => {
        if (!mounted) return;
        const url = new URL(window.location.href);
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url.toString());
    }, [activeTab, mounted]);

    // Build filtered navigation based on project flags
    const filteredNavSections = useMemo(() => {
        return NAV_SECTIONS
            .map(section => {
                const items = section.items.filter(item => {
                    if (!item.pmbokFlag) return true;
                    return project?.[item.pmbokFlag] !== false;
                });
                return { ...section, items, badge: items.length > 0 ? String(items.length) : section.badge };
            })
            .filter(section => section.items.length > 0);
    }, [project]);

    // Sidebar search filtering
    const displayedNavSections = useMemo(() => {
        if (!navSearch.trim()) return filteredNavSections;
        const q = navSearch.toLowerCase();
        return filteredNavSections
            .map(section => ({
                ...section,
                items: section.items.filter(item => item.label.toLowerCase().includes(q)),
            }))
            .filter(section => section.items.length > 0);
    }, [filteredNavSections, navSearch]);

    // --- PORTFOLIO DASHBOARD (when no project selected) ---
    if (!projectId) {
        return (
            <div style={{ padding: '0 4px' }}>
                {contextHolder}
                <PortfolioDashboard onSelectProject={handleSelectProject} />
            </div>
        );
    }

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

    // --- Render active tab content ---
    const renderTabContent = () => {
        switch (activeTab) {
            case "ai_insights":
                return <AiInsightsTab projectId={selectedProjectId as string} />;
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
                                    <span style={{ fontWeight: 600, fontSize: 13, background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                            background: isDark ? 'rgba(15, 15, 23, 0.4)' : 'rgba(255, 255, 255, 0.65)',
                            borderRadius: 16,
                            padding: 16,
                            border: isDark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 8px 32px rgba(31,38,135,0.05)',
                            transition: 'all 0.3s ease',
                        }} className="hover:shadow-lg">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Sprint Kanban Board
                                </span>
                                <Space>
                                    <Button size="small" type="text" icon={<ReloadOutlined />} onClick={loadTasks} />
                                    <Button size="small" onClick={() => setIsSprintModal(true)}>New Sprint</Button>
                                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsTaskModal(true)}
                                        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none', borderRadius: 8 }}>
                                        Create Task
                                    </Button>
                                </Space>
                            </div>

                            {tasksLoading ? (
                                <div style={{ textAlign: 'center', padding: 80 }}><Spin /></div>
                            ) : (
                                <KanbanBoard tasks={tasks} sprints={sprints} projectId={projectId} onRefresh={loadTasks} />
                            )}
                        </div>
                    </>
                );
            case "analytics":
                return <SprintAnalyticsTab projectId={projectId} />;
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
            case "forms":
                return (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <FormIntegrationWidget
                                categories={['checklist', 'assessment']}
                                title="Quality Checklists"
                                maxItems={4}
                                animIndex={0}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <FormIntegrationWidget
                                categories={['kpi', 'survey', 'feedback']}
                                title="Project Evaluations"
                                maxItems={4}
                                animIndex={1}
                            />
                        </Col>
                    </Row>
                );
            default:
                return null;
        }
    };

    // Find active item label and section
    const activeItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.key === activeTab);
    const activeSection = filteredNavSections.find(s => s.items.some(i => i.key === activeTab));

    return (
        <div className="relative" style={{ zIndex: 1 }}>
            {contextHolder}

            {showCommandPalette && (
                <PmCommandPalette
                    onClose={() => setShowCommandPalette(false)}
                    onSelectProject={(id) => handleSelectProject(id)}
                    onSelectTask={(pid, tid) => {
                        handleSelectProject(pid);
                        setActiveTab('sprint');
                        router.push(`/admin/pm/tasks/${tid}`);
                    }}
                    onCreateTask={() => setIsTaskModal(true)}
                    onCreateSprint={() => setIsSprintModal(true)}
                />
            )}

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
                                                background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
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
                                                className="text-gray-400 hover:text-[color:var(--theme-color, #7c3aed)]"
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
                                            borderBottom: '1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: { padding: '8px 0', flex: 1, overflow: 'auto' }
                                    }}
                                >
                                    {/* Project Switcher */}
                                    <div style={{
                                        padding: '10px 12px',
                                        marginBottom: 8,
                                        background: isDark ? 'rgba(var(--theme-color-rgb, 139, 92, 246), 0.08)' : 'linear-gradient(135deg, rgba(var(--theme-color-rgb, 139, 92, 246), 0.05), rgba(var(--theme-color-rgb, 139, 92, 246), 0.02))',
                                        border: isDark ? '1px solid rgba(139,92,246,0.1)' : '1px solid rgba(139,92,246,0.05)',
                                        borderRadius: 12,
                                        margin: '0 8px 12px',
                                        transition: 'all 0.3s ease',
                                    }} className="hover:border-[color:var(--theme-color)] hover:shadow-sm">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <ProjectOutlined style={{ color: themeColor, fontSize: 12 }} />
                                            <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8' }}>Project</Text>
                                        </div>
                                        <Select
                                            value={projectId}
                                            style={{ width: '100%' }}
                                            size="small"
                                            placeholder="Switch project..."
                                            showSearch
                                            optionFilterProp="label"
                                            onChange={(val) => handleSelectProject(val)}
                                            options={projectsList.length > 0
                                                ? projectsList.map((p: any) => ({ value: p.id, label: `${p.projectNumber} — ${p.name}` }))
                                                : project ? [{ value: project.id, label: `${project.projectNumber} — ${project.name}` }] : []
                                            }
                                            onDropdownVisibleChange={(open) => {
                                                if (open && projectsList.length === 0) loadProjectsList();
                                            }}
                                            dropdownStyle={{ maxWidth: 320 }}
                                        />
                                        {project && (
                                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                <Tag bordered={false} color={project.status === 'active' ? 'green' : 'default'} style={{ fontSize: 9, borderRadius: 6, padding: '0 6px', margin: 0 }}>
                                                    {project.status?.toUpperCase()}
                                                </Tag>
                                                {project.methodology && (
                                                    <Tag bordered={false} style={{ fontSize: 9, borderRadius: 6, padding: '0 6px', margin: 0, background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                                                        {project.methodology}
                                                    </Tag>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Search */}
                                    <div style={{ padding: '0 8px', marginBottom: 4 }}>
                                        <Input
                                            prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }} />}
                                            placeholder="Find tab..."
                                            value={navSearch}
                                            onChange={e => setNavSearch(e.target.value)}
                                            allowClear
                                            size="small"
                                            style={{ marginBottom: 10, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
                                        />
                                    </div>

                                    {/* Navigation Sections */}
                                    <div className="px-1 custom-scrollbar overflow-x-hidden overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                                        {displayedNavSections.map((section, si) => (
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
                                                            color: themeColor, fontWeight: 600,
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
                                                            whileHover={!isDisabled ? { x: 4, scale: 1.02 } : {}}
                                                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                                                            onClick={() => !isDisabled && setActiveTab(item.key)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 10,
                                                                padding: '7px 12px',
                                                                marginLeft: 4, marginRight: 4,
                                                                borderRadius: 8,
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                opacity: isDisabled ? 0.4 : 1,
                                                                background: isActive
                                                                    ? (isDark ? 'rgba(var(--theme-color-rgb, 139, 92, 246), 0.15)' : 'rgba(var(--theme-color-rgb, 139, 92, 246), 0.08)')
                                                                    : 'transparent',
                                                                borderLeft: isActive ? `3px solid ${themeColor}` : '3px solid transparent',
                                                                transition: 'all 0.15s ease',
                                                                fontSize: 12,
                                                                fontWeight: isActive ? 600 : 400,
                                                                color: isActive
                                                                    ? 'var(--theme-color, #8b5cf6)'
                                                                    : (isDark ? '#94a3b8' : '#64748b'),
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontSize: 14,
                                                                color: isActive ? 'var(--theme-color, #8b5cf6)' : (isDark ? '#64748b' : '#94a3b8'),
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

                                    {/* Switch Project */}
                                    <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.1)', marginTop: 'auto' }}>
                                        <Button
                                            type="text"
                                            block
                                            size="small"
                                            onClick={() => {
                                                setSelectedProjectId(null);
                                                setProject(null);
                                                setSprints([]);
                                                setTasks([]);
                                                setActiveSprintId(null);
                                                const url = new URL(window.location.href);
                                                url.searchParams.delete('projectId');
                                                window.history.replaceState({}, '', url.toString());
                                                loadProjectsList();
                                            }}
                                            style={{
                                                fontSize: 12, color: themeColor,
                                                borderRadius: 8, textAlign: 'left',
                                                fontWeight: 500,
                                            }}
                                        >
                                            ← All Projects
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
                            {activeSection && (
                                <Typography.Text type="secondary" style={{ fontSize: 11, marginRight: 4 }}>
                                    {activeSection.title} /
                                </Typography.Text>
                            )}
                            <span style={{
                                background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 600, fontSize: 16,
                            }}>
                                {activeItem?.label || 'Dashboard'}
                            </span>
                            {activeItem && (
                                <span style={{ color: activeItem.key === activeTab ? 'var(--theme-color, #8b5cf6)' : '#94a3b8', fontSize: 16 }}>
                                    {activeItem.icon}
                                </span>
                            )}
                            {/* LIVE Indicator */}
                            {realtimeConnected && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '2px 10px', borderRadius: 12,
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    fontSize: 10, fontWeight: 700, color: '#10b981',
                                    textTransform: 'uppercase', letterSpacing: 1,
                                }}>
                                    <span style={{
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: '#10b981',
                                        animation: 'pulse-live 1.5s ease-in-out infinite',
                                    }} />
                                    LIVE
                                    <style>{`@keyframes pulse-live { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
                                </span>
                            )}
                        </Space>

                        <Space>
                            <Button size="small" type="text" icon={<ReloadOutlined />}
                                onClick={() => { loadProjectAndSprints(); loadTasks(); }}
                                className="text-gray-400 hover:text-[color:var(--theme-color, #7c3aed)]" />
                        </Space>
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
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
                title={<Space><RobotOutlined style={{ color: themeColor }} /><span>AI Sprint Risk Analysis</span></Space>}
                open={isAnalysisModal}
                onCancel={() => setIsAnalysisModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsAnalysisModal(false)}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none' }}>Got it</Button>]}
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
                title={<Space><RobotOutlined style={{ color: themeColor }} /><span>AI Sprint Retrospective</span></Space>}
                open={isRetroModal}
                onCancel={() => setIsRetroModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsRetroModal(false)}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: 'none' }}>Got it</Button>]}
                width={800}
            >
                <div style={{
                    marginTop: 16, padding: 16, borderRadius: 12, maxHeight: 600, overflowY: 'auto',
                    background: isDark ? 'rgba(15,15,23,0.6)' : '#fafafa',
                }}>
                    {retroContent ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{retroContent}</div>
                    ) : <Spin />}
                </div>
            </Modal>
        </div>
    );
}

export default function PmDashboardPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Project Management</AuroraText>}
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

