"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Badge, Space, Typography, Table, Button, Input, Tag } from "antd";
import { 
    FolderOutlined, GlobalOutlined, BugOutlined, CalculatorOutlined, 
    SearchOutlined, UploadOutlined, CloudDownloadOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import dynamic from 'next/dynamic';

const BimViewerModal = dynamic(() => import('./BimViewerModal'), { ssr: false });

const { Title, Text } = Typography;

const dashAnimStyle = `
@keyframes bimFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.bim-card { animation: bimFadeUp 0.5s ease both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.bim-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
`;

export default function BimLibrary() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

        const [viewerVisible, setViewerVisible] = useState(false);
    const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
    const [currentModelName, setCurrentModelName] = useState<string>("");

const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const [models, setModels] = useState([
        { id: 'MOD-001', name: 'HQ_Architecture_v3.ifc', version: 'v3', format: 'IFC4', size: '142 MB', status: 'Active', updated: '2026-06-12' },
        { id: 'MOD-002', name: 'HQ_MEP_v2.rvt', version: 'v2', format: 'RVT', size: '310 MB', status: 'Active', updated: '2026-06-10' },
        { id: 'MOD-003', name: 'HQ_Structural_v1.ifc', version: 'v1', format: 'IFC4', size: '85 MB', status: 'Archived', updated: '2026-05-15' },
        { id: 'MOD-004', name: 'DC_Extension_Concept.gltf', version: 'v1', format: 'glTF', size: '24 MB', status: 'Draft', updated: '2026-06-13' },
    ]);

    return (
        <CMSLayout 
            title={<AuroraText>BIM Library</AuroraText>}
            subTitle={<DecryptedText text="Building Information Models & Assets" speed={60} />}
        >
            <style>{dashAnimStyle}</style>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { title: "Total Models", value: "24", icon: <FolderOutlined />, color: themeColor } as any,
                    { title: "Active Projects", value: "3", icon: <GlobalOutlined />, color: "#52c41a" } as any,
                    { title: "Open Clashes", value: "14", icon: <BugOutlined />, color: "#faad14" } as any,
                    { title: "Storage Used", value: "4.2", icon: <CloudDownloadOutlined />, suffix: " GB", color: "#1890ff" }
                ].map((kpi, idx) => (
                    <Col xs={24} sm={12} md={6} key={idx}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                            <Card className="bim-card" bodyStyle={{ padding: '20px' }} style={{ ...glassStyle, overflow: 'hidden', position: 'relative' }}>
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

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Input placeholder="Search models by name, format..." prefix={<SearchOutlined />} style={{ width: 300, borderRadius: 8 }} />
                        <Space>
                            <Button icon={<CloudDownloadOutlined />}>Sync Autodesk BIM 360</Button>
                            <Upload
                                accept=".glb,.gltf,.bin"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    const url = URL.createObjectURL(file);
                                    const newModel = {
                                        id: `MOD-${Math.floor(Math.random()*1000)}`,
                                        name: file.name,
                                        version: 'v1',
                                        format: file.name.split('.').pop()?.toUpperCase() || 'GLB',
                                        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                                        status: 'Active',
                                        updated: new Date().toISOString().split('T')[0],
                                        url: url
                                    };
                                    setModels([newModel, ...models]);
                                    message.success(`${file.name} uploaded successfully!`);
                                    return false; // Prevent auto upload
                                }}
                            >
                                <Button type="primary" icon={<UploadOutlined />} style={{ background: themeColor }}>Upload Model</Button>
                            </Upload>
                        </Space>
                    </div>
                    <Table 
                        dataSource={models} 
                        pagination={{ pageSize: 10 }}
                        rowKey="id"
                        style={{ background: 'transparent' }}
                        columns={[
                            { title: 'Model ID', dataIndex: 'id', render: (t: any) => <Text type="secondary">{t}</Text> } as any,
                            { title: 'File Name', dataIndex: 'name', render: (t: any) => <a style={{ color: themeColor, fontWeight: 500 }}>{t}</a> } as any,
                            { title: 'Format', dataIndex: 'format', render: (t: any) => (
                                <Tag color={t === 'IFC4' ? 'blue' : t === 'RVT' ? 'cyan' : 'default'}>{t}</Tag>
                            )} as any,
                            { title: 'Version', dataIndex: 'version', render: (t: any) => <Tag>{t}</Tag> } as any,
                            { title: 'Size', dataIndex: 'size' } as any,
                            { title: 'Last Updated', dataIndex: 'updated' } as any,
                            { title: 'Status', dataIndex: 'status', render: (t: any) => <Badge status={t === 'Active' ? 'success' : t === 'Draft' ? 'processing' : 'default'} text={t} /> } as any,
                            { title: 'Actions', render: (_: any, record: any) => (
                                <Space>
                                    <Button 
                                        size="small" 
                                        type="primary" 
                                        ghost
                                        onClick={() => {
                                            if (record.url) {
                                                setCurrentModelUrl(record.url);
                                                setCurrentModelName(record.name);
                                                setViewerVisible(true);
                                            } else {
                                                message.warning("Only newly uploaded .glb/.bin files can be viewed in this demo.");
                                            }
                                        }}
                                    >Open 3D Viewer</Button>
                                    <Button size="small">Details</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
            <BimViewerModal 
                visible={viewerVisible} 
                onClose={() => setViewerVisible(false)} 
                modelUrl={currentModelUrl} 
                modelName={currentModelName} 
            />
        </CMSLayout>
    );
}
