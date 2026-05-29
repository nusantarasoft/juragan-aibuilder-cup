"use client";
import React, { useState } from "react";
import { Card, Button, Space, Tag, Input, Select, message, Typography, Row, Col, Switch, InputNumber, Slider, Divider, Tabs, Form, ColorPicker, Collapse, Badge } from "antd";
import {
    SettingOutlined, SaveOutlined, BgColorsOutlined, MailOutlined,
    BellOutlined, SafetyOutlined, DatabaseOutlined, FormOutlined,
    TrophyOutlined, StarOutlined, ThunderboltOutlined, FileTextOutlined,
    CheckCircleOutlined, GlobalOutlined, LockOutlined, TeamOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function FormSettingsPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, contextHolder] = message.useMessage();

    // ── Scoring Config ──
    const [maxScore, setMaxScore] = useState(5);
    const [passingScore, setPassingScore] = useState(60);
    const [gradingEnabled, setGradingEnabled] = useState(true);
    const [grades, setGrades] = useState([
        { label: 'Excellent', min: 4.5, max: 5.0, color: '#10b981' },
        { label: 'Good', min: 3.5, max: 4.49, color: '#3b82f6' },
        { label: 'Satisfactory', min: 2.5, max: 3.49, color: '#f59e0b' },
        { label: 'Needs Improvement', min: 0, max: 2.49, color: '#ef4444' },
    ]);

    // ── Notification Config ──
    const [notifyOnSubmit, setNotifyOnSubmit] = useState(true);
    const [notifyOnApprove, setNotifyOnApprove] = useState(true);
    const [notifyOnReject, setNotifyOnReject] = useState(true);
    const [reminderDays, setReminderDays] = useState(3);
    const [autoReminder, setAutoReminder] = useState(true);

    // ── Security Config ──
    const [requireAuth, setRequireAuth] = useState(true);
    const [allowAnonymous, setAllowAnonymous] = useState(false);
    const [onePerUser, setOnePerUser] = useState(true);
    const [allowEdit, setAllowEdit] = useState(true);
    const [ipRestriction, setIpRestriction] = useState(false);

    // ── Branding Config ──
    const [primaryColor, setPrimaryColor] = useState(themeColor);
    const [formFont, setFormFont] = useState('Inter');
    const [showLogo, setShowLogo] = useState(true);
    const [showProgress, setShowProgress] = useState(true);
    const [thankYouMessage, setThankYouMessage] = useState('Thank you for your response!');

    // ── Default Categories ──
    const [categories] = useState([
        { key: 'kpi', label: 'KPI Evaluation', color: '#8b5cf6', icon: <TrophyOutlined /> },
        { key: 'survey', label: 'Survey', color: '#3b82f6', icon: <FileTextOutlined /> },
        { key: 'assessment', label: 'Assessment', color: '#10b981', icon: <StarOutlined /> },
        { key: 'feedback', label: 'Feedback', color: '#f59e0b', icon: <BellOutlined /> },
        { key: 'audit', label: 'Audit', color: '#ef4444', icon: <SafetyOutlined /> },
        { key: 'checklist', label: 'Checklist', color: '#06b6d4', icon: <CheckCircleOutlined /> },
        { key: 'custom', label: 'Custom', color: '#6b7280', icon: <FormOutlined /> },
    ]);

    const handleSave = () => {
        messageApi.success('Settings saved successfully!');
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#6366f1', '#ec4899']}>Form Settings</AuroraText>}
            subTitle={<DecryptedText text="Configure global form behavior & branding" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[<Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave} style={{ background: themeColor, borderColor: themeColor }}>Save Settings</Button>]}
        >
            {contextHolder}
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <Tabs defaultActiveKey="scoring" items={[
                    {
                        key: 'scoring',
                        label: <Space><TrophyOutlined /> Scoring & Grading</Space>,
                        children: (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><SettingOutlined style={{ color: '#8b5cf6' }} /> Scoring Defaults</Space>}
                                            style={{ ...glass, height: '100%' }}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Maximum Score</Text>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                                        <Slider value={maxScore} onChange={setMaxScore} min={1} max={10} style={{ flex: 1 }} />
                                                        <InputNumber value={maxScore} onChange={v => setMaxScore(v || 5)} min={1} max={10} style={{ width: 70 }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Passing Score (%)</Text>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                                        <Slider value={passingScore} onChange={setPassingScore} min={0} max={100} style={{ flex: 1 }}
                                                            marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
                                                        <InputNumber value={passingScore} onChange={v => setPassingScore(v || 60)} min={0} max={100} style={{ width: 70 }} suffix="%" />
                                                    </div>
                                                </div>
                                                <Divider />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Auto-calculate scores on submit</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Automatically run scoring engine when form is submitted</Text></div>
                                                    </div>
                                                    <Switch defaultChecked />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Weighted scoring</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Use field weights for KPI dimension calculations</Text></div>
                                                    </div>
                                                    <Switch defaultChecked />
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><StarOutlined style={{ color: '#f59e0b' }} /> Grading Scale</Space>}
                                            style={{ ...glass, height: '100%' }}
                                            extra={<Switch checked={gradingEnabled} onChange={setGradingEnabled} size="small" />}>
                                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                {grades.map((g, i) => (
                                                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                                            borderRadius: 10, border: '1px solid #f0f0f0',
                                                            background: `${g.color}08`,
                                                        }}>
                                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                                                            <Input value={g.label} size="small" style={{ flex: 1, borderRadius: 6 }}
                                                                onChange={e => { const ng = [...grades]; ng[i].label = e.target.value; setGrades(ng); }} />
                                                            <InputNumber value={g.min} size="small" style={{ width: 60 }} step={0.5}
                                                                onChange={v => { const ng = [...grades]; ng[i].min = v || 0; setGrades(ng); }} />
                                                            <Text type="secondary">—</Text>
                                                            <InputNumber value={g.max} size="small" style={{ width: 60 }} step={0.5}
                                                                onChange={v => { const ng = [...grades]; ng[i].max = v || 0; setGrades(ng); }} />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </Space>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        ),
                    },
                    {
                        key: 'notifications',
                        label: <Space><BellOutlined /> Notifications</Space>,
                        children: (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><MailOutlined style={{ color: '#3b82f6' }} /> Email Notifications</Space>}
                                            style={{ ...glass, height: '100%' }}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                {[
                                                    { label: 'On submission', desc: 'Notify admin when form is submitted', checked: notifyOnSubmit, onChange: setNotifyOnSubmit },
                                                    { label: 'On approval', desc: 'Notify submitter when approved', checked: notifyOnApprove, onChange: setNotifyOnApprove },
                                                    { label: 'On rejection', desc: 'Notify submitter when rejected', checked: notifyOnReject, onChange: setNotifyOnReject },
                                                ].map((n, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <Text strong style={{ fontSize: 12 }}>{n.label}</Text>
                                                            <div><Text type="secondary" style={{ fontSize: 11 }}>{n.desc}</Text></div>
                                                        </div>
                                                        <Switch checked={n.checked} onChange={n.onChange} />
                                                    </div>
                                                ))}
                                            </Space>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Reminders</Space>}
                                            style={{ ...glass, height: '100%' }}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Auto reminders</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Send automatic reminders for pending assignments</Text></div>
                                                    </div>
                                                    <Switch checked={autoReminder} onChange={setAutoReminder} />
                                                </div>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Reminder interval (days before due date)</Text>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                                        <Slider value={reminderDays} onChange={setReminderDays} min={1} max={14} style={{ flex: 1 }}
                                                            marks={{ 1: '1d', 7: '7d', 14: '14d' }} disabled={!autoReminder} />
                                                        <InputNumber value={reminderDays} onChange={v => setReminderDays(v || 3)} min={1} max={14}
                                                            style={{ width: 70 }} disabled={!autoReminder} suffix="d" />
                                                    </div>
                                                </div>
                                                <Divider />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Overdue escalation</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Escalate to manager when form is overdue</Text></div>
                                                    </div>
                                                    <Switch defaultChecked={false} />
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        ),
                    },
                    {
                        key: 'security',
                        label: <Space><LockOutlined /> Security</Space>,
                        children: (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card title={<Space><SafetyOutlined style={{ color: '#ef4444' }} /> Access Control</Space>}
                                    style={{ ...glass }}>
                                    <Row gutter={[32, 16]}>
                                        <Col xs={24} md={12}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                {[
                                                    { label: 'Require authentication', desc: 'Only logged-in users can submit forms', checked: requireAuth, onChange: setRequireAuth, icon: <LockOutlined /> },
                                                    { label: 'Allow anonymous submissions', desc: 'Let unauthenticated users fill forms', checked: allowAnonymous, onChange: setAllowAnonymous, icon: <GlobalOutlined /> },
                                                    { label: 'One submission per user', desc: 'Prevent duplicate submissions', checked: onePerUser, onChange: setOnePerUser, icon: <TeamOutlined /> },
                                                ].map((s, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Space size={8}>
                                                            <span style={{ color: '#6b7280' }}>{s.icon}</span>
                                                            <div>
                                                                <Text strong style={{ fontSize: 12 }}>{s.label}</Text>
                                                                <div><Text type="secondary" style={{ fontSize: 11 }}>{s.desc}</Text></div>
                                                            </div>
                                                        </Space>
                                                        <Switch checked={s.checked} onChange={s.onChange} />
                                                    </div>
                                                ))}
                                            </Space>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                {[
                                                    { label: 'Allow editing after submit', desc: 'Submitters can update their response', checked: allowEdit, onChange: setAllowEdit, icon: <FormOutlined /> },
                                                    { label: 'IP-based restriction', desc: 'Restrict form access by IP range', checked: ipRestriction, onChange: setIpRestriction, icon: <SafetyOutlined /> },
                                                ].map((s, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Space size={8}>
                                                            <span style={{ color: '#6b7280' }}>{s.icon}</span>
                                                            <div>
                                                                <Text strong style={{ fontSize: 12 }}>{s.label}</Text>
                                                                <div><Text type="secondary" style={{ fontSize: 11 }}>{s.desc}</Text></div>
                                                            </div>
                                                        </Space>
                                                        <Switch checked={s.checked} onChange={s.onChange} />
                                                    </div>
                                                ))}
                                                <Divider />
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Data retention (days)</Text>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                                        <Slider defaultValue={365} min={30} max={730} style={{ flex: 1 }}
                                                            marks={{ 30: '30d', 365: '1yr', 730: '2yr' }} />
                                                    </div>
                                                </div>
                                            </Space>
                                        </Col>
                                    </Row>
                                </Card>
                            </motion.div>
                        ),
                    },
                    {
                        key: 'branding',
                        label: <Space><BgColorsOutlined /> Branding</Space>,
                        children: (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><BgColorsOutlined style={{ color: '#ec4899' }} /> Appearance</Space>}
                                            style={{ ...glass, height: '100%' }}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Primary Color</Text>
                                                    <div style={{ marginTop: 6 }}>
                                                        <ColorPicker value={primaryColor} onChange={(_, hex) => setPrimaryColor(hex)} showText />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Font Family</Text>
                                                    <Select value={formFont} onChange={setFormFont} style={{ width: '100%', marginTop: 6 }}
                                                        options={[
                                                            { value: 'Inter', label: 'Inter' },
                                                            { value: 'Roboto', label: 'Roboto' },
                                                            { value: 'Outfit', label: 'Outfit' },
                                                            { value: 'Poppins', label: 'Poppins' },
                                                            { value: 'system-ui', label: 'System Default' },
                                                        ]} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Show company logo</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Display logo at top of forms</Text></div>
                                                    </div>
                                                    <Switch checked={showLogo} onChange={setShowLogo} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>Show progress bar</Text>
                                                        <div><Text type="secondary" style={{ fontSize: 11 }}>Display completion progress in forms</Text></div>
                                                    </div>
                                                    <Switch checked={showProgress} onChange={setShowProgress} />
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Card title={<Space><FileTextOutlined style={{ color: '#3b82f6' }} /> Messages</Space>}
                                            style={{ ...glass, height: '100%' }}>
                                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Thank you message</Text>
                                                    <Input.TextArea value={thankYouMessage} onChange={e => setThankYouMessage(e.target.value)}
                                                        rows={3} style={{ marginTop: 6, borderRadius: 8 }} />
                                                </div>
                                                <Divider />
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>Preview</Text>
                                                    <Card size="small" style={{ marginTop: 6, borderRadius: 10, background: `${primaryColor}08`, borderColor: `${primaryColor}30` }}>
                                                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                                            <CheckCircleOutlined style={{ fontSize: 36, color: primaryColor, marginBottom: 8 }} />
                                                            <Title level={5} style={{ margin: 0, color: primaryColor }}>Success!</Title>
                                                            <Text type="secondary">{thankYouMessage}</Text>
                                                        </div>
                                                    </Card>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                </Row>
                            </motion.div>
                        ),
                    },
                    {
                        key: 'categories',
                        label: <Space><DatabaseOutlined /> Categories</Space>,
                        children: (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card title={<Space><DatabaseOutlined style={{ color: '#6366f1' }} /> Form Categories</Space>}
                                    style={glass}>
                                    <Row gutter={[16, 16]}>
                                        {categories.map((cat, i) => (
                                            <Col xs={24} sm={12} md={8} key={cat.key}>
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                                    <Card size="small" hoverable style={{
                                                        borderRadius: 12, borderTop: `3px solid ${cat.color}`,
                                                        background: `linear-gradient(135deg, ${cat.color}05, rgba(255,255,255,0.8))`,
                                                    }}>
                                                        <Space>
                                                            <span style={{ fontSize: 20, color: cat.color }}>{cat.icon}</span>
                                                            <div>
                                                                <Text strong>{cat.label}</Text>
                                                                <div><Tag color={cat.color} style={{ fontSize: 10 }}>{cat.key}</Tag></div>
                                                            </div>
                                                        </Space>
                                                    </Card>
                                                </motion.div>
                                            </Col>
                                        ))}
                                    </Row>
                                </Card>
                            </motion.div>
                        ),
                    },
                ]} />
            </div>
        </CMSLayout>
    );
}
