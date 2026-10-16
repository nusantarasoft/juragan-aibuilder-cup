"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Badge, Space, Typography, Table, Button, Alert, Empty, message, Tag } from "antd";
import { 
    HomeOutlined, FireOutlined, ThunderboltOutlined, ExperimentOutlined, 
    DashboardOutlined, BulbOutlined, KeyOutlined, AlertOutlined, ReloadOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { useRouter } from "next/navigation";
import { bmsService, BmsSystem, BmsAlarm } from "@/lib/bmsService";
import { bmsHasLiveFacilityData, bmsShouldShowSampleBanner } from "@/lib/bmsDashboardView";

const { Text } = Typography;

const dashAnimStyle = `
@keyframes bmsFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.bms-card { animation: bmsFadeUp 0.5s ease both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.bms-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
`;

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
    hvac: <DashboardOutlined />,
    lighting: <BulbOutlined />,
    fire: <FireOutlined />,
    access: <KeyOutlined />,
    water: <ExperimentOutlined />,
};

function formatAlarmTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
}

export default function BmsDashboard() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();

    const [realSystems, setRealSystems] = useState<BmsSystem[]>([]);
    const [realAlarms, setRealAlarms] = useState<BmsAlarm[]>([]);
    const [liveDataLoaded, setLiveDataLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const hasLiveData = bmsHasLiveFacilityData(realSystems, realAlarms);
    const usingSampleData = bmsShouldShowSampleBanner(liveDataLoaded, realSystems, realAlarms);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [systems, alarmsData] = await Promise.all([
                bmsService.getSystems(),
                bmsService.getAlarms(),
            ]);
            setRealSystems(systems ?? []);
            setRealAlarms(alarmsData ?? []);
        } catch (err) {
            console.warn("BMS API unavailable:", err);
            setRealSystems([]);
            setRealAlarms([]);
        } finally {
            setLiveDataLoaded(true);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const activeAlarmCount = realAlarms.filter((a) => a.status === 'active' || a.status === 'unacknowledged').length;

    return (
        <CMSLayout 
            title={<AuroraText>BMS Command Center</AuroraText>}
            subTitle={<DecryptedText text="Facility Building Operations" speed={60} />}
            extra={[
                <Button key="refresh" icon={<ReloadOutlined />} loading={refreshing} onClick={() => void fetchData()} title="Refresh live BMS data">
                    Refresh
                </Button>,
                <Button key="3d" type="primary" onClick={() => router.push('/admin/bms/3d')}>
                    Open 3D Digital Twin
                </Button>,
            ]}
        >
            <style>{dashAnimStyle}</style>

            {hasLiveData && (
                <Alert
                    type="success"
                    showIcon
                    message="Live facility data"
                    description="Systems and alarms below are loaded from the middleware BMS API for this tenant."
                    style={{ marginBottom: 16 }}
                />
            )}

            {usingSampleData && (
                <Alert
                    type="info"
                    showIcon
                    message="Sample facility data"
                    description="No BMS systems or alarms returned for this tenant yet. Connect integrations or seed tenant data — charts stay empty until telemetry is available."
                    style={{ marginBottom: 16 }}
                />
            )}

            <div style={{ position: 'relative' }}>
            {/* KPI ROW (BENTO GRID) */}
            <BentoGrid className="mb-6">
                <BentoGridItem
                    title="Registered Systems"
                    description={hasLiveData ? `${realSystems.length} live subsystem(s)` : 'Awaiting BMS integration'}
                    icon={<HomeOutlined />}
                    header={
                        hasLiveData ? (
                            <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.9 }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: themeColor }}>{realSystems.length}</div>
                            </div>
                        ) : undefined
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Energy Usage"
                    description={hasLiveData ? 'Open Energy module for meter data' : 'No live meter feed on this dashboard'}
                    icon={<ThunderboltOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Active Alarms"
                    description={hasLiveData ? `${activeAlarmCount} open alarm(s)` : 'No alarm events'}
                    icon={<AlertOutlined />}
                    header={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.9 }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: activeAlarmCount ? "#ff4d4f" : (isDark ? '#888' : '#666') }}>{activeAlarmCount}</div>
                            <div style={{ fontSize: 10, color: isDark ? '#888' : '#666' }}>Active</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Occupancy"
                    description="Zone occupancy available under HVAC / zones"
                    icon={<KeyOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
            </BentoGrid>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card title="Indoor Air Quality & Environment" className="bms-card" style={glassStyle} bordered={false}>
                            {hasLiveData ? (
                                <Empty description="Telemetry charts will appear when BMS point history is wired to this view." />
                            ) : (
                                <Empty description="Connect BMS telemetry to view environment trends." />
                            )}
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card title="Energy Distribution" className="bms-card" style={glassStyle} bordered={false}>
                            <Empty description="Energy breakdown requires live meter readings." />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <Card title="System Overviews" className="bms-card" style={glassStyle} bordered={false}>
                            {realSystems.length === 0 ? (
                                <Empty description="No BMS systems registered" />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {realSystems.map((sys) => (
                                        <Col span={12} key={sys.id}>
                                            <div style={{ padding: 12, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#eee'}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ fontSize: 24, color: themeColor }}>{SYSTEM_ICONS[sys.systemType?.toLowerCase()] ?? <DashboardOutlined />}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                            {sys.name}
                                                            <Badge status={sys.status === 'warning' ? 'warning' : 'success'} />
                                                        </div>
                                                        <div style={{ fontSize: 12, color: themeColor }}>{sys.systemType}</div>
                                                        <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginTop: 4 }}>{sys.status ?? 'unknown'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </Card>
                    </motion.div>
                </Col>
                
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Card
                            title="Active BMS Alarms"
                            className="bms-card"
                            style={glassStyle}
                            bordered={false}
                            extra={
                                <Button
                                    type="link"
                                    disabled={realAlarms.length === 0}
                                    onClick={() => message.info('Bulk acknowledge will be available when alarm ack mutations are enabled.')}
                                >
                                    Acknowledge All
                                </Button>
                            }
                        >
                            {realAlarms.length === 0 ? (
                                <Empty description="No alarm events for this tenant" />
                            ) : (
                                <Table 
                                    dataSource={realAlarms.map((a) => ({ ...a, key: a.id }))} 
                                    pagination={false} 
                                    size="small"
                                    columns={[
                                        { title: 'Time', dataIndex: 'createdAt', width: 90, render: (t: string) => formatAlarmTime(t) },
                                        { title: 'Severity', dataIndex: 'severity', width: 90, render: (t: string) => <Tag color={t === 'critical' ? 'red' : 'orange'}>{t}</Tag> },
                                        { title: 'Status', dataIndex: 'status', width: 90 },
                                        { title: 'Message', dataIndex: 'message', ellipsis: true },
                                    ]}
                                />
                            )}
                        </Card>
                    </motion.div>
                </Col>
            </Row>
            </div>
        </CMSLayout>
    );
}
