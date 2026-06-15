"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Tabs, Select, Typography, Row, Col, Space, Button } from "antd";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function ScadaHmi() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    return (
        <CMSLayout 
            title={<AuroraText>HMI Display</AuroraText>}
            subTitle={<DecryptedText text="Human-Machine Interface Views" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%' }}>
                <Card 
                    title="Chilled Water System Overview" 
                    style={{...glassStyle, height: 'calc(100vh - 200px)', minHeight: 600}} 
                    bordered={false}
                    extra={
                        <Space>
                            <Select defaultValue="chiller" options={[
                                {label: 'Chiller Plant View', value: 'chiller'},
                                {label: 'Electrical Single Line', value: 'electrical'},
                                {label: 'UPS System', value: 'ups'},
                            ]} style={{ width: 220 }} />
                            <Button type="primary" style={{ background: themeColor }}>Edit Canvas</Button>
                        </Space>
                    }
                >
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', background: isDark ? '#111' : '#e6f7ff', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#bae0ff'}` }}>
                        <svg width="1000" height="600" xmlns="http://www.w3.org/2000/svg">
                            {/* Pipes */}
                            <path d="M 150 200 L 400 200 L 400 350 L 800 350" fill="none" stroke="#1890ff" strokeWidth="8" strokeDasharray="10 5">
                                <animate attributeName="stroke-dashoffset" from="15" to="0" dur="1s" repeatCount="indefinite" />
                            </path>
                            <path d="M 800 450 L 400 450 L 400 300 L 150 300" fill="none" stroke="#faad14" strokeWidth="8" strokeDasharray="10 5">
                                <animate attributeName="stroke-dashoffset" from="0" to="15" dur="1s" repeatCount="indefinite" />
                            </path>

                            {/* Chiller Block */}
                            <rect x="50" y="150" width="100" height="200" fill={isDark ? '#333' : '#fff'} stroke="#1890ff" strokeWidth="3" rx="8" />
                            <text x="100" y="250" fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontWeight="bold">CHILLER 1</text>
                            
                            <rect x="50" y="380" width="100" height="40" fill={isDark ? '#222' : '#f0f0f0'} stroke="#333" strokeWidth="1" rx="4" />
                            <text x="100" y="405" fill="#52c41a" textAnchor="middle" fontSize="12" fontWeight="bold">Status: RUN</text>

                            {/* Pump Block */}
                            <circle cx="400" cy="275" r="40" fill={isDark ? '#333' : '#fff'} stroke="#52c41a" strokeWidth="3" />
                            <text x="400" y="280" fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontWeight="bold">PUMP</text>
                            
                            <rect x="360" y="330" width="80" height="30" fill={isDark ? '#222' : '#f0f0f0'} stroke="#333" strokeWidth="1" rx="4" />
                            <text x="400" y="350" fill="#1890ff" textAnchor="middle" fontSize="12" fontWeight="bold">60 Hz</text>

                            {/* Cooling Tower Block */}
                            <path d="M 750 350 L 850 350 L 830 200 L 770 200 Z" fill={isDark ? '#333' : '#fff'} stroke="#1890ff" strokeWidth="3" />
                            <text x="800" y="290" fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontWeight="bold">TOWER</text>
                            
                            {/* Live Tags Overlays */}
                            <g transform="translate(200, 160)">
                                <rect width="90" height="30" fill="rgba(0,0,0,0.8)" rx="4" />
                                <text x="45" y="20" fill="#52c41a" textAnchor="middle" fontSize="14" fontWeight="bold">6.5 °C</text>
                            </g>
                            <g transform="translate(200, 310)">
                                <rect width="90" height="30" fill="rgba(0,0,0,0.8)" rx="4" />
                                <text x="45" y="20" fill="#faad14" textAnchor="middle" fontSize="14" fontWeight="bold">12.1 °C</text>
                            </g>
                        </svg>
                        
                        <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                            <Card size="small" style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'white' }}>
                                <strong>Symbol Library Mode:</strong>
                                <br/>
                                <Text type="secondary">View Only. Edit mode allows drag & drop from ISA symbol library.</Text>
                            </Card>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
