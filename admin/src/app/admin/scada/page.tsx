"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Badge, Space, Typography, Table, Progress, Button } from "antd";
import { 
    ApiOutlined, AlertOutlined, RadarChartOutlined, SwapOutlined, 
    FundProjectionScreenOutlined, CodeOutlined, SyncOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { scadaService, ScadaDataSource, ScadaTag, ScadaAlarmEvent } from "@/lib/scadaService";

const { Title, Text } = Typography;

const dashAnimStyle = `
@keyframes scadaFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.scada-card { animation: scadaFadeUp 0.5s ease both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.scada-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
`;

export default function ScadaDashboard() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [realSources, setRealSources] = useState<ScadaDataSource[]>([]);
    const [realTags, setRealTags] = useState<ScadaTag[]>([]);
    const [realAlarms, setRealAlarms] = useState<ScadaAlarmEvent[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch real data from NestJS backend (falls back to demo data if empty/fails)
                const sources = await scadaService.getDataSources();
                if (sources && sources.length > 0) setRealSources(sources);
                
                const tags = await scadaService.getTags();
                if (tags && tags.length > 0) setRealTags(tags);
                
                const alarmsData = await scadaService.getActiveAlarms();
                if (alarmsData && alarmsData.length > 0) setRealAlarms(alarmsData);
            } catch (err) {
                console.warn("Backend not available, using demo data for SCADA Dashboard.");
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
    const networkData = Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        throughput: 450 + Math.random() * 100,
        latency: 12 + Math.random() * 5
    }));

    const protocols = [
        { name: 'OPC-UA', val: 45, color: '#1890ff' },
        { name: 'Modbus TCP', val: 30, color: '#52c41a' },
        { name: 'BACnet/IP', val: 15, color: '#faad14' },
        { name: 'MQTT', val: 10, color: '#722ed1' },
    ];

    const alarms = [
        { id: 1, time: '10:23:45.123', tag: 'PLC_01.Temp.Zone3', msg: 'High Temperature Limit Exceeded', state: 'UNACK_ALM', sev: 'CRITICAL' },
        { id: 2, time: '09:45:12.845', tag: 'PMP_CHW_02.VFD.Speed', msg: 'VFD Speed Deviation', state: 'ACK_ALM', sev: 'HIGH' },
        { id: 3, time: '08:15:00.000', tag: 'SYS.COM.MODBUS.Node4', msg: 'Communication Timeout', state: 'UNACK_ALM', sev: 'HIGH' },
    ];

    const sources = [
        { name: 'PLC-Core-A (OPC-UA)', status: 'Connected', ping: '12ms', tags: 1245 },
        { name: 'PLC-Core-B (OPC-UA)', status: 'Connected', ping: '14ms', tags: 1245 },
        { name: 'BMS-Gateway (BACnet)', status: 'Connected', ping: '45ms', tags: 840 },
        { name: 'Power-Mtr-Main (Modbus)', status: 'Connected', ping: '8ms', tags: 150 },
        { name: 'IoT-Hub (MQTT)', status: 'Warning', ping: '250ms', tags: 420 },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>SCADA Overview</AuroraText>}
            subTitle={<DecryptedText text="Supervisory Control and Data Acquisition" speed={60} />}
        >
            <style>{dashAnimStyle}</style>

            {/* KPI ROW */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { title: "Total Data Points (Tags)", value: "3,900", icon: <CodeOutlined />, suffix: "", color: themeColor },
                    { title: "Active Connections", value: "24", icon: <ApiOutlined />, suffix: "/ 25", color: "#52c41a" },
                    { title: "Data Throughput", value: "482", icon: <SwapOutlined />, suffix: " msg/s", color: "#1890ff" },
                    { title: "Unacknowledged Alarms", value: "2", icon: <AlertOutlined />, suffix: "", color: "#f5222d" }
                ].map((kpi, idx) => (
                    <Col xs={24} sm={12} md={6} key={idx}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                            <Card className="scada-card" bodyStyle={{ padding: '20px' }} style={{ ...glassStyle, overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, fontSize: 100, color: kpi.color }}>
                                    {kpi.icon}
                                </div>
                                <Statistic 
                                    title={<Text type="secondary" style={{ fontSize: 16 }}>{kpi.title}</Text>}
                                    value={kpi.value} 
                                    suffix={kpi.suffix}
                                    valueStyle={{ color: kpi.color, fontSize: 32, fontWeight: 700 }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* CHARTS ROW */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card title="Telemetry Network Performance" className="scada-card" style={glassStyle} bordered={false}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={networkData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="throughput" name="Throughput (msg/s)" stroke={themeColor} strokeWidth={2} fillOpacity={1} fill="url(#colorTp)" />
                                        <Area yAxisId="right" type="step" dataKey="latency" name="Avg Latency (ms)" stroke="#faad14" strokeWidth={2} fill="none" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card title="Protocol Distribution" className="scada-card" style={glassStyle} bordered={false}>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={protocols} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} width={80} />
                                        <RechartsTooltip cursor={{fill: isDark ? '#333' : '#f5f5f5'}} contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Bar dataKey="val" name="% of Tags" radius={[0, 4, 4, 0]}>
                                            {protocols.map((entry, index) => (
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
                        <Card title="Data Source Status" className="scada-card" style={glassStyle} bordered={false} extra={<Button icon={<SyncOutlined />} type="link">Refresh</Button>}>
                            <Table 
                                dataSource={sources} 
                                pagination={false}
                                rowKey="name"
                                size="small"
                                columns={[
                                    { title: 'Source Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                                    { title: 'Status', dataIndex: 'status', render: (t) => <Badge status={t === 'Warning' ? 'warning' : 'success'} text={t} /> },
                                    { title: 'Latency', dataIndex: 'ping', render: (t) => <span style={{ color: t.includes('250') ? '#faad14' : 'inherit' }}>{t}</span> },
                                    { title: 'Active Tags', dataIndex: 'tags' },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
                
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Card title="Recent Alarm Events" className="scada-card" style={glassStyle} bordered={false} extra={<Button type="link">View All</Button>}>
                            <Table 
                                dataSource={alarms} 
                                pagination={false} 
                                rowKey="id"
                                size="small"
                                columns={[
                                    { title: 'Timestamp', dataIndex: 'time', width: 100 },
                                    { title: 'State', dataIndex: 'state', width: 100, render: (t) => <Badge status={t === 'UNACK_ALM' ? 'error' : 'warning'} text={t} /> },
                                    { title: 'Tag', dataIndex: 'tag', render: (t) => <Text code>{t}</Text> },
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
