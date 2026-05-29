"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Table, Select, Switch, message, Avatar, Badge, Empty, Spin, Tooltip, Divider, Input, Modal, Checkbox } from "antd";
import {
    LockOutlined, TeamOutlined, UserOutlined, CheckCircleOutlined,
    EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
    ReloadOutlined, SafetyOutlined, FormOutlined, SettingOutlined,
    KeyOutlined, GlobalOutlined, StopOutlined, CrownOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface PermissionEntry {
    id: string;
    roleName: string;
    roleColor: string;
    roleIcon: React.ReactNode;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSubmit: boolean;
    canReview: boolean;
    canViewAnalytics: boolean;
    canExport: boolean;
    canManageSettings: boolean;
}

const DEFAULT_PERMISSIONS: PermissionEntry[] = [
    { id: 'admin', roleName: 'Administrator', roleColor: '#ef4444', roleIcon: <CrownOutlined />, canCreate: true, canEdit: true, canDelete: true, canSubmit: true, canReview: true, canViewAnalytics: true, canExport: true, canManageSettings: true },
    { id: 'manager', roleName: 'Manager', roleColor: '#8b5cf6', roleIcon: <TeamOutlined />, canCreate: true, canEdit: true, canDelete: false, canSubmit: true, canReview: true, canViewAnalytics: true, canExport: true, canManageSettings: false },
    { id: 'reviewer', roleName: 'Reviewer', roleColor: '#3b82f6', roleIcon: <EyeOutlined />, canCreate: false, canEdit: false, canDelete: false, canSubmit: false, canReview: true, canViewAnalytics: true, canExport: false, canManageSettings: false },
    { id: 'employee', roleName: 'Employee', roleColor: '#10b981', roleIcon: <UserOutlined />, canCreate: false, canEdit: false, canDelete: false, canSubmit: true, canReview: false, canViewAnalytics: false, canExport: false, canManageSettings: false },
    { id: 'external', roleName: 'External User', roleColor: '#f59e0b', roleIcon: <GlobalOutlined />, canCreate: false, canEdit: false, canDelete: false, canSubmit: true, canReview: false, canViewAnalytics: false, canExport: false, canManageSettings: false },
];

const PERMISSION_LABELS: { key: keyof PermissionEntry; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    { key: 'canCreate', label: 'Create', icon: <PlusOutlined />, color: '#10b981', desc: 'Create new form templates' },
    { key: 'canEdit', label: 'Edit', icon: <EditOutlined />, color: '#3b82f6', desc: 'Modify existing templates & fields' },
    { key: 'canDelete', label: 'Delete', icon: <DeleteOutlined />, color: '#ef4444', desc: 'Remove templates & submissions' },
    { key: 'canSubmit', label: 'Submit', icon: <FormOutlined />, color: '#8b5cf6', desc: 'Fill and submit forms' },
    { key: 'canReview', label: 'Review', icon: <CheckCircleOutlined />, color: '#f59e0b', desc: 'Approve or reject submissions' },
    { key: 'canViewAnalytics', label: 'Analytics', icon: <EyeOutlined />, color: '#06b6d4', desc: 'View reports & analytics' },
    { key: 'canExport', label: 'Export', icon: <KeyOutlined />, color: '#ec4899', desc: 'Export data to CSV/PDF' },
    { key: 'canManageSettings', label: 'Settings', icon: <SettingOutlined />, color: '#6366f1', desc: 'Manage form settings' },
];

export default function FormPermissionsPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const [permissions, setPermissions] = useState<PermissionEntry[]>(DEFAULT_PERMISSIONS);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const togglePermission = (roleId: string, permKey: keyof PermissionEntry) => {
        if (roleId === 'admin') { messageApi.warning('Administrator permissions cannot be modified'); return; }
        setPermissions(prev => prev.map(p => {
            if (p.id === roleId) return { ...p, [permKey]: !(p[permKey] as boolean) };
            return p;
        }));
    };

    const handleSave = () => {
        messageApi.success('Permissions saved successfully!');
    };

    const selectedPerm = permissions.find(p => p.id === selectedRole);

    const columns: ColumnsType<PermissionEntry> = [
        { title: 'Role', dataIndex: 'roleName', width: 160, fixed: 'left', render: (v: string, rec) => (
            <Space>
                <Avatar size="small" style={{ backgroundColor: rec.roleColor, fontSize: 11 }}>{rec.roleIcon}</Avatar>
                <div>
                    <Text strong style={{ fontSize: 12 }}>{v}</Text>
                    {rec.id === 'admin' && <Tag color="red" style={{ fontSize: 8, marginLeft: 4, borderRadius: 6 }}>Super</Tag>}
                </div>
            </Space>
        )},
        ...PERMISSION_LABELS.map(perm => ({
            title: <Tooltip title={perm.desc}><Space size={2}>{perm.icon}<Text style={{ fontSize: 10 }}>{perm.label}</Text></Space></Tooltip>,
            key: perm.key,
            width: 90,
            align: 'center' as const,
            render: (_: any, rec: PermissionEntry) => (
                <Switch size="small" checked={rec[perm.key] as boolean}
                    disabled={rec.id === 'admin'}
                    onChange={() => togglePermission(rec.id, perm.key)}
                    style={rec[perm.key] ? { backgroundColor: perm.color } : {}} />
            ),
        })),
        { title: '', key: 'actions', width: 50, render: (_: any, rec: PermissionEntry) => (
            <Tooltip title="View Details"><Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setSelectedRole(rec.id)} /></Tooltip>
        )},
    ];

    // Stats
    const totalPerms = permissions.reduce((sum, p) => sum + PERMISSION_LABELS.filter(l => p[l.key] as boolean).length, 0);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ef4444', '#8b5cf6']}>Access Control</AuroraText>}
            subTitle={<DecryptedText text="Role-based permissions for form operations" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="save" type="primary" icon={<SafetyOutlined />} onClick={handleSave}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none' }}>Save Permissions</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={() => setPermissions(DEFAULT_PERMISSIONS)} />,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                        { label: 'Roles', value: permissions.length, color: '#8b5cf6', icon: <TeamOutlined /> },
                        { label: 'Permissions', value: PERMISSION_LABELS.length, color: '#3b82f6', icon: <KeyOutlined /> },
                        { label: 'Active Grants', value: totalPerms, color: '#10b981', icon: <CheckCircleOutlined /> },
                        { label: 'Restricted', value: (permissions.length * PERMISSION_LABELS.length) - totalPerms, color: '#ef4444', icon: <StopOutlined /> },
                    ].map((s, i) => (
                        <Col xs={12} md={6} key={i}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 16px' }}>
                                    <Space>
                                        <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{s.label}</Text>
                                            <div><Text strong style={{ fontSize: 20, color: s.color }}>{s.value}</Text></div>
                                        </div>
                                    </Space>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Permission Legend */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '10px 16px' }}>
                    <Space wrap size={8}>
                        <Text strong style={{ fontSize: 11 }}><LockOutlined /> Permission Types:</Text>
                        {PERMISSION_LABELS.map(p => (
                            <Tooltip key={p.key as string} title={p.desc}>
                                <Tag icon={p.icon} color={p.color} style={{ borderRadius: 8, fontSize: 10, cursor: 'help' }}>{p.label}</Tag>
                            </Tooltip>
                        ))}
                    </Space>
                </Card>

                {/* Permissions Matrix */}
                <Card size="small" title={<Space><SafetyOutlined style={{ color: '#8b5cf6' }} /> Permission Matrix</Space>}
                    extra={<Badge count={`${permissions.length} roles × ${PERMISSION_LABELS.length} permissions`} style={{ backgroundColor: '#6b7280', fontSize: 10 }} />}
                    style={glass}>
                    <Table<PermissionEntry>
                        dataSource={permissions}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 950 }}
                        rowClassName={(rec) => rec.id === 'admin' ? 'admin-row' : ''}
                    />
                </Card>

                {/* Role Cards */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {permissions.map((role, i) => {
                        const grantCount = PERMISSION_LABELS.filter(l => role[l.key] as boolean).length;
                        return (
                            <Col xs={24} sm={12} md={8} lg={4.8} key={role.id}>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                    <Card size="small" style={{ ...glass, borderTop: `3px solid ${role.roleColor}`, textAlign: 'center', cursor: 'pointer' }}
                                        onClick={() => setSelectedRole(role.id)} hoverable>
                                        <Avatar size={40} style={{ backgroundColor: role.roleColor, marginBottom: 8 }}>{role.roleIcon}</Avatar>
                                        <div><Text strong style={{ fontSize: 12 }}>{role.roleName}</Text></div>
                                        <div style={{ margin: '6px 0' }}>
                                            <Text style={{ fontSize: 22, fontWeight: 700, color: role.roleColor }}>{grantCount}</Text>
                                            <Text type="secondary" style={{ fontSize: 10 }}> / {PERMISSION_LABELS.length}</Text>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 2, background: '#f0f0f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${(grantCount / PERMISSION_LABELS.length) * 100}%`, height: '100%', background: role.roleColor, borderRadius: 2 }} />
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        );
                    })}
                </Row>
            </motion.div>

            {/* Role Detail Modal */}
            <Modal title={selectedPerm ? `${selectedPerm.roleName} Permissions` : ''} open={!!selectedRole}
                onCancel={() => setSelectedRole(null)} footer={null} width={420}>
                {selectedPerm && (
                    <div style={{ padding: '8px 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Avatar size={48} style={{ backgroundColor: selectedPerm.roleColor }}>{selectedPerm.roleIcon}</Avatar>
                            <div style={{ marginTop: 8 }}><Text strong style={{ fontSize: 16 }}>{selectedPerm.roleName}</Text></div>
                        </div>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {PERMISSION_LABELS.map(perm => (
                                <div key={perm.key as string} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: 8,
                                    background: (selectedPerm[perm.key] as boolean) ? `${perm.color}08` : '#fafafa',
                                    border: `1px solid ${(selectedPerm[perm.key] as boolean) ? `${perm.color}20` : '#f0f0f0'}`,
                                }}>
                                    <Space>
                                        <span style={{ color: perm.color }}>{perm.icon}</span>
                                        <div>
                                            <Text strong style={{ fontSize: 12 }}>{perm.label}</Text>
                                            <div><Text type="secondary" style={{ fontSize: 10 }}>{perm.desc}</Text></div>
                                        </div>
                                    </Space>
                                    <Switch size="small" checked={selectedPerm[perm.key] as boolean}
                                        disabled={selectedPerm.id === 'admin'}
                                        onChange={() => togglePermission(selectedPerm.id, perm.key)}
                                        style={(selectedPerm[perm.key] as boolean) ? { backgroundColor: perm.color } : {}} />
                                </div>
                            ))}
                        </Space>
                    </div>
                )}
            </Modal>
        </CMSLayout>
    );
}
