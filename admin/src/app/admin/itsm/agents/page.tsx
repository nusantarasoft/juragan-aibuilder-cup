"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Progress, InputNumber, Avatar, Typography, Card, Statistic } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined, UserOutlined, TrophyOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const statusColors: Record<string, string> = { active: 'green', on_leave: 'orange', training: 'blue', unavailable: 'red', resigned: 'default' };
const roleColors: Record<string, string> = { team_lead: 'gold', senior_agent: 'blue', agent: 'green', specialist: 'purple', manager: 'red' };
const shiftColors: Record<string, string> = { day: 'blue', night: 'purple', swing: 'orange', flexible: 'cyan' };

const FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "email", label: "Email", required: true },
    { name: "team", label: "Team" },
    { name: "role", label: "Role" },
];

export default function AgentsPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterTeam, setFilterTeam] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterStatus) filters['status'] = `eq.${filterStatus}`;
            if (filterTeam) filters['team'] = `eq.${filterTeam}`;
            const rows = await supaRest('itsm_agents', { order: 'name.asc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterTeam, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { name: values.name, email: values.email, phone: values.phone, title: values.title, department: values.department, team: values.team, role: values.role || 'agent', status: values.status || 'active', shift: values.shift || 'day', shift_start: values.shift_start, shift_end: values.shift_end, max_tickets: values.max_tickets || 10, notes: values.notes };
            if (editing) {
                await supaUpdate('itsm_agents', editing.id, body);
                messageApi.success("Agent updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.agent_code?.replace('AGT-', '') || '0'))) + 1 : 1;
                body.agent_code = `AGT-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                await supaInsert('itsm_agents', body);
                messageApi.success(`Agent ${body.agent_code} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_agents', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const teams = [...new Set(data.map(a => a.team).filter(Boolean))];
    const totalActive = data.filter(a => a.status === 'active').length;
    const avgUtil = totalActive > 0 ? Math.round(data.filter(a => a.status === 'active').reduce((sum, a) => sum + ((a.current_ticket_count || 0) / (a.max_tickets || 10) * 100), 0) / totalActive) : 0;

    const columns: ProColumns<any>[] = [
        { title: 'Agent', dataIndex: 'name', width: 200, render: (_, r) => <Space><Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="small" /><div><Text strong>{r.name}</Text><br/><Text type="secondary" style={{ fontSize: 12 }}>{r.agent_code} · {r.title || r.role}</Text></div></Space> },
        { title: 'Team', dataIndex: 'team', width: 130, render: (_, r) => <Tag>{r.team}</Tag> },
        { title: 'Role', dataIndex: 'role', width: 120, render: (_, r) => <Tag color={roleColors[r.role]}>{(r.role || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Shift', dataIndex: 'shift', width: 90, render: (_, r) => <Tag color={shiftColors[r.shift]}>{(r.shift || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 110, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Workload', width: 150, render: (_, r) => { const pct = r.max_tickets > 0 ? Math.round((r.current_ticket_count / r.max_tickets) * 100) : 0; return <Progress percent={pct} size="small" status={pct > 80 ? 'exception' : pct > 60 ? 'active' : 'success'} format={() => `${r.current_ticket_count || 0}/${r.max_tickets || 10}`} />; } },
        { title: 'Resolution', dataIndex: 'avg_resolution_hours', width: 100, render: (_, r) => r.avg_resolution_hours ? <Text><ClockCircleOutlined /> {r.avg_resolution_hours}h</Text> : '-' },
        { title: 'CSAT', dataIndex: 'customer_satisfaction_score', width: 80, render: (_, r) => r.customer_satisfaction_score ? <Tag color={r.customer_satisfaction_score >= 4.5 ? 'green' : r.customer_satisfaction_score >= 4 ? 'blue' : 'orange'}>⭐ {r.customer_satisfaction_score}</Tag> : '-' },
        { title: 'SLA %', dataIndex: 'sla_compliance_pct', width: 80, render: (_, r) => r.sla_compliance_pct ? <Tag color={r.sla_compliance_pct >= 95 ? 'green' : r.sla_compliance_pct >= 90 ? 'orange' : 'red'}>{r.sla_compliance_pct}%</Tag> : '-' },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete agent?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Workforce Management</AuroraText>}
            subTitle={<DecryptedText text="Manage IT service desk agents, skills, and workload" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card size="small"><Statistic title="Active Agents" value={totalActive} suffix={`/ ${data.length}`} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Avg Utilization" value={avgUtil} suffix="%" valueStyle={{ color: avgUtil > 80 ? '#f5222d' : '#52c41a' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Total Resolved" value={data.reduce((s, a) => s + (a.total_tickets_resolved || 0), 0)} valueStyle={{ color: themeColor }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="Teams" value={teams.length} valueStyle={{ color: '#13c2c2' }} /></Card></Col>
            </Row>

            <ProTable
                headerTitle={<Space><TeamOutlined /> Service Desk Agents</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 130 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'active', label: 'Active' }, { value: 'on_leave', label: 'On Leave' }, { value: 'training', label: 'Training' }, { value: 'unavailable', label: 'Unavailable' }]} />,
                    <Select key="ft" placeholder="Team" allowClear style={{ width: 160 }} value={filterTeam} onChange={setFilterTeam}
                        options={teams.map(t => ({ value: t, label: t }))} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Agent</Button>,
                ]}
            />

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.agent_code}` : "New Agent"} entityName="agent" steps={[
                { title: "Personal", icon: <UserOutlined />, fields: ["name", "email", "phone", "title"],
                    content: (<>
                        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input placeholder="Ahmad Rizal" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input placeholder="ahmad@nusantarasoft.local" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="phone" label="Phone"><Input placeholder="+62-812-XXXX-XXXX" /></Form.Item></Col>
                        </Row>
                        <Form.Item name="title" label="Job Title"><Input placeholder="Senior System Administrator" /></Form.Item>
                    </>),
                },
                { title: "Assignment", icon: <TeamOutlined />, fields: ["department", "team", "role", "status", "shift", "shift_start", "shift_end", "max_tickets"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="team" label="Team"><Input placeholder="Infrastructure" /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="role" label="Role"><Select options={[{ value: 'agent', label: 'Agent' }, { value: 'senior_agent', label: 'Senior Agent' }, { value: 'specialist', label: 'Specialist' }, { value: 'team_lead', label: 'Team Lead' }, { value: 'manager', label: 'Manager' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="shift" label="Shift"><Select options={[{ value: 'day', label: '☀️ Day' }, { value: 'night', label: '🌙 Night' }, { value: 'swing', label: '🔄 Swing' }, { value: 'flexible', label: '📐 Flexible' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="max_tickets" label="Max Tickets"><InputNumber style={{ width: '100%' }} min={1} max={50} /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="shift_start" label="Shift Start"><Input type="time" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="shift_end" label="Shift End"><Input type="time" /></Form.Item></Col>
                        </Row>
                        {editing && <Form.Item name="status" label="Status"><Select options={[{ value: 'active', label: 'Active' }, { value: 'on_leave', label: 'On Leave' }, { value: 'training', label: 'Training' }, { value: 'unavailable', label: 'Unavailable' }, { value: 'resigned', label: 'Resigned' }]} /></Form.Item>}
                    </>),
                },
            ]} fields={FIELDS} width={750} gradient={["#13c2c2", "#08979c"]} editMode={!!editing} initialValues={{ role: 'agent', status: 'active', shift: 'day', max_tickets: 10 }} />
        </div>
        </CMSLayout>
    );
}
