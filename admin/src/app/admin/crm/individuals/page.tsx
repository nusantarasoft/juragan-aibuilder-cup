"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Avatar, Tooltip, Drawer, Descriptions, Row, Col,
    Steps, Switch, InputNumber, DatePicker,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    UserOutlined, SearchOutlined, EyeOutlined, PhoneOutlined,
    MailOutlined, LinkedinOutlined, SwapOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text, Title } = Typography;

interface Individual {
    id: string;
    firstName: string;
    lastName: string;
    salutation: string;
    jobTitle: string;
    department: string;
    company: string;
    status: string;
    leadStatus: string;
    leadSource: string;
    source: string;
    individualType: string;
    avatarUrl: string;
    email: string;
    phone: string;
    gender: string;
    nationality: string;
    linkedinUrl: string;
    twitterHandle: string;
    website: string;
    tags: any;
    customFields: any;
    createdAt: string;
    updatedAt: string;
}

const LEAD_STATUSES = [
    { value: "new", label: "New", color: "blue" },
    { value: "contacted", label: "Contacted", color: "cyan" },
    { value: "qualified", label: "Qualified", color: "green" },
    { value: "converted", label: "Converted", color: "gold" },
    { value: "lost", label: "Lost", color: "red" },
];

const SOURCES = ["web", "phone", "referral", "partner", "campaign", "social", "other"];

export default function IndividualsPage() {
    const [individuals, setIndividuals] = useState<Individual[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Individual | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [leadFilter, setLeadFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Individual | null>(null);
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertTarget, setConvertTarget] = useState<Individual | null>(null);
    const [convertForm] = Form.useForm();
    const [convertStep, setConvertStep] = useState(0);
    const [createDeal, setCreateDeal] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!, $status: String, $leadStatus: String, $search: String) {
                    individuals(tenantId: $tenantId, status: $status, leadStatus: $leadStatus, search: $search) {
                        id firstName lastName salutation jobTitle department company
                        status leadStatus leadSource source individualType
                        avatarUrl email phone gender nationality linkedinUrl twitterHandle website
                        tags customFields createdAt updatedAt
                    }
                }
            `, {
                tenantId: DEFAULT_TENANT_ID,
                status: statusFilter || null,
                leadStatus: leadFilter || null,
                search: search || null,
            });
            setIndividuals(data.individuals || []);
        } catch (err: any) {
            message.error("Failed to load: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, leadFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            const input = {
                firstName: v.firstName, lastName: v.lastName, salutation: v.salutation,
                jobTitle: v.jobTitle, department: v.department, company: v.company,
                leadStatus: v.leadStatus || null, leadSource: v.leadSource || null,
                source: v.source || null, individualType: v.individualType || 'person',
                linkedinUrl: v.linkedinUrl || null, website: v.website || null,
                email: v.email || null, phone: v.phone || null,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateIndividualInput!) { updateIndividual(id: $id, input: $input) { id } }`,
                    { id: editing.id, input });
                message.success("Individual updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateIndividualInput!) { createIndividual(tenantId: $tenantId, input: $input) { id } }`,
                    { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Individual created");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteIndividual(id: $id) }`, { id });
            message.success("Individual deleted");
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleConvert = async () => {
        try {
            const v = await convertForm.validateFields();
            const input: any = {
                individualId: convertTarget!.id,
                accountName: v.accountName || null,
                accountId: v.accountId || null,
                contactTitle: v.contactTitle || null,
                contactRole: v.contactRole || null,
                createDeal: createDeal,
            };
            if (createDeal) {
                input.dealName = v.dealName || null;
                input.dealAmount = v.dealAmount || null;
                input.dealStage = v.dealStage || 'prospecting';
                input.dealCloseDate = v.dealCloseDate?.format('YYYY-MM-DD') || null;
            }
            await gql(`mutation($tenantId: String!, $input: ConvertLeadInput!) { convertLead(tenantId: $tenantId, input: $input) { accountId contactId dealId } }`,
                { tenantId: DEFAULT_TENANT_ID, input });
            message.success(`${convertTarget!.firstName} ${convertTarget!.lastName} converted successfully!`);
            setConvertOpen(false);
            convertForm.resetFields();
            setConvertTarget(null);
            setConvertStep(0);
            setCreateDeal(false);
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const columns: ColumnsType<Individual> = [
        {
            title: "Name", key: "name", sorter: (a, b) => a.lastName.localeCompare(b.lastName),
            render: (_, r) => (
                <Space>
                    <Avatar src={r.avatarUrl} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                    <div>
                        <Text strong>{r.salutation ? `${r.salutation} ` : ''}{r.firstName} {r.lastName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {[r.jobTitle, r.company].filter(Boolean).join(' at ') || 'No title'}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Email", dataIndex: "email", key: "email", width: 200, ellipsis: true,
            render: (v: string) => v || '—',
        },
        {
            title: "Phone", dataIndex: "phone", key: "phone", width: 140,
            render: (v: string) => v || '—',
        },
        {
            title: "Lead Status", key: "leadStatus", width: 130,
            render: (_, r) => {
                if (!r.leadStatus) return <Tag>Not a Lead</Tag>;
                const ls = LEAD_STATUSES.find(s => s.value === r.leadStatus);
                return <Tag color={ls?.color || 'default'}>{ls?.label || r.leadStatus}</Tag>;
            },
            filters: LEAD_STATUSES.map(s => ({ text: s.label, value: s.value })),
            onFilter: (v, r) => r.leadStatus === v,
        },
        {
            title: "Source", dataIndex: "source", key: "source", width: 100,
            render: (v) => v ? <Tag>{v}</Tag> : '—',
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 100,
            render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
        },
        {
            title: "Actions", key: "actions", width: 150,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                            firstName: r.firstName, lastName: r.lastName, salutation: r.salutation,
                            jobTitle: r.jobTitle, department: r.department, company: r.company,
                            leadStatus: r.leadStatus, leadSource: r.leadSource, source: r.source,
                            individualType: r.individualType, linkedinUrl: r.linkedinUrl, website: r.website,
                            email: r.email, phone: r.phone,
                        });
                        setIsModalOpen(true);
                    }} /></Tooltip>
                    {r.leadStatus && r.leadStatus !== 'converted' && (
                        <Tooltip title="Convert Lead"><Button type="text" icon={<SwapOutlined />} style={{ color: '#52c41a' }}
                            onClick={() => {
                                setConvertTarget(r);
                                convertForm.resetFields();
                                convertForm.setFieldsValue({ accountName: r.company || '', contactTitle: r.jobTitle || '' });
                                setConvertStep(0);
                                setCreateDeal(false);
                                setConvertOpen(true);
                            }} /></Tooltip>
                    )}
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete ${r.firstName} ${r.lastName}?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Individuals"
            subTitle="People in your CRM — contacts, leads, and team members"
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>
                    Add Individual
                </Button>,
            ]}
        >
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search by name..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 130 }}
                        options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                    <Select placeholder="Lead Status" value={leadFilter} onChange={setLeadFilter} allowClear style={{ width: 150 }}
                        options={LEAD_STATUSES} />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={individuals.map(i => ({ ...i, key: i.id }))}
                    loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" />
            </Card>

            <Modal title={editing ? "Edit Individual" : "Add Individual"} open={isModalOpen} onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }} okText={editing ? "Update" : "Create"} width={700}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={6}><Form.Item name="salutation" label="Salutation">
                            <Select allowClear options={['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'].map(v => ({ value: v, label: v }))} />
                        </Form.Item></Col>
                        <Col span={9}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item></Col>
                        <Col span={9}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="jobTitle" label="Job Title"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="company" label="Company"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="source" label="Source">
                            <Select allowClear options={SOURCES.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="leadStatus" label="Lead Status">
                            <Select allowClear options={LEAD_STATUSES} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="leadSource" label="Lead Source">
                            <Select allowClear options={SOURCES.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="individualType" label="Type" initialValue="person">
                            <Select options={[{ value: 'person', label: 'Person' }, { value: 'organization', label: 'Organization' }]} />
                        </Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="linkedinUrl" label="LinkedIn URL"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="website" label="Website"><Input /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            <Drawer title="Individual Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Name">
                            {selected.salutation ? `${selected.salutation} ` : ''}{selected.firstName} {selected.lastName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Job Title">{selected.jobTitle || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Company">{selected.company || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Department">{selected.department || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{selected.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Lead Status">
                            {selected.leadStatus ? <Tag color={LEAD_STATUSES.find(s => s.value === selected.leadStatus)?.color}>{selected.leadStatus}</Tag> : 'Not a Lead'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Source">{selected.source || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Lead Source">{selected.leadSource || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={selected.status === 'active' ? 'green' : 'default'}>{selected.status}</Tag></Descriptions.Item>
                        {selected.linkedinUrl && <Descriptions.Item label="LinkedIn"><a href={selected.linkedinUrl} target="_blank" rel="noreferrer">{selected.linkedinUrl}</a></Descriptions.Item>}
                        {selected.website && <Descriptions.Item label="Website"><a href={selected.website} target="_blank" rel="noreferrer">{selected.website}</a></Descriptions.Item>}
                        <Descriptions.Item label="Created">{new Date(selected.createdAt).toLocaleDateString()}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>

            {/* Convert Lead Wizard */}
            <Modal
                title={`Convert Lead: ${convertTarget?.firstName || ''} ${convertTarget?.lastName || ''}`}
                open={convertOpen}
                onCancel={() => { setConvertOpen(false); setConvertTarget(null); setConvertStep(0); }}
                width={650}
                footer={[
                    convertStep > 0 && <Button key="back" onClick={() => setConvertStep(s => s - 1)}>Back</Button>,
                    convertStep < 2 && <Button key="next" type="primary" onClick={() => setConvertStep(s => s + 1)}>Next</Button>,
                    convertStep === 2 && <Button key="convert" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={handleConvert}>Convert Lead</Button>,
                ].filter(Boolean)}
            >
                <Steps current={convertStep} size="small" style={{ marginBottom: 24 }}
                    items={[
                        { title: 'Account' },
                        { title: 'Contact' },
                        { title: 'Deal (Optional)' },
                    ]}
                />
                <Form form={convertForm} layout="vertical">
                    {convertStep === 0 && (
                        <>
                            <Form.Item name="accountName" label="Account Name" rules={[{ required: true }]}>
                                <Input placeholder="e.g., Acme Corp" />
                            </Form.Item>
                            <Typography.Text type="secondary">A new account will be created, or you can link to an existing one by ID below.</Typography.Text>
                            <Form.Item name="accountId" label="Or Link to Existing Account (ID)" style={{ marginTop: 12 }}>
                                <Input placeholder="Existing account UUID (optional)" />
                            </Form.Item>
                        </>
                    )}
                    {convertStep === 1 && (
                        <>
                            <Form.Item name="contactTitle" label="Contact Title">
                                <Input placeholder="e.g., VP of Sales" />
                            </Form.Item>
                            <Form.Item name="contactRole" label="Contact Role">
                                <Select allowClear options={[
                                    { value: 'decision_maker', label: 'Decision Maker' },
                                    { value: 'influencer', label: 'Influencer' },
                                    { value: 'end_user', label: 'End User' },
                                    { value: 'champion', label: 'Champion' },
                                ]} />
                            </Form.Item>
                        </>
                    )}
                    {convertStep === 2 && (
                        <>
                            <Form.Item label="Create a Deal?">
                                <Switch checked={createDeal} onChange={setCreateDeal} />
                            </Form.Item>
                            {createDeal && (
                                <>
                                    <Form.Item name="dealName" label="Deal Name" rules={[{ required: createDeal }]}>
                                        <Input placeholder="e.g., Enterprise License" />
                                    </Form.Item>
                                    <Row gutter={16}>
                                        <Col span={8}><Form.Item name="dealAmount" label="Amount">
                                            <InputNumber style={{ width: '100%' }} prefix="$" />
                                        </Form.Item></Col>
                                        <Col span={8}><Form.Item name="dealStage" label="Stage" initialValue="prospecting">
                                            <Select options={[
                                                { value: 'prospecting', label: 'Prospecting' },
                                                { value: 'qualification', label: 'Qualification' },
                                                { value: 'proposal', label: 'Proposal' },
                                            ]} />
                                        </Form.Item></Col>
                                        <Col span={8}><Form.Item name="dealCloseDate" label="Close Date">
                                            <DatePicker style={{ width: '100%' }} />
                                        </Form.Item></Col>
                                    </Row>
                                </>
                            )}
                        </>
                    )}
                </Form>
            </Modal>
        </CMSLayout>
    );
}
