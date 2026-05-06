"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Switch, Space, Typography, Divider, Badge,
    Button, message, Tag, Alert, List,
} from "antd";
import { motion } from "framer-motion";
import {
    BellOutlined, MailOutlined, SendOutlined, ApiOutlined,
    SoundOutlined, DesktopOutlined, ClockCircleOutlined,
    SaveOutlined, RocketOutlined, BugOutlined, DollarOutlined,
    ShoppingOutlined, TeamOutlined, SettingOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { useNotificationStore } from "@/store/useNotificationStore";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ChannelPref {
    key: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    enabled: boolean;
    description: string;
}

interface ModulePref {
    key: string;
    label: string;
    icon: React.ReactNode;
    enabled: boolean;
}

interface BrowserPref {
    key: string;
    label: string;
    icon: React.ReactNode;
    enabled: boolean;
    description: string;
}

export default function NotificationPreferencesPage() {
    const { themeColor } = usePreferencesStore();
    const { realtimeActive } = useNotificationStore();

    // Channel preferences
    const [channels, setChannels] = useState<ChannelPref[]>([
        { key: 'in_app', label: 'In-App Notifications', icon: <BellOutlined style={{ color: '#8b5cf6' }} />, color: '#8b5cf6', enabled: true, description: 'Bell icon alerts in the admin panel' },
        { key: 'email', label: 'Email Notifications', icon: <MailOutlined style={{ color: '#3b82f6' }} />, color: '#3b82f6', enabled: true, description: 'Receive notifications via email' },
        { key: 'whatsapp', label: 'WhatsApp Messages', icon: <SendOutlined style={{ color: '#22c55e' }} />, color: '#22c55e', enabled: false, description: 'Receive alerts via WhatsApp' },
        { key: 'webhook', label: 'Webhook Integrations', icon: <ApiOutlined style={{ color: '#f59e0b' }} />, color: '#f59e0b', enabled: false, description: 'Push notifications to external services' },
    ]);

    // Module preferences
    const [modules, setModules] = useState<ModulePref[]>([
        { key: 'ops', label: 'Operations', icon: <RocketOutlined style={{ color: '#8b5cf6' }} />, enabled: true },
        { key: 'itsm', label: 'ITSM / Ticketing', icon: <BugOutlined style={{ color: '#ef4444' }} />, enabled: true },
        { key: 'crm', label: 'CRM', icon: <MailOutlined style={{ color: '#06b6d4' }} />, enabled: true },
        { key: 'hr', label: 'HR & People', icon: <TeamOutlined style={{ color: '#22c55e' }} />, enabled: true },
        { key: 'ecommerce', label: 'Commerce & Sales', icon: <ShoppingOutlined style={{ color: '#ec4899' }} />, enabled: false },
        { key: 'accounting', label: 'Accounting & Finance', icon: <DollarOutlined style={{ color: '#6366f1' }} />, enabled: true },
        { key: 'system', label: 'System Alerts', icon: <SettingOutlined style={{ color: '#94a3b8' }} />, enabled: true },
    ]);

    // Browser preferences
    const [browser, setBrowser] = useState<BrowserPref[]>([
        { key: 'desktop', label: 'Desktop Notifications', icon: <DesktopOutlined style={{ color: '#3b82f6' }} />, enabled: true, description: 'Show browser push notifications for new alerts' },
        { key: 'sound', label: 'Notification Sound', icon: <SoundOutlined style={{ color: '#22c55e' }} />, enabled: true, description: 'Play a chime when new notifications arrive' },
    ]);

    const [notifPermission, setNotifPermission] = useState<string>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
        }
    }, []);

    const toggleChannel = (key: string) => {
        setChannels(prev => prev.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c));
    };

    const toggleModule = (key: string) => {
        setModules(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
    };

    const toggleBrowser = (key: string) => {
        if (key === 'desktop' && notifPermission !== 'granted') {
            Notification.requestPermission().then(p => {
                setNotifPermission(p);
                if (p === 'granted') {
                    setBrowser(prev => prev.map(b => b.key === key ? { ...b, enabled: true } : b));
                }
            });
            return;
        }
        setBrowser(prev => prev.map(b => b.key === key ? { ...b, enabled: !b.enabled } : b));
    };

    const handleSave = () => {
        // Store preferences in localStorage for now
        const prefs = {
            channels: Object.fromEntries(channels.map(c => [c.key, c.enabled])),
            modules: Object.fromEntries(modules.map(m => [m.key, m.enabled])),
            browser: Object.fromEntries(browser.map(b => [b.key, b.enabled])),
        };
        localStorage.setItem('notification_preferences', JSON.stringify(prefs));
        message.success('Notification preferences saved');
    };

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('notification_preferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                if (prefs.channels) {
                    setChannels(prev => prev.map(c => ({ ...c, enabled: prefs.channels[c.key] ?? c.enabled })));
                }
                if (prefs.modules) {
                    setModules(prev => prev.map(m => ({ ...m, enabled: prefs.modules[m.key] ?? m.enabled })));
                }
                if (prefs.browser) {
                    setBrowser(prev => prev.map(b => ({ ...b, enabled: prefs.browser[b.key] ?? b.enabled })));
                }
            } catch { /* ignore malformed */ }
        }
    }, []);

    const enabledChannelCount = channels.filter(c => c.enabled).length;
    const enabledModuleCount = modules.filter(m => m.enabled).length;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Notification Preferences</AuroraText>}
            subTitle={<DecryptedText text="Configure how and when you receive notifications" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                    Save Preferences
                </Button>,
            ]}
        >
            {/* Realtime Status */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Alert
                    type={realtimeActive ? 'success' : 'info'}
                    message={
                        <Space>
                            {realtimeActive ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <ClockCircleOutlined style={{ color: '#3b82f6' }} />}
                            <Text strong style={{ fontSize: 13 }}>
                                {realtimeActive
                                    ? 'Supabase Realtime Connected — notifications are pushed instantly'
                                    : 'Using 30-second polling — Realtime connection pending'}
                            </Text>
                            <Badge status={realtimeActive ? 'success' : 'processing'} text={realtimeActive ? 'WebSocket Active' : 'Polling'} />
                        </Space>
                    }
                    showIcon={false}
                    style={{ marginBottom: 16, borderRadius: 12, borderLeft: `4px solid ${realtimeActive ? '#22c55e' : '#3b82f6'}` }}
                />
            </motion.div>

            <Row gutter={[16, 16]}>
                {/* Channel Preferences */}
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Card
                            title={<Space><BellOutlined /> Delivery Channels <Tag color="blue">{enabledChannelCount} active</Tag></Space>}
                            size="small"
                            style={glass}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                {channels.map((ch) => (
                                    <div key={ch.key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 14px', borderRadius: 10,
                                        background: ch.enabled ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                                        border: `1px solid ${ch.enabled ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.06)'}`,
                                        transition: 'all 0.2s',
                                    }}>
                                        <Space size={12}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10,
                                                background: `${ch.color}15`, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {ch.icon}
                                            </div>
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{ch.label}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 11 }}>{ch.description}</Text>
                                            </div>
                                        </Space>
                                        <Switch checked={ch.enabled} onChange={() => toggleChannel(ch.key)} />
                                    </div>
                                ))}
                            </Space>
                        </Card>
                    </motion.div>
                </Col>

                {/* Browser Preferences */}
                <Col xs={24} md={12}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <Card
                            title={<Space><DesktopOutlined /> Browser Alerts</Space>}
                            size="small"
                            style={glass}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                {browser.map((b) => (
                                    <div key={b.key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 14px', borderRadius: 10,
                                        background: b.enabled ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                                        border: `1px solid ${b.enabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0,0,0,0.06)'}`,
                                        transition: 'all 0.2s',
                                    }}>
                                        <Space size={12}>
                                            {b.icon}
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{b.label}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 11 }}>{b.description}</Text>
                                            </div>
                                        </Space>
                                        <Space>
                                            {b.key === 'desktop' && notifPermission !== 'granted' && (
                                                <Tag color="orange" style={{ fontSize: 10 }}>Permission needed</Tag>
                                            )}
                                            <Switch checked={b.enabled && (b.key !== 'desktop' || notifPermission === 'granted')} onChange={() => toggleBrowser(b.key)} />
                                        </Space>
                                    </div>
                                ))}
                            </Space>

                            <Divider style={{ margin: '16px 0 12px' }} />

                            {/* Connection Status */}
                            <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.04)' }}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Realtime Connection</Text>
                                        <Badge status={realtimeActive ? 'success' : 'default'} text={
                                            <Text style={{ fontSize: 11, color: realtimeActive ? '#22c55e' : '#94a3b8' }}>
                                                {realtimeActive ? 'Connected' : 'Disconnected'}
                                            </Text>
                                        } />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Browser Notifications</Text>
                                        <Badge status={notifPermission === 'granted' ? 'success' : notifPermission === 'denied' ? 'error' : 'warning'} text={
                                            <Text style={{ fontSize: 11, color: notifPermission === 'granted' ? '#22c55e' : notifPermission === 'denied' ? '#ef4444' : '#f59e0b' }}>
                                                {notifPermission === 'granted' ? 'Granted' : notifPermission === 'denied' ? 'Blocked' : 'Not Set'}
                                            </Text>
                                        } />
                                    </div>
                                </Space>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Module Subscriptions */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card
                            title={<Space><SettingOutlined /> Module Subscriptions <Tag color="purple">{enabledModuleCount} active</Tag></Space>}
                            size="small"
                            style={glass}
                        >
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                                Choose which modules can send you notifications. Disabled modules will be muted.
                            </Text>
                            <Row gutter={[12, 12]}>
                                {modules.map((mod) => (
                                    <Col key={mod.key} xs={12} sm={8} md={6}>
                                        <div
                                            onClick={() => toggleModule(mod.key)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '14px 16px',
                                                borderRadius: 10,
                                                textAlign: 'center',
                                                background: mod.enabled ? 'rgba(99, 102, 241, 0.06)' : 'rgba(0,0,0,0.02)',
                                                border: `1.5px solid ${mod.enabled ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.06)'}`,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{ fontSize: 22, marginBottom: 4 }}>{mod.icon}</div>
                                            <Text strong style={{ fontSize: 12 }}>{mod.label}</Text>
                                            <div style={{ marginTop: 6 }}>
                                                <Switch size="small" checked={mod.enabled} />
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
