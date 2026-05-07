"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Tabs, Table, Button, Space, Modal, Form, Input,
    message, Typography, Row, Col, Statistic, Badge,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, DeleteOutlined, ReloadOutlined,
    TeamOutlined, UsergroupAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Team {
    id: string;
    name: string;
    description: string;
}

interface PublicGroup {
    id: string;
    name: string;
    description: string;
}

const TEAM_FIELDS: FieldDef[] = [
    { name: "name", label: "Team Name", required: true },
    { name: "description", label: "Description" },
];

const GROUP_FIELDS: FieldDef[] = [
    { name: "name", label: "Group Name", required: true },
    { name: "description", label: "Description" },
];

export default function GroupsTeamsPage() {
    const { themeColor } = usePreferencesStore();
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [teamForm] = Form.useForm();

    const [groups, setGroups] = useState<PublicGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupForm] = Form.useForm();

    const loadTeams = useCallback(async () => {
        setTeamsLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    teams(tenantId: $tenantId) { id name description }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setTeams(data.teams || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setTeamsLoading(false);
        }
    }, []);

    const loadGroups = useCallback(async () => {
        setGroupsLoading(true);
        try {
            const data = await gql(`
                query($tenantId: String!) {
                    publicGroups(tenantId: $tenantId) { id name description }
                }
            `, { tenantId: DEFAULT_TENANT_ID });
            setGroups(data.publicGroups || []);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setGroupsLoading(false);
        }
    }, []);

    useEffect(() => { loadTeams(); loadGroups(); }, [loadTeams, loadGroups]);

    const handleCreateTeam = async (values: any) => {
        try {
            await gql(`
                mutation($tenantId: String!, $name: String!, $description: String) {
                    createTeam(tenantId: $tenantId, name: $name, description: $description) { id }
                }
            `, { tenantId: DEFAULT_TENANT_ID, ...values });
            message.success("Team created");
            setTeamModalOpen(false);
            teamForm.resetFields();
            loadTeams();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreateTeams = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $description: String) {
                    createTeam(tenantId: $tenantId, name: $name, description: $description) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, description: r.description || null });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadTeams(); return { success, failed, errors };
    };

    const handleDeleteTeam = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteTeam(id: $id) }`, { id });
            message.success("Team deleted");
            loadTeams();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleCreateGroup = async (values: any) => {
        try {
            await gql(`
                mutation($tenantId: String!, $name: String!, $description: String) {
                    createPublicGroup(tenantId: $tenantId, name: $name, description: $description) { id }
                }
            `, { tenantId: DEFAULT_TENANT_ID, ...values });
            message.success("Public group created");
            setGroupModalOpen(false);
            groupForm.resetFields();
            loadGroups();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleBatchCreateGroups = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($tenantId: String!, $name: String!, $description: String) {
                    createPublicGroup(tenantId: $tenantId, name: $name, description: $description) { id }
                }`, { tenantId: DEFAULT_TENANT_ID, name: r.name, description: r.description || null });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadGroups(); return { success, failed, errors };
    };

    const handleDeleteGroup = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deletePublicGroup(id: $id) }`, { id });
            message.success("Group deleted");
            loadGroups();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const teamColumns: ColumnsType<Team> = [
        {
            title: "Team", key: "team",
            render: (_, record) => (
                <Space>
                    <TeamOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <div>
                        <Text strong>{record.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description || 'No description'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Actions", key: "actions", width: 100,
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />}
                    onClick={() => Modal.confirm({ title: `Delete team "${record.name}"?`, onOk: () => handleDeleteTeam(record.id) })}
                />
            ),
        },
    ];

    const groupColumns: ColumnsType<PublicGroup> = [
        {
            title: "Group", key: "group",
            render: (_, record) => (
                <Space>
                    <UsergroupAddOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                    <div>
                        <Text strong>{record.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.description || 'No description'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Actions", key: "actions", width: 100,
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />}
                    onClick={() => Modal.confirm({ title: `Delete group "${record.name}"?`, onOk: () => handleDeleteGroup(record.id) })}
                />
            ),
        },
    ];

    const teamFormSteps = [
        {
            title: "Team Info",
            icon: <TeamOutlined />,
            fields: ["name", "description"],
            content: (
                <>
                    <Form.Item name="name" label="Team Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., West Region Sales" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Purpose of this team" rows={2} />
                    </Form.Item>
                </>
            ),
        },
    ];

    const groupFormSteps = [
        {
            title: "Group Info",
            icon: <UsergroupAddOutlined />,
            fields: ["name", "description"],
            content: (
                <>
                    <Form.Item name="name" label="Group Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., All Sales Managers" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Purpose of this group" rows={2} />
                    </Form.Item>
                </>
            ),
        },
    ];

    const tabItems = [
        {
            key: "teams",
            label: <Space><TeamOutlined /> Teams</Space>,
            children: (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { teamForm.resetFields(); setTeamModalOpen(true); }}>
                            Create Team
                        </Button>
                    </div>
                    <Table scroll={{ x: 900 }} columns={teamColumns} dataSource={teams.map(t => ({ ...t, key: t.id }))} loading={teamsLoading}
                        pagination={false} size="middle" locale={{ emptyText: "No teams yet" }} />
                </>
            ),
        },
        {
            key: "groups",
            label: <Space><UsergroupAddOutlined /> Public Groups</Space>,
            children: (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { groupForm.resetFields(); setGroupModalOpen(true); }}>
                            Create Public Group
                        </Button>
                    </div>
                    <Table scroll={{ x: 900 }} columns={groupColumns} dataSource={groups.map(g => ({ ...g, key: g.id }))} loading={groupsLoading}
                        pagination={false} size="middle" locale={{ emptyText: "No public groups yet" }} />
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Groups & Teams</AuroraText>}
            subTitle={<DecryptedText text="Manage teams for record-level access and public groups for sharing" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={() => { loadTeams(); loadGroups(); }} />]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Teams', value: teams.length, icon: <TeamOutlined />, color: '#3b82f6' },
                    { title: 'Public Groups', value: groups.length, icon: <UsergroupAddOutlined />, color: '#10b981' },
                    { title: 'Total Entities', value: teams.length + groups.length, icon: <TeamOutlined />, color: '#8b5cf6' },
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
            <Card><Tabs items={tabItems} /></Card>

            <SteppedFormModal
                open={teamModalOpen}
                onCancel={() => { setTeamModalOpen(false); teamForm.resetFields(); }}
                onSubmit={handleCreateTeam}
                form={teamForm}
                title="Create Team"
                entityName="team"
                steps={teamFormSteps}
                fields={TEAM_FIELDS}
                width={500}
                onBatchCreate={handleBatchCreateTeams}
                gradient={["#1677ff", "#0ea5e9"]}
            />

            <SteppedFormModal
                open={groupModalOpen}
                onCancel={() => { setGroupModalOpen(false); groupForm.resetFields(); }}
                onSubmit={handleCreateGroup}
                form={groupForm}
                title="Create Public Group"
                entityName="public-group"
                steps={groupFormSteps}
                fields={GROUP_FIELDS}
                width={500}
                onBatchCreate={handleBatchCreateGroups}
                gradient={["#52c41a", "#10b981"]}
            />
        </CMSLayout>
    );
}
