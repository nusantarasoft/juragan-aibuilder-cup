"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    PageContainer,
    ProTable,
    ProCard,
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
import { Button, message, Tag, Space, Dropdown, MenuProps, Popconfirm, Drawer, Descriptions, Progress } from "antd";
import { PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, EyeOutlined, ReloadOutlined, DashboardOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

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

export default function ProjectsPage() {
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const formRef = React.useRef<ActionType>(null);

    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [viewingProject, setViewingProject] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            planning: "default",
            active: "processing",
            paused: "warning",
            completed: "success",
            cancelled: "error"
        };
        return colors[status] || "default";
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            low: "default", medium: "processing", high: "warning", critical: "error"
        };
        return colors[priority] || "default";
    };

    // Handlers
    const handleAdd = () => {
        setEditingProject(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: any) => {
        setEditingProject(record);
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
        // Future route: /admin/pm/projects/[id]
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

    // Columns
    const columns: ProColumns<any>[] = [
        {
            title: "Project",
            dataIndex: "projectNumber",
            width: "30%",
            render: (_, record) => (
                <Space>
                    <FolderOpenOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <a onClick={() => handleOpenDashboard(record.id)} style={{ fontWeight: 600, fontSize: 15 }}>
                            {record.name}
                        </a>
                        <span style={{ fontSize: 12, color: '#888' }}>{record.projectNumber}</span>
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
            render: (_, record) => (
                <Tag color={getStatusColor(record.status)}>
                    {record.status?.toUpperCase()}
                </Tag>
            )
        },
        {
            title: "Priority",
            dataIndex: "priority",
            render: (_, record) => (
                <Tag color={getPriorityColor(record.priority)}>
                    {record.priority?.toUpperCase()}
                </Tag>
            )
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
                            status={percent >= 100 ? 'exception' : 'active'} />
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
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
                    <span style={{ fontSize: 13, color: '#555' }}>
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
            render: (text, record, _, action) => {
                const items: MenuProps['items'] = [
                    {
                        key: 'view',
                        icon: <EyeOutlined />,
                        label: 'View Details',
                        onClick: () => setViewingProject(record),
                    },
                    {
                        key: 'dashboard',
                        icon: <DashboardOutlined />,
                        label: 'Open Dashboard',
                        onClick: () => handleOpenDashboard(record.id),
                    },
                    {
                        key: 'edit',
                        icon: <EditOutlined />,
                        label: 'Edit',
                        onClick: () => handleEdit(record),
                    },
                    {
                        type: 'divider'
                    },
                    {
                        key: 'delete',
                        icon: <DeleteOutlined style={{ color: 'red' }} />,
                        label: (
                            <Popconfirm
                                title="Delete this project?"
                                description="Are you sure you want to delete this project?"
                                onConfirm={() => handleDelete(record.id)}
                            >
                                <span style={{ color: 'red' }}>Delete</span>
                            </Popconfirm>
                        ),
                    },
                ];

                return (
                    <Dropdown menu={{ items }} trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                );
            },
        },
    ];

    // Stats calculation
    const activeProjects = projects.filter((p: any) => p.status === 'active').length;
    const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0);

    return (
        <CMSLayout title="Projects" subTitle="Manage all your project portfolios">
            {contextHolder}

            {/* Stat Cards */}
            <ProCard gutter={16} ghost style={{ marginBottom: 16 }}>
                <ProCard colSpan={8} layout="center" bordered>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, color: '#888' }}>Total Projects</div>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{projects.length}</div>
                    </div>
                </ProCard>
                <ProCard colSpan={8} layout="center" bordered>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, color: '#888' }}>Active Projects</div>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{activeProjects}</div>
                    </div>
                </ProCard>
                <ProCard colSpan={8} layout="center" bordered>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, color: '#888' }}>Total Portfolio Budget</div>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                            ${totalBudget.toLocaleString()}
                        </div>
                    </div>
                </ProCard>
            </ProCard>

            {/* Main Table */}
            <ProTable
                actionRef={formRef}
                columns={columns}
                dataSource={projects}
                loading={loading}
                rowKey="id"
                search={{
                    layout: "vertical",
                    defaultCollapsed: false,
                }}
                pagination={{
                    pageSize: 10,
                }}
                toolBarRender={() => [
                    <Button key="reload" icon={<ReloadOutlined />} onClick={loadData}>Reload</Button>,
                    <Button key="button" icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
                        New Project
                    </Button>,
                ]}
            />

            {/* Create/Edit Modal */}
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
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormText
                        name="name"
                        label="Project Name"
                        width="lg"
                        rules={[{ required: true, message: "Please enter a project name" }]}
                    />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormSelect
                        name="status"
                        label="Status"
                        width="sm"
                        options={[
                            { label: 'Planning', value: 'planning' },
                            { label: 'Active', value: 'active' },
                            { label: 'Paused', value: 'paused' },
                            { label: 'Completed', value: 'completed' },
                            { label: 'Cancelled', value: 'cancelled' },
                        ]}
                    />
                    <ProFormSelect
                        name="priority"
                        label="Priority"
                        width="sm"
                        options={[
                            { label: 'Low', value: 'low' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'High', value: 'high' },
                            { label: 'Critical', value: 'critical' },
                        ]}
                    />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormDateRangePicker
                        name="dateRange"
                        label="Project Timeline"
                        width="md"
                    />
                    <ProFormDigit
                        name="budget"
                        label="Budget ($)"
                        width="md"
                        min={0}
                        fieldProps={{ precision: 2 }}
                    />
                </ProForm.Group>

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
                    tooltip="Select which project management disciplines to tracking for this project structure. For basic Agile, leave unchecked. For full Waterfall, select Cost, Risk, Scope etc."
                    width="xl"
                    options={[
                        { label: 'Integration (Project Charter)', value: 'integration' },
                        { label: 'Scope Management', value: 'scope' },
                        { label: 'Schedule Management', value: 'schedule' },
                        { label: 'Cost Management (EVM)', value: 'cost' },
                        { label: 'Quality Management', value: 'quality' },
                        { label: 'Resource Management', value: 'resource' },
                        { label: 'Communications', value: 'comms' },
                        { label: 'Risk Management', value: 'risk' },
                        { label: 'Procurement', value: 'procurement' },
                        { label: 'Stakeholder Management', value: 'stakeholder' },
                    ]}
                />

                <ProFormTextArea
                    name="description"
                    label="Description & Objectives"
                    width="xl"
                    placeholder="Describe the goals, scope, and deliverables of this project..."
                />
            </ModalForm>

            {/* Detail Drawer */}
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
                            <Tag color={getStatusColor(viewingProject.status)}>{viewingProject.status.toUpperCase()}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Priority">
                            <Tag color={getPriorityColor(viewingProject.priority)}>{viewingProject.priority.toUpperCase()}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Methodology">
                            <Tag color={viewingProject.methodology === 'agile' ? 'blue' : viewingProject.methodology === 'pmbok' ? 'purple' : 'geekblue'}>
                                {viewingProject.methodology?.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Timeline">
                            {viewingProject.startDate ? dayjs(viewingProject.startDate).format("MMM D, YYYY") : "N/A"} -
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
