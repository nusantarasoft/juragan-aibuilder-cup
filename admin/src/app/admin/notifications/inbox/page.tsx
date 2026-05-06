"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { List, Button, Tag, Space, Card, Badge, message, Typography, Row, Col, Statistic, Empty, Tooltip } from "antd";
import { motion } from "framer-motion";
import {
    ReloadOutlined, CheckOutlined, CheckCircleOutlined, MailOutlined,
    BellOutlined, EyeOutlined, InboxOutlined, DeleteOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useAuthStore } from "@/store/useAuthStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const MODULE_ICONS: Record<string, string> = {
    crm: '💼', hr: '👥', ops: '⚙️', itsm: '🎫', inventory: '📦', accounting: '💰',
};

export default function InboxPage() {
    const { themeColor } = usePreferencesStore();
    const user = useAuthStore((s) => s.user);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await gql(`query($t: String!, $uid: String!) {
                notifications(tenantId: $t, userId: $uid) {
                    id title message module link icon isRead readAt createdAt
                }
            }`, { t: DEFAULT_TENANT_ID, uid: user.id });
            setNotifications(data.notifications || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    const handleMarkRead = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { markNotificationRead(id: $id) { id } }`, { id });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
        } catch (err: any) { message.error(err.message); }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        try {
            await gql(`mutation($t: String!, $uid: String!) { markAllNotificationsRead(tenantId: $t, userId: $uid) }`, { t: DEFAULT_TENANT_ID, uid: user.id });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            message.success("All marked as read");
        } catch (err: any) { message.error(err.message); }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Inbox</AuroraText>}
            subTitle={<DecryptedText text="Your notifications from across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadNotifications} />,
                <Button key="markAll" icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>Mark All Read</Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: notifications.length, icon: <InboxOutlined />, color: '#3b82f6' },
                    { title: 'Unread', value: unreadCount, icon: <BellOutlined />, color: '#ef4444' },
                    { title: 'Read', value: notifications.length - unreadCount, icon: <EyeOutlined />, color: '#22c55e' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Card>
                <List
                    loading={loading}
                    dataSource={notifications}
                    locale={{ emptyText: <Empty description="No notifications yet" /> }}
                    renderItem={(n: any) => (
                        <List.Item
                            style={{ background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)', borderRadius: 8, padding: '12px 16px', marginBottom: 4 }}
                            actions={[
                                !n.isRead && <Button key="read" type="text" size="small" icon={<CheckCircleOutlined />} onClick={() => handleMarkRead(n.id)}>Read</Button>,
                            ].filter(Boolean)}
                        >
                            <List.Item.Meta
                                avatar={<span style={{ fontSize: 20 }}>{MODULE_ICONS[n.module] || '🔔'}</span>}
                                title={
                                    <Space>
                                        {!n.isRead && <Badge dot color="#3b82f6" />}
                                        <Text strong={!n.isRead}>{n.title}</Text>
                                        {n.module && <Tag style={{ fontSize: 10 }}>{n.module}</Tag>}
                                    </Space>
                                }
                                description={
                                    <Space direction="vertical" size={0}>
                                        {n.message && <Text type="secondary" style={{ fontSize: 12 }}>{n.message}</Text>}
                                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(n.createdAt).fromNow()}</Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </CMSLayout>
    );
}
