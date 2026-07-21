"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Select, Typography } from "antd";
import { HeatMapOutlined, ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Scatter } from 'recharts';

const { Text } = Typography;

export default function DcimThermal() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Demo Data
    const [thermalTrend, setThermalTrend] = useState<any[]>([]);
    const [heatMapData, setHeatMapData] = useState<any[]>([]);

    useEffect(() => {
        setThermalTrend(Array.from({ length: 24 }).map((_, i) => ({
            time: `${i}:00`,
            coldAisle: 20 + Math.random() * 2,
            hotAisle: 32 + Math.random() * 4,
            supply: 18 + Math.random() * 1,
        })));

        setHeatMapData(Array.from({ length: 5 }).map((_, y) => 
            Array.from({ length: 10 }).map((_, x) => ({
                x, y,
                temp: 20 + Math.random() * 15
            }))
        ).flat());
    }, []);

    const getTempColor = (temp: number) => {
        if (temp < 22) return '#1890ff'; // Blue (Cold)
        if (temp < 25) return '#52c41a'; // Green (Optimal)
        if (temp < 29) return '#faad14'; // Yellow (Warm)
        if (temp < 32) return '#fa541c'; // Orange (Hot)
        return '#f5222d'; // Red (Critical)
    };

    return (
        <CMSLayout 
            title={<AuroraText>Thermal Management</AuroraText>}
            subTitle={<DecryptedText text="Cooling Efficiency & Heatmaps" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Cold Aisle Temp" value={21.4} suffix="°C" valueStyle={{ color: '#1890ff', fontSize: 32 }} prefix={<ArrowDownOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Hot Aisle Temp" value={34.2} suffix="°C" valueStyle={{ color: '#f5222d', fontSize: 32 }} prefix={<ArrowUpOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Max Rack Temp" value={36.8} suffix="°C" valueStyle={{ color: '#faad14', fontSize: 32 }} prefix={<HeatMapOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Cooling Efficiency" value={88} suffix="%" valueStyle={{ color: '#52c41a', fontSize: 32 }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} style={{ height: '100%' }}>
                        <Card title="2D Thermal Floor Plan" style={{...glassStyle, height: '100%'}} bordered={false} extra={<Select defaultValue="hall_a" options={[{label: 'Server Hall A', value: 'hall_a'}, {label: 'Server Hall B', value: 'hall_b'}]} />}>
                            <div style={{ position: 'relative', height: 350, width: '100%', background: isDark ? '#111' : '#f0f0f0', borderRadius: 8, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 2, padding: 8 }}>
                                {heatMapData.map((cell, i) => (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            background: getTempColor(cell.temp), 
                                            opacity: 0.8,
                                            borderRadius: 4,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            color: '#fff',
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                            transition: 'transform 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        title={`Rack X${cell.x}-Y${cell.y}: ${cell.temp.toFixed(1)}°C`}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {cell.temp.toFixed(0)}°
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                                <Text type="secondary">Cold (&lt;22°C)</Text>
                                <div style={{ flex: 1, height: 8, background: 'linear-gradient(to right, #1890ff, #52c41a, #faad14, #fa541c, #f5222d)', margin: '0 16px', borderRadius: 4, alignSelf: 'center' }} />
                                <Text type="secondary">Hot (&gt;32°C)</Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={12}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} style={{ height: '100%' }}>
                        <Card title="Aisle Temperature Trends" style={{...glassStyle, height: '100%'}} bordered={false}>
                            <div style={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={thermalTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={[10, 45]} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Line type="monotone" dataKey="hotAisle" stroke="#f5222d" strokeWidth={3} dot={false} name="Hot Aisle Avg" />
                                        <Line type="monotone" dataKey="coldAisle" stroke="#1890ff" strokeWidth={3} dot={false} name="Cold Aisle Avg" />
                                        <Line type="monotone" dataKey="supply" stroke="#52c41a" strokeWidth={2} strokeDasharray="5 5" dot={false} name="CRAC Supply" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
