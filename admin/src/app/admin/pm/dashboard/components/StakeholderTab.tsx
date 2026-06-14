"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDigit } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Row, Col, Tooltip, theme } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, TeamOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_STAKEHOLDERS = `query($projectId: String!) { pmStakeholders(projectId: $projectId) { id name title organization role contactInfo interestLevel influenceLevel supportLevel engagementStrategy communicationNeeds notes } }`;
const CREATE_STAKEHOLDER = `mutation($tenantId: String!, $input: CreatePmStakeholderInput!) { createPmStakeholder(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_STAKEHOLDER = `mutation($id: ID!, $input: UpdatePmStakeholderInput!) { updatePmStakeholder(id: $id, input: $input) { id } }`;
const DELETE_STAKEHOLDER = `mutation($id: ID!) { deletePmStakeholder(id: $id) }`;

const AI_STAKEHOLDERS = `query($projectId: String!) { generateStakeholderAnalysis(projectId: $projectId) }`;

// ─── Power/Interest Grid Quadrant ──────────────────────────

function PowerInterestGrid({ stakeholders, isDark }: { stakeholders: any[]; isDark: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const gridSize = 400;
    const padding = 50;
    const plotSize = gridSize - padding * 2;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, gridSize, gridSize);

        // Quadrant backgrounds
        const quadrants = [
            { x: padding, y: padding, color: 'rgba(82,196,26,0.08)', label: 'Keep Satisfied' },           // High Power, Low Interest
            { x: padding + plotSize / 2, y: padding, color: 'rgba(245,34,45,0.08)', label: 'Manage Closely' },     // High Power, High Interest
            { x: padding, y: padding + plotSize / 2, color: 'rgba(217,217,217,0.08)', label: 'Monitor' },      // Low Power, Low Interest
            { x: padding + plotSize / 2, y: padding + plotSize / 2, color: 'rgba(24,144,255,0.08)', label: 'Keep Informed' },   // Low Power, High Interest
        ];

        quadrants.forEach((q, i) => {
            ctx.fillStyle = q.color;
            ctx.fillRect(q.x, q.y, plotSize / 2, plotSize / 2);
            ctx.fillStyle = isDark ? '#64748b' : '#999';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(q.label, q.x + plotSize / 4, q.y + 15);
        });

        // Grid lines
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding + plotSize / 2, padding);
        ctx.lineTo(padding + plotSize / 2, padding + plotSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding, padding + plotSize / 2);
        ctx.lineTo(padding + plotSize, padding + plotSize / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Border
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#d9d9d9';
        ctx.strokeRect(padding, padding, plotSize, plotSize);

        // Axis labels
        ctx.fillStyle = isDark ? '#94a3b8' : '#555';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Interest Level →', gridSize / 2, gridSize - 5);
        ctx.save();
        ctx.translate(12, gridSize / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Power / Influence →', 0, 0);
        ctx.restore();

        // Plot stakeholders
        const colors = ['#1890ff', '#f5222d', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#faad14'];
        stakeholders.forEach((s, i) => {
            const interest = (s.interestLevel || 3);
            const power = (s.influenceLevel || 3);
            const x = padding + ((interest - 1) / 4) * plotSize;
            const y = padding + plotSize - ((power - 1) / 4) * plotSize;

            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = isDark ? '#e2e8f0' : '#333';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            const displayName = s.name.length > 12 ? s.name.substring(0, 12) + '…' : s.name;
            ctx.fillText(displayName, x + 11, y + 4);
        });

    }, [stakeholders, gridSize, plotSize, isDark]);

    return (
        <ProCard title={<Space><TeamOutlined /> Power / Interest Grid</Space>} bordered>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <canvas ref={canvasRef} width={gridSize} height={gridSize} style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`, borderRadius: 8 }} />
            </div>
        </ProCard>
    );
}

export default function StakeholderTab({ projectId }: { projectId: string }) {
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [messageApi, contextHolder] = message.useMessage();
    const [stakeholders, setStakeholders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_STAKEHOLDERS, { projectId });
            setStakeholders(d.pmStakeholders || []);
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to load stakeholders."); }
        finally { setLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_STAKEHOLDER, { id: editing.id, input: values });
                messageApi.success("Stakeholder updated.");
            } else {
                await gql(CREATE_STAKEHOLDER, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Stakeholder added.");
            }
            setModalOpen(false); loadData();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_STAKEHOLDER, { id }); messageApi.success("Stakeholder deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const handleAi = async () => {
        setAiLoading(true);
        try {
            const d = await gql(AI_STAKEHOLDERS, { projectId });
            const raw = d.generateStakeholderAnalysis;
            // AI returns { stakeholders: [...] } or a JSON string
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const items = Array.isArray(parsed) ? parsed : (parsed?.stakeholders || parsed?.items || []);
            for (const item of items) {
                await gql(CREATE_STAKEHOLDER, {
                    tenantId: DEFAULT_TENANT_ID,
                    input: {
                        projectId, name: item.name || item.title,
                        role: item.role, organization: item.organization,
                        interestLevel: item.interestLevel || 3,
                        influenceLevel: item.influenceLevel || 3,
                        engagementStrategy: item.engagementStrategy,
                    }
                });
            }
            messageApi.success(`Added ${items.length} stakeholders from AI analysis.`);
            loadData();
        } catch (err: any) { messageApi.error(`AI failed: ${err.message}`); }
        finally { setAiLoading(false); }
    };

    const supportColors: Record<string, string> = { champion: 'green', supporter: 'blue', neutral: 'default', resistant: 'orange', blocker: 'red' };

    const columns: ProColumns<any>[] = [
        { title: "Name", dataIndex: "name", width: "15%" },
        { title: "Title", dataIndex: "title" },
        { title: "Organization", dataIndex: "organization" },
        { title: "Role", dataIndex: "role" },
        { title: "Interest", dataIndex: "interestLevel", render: (_, r) => <Tag>{r.interestLevel || '-'}/5</Tag> },
        { title: "Influence", dataIndex: "influenceLevel", render: (_, r) => <Tag>{r.influenceLevel || '-'}/5</Tag> },
        {
            title: "Support", dataIndex: "supportLevel",
            render: (_, r) => r.supportLevel ? <Tag color={supportColors[r.supportLevel]}>{r.supportLevel.toUpperCase()}</Tag> : '-'
        },
        { title: "Strategy", dataIndex: "engagementStrategy", ellipsis: true },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}

            {/* Power / Interest Grid */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <PowerInterestGrid stakeholders={stakeholders} isDark={isDark} />
                </Col>
            </Row>

            {/* Stakeholder Register Table */}
            <ProTable
                headerTitle="Stakeholder Register"
                rowKey="id"
                dataSource={stakeholders}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="ai" type="dashed" icon={<RobotOutlined />} loading={aiLoading} onClick={handleAi}>
                        AI Stakeholder Analysis
                    </Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
                        Add Stakeholder
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Stakeholder" : "Add Stakeholder"}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onFinish={handleSave}
                initialValues={editing || { interestLevel: 3, influenceLevel: 3, supportLevel: 'neutral' }}
                modalProps={{ destroyOnClose: true }}
                width={700}
            >
                <ProForm.Group>
                    <ProFormText name="name" label="Full Name" rules={[{ required: true }]} width="md" />
                    <ProFormText name="title" label="Job Title" width="md" />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormText name="organization" label="Organization" width="md" />
                    <ProFormText name="role" label="Project Role" width="md" placeholder="e.g. Sponsor, User, Advisor" />
                </ProForm.Group>
                <ProFormText name="contactInfo" label="Contact Info" placeholder="Email or phone" />
                <ProForm.Group>
                    <ProFormDigit name="interestLevel" label="Interest Level (1-5)" min={1} max={5} width="sm" />
                    <ProFormDigit name="influenceLevel" label="Influence Level (1-5)" min={1} max={5} width="sm" />
                    <ProFormSelect name="supportLevel" label="Support Level" width="sm" options={[
                        { value: 'champion', label: 'Champion' }, { value: 'supporter', label: 'Supporter' },
                        { value: 'neutral', label: 'Neutral' }, { value: 'resistant', label: 'Resistant' },
                        { value: 'blocker', label: 'Blocker' },
                    ]} />
                </ProForm.Group>
                <ProFormTextArea name="engagementStrategy" label="Engagement Strategy" />
                <ProFormTextArea name="communicationNeeds" label="Communication Needs" />
                <ProFormTextArea name="notes" label="Notes" />
            </ModalForm>
        </div>
    );
}

