"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import {
    Table, Button, Space, Modal, Form, Input, Select, Tag, Card,
    message, Typography, Tooltip, Drawer, Descriptions, Row, Col, Switch,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    SearchOutlined, EyeOutlined, UserOutlined, BankOutlined,
    PhoneOutlined, MailOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Contact {
    id: string;
    individualId: string;
    accountId: string;
    title: string;
    department: string;
    role: string;
    email: string;
    phone: string;
    mobilePhone: string;
    isPrimary: boolean;
    doNotCall: boolean;
    doNotEmail: boolean;
    status: string;
    description: string;
    individualFirstName: string;
    individualLastName: string;
    individualAvatarUrl: string;
    individualEmail: string;
    accountName: string;
    createdAt: string;
}

interface SimpleEntity { id: string; name?: string; firstName?: string; lastName?: string; }

const ROLES = [
    { value: "decision_maker", label: "Decision Maker" },
    { value: "influencer", label: "Influencer" },
    { value: "end_user", label: "End User" },
    { value: "gatekeeper", label: "Gatekeeper" },
    { value: "champion", label: "Champion" },
];

const CONTACT_FIELDS: FieldDef[] = [
    { name: "individualId", label: "Individual ID", required: true },
    { name: "accountId", label: "Account ID" },
    { name: "title", label: "Title" },
    { name: "department", label: "Department" },
    { name: "role", label: "Role" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "mobilePhone", label: "Mobile Phone" },
    { name: "isPrimary", label: "Primary Contact" },
    { name: "doNotCall", label: "Do Not Call" },
    { name: "doNotEmail", label: "Do Not Email" },
];

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Contact | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const [accountFilter, setAccountFilter] = useState<string | undefined>();
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Contact | null>(null);
    const [individuals, setIndividuals] = useState<SimpleEntity[]>([]);
    const [accounts, setAccounts] = useState<SimpleEntity[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!, $accountId: String, $search: String) {
                    contacts(tenantId: $tenantId, accountId: $accountId, search: $search) {
                        id individualId accountId title department role
                        email phone mobilePhone isPrimary doNotCall doNotEmail
                        status description
                        individualFirstName individualLastName individualAvatarUrl individualEmail
                        accountName createdAt
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, accountId: accountFilter || null, search: search || null });
            setContacts(data.contacts || []);
        } catch (err: any) {
            message.error("Failed to load: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [search, accountFilter]);

    const loadDropdowns = useCallback(async () => {
        try {
            const [indData, accData] = await Promise.all([
                gql(`query($t: String!) { individuals(tenantId: $t) { id firstName lastName } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { accounts(tenantId: $t) { id name } }`, { t: DEFAULT_TENANT_ID }),
            ]);
            setIndividuals(indData.individuals || []);
            setAccounts(accData.accounts || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadData(); loadDropdowns(); }, [loadData, loadDropdowns]);

    const handleSave = async (values: any) => {
        try {
            const input = {
                individualId: values.individualId,
                accountId: values.accountId || null,
                title: values.title || null, department: values.department || null,
                role: values.role || null, email: values.email || null,
                phone: values.phone || null, mobilePhone: values.mobilePhone || null,
                isPrimary: values.isPrimary ?? false,
                doNotCall: values.doNotCall ?? false,
                doNotEmail: values.doNotEmail ?? false,
            };
            if (editing) {
                await gql(`mutation($id: String!, $input: UpdateContactInput!) { updateContact(id: $id, input: $input) { id } }`,
                    { id: editing.id, input });
                message.success("Contact updated");
            } else {
                await gql(`mutation($tenantId: String!, $input: CreateContactInput!) { createContact(tenantId: $tenantId, input: $input) { id } }`,
                    { tenantId: DEFAULT_TENANT_ID, input });
                message.success("Contact created");
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
                const input = { individualId: r.individualId, accountId: r.accountId || null, title: r.title || null, department: r.department || null, role: r.role || null, email: r.email || null, phone: r.phone || null, mobilePhone: r.mobilePhone || null, isPrimary: r.isPrimary ?? false, doNotCall: r.doNotCall ?? false, doNotEmail: r.doNotEmail ?? false };
                await gql(`mutation($tenantId: String!, $input: CreateContactInput!) { createContact(tenantId: $tenantId, input: $input) { id } }`, { tenantId: DEFAULT_TENANT_ID, input });
                success++;
            } catch (e: any) { failed++; errors.push(`Row: ${e.message}`); }
        }
        loadData();
        return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteContact(id: $id) }`, { id });
            message.success("Contact deleted");
            loadData();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const columns: ColumnsType<Contact> = [
        {
            title: "Contact", key: "contact",
            render: (_, r) => (
                <Space>
                    <UserOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <div>
                        <Text strong>{r.individualFirstName} {r.individualLastName}</Text>
                        {r.isPrimary && <Tag color="gold" style={{ marginLeft: 8 }}>Primary</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {[r.title, r.department].filter(Boolean).join(', ') || 'No title'}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Account", key: "account", width: 180,
            render: (_, r) => r.accountName
                ? <Space><BankOutlined /><Text>{r.accountName}</Text></Space>
                : <Text type="secondary">No account</Text>,
        },
        {
            title: "Role", dataIndex: "role", key: "role", width: 130,
            render: (v) => v ? <Tag color="blue">{ROLES.find(r => r.value === v)?.label || v}</Tag> : 'â€”',
        },
        {
            title: "Email", key: "email", width: 200,
            render: (_, r) => r.email || r.individualEmail || 'â€”',
        },
        {
            title: "Phone", dataIndex: "phone", key: "phone", width: 140,
            render: (v) => v || 'â€”',
        },
        {
            title: "Actions", key: "actions", width: 130,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View"><Button type="text" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }} /></Tooltip>
                    <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                            individualId: r.individualId, accountId: r.accountId,
                            title: r.title, department: r.department, role: r.role,
                            email: r.email, phone: r.phone, mobilePhone: r.mobilePhone,
                            isPrimary: r.isPrimary, doNotCall: r.doNotCall, doNotEmail: r.doNotEmail,
                        });
                        setIsModalOpen(true);
                    }} /></Tooltip>
                    <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />}
                        onClick={() => Modal.confirm({ title: `Delete this contact?`, onOk: () => handleDelete(r.id) })} /></Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Contacts</AuroraText>}
            subTitle={<DecryptedText text="Link individuals to accounts with role context" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'crm_contacts', title: 'CRM Contacts', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'First Name', key: 'firstName' }, { header: 'Last Name', key: 'lastName' }, { header: 'Email', key: 'email' }, { header: 'Company', key: 'company' }, { header: 'Phone', key: 'phone' }, { header: 'Status', key: 'leadStatus' }], data: contacts })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'crm_contacts', title: 'CRM Contacts', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'First Name', key: 'firstName' }, { header: 'Last Name', key: 'lastName' }, { header: 'Email', key: 'email' }, { header: 'Company', key: 'company' }, { header: 'Phone', key: 'phone' }, { header: 'Status', key: 'leadStatus' }], data: contacts })} /></Tooltip></RbacGuard>,
                    Add Contact
                </Button>,
            ]}
        >
            <Card style={{ ...glass, marginBottom: 16 }}>
                <Space wrap>
                    <Input prefix={<SearchOutlined />} placeholder="Search by email or title..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ width: 250 }} allowClear />
                    <Select placeholder="Filter by Account" value={accountFilter} onChange={setAccountFilter}
                        allowClear style={{ width: 220 }} showSearch optionFilterProp="label"
                        options={accounts.map(a => ({ value: a.id, label: a.name }))} />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={contacts.map(c => ({ ...c, key: c.id }))}
                    loading={loading} pagination={{ pageSize: 20, showSizeChanger: true }} size="middle" />
            </Card>

            {/* â”€â”€â”€ Contact SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SteppedFormModal
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? "Edit Contact" : "Add Contact"}
                entityName="contact"
                steps={[
                    {
                        title: "Person & Account",
                        icon: <UserOutlined />,
                        fields: ["individualId", "accountId", "title", "department", "role"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="individualId" label="Individual" rules={[{ required: true }]}>
                                        <Select showSearch optionFilterProp="label" placeholder="Select person"
                                            options={individuals.map(i => ({ value: i.id, label: `${i.firstName} ${i.lastName}` }))} />
                                    </Form.Item></Col>
                                    <Col span={12}><Form.Item name="accountId" label="Account (optional)">
                                        <Select showSearch optionFilterProp="label" placeholder="Select account" allowClear
                                            options={accounts.map(a => ({ value: a.id, label: a.name }))} />
                                    </Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="title" label="Title"><Input placeholder="e.g., VP Sales" /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="role" label="Role">
                                        <Select allowClear options={ROLES} />
                                    </Form.Item></Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Contact Details",
                        icon: <PhoneOutlined />,
                        fields: ["email", "phone", "mobilePhone", "isPrimary", "doNotCall", "doNotEmail"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="mobilePhone" label="Mobile"><Input /></Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="isPrimary" label="Primary Contact" valuePropName="checked"><Switch /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="doNotCall" label="Do Not Call" valuePropName="checked"><Switch /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="doNotEmail" label="Do Not Email" valuePropName="checked"><Switch /></Form.Item></Col>
                                </Row>
                            </>
                        ),
                    },
                ]}
                fields={CONTACT_FIELDS}
                width={700}
                onBatchCreate={handleBatchCreate}
                gradient={["#1677ff", "#0ea5e9"]}
                editMode={!!editing}
            />

            <Drawer title="Contact Details" open={detailOpen} onClose={() => setDetailOpen(false)} width={500}>
                {selected && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Person">{selected.individualFirstName} {selected.individualLastName}</Descriptions.Item>
                        <Descriptions.Item label="Account">{selected.accountName || 'No account'}</Descriptions.Item>
                        <Descriptions.Item label="Title">{selected.title || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Department">{selected.department || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Role">{ROLES.find(r => r.value === selected.role)?.label || selected.role || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{selected.email || selected.individualEmail || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{selected.phone || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Mobile">{selected.mobilePhone || 'â€”'}</Descriptions.Item>
                        <Descriptions.Item label="Primary">{selected.isPrimary ? <Tag color="gold">Yes</Tag> : 'No'}</Descriptions.Item>
                        <Descriptions.Item label="Do Not Call">{selected.doNotCall ? <Tag color="red">Yes</Tag> : 'No'}</Descriptions.Item>
                        <Descriptions.Item label="Do Not Email">{selected.doNotEmail ? <Tag color="red">Yes</Tag> : 'No'}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </CMSLayout>
    );
}


