"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Card, Table, Button, Tag, Input, Space, Tabs, Statistic, Row, Col,
    Form, Select, Rate, message, Popconfirm, Tooltip, DatePicker,
    InputNumber, Drawer, Descriptions, Badge, Typography,
} from "antd";
import {
    PlusOutlined, SearchOutlined, ShopOutlined, FileTextOutlined,
    ShoppingCartOutlined, CheckCircleOutlined, InboxOutlined,
    TeamOutlined, DollarOutlined, ClockCircleOutlined,
    SendOutlined, EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined,
    ReloadOutlined, GlobalOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { inventoryService } from "@/lib/inventoryService";
import { CrmAccountPicker } from "@/components/inventory/CrmPicker";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const TENANT = "default";
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SUPPLIER_FIELDS: FieldDef[] = [
    { name: 'code', label: 'Supplier Code', required: true },
    { name: 'name', label: 'Name', required: true },
    { name: 'contactPerson', label: 'Contact Person' },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'city', label: 'City' },
    { name: 'address', label: 'Address' },
    { name: 'paymentTerms', label: 'Payment Terms' },
    { name: 'currency', label: 'Currency' },
    { name: 'leadTimeDays', label: 'Lead Time (days)', type: 'number' },
    { name: 'rating', label: 'Rating', type: 'number' },
    { name: 'taxId', label: 'Tax ID' },
    { name: 'status', label: 'Status' },
    { name: 'notes', label: 'Notes' },
];

// ─── Status Colors ─────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    active: "green", inactive: "default", blacklisted: "red",
    draft: "default", pending_approval: "orange", approved: "green",
    rejected: "red", converted: "blue", cancelled: "default",
    sent: "cyan", confirmed: "green", partial_received: "gold", received: "blue",
    inspecting: "orange", accepted: "green", failed: "red",
    passed: "green", partial: "gold",
    low: "blue", normal: "default", high: "orange", urgent: "red",
};

const PRIORITY_ICONS: Record<string, string> = {
    low: "🔽", normal: "➖", high: "🔼", urgent: "🔴",
};

export default function ProcurementPage() {
    const [activeTab, setActiveTab] = useState("suppliers");
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState<any>(null);

    // Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [prs, setPrs] = useState<any[]>([]);
    const [pos, setPos] = useState<any[]>([]);
    const [grns, setGrns] = useState<any[]>([]);

    // Modals
    const [supplierModal, setSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [detailDrawer, setDetailDrawer] = useState<{ type: string; data: any } | null>(null);

    const [supplierForm] = Form.useForm();

    // ─── Load Data ─────────────────────────────────────────
    const loadStats = useCallback(async () => {
        try { setStats(await inventoryService.getProcurementStats(TENANT)); } catch { }
    }, []);

    const loadSuppliers = useCallback(async () => {
        setLoading(true);
        try { setSuppliers(await inventoryService.getSuppliers(TENANT, undefined, search || undefined)); } catch { }
        setLoading(false);
    }, [search]);

    const loadPRs = useCallback(async () => {
        setLoading(true);
        try { setPrs(await inventoryService.getPurchaseRequisitions(TENANT, undefined, search || undefined)); } catch { }
        setLoading(false);
    }, [search]);

    const loadPOs = useCallback(async () => {
        setLoading(true);
        try { setPos(await inventoryService.getPurchaseOrders(TENANT, undefined, undefined, search || undefined)); } catch { }
        setLoading(false);
    }, [search]);

    const loadGRNs = useCallback(async () => {
        setLoading(true);
        try { setGrns(await inventoryService.getGoodsReceivedNotes(TENANT)); } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => {
        if (activeTab === "suppliers") loadSuppliers();
        else if (activeTab === "pr") loadPRs();
        else if (activeTab === "po") loadPOs();
        else if (activeTab === "grn") loadGRNs();
    }, [activeTab, loadSuppliers, loadPRs, loadPOs, loadGRNs]);

    // ─── Supplier CRUD ─────────────────────────────────────
    const openSupplierModal = (supplier?: any) => {
        setEditingSupplier(supplier || null);
        if (supplier) {
            supplierForm.setFieldsValue(supplier);
        } else {
            supplierForm.resetFields();
        }
        setSupplierModal(true);
    };

    const saveSupplier = async (values: any) => {
        if (editingSupplier) {
            await inventoryService.updateSupplier(editingSupplier.id, values);
            message.success("Supplier updated");
        } else {
            await inventoryService.createSupplier(TENANT, values);
            message.success("Supplier created");
        }
        setSupplierModal(false);
        supplierForm.resetFields();
        setEditingSupplier(null);
        loadSuppliers();
        loadStats();
    };

    const handleBatchCreateSupplier = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try {
                await inventoryService.createSupplier(TENANT, r);
                success++;
            } catch (e: any) {
                failed++;
                errors.push(`${r.code || 'Unknown'}: ${e.message || 'Failed'}`);
            }
        }
        loadSuppliers();
        loadStats();
        return { success, failed, errors };
    };

    const deleteSupplier = async (id: string) => {
        try {
            await inventoryService.deleteSupplier(id);
            message.success("Supplier deleted");
            loadSuppliers();
            loadStats();
        } catch (e: any) { message.error(e.message); }
    };

    // ─── PR Actions ────────────────────────────────────────
    const approvePR = async (id: string) => {
        try {
            await inventoryService.updatePrStatus(id, "approved", "Admin");
            message.success("PR approved");
            loadPRs(); loadStats();
        } catch (e: any) { message.error(e.message); }
    };

    const rejectPR = async (id: string) => {
        try {
            await inventoryService.updatePrStatus(id, "rejected", undefined, "Rejected by admin");
            message.success("PR rejected");
            loadPRs(); loadStats();
        } catch (e: any) { message.error(e.message); }
    };

    // ─── PO Actions ────────────────────────────────────────
    const updatePOStatus = async (id: string, status: string) => {
        try {
            await inventoryService.updatePoStatus(id, status);
            message.success(`PO status → ${status}`);
            loadPOs(); loadStats();
        } catch (e: any) { message.error(e.message); }
    };

    // ─── GRN Actions ───────────────────────────────────────
    const acceptGRN = async (id: string) => {
        try {
            await inventoryService.acceptGrn(id, TENANT);
            message.success("GRN accepted — stock updated");
            loadGRNs(); loadPOs(); loadStats();
        } catch (e: any) { message.error(e.message); }
    };

    // ─── Format Helpers ────────────────────────────────────
    const fmtMoney = (v?: number, cur = "IDR") =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(v || 0);
    const fmtDate = (d?: string) => d ? dayjs(d).format("DD MMM YYYY") : "-";

    // ─── Supplier Columns ──────────────────────────────────
    const supplierColumns = [
        { title: "Code", dataIndex: "code", key: "code", width: 100, render: (v: string) => <Text strong style={{ fontFamily: "monospace" }}>{v}</Text> },
        { title: "Name", dataIndex: "name", key: "name", sorter: (a: any, b: any) => a.name.localeCompare(b.name) },
        { title: "Contact", dataIndex: "contactPerson", key: "contact" },
        { title: "City", dataIndex: "city", key: "city" },
        { title: "Rating", dataIndex: "rating", key: "rating", width: 150, render: (v: number) => <Rate disabled defaultValue={v} allowHalf style={{ fontSize: 14 }} /> },
        { title: "Terms", dataIndex: "paymentTerms", key: "terms", width: 100 },
        { title: "Lead", dataIndex: "leadTimeDays", key: "lead", width: 70, render: (v: number) => `${v}d` },
        { title: "Status", dataIndex: "status", key: "status", width: 100, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
        {
            title: "", key: "actions", width: 120,
            render: (_: any, r: any) => (
                <Space size="small">
                    <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer({ type: "supplier", data: r })} /></Tooltip>
                    <Button size="small" onClick={() => openSupplierModal(r)}>Edit</Button>
                    <Popconfirm title="Delete?" onConfirm={() => deleteSupplier(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ─── PR Columns ────────────────────────────────────────
    const prColumns = [
        { title: "PR #", dataIndex: "prNumber", key: "pr", width: 130, render: (v: string) => <Text strong style={{ fontFamily: "monospace" }}>{v}</Text> },
        { title: "Title", dataIndex: "title", key: "title" },
        { title: "Requested By", dataIndex: "requestedBy", key: "by", width: 120 },
        { title: "Department", dataIndex: "department", key: "dept", width: 120 },
        { title: "Priority", dataIndex: "priority", key: "pri", width: 100, render: (v: string) => <span>{PRIORITY_ICONS[v]} <Tag color={STATUS_COLORS[v]}>{v}</Tag></span> },
        { title: "Est. Total", dataIndex: "totalEstimated", key: "total", width: 140, render: (v: number) => fmtMoney(v) },
        { title: "Required", dataIndex: "requiredDate", key: "date", width: 110, render: fmtDate },
        { title: "Status", dataIndex: "status", key: "status", width: 130, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v.replace("_", " ")}</Tag> },
        {
            title: "", key: "actions", width: 120,
            render: (_: any, r: any) => (
                <Space size="small">
                    <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer({ type: "pr", data: r })} /></Tooltip>
                    {r.status === "pending_approval" && (
                        <>
                            <Tooltip title="Approve"><Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approvePR(r.id)} /></Tooltip>
                            <Tooltip title="Reject"><Button size="small" danger icon={<CloseOutlined />} onClick={() => rejectPR(r.id)} /></Tooltip>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // ─── PO Columns ────────────────────────────────────────
    const poColumns = [
        { title: "PO #", dataIndex: "poNumber", key: "po", width: 130, render: (v: string) => <Text strong style={{ fontFamily: "monospace" }}>{v}</Text> },
        { title: "Title", dataIndex: "title", key: "title" },
        { title: "Supplier", dataIndex: "supplierId", key: "sup", width: 130, render: (v: string) => {
            const s = suppliers.find((s: any) => s.id === v);
            return s ? s.name : v?.slice(0, 8) + "...";
        }},
        { title: "Expected", dataIndex: "expectedDelivery", key: "date", width: 110, render: fmtDate },
        { title: "Total", dataIndex: "totalAmount", key: "total", width: 150, render: (v: number) => <Text strong>{fmtMoney(v)}</Text> },
        { title: "Status", dataIndex: "status", key: "status", width: 130, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v.replace("_", " ")}</Tag> },
        {
            title: "", key: "actions", width: 160,
            render: (_: any, r: any) => (
                <Space size="small">
                    <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer({ type: "po", data: r })} /></Tooltip>
                    {r.status === "draft" && (
                        <Tooltip title="Send to Supplier"><Button size="small" type="primary" icon={<SendOutlined />} onClick={() => updatePOStatus(r.id, "sent")} /></Tooltip>
                    )}
                    {r.status === "sent" && (
                        <Tooltip title="Mark Confirmed"><Button size="small" style={{ borderColor: "#52c41a", color: "#52c41a" }} icon={<CheckCircleOutlined />} onClick={() => updatePOStatus(r.id, "confirmed")} /></Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    // ─── GRN Columns ───────────────────────────────────────
    const grnColumns = [
        { title: "GRN #", dataIndex: "grnNumber", key: "grn", width: 130, render: (v: string) => <Text strong style={{ fontFamily: "monospace" }}>{v}</Text> },
        { title: "PO #", key: "po", width: 130, render: (_: any, r: any) => {
            const po = pos.find((p: any) => p.id === r.poId);
            return po ? <Text style={{ fontFamily: "monospace" }}>{po.poNumber}</Text> : r.poId?.slice(0, 8) + "...";
        }},
        { title: "Received By", dataIndex: "receivedBy", key: "by", width: 130 },
        { title: "Date", dataIndex: "receivedDate", key: "date", width: 110, render: fmtDate },
        { title: "Quality", dataIndex: "qualityCheck", key: "qc", width: 100, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
        { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
        {
            title: "", key: "actions", width: 120,
            render: (_: any, r: any) => (
                <Space size="small">
                    <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer({ type: "grn", data: r })} /></Tooltip>
                    {(r.status === "draft" || r.status === "inspecting") && (
                        <Popconfirm title="Accept GRN and update stock?" onConfirm={() => acceptGRN(r.id)}>
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />}>Accept</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#1890ff", "#13c2c2", "#52c41a", "#722ed1", "#fa8c16"]}>Procurement</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manage suppliers, purchase requisitions, purchase orders, and goods received"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential
                />
            }
        >
        <div style={{ padding: 0 }}>
            {/* Stat Cards */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {[
                    { title: 'Suppliers', value: stats?.totalSuppliers || 0, icon: <TeamOutlined />, color: '#3b82f6' },
                    { title: 'Pending PRs', value: stats?.pendingPRs || 0, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Total PRs', value: stats?.totalPRs || 0, icon: <FileTextOutlined />, color: themeColor },
                    { title: 'Active POs', value: stats?.activePOs || 0, icon: <ShoppingCartOutlined />, color: '#06b6d4' },
                    { title: 'Total POs', value: stats?.totalPOs || 0, icon: <ShoppingCartOutlined />, color: '#8b5cf6' },
                    { title: 'PO Value', value: stats?.totalPoValue ? fmtMoney(stats.totalPoValue) : '—', icon: <DollarOutlined />, color: '#10b981' },
                ].map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Tabs */}
            <Card style={{ borderRadius: 12 }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab}
                    tabBarExtraContent={
                        <Space>
                            <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)}
                                style={{ width: 200 }} allowClear onPressEnter={() => {
                                    if (activeTab === "suppliers") loadSuppliers();
                                    else if (activeTab === "pr") loadPRs();
                                    else if (activeTab === "po") loadPOs();
                                }} />
                            {activeTab === "suppliers" && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => openSupplierModal()}>Add Supplier</Button>
                            )}
                            <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => {
                                loadStats();
                                if (activeTab === "suppliers") loadSuppliers();
                                else if (activeTab === "pr") loadPRs();
                                else if (activeTab === "po") loadPOs();
                                else loadGRNs();
                            }} /></Tooltip>
                        </Space>
                    }
                >
                    <TabPane tab={<span><ShopOutlined /> Suppliers ({suppliers.length})</span>} key="suppliers">
                        <Table dataSource={suppliers} columns={supplierColumns} rowKey="id" loading={loading}
                            size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 15, showSizeChanger: true }} />
                    </TabPane>

                    <TabPane tab={<span><FileTextOutlined /> Requisitions ({prs.length})</span>} key="pr">
                        <Table dataSource={prs} columns={prColumns} rowKey="id" loading={loading}
                            size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 15 }} />
                    </TabPane>

                    <TabPane tab={<span><ShoppingCartOutlined /> Purchase Orders ({pos.length})</span>} key="po">
                        <Table dataSource={pos} columns={poColumns} rowKey="id" loading={loading}
                            size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 15 }} />
                    </TabPane>

                    <TabPane tab={<span><InboxOutlined /> Goods Received ({grns.length})</span>} key="grn">
                        <Table dataSource={grns} columns={grnColumns} rowKey="id" loading={loading}
                            size="small" scroll={{ x: 900 }} pagination={{ pageSize: 15 }} />
                    </TabPane>
                </Tabs>
            </Card>

            {/* ─── Supplier SteppedFormModal ──────────────── */}
            <SteppedFormModal
                open={supplierModal}
                onCancel={() => { setSupplierModal(false); setEditingSupplier(null); supplierForm.resetFields(); }}
                onSubmit={saveSupplier}
                form={supplierForm}
                title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
                entityName="supplier"
                steps={[
                    {
                        title: "Basic Info",
                        icon: <ShopOutlined />,
                        fields: ["code", "name", "contactPerson", "email"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                                            <Input placeholder="SUP-001" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                            <Input placeholder="Supplier name" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="contactPerson" label="Contact Person">
                                            <Input placeholder="Name" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="email" label="Email">
                                            <Input type="email" placeholder="email@example.com" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Contact & Address",
                        icon: <GlobalOutlined />,
                        fields: ["phone", "city", "address"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="phone" label="Phone">
                                            <Input placeholder="+62 ..." />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="city" label="City">
                                            <Input placeholder="City" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="address" label="Address">
                                    <Input.TextArea rows={2} placeholder="Full address" />
                                </Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Terms & Settings",
                        icon: <DollarOutlined />,
                        fields: ["paymentTerms", "currency", "leadTimeDays", "rating", "taxId", "status", "notes", "accountId"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="paymentTerms" label="Payment Terms" initialValue="Net 30">
                                            <Select options={["COD", "Net 15", "Net 30", "Net 45", "Net 60"].map(v => ({ label: v, value: v }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="currency" label="Currency" initialValue="IDR">
                                            <Select options={["IDR", "USD", "SGD", "AUD"].map(v => ({ label: v, value: v }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="leadTimeDays" label="Lead Time (days)" initialValue={7}>
                                            <InputNumber min={1} max={365} style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="rating" label="Rating">
                                            <Rate allowHalf />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="taxId" label="Tax ID">
                                            <Input placeholder="NPWP" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="status" label="Status" initialValue="active">
                                            <Select options={[
                                                { label: "Active", value: "active" },
                                                { label: "Inactive", value: "inactive" },
                                                { label: "Blacklisted", value: "blacklisted" },
                                            ]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="notes" label="Notes">
                                    <Input.TextArea rows={2} placeholder="Extra notes" />
                                </Form.Item>
                                <Form.Item name="accountId" label="Link to CRM Account (optional)">
                                    <CrmAccountPicker size="small" placeholder="Search CRM accounts to link..." />
                                </Form.Item>
                            </>
                        ),
                    },
                ]}
                fields={SUPPLIER_FIELDS}
                width={680}
                loading={false}
                onBatchCreate={handleBatchCreateSupplier}
                gradient={["#1890ff", "#722ed1"]}
                editMode={!!editingSupplier}
            />

            {/* Detail Drawer */}
            <Drawer
                title={detailDrawer ? `${detailDrawer.type.toUpperCase()} Details` : ""}
                open={!!detailDrawer}
                onClose={() => setDetailDrawer(null)}
                width={520}
            >
                {detailDrawer?.type === "supplier" && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Code">{detailDrawer.data.code}</Descriptions.Item>
                        <Descriptions.Item label="Name">{detailDrawer.data.name}</Descriptions.Item>
                        <Descriptions.Item label="Contact">{detailDrawer.data.contactPerson}</Descriptions.Item>
                        <Descriptions.Item label="Email">{detailDrawer.data.email}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{detailDrawer.data.phone}</Descriptions.Item>
                        <Descriptions.Item label="Address">{`${detailDrawer.data.address || ""}, ${detailDrawer.data.city || ""}`}</Descriptions.Item>
                        <Descriptions.Item label="Country">{detailDrawer.data.country}</Descriptions.Item>
                        <Descriptions.Item label="Tax ID">{detailDrawer.data.taxId}</Descriptions.Item>
                        <Descriptions.Item label="Payment Terms">{detailDrawer.data.paymentTerms}</Descriptions.Item>
                        <Descriptions.Item label="Lead Time">{detailDrawer.data.leadTimeDays} days</Descriptions.Item>
                        <Descriptions.Item label="Rating"><Rate disabled defaultValue={detailDrawer.data.rating} allowHalf /></Descriptions.Item>
                        <Descriptions.Item label="Tags">{(detailDrawer.data.tags || []).map((t: string) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailDrawer.data.status]}>{detailDrawer.data.status}</Tag></Descriptions.Item>
                    </Descriptions>
                )}
                {detailDrawer?.type === "pr" && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="PR #">{detailDrawer.data.prNumber}</Descriptions.Item>
                        <Descriptions.Item label="Title">{detailDrawer.data.title}</Descriptions.Item>
                        <Descriptions.Item label="Description">{detailDrawer.data.description}</Descriptions.Item>
                        <Descriptions.Item label="Requested By">{detailDrawer.data.requestedBy}</Descriptions.Item>
                        <Descriptions.Item label="Department">{detailDrawer.data.department}</Descriptions.Item>
                        <Descriptions.Item label="Priority"><Tag color={STATUS_COLORS[detailDrawer.data.priority]}>{detailDrawer.data.priority}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Required Date">{fmtDate(detailDrawer.data.requiredDate)}</Descriptions.Item>
                        <Descriptions.Item label="Est. Total">{fmtMoney(detailDrawer.data.totalEstimated)}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailDrawer.data.status]}>{detailDrawer.data.status?.replace("_", " ")}</Tag></Descriptions.Item>
                        {detailDrawer.data.approvedBy && <Descriptions.Item label="Approved By">{detailDrawer.data.approvedBy}</Descriptions.Item>}
                        {detailDrawer.data.rejectionReason && <Descriptions.Item label="Rejection Reason">{detailDrawer.data.rejectionReason}</Descriptions.Item>}
                    </Descriptions>
                )}
                {detailDrawer?.type === "po" && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="PO #">{detailDrawer.data.poNumber}</Descriptions.Item>
                        <Descriptions.Item label="Title">{detailDrawer.data.title}</Descriptions.Item>
                        <Descriptions.Item label="Supplier">{suppliers.find(s => s.id === detailDrawer.data.supplierId)?.name || "-"}</Descriptions.Item>
                        <Descriptions.Item label="Payment Terms">{detailDrawer.data.paymentTerms}</Descriptions.Item>
                        <Descriptions.Item label="Expected Delivery">{fmtDate(detailDrawer.data.expectedDelivery)}</Descriptions.Item>
                        <Descriptions.Item label="Subtotal">{fmtMoney(detailDrawer.data.subtotal)}</Descriptions.Item>
                        <Descriptions.Item label="Tax">{fmtMoney(detailDrawer.data.taxAmount)}</Descriptions.Item>
                        <Descriptions.Item label="Total">{fmtMoney(detailDrawer.data.totalAmount)}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailDrawer.data.status]}>{detailDrawer.data.status?.replace("_", " ")}</Tag></Descriptions.Item>
                        {detailDrawer.data.sentAt && <Descriptions.Item label="Sent At">{fmtDate(detailDrawer.data.sentAt)}</Descriptions.Item>}
                        {detailDrawer.data.confirmedAt && <Descriptions.Item label="Confirmed At">{fmtDate(detailDrawer.data.confirmedAt)}</Descriptions.Item>}
                    </Descriptions>
                )}
                {detailDrawer?.type === "grn" && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="GRN #">{detailDrawer.data.grnNumber}</Descriptions.Item>
                        <Descriptions.Item label="PO">{pos.find(p => p.id === detailDrawer.data.poId)?.poNumber || "-"}</Descriptions.Item>
                        <Descriptions.Item label="Supplier">{suppliers.find(s => s.id === detailDrawer.data.supplierId)?.name || "-"}</Descriptions.Item>
                        <Descriptions.Item label="Received By">{detailDrawer.data.receivedBy}</Descriptions.Item>
                        <Descriptions.Item label="Date">{fmtDate(detailDrawer.data.receivedDate)}</Descriptions.Item>
                        <Descriptions.Item label="Warehouse">{detailDrawer.data.warehouseId}</Descriptions.Item>
                        <Descriptions.Item label="Delivery Note #">{detailDrawer.data.deliveryNoteNumber}</Descriptions.Item>
                        <Descriptions.Item label="Invoice #">{detailDrawer.data.invoiceNumber}</Descriptions.Item>
                        <Descriptions.Item label="Quality Check"><Tag color={STATUS_COLORS[detailDrawer.data.qualityCheck]}>{detailDrawer.data.qualityCheck}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailDrawer.data.status]}>{detailDrawer.data.status}</Tag></Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </div>
        </CMSLayout>
    );
}
