'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Progress } from 'antd';
import { DashboardOutlined, ThunderboltOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, BarChartOutlined, AlertOutlined, RocketOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const { Text } = Typography;

const glassStyle = { 
    background: 'rgba(255, 255, 255, 0.4)', 
    backdropFilter: 'blur(16px)', 
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.5)', 
    borderRadius: 24,
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
};

const darkGlassStyle = {
    background: 'rgba(15, 23, 42, 0.6)', 
    backdropFilter: 'blur(16px)', 
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)', 
    borderRadius: 24,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
};

const SLOS = [
    { name: 'API Availability', target: 99.9, current: 99.95, budget: 98.2, status: 'healthy' },
    { name: 'GraphQL P95 Latency', target: 500, current: 342, budget: 85.5, status: 'healthy', unit: 'ms' },
    { name: 'Error Rate', target: 1.0, current: 0.47, budget: 72.0, status: 'healthy', unit: '%' },
    { name: 'Auth Success Rate', target: 99.5, current: 99.8, budget: 91.3, status: 'healthy' },
];

const ENDPOINTS = [
    { path: '/graphql', rpm: 1240, p50: '45ms', p95: '180ms', p99: '420ms', errors: '0.3%', apdex: 0.96 },
    { path: '/auth/v1/token', rpm: 890, p50: '32ms', p95: '95ms', p99: '210ms', errors: '0.1%', apdex: 0.98 },
    { path: '/rest/v1/*', rpm: 2100, p50: '18ms', p95: '52ms', p99: '120ms', errors: '0.2%', apdex: 0.99 },
    { path: '/storage/v1/object', rpm: 340, p50: '120ms', p95: '450ms', p99: '980ms', errors: '0.8%', apdex: 0.88 },
    { path: '/realtime/v1', rpm: 56, p50: '8ms', p95: '25ms', p99: '60ms', errors: '0.0%', apdex: 0.99 },
];

const chartData = [
    { time: '00:00', requests: 4000, latency: 120 },
    { time: '04:00', requests: 3000, latency: 110 },
    { time: '08:00', requests: 5000, latency: 140 },
    { time: '12:00', requests: 8000, latency: 180 },
    { time: '16:00', requests: 6500, latency: 160 },
    { time: '20:00', requests: 4500, latency: 130 },
    { time: '24:00', requests: 4200, latency: 125 },
];

import { useTheme } from 'next-themes';

export default function PlatformMetricsPage() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const totalRPM = ENDPOINTS.reduce((s, e) => s + e.rpm, 0);
    const activeGlassStyle = isDark ? darkGlassStyle : glassStyle;
    const textColor = isDark ? '#f8fafc' : '#0f172a';

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ ...activeGlassStyle, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12 }}>
                    <p className="font-semibold" style={{ color: textColor, margin: 0, marginBottom: 8 }}>{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color, margin: 0, fontSize: 13 }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <CMSLayout 
            title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Platform Metrics</AuroraText>} 
            subTitle={<DecryptedText text="Real-time analytics, latency, and SLO tracking" animateOn="view" speed={40} maxIterations={15} />} 
            extra={[<Button key="r" icon={<ReloadOutlined />} type="primary" shape="circle" style={{ background: themeColor, border: 'none' }} />]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
                
                {/* Top Stats Cards */}
                <Row gutter={[16, 16]}>
                    {[
                        { t: 'Requests/min', v: totalRPM.toLocaleString(), c: '#3b82f6', i: <ThunderboltOutlined /> }, 
                        { t: 'P95 Latency', v: '180ms', c: '#10b981', i: <ClockCircleOutlined /> }, 
                        { t: 'Error Rate', v: '0.47%', c: '#f59e0b', i: <AlertOutlined /> }, 
                        { t: 'Apdex Score', v: '0.96', c: '#8b5cf6', i: <CheckCircleOutlined /> }
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                                <Card size="small" style={{ ...activeGlassStyle, overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, fontSize: 100, color: s.c }}>
                                        {s.i}
                                    </div>
                                    <Statistic 
                                        title={<span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontWeight: 500 }}>{s.t}</span>} 
                                        value={s.v} 
                                        prefix={<span style={{ marginRight: 8 }}>{s.i}</span>} 
                                        valueStyle={{ color: s.c, fontSize: 28, fontWeight: 800, textShadow: isDark ? `0 0 10px ${s.c}40` : 'none' }} 
                                    />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Main Charts */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card style={activeGlassStyle} title={<Space><BarChartOutlined style={{ color: themeColor }} /><Text strong style={{ color: textColor }}>Traffic & Latency Over Time</Text></Space>}>
                                <div style={{ height: 350, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} />
                                            <XAxis dataKey="time" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="right" orientation="right" stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} tickLine={false} axisLine={false} />
                                            <RechartsTooltip content={renderCustomTooltip} />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Area yAxisId="left" type="monotone" dataKey="requests" name="Requests" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReq)" activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }} />
                                            <Area yAxisId="right" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLat)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} lg={8}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card style={{ ...activeGlassStyle, height: '100%' }} title={<Space><DashboardOutlined style={{ color: '#10b981' }} /><Text strong style={{ color: textColor }}>SLO Compliance</Text></Space>}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {SLOS.map((slo, i) => (
                                        <div key={slo.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text strong style={{ color: textColor }}>{slo.name}</Text>
                                                <Text style={{ color: slo.budget > 80 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{slo.current}{slo.unit || '%'}</Text>
                                            </div>
                                            <Progress 
                                                percent={slo.budget} 
                                                strokeColor={{ '0%': '#3b82f6', '100%': '#10b981' }} 
                                                trailColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                                                showInfo={false}
                                                strokeWidth={10}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Target: {slo.target}{slo.unit || '%'}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{slo.budget}% Error Budget left</Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Endpoint Performance List */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card style={activeGlassStyle} title={<Space><RocketOutlined style={{ color: '#8b5cf6' }} /><Text strong style={{ color: textColor }}>Endpoint Performance</Text></Space>}>
                        <Row gutter={[16, 16]}>
                            {ENDPOINTS.map((ep, i) => (
                                <Col key={ep.path} xs={24} lg={12}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 12, 
                                        padding: '16px', 
                                        borderRadius: 16, 
                                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                        transition: 'transform 0.2s',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 600, color: textColor, display: 'block', marginBottom: 4 }}>{ep.path}</Text>
                                            <Space size={8}>
                                                <Tag color={isDark ? "blue-inverse" : "blue"} style={{ borderRadius: 6, border: 'none' }}>{ep.rpm} RPM</Tag>
                                                <Tag color={parseFloat(ep.errors) > 0.5 ? 'error' : 'success'} style={{ borderRadius: 6, border: 'none' }}>err: {ep.errors}</Tag>
                                            </Space>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: 16 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>P95</Text>
                                                <Text strong style={{ color: '#3b82f6' }}>{ep.p95}</Text>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Apdex</Text>
                                                <Text strong style={{ color: ep.apdex > 0.95 ? '#10b981' : '#f59e0b' }}>{ep.apdex}</Text>
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

            </motion.div>
        </CMSLayout>
    );
}
