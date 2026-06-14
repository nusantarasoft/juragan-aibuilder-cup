"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Form, Input, Button, Switch, ColorPicker, Tabs, Upload, message, Divider, Tag, Space,
    Row, Col, Statistic, Select,
} from "antd";
import { motion } from "framer-motion";
import { SaveOutlined, UploadOutlined, ThunderboltOutlined, DatabaseOutlined, MailOutlined, ApiOutlined, AppstoreOutlined, InfoCircleOutlined } from "@ant-design/icons";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function graphqlRequest(query: string, variables?: Record<string, unknown>) {
    const res = await fetch(GRAPHQL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
}

export default function GeneralSettingsPage() {
    const { themeColor } = usePreferencesStore();
    const [form] = Form.useForm();
    const [dremioForm] = Form.useForm();
    const [dremioTestResult, setDremioTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [dremioTesting, setDremioTesting] = useState(false);
    const [dremioSaving, setDremioSaving] = useState(false);

    const handleSave = () => { form.validateFields().then(() => { message.success("Settings saved successfully"); }); };
    useEffect(() => { loadDremioSettings(); }, []);

    const loadDremioSettings = async () => { try { const keys = ['dremio.host', 'dremio.username', 'dremio.password']; const values: Record<string, string> = {}; for (const key of keys) { const data = await graphqlRequest(`query($key: String!) { settingByKey(key: $key) { value } }`, { key }); if (data.settingByKey?.value) { values[key.replace('dremio.', '')] = data.settingByKey.value; } } if (Object.keys(values).length > 0) dremioForm.setFieldsValue(values); } catch {} };
    const handleDremioSave = async () => { try { const values = await dremioForm.validateFields(); setDremioSaving(true); for (const s of [{ key: 'dremio.host', value: values.host || '' }, { key: 'dremio.username', value: values.username || '' }, { key: 'dremio.password', value: values.password || '' }]) { await graphqlRequest(`mutation($key: String!, $value: String!) { updateSettingByKey(key: $key, value: $value) { key value } }`, s); } message.success("Dremio settings saved"); } catch (err: any) { message.error("Failed: " + (err.message || "Unknown error")); } finally { setDremioSaving(false); } };
    const handleDremioTest = async () => { setDremioTesting(true); setDremioTestResult(null); try { const data = await graphqlRequest(`query { dremioTestConnection { success message } }`); setDremioTestResult(data.dremioTestConnection); if (data.dremioTestConnection.success) message.success(data.dremioTestConnection.message); else message.error(data.dremioTestConnection.message); } catch (err: any) { setDremioTestResult({ success: false, message: err.message }); message.error(err.message); } finally { setDremioTesting(false); } };

    const modules = ['CMS Pages','Documents','Media Library','CRM','Accounting','HR Management','E-Commerce','Project Management','ITSM','Ops Automation','AI Studio','Big Data','News & Intelligence','Notifications','Infrastructure'];
    const sysInfo = [
        { label: 'Platform', value: 'Nusantarasoft Enterprise Suite' }, { label: 'Version', value: 'v2.10.0' }, { label: 'Build', value: '2025.05.11' },
        { label: 'Framework', value: 'Next.js 14 + NestJS + Supabase' }, { label: 'Node.js', value: 'v20.x' }, { label: 'Database', value: 'PostgreSQL 15.8 (Supabase)' },
        { label: 'Big Data', value: 'Dremio 25.1 + Nessie + MinIO' }, { label: 'AI Engine', value: 'AI Studio RAG + Vertex/Gemini' },
        { label: 'Docker Services', value: '18 containers' }, { label: 'Total Pages', value: '145+ static routes' }, { label: 'License', value: 'Enterprise' },
    ];

    const items = [
        { key: "general", label: "General", children: (
            <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="siteName" label="Site Name" initialValue="Nusantarasoft"><Input /></Form.Item>
                <Form.Item name="siteDescription" label="Site Description" initialValue="Powered by Nusantarasoft CMS"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="siteLogo" label="Site Logo"><Upload listType="picture" maxCount={1} accept="image/*"><Button icon={<UploadOutlined />}>Upload Logo</Button></Upload></Form.Item>
                <Form.Item name="favicon" label="Favicon"><Upload listType="picture" maxCount={1} accept="image/*"><Button icon={<UploadOutlined />}>Upload Favicon</Button></Upload></Form.Item>
                <Divider />
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="timezone" label="Timezone" initialValue="Asia/Jakarta"><Select options={[{ label: 'Asia/Jakarta (WIB)', value: 'Asia/Jakarta' },{ label: 'Asia/Singapore', value: 'Asia/Singapore' },{ label: 'UTC', value: 'UTC' }]} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="locale" label="Locale" initialValue="en"><Select options={[{ label: 'English', value: 'en' },{ label: 'Bahasa Indonesia', value: 'id' }]} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="currency" label="Currency" initialValue="IDR"><Select options={[{ label: 'IDR', value: 'IDR' },{ label: 'USD', value: 'USD' },{ label: 'EUR', value: 'EUR' }]} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="dateFormat" label="Date Format" initialValue="DD/MM/YYYY"><Select options={[{ label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },{ label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }]} /></Form.Item></Col>
                </Row>
                <Divider />
                <Form.Item name="primaryColor" label="Primary Color" initialValue="#1677ff"><ColorPicker /></Form.Item>
                <Form.Item name="darkMode" label="Enable Dark Mode" valuePropName="checked"><Switch /></Form.Item>
            </Form>
        )},
        { key: "seo", label: "SEO", children: (
            <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="seoTitleTemplate" label="Title Template" initialValue="%s | Nusantarasoft"><Input /></Form.Item>
                <Form.Item name="defaultMetaDescription" label="Default Meta Description"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="googleAnalytics" label="Google Analytics ID"><Input placeholder="G-XXXXXXXXXX" /></Form.Item>
                <Form.Item name="robotsTxt" label="robots.txt"><Input.TextArea rows={5} style={{ fontFamily: "monospace" }} /></Form.Item>
            </Form>
        )},
        { key: "social", label: "Social Links", children: (
            <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="facebook" label="Facebook"><Input placeholder="https://facebook.com/yourpage" /></Form.Item>
                <Form.Item name="twitter" label="Twitter/X"><Input placeholder="https://twitter.com/yourhandle" /></Form.Item>
                <Form.Item name="instagram" label="Instagram"><Input placeholder="https://instagram.com/yourhandle" /></Form.Item>
                <Form.Item name="linkedin" label="LinkedIn"><Input placeholder="https://linkedin.com/company/yourcompany" /></Form.Item>
                <Form.Item name="youtube" label="YouTube"><Input placeholder="https://youtube.com/@yourchannel" /></Form.Item>
            </Form>
        )},
        { key: "email", label: <span><MailOutlined /> Email</span>, children: (
            <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="smtpHost" label="SMTP Host"><Input placeholder="smtp.gmail.com" /></Form.Item>
                <Row gutter={16}><Col span={16}><Form.Item name="smtpUser" label="Username"><Input /></Form.Item></Col><Col span={8}><Form.Item name="smtpPort" label="Port" initialValue={587}><Input type="number" /></Form.Item></Col></Row>
                <Form.Item name="smtpPassword" label="Password"><Input.Password /></Form.Item>
                <Row gutter={16}><Col span={12}><Form.Item name="senderName" label="Sender Name" initialValue="Nusantarasoft"><Input /></Form.Item></Col><Col span={12}><Form.Item name="senderEmail" label="Sender Email"><Input /></Form.Item></Col></Row>
                <Form.Item name="smtpTls" label="Use TLS" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
                <Divider /><Button icon={<ThunderboltOutlined />}>Send Test Email</Button>
            </Form>
        )},
        { key: "modules", label: <span><AppstoreOutlined /> Modules</span>, children: (
            <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {modules.map((mod, i) => (
                    <motion.div key={mod} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{mod}</span>
                            <Switch defaultChecked size="small" />
                        </div>
                    </motion.div>
                ))}
            </div>
        )},
        { key: "dremio", label: <span><DatabaseOutlined /> Dremio</span>, children: (
            <Form form={dremioForm} layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item name="host" label="Dremio URL" help="Internal Docker URL (default: http://dremio:9047)"><Input placeholder="http://dremio:9047" /></Form.Item>
                <Form.Item name="username" label="Username"><Input placeholder="admin" /></Form.Item>
                <Form.Item name="password" label="Password"><Input.Password /></Form.Item>
                <Divider />
                <Space>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleDremioSave} loading={dremioSaving}>Save Dremio Settings</Button>
                    <Button icon={<ThunderboltOutlined />} onClick={handleDremioTest} loading={dremioTesting}>Test Connection</Button>
                    {dremioTestResult && <Tag color={dremioTestResult.success ? "success" : "error"}>{dremioTestResult.message}</Tag>}
                </Space>
            </Form>
        )},
        { key: "system", label: <span><InfoCircleOutlined /> System</span>, children: (
            <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sysInfo.map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{item.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Settings</AuroraText>}
            subTitle={<DecryptedText text="Platform configuration, integrations & system information" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>Save Changes</Button>]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Config Sections', value: 7, icon: <SaveOutlined />, color: '#3b82f6' },
                    { title: 'Integrations', value: 2, icon: <DatabaseOutlined />, color: '#10b981' },
                    { title: 'Active Modules', value: 15, icon: <AppstoreOutlined />, color: '#8b5cf6' },
                    { title: 'Version', value: 'v2.10.0', icon: <InfoCircleOutlined />, color: '#f59e0b' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <Card><Tabs items={items} /></Card>
        </CMSLayout>
    );
}
