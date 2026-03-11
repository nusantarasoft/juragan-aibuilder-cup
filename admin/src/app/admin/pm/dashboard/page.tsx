"use client";

import React, { useState, useEffect, Suspense } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    PageContainer,
    ProCard,
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormDateRangePicker,
    ModalForm,
    ProColumns,
    ProTable,
    ProFormDigit,
    ProFormTextArea,
    ProFormInstance
} from "@ant-design/pro-components";
import { Button, message, Tag, Space, Tabs, Select, Typography, Avatar, Dropdown, MenuProps, Popconfirm, Spin, Modal, List, Row, Col } from "antd";
import { PlusOutlined, FireOutlined, ClockCircleOutlined, CheckCircleOutlined, MoreOutlined, UserOutlined, RobotOutlined, ReloadOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useSearchParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import ProjectCharterTab from "./components/ProjectCharterTab";
import RiskRegisterTab from "./components/RiskRegisterTab";
import EvmTab from "./components/EvmTab";
import GanttTab from "./components/GanttTab";

const { Title, Text } = Typography;

// --- GRAPHQL ---
const GET_PROJECT = `
  query GetProjectDetails($id: ID!) {
    pmProject(id: $id) {
      id name projectNumber status priority budget spent
      methodology pmbokScopeEnabled pmbokCostEnabled pmbokRiskEnabled
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
      riskLevel
      riskScore
      summary
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

function PmDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get('projectId');
    const [messageApi, contextHolder] = message.useMessage();

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
    const [aiDescFormContent, setAiDescFormContent] = useState("");
    const [sprintAnalysis, setSprintAnalysis] = useState<any>(null);
    const [isAnalysisModal, setIsAnalysisModal] = useState(false);
    const [retroContent, setRetroContent] = useState("");
    const [isRetroModal, setIsRetroModal] = useState(false);

    // --- DATA LOADERS ---
    const loadProjectAndSprints = React.useCallback(async () => {
        if (!projectId) return;
        setProjLoading(true);
        try {
            // Fetch Project
            const pData = await gql(GET_PROJECT, { id: projectId });
            setProject(pData.pmProject);

            // Fetch Sprints
            const sData = await gql(GET_SPRINTS, { projectId });
            const loadedSprints = sData.pmSprints || [];
            setSprints(loadedSprints);

            // Auto-select sprint
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

    const loadTasks = React.useCallback(async () => {
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

    useEffect(() => {
        loadProjectAndSprints();
    }, [loadProjectAndSprints]);

    useEffect(() => {
        if (activeSprintId !== undefined) {
            loadTasks();
        }
    }, [activeSprintId, loadTasks]);

    if (!projectId) {
        return <PageContainer title="Project Dashboard">Please select a project from the Projects list.</PageContainer>;
    }

    // Kanban Board logic
    const taskStatusMap = {
        todo: { title: "To Do", color: "#d9d9d9" },
        in_progress: { title: "In Progress", color: "#1890ff" },
        review: { title: "In Review", color: "#faad14" },
        done: { title: "Done", color: "#52c41a" }
    };

    const getTasksByStatus = (status: string) => tasks.filter((t: any) => t.status === status);

    const onDragStart = (e: any, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        setDragActive(true);
    };

    const onDragOver = (e: any) => {
        e.preventDefault();
    };

    const onDrop = async (e: any, newStatus: string) => {
        setDragActive(false);
        const taskId = e.dataTransfer.getData("taskId");
        const draggedTask = tasks.find((t: any) => t.id === taskId);
        if (!draggedTask || draggedTask.status === newStatus) return;

        try {
            await gql(UPDATE_TASK, { id: taskId, input: { status: newStatus } });
            messageApi.success(`Task moved to ${taskStatusMap[newStatus as keyof typeof taskStatusMap].title}`);
            loadTasks();
        } catch (error) {
            messageApi.error("Failed to move task.");
        }
    };

    // AI integration handlers
    const handleAiTaskDescription = async () => {
        if (!aiTaskTitle || aiTaskTitle.trim() === "") {
            messageApi.warning("Please enter a task title first.");
            return;
        }

        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_TASK, { title: aiTaskTitle });
            const desc = data?.generatePmTaskDescription;
            if (desc) {
                formRef.current?.setFieldsValue({ description: desc });
                messageApi.success("AI generated a description!");
            }
        } catch (error) {
            messageApi.error("AI Generation failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiSprintAnalysis = async () => {
        if (!activeSprintId) {
            messageApi.warning("No active sprint selected.");
            return;
        }

        setAiLoading(true);
        try {
            const data = await gql(AI_ANALYZE_SPRINT, { sprintId: activeSprintId });
            setSprintAnalysis(data?.analyzePmSprintRisk);
            setIsAnalysisModal(true);
        } catch (error) {
            messageApi.error("AI Analysis failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiSprintRetro = async () => {
        if (!activeSprintId) {
            messageApi.warning("No active sprint selected.");
            return;
        }

        setAiLoading(true);
        try {
            const data = await gql(AI_GENERATE_RETRO, { sprintId: activeSprintId });
            setRetroContent(data?.generatePmSprintRetrospective);
            setIsRetroModal(true);
        } catch (error) {
            messageApi.error("AI Retrospective failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleTaskFinish = async (values: any) => {
        try {
            await gql(CREATE_TASK, {
                tenantId: DEFAULT_TENANT_ID,
                input: {
                    projectId,
                    title: values.title,
                    description: values.description,
                    status: values.status,
                    priority: values.priority,
                    type: values.type,
                    estimatedHours: values.estimatedHours,
                    sprintId: activeSprintId, // Add to current sprint
                }
            });
            messageApi.success("Task created");
            setIsTaskModal(false);
            loadTasks();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
            return false;
        }
    };

    const handleSprintFinish = async (values: any) => {
        try {
            const input: any = {
                projectId,
                name: values.name,
                status: values.status,
            };
            if (values.dateRange && values.dateRange.length === 2) {
                input.startDate = values.dateRange[0];
                input.endDate = values.dateRange[1];
            }
            await gql(CREATE_SPRINT, { tenantId: DEFAULT_TENANT_ID, input });
            messageApi.success("Sprint created");
            setIsSprintModal(false);
            loadProjectAndSprints();
            return true;
        } catch (error: any) {
            messageApi.error(`Failed: ${error.message}`);
            return false;
        }
    };

    const renderTaskCard = (t: any) => (
        <div
            key={t.id}
            draggable
            onDragStart={(e) => onDragStart(e, t.id)}
            style={{
                background: "white", padding: 12, marginBottom: 8, borderRadius: 6,
                border: "1px solid #f0f0f0", cursor: "grab",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
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
                    <MoreOutlined />
                </Dropdown>
            </div>

            <Space size={4} style={{ marginBottom: 8 }}>
                {t.type === 'bug' && <Tag color="error">Bug</Tag>}
                {t.type === 'story' && <Tag color="success">Story</Tag>}
                {t.type === 'task' && <Tag color="blue">Task</Tag>}
                {t.priority === 'high' && <FireOutlined style={{ color: 'red' }} />}
            </Space>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
                    <ClockCircleOutlined />
                    {t.loggedHours || 0} / {t.estimatedHours || 0}h
                </span>
                <Avatar size="small" icon={<UserOutlined />} src={t.assignee?.avatarUrl} />
            </div>
        </div>
    );

    return (
        <PageContainer
            header={{
                title: project ? `Dashboard: ${project.name}` : "Loading Project...",
                subTitle: project ? project.projectNumber : "",
                onBack: () => router.push('/admin/pm/projects'),
                extra: [
                    <Button key="reload" icon={<ReloadOutlined />} onClick={() => { loadProjectAndSprints(); loadTasks(); }}>Reload</Button>,
                    <Button key="sprint" onClick={() => setIsSprintModal(true)}>New Sprint</Button>,
                    <Button key="task" type="primary" onClick={() => setIsTaskModal(true)} icon={<PlusOutlined />}>Create Task</Button>,
                ]
            }}
        >
            {contextHolder}

            <Tabs
                defaultActiveKey="sprint"
                items={[
                    {
                        label: 'Sprints & Kanban',
                        key: 'sprint',
                        children: (
                            <Row gutter={[16, 16]}>
                                {/* Sprint Selector & Stats */}
                                <ProCard colSpan={24} style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space align="center" size="large">
                                            <span style={{ fontWeight: 600 }}>Active Sprint:</span>
                                            <Select
                                                value={activeSprintId}
                                                style={{ width: 200 }}
                                                onChange={(val) => setActiveSprintId(val)}
                                                options={[
                                                    { value: null, label: "Backlog (No Sprint)" },
                                                    ...sprints.map((s: any) => ({ value: s.id, label: s.name }))
                                                ]}
                                            />
                                        </Space>

                                        {/* AI Actions */}
                                        <Space>
                                            <Button type="dashed" icon={<RobotOutlined />} onClick={handleAiSprintRetro} loading={aiLoading}>
                                                Generate AI Retrospective
                                            </Button>
                                            <Button type="default" icon={<RobotOutlined />} onClick={handleAiSprintAnalysis} loading={aiLoading}>
                                                AI Risk Analysis
                                            </Button>
                                        </Space>
                                    </div>
                                </ProCard>

                                {/* Kanban Board */}
                                <ProCard colSpan={24} title="Sprint Kanban Board" bodyStyle={{ padding: 16, background: '#f5f5f5' }}>
                                    {tasksLoading ? <div style={{ textAlign: 'center', padding: 50 }}><Spin /></div> : (
                                        <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
                                            {Object.entries(taskStatusMap).map(([status, config]) => (
                                                <div
                                                    key={status}
                                                    onDragOver={onDragOver}
                                                    onDrop={(e) => onDrop(e, status)}
                                                    style={{
                                                        flex: 1, minWidth: 280, background: "#f0f2f5",
                                                        border: "1px dashed #d9d9d9",
                                                        borderRadius: 8, padding: 12, display: "flex", flexDirection: "column"
                                                    }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
                                                        <Text strong>{config.title}</Text>
                                                        <Tag color={config.color}>{getTasksByStatus(status).length}</Tag>
                                                    </div>

                                                    <div style={{ flex: 1, minHeight: 400 }}>
                                                        {getTasksByStatus(status).map(renderTaskCard)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ProCard>
                            </Row>
                        )
                    },
                    {
                        label: 'Gantt Chart',
                        key: 'gantt',
                        children: <GanttTab sprints={sprints} tasks={tasks} projectId={projectId} />
                    },
                    ...(project?.pmbokScopeEnabled ? [{
                        label: 'Project Charter',
                        key: 'charter',
                        children: <ProjectCharterTab projectId={projectId} />
                    }] : []),
                    ...(project?.pmbokRiskEnabled ? [{
                        label: 'Risk Register',
                        key: 'risk',
                        children: <RiskRegisterTab projectId={projectId} />
                    }] : []),
                    ...(project?.pmbokCostEnabled ? [{
                        label: 'Cost / EVM',
                        key: 'evm',
                        children: <EvmTab projectId={projectId} />
                    }] : [])
                ]}
            />

            {/* Create Sprint Modal */}
            <ModalForm
                title="New Sprint"
                open={isSprintModal}
                onOpenChange={setIsSprintModal}
                onFinish={handleSprintFinish}
            >
                <ProFormText name="name" label="Sprint Name" placeholder="e.g. Sprint 1" rules={[{ required: true }]} />
                <ProFormSelect name="status" label="Status" initialValue="active" options={[{ value: 'planned', label: 'Planned' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
                <ProFormDateRangePicker name="dateRange" label="Timeline" />
            </ModalForm>

            {/* Create Task Modal */}
            <ModalForm
                title="New Task"
                open={isTaskModal}
                formRef={formRef}
                onOpenChange={(open) => {
                    setIsTaskModal(open);
                    if (!open) { setAiTaskTitle(""); }
                }}
                onFinish={handleTaskFinish}
            >
                <ProFormText
                    name="title"
                    label="Task Title"
                    rules={[{ required: true }]}
                    fieldProps={{
                        onChange: (e) => setAiTaskTitle(e.target.value)
                    }}
                />

                <Space style={{ marginBottom: 24 }}>
                    <Button
                        type="dashed"
                        icon={<RobotOutlined />}
                        loading={aiLoading}
                        onClick={handleAiTaskDescription}
                    >
                        Auto-write Description with AI
                    </Button>
                </Space>

                <ProFormTextArea
                    name="description"
                    label="Description"
                    placeholder="Task requirements..."
                />

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
                title={
                    <Space>
                        <RobotOutlined style={{ color: '#1890ff' }} />
                        <span>AI Sprint Risk Analysis</span>
                    </Space>
                }
                open={isAnalysisModal}
                onCancel={() => setIsAnalysisModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsAnalysisModal(false)}>Got it</Button>]}
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
                                        <div style={{ fontSize: 48, fontWeight: 'bold', color: sprintAnalysis.riskScore > 50 ? '#ff4d4f' : '#52c41a' }}>
                                            {sprintAnalysis.riskScore}/100
                                        </div>
                                        <Tag color={sprintAnalysis.riskLevel === 'critical' || sprintAnalysis.riskLevel === 'high' ? 'error' : (sprintAnalysis.riskLevel === 'medium' ? 'warning' : 'success')}>
                                            {sprintAnalysis.riskLevel.toUpperCase()} RISK
                                        </Tag>
                                    </div>
                                </ProCard>
                            </Col>

                            <Col span={12}>
                                <ProCard title="Identified Risks" bordered>
                                    <List
                                        size="small"
                                        dataSource={sprintAnalysis.identifiedRisks}
                                        renderItem={(item: any) => (
                                            <List.Item>
                                                <List.Item.Meta title={item.taskTitle} description={item.reason} />
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: "No specific risks identified." }}
                                    />
                                </ProCard>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 24 }}>
                            <Text strong>AI Recommendations</Text>
                            <List
                                style={{ marginTop: 8 }}
                                size="small"
                                dataSource={sprintAnalysis.recommendations}
                                renderItem={(item: any) => <List.Item><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} /> {item}</List.Item>}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* AI Sprint Retrospective Modal */}
            <Modal
                title={
                    <Space>
                        <RobotOutlined style={{ color: '#722ed1' }} />
                        <span>AI Sprint Retrospective</span>
                    </Space>
                }
                open={isRetroModal}
                onCancel={() => setIsRetroModal(false)}
                footer={[<Button key="close" type="primary" onClick={() => setIsRetroModal(false)}>Got it</Button>]}
                width={800}
            >
                <div style={{ marginTop: 16, background: '#fafafa', padding: 16, borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>
                    {retroContent ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: retroContent.replace(/\\n/g, '<br/>') }} />
                    ) : (
                        <Spin />
                    )}
                </div>
            </Modal>
        </PageContainer>
    );
}

export default function PmDashboardPage() {
    return (
        <CMSLayout title="Project Management" subTitle="Sprint & Task Tracking">
            <Suspense fallback={<PageContainer title="Loading Dashboard..."><Spin size="large" /></PageContainer>}>
                <PmDashboardContent />
            </Suspense>
        </CMSLayout>
    );
}
