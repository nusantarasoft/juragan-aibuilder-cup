"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Row, Col, Typography, Button, Space, Badge, Select, Tooltip, Dropdown } from "antd";
import { VideoCameraOutlined, ExpandOutlined, AimOutlined, WarningOutlined, ZoomInOutlined, ZoomOutOutlined, UpOutlined, DownOutlined, LeftOutlined, RightOutlined, SettingOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const { Text, Title } = Typography;

export default function BmsCctv() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const cameras = [
        { id: 'CAM-01', name: 'Main Lobby Entrance', status: 'live', aiAlert: null },
        { id: 'CAM-02', name: 'Data Center Row A', status: 'live', aiAlert: null },
        { id: 'CAM-03', name: 'Loading Dock', status: 'live', aiAlert: 'Unauthorized Vehicle' },
        { id: 'CAM-04', name: 'Perimeter North', status: 'live', aiAlert: null },
        { id: 'CAM-05', name: 'Server Room 2', status: 'live', aiAlert: null },
        { id: 'CAM-06', name: 'Basement Parking', status: 'offline', aiAlert: null },
    ];

    const [activeCam, setActiveCam] = useState(cameras[0]);
    const [gridCols, setGridCols] = useState(12); // 12 = 2 cols, 8 = 3 cols
    const [blink, setBlink] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => setBlink(prev => !prev), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <CMSLayout 
            title={<AuroraText>CCTV & Surveillance</AuroraText>}
            subTitle={<DecryptedText text="Video Management & AI Anomaly Detection" speed={60} />}
        >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Select defaultValue="all" options={[{label: 'All Zones', value: 'all'}, {label: 'Data Center', value: 'dc'}, {label: 'Perimeter', value: 'ext'}]} style={{ width: 150 }} />
                    <Select defaultValue="2x2" onChange={(v) => setGridCols(v === '2x2' ? 12 : 8)} options={[{label: '2x2 Grid', value: '2x2'}, {label: '3x3 Grid', value: '3x3'}]} style={{ width: 120 }} />
                </Space>
                <Space>
                    <Button type="primary" danger icon={<WarningOutlined />}>Lockdown Mode</Button>
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={18}>
                    <Row gutter={[16, 16]}>
                        {cameras.map((cam, idx) => (
                            <Col xs={24} md={gridCols} key={cam.id}>
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => setActiveCam(cam)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Card 
                                        style={{ 
                                            ...glassStyle, 
                                            padding: 0, 
                                            overflow: 'hidden',
                                            borderColor: activeCam.id === cam.id ? themeColor : (cam.aiAlert ? '#f5222d' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)')
                                        }} 
                                        bodyStyle={{ padding: 0 }}
                                    >
                                        <div style={{ 
                                            height: gridCols === 12 ? 280 : 180, 
                                            background: cam.status === 'offline' ? '#000' : (isDark ? '#1f1f1f' : '#e6f7ff'),
                                            position: 'relative',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            {/* Mock Video Feed */}
                                            {cam.status === 'offline' ? (
                                                <Text style={{ color: '#fff' }}>NO SIGNAL</Text>
                                            ) : (
                                                <VideoCameraOutlined style={{ fontSize: 48, color: isDark ? '#333' : '#bae0ff' }} />
                                            )}

                                            {/* Overlays */}
                                            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {cam.status === 'live' && (
                                                    <motion.div animate={{ opacity: blink ? 1 : 0.3 }} style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5222d', boxShadow: '0 0 8px #f5222d' }} />
                                                )}
                                                <Badge status={cam.status === 'offline' ? 'error' : 'success'} text={<Text style={{ color: cam.status === 'offline' ? '#fff' : 'inherit', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: 600 }}>{cam.status === 'live' ? 'LIVE REC' : 'OFFLINE'}</Text>} />
                                            </div>
                                            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                                                <Text strong style={{ color: '#fff' }}>{cam.id} - {cam.name}</Text>
                                            </div>
                                            {cam.aiAlert && (
                                                <motion.div 
                                                    initial={{ scale: 0.9, opacity: 0 }} 
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(245, 34, 45, 0.9)', padding: '4px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(245, 34, 45, 0.4)' }}
                                                >
                                                    <Space>
                                                        <WarningOutlined style={{ color: '#fff' }} />
                                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{cam.aiAlert}</Text>
                                                    </Space>
                                                </motion.div>
                                            )}
                                            {/* Mock AI Bounding Box */}
                                            {cam.aiAlert && (
                                                <motion.div 
                                                    animate={{ x: [0, 10, -5, 0], y: [0, -5, 5, 0] }}
                                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                                    style={{ position: 'absolute', top: '30%', left: '40%', width: '20%', height: '40%', border: '2px dashed #f5222d', boxShadow: '0 0 15px rgba(245, 34, 45, 0.6) inset', backgroundColor: 'rgba(245, 34, 45, 0.1)' }}
                                                />
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Col>

                {/* PTZ Controls Side Panel */}
                <Col xs={24} lg={6}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <Card style={glassStyle} title="PTZ Controls" extra={<Badge status="processing" text={activeCam.id} />}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <div style={{ 
                                    width: 180, height: 180, 
                                    background: isDark ? 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.4) 100%)' : 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.1) 100%)', 
                                    borderRadius: '50%',
                                    position: 'relative',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)'
                                }}>
                                    <Button shape="circle" size="large" icon={<UpOutlined />} style={{ position: 'absolute', top: 5, border: 'none', background: 'transparent' }} />
                                    <Button shape="circle" size="large" icon={<DownOutlined />} style={{ position: 'absolute', bottom: 5, border: 'none', background: 'transparent' }} />
                                    <Button shape="circle" size="large" icon={<LeftOutlined />} style={{ position: 'absolute', left: 5, border: 'none', background: 'transparent' }} />
                                    <Button shape="circle" size="large" icon={<RightOutlined />} style={{ position: 'absolute', right: 5, border: 'none', background: 'transparent' }} />
                                    <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }}>
                                        <Button shape="circle" type="primary" size="large" icon={<AimOutlined />} style={{ width: 64, height: 64, background: themeColor, boxShadow: `0 8px 24px ${themeColor}80` }} />
                                    </motion.div>
                                </div>
                                <Space>
                                    <Tooltip title="Zoom Out"><Button icon={<ZoomOutOutlined />} /></Tooltip>
                                    <Tooltip title="Zoom In"><Button icon={<ZoomInOutlined />} /></Tooltip>
                                </Space>
                            </div>
                        </Card>
                        
                        <Card style={{ ...glassStyle, marginTop: 16 }} title="AI Analytics">
                            <ul style={{ paddingLeft: 16, margin: 0, color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
                                <li style={{ marginBottom: 8 }}>Object Detection: <Text strong style={{ color: '#52c41a' }}>Active</Text></li>
                                <li style={{ marginBottom: 8 }}>Facial Rec: <Text strong style={{ color: '#52c41a' }}>Active</Text></li>
                                <li>License Plate: <Text strong type="secondary">Disabled</Text></li>
                            </ul>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
