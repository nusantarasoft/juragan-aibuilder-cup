"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Typography, Space, Switch, Segmented, Button } from "antd";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";

const Bms3dView = dynamic(() => import('../Bms3dView'), { ssr: false });

const { Title } = Typography;

export default function Bms3DPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();

    const [editMode, setEditMode] = useState(false);
    const [activeLayer, setActiveLayer] = useState<'All' | 'HVAC' | 'Fire' | 'Security' | 'Lighting'>('All');

    return (
        <CMSLayout 
            title={<AuroraText>BMS Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="3D Interactive Facility View" speed={60} />}
        >
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0, color: themeColor }}>BMS 3D View</Title>
                    <Space>
                        <Segmented
                            options={['All', 'HVAC', 'Fire', 'Security', 'Lighting']}
                            value={activeLayer}
                            onChange={(value: any) => setActiveLayer(value)}
                        />
                        <span style={{ color: themeColor, fontWeight: 600, marginLeft: 16 }}>Edit Mode</span>
                        <Switch checked={editMode} onChange={setEditMode} />
                        <Button onClick={() => router.push('/admin/bms')} style={{ marginLeft: 8 }}>Back to Dashboard</Button>
                    </Space>
                </div>
                <Bms3dView isDark={isDark} editMode={editMode} activeLayer={activeLayer} />
            </div>
        </CMSLayout>
    );
}
