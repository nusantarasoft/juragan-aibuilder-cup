"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col,
    DatePicker, Statistic,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, CheckOutlined,
    PhoneOutlined, MailOutlined, CalendarOutlined, CheckCircleOutlined,
    ClockCircleOutlined, FireOutlined, ThunderboltOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const { TextArea } = Input;

interface Activity {
    id: string; activityType: string; subject: string; description: string;
    relatedToType: string; relatedToId: string; dueDate: string;
    startTime: string; endTime: string; completedAt: string; isCompleted: boolean;
    priority: string; status: string; outcome: string; createdAt: string; updatedAt: string;
}

const ACTIVITY_TYPES = [
    { value: "call", label: "Call", icon: <PhoneOutlined />, color: "green" },
    { value: "email", label: "Email", icon: <MailOutlined />, color: "blue" },
    { value: "meeting", label: "Meeting", icon: <CalendarOutlined />, color: "purple" },
    { value: "task", label: "Task", icon: <CheckCircleOutlined />, color: "orange" },
];
const PRIORITIES = [{ value: "low", label: "Low", color: "default" }, { value: "normal", label: "Normal", color: "blue" }, { value: "high", label: "High", color: "orange" }, { value: "urgent", label: "Urgent", color: "red" }];
const STATUSES = [{ value: "open", label: "Open", color: "blue" }, { value: "in_progress", label: "In Progress", color: "orange" }, { value: "completed", label: "Completed", color: "green" }, { value: "cancelled", label: "Cancelled", color: "default" }];
const RELATED_TYPES = [{ value: "individual", label: "Individual" }, { value: "contact", label: "Contact" }, { value: "account", label: "Account" }];

const ACTIVITY_FIELDS: FieldDef[] = [
    { name: "activityType", label: "Type", required: true }, { name: "subject", label: "Subject", required: true },
    { name: "description", label: "Description" }, { name: "relatedToType", label: "Related To Type", required: true },
    { name: "relatedToId", label: "Related To ID", required: true }, { name: "dueDate", label: "Due Date" },
    { name: "startTime", label: "Start Time" }, { name: "endTime", label: "End Time" },
    { name: "priority", label: "Priority" }, { name: "status", label: "Status" }, { name: "outcome", label: "Outcome" },
];

export default function ActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Activity | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Activity | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($tenantId: String!, $activityType: String, $status: String, $search: String) { crmActivities(tenantId: $tenantId, activityType: $activityType, status: $status, search: $search) { id activityType subject description relatedToType relatedToId dueDate startTime endTime completedAt isCompleted priority status outcome createdAt updatedAt } }`, { tenantId: DEFAULT_TENANT_ID, activityType: typeFilter || null, status: statusFilter || null, search: search || null });
            setActivities(data.crmActivities || []);
        } catch (err: any) { message.error("Failed to load: " + err.message); }
        finally { setLoading(false); }
    }, [search, typeFilter, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = { activityType: values.activityType, subject: values.subject, description: values.description || null, relatedToType: values.relatedToType, relatedToId: values.relatedToId, dueDate: values.dueDate?.toISOString() || null, startTime: values.startTime?.toISOString() || null, endTime: values.endTime?.toISOString() || null, priority: values.priority || 'normal', status: values.status || 'open', outcome: values.outcome || null };
            if (editing) { await gql(`mutation($id: String!, $input: UpdateActivityInput!) { updateCrmActivity(id: $id, input: $input) { id } }`, { id: editing.id, input }); message.success("Activity updated"); }
            else { await gql(`mutation($tenantId: String!, $input: CreateActivityInput!) { createCrmActivity(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input }); message.success("Activity created"); }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try { await gql(`mutation($tenantId: String!, $input: CreateActivityInput!) { createCrmActivity(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input: { activityType: r.activityType, subject: r.subject, description: r.description || null, relatedToType: r.relatedToType, relatedToId: r.relatedToId, dueDate: r.dueDate || null, priority: r.priority || 'normal', status: r.status || 'open', outcome: r.outcome || null } }); success++; }
            catch (e: any) { failed++; errors.push(`${r.subject}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const handleComplete = async (id: string) => { try { await gql(`mutation($id: String!) { completeCrmActivity(id: $id) { id } }`, { id }); message.success("Activity completed"); loadData(); } catch (err: any) { message.error(err.message); } };
    const handleDelete = async (id: string) => { try { await gql(`mutation($id: String!) { deleteCrmActivity(id: $id) }`, { id }); message.success("Deleted"); loadData(); } catch (err: any) { message.error(err.message); } };

    const getTypeConfig = (t: string) => ACTIVITY_TYPES.find(a => a.value === t);
    const getPriorityConfig = (p: string) => PRIORITIES.find(pr => pr.value === p);
    const getStatusConfig = (s: string) => STATUSES.find(st => st.value === s);

    const openCount = activities.filter(a => a.status === 'open' || a.status === 'in_progress').length;
    const completedCount = activities.filter(a => a.isCompleted).length;
    const overdueCount = activities.filter(a => a.dueDate && !a.isCompleted && dayjs(a.dueDate).isBefore(dayjs())).length;

    const columns: ColumnsType<Activity> = [
        { title: "Type", key: "type", width: 50, render: (_, r) => { const cfg = getTypeConfig(r.activityType); return <Tooltip title={cfg?.label}>{cfg?.icon || <ClockCircleOutlined />}</Tooltip>; }, filters: ACTIVITY_TYPES.map(t => ({ text: t.label, value: t.value })), onFilter: (v, r) => r.activityType === v },
        { title: "Subject", key: "subject", render: (_, r) => (<div><Text strong style={{ textDecoration: r.isCompleted ? 'line-through' : 'none' }}>{r.subject}</Text>{r.description && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.description.substring(0, 80)}{r.description.length > 80 ? '...' : ''}</Text></>}</div>) },
        { title: "Related To", key: "related", width: 140, render: (_, r) => <Tag>{r.relatedToType}</Tag> },
        { title: "Priority", key: "priority", width: 90, render: (_, r) => { const cfg = getPriorityConfig(r.priority); return <Tag color={cfg?.color}>{cfg?.label || r.priority}</Tag>; }, filters: PRIORITIES.map(p => ({ text: p.label, value: p.value })), onFilter: (v, r) => r.priority === v },
        { title: "Due Date", key: "due", width: 140, render: (_, r) => { if (!r.dueDate) return 'â€”'; const d = dayjs(r.dueDate); const isOverdue = !r.isCompleted && d.isBefore(dayjs()); return <Text type={isOverdue ? 'danger' : undefined}>{d.format('MMM D, YYYY')}</Text>; }, sorter: (a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') },
        { title: "Status", key: "status", width: 120, render: (_, r) => { const cfg = getStatusConfig(r.status); return <Tag color={cfg?.color}>{cfg?.label || r.status}</Tag>; } },
        { title: "Actions", key: "actions", width: 160, render: (_, r) => (<Space>
            <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
            {!r.isCompleted && <Tooltip title="Complete"><Button type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={() => handleComplete(r.id)} /></Tooltip>}
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ activityType: r.activityType, subject: r.subject, description: r.description, relatedToType: r.relatedToType, relatedToId: r.relatedToId, dueDate: r.dueDate ? dayjs(r.dueDate) : null, startTime: r.startTime ? dayjs(r.startTime) : null, endTime: r.endTime ? dayjs(r.endTime) : null, priority: r.priority, status: r.status, outcome: r.outcome }); setIsModalOpen(true); }} /></Tooltip>
            <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.subject}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
        </Space>) },
    ];

    const formSteps = [
        { title: "Activity", icon: <CalendarOutlined />, fields: ["activityType", "subject", "relatedToType", "relatedToId", "description"], content: (<><Row gutter={16}><Col span={8}><Form.Item name="activityType" label="Type" rules={[{ required: true }]}><Select options={ACTIVITY_TYPES.map(t => ({ value: t.value, label: t.label }))} /></Form.Item></Col><Col span={16}><Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input placeholder="e.g., Follow-up call with John" /></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="relatedToType" label="Related To (Type)" rules={[{ required: true }]}><Select options={RELATED_TYPES} /></Form.Item></Col><Col span={12}><Form.Item name="relatedToId" label="Related To (ID)" rules={[{ required: true }]}><Input placeholder="Entity UUID" /></Form.Item></Col></Row><Form.Item name="description" label="Description"><TextArea rows={3} placeholder="Additional details..." /></Form.Item></>) },
        { title: "Schedule", icon: <ClockCircleOutlined />, fields: ["dueDate", "startTime", "endTime", "priority", "status", "outcome"], content: (<><Row gutter={16}><Col span={8}><Form.Item name="dueDate" label="Due Date"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col><Col span={8}><Form.Item name="startTime" label="Start Time"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col><Col span={8}><Form.Item name="endTime" label="End Time"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col></Row><Row gutter={16}><Col span={8}><Form.Item name="priority" label="Priority" initialValue="normal"><Select options={PRIORITIES} /></Form.Item></Col><Col span={8}><Form.Item name="status" label="Status" initialValue="open"><Select options={STATUSES} /></Form.Item></Col><Col span={8}><Form.Item name="outcome" label="Outcome"><Input placeholder="e.g., Scheduled demo" /></Form.Item></Col></Row></>) },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Activities</AuroraText>}
            subTitle={<DecryptedText text="Track calls, emails, meetings, and tasks across your CRM" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Log Activity</Button>,
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_activities', title: 'CRM Activities', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Subject', key: 'subject' }, { header: 'Type', key: 'type' }, { header: 'Status', key: 'status' }, { header: 'Assigned', key: 'assignedTo' }], data: activities })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_activities', title: 'CRM Activities', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Subject', key: 'subject' }, { header: 'Type', key: 'type' }, { header: 'Status', key: 'status' }, { header: 'Assigned', key: 'assignedTo' }], data: activities })} /></Tooltip></RbacGuard>,
        ]}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Open" value={openCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1677ff' }} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Completed" value={completedCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Overdue" value={overdueCount} prefix={<FireOutlined />} valueStyle={{ color: overdueCount > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
                <Col span={6}><Card style={{ ...glass }}><Statistic title="Total" value={activities.length} prefix={<ThunderboltOutlined />} /></Card></Col>
            </Row>
            <Card style={{ ...glass, marginBottom: 16 }}><Space wrap>
                <Input prefix={<SearchOutlined />} placeholder="Search by subject..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                <Select placeholder="Type" value={typeFilter} onChange={setTypeFilter} allowClear style={{ width: 130 }} options={ACTIVITY_TYPES.map(t => ({ value: t.value, label: t.label }))} />
                <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 150 }} options={STATUSES} />
            </Space></Card>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}><Table columns={columns} dataSource={activities.map(a => ({ ...a, key: a.id }))} loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" /></Card>

            <SteppedFormModal open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? "Edit Activity" : "Log Activity"} entityName="activity" steps={formSteps} fields={ACTIVITY_FIELDS} width={700} onBatchCreate={handleBatchCreate} gradient={["#10b981", "#059669"]} editMode={!!editing} />

            <Drawer title="Activity Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (<Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Type"><Tag color={getTypeConfig(selected.activityType)?.color}>{getTypeConfig(selected.activityType)?.label}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Subject">{selected.subject}</Descriptions.Item>
                    <Descriptions.Item label="Description">{selected.description || 'â€”'}</Descriptions.Item>
                    <Descriptions.Item label="Related To">{selected.relatedToType} ({selected.relatedToId})</Descriptions.Item>
                    <Descriptions.Item label="Priority"><Tag color={getPriorityConfig(selected.priority)?.color}>{getPriorityConfig(selected.priority)?.label}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={getStatusConfig(selected.status)?.color}>{getStatusConfig(selected.status)?.label}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Due Date">{selected.dueDate ? dayjs(selected.dueDate).format('MMM D, YYYY HH:mm') : 'â€”'}</Descriptions.Item>
                    <Descriptions.Item label="Completed">{selected.isCompleted ? <Tag color="green">Yes â€” {dayjs(selected.completedAt).format('MMM D, YYYY')}</Tag> : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Outcome">{selected.outcome || 'â€”'}</Descriptions.Item>
                    <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('MMM D, YYYY HH:mm')}</Descriptions.Item>
                </Descriptions>)}
            </Drawer>
        </CMSLayout>
    );
}


