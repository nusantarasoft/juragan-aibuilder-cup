"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Button, Space, Tooltip, Row, Col, Modal, Form, Select, message } from "antd";
import { UserOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, TeamOutlined, ShoppingCartOutlined, DollarOutlined, MailOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomCustomer, EcomStatsType } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { CrmAccountPicker, CrmContactPicker } from "@/components/inventory/CrmPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

const TYPE_COLORS: Record<string, string> = { individual: 'blue', company: 'purple', reseller: 'gold' };
const STATUS_COLORS: Record<string, string> = { active: 'green', inactive: 'default', blocked: 'red' };
const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

const CUSTOMER_FIELDS: FieldDef[] = [
    { name: 'customerCode', label: 'Customer Code', required: true },
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name' },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'company', label: 'Company' },
    { name: 'customerType', label: 'Type' },
    { name: 'address', label: 'Address' },
    { name: 'city', label: 'City' },
    { name: 'accountId', label: 'CRM Account' },
    { name: 'contactId', label: 'CRM Contact' },
];

export default function CustomersPage() {
    const [stats, setStats] = useState<EcomStatsType | null>(null);
    const { themeColor } = usePreferencesStore();
    const [customers, setCustomers] = useState<EcomCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [statsData, custData] = await Promise.all([
                inventoryService.getEcomStats(),
                inventoryService.getEcomCustomers(),
            ]);
            setStats(statsData);
            setCustomers(custData);
        } catch (err) { console.error(err); message.error("Failed to load customers"); } finally { setLoading(false); }
    };

    const handleCreate = async (values: any) => {
        setSaving(true);
        try {
            await inventoryService.createEcomCustomer('default', values);
            message.success("Customer created");
            setModalOpen(false);
            form.resetFields();
            load();
        } catch { message.error("Failed to create customer"); } finally { setSaving(false); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const record of records) {
            try {
                await inventoryService.createEcomCustomer('default', record);
                success++;
            } catch (e: any) {
                failed++;
                errors.push(`${record.customerCode || record.firstName || 'Unknown'}: ${e.message || 'Failed'}`);
            }
        }
        load();
        return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deleteEcomCustomer(id);
            message.success("Customer deleted");
            load();
        } catch { message.error("Failed to delete"); }
    };

    const kpiCards = [
        { title: 'Total Customers', value: stats?.totalCustomers || 0, icon: <TeamOutlined />, color: themeColor },
        { title: 'Active', value: stats?.activeCustomers || 0, icon: <UserOutlined />, color: '#10b981' },
        { title: 'Total Orders', value: stats?.totalOrders || 0, icon: <ShoppingCartOutlined />, color: '#3b82f6' },
        { title: 'Revenue', value: fmtCurrency(stats?.totalRevenue), icon: <DollarOutlined />, color: '#f59e0b' },
    ];

    const filtered = customers.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.firstName?.toLowerCase().includes(s) || c.lastName?.toLowerCase().includes(s) ||
            c.email?.toLowerCase().includes(s) || c.customerCode?.toLowerCase().includes(s) || c.company?.toLowerCase().includes(s);
    });

    const columns = [
        { title: 'Code', dataIndex: 'customerCode', width: 110, render: (v: string) => <Text code className="text-xs">{v}</Text> },
        { title: 'Name', key: 'name', render: (_: any, r: EcomCustomer) => <Text strong className="text-sm">{r.firstName} {r.lastName || ''}</Text> },
        { title: 'Email', dataIndex: 'email', ellipsis: true, render: (v: string) => v ? <Text className="text-xs"><MailOutlined className="mr-1" />{v}</Text> : '—' },
        { title: 'Phone', dataIndex: 'phone', width: 130 },
        { title: 'Company', dataIndex: 'company', width: 150, ellipsis: true, render: (v: string) => v || '—' },
        { title: 'Type', dataIndex: 'customerType', width: 100,
            render: (v: string) => <Tag color={TYPE_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Orders', dataIndex: 'totalOrders', width: 70, sorter: (a: any, b: any) => (a.totalOrders || 0) - (b.totalOrders || 0) },
        { title: 'Total Spent', dataIndex: 'totalSpent', width: 140, sorter: (a: any, b: any) => (a.totalSpent || 0) - (b.totalSpent || 0),
            render: (v: number) => <Text strong style={{ color: themeColor }}>{fmtCurrency(v)}</Text> },
        { title: 'City', dataIndex: 'city', width: 120, render: (v: string) => v || '—' },
        { title: 'Status', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: '', key: 'actions', width: 50,
            render: (_: any, r: EcomCustomer) => (
                <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => Modal.confirm({ title: 'Delete customer?', onOk: () => handleDelete(r.id) })} />
            ),
        },
    ];

    const customerSteps = [
        {
            title: "Identity",
            fields: ["customerCode", "firstName", "lastName", "customerType"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="customerCode" label="Code" rules={[{ required: true }]}><Input placeholder="CUST-XXX" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lastName" label="Last Name"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="company" label="Company"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="customerType" label="Type" initialValue="individual">
                            <Select options={[{ value: 'individual', label: 'Individual' }, { value: 'company', label: 'Company' }, { value: 'reseller', label: 'Reseller' }]} />
                        </Form.Item></Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Contact & Address",
            fields: ["email", "phone", "address", "city"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={16}><Form.Item name="address" label="Address"><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="accountId" label="Link to CRM Account">
                                <CrmAccountPicker placeholder="Search CRM accounts..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="contactId" label="Link to CRM Contact">
                                <CrmContactPicker placeholder="Search CRM contacts..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Customers</AuroraText>}
            subTitle={<DecryptedText text="Customer registry and purchase history" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.5)', borderRadius: 12,
                                }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>{s.icon}</div>
                                        <div>
                                            <Text type="secondary" className="text-xs block">{s.title}</Text>
                                            <Text strong className="text-lg">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Card size="small" style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search customers..."
                            value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 300, borderRadius: 8 }} size="small" />
                        <Space>
                            <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => { form.resetFields(); setModalOpen(true); }}
                                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, borderRadius: 8, border: 'none' }}>
                                New Customer
                            </Button>
                        </Space>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} customers` }} scroll={{ x: 1200 }} />
                </Card>
            </div>

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onSubmit={handleCreate}
                form={form}
                title="New Customer"
                entityName="customer"
                steps={customerSteps}
                fields={CUSTOMER_FIELDS}
                loading={saving}
                onBatchCreate={handleBatchCreate}
                gradient={["#6366f1", "var(--theme-color, #8b5cf6)"]}
            />
        </CMSLayout>
    );
}
