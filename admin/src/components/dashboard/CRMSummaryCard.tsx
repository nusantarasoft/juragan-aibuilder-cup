"use client";

import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Statistic, Typography } from "antd";
import { SolutionOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { DASH_CARD, DASH_COLORS } from "./DashboardStyles";

const { Text } = Typography;

const fmtCurrency = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

interface Props {
    crm: any;
    loading: boolean;
    onNavigate?: () => void;
}

export const CRMSummaryCard: React.FC<Props> = ({ crm, loading, onNavigate }) => (
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
                <SolutionOutlined style={{ color: DASH_COLORS.blue, fontSize: 15 }} />
                <Text strong style={{ fontSize: 14, color: DASH_COLORS.textPrimary }}>CRM Summary</Text>
            </div>
            {onNavigate && (
                <a onClick={onNavigate} style={{ cursor: 'pointer', color: DASH_COLORS.textSecondary, fontSize: 14 }}>
                    <ArrowRightOutlined />
                </a>
            )}
        </div>

        {/* Stats Grid */}
        <Row gutter={[8, 14]}>
            {[
                { title: 'Leads', value: crm?.totalIndividuals || 0, color: '#3b82f6' },
                { title: 'Contacts', value: crm?.totalContacts || 0, color: '#06b6d4' },
                { title: 'Won Revenue', value: fmtCurrency(crm?.wonValue || 0), prefix: 'Rp', color: '#10b981' },
                { title: 'Quotes', value: crm?.totalQuotes || 0, suffix: crm?.acceptedQuotes ? `${crm.acceptedQuotes} accepted` : undefined, color: DASH_COLORS.textPrimary },
                { title: 'Campaigns', value: `${crm?.activeCampaigns || 0}/${crm?.totalCampaigns || 0}`, color: DASH_COLORS.purple },
                { title: 'Cases', value: `${crm?.openCases || 0}/${crm?.totalCases || 0}`, color: (crm?.criticalCases || 0) > 0 ? DASH_COLORS.red : DASH_COLORS.blue },
            ].map((s, i) => (
                <Col span={12} key={s.title}>
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04 }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{s.title}</Text>
                            <Text strong style={{ fontSize: 18, color: s.color, lineHeight: '22px' }}>
                                {loading ? '—' : (s.prefix ? `${s.prefix} ` : '')}{loading ? '' : s.value}
                            </Text>
                            {s.suffix && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{s.suffix}</Text>}
                        </div>
                    </motion.div>
                </Col>
            ))}
        </Row>
    </div>
);

export default CRMSummaryCard;
