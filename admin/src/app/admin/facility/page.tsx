'use client';

import React from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { useWebSocketStore } from '@/store/useWebSocketStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { FacilityCopilot } from '@/components/facility/FacilityCopilot';
import { Row, Col, Card, Statistic, Badge, theme, Progress, List, Typography, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DashboardOutlined, SafetyCertificateOutlined, AppstoreOutlined, FireOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;

export default function FacilityCommandCenter() {
    const { isConnected, telemetryData, activeAlarms } = useWebSocketStore();
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const pue = telemetryData?.pue || 1.35;
    const powerKw = telemetryData?.totalPowerKw || 2450;

    return (
        <CMSLayout
            title={<AuroraText>Global Command Center</AuroraText>}
            subTitle={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DecryptedText text="Unified Facility Intelligence" speed={60} />
                    <Badge status={isConnected ? 'success' : 'error'} text={isConnected ? 'LIVE' : 'OFFLINE'} />
                </div>
            }
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Top KPIs */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic 
                                title={<><DashboardOutlined /> Total Power Load</>}
                                value={powerKw}
                                precision={1}
                                suffix="kW"
                                valueStyle={{ color: themeColor }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic 
                                title={<><FireOutlined /> Facility PUE</>}
                                value={pue}
                                precision={2}
                                valueStyle={{ color: pue > 1.5 ? '#ff4d4f' : '#52c41a' }}
                                prefix={pue > 1.5 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic 
                                title={<><SafetyCertificateOutlined /> Active Alarms (All Modules)</>}
                                value={activeAlarms}
                                valueStyle={{ color: activeAlarms > 0 ? '#ff4d4f' : '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic 
                                title={<><AppstoreOutlined /> Connectivity</>}
                                value={isConnected ? '100%' : '0%'}
                                valueStyle={{ color: isConnected ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <Card title="Live Telemetry Feed (SCADA & DCIM)" style={{ ...glassStyle, minHeight: 400 }} bordered={false}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text>Chiller Plant Capacity</Text>
                                        <Text strong>82%</Text>
                                    </div>
                                    <Progress percent={82} strokeColor="#1890ff" />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text>Data Hall A - UPS Load</Text>
                                        <Text strong>65%</Text>
                                    </div>
                                    <Progress percent={65} strokeColor="#52c41a" />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text>Generator Fuel Level</Text>
                                        <Text strong>95%</Text>
                                    </div>
                                    <Progress percent={95} strokeColor="#faad14" />
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                        <Card title="Unified Alarm Feed" style={{ ...glassStyle, minHeight: 400 }} bordered={false}>
                            <List
                                itemLayout="horizontal"
                                dataSource={[
                                    { title: 'Server Room 2 Temp High', module: 'DCIM', time: '2 mins ago', type: 'error' },
                                    { title: 'AHU-1 Filter Pressure', module: 'BMS', time: '15 mins ago', type: 'warning' },
                                    { title: 'Modbus Gateway Disconnected', module: 'SCADA', time: '1 hour ago', type: 'error' },
                                    { title: 'Door 4 Forced Open', module: 'BMS', time: '2 hours ago', type: 'error' },
                                ]}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Badge status={item.type as any} />}
                                            title={<Text strong>{item.title}</Text>}
                                            description={<Space><Badge count={item.module} style={{ backgroundColor: '#1890ff' }} /> <Text type="secondary">{item.time}</Text></Space>}
                                        />
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                </Row>
            </motion.div>
            
            {/* AI Copilot Widget */}
            <FacilityCopilot />
        </CMSLayout>
    );
}
