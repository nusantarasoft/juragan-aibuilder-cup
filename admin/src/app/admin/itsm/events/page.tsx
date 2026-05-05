"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Typography, Alert, Badge, Card, Statistic, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, AlertOutlined, WarningOutlined, ThunderboltOutlined, BellOutlined, ExclamationCircleOutlined, CheckCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const severityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a', informational: '#8c8c8c' };
const statusColors: Record<string, string> = { new: 'blue', acknowledged: 'cyan', in_progress: 'orange', escalated: 'red', closed: 'default', suppressed: 'gray' };
const typeColors: Record<string, string> = { informational: 'default', warning: 'gold', exception: 'orange', alert: 'red' };
const typeIcons: Record<string, React.ReactNode> = { informational: <BellOutlined />, warning: <WarningOutlined />, exception: <ThunderboltOutlined />, alert: <AlertOutlined /> };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "source", label: "Source" },
    { name: "severity", label: "Severity" },
];

export default function EventsPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterSev, setFilterSev] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterStatus) filters['status'] = `eq.${filterStatus}`;
            if (filterSev) filters['severity'] = `eq.${filterSev}`;
            const rows = await supaRest('itsm_events', { order: 'occurred_at.desc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterSev, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { title: values.title, description: values.description, source: values.source || 'manual', event_type: values.event_type || 'warning', severity: values.severity || 'medium', category: values.category, resource_name: values.resource_name, resource_type: values.resource_type, metric_name: values.metric_name, metric_value: values.metric_value, threshold_value: values.threshold_value };
            if (editing) {
                body.status = values.status;
                await supaUpdate('itsm_events', editing.id, body);
                messageApi.success("Event updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.event_number?.replace('EVT-', '') || '0'))) + 1 : 1;
                body.event_number = `EVT-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                body.occurred_at = new Date().toISOString();
                await supaInsert('itsm_events', body);
                messageApi.success(`Event ${body.event_number} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_events', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const critCount = data.filter(e => e.severity === 'critical' && e.status !== 'closed').length;
    const openCount = data.filter(e => e.status !== 'closed').length;

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'event_number', width: 110, render: (_, r) => <Tag color="volcano" style={{ fontFamily: 'monospace' }}>{r.event_number}</Tag> },
        { title: 'Severity', dataIndex: 'severity', width: 100, render: (_, r) => <Badge color={severityColors[r.severity]} text={<Text strong style={{ color: severityColors[r.severity] }}>{(r.severity || '').toUpperCase()}</Text>} /> },
        { title: 'Type', dataIndex: 'event_type', width: 110, render: (_, r) => <Tag icon={typeIcons[r.event_type]} color={typeColors[r.event_type]}>{(r.event_type || '').toUpperCase()}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Source', dataIndex: 'source', width: 120, render: (_, r) => <Tag>{r.source}</Tag> },
        { title: 'Resource', dataIndex: 'resource_name', width: 150, ellipsis: true },
        { title: 'Metric', dataIndex: 'metric_name', width: 120, render: (_, r) => r.metric_name ? <Text code>{r.metric_name}={r.metric_value}</Text> : '-' },
        { title: 'Status', dataIndex: 'status', width: 120, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Occurred', dataIndex: 'occurred_at', width: 150, render: (_, r) => r.occurred_at ? new Date(r.occurred_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete event?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Event Management</AuroraText>}
            subTitle={<DecryptedText text="Monitor infrastructure events and alerts" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            {critCount > 0 && <Alert type="error" message={`${critCount} critical event(s) require immediate attention`} banner showIcon style={{ marginBottom: 16 }} />}

            {/* KPI Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Open Events', value: openCount, icon: <AlertOutlined />, color: '#f59e0b' },
                    { title: 'Critical', value: critCount, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                    { title: 'High Severity', value: data.filter(e => e.severity === 'high' && e.status !== 'closed').length, icon: <WarningOutlined />, color: '#f97316' },
                    { title: 'Acknowledged', value: data.filter(e => e.status === 'acknowledged').length, icon: <CheckCircleOutlined />, color: '#3b82f6' },
                    { title: 'Total Events', value: data.length, icon: <ThunderboltOutlined />, color: '#8b5cf6' },
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

            {/* Severity Distribution */}
            {data.length > 0 && (
                <Card size="small" style={{ ...glass, marginBottom: 16 }} title={<Text strong style={{ fontSize: 13 }}>âš ï¸ Severity Distribution</Text>}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {['critical', 'high', 'medium', 'low', 'informational'].map((sev, i) => {
                            const cnt = data.filter(e => e.severity === sev).length;
                            const openCnt = data.filter(e => e.severity === sev && e.status !== 'closed').length;
                            const color = severityColors[sev];
                            return (
                                <motion.div key={sev} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                                    style={{ flex: 1, padding: '10px 8px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}25`, textAlign: 'center' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}15`, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                    </div>
                                    <Text strong style={{ fontSize: 18, color, display: 'block' }}>{cnt}</Text>
                                    <Text style={{ fontSize: 10, textTransform: 'capitalize', display: 'block' }}>{sev}</Text>
                                    {openCnt > 0 && <Text style={{ fontSize: 9, color: '#f59e0b' }}>{openCnt} open</Text>}
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <ProTable
                headerTitle={<Space><AlertOutlined /> Events <Badge count={openCount} style={{ backgroundColor: openCount > 0 ? '#fa8c16' : '#52c41a' }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 140 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'new', label: 'New' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'escalated', label: 'Escalated' }, { value: 'closed', label: 'Closed' }]} />,
                    <Select key="fv" placeholder="Severity" allowClear style={{ width: 130 }} value={filterSev} onChange={setFilterSev}
                        options={[{ value: 'critical', label: 'ðŸ”´ Critical' }, { value: 'high', label: 'ðŸŸ  High' }, { value: 'medium', label: 'ðŸ”µ Medium' }, { value: 'low', label: 'ðŸŸ¢ Low' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Event</Button>,
                    <Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'itsm_events', title: 'Event Management', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Source', key: 'source' }, { header: 'Severity', key: 'severity' }, { header: 'Status', key: 'status' }, { header: 'Category', key: 'category' }], data: data })} /></Tooltip>,
                    <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'itsm_events', title: 'Event Management', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Source', key: 'source' }, { header: 'Severity', key: 'severity' }, { header: 'Status', key: 'status' }, { header: 'Category', key: 'category' }], data: data })} /></Tooltip>,
                ]}
            />

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.event_number}` : "New Event"} entityName="event" steps={[
                { title: "Event Details", icon: <AlertOutlined />, fields: ["title", "description", "source", "event_type", "severity", "category"],
                    content: (<>
                        <Form.Item name="title" label="Event Title" rules={[{ required: true }]}><Input placeholder="e.g., High CPU Usage on PROD-DB-01" /></Form.Item>
                        <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="source" label="Source"><Select placeholder="Select" options={[{ value: 'prometheus', label: 'Prometheus' }, { value: 'grafana', label: 'Grafana' }, { value: 'uptime_kuma', label: 'Uptime Kuma' }, { value: 'n8n', label: 'n8n' }, { value: 'manual', label: 'Manual' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="event_type" label="Type"><Select options={[{ value: 'informational', label: 'â„¹ï¸ Informational' }, { value: 'warning', label: 'âš ï¸ Warning' }, { value: 'exception', label: 'âŒ Exception' }, { value: 'alert', label: 'ðŸš¨ Alert' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="severity" label="Severity"><Select options={[{ value: 'critical', label: 'ðŸ”´ Critical' }, { value: 'high', label: 'ðŸŸ  High' }, { value: 'medium', label: 'ðŸ”µ Medium' }, { value: 'low', label: 'ðŸŸ¢ Low' }, { value: 'informational', label: 'â„¹ï¸ Info' }]} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="category" label="Category"><Input placeholder="infrastructure, application, security, database" /></Form.Item>
                        {editing && <Form.Item name="status" label="Status"><Select options={[{ value: 'new', label: 'New' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'in_progress', label: 'In Progress' }, { value: 'escalated', label: 'Escalated' }, { value: 'closed', label: 'Closed' }]} /></Form.Item>}
                    </>),
                },
                { title: "Resource & Metrics", icon: <ThunderboltOutlined />, fields: ["resource_name", "resource_type", "metric_name", "metric_value", "threshold_value"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="resource_name" label="Resource Name"><Input placeholder="e.g., PROD-DB-01" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="resource_type" label="Resource Type"><Input placeholder="server, database, network_device" /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="metric_name" label="Metric"><Input placeholder="cpu_usage" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="metric_value" label="Value"><Input placeholder="87.3%" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="threshold_value" label="Threshold"><Input placeholder="85%" /></Form.Item></Col>
                        </Row>
                    </>),
                },
            ]} fields={FIELDS} width={750} gradient={["#f5222d", "#cf1322"]} editMode={!!editing} initialValues={{ source: 'manual', event_type: 'warning', severity: 'medium' }} />
        </div>
        </CMSLayout>
    );
}


