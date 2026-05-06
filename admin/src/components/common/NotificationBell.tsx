"use client";

import React, { useEffect, useState, useRef } from "react";
import { Badge, Popover, List, Button, Space, Typography, Tag, Empty, Divider, Tooltip } from "antd";
import {
    BellOutlined, CheckOutlined, CheckCircleOutlined,
    MailOutlined, ToolOutlined, BugOutlined, ShoppingOutlined,
    DollarOutlined, TeamOutlined, SettingOutlined, RocketOutlined,
    SoundOutlined,
} from "@ant-design/icons";
import { useNotificationStore } from "@/store/useNotificationStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;

const MODULE_ICONS: Record<string, React.ReactNode> = {
    ops: <RocketOutlined style={{ color: '#8b5cf6' }} />,
    notifications: <BellOutlined style={{ color: '#3b82f6' }} />,
    permissions: <SettingOutlined style={{ color: '#f59e0b' }} />,
    itsm: <BugOutlined style={{ color: '#ef4444' }} />,
    crm: <MailOutlined style={{ color: '#06b6d4' }} />,
    hr: <TeamOutlined style={{ color: '#22c55e' }} />,
    ecommerce: <ShoppingOutlined style={{ color: '#ec4899' }} />,
    accounting: <DollarOutlined style={{ color: '#6366f1' }} />,
    system: <ToolOutlined style={{ color: '#94a3b8' }} />,
};

/** Attempt to play a short notification chime via Web Audio API */
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch { /* Web Audio not available */ }
}

/** Request and show a browser desktop notification */
function showDesktopNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'ns-notification',
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead, startPolling } = useNotificationStore();
    const [open, setOpen] = useState(false);
    const [pulse, setPulse] = useState(false);
    const prevUnreadRef = useRef(unreadCount);

    useEffect(() => {
        const stop = startPolling();
        // Request browser notification permission on mount
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        return stop;
    }, [startPolling]);

    // Detect new unread notifications
    useEffect(() => {
        if (unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            // New notification arrived!
            setPulse(true);
            playNotificationSound();

            // Show desktop notification for the newest unread
            const newest = notifications.find((n: any) => !n.isRead);
            if (newest) {
                showDesktopNotification(
                    newest.title || 'New Notification',
                    newest.message || ''
                );
            }

            const timer = setTimeout(() => setPulse(false), 2000);
            return () => clearTimeout(timer);
        }
        prevUnreadRef.current = unreadCount;
    }, [unreadCount, notifications]);

    const handleClick = (notif: any) => {
        if (!notif.isRead) {
            markRead(notif.id);
        }
        if (notif.link) {
            window.location.href = notif.link;
        }
    };

    const content = (
        <div style={{ width: 360, maxHeight: 440, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px' }}>
                <Text strong style={{ fontSize: 14 }}>Notifications</Text>
                {unreadCount > 0 && (
                    <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllRead}>
                        Mark all read
                    </Button>
                )}
            </div>
            <Divider style={{ margin: '0 0 8px' }} />
            {notifications.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" style={{ padding: 20 }} />
            ) : (
                <List
                    size="small"
                    dataSource={notifications.slice(0, 20)}
                    renderItem={(notif: any) => (
                        <List.Item
                            onClick={() => handleClick(notif)}
                            style={{
                                cursor: 'pointer',
                                background: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginBottom: 2,
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)')}
                        >
                            <List.Item.Meta
                                avatar={
                                    <div style={{ position: 'relative' }}>
                                        {notif.icon ? (
                                            <span style={{ fontSize: 20 }}>{notif.icon}</span>
                                        ) : (
                                            MODULE_ICONS[notif.module] || <BellOutlined style={{ fontSize: 18 }} />
                                        )}
                                        {!notif.isRead && (
                                            <div style={{
                                                position: 'absolute', top: -2, right: -2,
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: '#3b82f6',
                                            }} />
                                        )}
                                    </div>
                                }
                                title={
                                    <Text strong={!notif.isRead} style={{ fontSize: 13 }}>
                                        {notif.title}
                                    </Text>
                                }
                                description={
                                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                        {notif.message && (
                                            <Text type="secondary" style={{ fontSize: 11, lineHeight: '16px' }} ellipsis={{ tooltip: notif.message }}>
                                                {notif.message}
                                            </Text>
                                        )}
                                        <Space size={4} style={{ marginTop: 2 }}>
                                            {notif.module && (
                                                <Tag style={{ fontSize: 10, margin: 0 }}>{notif.module}</Tag>
                                            )}
                                            <Text type="secondary" style={{ fontSize: 10 }}>
                                                {dayjs(notif.createdAt).fromNow()}
                                            </Text>
                                        </Space>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
            {notifications.length > 0 && (
                <>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ textAlign: 'center', paddingBottom: 4 }}>
                        <Button type="link" size="small" href="/admin/notifications/inbox">
                            View all notifications
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            placement="bottomRight"
            open={open}
            onOpenChange={setOpen}
            arrow={{ pointAtCenter: true }}
        >
            <Tooltip title="Notifications">
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                    <Button
                        type="text"
                        icon={<BellOutlined style={{ fontSize: 18 }} />}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: pulse ? 'bellPulse 0.3s ease-in-out 3' : undefined,
                        }}
                    />
                </Badge>
            </Tooltip>
            <style jsx global>{`
                @keyframes bellPulse {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(12deg); }
                    75% { transform: rotate(-12deg); }
                }
            `}</style>
        </Popover>
    );
}
