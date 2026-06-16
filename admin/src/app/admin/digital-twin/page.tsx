"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Typography, Button } from "antd";
import GlobalOutlined from "@ant-design/icons/GlobalOutlined";
import CloudServerOutlined from "@ant-design/icons/CloudServerOutlined";
import ToolOutlined from "@ant-design/icons/ToolOutlined";
import VideoCameraOutlined from "@ant-design/icons/VideoCameraOutlined";
import HomeOutlined from "@ant-design/icons/HomeOutlined";
import BuildOutlined from "@ant-design/icons/BuildOutlined";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const Campus3DScene = dynamic(() => import('./Campus3DScene'), { ssr: false });

const { Title, Text } = Typography;

export default function DigitalTwinHub() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    };

    const twins = [
        {
            title: "BIM Library",
            description: "3D architectural models with clash detection (.glb/.bin importer).",
            icon: <ToolOutlined style={{ fontSize: 32, color: '#faad14' }} />,
            path: "/admin/bim",
            bg: "linear-gradient(135deg, rgba(250,173,20,0.1) 0%, rgba(250,173,20,0.02) 100%)"
        },
        {
            title: "DCIM Data Center",
            description: "Data center twin showing interactive racks, thermal maps, and power routing.",
            icon: <CloudServerOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
            path: "/admin/dcim/3d-view",
            bg: "linear-gradient(135deg, rgba(24,144,255,0.1) 0%, rgba(24,144,255,0.02) 100%)"
        },
        {
            title: "SCADA Industrial",
            description: "Real-time 3D visualization of industrial tanks, pumps, and fluid flow.",
            icon: <VideoCameraOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
            path: "/admin/scada/3d",
            bg: "linear-gradient(135deg, rgba(82,196,26,0.1) 0%, rgba(82,196,26,0.02) 100%)"
        },
        {
            title: "BMS Headquarters",
            description: "Building Management System with HVAC zoning and Smart Building insights.",
            icon: <HomeOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
            path: "/admin/bms",
            bg: "linear-gradient(135deg, rgba(114,46,209,0.1) 0%, rgba(114,46,209,0.02) 100%)"
        },
        {
            title: "PM Construction",
            description: "Live construction site viewer with placing catalogs, weather, and day/night cycle.",
            icon: <BuildOutlined style={{ fontSize: 32, color: '#faad14' }} />,
            path: "/admin/pm/construction-3d",
            bg: "linear-gradient(135deg, rgba(250,173,20,0.1) 0%, rgba(250,173,20,0.02) 100%)"
        }
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Campus Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="Unified 3D Operations Center" speed={60} />}
        >
            <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden' }}>
                <Campus3DScene isDark={isDark} />
                
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Card style={{ ...glassStyle, width: 350, pointerEvents: 'auto', background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }} bordered={false}>
                            <Title level={4} style={{ margin: 0, marginBottom: 8 }}><GlobalOutlined /> Facility Master Plan</Title>
                            <Text type="secondary">Explore the campus in full 3D. Click on a building in the scene or select a module below to enter its workspace.</Text>
                            
                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {twins.map((twin) => (
                                    <div 
                                        key={twin.path}
                                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => router.push(twin.path)}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')}
                                    >
                                        <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#fff', padding: 8, borderRadius: 8 }}>{twin.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{twin.title}</div>
                                            <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666', lineHeight: 1.2 }}>{twin.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
                
        </CMSLayout>
    );
}
