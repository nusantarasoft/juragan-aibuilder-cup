"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProForm } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Typography, Tooltip, Badge } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, SearchOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useRouter } from "next/navigation";

const { Text } = Typography;

const GET_TICKETS = `query($status: String, $priority: String, $search: String) { itsmTickets(status: $status, priority: $priority, search: $search) { id ticketNumber title description categoryId priority status impact urgency contactId accountId individualId pmStakeholderId reporterName reporterEmail assignedTo assignedGroup channel slaResolutionDue createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const SEARCH_REPORTERS = `query($search: String!) { itsmSearchReporters(search: $search) { id name email type entityId extra } }`;
const CREATE_TICKET = `mutation($tenantId: String!, $input: CreateItsmTicketInput!) { createItsmTicket(tenantId: $tenantId, input: $input) { id ticketNumber } }`;
const UPDATE_TICKET = `mutation($id: ID!, $input: UpdateItsmTicketInput!) { updateItsmTicket(id: $id, input: $input) { id } }`;
const DELETE_TICKET = `mutation($id: ID!) { deleteItsmTicket(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };
const channelLabels: Record<string, string> = { portal: '🌐 Portal', email: '📧 Email', phone: '📞 Phone', chat: '💬 Chat' };
const typeLabels: Record<string, string> = { contact: '📇 Contact', individual: '👤 Individual', account: '🏢 Account', pm_stakeholder: '📋 PM Stakeholder' };

export default function ItsmTicketsPage() {
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const [tickets, setTickets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterPriority, setFilterPriority] = useState<string | undefined>(undefined);
    const [searchText, setSearchText] = useState('');
    const [reporterResults, setReporterResults] = useState<any[]>([]);
    const [selectedReporter, setSelectedReporter] = useState<any>(null);

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

            // Link reporter from cross-module search
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
            loadData();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
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
            render: (v: string) => v || <Text type="secondary" italic>Unassigned</Text>
        },
        { title: 'Channel', dataIndex: 'channel', width: 90, render: (v: string) => channelLabels[v] || v },
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
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete this ticket?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
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
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setSelectedReporter(null); setModalOpen(true); }}>
                        New Ticket
                    </Button>,
                ]}
            />

            <ModalForm
                title={editing ? `Edit ${editing.ticketNumber}` : "New Ticket"}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onFinish={handleSave}
                initialValues={editing || { priority: 'medium', impact: 'medium', urgency: 'medium', channel: 'portal' }}
                modalProps={{ destroyOnClose: true, width: 750 }}
            >
                <ProFormText name="title" label="Title" rules={[{ required: true }]} placeholder="Brief description of the issue" />
                <ProFormTextArea name="description" label="Description" placeholder="Detailed description of the issue, steps to reproduce, etc." fieldProps={{ rows: 4 }} />

                <ProForm.Group>
                    <ProFormSelect name="categoryId" label="Category" width="md"
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                    />
                    <ProFormSelect name="channel" label="Channel" width="sm"
                        options={[
                            { value: 'portal', label: '🌐 Portal' }, { value: 'email', label: '📧 Email' },
                            { value: 'phone', label: '📞 Phone' }, { value: 'chat', label: '💬 Chat' },
                        ]}
                    />
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormSelect name="priority" label="Priority" width="sm"
                        options={[
                            { value: 'critical', label: '🔴 Critical' }, { value: 'high', label: '🟠 High' },
                            { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '🟢 Low' },
                        ]}
                    />
                    <ProFormSelect name="impact" label="Impact" width="sm"
                        options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
                    />
                    <ProFormSelect name="urgency" label="Urgency" width="sm"
                        options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
                    />
                </ProForm.Group>

                {/* Reporter Section — Cross-module search */}
                <ProForm.Group title="Reporter">
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Search CRM Contacts, Individuals, Accounts, or PM Stakeholders:</Text>
                        <Select
                            showSearch
                            placeholder="Search reporter..."
                            filterOption={false}
                            onSearch={handleSearchReporter}
                            onChange={(_, opt: any) => {
                                const r = reporterResults.find(rr => rr.id === opt?.value);
                                setSelectedReporter(r || null);
                            }}
                            style={{ width: '100%' }}
                            suffixIcon={<SearchOutlined />}
                            value={selectedReporter?.id}
                            allowClear
                            onClear={() => setSelectedReporter(null)}
                            notFoundContent={null}
                        >
                            {reporterResults.map(r => (
                                <Select.Option key={r.id} value={r.id}>
                                    <Space>
                                        <Tag color={r.type === 'contact' ? 'blue' : r.type === 'individual' ? 'green' : r.type === 'account' ? 'gold' : 'purple'}>
                                            {typeLabels[r.type] || r.type}
                                        </Tag>
                                        <span><strong>{r.name}</strong>{r.email ? ` — ${r.email}` : ''}{r.extra ? ` (${r.extra})` : ''}</span>
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
                </ProForm.Group>

                <ProForm.Group>
                    <ProFormText name="reporterName" label="Reporter Name" width="md" placeholder="Or enter manually" />
                    <ProFormText name="reporterEmail" label="Reporter Email" width="md" placeholder="reporter@company.com" />
                </ProForm.Group>

                <ProForm.Group title="Assignment">
                    <ProFormText name="assignedTo" label="Assigned To" width="md" placeholder="Agent name" />
                    <ProFormText name="assignedGroup" label="Support Group" width="md" placeholder="e.g., L1 Support, Network Team" />
                </ProForm.Group>

                {editing && (
                    <>
                        <ProFormSelect name="status" label="Status"
                            options={[
                                { value: 'new', label: 'New' }, { value: 'open', label: 'Open' },
                                { value: 'in_progress', label: 'In Progress' }, { value: 'pending', label: 'Pending' },
                                { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
                            ]}
                        />
                        <ProFormTextArea name="resolutionNotes" label="Resolution Notes" />
                    </>
                )}
            </ModalForm>
        </div>
    );
}
