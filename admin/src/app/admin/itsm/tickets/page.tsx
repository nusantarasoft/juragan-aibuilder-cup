"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Badge, Button, Col, Form, Input, message, Popconfirm, Row, Select, Space, Switch, Tag, Tooltip, Typography } from "antd";
import {
    PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, SearchOutlined,
    CustomerServiceOutlined, RobotOutlined, AlertOutlined, UserOutlined,
    TeamOutlined, PhoneOutlined, SettingOutlined, FileExcelOutlined, FilePdfOutlined
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { useRouter } from "next/navigation";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";

const { Text } = Typography;

const GET_TICKETS = `query($status: String, $priority: String, $search: String) { itsmTickets(status: $status, priority: $priority, search: $search) { id ticketNumber title description categoryId priority status impact urgency contactId accountId individualId pmStakeholderId reporterName reporterEmail assignedTo assignedGroup channel slaResolutionDue createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const SEARCH_REPORTERS = `query($search: String!) { itsmSearchReporters(search: $search) { id name email type entityId extra } }`;
const CREATE_TICKET = `mutation($tenantId: String!, $input: CreateItsmTicketInput!) { createItsmTicket(tenantId: $tenantId, input: $input) { id ticketNumber } }`;
const UPDATE_TICKET = `mutation($id: ID!, $input: UpdateItsmTicketInput!) { updateItsmTicket(id: $id, input: $input) { id } }`;
const DELETE_TICKET = `mutation($id: ID!) { deleteItsmTicket(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };
const channelLabels: Record<string, string> = { portal: 'ðŸŒ Portal', email: 'ðŸ“§ Email', phone: 'ðŸ“ž Phone', chat: 'ðŸ’¬ Chat' };
const typeLabels: Record<string, string> = { contact: 'ðŸ“‡ Contact', individual: 'ðŸ‘¤ Individual', account: 'ðŸ¢ Account', pm_stakeholder: 'ðŸ“‹ PM Stakeholder' };

const TICKET_FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description" },
    { name: "categoryId", label: "Category" },
    { name: "channel", label: "Channel" },
    { name: "priority", label: "Priority" },
    { name: "impact", label: "Impact" },
    { name: "urgency", label: "Urgency" },
    { name: "reporterName", label: "Reporter Name" },
    { name: "reporterEmail", label: "Reporter Email" },
    { name: "assignedTo", label: "Assigned To" },
    { name: "assignedGroup", label: "Support Group" },
];

export default function ItsmTicketsPage() {
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const [tickets, setTickets] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);
    const [searchText, setSearchText] = useState('');
    const [reporterResults, setReporterResults] = useState<any[]>([]);
    const [selectedReporter, setSelectedReporter] = useState<any>(null);
    const [aiSuggesting, setAiSuggesting] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, c] = await Promise.all([
                gql(GET_TICKETS, { status: filterStatus, priority: filterPriority, search: searchText || undefined }),
                gql(GET_CATEGORIES),
            ]);
            setTickets(t.itsmTickets || []);
            setCategories(c.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterPriority, searchText, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSearchReporter = async (value: string) => {
        if (value.length < 2) { setReporterResults([]); return; }
        try {
            const d = await gql(SEARCH_REPORTERS, { search: value });
            setReporterResults(d.itsmSearchReporters || []);
        } catch { /* ignore */ }
    };

    const handleAiCategorize = async () => {
        const title = form.getFieldValue('title');
        const desc = form.getFieldValue('description');
        if (!title) { messageApi.warning('Please enter a title first'); return; }
        setAiSuggesting(true);
        try {
            const raw = await gql(`query($title: String!, $description: String) { itsmAiCategorize(title: $title, description: $description) }`, { title, description: desc });
            const result = JSON.parse(raw.itsmAiCategorize);
            setAiSuggestion(result);
            messageApi.success('AI suggestion ready â€” review below');
        } catch (err: any) { messageApi.error('AI failed: ' + err.message); }
        finally { setAiSuggesting(false); }
    };

    const handleSave = async (values: any) => {
        try {
            const input: any = {
                title: values.title,
                description: values.description,
                categoryId: values.categoryId,
                priority: values.priority || 'medium',
                impact: values.impact || 'medium',
                urgency: values.urgency || 'medium',
                channel: values.channel || 'portal',
                assignedTo: values.assignedTo,
                assignedGroup: values.assignedGroup,
                reporterName: values.reporterName,
                reporterEmail: values.reporterEmail,
            };

            if (selectedReporter) {
                input.reporterName = selectedReporter.name;
                input.reporterEmail = selectedReporter.email;
                if (selectedReporter.type === 'contact') input.contactId = selectedReporter.entityId;
                if (selectedReporter.type === 'account') input.accountId = selectedReporter.entityId;
                if (selectedReporter.type === 'individual') input.individualId = selectedReporter.entityId;
                if (selectedReporter.type === 'pm_stakeholder') input.pmStakeholderId = selectedReporter.entityId;
            }

            if (editing) {
                input.status = values.status;
                input.resolutionNotes = values.resolutionNotes;
                await gql(UPDATE_TICKET, { id: editing.id, input });
                messageApi.success("Ticket updated.");
            } else {
                const d = await gql(CREATE_TICKET, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Ticket ${d.createItsmTicket.ticketNumber} created.`);
            }
            setModalOpen(false);
            setSelectedReporter(null);
            setAiSuggestion(null);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_TICKET, { id }); messageApi.success("Ticket deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        {
            title: 'Ticket #', dataIndex: 'ticketNumber', width: 110,
            render: (_, r) => <Tag color="purple" style={{ cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => router.push(`/admin/itsm/tickets/${r.id}`)}>{r.ticketNumber}</Tag>
        },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        {
            title: 'Priority', dataIndex: 'priority', width: 90,
            render: (_, r) => <Tag color={priorityColors[r.priority]}>{(r.priority || '').toUpperCase()}</Tag>
        },
        {
            title: 'Status', dataIndex: 'status', width: 110,
            render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace('_', ' ').toUpperCase()}</Tag>
        },
        {
            title: 'Reporter', dataIndex: 'reporterName', width: 150, ellipsis: true,
            render: (_, r) => {
                const linked = r.contactId || r.individualId || r.accountId || r.pmStakeholderId;
                return <Space size={4}>{linked && <Badge status="success" />}<Text>{r.reporterName || '-'}</Text></Space>;
            }
        },
        {
            title: 'Assigned To', dataIndex: 'assignedTo', width: 130, ellipsis: true,
            render: (_, r: any) => r.assignedTo || <Text type="secondary" italic>Unassigned</Text>
        },
        { title: 'Channel', dataIndex: 'channel', width: 90, render: (_: any, r: any) => channelLabels[r.channel] || r.channel },
        {
            title: 'SLA', dataIndex: 'slaResolutionDue', width: 80,
            render: (_, r) => {
                if (!r.slaResolutionDue) return '-';
                const breach = new Date(r.slaResolutionDue) < new Date();
                return breach ? <Tag color="red">BREACH</Tag> : <Tag color="green">OK</Tag>;
            }
        },
        {
            title: 'Actions', valueType: 'option', width: 120,
            render: (_, record) => [
                <Tooltip key="view" title="View Details"><Button type="text" icon={<EyeOutlined />} onClick={() => router.push(`/admin/itsm/tickets/${record.id}`)} /></Tooltip>,
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => {
                    setEditing(record);
                    form.setFieldsValue({
                        title: record.title, description: record.description,
                        categoryId: record.categoryId, channel: record.channel,
                        priority: record.priority, impact: record.impact, urgency: record.urgency,
                        reporterName: record.reporterName, reporterEmail: record.reporterEmail,
                        assignedTo: record.assignedTo, assignedGroup: record.assignedGroup,
                        status: record.status, resolutionNotes: record.resolutionNotes,
                    });
                    setModalOpen(true);
                }} />,
                <Popconfirm key="del" title="Delete this ticket?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Helpdesk Tickets</AuroraText>}
            subTitle={<DecryptedText text="Manage IT support tickets" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><CustomerServiceOutlined /> Helpdesk Tickets</Space>}
                rowKey="id"
                dataSource={tickets}
                loading={loading}
                columns={columns}
                search={false}
                toolbar={{
                    search: { placeholder: 'Search tickets...', onSearch: (v) => setSearchText(v), allowClear: true, style: { width: 250 } },
                }}
                toolBarRender={() => [
                    <Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'itsm_tickets', title: 'ITSM Tickets', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'ticketNumber' }, { header: 'Subject', key: 'subject' }, { header: 'Priority', key: 'priority' }, { header: 'Status', key: 'status' }], data: tickets })} /></Tooltip>,
                    <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'itsm_tickets', title: 'ITSM Tickets', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'ticketNumber' }, { header: 'Subject', key: 'subject' }, { header: 'Priority', key: 'priority' }, { header: 'Status', key: 'status' }], data: tickets })} /></Tooltip>,
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 130 }} value={filterStatus} onChange={setFilterStatus}
                        options={[
                            { value: 'new', label: 'New' }, { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' }, { value: 'pending', label: 'Pending' },
                            { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
                        ]}
                    />,
                    <Select key="fp" placeholder="Priority" allowClear style={{ width: 120 }} value={filterPriority} onChange={setFilterPriority}
                        options={[
                            { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' },
                            { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
                        ]}
                    />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setSelectedReporter(null); setAiSuggestion(null); form.resetFields(); setModalOpen(true); }}>
                        New Ticket
                    </Button>,
                ]}
            />

            {/* â”€â”€â”€ Ticket SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); setAiSuggestion(null); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.ticketNumber}` : "New Ticket"}
                entityName="ticket"
                steps={[
                    {
                        title: "Issue Details",
                        icon: <AlertOutlined />,
                        fields: ["title", "description"],
                        content: (
                            <>
                                <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                                    <Input placeholder="Brief description of the issue" />
                                </Form.Item>
                                <Form.Item name="description" label="Description">
                                    <Input.TextArea rows={4} placeholder="Detailed description, steps to reproduce, etc." />
                                </Form.Item>

                                {/* AI Auto-Categorize */}
                                {!editing && (
                                    <div style={{ padding: '10px 14px', background: `linear-gradient(135deg, ${themeColor}10 0%, ${themeColor}06 100%)`, borderRadius: 8, border: `1px solid ${themeColor}20` }}>
                                        <Space>
                                            <Button icon={<RobotOutlined />} loading={aiSuggesting} onClick={handleAiCategorize}
                                                style={{ background: themeColor, color: '#fff', border: 'none' }}>
                                                ðŸ¤– AI Auto-Categorize
                                            </Button>
                                            {aiSuggestion && (
                                                <Space size={4}>
                                                    <Tag color="purple">{aiSuggestion.suggestedCategory}</Tag>
                                                    <Tag color={aiSuggestion.suggestedPriority === 'critical' ? 'red' : aiSuggestion.suggestedPriority === 'high' ? 'orange' : 'blue'}>{(aiSuggestion.suggestedPriority || '').toUpperCase()}</Tag>
                                                    <Tag color="green">{Math.round((aiSuggestion.confidence || 0) * 100)}%</Tag>
                                                </Space>
                                            )}
                                        </Space>
                                        {aiSuggestion && <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>{aiSuggestion.reasoning}</div>}
                                    </div>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Classification",
                        icon: <SettingOutlined />,
                        fields: ["categoryId", "channel", "priority", "impact", "urgency"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="categoryId" label="Category">
                                            <Select placeholder="Select category" allowClear
                                                options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="channel" label="Channel">
                                            <Select options={[
                                                { value: 'portal', label: 'ðŸŒ Portal' }, { value: 'email', label: 'ðŸ“§ Email' },
                                                { value: 'phone', label: 'ðŸ“ž Phone' }, { value: 'chat', label: 'ðŸ’¬ Chat' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="priority" label="Priority">
                                            <Select options={[
                                                { value: 'critical', label: 'ðŸ”´ Critical' }, { value: 'high', label: 'ðŸŸ  High' },
                                                { value: 'medium', label: 'ðŸ”µ Medium' }, { value: 'low', label: 'ðŸŸ¢ Low' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="impact" label="Impact">
                                            <Select options={[
                                                { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="urgency" label="Urgency">
                                            <Select options={[
                                                { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                {editing && (
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="status" label="Status">
                                                <Select options={[
                                                    { value: 'new', label: 'New' }, { value: 'open', label: 'Open' },
                                                    { value: 'in_progress', label: 'In Progress' }, { value: 'pending', label: 'Pending' },
                                                    { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
                                                ]} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="resolutionNotes" label="Resolution Notes">
                                                <Input.TextArea rows={2} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Reporter",
                        icon: <UserOutlined />,
                        fields: ["reporterName", "reporterEmail"],
                        content: (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Search CRM Contacts, Individuals, Accounts, or PM Stakeholders:</Text>
                                    <Select
                                        showSearch placeholder="Search reporter..." filterOption={false}
                                        onSearch={handleSearchReporter}
                                        onChange={(_, opt: any) => {
                                            const r = reporterResults.find(rr => rr.id === opt?.value);
                                            setSelectedReporter(r || null);
                                        }}
                                        style={{ width: '100%' }} suffixIcon={<SearchOutlined />}
                                        value={selectedReporter?.id} allowClear onClear={() => setSelectedReporter(null)}
                                        notFoundContent={null}
                                    >
                                        {reporterResults.map(r => (
                                            <Select.Option key={r.id} value={r.id}>
                                                <Space>
                                                    <Tag color={r.type === 'contact' ? 'blue' : r.type === 'individual' ? 'green' : r.type === 'account' ? 'gold' : 'purple'}>
                                                        {typeLabels[r.type] || r.type}
                                                    </Tag>
                                                    <span><strong>{r.name}</strong>{r.email ? ` â€” ${r.email}` : ''}{r.extra ? ` (${r.extra})` : ''}</span>
                                                </Space>
                                            </Select.Option>
                                        ))}
                                    </Select>
                                    {selectedReporter && (
                                        <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                                            <Text strong>Linked: </Text>
                                            <Tag color="green">{typeLabels[selectedReporter.type]}</Tag>
                                            <Text>{selectedReporter.name}</Text>
                                        </div>
                                    )}
                                </div>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="reporterName" label="Reporter Name">
                                            <Input placeholder="Or enter manually" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="reporterEmail" label="Reporter Email">
                                            <Input placeholder="reporter@company.com" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Assignment",
                        icon: <TeamOutlined />,
                        fields: ["assignedTo", "assignedGroup"],
                        content: (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="assignedTo" label="Assigned To">
                                        <Input placeholder="Agent name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="assignedGroup" label="Support Group">
                                        <Input placeholder="e.g., L1 Support, Network Team" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        ),
                    },
                ]}
                fields={TICKET_FIELDS}
                width={750}
                gradient={[themeColor, `${themeColor}dd`]}
                editMode={!!editing}
                initialValues={{ priority: 'medium', impact: 'medium', urgency: 'medium', channel: 'portal' }}
            />
        </div>
        </CMSLayout>
    );
}


