"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Card, Space, Tag, Input, Select, message, Tooltip, Typography, Row, Col, Statistic, Modal, Form, DatePicker, Badge, Progress, Popconfirm, Empty, Tabs, Timeline, Divider } from "antd";
import {
    PlusOutlined, SearchOutlined, ReloadOutlined, TeamOutlined, UserOutlined,
    CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, SendOutlined,
    DeleteOutlined, MailOutlined, ExclamationCircleOutlined, FormOutlined,
    FileTextOutlined, EyeOutlined, BarChartOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface FormTemplate {
    id: string; name: string; category: string; status: string;
    fieldCount?: number; createdAt: string;
}

interface Assignment {
    id: string; tenantId: string; templateId: string;
    assigneeType: string; assigneeId?: string;
    assignedBy?: string; dueDate?: string;
    status: string; reminderSent: boolean;
    createdAt: string; updatedAt: string;
}

const ASSIGN_STATUS: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'orange', icon: <ClockCircleOutlined /> },
    in_progress: { color: 'processing', icon: <FormOutlined /> },
    completed: { color: 'success', icon: <CheckCircleOutlined /> },
    overdue: { color: 'error', icon: <ExclamationCircleOutlined /> },
    cancelled: { color: 'default', icon: <DeleteOutlined /> },
};

const TEMPLATE_FRAGMENT = `id name category status createdAt`;

export default function FormAssignmentsPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [modalOpen, setModalOpen] = useState(false);
    const [assignForm] = Form.useForm();
    const [messageApi, ctx] = message.useMessage();
    const [activeTab, setActiveTab] = useState('all');

    // Stats
    const stats = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        inProgress: assignments.filter(a => a.status === 'in_progress').length,
        completed: assignments.filter(a => a.status === 'completed').length,
        overdue: assignments.filter(a => {
            if (!a.dueDate || a.status === 'completed' || a.status === 'cancelled') return false;
            return dayjs(a.dueDate).isBefore(dayjs());
        }).length,
    };

    const loadTemplates = useCallback(async () => {
        try {
            const res = await gql<{ formTemplates: FormTemplate[] }>(`
                query($tid: String!) {
                    formTemplates(tenantId: $tid, status: "published") { ${TEMPLATE_FRAGMENT} }
                }
            `, { tid: DEFAULT_TENANT_ID });
            setTemplates(res.formTemplates || []);
        } catch (e: any) { messageApi.error(e.message); }
    }, [messageApi]);

    const loadAssignments = useCallback(async () => {
        if (!selectedTemplate) {
            // Load all assignments across all templates
            setLoading(true);
            try {
                const allAssignments: Assignment[] = [];
                for (const tpl of templates) {
                    try {
                        const res = await gql<{ formAssignments: Assignment[] }>(`
                            query($tid: String!) { formAssignments(templateId: $tid) { id tenantId templateId assigneeType assigneeId assignedBy dueDate status reminderSent createdAt updatedAt } }
                        `, { tid: tpl.id });
                        allAssignments.push(...(res.formAssignments || []));
                    } catch { /* skip */ }
                }
                setAssignments(allAssignments);
            } catch (e: any) { messageApi.error(e.message); }
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await gql<{ formAssignments: Assignment[] }>(`
                query($tid: String!) { formAssignments(templateId: $tid) { id tenantId templateId assigneeType assigneeId assignedBy dueDate status reminderSent createdAt updatedAt } }
            `, { tid: selectedTemplate });
            setAssignments(res.formAssignments || []);
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [selectedTemplate, templates, messageApi]);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);
    useEffect(() => { if (templates.length > 0) loadAssignments(); }, [templates, loadAssignments]);

    const handleAssign = async () => {
        try {
            const vals = await assignForm.validateFields();
            const templateId = vals.templateId;
            const assignees = vals.assignees.map((a: any) => ({
                assigneeType: a.type,
                assigneeId: a.id || null,
                dueDate: a.dueDate ? a.dueDate.toISOString() : null,
            }));
            await gql(`
                mutation($tid: String!, $tplId: String!, $assignees: [AssigneeInput!]!, $by: String) {
                    assignForm(tenantId: $tid, templateId: $tplId, assignees: $assignees, assignedBy: $by) { id }
                }
            `, { tid: DEFAULT_TENANT_ID, tplId: templateId, assignees, by: 'admin' });
            messageApi.success(`${assignees.length} assignment(s) created`);
            setModalOpen(false);
            assignForm.resetFields();
            loadAssignments();
        } catch (e: any) {
            if (e?.errorFields) return;
            messageApi.error(e.message);
        }
    };

    const getTemplateName = (id: string) => templates.find(t => t.id === id)?.name || id.slice(0, 8);

    const filteredAssignments = activeTab === 'all' ? assignments :
        activeTab === 'overdue' ? assignments.filter(a => a.dueDate && dayjs(a.dueDate).isBefore(dayjs()) && !['completed', 'cancelled'].includes(a.status)) :
        assignments.filter(a => a.status === activeTab);

    const columns: ColumnsType<Assignment> = [
        {
            title: 'Form', key: 'template', render: (_: any, rec) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => router.push(`/admin/forms/fill?id=${rec.templateId}`)}>
                        {getTemplateName(rec.templateId)}
                    </Text>
                    <Tag style={{ fontSize: 10 }}>{templates.find(t => t.id === rec.templateId)?.category || 'custom'}</Tag>
                </Space>
            ),
        },
        {
            title: 'Assignee', key: 'assignee', render: (_: any, rec) => (
                <Space>
                    {rec.assigneeType === 'individual' ? <UserOutlined style={{ color: '#1890ff' }} /> :
                     rec.assigneeType === 'team' ? <TeamOutlined style={{ color: '#10b981' }} /> :
                     <ApartmentOutlined style={{ color: '#8b5cf6' }} />}
                    <div>
                        <Text style={{ fontSize: 12 }}>{rec.assigneeId || 'All'}</Text>
                        <div><Tag style={{ fontSize: 10 }}>{rec.assigneeType}</Tag></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (s: string, rec) => {
                const isOverdue = rec.dueDate && dayjs(rec.dueDate).isBefore(dayjs()) && !['completed', 'cancelled'].includes(s);
                const displayStatus = isOverdue ? 'overdue' : s;
                const sm = ASSIGN_STATUS[displayStatus] || ASSIGN_STATUS['pending'];
                return <Tag color={sm.color} icon={sm.icon}>{displayStatus}</Tag>;
            },
        },
        {
            title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', width: 140, render: (d: string) => {
                if (!d) return <Text type="secondary">—</Text>;
                const due = dayjs(d);
                const isOverdue = due.isBefore(dayjs());
                return (
                    <Tooltip title={due.format('YYYY-MM-DD HH:mm')}>
                        <Text type={isOverdue ? 'danger' : 'secondary'}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            {due.fromNow()}
                        </Text>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Reminder', key: 'reminder', width: 90, align: 'center' as const,
            render: (_: any, rec) => rec.reminderSent ?
                <Tooltip title="Reminder sent"><MailOutlined style={{ color: '#10b981' }} /></Tooltip> :
                <Tooltip title="No reminder sent"><MailOutlined style={{ color: '#d1d5db' }} /></Tooltip>,
        },
        {
            title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 130,
            render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>,
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#ef4444']}>Form Assignments</AuroraText>}
            subTitle={<DecryptedText text="Assign forms to teams & track completion" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: themeColor, borderColor: themeColor }}>
                    New Assignment
                </Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadAssignments} />,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                        { title: 'Total', value: stats.total, color: '#3b82f6', icon: <FileTextOutlined /> },
                        { title: 'Pending', value: stats.pending, color: '#f59e0b', icon: <ClockCircleOutlined /> },
                        { title: 'In Progress', value: stats.inProgress, color: '#8b5cf6', icon: <FormOutlined /> },
                        { title: 'Completed', value: stats.completed, color: '#10b981', icon: <CheckCircleOutlined /> },
                        { title: 'Overdue', value: stats.overdue, color: '#ef4444', icon: <ExclamationCircleOutlined /> },
                    ].map((s, i) => (
                        <Col xs={12} sm={8} md={4} key={i}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 16px' }}>
                                    <Statistic title={<Text style={{ fontSize: 11 }}>{s.title}</Text>} value={s.value} prefix={s.icon}
                                        valueStyle={{ color: s.color, fontSize: 20 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                    <Col xs={24} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                            <Card style={{ ...glass, borderTop: `3px solid ${themeColor}` }} bodyStyle={{ padding: '12px 16px' }}>
                                <Text style={{ fontSize: 11, color: '#6b7280' }}>Completion Rate</Text>
                                <Progress percent={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
                                    strokeColor={{ from: themeColor, to: '#10b981' }} size="small" style={{ marginTop: 4 }} />
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Filters */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                    <Row gutter={12} align="middle">
                        <Col flex="auto">
                            <Space>
                                <Select placeholder="Filter by form" allowClear style={{ width: 250 }}
                                    value={selectedTemplate || undefined} onChange={v => setSelectedTemplate(v || '')}
                                    showSearch optionFilterProp="label"
                                    options={[{ value: '', label: '— All Forms —' }, ...templates.map(t => ({ value: t.id, label: `${t.name} (${t.category})` }))]} />
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Tabs + Table */}
                <Card style={glass}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" items={[
                        { key: 'all', label: <Badge count={stats.total} size="small" offset={[8, 0]}><Text>All</Text></Badge> },
                        { key: 'pending', label: <Badge count={stats.pending} size="small" color="#f59e0b" offset={[8, 0]}><Text>Pending</Text></Badge> },
                        { key: 'in_progress', label: <Badge count={stats.inProgress} size="small" color="#8b5cf6" offset={[8, 0]}><Text>In Progress</Text></Badge> },
                        { key: 'completed', label: <Badge count={stats.completed} size="small" color="#10b981" offset={[8, 0]}><Text>Completed</Text></Badge> },
                        { key: 'overdue', label: <Badge count={stats.overdue} size="small" color="#ef4444" offset={[8, 0]}><Text>Overdue</Text></Badge> },
                    ]} />
                    <Table<Assignment>
                        dataSource={filteredAssignments}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size="middle"
                        locale={{ emptyText: <Empty description="No assignments found. Click 'New Assignment' to get started." /> }}
                    />
                </Card>

                {/* Assign Modal */}
                <Modal title="Create Assignment" open={modalOpen} onCancel={() => { setModalOpen(false); assignForm.resetFields(); }}
                    onOk={handleAssign} width={640} okText="Assign" okButtonProps={{ style: { background: themeColor, borderColor: themeColor } }}>
                    <Form form={assignForm} layout="vertical" initialValues={{ assignees: [{ type: 'individual', id: '', dueDate: null }] }}>
                        <Form.Item name="templateId" label="Select Form Template" rules={[{ required: true, message: 'Select a form' }]}>
                            <Select placeholder="Choose a published form..." showSearch optionFilterProp="label"
                                options={templates.map(t => ({ value: t.id, label: `${t.name} (${t.category})` }))} />
                        </Form.Item>
                        <Divider>Assignees</Divider>
                        <Form.List name="assignees">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...rest }) => (
                                        <Card key={key} size="small" style={{ marginBottom: 12, background: '#fafafa', borderRadius: 10 }}
                                            extra={fields.length > 1 ? <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => remove(name)} /> : null}>
                                            <Row gutter={12}>
                                                <Col span={8}>
                                                    <Form.Item {...rest} name={[name, 'type']} label="Type" rules={[{ required: true }]}>
                                                        <Select options={[
                                                            { value: 'individual', label: <Space><UserOutlined /> Individual</Space> },
                                                            { value: 'team', label: <Space><TeamOutlined /> Team</Space> },
                                                            { value: 'department', label: <Space><ApartmentOutlined /> Department</Space> },
                                                            { value: 'all', label: <Space><TeamOutlined /> All</Space> },
                                                        ]} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={8}>
                                                    <Form.Item {...rest} name={[name, 'id']} label="Assignee ID">
                                                        <Input placeholder="e.g. user@email.com" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={8}>
                                                    <Form.Item {...rest} name={[name, 'dueDate']} label="Due Date">
                                                        <DatePicker style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Card>
                                    ))}
                                    <Button type="dashed" onClick={() => add({ type: 'individual', id: '', dueDate: null })} block icon={<PlusOutlined />}
                                        style={{ borderRadius: 8, borderColor: themeColor, color: themeColor }}>
                                        Add Assignee
                                    </Button>
                                </>
                            )}
                        </Form.List>
                    </Form>
                </Modal>
            </motion.div>
        </CMSLayout>
    );
}
