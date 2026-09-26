"use client";

import React from "react";
import { Row, Col, Typography, Tag, Badge, Divider, Space } from "antd";
import {
    AppstoreOutlined, ArrowRightOutlined, AlertOutlined,
    FileTextOutlined, BugOutlined, SyncOutlined,
} from "@ant-design/icons";
import { DASH_CARD, DASH_COLORS } from "./DashboardStyles";

const { Text } = Typography;

interface Props {
    itsm: any;
    itsmMod: any;
    cmdbCount: number;
    eventsOpen: number;
    eventsCrit: number;
    releasesActive: number;
    depsCompleted: number;
    depsTotal: number;
    loading: boolean;
    themeColor: string;
    onNavigate?: () => void;
}

export const ITSMModulesCard: React.FC<Props> = ({
    itsm, itsmMod, cmdbCount, eventsOpen, eventsCrit, releasesActive,
    depsCompleted, depsTotal, loading, themeColor, onNavigate,
}) => {
    const modules = [
        { label: 'Incidents', value: itsm?.totalOpen || 0, total: itsm?.totalTickets || 0, color: themeColor, icon: <AlertOutlined /> },
        { label: 'Requests', value: itsmMod?.serviceRequests?.open || 0, total: itsmMod?.serviceRequests?.total || 0, color: '#3b82f6', icon: <FileTextOutlined /> },
        { label: 'Problems', value: itsmMod?.problems?.open || 0, total: itsmMod?.problems?.total || 0, color: '#f59e0b', icon: <BugOutlined /> },
        { label: 'Changes', value: itsmMod?.changes?.open || 0, total: itsmMod?.changes?.total || 0, color: '#10b981', icon: <SyncOutlined /> },
    ];

    const bottomStats = [
        { label: 'CMDB', value: cmdbCount, color: themeColor },
        { label: 'Events', value: eventsOpen, color: eventsCrit > 0 ? DASH_COLORS.red : DASH_COLORS.green },
        { label: 'Releases', value: releasesActive, color: '#9254de' },
        { label: 'Deploys', value: `${depsCompleted}/${depsTotal}`, color: DASH_COLORS.blue },
    ];

    return (
        <div
            className="dash-card-new"
            style={{
                background: DASH_COLORS.surface,
                border: DASH_CARD.border,
                borderRadius: DASH_CARD.borderRadius,
                padding: DASH_CARD.padding,
                height: '100%',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AppstoreOutlined style={{ color: themeColor, fontSize: 15 }} />
                    <Text strong style={{ fontSize: 14, color: DASH_COLORS.textPrimary }}>ITSM Modules</Text>
                </div>
                {onNavigate && (
                    <a onClick={onNavigate} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary, fontSize: 14 }}>
                        <ArrowRightOutlined />
                    </a>
                )}
            </div>

            {/* Module List */}
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                {modules.map(m => (
                    <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                        <Space size={8}>
                            <span style={{ color: m.color, fontSize: 13 }}>{m.icon}</span>
                            <Text style={{ fontSize: 13 }}>{m.label}</Text>
                        </Space>
                        <Space size={6}>
                            <Tag
                                color={m.value > 0 ? 'orange' : 'green'}
                                style={{ fontSize: 11, borderRadius: 8, margin: 0, lineHeight: '18px', padding: '0 8px' }}
                            >
                                {loading ? '-' : m.value} open
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11 }}>/ {loading ? '-' : m.total}</Text>
                        </Space>
                    </div>
                ))}
            </Space>

            <Divider style={{ margin: '10px 0' }} />

            {/* Bottom Stats */}
            <Row gutter={8} style={{ textAlign: 'center' }}>
                {bottomStats.map(s => (
                    <Col span={6} key={s.label}>
                        <Badge color={s.color} />
                        <div style={{ fontSize: 10, color: DASH_COLORS.textSecondary, marginTop: 2 }}>{s.label}</div>
                        <Text strong style={{ fontSize: 13, color: typeof s.value === 'number' && s.label === 'Events' && eventsCrit > 0 ? DASH_COLORS.red : DASH_COLORS.textPrimary }}>
                            {loading ? '-' : s.value}
                        </Text>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default ITSMModulesCard;
