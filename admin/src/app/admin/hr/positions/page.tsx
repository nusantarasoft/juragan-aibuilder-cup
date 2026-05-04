"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Button, Space, Typography, message, Modal, Form, Input, Select, InputNumber } from "antd";
import { SkinOutlined, PlusOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const POS_Q = `query($t:String!){hrPositions(tenantId:$t){id title code departmentId departmentName grade minSalary maxSalary currency isActive headcountBudget}}`;
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name}}`;
const CREATE_POS = `mutation($t:String!,$i:CreatePositionInput!){createHrPosition(tenantId:$t,input:$i){id}}`;

const gradeColors: Record<string, string> = { D1: 'red', D2: 'red', M1: 'purple', M2: 'purple', L3: 'blue', L2: 'cyan', L1: 'green' };

export default function PositionsPage() {
    const [positions, setPositions] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();

    const load = () => {
        setLoading(true);
        Promise.all([gql(POS_Q, { t: DEFAULT_TENANT_ID }), gql(DEPT_Q, { t: DEFAULT_TENANT_ID })])
            .then(([p, d]) => { setPositions(p.hrPositions || []); setDepartments(d.hrDepartments || []); })
            .catch(console.error).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    const handleCreate = async (values: any) => {
        try { await gql(CREATE_POS, { t: DEFAULT_TENANT_ID, i: values }); message.success('Position created'); setModalOpen(false); form.resetFields(); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const columns = [
        { title: 'Position', key: 'title', render: (_: any, r: any) => <Space><SkinOutlined style={{ color: themeColor }} /><div><Text strong>{r.title}</Text>{r.code && <Text type="secondary" style={{ marginLeft: 8 }}>({r.code})</Text>}</div></Space> },
        { title: 'Department', dataIndex: 'departmentName', key: 'dept', render: (v: string) => v || '—' },
        { title: 'Grade', dataIndex: 'grade', key: 'grade', render: (v: string) => v ? <Tag color={gradeColors[v] || 'default'}>{v}</Tag> : '—', align: 'center' as const },
        { title: 'Salary Range', key: 'salary', render: (_: any, r: any) => r.minSalary && r.maxSalary ? <Text style={{ fontSize: 12 }}>{fmt(r.minSalary)} — {fmt(r.maxSalary)}</Text> : '—' },
        { title: 'Headcount', dataIndex: 'headcountBudget', key: 'hc', align: 'center' as const },
        { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Positions</AuroraText>}
            subTitle={<DecryptedText text="Job titles, grades & salary band catalog" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Button key="add" type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setModalOpen(true)}>Add Position</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Card style={glass}>
                    <Table dataSource={positions} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" />
                </Card>
            </motion.div>
            <Modal title="Add Position" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
                    <Space size={12}><Form.Item name="code" label="Code"><Input /></Form.Item>
                        <Form.Item name="grade" label="Grade"><Select style={{ width: 120 }} options={['D1','D2','M1','M2','L3','L2','L1'].map(g => ({ label: g, value: g }))} /></Form.Item></Space>
                    <Form.Item name="departmentId" label="Department"><Select allowClear options={departments.map(d => ({ label: d.name, value: d.id }))} /></Form.Item>
                    <Space size={12}><Form.Item name="minSalary" label="Min Salary"><InputNumber style={{ width: 180 }} /></Form.Item>
                        <Form.Item name="maxSalary" label="Max Salary"><InputNumber style={{ width: 180 }} /></Form.Item></Space>
                    <Form.Item name="headcountBudget" label="Headcount Budget" initialValue={1}><InputNumber min={1} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
