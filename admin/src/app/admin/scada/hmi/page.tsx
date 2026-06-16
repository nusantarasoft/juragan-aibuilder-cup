"use client";

import React, { useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Select, Space, Button, Switch } from "antd";
import { motion } from "framer-motion";
import { useHmiStore } from "@/store/useHmiStore";
import ScadaPalette from "./ScadaPalette";
import ScadaCanvas from "./ScadaCanvas";
import ScadaProperties from "./ScadaProperties";

export default function ScadaHmi() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    
    const { isEditMode, setEditMode, clearSelection } = useHmiStore();

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Keyboard shortcuts for delete and deselect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearSelection]);

    return (
        <CMSLayout 
            title={<AuroraText>HMI Display</AuroraText>}
            subTitle={<DecryptedText text="Drag-and-Drop ISA Symbol Canvas" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%', display: 'flex', gap: 16 }}>
                
                {/* Left Panel: Palette */}
                <Card 
                    title="Library" 
                    style={{...glassStyle, width: 250, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, overflow: 'hidden', padding: 12 }}
                    bordered={false}
                >
                    <ScadaPalette />
                </Card>

                {/* Center: Canvas */}
                <Card 
                    title={
                        <Space>
                            <Select defaultValue="chiller" options={[
                                {label: 'Chiller Plant View', value: 'chiller'},
                                {label: 'Electrical Single Line', value: 'electrical'},
                                {label: 'UPS System', value: 'ups'},
                            ]} style={{ width: 200 }} />
                        </Space>
                    }
                    style={{...glassStyle, flex: 1, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}
                    bordered={false}
                    extra={
                        <Space>
                            <Switch checkedChildren="Edit" unCheckedChildren="View" checked={isEditMode} onChange={setEditMode} />
                            <Button type="primary" style={{ background: themeColor }}>Deploy HMI</Button>
                        </Space>
                    }
                >
                    <ScadaCanvas />
                </Card>

                {/* Right Panel: Properties */}
                <Card 
                    title="Properties" 
                    style={{...glassStyle, width: 280, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, overflow: 'hidden', padding: 12 }}
                    bordered={false}
                >
                    <ScadaProperties />
                </Card>

            </motion.div>
        </CMSLayout>
    );
}
