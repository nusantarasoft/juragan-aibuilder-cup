"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Form, Input, Row, Col, InputNumber, Card, Statistic, Progress, Typography, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, FieldTimeOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { supaRest, supaInsert, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const FIELDS: FieldDef[] = [
    { name: "period_start", label: "Period Start", required: true },
    { name: "period_end", label: "Period End", required: true },
    { name: "uptime_minutes", label: "Uptime (min)", required: true },
];

export default function AvailabilityPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await supaRest('itsm_availability_records', { order: 'period_start.desc' });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { tenant_id: 'default', period_start: values.period_start, period_end: values.period_end, uptime_minutes: values.uptime_minutes, downtime_minutes: values.downtime_minutes || 0, planned_downtime_minutes: values.planned_downtime_minutes || 0, unplanned_downtime_minutes: values.unplanned_downtime_minutes || 0, mtbf_hours: values.mtbf_hours, mtrs_hours: values.mtrs_hours, incident_count: values.incident_count || 0, sla_target_pct: values.sla_target_pct || 99.9, notes: values.notes };
            await supaInsert('itsm_availability_records', body);
            messageApi.success("Availability record created.");
            setModalOpen(false); form.resetFields(); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_availability_records', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    // Summary stats
    const avgAvail = data.length > 0 ? data.reduce((s, r) => s + (r.availability_pct || 0), 0) / data.length : 0;
    const totalIncidents = data.reduce((s, r) => s + (r.incident_count || 0), 0);
    const totalDowntime = data.reduce((s, r) => s + (r.downtime_minutes || 0), 0);

    const columns: ProColumns<any>[] = [
        { title: 'Period', width: 180, render: (_, r) => <Text>{r.period_start ? new Date(r.period_start).toLocaleDateString('id-ID') : '-'} â†’ {r.period_end ? new Date(r.period_end).toLocaleDateString('id-ID') : '-'}</Text> },
        { title: 'Availability', width: 160, render: (_, r) => { const pct = r.availability_pct || 0; const target = r.sla_target_pct || 99.9; return <Progress percent={Math.round(pct * 100) / 100} size="small" status={pct >= target ? 'success' : 'exception'} format={() => `${pct.toFixed(2)}%`} />; } },
        { title: 'SLA Target', dataIndex: 'sla_target_pct', width: 100, render: (_, r) => <Tag>{r.sla_target_pct || 99.9}%</Tag> },
        { title: 'SLA Met?', width: 80, render: (_, r) => { const pct = r.availability_pct || 0; const target = r.sla_target_pct || 99.9; return pct >= target ? <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag> : <Tag color="red" icon={<CloseCircleOutlined />}>No</Tag>; } },
        { title: 'Uptime', dataIndex: 'uptime_minutes', width: 100, render: (_, r) => <Text type="success">{r.uptime_minutes?.toLocaleString()} min</Text> },
        { title: 'Downtime', dataIndex: 'downtime_minutes', width: 100, render: (_, r) => <Text type={r.downtime_minutes > 0 ? 'danger' : 'success'}>{r.downtime_minutes || 0} min</Text> },
        { title: 'Planned DT', dataIndex: 'planned_downtime_minutes', width: 90, render: (_, r) => `${r.planned_downtime_minutes || 0} min` },
        { title: 'Unplanned DT', dataIndex: 'unplanned_downtime_minutes', width: 100, render: (_, r) => <Text type={r.unplanned_downtime_minutes > 0 ? 'danger' : undefined}>{r.unplanned_downtime_minutes || 0} min</Text> },
        { title: 'MTBF', dataIndex: 'mtbf_hours', width: 80, render: (_, r) => r.mtbf_hours ? `${r.mtbf_hours}h` : '-' },
        { title: 'MTRS', dataIndex: 'mtrs_hours', width: 80, render: (_, r) => r.mtrs_hours ? `${r.mtrs_hours}h` : '-' },
        { title: 'Incidents', dataIndex: 'incident_count', width: 80, render: (_, r) => <Tag color={r.incident_count > 0 ? 'orange' : 'green'}>{r.incident_count || 0}</Tag> },
        { title: 'Notes', dataIndex: 'notes', ellipsis: true },
        {
            title: '', valueType: 'option', width: 50,
            render: (_, record) => [
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Availability Management</AuroraText>}
            subTitle={<DecryptedText text="Track service uptime, SLA compliance, and reliability metrics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Avg Availability', value: `${avgAvail.toFixed(2)}%`, icon: <CheckCircleOutlined />, color: avgAvail >= 99.9 ? '#10b981' : avgAvail >= 99 ? '#f59e0b' : '#ef4444' },
                    { title: 'Total Records', value: data.length, icon: <FieldTimeOutlined />, color: '#3b82f6' },
                    { title: 'Total Downtime', value: `${totalDowntime} min`, icon: <CloseCircleOutlined />, color: totalDowntime > 0 ? '#ef4444' : '#10b981' },
                    { title: 'Total Incidents', value: totalIncidents, icon: <ExclamationCircleOutlined />, color: totalIncidents > 0 ? '#f59e0b' : '#10b981' },
                    { title: 'SLA Met', value: `${data.filter(r => (r.availability_pct || 0) >= (r.sla_target_pct || 99.9)).length}/${data.length}`, icon: <CheckCircleOutlined />, color: '#8b5cf6' },
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

            {/* SLA Compliance Trend */}
            {data.length > 0 && (
                <Card size="small" style={{ ...glass, marginBottom: 16 }} title={<Text strong style={{ fontSize: 13 }}>â±ï¸ Availability Trend</Text>}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                        {data.slice(0, 12).reverse().map((r, i) => {
                            const pct = r.availability_pct || 0;
                            const target = r.sla_target_pct || 99.9;
                            const met = pct >= target;
                            return (
                                <motion.div key={r.id} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', transformOrigin: 'bottom' }}>
                                    <Text style={{ fontSize: 8, color: met ? '#10b981' : '#ef4444' }}>{pct.toFixed(1)}%</Text>
                                    <div style={{ width: '100%', height: `${Math.max(pct - 95, 0) * 16}px`, minHeight: 4, borderRadius: '4px 4px 0 0', background: met ? '#10b981' : '#ef4444', maxHeight: 60 }} />
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <ProTable
                headerTitle={<Space><FieldTimeOutlined /> Availability Records</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>New Record</Button>,
                    <Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'itsm_availability', title: 'Availability Management', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Service name', key: 'service_name' }, { header: 'Sla target', key: 'sla_target' }, { header: 'Actual availability', key: 'actual_availability' }, { header: 'Status', key: 'status' }], data: data })} /></Tooltip>,
                    <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'itsm_availability', title: 'Availability Management', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Service name', key: 'service_name' }, { header: 'Sla target', key: 'sla_target' }, { header: 'Actual availability', key: 'actual_availability' }, { header: 'Status', key: 'status' }], data: data })} /></Tooltip>,
                ]}
            />

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onSubmit={handleSave} form={form} title="New Availability Record" entityName="record" steps={[
                { title: "Period & Uptime", icon: <FieldTimeOutlined />, fields: ["period_start", "period_end", "uptime_minutes", "downtime_minutes", "planned_downtime_minutes", "unplanned_downtime_minutes", "sla_target_pct"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="period_start" label="Period Start" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="period_end" label="Period End" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="uptime_minutes" label="Uptime (minutes)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="downtime_minutes" label="Downtime (minutes)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="planned_downtime_minutes" label="Planned Downtime (min)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="unplanned_downtime_minutes" label="Unplanned Downtime (min)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="sla_target_pct" label="SLA Target %"><InputNumber style={{ width: '100%' }} min={0} max={100} step={0.01} /></Form.Item>
                    </>),
                },
                { title: "Metrics", icon: <CheckCircleOutlined />, fields: ["mtbf_hours", "mtrs_hours", "incident_count", "notes"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="mtbf_hours" label="MTBF (hours)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="mtrs_hours" label="MTRS (hours)"><InputNumber style={{ width: '100%' }} min={0} step={0.1} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="incident_count" label="Incident Count"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} placeholder="Service/CI identifier, any context about the period" /></Form.Item>
                    </>),
                },
            ]} fields={FIELDS} width={700} gradient={["#52c41a", "#389e0d"]} editMode={false} initialValues={{ sla_target_pct: 99.9, incident_count: 0, downtime_minutes: 0 }} />
        </div>
        </CMSLayout>
    );
}


