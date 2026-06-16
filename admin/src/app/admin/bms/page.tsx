"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Badge, Space, Typography, Table, Progress, Button } from "antd";
import { 
    HomeOutlined, FireOutlined, ThunderboltOutlined, ExperimentOutlined, 
    DashboardOutlined, SwapOutlined, BulbOutlined, KeyOutlined, AlertOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import dynamic from 'next/dynamic';

const Bms3dView = dynamic(() => import('./Bms3dView'), { ssr: false });
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";
import { bmsService, BmsSystem, BmsAlarm } from "@/lib/bmsService";

const { Title, Text } = Typography;

const dashAnimStyle = `
@keyframes bmsFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.bms-card { animation: bmsFadeUp 0.5s ease both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.bms-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
`;

export default function BmsDashboard() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [realSystems, setRealSystems] = useState<BmsSystem[]>([]);
    const [realAlarms, setRealAlarms] = useState<BmsAlarm[]>([]);
    const [viewMode, setViewMode] = useState<'dashboard' | '3d'>('dashboard');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch real data from NestJS backend (falls back to demo data if empty/fails)
                const systems = await bmsService.getSystems();
                if (systems && systems.length > 0) setRealSystems(systems);
                
                const alarmsData = await bmsService.getAlarms();
                if (alarmsData && alarmsData.length > 0) setRealAlarms(alarmsData);
            } catch (err) {
                console.warn("Backend not available, using demo data for BMS Dashboard.");
            }
        };
        fetchData();
    }, []);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Demo Data
    const indoorEnvData = Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        temp: 21 + Math.random() * 3,
        humidity: 45 + Math.random() * 10,
        co2: 400 + Math.random() * 100 + (i > 8 && i < 18 ? 200 : 0) // Spikes during work hours
    }));

    const energyData = [
        { name: 'HVAC', val: 55, color: '#1890ff' },
        { name: 'Lighting', val: 20, color: '#faad14' },
        { name: 'Plugs', val: 15, color: '#52c41a' },
        { name: 'Other', val: 10, color: isDark ? '#555' : '#ccc' },
    ];

    const alarms = [
        { id: 1, time: '10:23 AM', system: 'HVAC', msg: 'Chiller 2 Low Flow Warning', status: 'Active', sev: 'Warning' },
        { id: 2, time: '09:45 AM', system: 'Fire', msg: 'Detector Zone 3 Fault', status: 'Active', sev: 'Critical' },
        { id: 3, time: '08:15 AM', system: 'Access', msg: 'Door Forced Open - Server Rm 2', status: 'Acknowledged', sev: 'Critical' },
    ];

    const systems = [
        { icon: <DashboardOutlined />, name: 'HVAC', status: 'Optimal', color: '#52c41a', stats: '22°C Avg Temp' },
        { icon: <BulbOutlined />, name: 'Lighting', status: 'Auto', color: '#1890ff', stats: '42% Active' },
        { icon: <FireOutlined />, name: 'Fire Safety', status: 'Armed', color: '#52c41a', stats: 'All Zones Clear' },
        { icon: <KeyOutlined />, name: 'Access', status: 'Secured', color: '#52c41a', stats: '128 Entries Today' },
        { icon: <ExperimentOutlined />, name: 'Water', status: 'Normal', color: '#1890ff', stats: 'Main Tank: 88%' },
        { icon: <SwapOutlined />, name: 'Elevators', status: 'Warning', color: '#faad14', stats: 'Car 2 Maintenance' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>BMS Command Center</AuroraText>}
            subTitle={<DecryptedText text="Facility Building Operations" speed={60} />}
        >
            <style>{dashAnimStyle}</style>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button 
                    type={viewMode === '3d' ? 'primary' : 'default'} 
                    icon={<HomeOutlined />} 
                    onClick={() => setViewMode(viewMode === '3d' ? 'dashboard' : '3d')}
                >
                    {viewMode === '3d' ? 'Back to Dashboard' : 'Open 3D Digital Twin'}
                </Button>
            </div>
            
            {viewMode === '3d' ? (
                <Bms3dView isDark={isDark} />
            ) : (
                <React.Fragment>

            {/* KPI ROW (BENTO GRID) */}
            <BentoGrid className="mb-6">
                <BentoGridItem
                    title="Building Health"
                    description="Overall health score across all subsystems."
                    icon={<HomeOutlined />}
                    header={
                        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}>
                            <AnimatedCircularProgressBar
                                max={100}
                                min={0}
                                value={94}
                                gaugePrimaryColor="#52c41a"
                                gaugeSecondaryColor="rgba(82,196,26,0.1)"
                                className="w-[80px] h-[80px]"
                            />
                            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>Health Score</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Energy Usage"
                    description="1,420 kWh consumed today."
                    icon={<ThunderboltOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Active Alarms"
                    description="3 critical issues require attention."
                    icon={<AlertOutlined />}
                    header={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.9 }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#ff4d4f" }}>3</div>
                            <div style={{ fontSize: 10, color: isDark ? '#888' : '#666' }}>Active</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Occupancy"
                    description="482 pax currently in the building."
                    icon={<KeyOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
            </BentoGrid>

            {/* CHARTS ROW */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card title="Indoor Air Quality & Environment" className="bms-card" style={glassStyle} bordered={false}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={indoorEnvData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#faad14" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#faad14" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={[15, 30]} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#1890ff" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                                        <Area yAxisId="right" type="monotone" dataKey="co2" name="CO2 (ppm)" stroke="#faad14" strokeWidth={2} fillOpacity={1} fill="url(#colorCo2)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card title="Energy Distribution" className="bms-card" style={glassStyle} bordered={false}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={energyData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip cursor={{fill: isDark ? '#333' : '#f5f5f5'}} contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Bar dataKey="val" name="% of Total Load" radius={[0, 4, 4, 0]}>
                                            {energyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* BOTTOM ROW */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <Card title="System Overviews" className="bms-card" style={glassStyle} bordered={false}>
                            <Row gutter={[16, 16]}>
                                {systems.map((sys, i) => (
                                    <Col span={12} key={i}>
                                        <div style={{ padding: 12, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#eee'}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ fontSize: 24, color: sys.color }}>{sys.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                        {sys.name}
                                                        <Badge status={sys.status === 'Warning' ? 'warning' : 'success'} />
                                                    </div>
                                                    <div style={{ fontSize: 12, color: sys.color }}>{sys.status}</div>
                                                    <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginTop: 4 }}>{sys.stats}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
                
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Card title="Active BMS Alarms" className="bms-card" style={glassStyle} bordered={false} extra={<Button type="link">Acknowledge All</Button>}>
                            <Table 
                                dataSource={alarms} 
                                pagination={false} 
                                rowKey="id"
                                size="small"
                                columns={[
                                    { title: 'Time', dataIndex: 'time', width: 90 },
                                    { title: 'System', dataIndex: 'system', width: 80 },
                                    { title: 'Severity', dataIndex: 'sev', width: 90, render: (t) => <Badge status={t === 'Critical' ? 'error' : 'warning'} text={t} /> },
                                    { title: 'Message', dataIndex: 'msg' },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
                </React.Fragment>
            )}
        </CMSLayout>
    );
}
