"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Form, Input, Row, Col, InputNumber, Card, Statistic, Progress, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, FieldTimeOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { supaRest, supaInsert, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

const FIELDS: FieldDef[] = [
    { name: "period_start", label: "Period Start", required: true },
    { name: "period_end", label: "Period End", required: true },
    { name: "uptime_minutes", label: "Uptime (min)", required: true },
];

export default function AvailabilityPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
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
        { title: 'Period', width: 180, render: (_, r) => <Text>{r.period_start ? new Date(r.period_start).toLocaleDateString('id-ID') : '-'} → {r.period_end ? new Date(r.period_end).toLocaleDateString('id-ID') : '-'}</Text> },
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
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card size="small"><Statistic title="Avg Availability" value={avgAvail.toFixed(2)} suffix="%" valueStyle={{ color: avgAvail >= 99.9 ? '#52c41a' : avgAvail >= 99 ? '#fa8c16' : '#f5222d' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Total Records" value={data.length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Total Downtime" value={totalDowntime} suffix="min" valueStyle={{ color: totalDowntime > 0 ? '#f5222d' : '#52c41a' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Total Incidents" value={totalIncidents} valueStyle={{ color: totalIncidents > 0 ? '#fa8c16' : '#52c41a' }} /></Card></Col>
            </Row>

            <ProTable
                headerTitle={<Space><FieldTimeOutlined /> Availability Records</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>New Record</Button>,
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
