"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col, InputNumber,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, BankOutlined, PhoneOutlined,
    GlobalOutlined, DollarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

interface Account {
    id: string;
    name: string;
    accountNumber: string;
    type: string;
    industry: string;
    website: string;
    phone: string;
    email: string;
    annualRevenue: number;
    employeeCount: number;
    ownership: string;
    parentAccountId: string;
    description: string;
    status: string;
    rating: string;
    createdAt: string;
}

const TYPES = [
    { value: "customer", label: "Customer" },
    { value: "partner", label: "Partner" },
    { value: "vendor", label: "Vendor" },
    { value: "prospect", label: "Prospect" },
    { value: "other", label: "Other" },
];

const INDUSTRIES = [
    "Technology", "Finance", "Healthcare", "Education", "Retail",
    "Manufacturing", "Real Estate", "Media", "Consulting", "Government",
    "Energy", "Telecommunications", "Transportation", "Hospitality", "Other",
];

const RATINGS = [
    { value: "hot", label: "Hot", color: "red" },
    { value: "warm", label: "Warm", color: "orange" },
    { value: "cold", label: "Cold", color: "blue" },
];

const ACCOUNT_FIELDS: FieldDef[] = [
    { name: "name", label: "Account Name", required: true },
    { name: "type", label: "Type" },
    { name: "rating", label: "Rating" },
    { name: "industry", label: "Industry" },
    { name: "accountNumber", label: "Account Number" },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email" },
    { name: "website", label: "Website" },
    { name: "annualRevenue", label: "Annual Revenue" },
    { name: "employeeCount", label: "Employees" },
    { name: "ownership", label: "Ownership" },
    { name: "parentAccountId", label: "Parent Account" },
    { name: "description", label: "Description" },
];

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Account | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!, $type: String, $search: String) {
                    accounts(tenantId: $tenantId, type: $type, search: $search) {
                        id name accountNumber type industry website phone email
                        annualRevenue employeeCount ownership parentAccountId
                        description status rating createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, type: typeFilter || null, search: search || null });
            setAccounts(data.accounts || []);
        } catch (err: any) {
            message.error("Failed to load: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [search, typeFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = {
                name: values.name, accountNumber: values.accountNumber || null,
                type: values.type || 'prospect', industry: values.industry || null,
                website: values.website || null, phone: values.phone || null, email: values.email || null,
                annualRevenue: values.annualRevenue || null, employeeCount: values.employeeCount || null,
                ownership: values.ownership || null, description: values.description || null,
                rating: values.rating || null, parentAccountId: values.parentAccountId || null,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateAccountInput!) { updateAccount(id: $id, input: $input) { id } }`,
                    { id: editing.id, input });
                message.success("Account updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateAccountInput!) { createAccount(tenantId: $tenantId, input: $input) { id } }`,
                    { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Account created");
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try {
                const input = { name: r.name, type: r.type || 'prospect', industry: r.industry || null, phone: r.phone || null, email: r.email || null, website: r.website || null, annualRevenue: r.annualRevenue || null, employeeCount: r.employeeCount || null, ownership: r.ownership || null, description: r.description || null, rating: r.rating || null, accountNumber: r.accountNumber || null };
                await gql(`mutation($tenantId: String!, $input: CreateAccountInput!) { createAccount(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name || 'Unknown'}: ${e.message}`); }
        }
        loadData();
        return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteAccount(id: $id) }`, { id });
            message.success("Account deleted");
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const formatRevenue = (v: number) => {
        if (!v) return '—';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v}`;
    };

    const columns: ColumnsType<Account> = [
        {
            title: "Account", key: "account", sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <Space>
                    <BankOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                    <div>
                        <Text strong>{r.name}</Text>
                        {r.rating && <Tag color={RATINGS.find(rt => rt.value === r.rating)?.color} style={{ marginLeft: 8 }}>
                            {RATINGS.find(rt => rt.value === r.rating)?.label}
                        </Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.industry || 'No industry'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Type", dataIndex: "type", key: "type", width: 110,
            render: (v) => <Tag color={v === 'customer' ? 'green' : v === 'prospect' ? 'blue' : 'default'}>
                {TYPES.find(t => t.value === v)?.label || v}
            </Tag>,
            filters: TYPES.map(t => ({ text: t.label, value: t.value })),
            onFilter: (v, r) => r.type === v,
        },
        {
            title: "Phone", dataIndex: "phone", key: "phone", width: 140,
            render: (v) => v || '—',
        },
        {
            title: "Revenue", key: "revenue", width: 110, align: "right",
            sorter: (a, b) => (a.annualRevenue || 0) - (b.annualRevenue || 0),
            render: (_, r) => <Text>{formatRevenue(r.annualRevenue)}</Text>,
        },
        {
            title: "Employees", dataIndex: "employeeCount", key: "employees", width: 100, align: "right",
            render: (v) => v ? v.toLocaleString() : '—',
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 90,
            render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
        },
        {
            title: "Actions", key: "actions", width: 130,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                            name: r.name, accountNumber: r.accountNumber, type: r.type,
                            industry: r.industry, website: r.website, phone: r.phone,
                            email: r.email, annualRevenue: r.annualRevenue,
                            employeeCount: r.employeeCount, ownership: r.ownership,
                            description: r.description, rating: r.rating,
                            parentAccountId: r.parentAccountId,
                        });
                        setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Accounts"
            subTitle="Companies, organizations, and business entities"
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>
                    Add Account
                </Button>,
            ]}
        >
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search by name..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Type" value={typeFilter} onChange={setTypeFilter} allowClear style={{ width: 150 }}
                        options={TYPES} />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={accounts.map(a => ({ ...a, key: a.id }))}
                    loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" />
            </Card>

            {/* ─── Account SteppedFormModal ─────────────── */}
            <SteppedFormModal
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? "Edit Account" : "Add Account"}
                entityName="account"
                steps={[
                    {
                        title: "Company Info",
                        icon: <BankOutlined />,
                        fields: ["name", "type", "rating", "industry", "accountNumber"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
                                        <Input placeholder="e.g., Acme Corp" />
                                    </Form.Item></Col>
                                    <Col span={6}><Form.Item name="type" label="Type" initialValue="prospect">
                                        <Select options={TYPES} />
                                    </Form.Item></Col>
                                    <Col span={6}><Form.Item name="rating" label="Rating">
                                        <Select allowClear options={RATINGS} />
                                    </Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="industry" label="Industry">
                                        <Select allowClear showSearch options={INDUSTRIES.map(i => ({ value: i, label: i }))} />
                                    </Form.Item></Col>
                                    <Col span={12}><Form.Item name="accountNumber" label="Account Number"><Input /></Form.Item></Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Contact & Financial",
                        icon: <DollarOutlined />,
                        fields: ["phone", "email", "website", "annualRevenue", "employeeCount", "ownership", "parentAccountId", "description"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="website" label="Website"><Input /></Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="annualRevenue" label="Annual Revenue">
                                        <InputNumber style={{ width: '100%' }} prefix="$" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                                    </Form.Item></Col>
                                    <Col span={8}><Form.Item name="employeeCount" label="Employees">
                                        <InputNumber style={{ width: '100%' }} min={0} />
                                    </Form.Item></Col>
                                    <Col span={8}><Form.Item name="ownership" label="Ownership">
                                        <Select allowClear options={['Public', 'Private', 'Subsidiary', 'Government', 'Other'].map(v => ({ value: v.toLowerCase(), label: v }))} />
                                    </Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="parentAccountId" label="Parent Account">
                                        <Select allowClear showSearch optionFilterProp="label" placeholder="Select parent"
                                            options={accounts.filter(a => editing ? a.id !== editing.id : true).map(a => ({ value: a.id, label: a.name }))} />
                                    </Form.Item></Col>
                                </Row>
                                <Form.Item name="description" label="Description">
                                    <Input.TextArea rows={2} />
                                </Form.Item>
                            </>
                        ),
                    },
                ]}
                fields={ACCOUNT_FIELDS}
                width={700}
                onBatchCreate={handleBatchCreate}
                gradient={["#1677ff", "#722ed1"]}
                editMode={!!editing}
            />

            <Drawer title="Account Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
                        <Descriptions.Item label="Type"><Tag>{TYPES.find(t => t.value === selected.type)?.label || selected.type}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Industry">{selected.industry || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Rating">
                            {selected.rating ? <Tag color={RATINGS.find(r => r.value === selected.rating)?.color}>{selected.rating}</Tag> : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone">{selected.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Website">{selected.website ? <a href={selected.website} target="_blank" rel="noreferrer">{selected.website}</a> : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Annual Revenue">{formatRevenue(selected.annualRevenue)}</Descriptions.Item>
                        <Descriptions.Item label="Employees">{selected.employeeCount?.toLocaleString() || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Ownership">{selected.ownership || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Account #">{selected.accountNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Description">{selected.description || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Created">{new Date(selected.createdAt).toLocaleDateString()}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}
