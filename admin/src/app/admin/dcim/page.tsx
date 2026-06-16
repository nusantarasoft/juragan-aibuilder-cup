"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Badge, Space, Typography, Table, Progress, Button } from "antd";
import { 
    CloudServerOutlined, ThunderboltOutlined, ArrowUpOutlined, 
    FireOutlined, DashboardOutlined, ToolOutlined, NodeIndexOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";
import { dcimService } from "@/lib/dcimService";

const { Title, Text } = Typography;

const dashAnimStyle = `
@keyframes dcimFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.dcim-card { animation: dcimFadeUp 0.5s ease both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.dcim-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
`;

export default function DcimDashboard() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [realRacks, setRealRacks] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch real data from NestJS backend (falls back to demo data if empty/fails)
                const res: any = await dcimService.getRacks('00000000-0000-0000-0000-000000000010');
                if (res && res.getRacks && res.getRacks.length > 0) {
                    setRealRacks(res.getRacks);
                }
            } catch (err) {
                console.warn("Backend not available, using demo data for DCIM Dashboard.");
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
    const powerData = Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        kw: 400 + Math.random() * 100 + (i > 8 && i < 18 ? 150 : 0)
    }));

    const capacityData = [
        { name: 'Used Space', value: 78, color: themeColor },
        { name: 'Available Space', value: 22, color: isDark ? '#333' : '#e0e0e0' },
    ];

    const powerCapacityData = [
        { name: 'Used Power', value: 65, color: '#ff4d4f' },
        { name: 'Available Power', value: 35, color: isDark ? '#333' : '#e0e0e0' },
    ];

    const hotRacks = [
        { rack: 'A12', temp: 31, utilization: 95 },
        { rack: 'B04', temp: 29, utilization: 88 },
        { rack: 'C01', temp: 28, utilization: 82 },
        { rack: 'A08', temp: 27, utilization: 75 },
        { rack: 'D15', temp: 26, utilization: 70 },
    ];

    const alerts = [
        { id: 1, time: '10:23 AM', type: 'Critical', msg: 'CRAC Unit 3 Failure in Server Hall A', status: 'Active' },
        { id: 2, time: '09:45 AM', type: 'Warning', msg: 'Rack A12 temperature exceeded 30°C', status: 'Active' },
        { id: 3, time: '08:15 AM', type: 'Info', msg: 'Scheduled generator test started', status: 'In Progress' },
        { id: 4, time: '06:30 AM', type: 'Warning', msg: 'UPS-A load exceeded 80%', status: 'Active' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>DCIM Overview</AuroraText>}
            subTitle={<DecryptedText text="Facility Health & Operations" speed={60} />}
        >
            <style>{dashAnimStyle}</style>
            
            {/* KPI ROW (BENTO GRID) */}
            <BentoGrid className="mb-6">
                <BentoGridItem
                    title="PUE Metrics"
                    description="Current Power Usage Effectiveness."
                    icon={<ThunderboltOutlined />}
                    header={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.9 }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#52c41a" }}>1.42</div>
                            <div style={{ fontSize: 10, color: isDark ? '#888' : '#666' }}>Target: 1.30</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Active Devices"
                    description="1,248 servers running optimally."
                    icon={<CloudServerOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Total Power"
                    description="542 kW current facility load."
                    icon={<DashboardOutlined />}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Uptime SLA"
                    description="Five Nines availability maintained."
                    icon={<ArrowUpOutlined />}
                    header={
                        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}>
                            <AnimatedCircularProgressBar
                                max={100}
                                min={0}
                                value={99}
                                gaugePrimaryColor="#1890ff"
                                gaugeSecondaryColor="rgba(24,144,255,0.1)"
                                className="w-[80px] h-[80px]"
                            />
                            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>99.999%</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
            </BentoGrid>

            {/* CHARTS ROW */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card title="Capacity Overview" className="dcim-card" style={glassStyle} bordered={false}>
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text strong>Space</Text>
                                        <div style={{ height: 140 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={capacityData} innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                                                        {capacityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <Text type="secondary">78% Used</Text>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text strong>Power</Text>
                                        <div style={{ height: 140 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={powerCapacityData} innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                                                        {powerCapacityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <Text type="secondary" style={{ color: '#ff4d4f' }}>65% Used</Text>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card title="Power Consumption (24h)" className="dcim-card" style={glassStyle} bordered={false} extra={<Badge status="processing" text="Live" />}>
                            <div style={{ height: 210 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={powerData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorKw" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="kw" stroke={themeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorKw)" />
                                    </AreaChart>
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
                        <Card title={<Space><FireOutlined style={{ color: '#ff4d4f' }}/> Hottest Racks</Space>} className="dcim-card" style={glassStyle} bordered={false}>
                            {hotRacks.map((rack, i) => (
                                <div key={i} style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text strong>{rack.rack} <Text type="secondary" style={{ fontSize: 12 }}>({rack.utilization}% util)</Text></Text>
                                        <Text type={rack.temp > 30 ? "danger" : "warning"} strong>{rack.temp}°C</Text>
                                    </div>
                                    <Progress 
                                        percent={(rack.temp / 40) * 100} 
                                        showInfo={false} 
                                        strokeColor={rack.temp > 30 ? '#ff4d4f' : '#faad14'} 
                                        trailColor={isDark ? '#333' : '#f0f0f0'}
                                    />
                                </div>
                            ))}
                        </Card>
                    </motion.div>
                </Col>
                
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Card title="Recent Alerts" className="dcim-card" style={glassStyle} bordered={false} extra={<Button type="link">View All</Button>}>
                            <Table 
                                dataSource={alerts} 
                                pagination={false} 
                                rowKey="id"
                                size="small"
                                columns={[
                                    { title: 'Time', dataIndex: 'time', width: 100 },
                                    { title: 'Type', dataIndex: 'type', width: 100, render: (t) => <Badge status={t === 'Critical' ? 'error' : t === 'Warning' ? 'warning' : 'processing'} text={t} /> },
                                    { title: 'Message', dataIndex: 'msg' },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
