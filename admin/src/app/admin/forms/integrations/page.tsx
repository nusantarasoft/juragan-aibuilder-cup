"use client";
import React, { useState } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Switch, Input, Select, Divider, message, Badge, Modal, Form, Tabs, Tooltip } from "antd";
import {
    ApiOutlined, ThunderboltOutlined, CloudUploadOutlined, MailOutlined,
    BellOutlined, MessageOutlined, CodeOutlined, GoogleOutlined,
    LinkOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined,
    PlusOutlined, SafetyOutlined, SyncOutlined,
    DatabaseOutlined, RocketOutlined, GlobalOutlined, TeamOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    category: 'webhook' | 'notification' | 'storage' | 'crm' | 'automation' | 'analytics';
    enabled: boolean;
    status: 'connected' | 'disconnected' | 'error';
    events: string[];
}

const INTEGRATIONS: Integration[] = [
    // Webhooks
    { id: 'webhook-custom', name: 'Custom Webhook', description: 'Send form data to any HTTP endpoint on submission, approval, or rejection.', icon: <ApiOutlined />, color: '#3b82f6', category: 'webhook', enabled: true, status: 'connected', events: ['On Submit', 'On Approve', 'On Reject'] },
    { id: 'webhook-zapier', name: 'Zapier', description: 'Connect to 5,000+ apps through Zapier automation workflows.', icon: <ThunderboltOutlined />, color: '#ff4a00', category: 'automation', enabled: false, status: 'disconnected', events: ['On Submit'] },
    { id: 'webhook-make', name: 'Make (Integromat)', description: 'Visual automation platform for complex multi-step workflows.', icon: <SyncOutlined />, color: '#6366f1', category: 'automation', enabled: false, status: 'disconnected', events: ['On Submit', 'On Score'] },

    // Notifications
    { id: 'notif-email', name: 'Email Notifications', description: 'Send email alerts on form events to respondents, reviewers, and admins.', icon: <MailOutlined />, color: '#ef4444', category: 'notification', enabled: true, status: 'connected', events: ['On Submit', 'On Approve', 'On Assign'] },
    { id: 'notif-slack', name: 'Slack', description: 'Post notifications to Slack channels when forms are submitted or reviewed.', icon: <MessageOutlined />, color: '#4A154B', category: 'notification', enabled: true, status: 'connected', events: ['On Submit', 'On Approve'] },
    { id: 'notif-teams', name: 'Microsoft Teams', description: 'Send form notifications via Teams webhook connector.', icon: <TeamOutlined />, color: '#6264a7', category: 'notification', enabled: false, status: 'disconnected', events: ['On Submit'] },
    { id: 'notif-push', name: 'Push Notifications', description: 'Browser and mobile push notifications for form assignments and deadlines.', icon: <BellOutlined />, color: '#f59e0b', category: 'notification', enabled: true, status: 'connected', events: ['On Assign', 'On Overdue'] },

    // Storage
    { id: 'storage-s3', name: 'AWS S3 / MinIO', description: 'Store file uploads and form attachments in S3-compatible storage.', icon: <CloudUploadOutlined />, color: '#ff9900', category: 'storage', enabled: true, status: 'connected', events: ['File Upload'] },
    { id: 'storage-gcs', name: 'Google Cloud Storage', description: 'Store form attachments in Google Cloud Storage buckets.', icon: <GoogleOutlined />, color: '#4285f4', category: 'storage', enabled: false, status: 'disconnected', events: ['File Upload'] },

    // CRM / External
    { id: 'crm-salesforce', name: 'Salesforce', description: 'Create leads, contacts, or cases from form submissions automatically.', icon: <DatabaseOutlined />, color: '#00a1e0', category: 'crm', enabled: false, status: 'disconnected', events: ['On Submit'] },
    { id: 'crm-hubspot', name: 'HubSpot', description: 'Sync form responses to HubSpot CRM contacts and deals.', icon: <RocketOutlined />, color: '#ff7a59', category: 'crm', enabled: false, status: 'disconnected', events: ['On Submit', 'On Approve'] },

    // Analytics
    { id: 'analytics-ga', name: 'Google Analytics', description: 'Track form views, submissions, and conversion rates in GA4.', icon: <GoogleOutlined />, color: '#e37400', category: 'analytics', enabled: false, status: 'disconnected', events: ['On View', 'On Submit'] },
    { id: 'analytics-segment', name: 'Segment', description: 'Send form events to Segment for unified customer data tracking.', icon: <GlobalOutlined />, color: '#52BD94', category: 'analytics', enabled: false, status: 'disconnected', events: ['On Submit', 'On Score'] },
];

const CATEGORIES = [
    { key: 'all', label: 'All', icon: <ApiOutlined /> },
    { key: 'webhook', label: 'Webhooks', icon: <CodeOutlined /> },
    { key: 'notification', label: 'Notifications', icon: <BellOutlined /> },
    { key: 'storage', label: 'Storage', icon: <CloudUploadOutlined /> },
    { key: 'automation', label: 'Automation', icon: <ThunderboltOutlined /> },
    { key: 'crm', label: 'CRM', icon: <DatabaseOutlined /> },
    { key: 'analytics', label: 'Analytics', icon: <GlobalOutlined /> },
];

export default function FormIntegrationsPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, contextHolder] = message.useMessage();
    const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
    const [category, setCategory] = useState('all');
    const [configModal, setConfigModal] = useState<string | null>(null);

    const filtered = category === 'all' ? integrations : integrations.filter(i => i.category === category);
    const connected = integrations.filter(i => i.status === 'connected').length;
    const enabled = integrations.filter(i => i.enabled).length;

    const toggleIntegration = (id: string) => {
        setIntegrations(prev => prev.map(i => {
            if (i.id === id) {
                const newEnabled = !i.enabled;
                messageApi.success(`${i.name} ${newEnabled ? 'enabled' : 'disabled'}`);
                return { ...i, enabled: newEnabled, status: newEnabled ? 'connected' : 'disconnected' };
            }
            return i;
        }));
    };

    const configTarget = integrations.find(i => i.id === configModal);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Integrations</AuroraText>}
            subTitle={<DecryptedText text="Connect forms to webhooks, notifications, storage & external services" animateOn="view" revealDirection="start" speed={40} sequential />}
        >
            {contextHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                        { label: 'Total Integrations', value: integrations.length, color: '#3b82f6', icon: <ApiOutlined /> },
                        { label: 'Connected', value: connected, color: '#10b981', icon: <CheckCircleOutlined /> },
                        { label: 'Enabled', value: enabled, color: '#8b5cf6', icon: <ThunderboltOutlined /> },
                        { label: 'Categories', value: CATEGORIES.length - 1, color: '#f59e0b', icon: <SettingOutlined /> },
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

                {/* Category Tabs */}
                <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '8px 16px' }}>
                    <Space wrap>
                        {CATEGORIES.map(c => (
                            <Button key={c.key} type={category === c.key ? 'primary' : 'default'} size="small"
                                icon={c.icon} onClick={() => setCategory(c.key)}
                                style={category === c.key ? { background: themeColor, borderColor: themeColor, borderRadius: 8 } : { borderRadius: 8 }}>
                                {c.label}
                                {c.key !== 'all' && <Badge count={integrations.filter(i => i.category === c.key).length} size="small" style={{ marginLeft: 4, backgroundColor: '#d1d5db' }} />}
                            </Button>
                        ))}
                    </Space>
                </Card>

                {/* Integration Cards */}
                <Row gutter={[16, 16]}>
                    <AnimatePresence>
                        {filtered.map((integration, i) => (
                            <Col xs={24} sm={12} md={8} key={integration.id}>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                                    <Card style={{
                                        ...glass, borderLeft: `4px solid ${integration.enabled ? integration.color : '#e5e7eb'}`,
                                        opacity: integration.enabled ? 1 : 0.75, height: '100%',
                                    }}>
                                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Space>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: `${integration.color}12`, fontSize: 20, color: integration.color,
                                                    }}>{integration.icon}</div>
                                                    <div>
                                                        <Text strong style={{ fontSize: 13 }}>{integration.name}</Text>
                                                        <div>
                                                            <Tag color={integration.status === 'connected' ? 'green' : integration.status === 'error' ? 'red' : 'default'}
                                                                style={{ fontSize: 9, borderRadius: 8 }}>
                                                                {integration.status === 'connected' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                                                {' '}{integration.status}
                                                            </Tag>
                                                        </div>
                                                    </div>
                                                </Space>
                                                <Switch size="small" checked={integration.enabled}
                                                    onChange={() => toggleIntegration(integration.id)} />
                                            </div>

                                            {/* Description */}
                                            <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>{integration.description}</Text>

                                            {/* Events */}
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Triggers</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    {integration.events.map(e => (
                                                        <Tag key={e} style={{ fontSize: 9, borderRadius: 6, marginBottom: 2 }}>{e}</Tag>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <Button type="text" size="small" icon={<SettingOutlined />}
                                                    onClick={() => setConfigModal(integration.id)}>Configure</Button>
                                            </div>
                                        </Space>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </AnimatePresence>
                </Row>
            </motion.div>

            {/* Config Modal */}
            <Modal title={configTarget ? `Configure ${configTarget.name}` : ''} open={!!configModal}
                onCancel={() => setConfigModal(null)} width={500}
                footer={[
                    <Button key="close" onClick={() => setConfigModal(null)}>Close</Button>,
                    <Button key="save" type="primary" style={{ background: themeColor }}
                        onClick={() => { messageApi.success('Configuration saved!'); setConfigModal(null); }}>Save</Button>,
                ]}>
                {configTarget && (
                    <div style={{ padding: '8px 0' }}>
                        <Space style={{ marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${configTarget.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: configTarget.color }}>
                                {configTarget.icon}
                            </div>
                            <div>
                                <Text strong>{configTarget.name}</Text>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>{configTarget.description}</Text></div>
                            </div>
                        </Space>
                        <Divider style={{ margin: '12px 0' }} />

                        {configTarget.category === 'webhook' && (
                            <Form layout="vertical">
                                <Form.Item label="Webhook URL">
                                    <Input placeholder="https://your-api.com/webhook" prefix={<LinkOutlined />} />
                                </Form.Item>
                                <Form.Item label="HTTP Method">
                                    <Select defaultValue="POST" options={[{ value: 'POST' }, { value: 'PUT' }, { value: 'PATCH' }]} />
                                </Form.Item>
                                <Form.Item label="Secret Key">
                                    <Input.Password placeholder="Optional signing secret" prefix={<SafetyOutlined />} />
                                </Form.Item>
                            </Form>
                        )}
                        {configTarget.category === 'notification' && (
                            <Form layout="vertical">
                                <Form.Item label="Channel / Recipients">
                                    <Input placeholder={configTarget.id.includes('slack') ? '#forms-notifications' : 'admin@company.com'} />
                                </Form.Item>
                                <Form.Item label="Message Template">
                                    <Input.TextArea rows={3} placeholder="{{formName}} was submitted by {{userName}} with score {{score}}%" />
                                </Form.Item>
                            </Form>
                        )}
                        {!['webhook', 'notification'].includes(configTarget.category) && (
                            <Form layout="vertical">
                                <Form.Item label="API Key / Token">
                                    <Input.Password placeholder="Enter your API key" prefix={<SafetyOutlined />} />
                                </Form.Item>
                                <Form.Item label="Endpoint">
                                    <Input placeholder="https://api.service.com/v1" prefix={<LinkOutlined />} />
                                </Form.Item>
                            </Form>
                        )}

                        <Divider style={{ margin: '12px 0' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Triggered on:</Text>
                        <div style={{ marginTop: 4 }}>
                            {configTarget.events.map(e => <Tag key={e} color={configTarget.color} style={{ borderRadius: 6 }}>{e}</Tag>)}
                        </div>
                    </div>
                )}
            </Modal>
        </CMSLayout>
    );
}
