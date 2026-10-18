"use client";

import React from "react";
import { Row, Col, Statistic, Progress, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { DASH_CARD, DASH_COLORS } from "./DashboardStyles";

const { Text } = Typography;

interface Props {
    itsm: any;
    itsmMod: any;
    loading: boolean;
}

export const SLAQualityCard: React.FC<Props> = ({ itsm, itsmMod, loading }) => {
    const sla = itsm?.slaCompliance || 0;
    const strokeColor = sla >= 90 ? '#10b981' : sla >= 70 ? '#f59e0b' : '#ef4444';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircleOutlined style={{ color: DASH_COLORS.primary, fontSize: 15 }} />
                <Text strong style={{ fontSize: 14, color: DASH_COLORS.textPrimary }}>SLA & Quality</Text>
            </div>

            {/* Donut Chart */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 12px' }}>
                <Progress
                    type="dashboard"
                    percent={sla}
                    size={130}
                    strokeColor={strokeColor}
                    trailColor="rgba(148,163,184,0.16)"
                    format={(p) => (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: strokeColor }}>{p}%</div>
                            <div style={{ fontSize: 11, color: DASH_COLORS.textSecondary }}>SLA</div>
                        </div>
                    )}
                />
            </div>

            {/* Bottom Stats */}
            <Row gutter={8} style={{ textAlign: 'center' }}>
                <Col span={8}>
                    <Statistic
                        title={<span style={{ fontSize: 11, color: DASH_COLORS.textSecondary }}>Avg Resolution</span>}
                        value={loading ? '-' : `${itsm?.avgResolutionHours || 0} h`}
                        valueStyle={{ fontSize: 15, fontWeight: 600, color: DASH_COLORS.textPrimary }}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title={<span style={{ fontSize: 11, color: DASH_COLORS.textSecondary }}>Unassigned</span>}
                        value={loading ? '-' : itsm?.totalUnassigned || 0}
                        valueStyle={{ fontSize: 15, fontWeight: 600, color: (itsm?.totalUnassigned || 0) > 0 ? DASH_COLORS.amber : DASH_COLORS.green }}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title={<span style={{ fontSize: 11, color: DASH_COLORS.textSecondary }}>Knowledge</span>}
                        value={loading ? '-' : `${itsmMod?.knowledge?.published || 0}/${itsmMod?.knowledge?.total || 0}`}
                        valueStyle={{ fontSize: 15, fontWeight: 600, color: DASH_COLORS.textPrimary }}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default SLAQualityCard;
