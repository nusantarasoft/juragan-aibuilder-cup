"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Tooltip,
    message, Typography, Row, Col, Statistic, Switch,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    ScheduleOutlined, ClockCircleOutlined, PlayCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const SCHEDULE_FIELDS: FieldDef[] = [
    { name: "name", label: "Schedule Name", required: true },
    { name: "cronExpression", label: "Cron Expression", required: true },
];

export default function SchedulesPage() {
    const { themeColor } = usePreferencesStore();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [playbooks, setPlaybooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [schData, pbData] = await Promise.all([
                gql(`query($t: String!) { opsSchedules(tenantId: $t) {
                    id name cronExpression timezone isActive playbookId playbookName playbookCategory nextRunAt lastRunAt createdBy createdAt
                } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { opsPlaybooks(tenantId: $t) { id name category } }`, { t: DEFAULT_TENANT_ID }),
            ]);
            setSchedules(schData.opsSchedules || []);
            setPlaybooks(pbData.opsPlaybooks || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(`mutation($id: String!, $name: String, $cronExpression: String, $timezone: String) {
                    updateOpsSchedule(id: $id, name: $name, cronExpression: $cronExpression, timezone: $timezone) { id }
                }`, { id: editing.id, ...values });
                message.success("Schedule updated");
            } else {
                await gql(`mutation($t: String!, $pbId: String!, $name: String!, $cron: String!, $tz: String) {
                    createOpsSchedule(tenantId: $t, playbookId: $pbId, name: $name, cronExpression: $cron, timezone: $tz) { id }
                }`, { t: DEFAULT_TENANT_ID, pbId: values.playbookId, name: values.name, cron: values.cronExpression, tz: values.timezone });
                message.success("Schedule created");
            }
            setIsModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await gql(`mutation($id: String!, $isActive: Boolean) { updateOpsSchedule(id: $id, isActive: $isActive) { id } }`, { id, isActive });
            message.success(isActive ? 'Activated' : 'Deactivated'); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteOpsSchedule(id: $id) }`, { id });
            message.success("Deleted"); loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                const pb = playbooks.find(p => p.name === r.playbookName) || playbooks[0];
                if (!pb) throw new Error('No playbook found');
                await gql(`mutation($t: String!, $pbId: String!, $name: String!, $cron: String!) {
                    createOpsSchedule(tenantId: $t, playbookId: $pbId, name: $name, cronExpression: $cron) { id }
                }`, { t: DEFAULT_TENANT_ID, pbId: pb.id, name: r.name, cron: r.cronExpression });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadData(); return { success, failed, errors };
    };

    const columns: ColumnsType<any> = [
        {
            title: "Schedule", key: "name", width: 220,
            render: (_, r) => (
                <Space>
                    <ScheduleOutlined style={{ fontSize: 18, color: r.isActive ? '#3b82f6' : '#94a3b8' }} />
                    <div>
                        <Text strong>{r.name}</Text>
                        {!r.isActive && <Tag color="default" style={{ marginLeft: 6 }}>Inactive</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.playbookName}</Text>
                    </div>
                </Space>
            ),
        },
        { title: "Cron", dataIndex: "cronExpression", width: 130, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Timezone", dataIndex: "timezone", width: 130, render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Active", key: "isActive", width: 80, align: 'center', render: (_, r) => <Switch checked={r.isActive} size="small" onChange={(v) => handleToggle(r.id, v)} /> },
        {
            title: "Next Run", key: "nextRun", width: 140,
            render: (_, r) => {
                if (!r.isActive) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                if (!r.nextRunAt) return <Text type="secondary" style={{ fontSize: 11 }}>Not scheduled</Text>;
                const isOverdue = dayjs(r.nextRunAt).isBefore(dayjs());
                return (
                    <Tooltip title={dayjs(r.nextRunAt).format('MMM D, HH:mm')}>
                        <Tag color={isOverdue ? 'red' : 'blue'} style={{ fontSize: 11 }}>
                            <ClockCircleOutlined /> {dayjs(r.nextRunAt).fromNow()}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: "Last Run", key: "lastRun", width: 140,
            render: (_, r) => r.lastRunAt ? (
                <Tooltip title={dayjs(r.lastRunAt).format('MMM D, HH:mm')}>
                    <Text style={{ fontSize: 12 }}>{dayjs(r.lastRunAt).fromNow()}</Text>
                </Tooltip>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>Never</Text>,
        },
        {
            title: "Actions", key: "actions", width: 140,
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setIsModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id) })} />
                </Space>
            ),
        },
    ];

    const formSteps = [{
        title: "Schedule Info", icon: <ScheduleOutlined />, fields: ["name", "playbookId", "cronExpression", "timezone"],
        content: (
            <>
                <Form.Item name="name" label="Schedule Name" rules={[{ required: true }]}><Input placeholder="e.g., Daily Health Check" /></Form.Item>
                {!editing && (
                    <Form.Item name="playbookId" label="Playbook" rules={[{ required: true }]}>
                        <Select placeholder="Select playbook" options={playbooks.map(p => ({ label: `${p.name} (${p.category})`, value: p.id }))} />
                    </Form.Item>
                )}
                <Form.Item name="cronExpression" label="Cron Expression" rules={[{ required: true }]} extra="e.g., 0 9 * * * (daily at 9am)">
                    <Input placeholder="0 9 * * *" />
                </Form.Item>
                <Form.Item name="timezone" label="Timezone" initialValue="Asia/Jakarta">
                    <Select options={['Asia/Jakarta','Asia/Singapore','UTC','America/New_York','Europe/London'].map(t => ({ label: t, value: t }))} />
                </Form.Item>
            </>
        ),
    }];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Schedules</AuroraText>}
            subTitle={<DecryptedText text="Recurring schedule definitions for automatic playbook execution" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setIsModalOpen(true); }}>Create Schedule</Button>,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ops_schedules', title: 'Schedules', columns: [{ header: 'Name', key: 'name' }, { header: 'Cron', key: 'cronExpression' }, { header: 'Timezone', key: 'timezone' }, { header: 'Active', key: 'isActive' }, { header: 'Playbook', key: 'playbookName' }], data: schedules })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ops_schedules', title: 'Schedules', columns: [{ header: 'Name', key: 'name' }, { header: 'Cron', key: 'cronExpression' }, { header: 'Timezone', key: 'timezone' }, { header: 'Playbook', key: 'playbookName' }], data: schedules })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: schedules.length, icon: <ScheduleOutlined />, color: '#8b5cf6' },
                    { title: 'Active', value: schedules.filter(s => s.isActive).length, icon: <PlayCircleOutlined />, color: '#22c55e' },
                    { title: 'Inactive', value: schedules.filter(s => !s.isActive).length, icon: <ClockCircleOutlined />, color: '#94a3b8' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Card><Table columns={columns} dataSource={schedules.map(s => ({ ...s, key: s.id }))} loading={loading} pagination={false} size="middle" scroll={{ x: 900 }} /></Card>

            <SteppedFormModal
                open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave} form={form} title={editing ? "Edit Schedule" : "Create Schedule"}
                entityName="schedule" steps={formSteps} fields={SCHEDULE_FIELDS} width={520}
                onBatchCreate={handleBatchCreate} gradient={["#06b6d4", themeColor]} editMode={!!editing}
            />
        </CMSLayout>
    );
}
