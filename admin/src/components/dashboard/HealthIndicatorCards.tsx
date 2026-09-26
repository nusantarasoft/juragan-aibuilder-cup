"use client";

import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Typography, Tag, Progress } from "antd";
import {
    CustomerServiceOutlined, SolutionOutlined, FieldTimeOutlined, TeamOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { DASH_COLORS, DASH_CARD } from "./DashboardStyles";

const { Text } = Typography;

const fmtCurrency = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

interface Props {
    itsm: any;
    crm: any;
    avgAvail: number;
    eventsCrit: number;
    agentsActive: number;
    agentsUtil: number;
    loading: boolean;
    themeColor: string;
}

export const HealthIndicatorCards: React.FC<Props> = ({ itsm, crm, avgAvail, eventsCrit, agentsActive, agentsUtil, loading, themeColor }) => {
    const cards = [
        {
            key: 'incidents',
            icon: <CustomerServiceOutlined />,
            title: 'Open Incidents',
            gradient: DASH_COLORS.incidentGreen,
            iconColor: '#059669',
            value: itsm?.totalOpen || 0,
            suffix: <Text type="secondary" style={{ fontSize: 13 }}>/{itsm?.totalTickets || 0}</Text>,
            valueColor: (itsm?.totalOpen || 0) > 10 ? DASH_COLORS.red : '#059669',
            extra: itsm?.totalSlaBreach > 0 ? <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 6, borderRadius: 8 }}>{itsm.totalSlaBreach} SLA Breach</Tag> : null,
        },
        {
            key: 'pipeline',
            icon: <SolutionOutlined />,
            title: 'CRM Pipeline',
            gradient: DASH_COLORS.pipelinePurple,
            iconColor: '#7c3aed',
            value: `Rp ${fmtCurrency(crm?.pipelineValue || 0)}`,
            valueColor: '#7c3aed',
            extra: <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{crm?.openDeals || 0} open deals · {crm?.totalAccounts || 0} accounts</Text>,
        },
        {
            key: 'availability',
            icon: <FieldTimeOutlined />,
            title: 'Availability',
            gradient: DASH_COLORS.availBlue,
            iconColor: '#0284c7',
            value: avgAvail ? `${avgAvail}` : '-',
            suffix: <Text type="secondary" style={{ fontSize: 14 }}>%</Text>,
            valueColor: avgAvail >= 99.9 ? '#059669' : '#0284c7',
            extra: <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{eventsCrit > 0 ? <Text type="danger">{eventsCrit} critical events</Text> : 'All systems nominal'}</Text>,
        },
        {
            key: 'workforce',
            icon: <TeamOutlined />,
            title: 'Workforce',
            gradient: DASH_COLORS.workforcePeach,
            iconColor: '#d97706',
            value: agentsActive,
            suffix: <Text type="secondary" style={{ fontSize: 13 }}> active</Text>,
            valueColor: '#d97706',
            extra: <Progress percent={agentsUtil} size="small" strokeColor="#d97706" style={{ marginTop: 6 }} format={() => `${agentsUtil}% utilized`} />,
        },
    ];

    return (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {cards.map((c, i) => (
                <Col key={c.key} xs={24} sm={12} md={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}>
                        <div
                            className="dash-card-new"
                            style={{
                                background: c.gradient,
                                border: DASH_CARD.border,
                                borderRadius: DASH_CARD.borderRadius,
                                padding: DASH_CARD.padding,
                                height: '100%',
                                animationDelay: `${100 + i * 70}ms`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 16, color: c.iconColor }}>{c.icon}</span>
                                <Text style={{ fontSize: 13, color: DASH_COLORS.textSecondary, fontWeight: 500 }}>{c.title}</Text>
                            </div>
                            <div className="dash-stat-lg">
                                <Text strong style={{ fontSize: 28, color: c.valueColor, lineHeight: '34px' }}>
                                    {loading ? '—' : c.value}
                                </Text>
                                {c.suffix && <span style={{ marginLeft: 4 }}>{c.suffix}</span>}
                            </div>
                            {c.extra}
                        </div>
                    </motion.div>
                </Col>
            ))}
        </Row>
    );
};

export default HealthIndicatorCards;
