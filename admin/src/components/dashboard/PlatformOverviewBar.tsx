"use client";

import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Typography } from "antd";
import {
    DatabaseOutlined, AppstoreOutlined, ApiOutlined, ExperimentOutlined,
} from "@ant-design/icons";
import { DASH_COLORS, DASH_CARD } from "./DashboardStyles";

const { Text } = Typography;

interface PlatformCounts {
    tables: number;
    modules: number;
    resolvers: number;
    extensions: number;
}

interface Props {
    counts: PlatformCounts;
    loading: boolean;
}

const stats = [
    { key: 'tables', label: 'Total Tables', sub: 'PostgreSQL schema objects', color: DASH_COLORS.green, icon: <DatabaseOutlined />, field: 'tables' as const },
    { key: 'modules', label: 'Active Modules', sub: 'Enterprise feature Modules', color: DASH_COLORS.blue, icon: <AppstoreOutlined />, field: 'modules' as const },
    { key: 'resolvers', label: 'GraphQL Resolvers', sub: 'API query endpoints', color: DASH_COLORS.purple, icon: <ApiOutlined />, field: 'resolvers' as const },
    { key: 'extensions', label: 'DB Extensions', sub: 'PostgreSQL extensions', color: DASH_COLORS.amber, icon: <ExperimentOutlined />, field: 'extensions' as const },
];

export const PlatformOverviewBar: React.FC<Props> = ({ counts, loading }) => (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {stats.map((s, i) => (
            <Col key={s.key} xs={12} md={6}>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35 }}>
                    <div
                        className="dash-card-new"
                        style={{
                            background: '#fff',
                            border: DASH_CARD.border,
                            borderRadius: DASH_CARD.borderRadius,
                            padding: '14px 16px',
                            position: 'relative',
                            overflow: 'hidden',
                            animationDelay: `${i * 60}ms`,
                        }}
                    >
                        {/* Top accent line */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}66)`, borderRadius: `${DASH_CARD.borderRadius}px ${DASH_CARD.borderRadius}px 0 0` }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${s.color}12`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 17, color: s.color, flexShrink: 0,
                            }}>
                                {s.icon}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: '14px' }}>{s.label}</Text>
                                <Text strong style={{ fontSize: 20, color: s.color, lineHeight: '26px' }}>
                                    {loading ? '—' : counts[s.field]}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block', lineHeight: '14px' }}>{s.sub}</Text>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </Col>
        ))}
    </Row>
);

export default PlatformOverviewBar;
