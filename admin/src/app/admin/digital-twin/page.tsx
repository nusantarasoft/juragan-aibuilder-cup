"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Typography, Button } from "antd";
import { GlobalOutlined, CloudServerOutlined, ToolOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

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
            title: "BIM Digital Twin",
            description: "Interactive 3D structural and architectural model with clash detection and metadata.",
            icon: <ToolOutlined style={{ fontSize: 48, color: '#faad14' }} />,
            path: "/admin/bim/viewer",
            bg: "linear-gradient(135deg, rgba(250,173,20,0.1) 0%, rgba(250,173,20,0.02) 100%)"
        },
        {
            title: "DCIM 3D View",
            description: "Data center digital twin showing racks, servers, thermal mapping, and power usage.",
            icon: <CloudServerOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
            path: "/admin/dcim/3d-view",
            bg: "linear-gradient(135deg, rgba(24,144,255,0.1) 0%, rgba(24,144,255,0.02) 100%)"
        },
        {
            title: "SCADA 3D Process",
            description: "Real-time 3D visualization of industrial processes, chillers, pumps, and fluid flow.",
            icon: <VideoCameraOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
            path: "/admin/scada/3d",
            bg: "linear-gradient(135deg, rgba(82,196,26,0.1) 0%, rgba(82,196,26,0.02) 100%)"
        }
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Digital Twin Hub</AuroraText>}
            subTitle={<DecryptedText text="Unified 3D Visualization Center" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div style={{ textAlign: 'center', marginBottom: 48, marginTop: 24 }}>
                    <GlobalOutlined style={{ fontSize: 64, color: themeColor, marginBottom: 16 }} />
                    <Title level={2} style={{ margin: 0 }}>Select a Digital Twin Environment</Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Explore the facility in full 3D. Choose an environment to enter its interactive workspace.
                    </Text>
                </div>

                <Row gutter={[24, 24]} justify="center">
                    {twins.map((twin, index) => (
                        <Col xs={24} md={8} key={twin.path}>
                            <motion.div
                                whileHover={{ y: -8, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => router.push(twin.path)}
                            >
                                <Card
                                    style={{ ...glassStyle, background: isDark ? twin.bg : '#fff', height: '100%' }}
                                    bordered={false}
                                    bodyStyle={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}
                                >
                                    <div style={{ marginBottom: 24 }}>{twin.icon}</div>
                                    <Title level={4}>{twin.title}</Title>
                                    <Text type="secondary" style={{ flex: 1, display: 'block', marginBottom: 24 }}>
                                        {twin.description}
                                    </Text>
                                    <Button type="primary" size="large" style={{ background: themeColor, width: '100%' }}>
                                        Launch Environment
                                    </Button>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
