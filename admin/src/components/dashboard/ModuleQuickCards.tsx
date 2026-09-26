"use client";

import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Statistic, Typography, Tag, Space, Divider } from "antd";
import {
    ClusterOutlined, ThunderboltOutlined, RocketOutlined,
    TeamOutlined, SafetyOutlined, CloudUploadOutlined,
} from "@ant-design/icons";
import { DASH_CARD, DASH_COLORS } from "./DashboardStyles";

const { Text } = Typography;

interface Props {
    cmdbCount: number;
    eventsOpen: number;
    eventsCrit: number;
    releasesActive: number;
    agentsActive: number;
    agentsUtil: number;
    plansActive: number;
    depsCompleted: number;
    depsTotal: number;
    loading: boolean;
    themeColor: string;
    onNavigate: (path: string) => void;
}

export const ModuleQuickCards: React.FC<Props> = ({
    cmdbCount, eventsOpen, eventsCrit, releasesActive, agentsActive, agentsUtil,
    plansActive, depsCompleted, depsTotal, loading, themeColor, onNavigate,
}) => {
    const cards = [
        { title: 'CMDB', icon: <ClusterOutlined />, color: themeColor, value: cmdbCount, suffix: 'CIs', href: '/admin/itsm/cmdb' },
        { title: 'Events', icon: <ThunderboltOutlined />, color: eventsCrit > 0 ? DASH_COLORS.red : DASH_COLORS.green, value: eventsOpen, suffix: 'open', href: '/admin/itsm/events' },
        { title: 'Releases', icon: <RocketOutlined />, color: '#9254de', value: releasesActive, suffix: 'active', href: '/admin/itsm/releases' },
        { title: 'Agents', icon: <TeamOutlined />, color: DASH_COLORS.teal, value: agentsActive, suffix: `· ${agentsUtil}%`, href: '/admin/itsm/agents' },
        { title: 'Continuity', icon: <SafetyOutlined />, color: DASH_COLORS.red, value: plansActive, suffix: 'plans', href: '/admin/itsm/continuity' },
        { title: 'Deployments', icon: <CloudUploadOutlined />, color: DASH_COLORS.blue, value: depsCompleted, suffix: `/ ${depsTotal}`, href: '/admin/itsm/deployments' },
    ];

    return (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {cards.map((c, i) => (
                <Col key={c.title} xs={12} sm={8} md={4}>
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.04 }}>
                        <div
                            className="dash-card-new"
                            onClick={() => onNavigate(c.href)}
                            style={{
                                background: DASH_COLORS.surface,
                                border: DASH_CARD.border,
                                borderRadius: DASH_CARD.borderRadius,
                                borderTop: `3px solid ${c.color}`,
                                padding: '14px 12px',
                                cursor: 'pointer',
                                height: '100%',
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}55)` }} />
                            <Space style={{ marginBottom: 6 }}>
                                <span style={{ fontSize: 16, color: c.color }}>{c.icon}</span>
                                <Text strong style={{ fontSize: 12, color: DASH_COLORS.textPrimary }}>{c.title}</Text>
                            </Space>
                            <div className="dash-stat-lg">
                                <Statistic
                                    value={loading ? '-' : c.value}
                                    suffix={c.suffix}
                                    valueStyle={{ fontSize: 20, fontWeight: 700 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </Col>
            ))}
        </Row>
    );
};

export default ModuleQuickCards;
