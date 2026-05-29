"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Table, Switch, message, Input, Select, Badge, Empty, Spin, Tooltip, Modal, Divider, QRCode } from "antd";
import {
    ShareAltOutlined, LinkOutlined, CopyOutlined, QrcodeOutlined,
    GlobalOutlined, LockOutlined, EyeOutlined, FormOutlined,
    CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined,
    MailOutlined, CodeOutlined, PlusOutlined, SettingOutlined,
    TeamOutlined, CalendarOutlined, BarChartOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ColumnsType } from "antd/es/table";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ShareLink {
    id: string;
    templateId: string;
    templateName: string;
    url: string;
    type: 'public' | 'restricted' | 'embed';
    active: boolean;
    responses: number;
    maxResponses?: number;
    expiresAt?: string;
    password?: boolean;
    createdAt: string;
}

export default function FormSharingPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [qrModal, setQrModal] = useState<string | null>(null);
    const [embedModal, setEmbedModal] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ formTemplates: any[] }>(`
                query($t:String!) { formTemplates(tenantId: $t) { id name category status } }
            `, { t: DEFAULT_TENANT_ID });
            setTemplates((res.formTemplates || []).filter((t: any) => t.status === 'published'));
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    // Generate share links for published templates
    const shareLinks: ShareLink[] = templates.map((t: any, i: number) => ({
        id: `link-${t.id}`,
        templateId: t.id,
        templateName: t.name,
        url: `${typeof window !== 'undefined' ? window.location.origin : 'https://app.nusantarasoft.com'}/forms/${t.id}`,
        type: i % 3 === 0 ? 'public' : i % 3 === 1 ? 'restricted' : 'embed',
        active: true,
        responses: Math.floor(Math.random() * 50),
        maxResponses: i % 2 === 0 ? 100 : undefined,
        expiresAt: i % 3 === 0 ? undefined : new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
        password: i % 4 === 0,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    const copyLink = (url: string) => {
        navigator.clipboard.writeText(url).then(() => messageApi.success('Link copied!'));
    };

    const getEmbedCode = (url: string, name: string) =>
        `<iframe src="${url}" width="100%" height="600" frameborder="0" title="${name}" style="border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></iframe>`;

    const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        public: { color: '#10b981', icon: <GlobalOutlined />, label: 'Public' },
        restricted: { color: '#f59e0b', icon: <LockOutlined />, label: 'Restricted' },
        embed: { color: '#3b82f6', icon: <CodeOutlined />, label: 'Embed' },
    };

    const columns: ColumnsType<ShareLink> = [
        { title: 'Form', dataIndex: 'templateName', render: (v: string, rec) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 13 }}>{v}</Text>
                <Text type="secondary" copyable={{ text: rec.url }} style={{ fontSize: 10 }}>{rec.url.slice(0, 40)}...</Text>
            </Space>
        )},
        { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => {
            const cfg = typeConfig[v] || typeConfig.public;
            return <Tag icon={cfg.icon} color={cfg.color} style={{ borderRadius: 10 }}>{cfg.label}</Tag>;
        }},
        { title: 'Responses', dataIndex: 'responses', width: 100, render: (v: number, rec) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 13, color: '#3b82f6' }}>{v}</Text>
                {rec.maxResponses && <Text type="secondary" style={{ fontSize: 9 }}>/ {rec.maxResponses} max</Text>}
            </Space>
        )},
        { title: 'Security', key: 'security', width: 100, render: (_: any, rec) => (
            <Space direction="vertical" size={2}>
                {rec.password && <Tag icon={<LockOutlined />} style={{ fontSize: 9 }}>Password</Tag>}
                {rec.expiresAt && <Tag icon={<CalendarOutlined />} style={{ fontSize: 9 }}>Expires</Tag>}
                {!rec.password && !rec.expiresAt && <Tag style={{ fontSize: 9 }}>None</Tag>}
            </Space>
        )},
        { title: 'Active', dataIndex: 'active', width: 70, render: (v: boolean) => <Switch size="small" checked={v} /> },
        { title: 'Actions', key: 'actions', width: 150, render: (_: any, rec) => (
            <Space size={4}>
                <Tooltip title="Copy Link"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyLink(rec.url)} /></Tooltip>
                <Tooltip title="QR Code"><Button type="text" size="small" icon={<QrcodeOutlined />} onClick={() => setQrModal(rec.url)} /></Tooltip>
                <Tooltip title="Embed Code"><Button type="text" size="small" icon={<CodeOutlined />} onClick={() => setEmbedModal(rec.id)} /></Tooltip>
                <Tooltip title="Preview"><Button type="text" size="small" icon={<EyeOutlined />} /></Tooltip>
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Form Sharing</AuroraText>}
            subTitle={<DecryptedText text="Public links, embed codes, QR codes & sharing controls" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={load} />]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Published Forms', value: templates.length, color: '#10b981', icon: <FormOutlined /> },
                            { label: 'Share Links', value: shareLinks.length, color: '#3b82f6', icon: <LinkOutlined /> },
                            { label: 'Total Responses', value: shareLinks.reduce((a, l) => a + l.responses, 0), color: '#8b5cf6', icon: <BarChartOutlined /> },
                            { label: 'Active Links', value: shareLinks.filter(l => l.active).length, color: '#f59e0b', icon: <CheckCircleOutlined /> },
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

                    {/* Sharing Methods */}
                    <Card style={{ ...glass, marginBottom: 16 }}
                        title={<Space><ShareAltOutlined style={{ color: '#6366f1' }} /> Sharing Methods</Space>}>
                        <Row gutter={[16, 16]}>
                            {[
                                { title: 'Public Link', desc: 'Anyone with the link can fill the form — no login required', icon: <GlobalOutlined />, color: '#10b981' },
                                { title: 'Restricted Link', desc: 'Requires authentication or password to access the form', icon: <LockOutlined />, color: '#f59e0b' },
                                { title: 'Embed Code', desc: 'Embed forms on your website or intranet using iframe', icon: <CodeOutlined />, color: '#3b82f6' },
                                { title: 'QR Code', desc: 'Generate QR codes for print materials or physical locations', icon: <QrcodeOutlined />, color: '#8b5cf6' },
                                { title: 'Email Invite', desc: 'Send form links directly to specific respondents via email', icon: <MailOutlined />, color: '#ec4899' },
                                { title: 'Team Assignment', desc: 'Assign forms to specific teams or departments internally', icon: <TeamOutlined />, color: '#06b6d4' },
                            ].map((m, i) => (
                                <Col xs={24} sm={12} md={8} key={i}>
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                                        <Card size="small" hoverable style={{ borderRadius: 12, borderLeft: `3px solid ${m.color}` }}>
                                            <Space align="start">
                                                <span style={{ fontSize: 20, color: m.color }}>{m.icon}</span>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>{m.title}</Text>
                                                    <div><Text type="secondary" style={{ fontSize: 10 }}>{m.desc}</Text></div>
                                                </div>
                                            </Space>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {/* Links Table */}
                    <Card size="small" title={<Space><LinkOutlined style={{ color: '#3b82f6' }} /> Active Share Links <Badge count={shareLinks.length} size="small" /></Space>}
                        style={glass}>
                        {shareLinks.length > 0 ? (
                            <Table<ShareLink>
                                dataSource={shareLinks}
                                columns={columns}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 10 }}
                            />
                        ) : (
                            <Empty description="No published forms. Publish a form to generate share links." />
                        )}
                    </Card>
                </motion.div>
            )}

            {/* QR Code Modal */}
            <Modal title="QR Code" open={!!qrModal} onCancel={() => setQrModal(null)} footer={null} width={340}>
                <div style={{ textAlign: 'center', padding: 20 }}>
                    {qrModal && <QRCode value={qrModal} size={240} style={{ margin: '0 auto' }} />}
                    <div style={{ marginTop: 12 }}><Text type="secondary" style={{ fontSize: 11 }}>{qrModal}</Text></div>
                    <Button icon={<CopyOutlined />} style={{ marginTop: 8 }} onClick={() => { if (qrModal) copyLink(qrModal); }}>Copy Link</Button>
                </div>
            </Modal>

            {/* Embed Code Modal */}
            <Modal title="Embed Code" open={!!embedModal} onCancel={() => setEmbedModal(null)} footer={null} width={500}>
                {embedModal && (() => {
                    const link = shareLinks.find(l => l.id === embedModal);
                    if (!link) return null;
                    const code = getEmbedCode(link.url, link.templateName);
                    return (
                        <div style={{ padding: '8px 0' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Copy this code and paste it into your website HTML:</Text>
                            <Input.TextArea value={code} rows={4} style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11 }} readOnly />
                            <Button icon={<CopyOutlined />} style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(code); messageApi.success('Embed code copied!'); }}>
                                Copy Embed Code
                            </Button>
                            <Divider style={{ margin: '12px 0' }} />
                            <Text strong style={{ fontSize: 12 }}>Preview</Text>
                            <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#f8f9fa', border: '1px dashed #d1d5db' }}>
                                <div style={{ width: '100%', height: 80, borderRadius: 8, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 12 }}>{link.templateName}</Text>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </CMSLayout>
    );
}
