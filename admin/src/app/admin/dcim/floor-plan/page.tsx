"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Row, Col, Select, Typography, Drawer, Descriptions, Badge, Button, Progress } from "antd";
import { motion } from "framer-motion";

import { useDcimStore } from "@/store/useDcimStore";
import { FloorPlanCanvas } from "@/components/dcim/FloorPlanCanvas";

const { Text } = Typography;

export default function DcimFloorPlan() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    
    const { viewMode, setViewMode, racks, selectedRackId, setSelectedRackId } = useDcimStore();
    
    const selectedRack = React.useMemo(() => racks.find(r => r.id === selectedRackId) || null, [racks, selectedRackId]);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    return (
        <CMSLayout 
            title={<AuroraText>2D Floor Plan</AuroraText>}
            subTitle={<DecryptedText text="Facility Layout & Interactive Map" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%' }}>
                <Card 
                    title="Server Hall A" 
                    style={{...glassStyle, height: 'calc(100vh - 200px)', minHeight: 600}} 
                    bordered={false}
                    extra={
                        <Select value={viewMode} onChange={(val) => setViewMode(val as any)} options={[
                            {label: 'View: Normal', value: 'Normal'},
                            {label: 'View: Utilization', value: 'Utilization'},
                            {label: 'View: Power', value: 'Power'},
                            {label: 'View: Thermal', value: 'Thermal'},
                        ]} style={{ width: 180 }} />
                    }
                >
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', background: isDark ? '#111' : '#f0f0f0', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#d9d9d9'}` }}>
                        <FloorPlanCanvas onRackClick={setSelectedRackId} />

                        {/* Legend Overlay */}
                        <div style={{ position: 'absolute', bottom: 16, right: 16, background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', padding: '12px 16px', borderRadius: 8, backdropFilter: 'blur(8px)', border: `1px solid ${isDark ? '#333' : '#ddd'}` }}>
                            <div style={{ fontWeight: 600, marginBottom: 8, color: isDark ? '#fff' : '#000' }}>Space Utilization</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#ff4d4f', borderRadius: 4 }}/> <Text>&gt; 90%</Text></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#faad14', borderRadius: 4 }}/> <Text>75 - 90%</Text></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 4 }}/> <Text>20 - 75%</Text></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#d9d9d9', borderRadius: 4 }}/> <Text>&lt; 20%</Text></div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <Drawer
                title={selectedRack ? `Rack ${selectedRack.name}` : 'Details'}
                placement="right"
                onClose={() => setSelectedRackId(null)}
                open={!!selectedRack}
                width={350}
            >
                {selectedRack && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Location">Row {selectedRack.name.charAt(0)}</Descriptions.Item>
                            <Descriptions.Item label="Type">Standard 42U</Descriptions.Item>
                            <Descriptions.Item label="Status"><Badge status={selectedRack.status === 'critical' ? 'error' : 'success'} text={selectedRack.status === 'critical' ? 'Critical' : 'Normal'} /></Descriptions.Item>
                        </Descriptions>
                        
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong>Utilization</strong>
                                <span>{Math.round((selectedRack.usedU / selectedRack.totalU) * 100)}%</span>
                            </div>
                            <Progress percent={Math.round((selectedRack.usedU / selectedRack.totalU) * 100)} strokeColor={themeColor} />
                        </div>

                        <Button type="primary" block>View In 3D</Button>
                        <Button block>Equipment List</Button>
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
