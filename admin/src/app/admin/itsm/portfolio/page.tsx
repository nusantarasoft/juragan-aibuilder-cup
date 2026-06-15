"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, InputNumber, Typography, Card, Statistic, Badge, Tooltip } from "antd";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { PlusOutlined, DeleteOutlined, EditOutlined, ProjectOutlined, RocketOutlined, SendOutlined, CheckCircleOutlined, ClockCircleOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_PORTFOLIO = `query($lifecycleStatus: String, $serviceType: String, $search: String) { itsmPortfolioServices(lifecycleStatus: $lifecycleStatus, serviceType: $serviceType, search: $search) { id serviceCode name description businessOwner technicalOwner lifecycleStatus serviceType criticality costCenter budgetAllocated slaTarget dependencies risks notes publishedToCatalog publishedAt createdAt } }`;
const CREATE_PORTFOLIO = `mutation($tenantId: String!, $input: CreateItsmPortfolioInput!) { createItsmPortfolioService(tenantId: $tenantId, input: $input) { id serviceCode } }`;
const UPDATE_PORTFOLIO = `mutation($id: ID!, $input: UpdateItsmPortfolioInput!) { updateItsmPortfolioService(id: $id, input: $input) { id } }`;
const DELETE_PORTFOLIO = `mutation($id: ID!) { deleteItsmPortfolioService(id: $id) }`;
const PUBLISH_TO_CATALOG = `mutation($portfolioId: String!, $input: PublishToCatalogInput!) { itsmPublishToCatalog(portfolioId: $portfolioId, input: $input) { id catalogCode name } }`;

const lifecycleColors: Record<string, string> = { pipeline: 'default', design: 'blue', transition: 'geekblue', operation: 'green', retired: 'red' };
const criticalityColors: Record<string, string> = { low: 'green', medium: 'blue', high: 'orange', critical: 'red' };
const typeLabels: Record<string, string> = { business: 'ðŸ¢ Business', technical: 'ðŸ”§ Technical', supporting: 'ðŸ”— Supporting' };

const FIELDS: FieldDef[] = [
    { name: "name", label: "Service Name", required: true },
    { name: "description", label: "Description" },
    { name: "serviceType", label: "Service Type" },
    { name: "lifecycleStatus", label: "Lifecycle Status" },
    { name: "criticality", label: "Criticality" },
    { name: "businessOwner", label: "Business Owner" },
    { name: "technicalOwner", label: "Technical Owner" },
];

export default function ItsmPortfolioPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [publishTarget, setPublishTarget] = useState<any>(null);
    const [form] = Form.useForm();
    const [publishForm] = Form.useForm();
    const [filterLifecycle, setFilterLifecycle] = useState<string | undefined>(undefined);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_PORTFOLIO, { lifecycleStatus: filterLifecycle, serviceType: filterType });
            setData(d.itsmPortfolioServices || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterLifecycle, filterType, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = {
                name: values.name, description: values.description,
                businessOwner: values.businessOwner, technicalOwner: values.technicalOwner,
                lifecycleStatus: values.lifecycleStatus || 'pipeline',
                serviceType: values.serviceType || 'business',
                criticality: values.criticality || 'medium',
                costCenter: values.costCenter, budgetAllocated: values.budgetAllocated ? Number(values.budgetAllocated) : undefined,
                slaTarget: values.slaTarget, dependencies: values.dependencies,
                risks: values.risks, notes: values.notes,
            };
            if (editing) {
                await gql(UPDATE_PORTFOLIO, { id: editing.id, input });
                messageApi.success("Service updated.");
            } else {
                const d = await gql(CREATE_PORTFOLIO, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Service ${d.createItsmPortfolioService.serviceCode} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handlePublish = async (values: any) => {
        try {
            const d = await gql(PUBLISH_TO_CATALOG, {
                portfolioId: publishTarget.id,
                input: {
                    name: values.catalogName || publishTarget.name,
                    shortDescription: values.shortDescription,
                    estimatedDelivery: values.estimatedDelivery,
                    cost: values.cost,
                    approvalRequired: values.approvalRequired || false,
                    approvalType: values.approvalType || 'simple',
                    fulfillmentGroup: values.fulfillmentGroup,
                },
            });
            messageApi.success(`Published to catalog as ${d.itsmPublishToCatalog.catalogCode}`);
            setPublishModalOpen(false); publishForm.resetFields(); setPublishTarget(null); loadData();
        } catch (err: any) { messageApi.error(`Publish failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_PORTFOLIO, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: 'Code', dataIndex: 'serviceCode', width: 110, render: (_, r) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{r.serviceCode}</Tag> },
        { title: 'Service Name', dataIndex: 'name', ellipsis: true },
        { title: 'Type', dataIndex: 'serviceType', width: 120, render: (_, r) => typeLabels[r.serviceType] || r.serviceType },
        { title: 'Lifecycle', dataIndex: 'lifecycleStatus', width: 120, render: (_, r) => <Tag color={lifecycleColors[r.lifecycleStatus]}>{(r.lifecycleStatus || '').toUpperCase()}</Tag> },
        { title: 'Criticality', dataIndex: 'criticality', width: 100, render: (_, r) => <Tag color={criticalityColors[r.criticality]}>{(r.criticality || '').toUpperCase()}</Tag> },
        { title: 'Business Owner', dataIndex: 'businessOwner', width: 140, ellipsis: true },
        { title: 'Catalog', dataIndex: 'publishedToCatalog', width: 80, render: (_, r) => r.publishedToCatalog ? <Tag color="green">âœ“</Tag> : <Tag>â€”</Tag> },
        {
            title: 'Actions', valueType: 'option', width: 150,
            render: (_, record) => [
                !record.publishedToCatalog && record.lifecycleStatus === 'operation' && (
                    <Button key="pub" type="text" icon={<SendOutlined />} style={{ color: '#52c41a' }}
                        onClick={() => { setPublishTarget(record); publishForm.resetFields(); setPublishModalOpen(true); }} />
                ),
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => {
                    setEditing(record);
                    form.setFieldsValue(record);
                    setModalOpen(true);
                }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ].filter(Boolean),
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Service Portfolio</AuroraText>}
            subTitle={<DecryptedText text="Manage the lifecycle of IT services" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <BentoGrid className="mb-4">
                {[
                    { title: 'Total Services', value: data.length, icon: <ProjectOutlined />, color: '#3b82f6' },
                    { title: 'Active', value: data.filter((d: any) => d.lifecycleStatus === 'active' || d.lifecycleStatus === 'operational').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Pipeline', value: data.filter((d: any) => d.lifecycleStatus === 'pipeline' || d.lifecycleStatus === 'design').length, icon: <RocketOutlined />, color: '#f59e0b' },
                    { title: 'Retiring', value: data.filter((d: any) => d.lifecycleStatus === 'retiring' || d.lifecycleStatus === 'retired').length, icon: <ClockCircleOutlined />, color: '#ef4444' },
                    { title: 'Published', value: data.filter((d: any) => d.publishedToCatalog).length, icon: <SendOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <BentoGridItem
                        key={i}
                        title={s.title}
                        description="Service lifecycle metric"
                        icon={<span style={{ color: s.color }}>{s.icon}</span>}
                        className={i === 4 ? "col-span-3 lg:col-span-1 lg:col-start-2" : "col-span-3 lg:col-span-1"}
                        header={
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                                    {s.value}
                                </div>
                            </div>
                        }
                    />
                ))}
            </BentoGrid>
            <ProTable
                headerTitle={<Space><ProjectOutlined /> Service Portfolio <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'itsm_portfolio', title: 'Service Portfolio', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'service_type' }, { header: 'Lifecycle', key: 'lifecycle_stage' }], data: data })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'itsm_portfolio', title: 'Service Portfolio', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Type', key: 'service_type' }, { header: 'Lifecycle', key: 'lifecycle_stage' }], data: data })} /></Tooltip></RbacGuard>,
                    <Select key="fl" placeholder="Lifecycle" allowClear style={{ width: 140 }} value={filterLifecycle} onChange={setFilterLifecycle}
                        options={[{ value: 'pipeline', label: 'Pipeline' }, { value: 'design', label: 'Design' }, { value: 'transition', label: 'Transition' }, { value: 'operation', label: 'Operation' }, { value: 'retired', label: 'Retired' }]} />,
                    <Select key="ft" placeholder="Type" allowClear style={{ width: 130 }} value={filterType} onChange={setFilterType}
                        options={[{ value: 'business', label: 'Business' }, { value: 'technical', label: 'Technical' }, { value: 'supporting', label: 'Supporting' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Service</Button>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.serviceCode}` : "New Service"}
                entityName="service"
                steps={[
                    {
                        title: "Service Info",
                        icon: <ProjectOutlined />,
                        fields: ["name", "description", "serviceType"],
                        content: (
                            <>
                                <Form.Item name="name" label="Service Name" rules={[{ required: true }]}><Input placeholder="e.g., Email Service, VPN Access" /></Form.Item>
                                <Form.Item name="description" label="Description"><Input.TextArea rows={3} placeholder="What this service provides..." /></Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="serviceType" label="Service Type">
                                            <Select options={[{ value: 'business', label: 'ðŸ¢ Business' }, { value: 'technical', label: 'ðŸ”§ Technical' }, { value: 'supporting', label: 'ðŸ”— Supporting' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="criticality" label="Criticality">
                                            <Select options={[{ value: 'low', label: 'ðŸŸ¢ Low' }, { value: 'medium', label: 'ðŸ”µ Medium' }, { value: 'high', label: 'ðŸŸ  High' }, { value: 'critical', label: 'ðŸ”´ Critical' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Ownership & Budget",
                        icon: <RocketOutlined />,
                        fields: ["businessOwner", "technicalOwner", "costCenter", "budgetAllocated"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="businessOwner" label="Business Owner"><Input placeholder="Name" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="technicalOwner" label="Technical Owner"><Input placeholder="Name" /></Form.Item></Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="costCenter" label="Cost Center"><Input placeholder="e.g., IT-001" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="budgetAllocated" label="Budget"><InputNumber style={{ width: '100%' }} placeholder="Budget amount" /></Form.Item></Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Lifecycle & Risk",
                        icon: <RocketOutlined />,
                        fields: ["lifecycleStatus", "slaTarget", "dependencies", "risks", "notes"],
                        content: (
                            <>
                                <Form.Item name="lifecycleStatus" label="Lifecycle Status">
                                    <Select options={[{ value: 'pipeline', label: 'ðŸ“‹ Pipeline' }, { value: 'design', label: 'ðŸ“ Design' }, { value: 'transition', label: 'ðŸ”„ Transition' }, { value: 'operation', label: 'âœ… Operation' }, { value: 'retired', label: 'ðŸ—„ï¸ Retired' }]} />
                                </Form.Item>
                                <Form.Item name="slaTarget" label="SLA Target"><Input placeholder="e.g., 99.9% uptime" /></Form.Item>
                                <Form.Item name="dependencies" label="Dependencies"><Input.TextArea rows={2} placeholder="Other services this depends on" /></Form.Item>
                                <Form.Item name="risks" label="Risks"><Input.TextArea rows={2} placeholder="Known risks" /></Form.Item>
                                <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                            </>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={700}
                gradient={["#1890ff", "#096dd9"]}
                editMode={!!editing}
                initialValues={{ serviceType: 'business', criticality: 'medium', lifecycleStatus: 'pipeline' }}
            />

            {/* Publish to Catalog Modal */}
            <SteppedFormModal
                open={publishModalOpen}
                onCancel={() => { setPublishModalOpen(false); setPublishTarget(null); publishForm.resetFields(); }}
                onSubmit={handlePublish}
                form={publishForm}
                title={`Publish "${publishTarget?.name}" to Catalog`}
                entityName="catalog item"
                steps={[
                    {
                        title: "Catalog Details",
                        icon: <SendOutlined />,
                        fields: ["catalogName", "shortDescription", "estimatedDelivery", "cost"],
                        content: (
                            <>
                                <Form.Item name="catalogName" label="Catalog Name"><Input placeholder={publishTarget?.name} /></Form.Item>
                                <Form.Item name="shortDescription" label="Short Description"><Input.TextArea rows={2} placeholder="User-facing description" /></Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="estimatedDelivery" label="Delivery Time"><Input placeholder="e.g., 2 business days" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="cost" label="Cost"><Input placeholder="e.g., Free, $500" /></Form.Item></Col>
                                </Row>
                            </>
                        ),
                    },
                    {
                        title: "Approval & Fulfillment",
                        icon: <RocketOutlined />,
                        fields: ["approvalRequired", "approvalType", "fulfillmentGroup"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="approvalRequired" label="Approval Required?" valuePropName="checked">
                                            <Select options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="approvalType" label="Approval Type">
                                            <Select options={[{ value: 'simple', label: 'Simple (1 approver)' }, { value: 'multi_level', label: 'Multi-Level' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="fulfillmentGroup" label="Fulfillment Group"><Input placeholder="e.g., IT Service Team" /></Form.Item>
                            </>
                        ),
                    },
                ]}
                fields={[{ name: "catalogName", label: "Name" }, { name: "shortDescription", label: "Description" }]}
                width={650}
                gradient={["#52c41a", "#389e0d"]}
                editMode={false}
                initialValues={{ approvalRequired: false, approvalType: 'simple' }}
            />
        </div>
        </CMSLayout>
    );
}

