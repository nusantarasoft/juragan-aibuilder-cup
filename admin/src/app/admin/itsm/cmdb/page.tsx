"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, InputNumber, Typography, Descriptions, Modal, Card, Statistic, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ClusterOutlined, NodeIndexOutlined, DesktopOutlined, CloudServerOutlined, DatabaseOutlined, ApiOutlined, GlobalOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const classIcons: Record<string, React.ReactNode> = { hardware: <DesktopOutlined />, software: <CloudServerOutlined />, network: <GlobalOutlined />, service: <ApiOutlined />, cloud: <CloudServerOutlined />, document: <DatabaseOutlined />, virtual: <CloudServerOutlined /> };
const classColors: Record<string, string> = { hardware: 'blue', software: 'green', network: 'purple', service: 'cyan', cloud: 'geekblue', document: 'orange', virtual: 'magenta' };
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const statusColors: Record<string, string> = { active: 'green', under_maintenance: 'orange', retired: 'default', disposed: 'red', planned: 'blue' };
const critColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'green' };

const FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "ci_class", label: "CI Class" },
    { name: "ci_type", label: "CI Type" },
    { name: "status", label: "Status" },
];

export default function CmdbPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterClass, setFilterClass] = useState<string | undefined>(undefined);
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterClass) filters['ci_class'] = `eq.${filterClass}`;
            if (filterStatus) filters['status'] = `eq.${filterStatus}`;
            const rows = await supaRest('itsm_configuration_items', { order: 'ci_number.asc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterClass, filterStatus, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { name: values.name, ci_class: values.ci_class || 'hardware', ci_type: values.ci_type, status: values.status || 'active', environment: values.environment || 'production', criticality: values.criticality || 'medium', location: values.location, department: values.department, owner: values.owner, vendor: values.vendor, manufacturer: values.manufacturer, model: values.model, serial_number: values.serial_number, ip_address: values.ip_address, os_info: values.os_info, version: values.version, cpu: values.cpu, memory_gb: values.memory_gb, storage_gb: values.storage_gb, notes: values.notes };
            if (editing) {
                await supaUpdate('itsm_configuration_items', editing.id, body);
                messageApi.success("CI updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.ci_number?.replace('CI-', '') || '0'))) + 1 : 1;
                body.ci_number = `CI-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                await supaInsert('itsm_configuration_items', body);
                messageApi.success(`CI ${body.ci_number} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => { 
        try { await supaDelete('itsm_configuration_items', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'ci_number', width: 100, render: (_, r) => <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>{r.ci_number}</Tag> },
        { title: 'Name', dataIndex: 'name', ellipsis: true, render: (_, r) => <a onClick={() => { setDetailItem(r); setDetailOpen(true); }}>{r.name}</a> },
        { title: 'Class', dataIndex: 'ci_class', width: 110, render: (_, r) => <Tag icon={classIcons[r.ci_class]} color={classColors[r.ci_class]}>{(r.ci_class || '').toUpperCase()}</Tag> },
        { title: 'Type', dataIndex: 'ci_type', width: 120, ellipsis: true },
        { title: 'Status', dataIndex: 'status', width: 130, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Criticality', dataIndex: 'criticality', width: 100, render: (_, r) => <Tag color={critColors[r.criticality]}>{(r.criticality || '').toUpperCase()}</Tag> },
        { title: 'Environment', dataIndex: 'environment', width: 110 },
        { title: 'IP Address', dataIndex: 'ip_address', width: 130, render: (_, r) => r.ip_address ? <Tag>{r.ip_address}</Tag> : '-' },
        { title: 'Owner', dataIndex: 'owner', width: 130, ellipsis: true },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete CI?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>CMDB</AuroraText>}
            subTitle={<DecryptedText text="Configuration Management Database â€” Track all IT assets and dependencies" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total CIs', value: data.length, icon: <ClusterOutlined />, color: '#3b82f6' },
                    { title: 'Active', value: data.filter((d: any) => d.status === 'active' || d.status === 'deployed').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Critical', value: data.filter((d: any) => d.criticality === 'critical' || d.criticality === 'high').length, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                    { title: 'Hardware', value: data.filter((d: any) => d.ciClass === 'hardware').length, icon: <DesktopOutlined />, color: '#8b5cf6' },
                    { title: 'Software', value: data.filter((d: any) => d.ciClass === 'software').length, icon: <CloudServerOutlined />, color: '#06b6d4' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={Math.floor(24 / 5)}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <ProTable
                headerTitle={<Space><ClusterOutlined /> Configuration Items <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fc" placeholder="Class" allowClear style={{ width: 130 }} value={filterClass} onChange={setFilterClass}
                        options={[{ value: 'hardware', label: 'ðŸ’» Hardware' }, { value: 'software', label: 'âš™ï¸ Software' }, { value: 'network', label: 'ðŸŒ Network' }, { value: 'service', label: 'ðŸ”— Service' }, { value: 'cloud', label: 'â˜ï¸ Cloud' }]} />,
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 150 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'active', label: 'Active' }, { value: 'under_maintenance', label: 'Maintenance' }, { value: 'retired', label: 'Retired' }, { value: 'planned', label: 'Planned' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New CI</Button>,
                ]}
            />

            <Modal title={detailItem?.ci_number + ' â€” ' + detailItem?.name} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}>
                {detailItem && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="CI Class">{detailItem.ci_class}</Descriptions.Item>
                        <Descriptions.Item label="CI Type">{detailItem.ci_type}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={statusColors[detailItem.status]}>{detailItem.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Criticality"><Tag color={critColors[detailItem.criticality]}>{detailItem.criticality}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Environment">{detailItem.environment}</Descriptions.Item>
                        <Descriptions.Item label="Location">{detailItem.location || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Owner">{detailItem.owner || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Vendor">{detailItem.vendor || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Model">{detailItem.model || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Serial #">{detailItem.serial_number || '-'}</Descriptions.Item>
                        <Descriptions.Item label="IP Address">{detailItem.ip_address || '-'}</Descriptions.Item>
                        <Descriptions.Item label="OS">{detailItem.os_info || '-'}</Descriptions.Item>
                        <Descriptions.Item label="CPU">{detailItem.cpu || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Memory">{detailItem.memory_gb ? `${detailItem.memory_gb} GB` : '-'}</Descriptions.Item>
                        <Descriptions.Item label="Storage">{detailItem.storage_gb ? `${detailItem.storage_gb} GB` : '-'}</Descriptions.Item>
                        <Descriptions.Item label="Warranty Expiry">{detailItem.warranty_expiry || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Notes" span={2}>{detailItem.notes || '-'}</Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.ci_number}` : "New Configuration Item"} entityName="ci" steps={[
                { title: "Basic Info", icon: <ClusterOutlined />, fields: ["name", "ci_class", "ci_type", "status", "environment", "criticality"],
                    content: (<>
                        <Form.Item name="name" label="CI Name" rules={[{ required: true }]}><Input placeholder="e.g., PROD-DB-01 (PostgreSQL Primary)" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="ci_class" label="Class"><Select options={[{ value: 'hardware', label: 'ðŸ’» Hardware' }, { value: 'software', label: 'âš™ï¸ Software' }, { value: 'network', label: 'ðŸŒ Network' }, { value: 'service', label: 'ðŸ”— Service' }, { value: 'cloud', label: 'â˜ï¸ Cloud' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="ci_type" label="Type"><Input placeholder="e.g., server, switch, database" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="environment" label="Environment"><Select options={[{ value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'development', label: 'Development' }, { value: 'dr', label: 'DR' }]} /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="status" label="Status"><Select options={[{ value: 'active', label: 'Active' }, { value: 'under_maintenance', label: 'Under Maintenance' }, { value: 'retired', label: 'Retired' }, { value: 'planned', label: 'Planned' }]} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="criticality" label="Criticality"><Select options={[{ value: 'critical', label: 'ðŸ”´ Critical' }, { value: 'high', label: 'ðŸŸ  High' }, { value: 'medium', label: 'ðŸ”µ Medium' }, { value: 'low', label: 'ðŸŸ¢ Low' }]} /></Form.Item></Col>
                        </Row>
                    </>),
                },
                { title: "Technical", icon: <DesktopOutlined />, fields: ["ip_address", "os_info", "cpu", "memory_gb", "storage_gb", "serial_number", "model", "vendor"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="ip_address" label="IP Address"><Input placeholder="10.0.1.50" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="os_info" label="OS"><Input placeholder="Ubuntu 22.04 LTS" /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="cpu" label="CPU"><Input placeholder="8 vCPU" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="memory_gb" label="Memory (GB)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="storage_gb" label="Storage (GB)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="vendor" label="Vendor"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="manufacturer" label="Manufacturer"><Input /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="model" label="Model"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="serial_number" label="Serial Number"><Input /></Form.Item></Col>
                        </Row>
                    </>),
                },
                { title: "Ownership", icon: <NodeIndexOutlined />, fields: ["owner", "department", "location", "notes"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="owner" label="Owner"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                        </Row>
                        <Form.Item name="location" label="Location"><Input placeholder="Jakarta DC-1 Rack A4" /></Form.Item>
                        <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
                    </>),
                },
            ]} fields={FIELDS} width={800} editMode={!!editing} initialValues={{ ci_class: 'hardware', status: 'active', environment: 'production', criticality: 'medium' }} />
        </div>
        </CMSLayout>
    );
}


