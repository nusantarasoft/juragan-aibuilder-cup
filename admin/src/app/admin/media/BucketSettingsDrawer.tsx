'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Form, Input, Button, Switch, List, Tag, Select, InputNumber, message, Empty, Space, Typography, Alert, Card, Row, Col, Statistic, Divider, Badge, Tooltip, Popconfirm } from 'antd';
import {
    SafetyCertificateOutlined,
    HistoryOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    DeleteOutlined,
    SaveOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LockOutlined,
    UnlockOutlined,
    InfoCircleOutlined,
    SettingOutlined,
    ThunderboltOutlined,
    ExclamationCircleOutlined,
    DatabaseOutlined,
    CopyOutlined,
    GlobalOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import mediaService, { LifecycleRule, S3Bucket, StorageStats } from '@/lib/mediaService';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Reusable glass card style for consistency with page.tsx
const glassCardStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(var(--theme-color-rgb, 139, 92, 246), 0.1)',
    border: '1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.15)'
};

const glassHeaderStyle = {
    background: 'linear-gradient(135deg, var(--theme-color, #9333ea) 0%, var(--theme-color, #7c3aed) 50%, #6366f1 100%)',
    borderBottom: 'none',
    color: 'white'
};

interface BucketSettingsDrawerProps {
    visible: boolean;
    onClose: () => void;
    bucket: string;
    buckets?: S3Bucket[];
    storageStats?: StorageStats | null;
    onDeleteBucket?: (name: string) => Promise<void>;
    onMakePublic?: () => Promise<void>;
    onDeletePolicy?: () => Promise<void>;
    onCreateBucket?: (name: string) => Promise<boolean>;
    onDuplicateBucket?: (sourceName: string, targetName: string) => Promise<boolean>;
    isSystemLocked?: boolean;
    onToggleLock?: (locked: boolean) => void;
    onToggleVersioning?: () => void;
}

export default function BucketSettingsDrawer({
    visible,
    onClose,
    bucket,
    buckets = [],
    storageStats,
    onDeleteBucket,
    onMakePublic,
    onDeletePolicy,
    onCreateBucket,
    onDuplicateBucket,
    isSystemLocked = false,
    onToggleLock,
    onToggleVersioning
}: BucketSettingsDrawerProps) {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);

    // General tab state
    const [newBucketName, setNewBucketName] = useState('');
    const [duplicateBucketName, setDuplicateBucketName] = useState('');
    const [createBucketLoading, setCreateBucketLoading] = useState(false);
    const [duplicateLoading, setDuplicateLoading] = useState(false);

    // Policy State
    const [policyJson, setPolicyJson] = useState('');
    const [originalPolicy, setOriginalPolicy] = useState('');

    // Lifecycle State
    const [lifecycleRules, setLifecycleRules] = useState<LifecycleRule[]>([]);
    const [newRuleModalVisible, setNewRuleModalVisible] = useState(false);
    const [ruleForm] = Form.useForm();

    // Versioning State
    const [versioningStatus, setVersioningStatus] = useState<string>('Unknown');
    const [versioningLoading, setVersioningLoading] = useState(false);

    // Get current bucket info
    const currentBucketInfo = buckets.find(b => b.name === bucket);

    useEffect(() => {
        if (visible && bucket) {
            loadPolicy();
            loadLifecycle();
            loadVersioning();
        }
    }, [visible, bucket]);

    // ════════════════════════════════════════════════════════════════════════
    // LOADERS
    // ════════════════════════════════════════════════════════════════════════

    const loadPolicy = async () => {
        setLoading(true);
        const policy = await mediaService.getBucketPolicy(bucket);
        const formatted = policy ? JSON.stringify(policy, null, 2) : '';
        setPolicyJson(formatted);
        setOriginalPolicy(formatted);
        setLoading(false);
    };

    const loadLifecycle = async () => {
        setLoading(true);
        const rules = await mediaService.getLifecycleRules(bucket);
        setLifecycleRules(rules);
        setLoading(false);
    };

    const loadVersioning = async () => {
        setVersioningLoading(true);
        const status = await mediaService.getVersioningStatus(bucket);
        setVersioningStatus(status);
        setVersioningLoading(false);
    };

    // ════════════════════════════════════════════════════════════════════════
    // POLICY HANDLERS
    // ════════════════════════════════════════════════════════════════════════

    const handleSavePolicy = async () => {
        try {
            console.log('[BucketSettings] Saving policy raw:', policyJson);

            if (!policyJson.trim()) {
                await mediaService.deleteBucketPolicy(bucket);
                message.success('Policy deleted');
                setPolicyJson('');
                setOriginalPolicy('');
                return;
            }

            let policyObj;
            try {
                policyObj = JSON.parse(policyJson);
            } catch (e: any) {
                message.error(`Invalid JSON syntax: ${e.message}`);
                return;
            }

            console.log('[BucketSettings] Sending policy object:', policyObj);
            const success = await mediaService.setBucketPolicy(policyObj, bucket);

            if (success) {
                message.success('Bucket policy updated successfully');
                setOriginalPolicy(policyJson);
                // Reload to confirm backend persistence
                loadPolicy();
            } else {
                message.error('Failed to update policy. Check console for details.');
            }
        } catch (err) {
            console.error('[BucketSettings] Unexpected error:', err);
            message.error('An unexpected error occurred while saving.');
        }
    };

    // Policy Detection Logic
    const detectPolicyType = (json: string): 'public' | 'readonly' | 'private' | 'custom' => {
        if (!json || !json.trim() || json === '{}') return 'private';

        try {
            const obj = JSON.parse(json);
            const stmt = obj.Statement?.[0];
            if (!stmt) return 'custom';

            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

            // Loose check for "Public" (Read/List)
            const hasGet = actions.includes('s3:GetObject');
            const hasList = actions.includes('s3:ListBucket');
            const isPublicPrincipal = stmt.Principal === '*' || stmt.Principal?.AWS?.includes('*');

            if (isPublicPrincipal && hasGet && !hasList) return 'public'; // Our "Public Read" template
            if (isPublicPrincipal && hasGet && hasList) return 'readonly'; // Our "Read Only" template

            return 'custom';
        } catch {
            return 'custom';
        }
    };

    const activePolicyType = detectPolicyType(policyJson);

    const applyPolicyPreset = (type: 'public' | 'readonly' | 'private') => {
        if (type === 'private') {
            setPolicyJson('');
            return;
        }

        let preset = {};
        if (type === 'public') {
            preset = {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": { "AWS": ["*"] },
                    "Action": ["s3:GetObject"],
                    "Resource": [`arn:aws:s3:::${bucket}/*`],
                }],
            };
        } else if (type === 'readonly') {
            preset = {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": { "AWS": ["*"] },
                    "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:GetObject"],
                    "Resource": [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
                }],
            };
        }
        setPolicyJson(JSON.stringify(preset, null, 2));
    };

    // ════════════════════════════════════════════════════════════════════════
    // LIFECYCLE HANDLERS
    // ════════════════════════════════════════════════════════════════════════
    const handleAddRule = async (values: any) => {
        const newRule: LifecycleRule = {
            id: `rule-${Date.now()}`,
            enabled: true,
            prefix: values.prefix || '',
            expirationDays: values.expirationDays,
            transitionDays: values.transitionDays,
            transitionStorageClass: values.transitionStorageClass,
        };

        const updatedRules = [...lifecycleRules, newRule];
        const success = await mediaService.setLifecycleRules(updatedRules, bucket);
        if (success) {
            message.success('Rule added');
            setLifecycleRules(updatedRules);
            setNewRuleModalVisible(false);
            ruleForm.resetFields();
        } else {
            message.error('Failed to add rule');
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        const updatedRules = lifecycleRules.filter(r => r.id !== ruleId);
        const success = await mediaService.setLifecycleRules(updatedRules, bucket);
        if (success) {
            message.success('Rule deleted');
            setLifecycleRules(updatedRules);
        } else {
            message.error('Failed to delete rule');
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // VERSIONING HANDLERS
    // ════════════════════════════════════════════════════════════════════════

    const toggleVersioning = async (checked: boolean) => {
        setVersioningLoading(true);
        const success = checked
            ? await mediaService.enableVersioning(bucket)
            : await mediaService.disableVersioning(bucket);

        if (success) {
            setVersioningStatus(checked ? 'Enabled' : 'Suspended');
            message.success(`Versioning ${checked ? 'enabled' : 'suspended'}`);
            // Trigger parent refresh
            onToggleVersioning?.();
        } else {
            message.error(`Failed to ${checked ? 'enable' : 'suspend'} versioning`);
        }
        setVersioningLoading(false);
    };

    // Helper for rendering Active Badge
    const renderActiveBadge = () => {
        const map = {
            'public': { color: 'orange', text: 'Public Read', icon: <UnlockOutlined /> },
            'readonly': { color: 'blue', text: 'Listing Enabled', icon: <EyeOutlined /> },
            'private': { color: 'green', text: 'Private', icon: <LockOutlined /> },
            'custom': { color: 'purple', text: 'Custom Policy', icon: <SettingOutlined /> }
        };
        const status = map[activePolicyType] || map['custom'];
        return <Tag color={status.color}>{status.icon} {status.text}</Tag>;
    };

    const items = [
        {
            key: 'general',
            label: (
                <Space>
                    <DatabaseOutlined />
                    <span>General</span>
                </Space>
            ),
            children: (
                <div className="flex flex-col gap-4">
                    {/* Bucket Info */}
                    <Card
                        size="small"
                        className="shadow-sm dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                        style={glassCardStyle}
                        styles={{ header: glassHeaderStyle }}
                        title={<span className="font-semibold flex items-center gap-2 text-white"><InfoCircleOutlined /> Bucket Information</span>}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-[var(--theme-color,#8b5cf6)] to-[var(--theme-secondary,#4f46e5)]">
                                <DatabaseOutlined style={{ fontSize: 32, color: '#fff' }} />
                            </div>
                            <div className="flex-1">
                                <Title level={3} style={{ margin: 0, background: 'linear-gradient(to right, var(--theme-color, #8b5cf6), var(--theme-secondary, #6366f1))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {bucket}
                                </Title>
                                <Space direction="vertical" size={0}>
                                    <Tag color={versioningStatus === 'Enabled' ? 'green' : 'orange'} className="mt-1">
                                        Versioning: {versioningStatus}
                                    </Tag>
                                </Space>
                            </div>
                        </div>
                    </Card>

                    {/* System Protection Lock (Only for ns-system) */}
                    {bucket === 'ns-system' && (
                        <Card
                            size="small"
                            className="shadow-sm border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800"
                            title={<span className="font-semibold flex items-center gap-2 text-orange-600"><SafetyCertificateOutlined /> System Protection</span>}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <Text strong className={isSystemLocked ? "text-orange-600" : "text-green-600"}>
                                        {isSystemLocked ? "Administration Locked" : "Administration Enabled"}
                                    </Text>
                                    <div className="text-xs text-gray-500">
                                        {isSystemLocked
                                            ? "Critical operations are disabled to prevent accidental damage."
                                            : "You can now delete files and modify settings. Proceed with caution."}
                                    </div>
                                </div>
                                {isSystemLocked ? (
                                    <Popconfirm
                                        title="Enable Administration?"
                                        description="This allows deletion of system files. Only proceed if you know what you are doing."
                                        onConfirm={() => onToggleLock?.(false)}
                                        okText="Enable"
                                        cancelText="Cancel"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button type="primary" danger ghost icon={<UnlockOutlined />}>
                                            Unlock
                                        </Button>
                                    </Popconfirm>
                                ) : (
                                    <Button type="primary" icon={<LockOutlined />} onClick={() => onToggleLock?.(true)}>
                                        Lock
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Storage Stats */}
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Card size="small" className="shadow-sm h-full dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]" style={glassCardStyle}>
                                <Statistic title="Total Files" value={storageStats?.totalFiles || 0} prefix={<InfoCircleOutlined style={{ color: 'var(--theme-color, #8b5cf6)' }} />} valueStyle={{ fontWeight: 600 }} />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card size="small" className="shadow-sm h-full dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]" style={glassCardStyle}>
                                <Statistic title="Total Size" value={storageStats ? formatFileSize(storageStats.totalSizeBytes) : '0 B'} prefix={<DatabaseOutlined style={{ color: '#6366f1' }} />} valueStyle={{ fontWeight: 600 }} />
                            </Card>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '8px 0' }} />

                    {/* Actions */}
                    <Card
                        size="small"
                        title={<span className="text-white font-semibold flex items-center gap-2"><ThunderboltOutlined /> Actions</span>}
                        className="shadow-sm dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                        style={glassCardStyle}
                        styles={{ header: glassHeaderStyle }}
                    >
                        <Space direction="vertical" className="w-full" size="middle">
                            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div>
                                    <Text strong>Access Control</Text>
                                    <div className="text-xs text-gray-500">Quickly toggle public access</div>
                                </div>
                                <Space>
                                    <Button
                                        danger
                                        icon={<LockOutlined />}
                                        disabled={bucket === 'ns-system' && isSystemLocked}
                                        onClick={async () => {
                                            if (onDeletePolicy) await onDeletePolicy();
                                        }}
                                    >
                                        Make Private
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<GlobalOutlined />}
                                        disabled={bucket === 'ns-system' && isSystemLocked}
                                        onClick={async () => {
                                            if (onMakePublic) await onMakePublic();
                                        }}
                                    >
                                        Make Public
                                    </Button>
                                </Space>
                            </div>

                            <div className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div className="mb-2">
                                    <Text strong>New Bucket</Text>
                                    <div className="text-xs text-gray-500">Create a brand new empty bucket</div>
                                </div>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input placeholder="New bucket name" value={newBucketName} onChange={e => setNewBucketName(e.target.value)} />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        loading={createBucketLoading}
                                        disabled={!newBucketName.trim()}
                                        onClick={async () => {
                                            if (onCreateBucket && newBucketName.trim()) {
                                                setCreateBucketLoading(true);
                                                await onCreateBucket(newBucketName.trim());
                                                setNewBucketName('');
                                                setCreateBucketLoading(false);
                                            }
                                        }}
                                    >
                                        Create
                                    </Button>
                                </Space.Compact>
                            </div>
                        </Space>
                    </Card>

                    {/* Danger Zone */}
                    <Card
                        size="small"
                        title={<span className="text-red-500 font-semibold flex items-center gap-2"><ExclamationCircleOutlined /> Danger Zone</span>}
                        className="shadow-sm"
                        style={{ background: 'rgba(255, 77, 79, 0.05)', borderColor: 'rgba(255, 77, 79, 0.2)', backdropFilter: 'blur(16px)' }}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <Text strong type="danger">Delete Bucket</Text>
                                <div className="text-xs text-gray-500">Permanently remove this bucket and all data</div>
                            </div>
                            <Popconfirm
                                title="Delete this bucket?"
                                description="This will permanently delete the bucket and ALL its contents. This cannot be undone."
                                onConfirm={async () => {
                                    if (onDeleteBucket) {
                                        await onDeleteBucket(bucket);
                                        onClose();
                                    }
                                }}
                                disabled={bucket === 'ns-system' && isSystemLocked}
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger icon={<DeleteOutlined />} disabled={bucket === 'ns-system' && isSystemLocked}>
                                    Delete
                                </Button>
                            </Popconfirm>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            key: 'policy',
            label: (
                <Space>
                    <SafetyCertificateOutlined />
                    <span>Access Policy</span>
                    {renderActiveBadge()}
                </Space>
            ),
            children: (
                <div className="flex flex-col gap-4">
                    {/* Quick Presets */}
                    <Card size="small" style={glassCardStyle}>
                        <div className="flex flex-col gap-2">
                            <Text type="secondary" className="text-xs uppercase font-bold tracking-wider">Templates</Text>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    type={activePolicyType === 'public' ? 'primary' : 'default'}
                                    icon={<UnlockOutlined />}
                                    onClick={() => applyPolicyPreset('public')}
                                    className={activePolicyType === 'public' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                                >
                                    Public Read (Standard)
                                </Button>
                                <Button
                                    type={activePolicyType === 'readonly' ? 'primary' : 'default'}
                                    icon={<EyeOutlined />}
                                    onClick={() => applyPolicyPreset('readonly')}
                                    className={activePolicyType === 'readonly' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                >
                                    Public + Listing
                                </Button>
                                <Button
                                    type={activePolicyType === 'private' ? 'primary' : 'default'}
                                    icon={<LockOutlined />}
                                    onClick={() => applyPolicyPreset('private')}
                                    className={activePolicyType === 'private' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    Private (Reset)
                                </Button>
                                {activePolicyType === 'custom' && (
                                    <Button type="dashed" icon={<SettingOutlined />} disabled>
                                        Custom Active
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Policy Editor */}
                    <Card
                        size="small"
                        title={<span className="text-white font-semibold flex items-center gap-2"><SettingOutlined /> Policy JSON</span>}
                        extra={
                            <Space>
                                <Button size="small" ghost onClick={loadPolicy} disabled={policyJson === originalPolicy}>
                                    Discard Changes
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSavePolicy}
                                    disabled={policyJson === originalPolicy}
                                >
                                    Save Policy
                                </Button>
                            </Space>
                        }
                        className="shadow-sm dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                        style={glassCardStyle}
                        styles={{ header: glassHeaderStyle }}
                    >
                        <TextArea
                            value={policyJson}
                            onChange={(e) => setPolicyJson(e.target.value)}
                            rows={12}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                backgroundColor: '#1a1a2e',
                                color: '#e0e0e0',
                                border: '1px solid #333'
                            }}
                            placeholder='{\n  "Version": "2012-10-17",\n  "Statement": [...]\n}'
                        />
                    </Card>

                    <Alert
                        message={<><ExclamationCircleOutlined /> Warning</>}
                        description="Incorrectly modifying bucket policies can lock you out of your data."
                        type="warning"
                        showIcon={false}
                        className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800"
                    />
                </div>
            )
        },
        {
            key: 'lifecycle',
            label: (
                <Space>
                    <ClockCircleOutlined />
                    <span>Lifecycle</span>
                    <Badge count={lifecycleRules.length} showZero style={{ backgroundColor: lifecycleRules.length > 0 ? '#1890ff' : '#d9d9d9' }} />
                </Space>
            ),
            children: (
                <div className="flex flex-col gap-4">
                    {/* Header Card */}
                    <Card
                        size="small"
                        className="shadow-sm dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                        style={glassCardStyle}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <Title level={5} style={{ margin: 0 }}>Lifecycle Rules</Title>
                                <Text type="secondary">Automate object expiration and storage transitions</Text>
                            </div>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewRuleModalVisible(true)}>
                                Add Rule
                            </Button>
                        </div>
                    </Card>

                    {/* Rules List */}
                    {lifecycleRules.length === 0 ? (
                        <Card className="shadow-sm" style={glassCardStyle}>
                            <Empty
                                description="No lifecycle rules configured"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewRuleModalVisible(true)}>
                                    Create First Rule
                                </Button>
                            </Empty>
                        </Card>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {lifecycleRules.map(rule => (
                                <Card
                                    key={rule.id}
                                    size="small"
                                    className="shadow-sm hover:shadow-md transition-shadow dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                                    style={glassCardStyle}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Text strong>{rule.id}</Text>
                                                <Tag color={rule.enabled ? 'green' : 'default'}>
                                                    {rule.enabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                                    {' '}{rule.enabled ? 'Active' : 'Disabled'}
                                                </Tag>
                                            </div>
                                            <Space direction="vertical" size={0}>
                                                {rule.prefix && (
                                                    <Text type="secondary">
                                                        Prefix: <Tag style={{ margin: 0 }}>{rule.prefix || '/'}</Tag>
                                                    </Text>
                                                )}
                                                {rule.expirationDays && (
                                                    <Text type="secondary">
                                                        Expires after <Text strong>{rule.expirationDays}</Text> days
                                                    </Text>
                                                )}
                                                {rule.transitionDays && (
                                                    <Text type="secondary">
                                                        Transitions to {rule.transitionStorageClass} after <Text strong>{rule.transitionDays}</Text> days
                                                    </Text>
                                                )}
                                            </Space>
                                        </div>
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDeleteRule(rule.id)}
                                        />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'versioning',
            label: (
                <Space>
                    <HistoryOutlined />
                    <span>Versioning</span>
                    <Tag color={versioningStatus === 'Enabled' ? 'green' : 'orange'} style={{ margin: 0 }}>
                        {versioningStatus === 'Enabled' ? 'ON' : 'OFF'}
                    </Tag>
                </Space>
            ),
            children: (
                <div className="flex flex-col gap-4">
                    {/* Status Card */}
                    <Card
                        className="shadow-sm dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                        style={glassCardStyle}
                    >
                        <Row gutter={24} align="middle">
                            <Col flex="auto">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                                        style={{
                                            backgroundColor: versioningStatus === 'Enabled' ? '#f6ffed' : '#fff7e6',
                                            color: versioningStatus === 'Enabled' ? '#52c41a' : '#fa8c16'
                                        }}
                                    >
                                        {versioningStatus === 'Enabled' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                    </div>
                                    <div>
                                        <Title level={4} style={{ margin: 0 }}>
                                            Versioning is {versioningStatus === 'Enabled' ? 'Enabled' : 'Disabled'}
                                        </Title>
                                        <Text type="secondary">
                                            {versioningStatus === 'Enabled'
                                                ? 'All object versions are being preserved'
                                                : 'Object versions are not being tracked'}
                                        </Text>
                                    </div>
                                </div>
                            </Col>
                            <Col>
                                <Switch
                                    checked={versioningStatus === 'Enabled'}
                                    loading={versioningLoading}
                                    onChange={toggleVersioning}
                                    checkedChildren="ON"
                                    unCheckedChildren="OFF"
                                    style={{ transform: 'scale(1.3)' }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* Info Cards */}
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Card
                                size="small"
                                className="shadow-sm h-full dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                                style={glassCardStyle}
                            >
                                <Statistic
                                    title="Benefits"
                                    value="Data Protection"
                                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                    valueStyle={{ fontSize: 16 }}
                                />
                                <Text type="secondary" className="text-xs">
                                    Recover accidentally deleted or overwritten objects
                                </Text>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card
                                size="small"
                                className="shadow-sm h-full dark:!bg-[rgba(15,15,23,0.7)] dark:!border-[rgba(var(--theme-color-rgb,139,92,246),0.2)]"
                                style={glassCardStyle}
                            >
                                <Statistic
                                    title="Consideration"
                                    value="Storage Cost"
                                    prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                                    valueStyle={{ fontSize: 16 }}
                                />
                                <Text type="secondary" className="text-xs">
                                    Each version consumes additional storage space
                                </Text>
                            </Card>
                        </Col>
                    </Row>

                    <Alert
                        message="How it works"
                        description="When versioning is enabled, every modification creates a new version. Delete operations add a 'delete marker' instead of permanently removing data."
                        type="info"
                        showIcon
                        className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                    />
                </div>
            )
        }
    ];

    return (
        <>
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <SettingOutlined />
                        <span>Advanced Settings</span>
                        <Tag color="cyan">{bucket}</Tag>
                    </div>
                }
                open={visible}
                onCancel={onClose}
                footer={null}
                width={750}
                styles={{ body: { padding: '12px 24px 24px' } }}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    tabBarStyle={{ marginBottom: 16 }}
                />
            </Modal>

            <Modal
                title={<><PlusOutlined /> Add Lifecycle Rule</>}
                open={newRuleModalVisible}
                onCancel={() => setNewRuleModalVisible(false)}
                onOk={() => ruleForm.submit()}
                okText="Create Rule"
            >
                <Divider />
                <Form form={ruleForm} layout="vertical" onFinish={handleAddRule}>
                    <Form.Item
                        name="prefix"
                        label="Prefix Filter"
                        tooltip="Apply rule only to objects with this prefix"
                    >
                        <Input placeholder="e.g., logs/, temp/, backups/" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="expirationDays"
                                label="Expire After (Days)"
                                tooltip="Permanently delete objects after this many days"
                            >
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="transitionDays"
                                label="Transition After (Days)"
                                tooltip="Move to different storage class after this many days"
                            >
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="90" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="transitionStorageClass" label="Target Storage Class">
                        <Select allowClear placeholder="Select storage class for transition">
                            <Option value="STANDARD_IA">Standard IA (Infrequent Access)</Option>
                            <Option value="GLACIER">Glacier (Archive)</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
