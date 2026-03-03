"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Card, Tabs, Table, Button, Space, Modal, Form, Input,
    message, Typography,
} from "antd";
import {
    PlusOutlined, DeleteOutlined, ReloadOutlined,
    TeamOutlined, UsergroupAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

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

export default function GroupsTeamsPage() {
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

    const handleCreateTeam = async () => {
        try {
            const values = await teamForm.validateFields();
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

    const handleDeleteTeam = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteTeam(id: $id) }`, { id });
            message.success("Team deleted");
            loadTeams();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleCreateGroup = async () => {
        try {
            const values = await groupForm.validateFields();
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
                    <Table columns={teamColumns} dataSource={teams.map(t => ({ ...t, key: t.id }))} loading={teamsLoading}
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
                    <Table columns={groupColumns} dataSource={groups.map(g => ({ ...g, key: g.id }))} loading={groupsLoading}
                        pagination={false} size="middle" locale={{ emptyText: "No public groups yet" }} />
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Groups & Teams"
            subTitle="Manage teams for record-level access and public groups for sharing"
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={() => { loadTeams(); loadGroups(); }} />]}
        >
            <Card><Tabs items={tabItems} /></Card>

            <Modal title="Create Team" open={teamModalOpen} onOk={handleCreateTeam}
                onCancel={() => { setTeamModalOpen(false); teamForm.resetFields(); }} okText="Create">
                <Form form={teamForm} layout="vertical">
                    <Form.Item name="name" label="Team Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., West Region Sales" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Purpose of this team" rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="Create Public Group" open={groupModalOpen} onOk={handleCreateGroup}
                onCancel={() => { setGroupModalOpen(false); groupForm.resetFields(); }} okText="Create">
                <Form form={groupForm} layout="vertical">
                    <Form.Item name="name" label="Group Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., All Sales Managers" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea placeholder="Purpose of this group" rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
