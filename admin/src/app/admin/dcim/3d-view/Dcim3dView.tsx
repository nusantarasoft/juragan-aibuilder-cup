"use client";

import React, { Suspense, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Badge, Button, Card, Descriptions, Drawer, Progress, Spin, Typography, Switch, message, Tree, Input, Tooltip, Tabs } from 'antd';
import { motion } from "framer-motion";
import {
    EditOutlined, AppstoreOutlined, ControlOutlined, ThunderboltOutlined,
    ExperimentOutlined, ToolOutlined, DragOutlined, SyncOutlined,
    EnvironmentOutlined, DownloadOutlined, UploadOutlined, SlidersOutlined,
    BlockOutlined, GatewayOutlined, BgColorsOutlined, DeleteOutlined,
    ColumnHeightOutlined, MenuOutlined, ApiOutlined, HddOutlined, WifiOutlined,
    PlusOutlined, SearchOutlined, FolderOutlined, DatabaseOutlined,
    ClusterOutlined, CloudServerOutlined, ApartmentOutlined, SettingOutlined,
    DashboardOutlined, BarChartOutlined, RobotOutlined, BuildOutlined,
    NodeIndexOutlined, FundOutlined, AlertOutlined, SafetyCertificateOutlined,
    ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, BorderOutlined,
    EyeOutlined, CaretRightOutlined
} from '@ant-design/icons';
import { LineChart, Line, ResponsiveContainer, YAxis, AreaChart, Area } from 'recharts';
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useDcimStore } from "@/store/useDcimStore";
import { DataCenterScene } from "@/components/dcim/DataCenterScene";
import { FloorPlanCanvas } from "@/components/dcim/FloorPlanCanvas";

// --- Mock monitoring data ---
const powerData = Array.from({ length: 20 }, (_, i) => ({ v: 6.5 + Math.sin(i * 0.5) * 2 + Math.random() * 0.5 }));
const tempData = Array.from({ length: 20 }, (_, i) => ({ v: 22 + Math.sin(i * 0.3) * 3 + Math.random() }));
const airflowData = Array.from({ length: 20 }, (_, i) => ({ v: 120 + Math.sin(i * 0.4) * 40 + Math.random() * 10 }));

// --- Component Library Items ---
const componentItems = [
    { key: 'rack', label: 'Rack', icon: <AppstoreOutlined />, category: 'equipment' },
    { key: 'server', label: 'Server', icon: <HddOutlined />, category: 'equipment' },
    { key: 'server2u', label: 'Server 2U', icon: <HddOutlined />, category: 'equipment' },
    { key: 'pdu', label: 'Power Distribution', icon: <ThunderboltOutlined />, category: 'power' },
    { key: 'switch', label: 'Switches', icon: <WifiOutlined />, category: 'equipment' },
    { key: 'crac', label: 'Cooling Units', icon: <CloudServerOutlined />, category: 'cooling' },
    { key: 'cableTray', label: 'Cable Tray', icon: <NodeIndexOutlined />, category: 'structural' },
    { key: 'pipe', label: 'Pipe', icon: <ApiOutlined />, category: 'structural' },
    { key: 'wall', label: 'Wall', icon: <BlockOutlined />, category: 'structural' },
    { key: 'pillar', label: 'Pillar', icon: <ColumnHeightOutlined />, category: 'structural' },
    { key: 'generator', label: 'Generator', icon: <ThunderboltOutlined />, category: 'power' },
    { key: 'tree', label: 'Tree', icon: <GatewayOutlined />, category: 'landscape' },
];

// --- Ribbon toolbar items ---
const ribbonGroups = [
    {
        label: 'Asset Management',
        items: [
            { key: 'addRack', label: 'Add\nRack', icon: <PlusOutlined /> },
            { key: 'placeServer', label: 'Place\nServer', icon: <HddOutlined /> },
            { key: 'networkPatch', label: 'Network\nPatch', icon: <ApartmentOutlined /> },
            { key: 'cableRoute', label: 'Cable\nRoute', icon: <NodeIndexOutlined /> },
            { key: 'inventory', label: 'Inventory', icon: <DatabaseOutlined /> },
        ]
    },
    {
        label: 'Power',
        items: [
            { key: 'totalPower', label: 'Total\nPower', icon: <FundOutlined /> },
            { key: 'temp', label: 'Temp', icon: <DashboardOutlined /> },
        ]
    },
    {
        label: 'Monitoring',
        items: [
            { key: 'powerUsage', label: 'Power\nUsage', icon: <BarChartOutlined /> },
            { key: 'dataLimit', label: 'Data\nLimit', icon: <AlertOutlined /> },
        ]
    },
    {
        label: 'Automation',
        items: [
            { key: 'networkMatch', label: 'Network\nMatch', icon: <ClusterOutlined /> },
        ]
    },
    {
        label: 'Tools',
        items: [
            { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
            { key: 'export', label: 'Export', icon: <DownloadOutlined /> },
            { key: 'import', label: 'Import', icon: <UploadOutlined /> },
        ]
    },
];

// --- Main Page Component ---

export default function Dcim3DView() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    React.useEffect(() => { setMounted(true); }, []);
    const isDark = mounted && resolvedTheme === "dark";

    const { token: antToken } = theme.useToken();
    const router = useRouter();
    const { viewMode, setViewMode, editMode, setEditMode, measureMode, setMeasureMode, transformMode, setTransformMode, racks, cracs, pdus, worldObjects, selectedRackId, setSelectedRackId, selectedServerId, setSelectedServerId } = useDcimStore();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [serverModalVisible, setServerModalVisible] = useState(false);
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('datacenter');
    const [componentSearch, setComponentSearch] = useState('');
    const [showMinimap, setShowMinimap] = useState(true);

    const selectedRack = React.useMemo(() => racks.find(r => r.id === selectedRackId) || null, [racks, selectedRackId]);
    const selectedCrac = React.useMemo(() => cracs.find(c => c.id === selectedRackId) || null, [cracs, selectedRackId]);
    const selectedPdu = React.useMemo(() => pdus.find(p => p.id === selectedRackId) || null, [pdus, selectedRackId]);
    const selectedWorldObj = React.useMemo(() => worldObjects.find(o => o.id === selectedRackId) || null, [worldObjects, selectedRackId]);
    const selectedServer = React.useMemo(() => selectedRack?.servers.find(s => s.id === selectedServerId) || null, [selectedRack, selectedServerId]);
    
    const selectedItem = selectedRack || selectedCrac || selectedPdu || selectedWorldObj;

    // Total metrics
    const totalPower = useMemo(() => racks.reduce((sum, r) => sum + r.power, 0), [racks]);
    const avgTemp = useMemo(() => racks.length ? (racks.reduce((sum, r) => sum + r.temp, 0) / racks.length).toFixed(1) : '0', [racks]);

    React.useEffect(() => {
        if (selectedRackId) setDrawerVisible(true);
    }, [selectedRackId]);

    React.useEffect(() => {
        if (selectedServerId) setServerModalVisible(true);
        else setServerModalVisible(false);
    }, [selectedServerId]);

    const handleExport = () => {
        const state = useDcimStore.getState();
        const data = {
            racks: state.racks,
            cracs: state.cracs,
            pdus: state.pdus,
            pods: state.pods,
            worldObjects: state.worldObjects,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dcim_world.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const state = useDcimStore.getState();
                if (data.racks) state.setRacks(data.racks);
                if (data.cracs) state.setCracs(data.cracs);
                if (data.pdus) state.setPdus(data.pdus);
                if (data.pods) state.setPods(data.pods);
                if (data.worldObjects) state.setWorldObjects(data.worldObjects);
                message.success('Scene imported successfully!');
            } catch (err) {
                message.error('Failed to parse JSON file');
            }
        };
        reader.readAsText(file);
    };

    const handleAddComponent = (key: string) => {
        const store = useDcimStore.getState();
        store.setEditMode(true);
        switch (key) {
            case 'rack':
            case 'addRack':
                store.addRack({ id: `RACK-NEW-${Date.now()}`, name: `New Rack`, x: 0, z: 0, totalU: 42, usedU: 0, temp: 24, power: 0, status: 'normal', servers: [] });
                message.success('Rack added!');
                break;
            case 'server':
            case 'placeServer':
                store.addWorldObject({ id: `S1U-NEW-${Date.now()}`, type: 'server1u', x: 0, z: 0 });
                message.success('1U Server added!');
                break;
            case 'server2u':
                store.addWorldObject({ id: `S2U-NEW-${Date.now()}`, type: 'server2u', x: 0, z: 0 });
                message.success('2U Server added!');
                break;
            case 'pdu':
                store.addPdu({ id: `PDU-NEW-${Date.now()}`, name: `New PDU`, x: 0, z: 0, power: 0, status: 'normal' });
                message.success('PDU added!');
                break;
            case 'switch':
                store.addWorldObject({ id: `SW-NEW-${Date.now()}`, type: 'networkSwitch', x: 0, z: 0 });
                message.success('Network Switch added!');
                break;
            case 'crac':
                store.addCrac({ id: `CRAC-NEW-${Date.now()}`, name: `New CRAC`, x: 0, z: 0, status: 'normal' });
                message.success('CRAC Unit added!');
                break;
            case 'cableTray':
            case 'cableRoute':
                store.addWorldObject({ id: `CABLE-NEW-${Date.now()}`, type: 'cableTray', x: 0, z: 0 });
                message.success('Cable Tray added!');
                break;
            case 'pipe':
                store.addWorldObject({ id: `PIPE-NEW-${Date.now()}`, type: 'pipe', x: 0, z: 0, material: 'metal' });
                message.success('Pipe added!');
                break;
            case 'wall':
                store.addWorldObject({ id: `WALL-NEW-${Date.now()}`, type: 'wall', x: 0, z: 0 });
                message.success('Wall added!');
                break;
            case 'pillar':
                store.addWorldObject({ id: `PILLAR-NEW-${Date.now()}`, type: 'pillar', x: 0, z: 0 });
                message.success('Pillar added!');
                break;
            case 'generator':
                store.addWorldObject({ id: `GEN-NEW-${Date.now()}`, type: 'generator', x: 0, z: 0 });
                message.success('Generator added!');
                break;
            case 'tree':
                store.addWorldObject({ id: `TREE-NEW-${Date.now()}`, type: 'tree', x: 0, z: 0 });
                message.success('Tree added!');
                break;
        }
    };

    const handleRibbonClick = (key: string) => {
        switch (key) {
            case 'addRack':
            case 'placeServer':
            case 'cableRoute':
            case 'networkPatch':
                handleAddComponent(key);
                break;
            case 'inventory':
                router.push('/admin/inventory');
                break;
            case 'totalPower':
            case 'powerUsage':
                setViewMode('Power');
                break;
            case 'temp':
                setViewMode('Thermal');
                break;
            case 'dataLimit':
                setViewMode('Utilization');
                break;
            case 'networkMatch':
                setViewMode('Network');
                break;
            case 'settings':
                router.push('/admin/settings');
                break;
            case 'export':
                handleExport();
                break;
            case 'import':
                document.getElementById('import-file')?.click();
                break;
        }
    };

    // Project Explorer tree data
    const treeData = [
        {
            title: 'Global Sites',
            key: 'global',
            icon: <FolderOutlined />,
            children: [
                {
                    title: 'Asia Pacific',
                    key: 'apac',
                    icon: <FolderOutlined />,
                    children: [
                        {
                            title: 'Nusantara DC',
                            key: 'ndc',
                            icon: <DatabaseOutlined />,
                            children: [
                                {
                                    title: 'Floor 1',
                                    key: 'f1',
                                    icon: <FolderOutlined />,
                                    children: [
                                        {
                                            title: 'Room A',
                                            key: 'room-a',
                                            icon: <FolderOutlined />,
                                            children: [
                                                { title: `Racks (${racks.length})`, key: 'racks', icon: <AppstoreOutlined /> },
                                                { title: `Servers`, key: 'servers', icon: <HddOutlined /> },
                                                { title: `Power Distribution (${pdus.length})`, key: 'power-dist', icon: <ThunderboltOutlined /> },
                                                { title: `Cooling Units (${cracs.length})`, key: 'cooling', icon: <CloudServerOutlined /> },
                                            ]
                                        },
                                        { title: 'Room B', key: 'room-b', icon: <FolderOutlined /> },
                                    ]
                                },
                            ]
                        },
                    ]
                },
            ]
        }
    ];

    const filteredComponents = componentItems.filter(c =>
        c.label.toLowerCase().includes(componentSearch.toLowerCase())
    );

    // Color scheme
    const bgPrimary = isDark ? '#0a0a0a' : '#f5f5f5';
    const bgSidebar = isDark ? '#111111' : '#ffffff';
    const bgPanel = isDark ? '#141414' : '#fafafa';
    const bgHeader = isDark ? '#0d0d0d' : '#ffffff';
    const borderColor = isDark ? '#222' : '#e0e0e0';
    const textPrimary = isDark ? '#e0e0e0' : '#1a1a1a';
    const textSecondary = isDark ? '#888' : '#666';
    const accentColor = themeColor || '#1668dc';

    return (
        <CMSLayout 
            title={<AuroraText>3D Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="Data Center Interactive Visualization" speed={60} />}
        >
            <input type="file" id="import-file" style={{ display: 'none' }} accept=".json" onChange={handleImport} />

            {/* ===== FULL CAD WORKSPACE ===== */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: 'calc(100vh - 140px)', 
                overflow: 'hidden', 
                background: bgPrimary,
                margin: '-24px -24px 0 -24px',
            }}>
                
                {/* === TOP: Navigation Tabs === */}
                <div style={{ 
                    background: bgHeader, 
                    borderBottom: `1px solid ${borderColor}`,
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    height: 36,
                    gap: 8,
                    flexShrink: 0
                }}>

                    {['Data Center', 'Asset Management', 'Power', 'Cooling', 'Monitoring', 'Automation', 'Tools'].map(tab => (
                        <div
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                            style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: activeTab === tab.toLowerCase().replace(' ', '-') ? accentColor : textSecondary,
                                borderBottom: activeTab === tab.toLowerCase().replace(' ', '-') ? `2px solid ${accentColor}` : '2px solid transparent',
                                fontWeight: activeTab === tab.toLowerCase().replace(' ', '-') ? 600 : 400,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {tab}
                        </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Tooltip title="Location">
                            <Button type="text" size="small" icon={<EnvironmentOutlined />} onClick={() => setLocationModalVisible(true)} />
                        </Tooltip>
                        <Tooltip title="Settings">
                            <Button type="text" size="small" icon={<SettingOutlined />} />
                        </Tooltip>
                    </div>
                </div>

                {/* === RIBBON TOOLBAR === */}
                <div style={{ 
                    background: bgPanel,
                    borderBottom: `1px solid ${borderColor}`,
                    padding: '6px 12px',
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-end',
                    flexShrink: 0,
                    overflowX: 'auto',
                }}>
                    {ribbonGroups.map(group => (
                        <div key={group.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 4 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                                {group.items.map(item => (
                                    <Tooltip key={item.key} title={item.label.replace('\n', ' ')}>
                                        <div
                                            onClick={() => handleRibbonClick(item.key)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                minWidth: 48,
                                                height: 52,
                                                transition: 'background 0.15s',
                                                background: 'transparent',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#222' : '#e8e8e8')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <span style={{ fontSize: 18, color: textPrimary }}>{item.icon}</span>
                                            <span style={{ fontSize: 9, color: textSecondary, textAlign: 'center', lineHeight: '12px', marginTop: 2, whiteSpace: 'pre-line' }}>{item.label}</span>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                            <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, borderTop: `1px solid ${borderColor}`, paddingTop: 2, width: '100%', textAlign: 'center' }}>
                                {group.label}
                            </div>
                        </div>
                    ))}
                    
                    {/* Separator */}
                    <div style={{ width: 1, height: 50, background: borderColor, margin: '0 8px', flexShrink: 0 }} />
                    
                    {/* View Mode & Edit Mode in ribbon */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['Normal', 'Thermal', 'Power', 'Utilization', 'Network'].map(mode => (
                                <Tooltip key={mode} title={`${mode} View`}>
                                    <div
                                        onClick={() => setViewMode(mode as any)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            background: viewMode === mode ? accentColor : 'transparent',
                                            color: viewMode === mode ? '#fff' : textSecondary,
                                            fontWeight: viewMode === mode ? 600 : 400,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {mode}
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                        <div style={{ fontSize: 9, color: textSecondary, borderTop: `1px solid ${borderColor}`, paddingTop: 2, width: '100%', textAlign: 'center' }}>
                            View Mode
                        </div>
                    </div>

                    <div style={{ width: 1, height: 50, background: borderColor, margin: '0 8px', flexShrink: 0 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Switch 
                            checkedChildren={<EditOutlined />} 
                            unCheckedChildren="Edit" 
                            checked={editMode} 
                            onChange={setEditMode}
                            style={{ marginTop: 4 }}
                        />
                        <div style={{ fontSize: 9, color: textSecondary, borderTop: `1px solid ${borderColor}`, paddingTop: 2, width: '100%', textAlign: 'center' }}>
                            Build
                        </div>
                    </div>
                </div>

                {/* === MAIN WORKSPACE: LEFT SIDEBAR + 3D VIEWPORT + RIGHT PANEL === */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    
                    {/* === LEFT SIDEBAR === */}
                    <div style={{ 
                        width: 240, 
                        flexShrink: 0, 
                        background: bgSidebar, 
                        borderRight: `1px solid ${borderColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                        {/* Project Explorer */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '8px 4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>Project Explorer</span>
                                <Button type="text" size="small" icon={<ExpandOutlined style={{ fontSize: 10 }} />} />
                            </div>
                            <Tree
                                treeData={treeData}
                                defaultExpandAll
                                showIcon
                                blockNode
                                style={{ fontSize: 12, background: 'transparent' }}
                            />
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: borderColor }} />

                        {/* Component Library */}
                        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>Component Library</span>
                                <Button type="text" size="small" icon={<PlusOutlined style={{ fontSize: 10 }} />} />
                            </div>
                            <Input
                                placeholder="Search components..."
                                prefix={<SearchOutlined style={{ color: textSecondary }} />}
                                size="small"
                                value={componentSearch}
                                onChange={e => setComponentSearch(e.target.value)}
                                style={{ marginBottom: 8 }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                                {filteredComponents.map(comp => (
                                    <div
                                        key={comp.key}
                                        onClick={() => handleAddComponent(comp.key)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 4px',
                                            borderRadius: 6,
                                            border: `1px solid ${borderColor}`,
                                            cursor: 'pointer',
                                            background: isDark ? '#1a1a1a' : '#fff',
                                            transition: 'all 0.15s',
                                            minHeight: 64,
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = accentColor;
                                            e.currentTarget.style.background = isDark ? '#1e1e2e' : '#f0f5ff';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = borderColor;
                                            e.currentTarget.style.background = isDark ? '#1a1a1a' : '#fff';
                                        }}
                                    >
                                        <span style={{ fontSize: 20, color: textPrimary, marginBottom: 4 }}>{comp.icon}</span>
                                        <span style={{ fontSize: 9, color: textSecondary, textAlign: 'center', lineHeight: '11px' }}>{comp.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* === CENTER: 3D VIEWPORT === */}
                    <div style={{ flex: 1, position: 'relative', background: isDark ? '#050505' : '#e5e5e5' }}>
                        
                        {/* 3D Canvas */}
                        <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                            <Canvas 
                                camera={{ position: [15, 18, 15], fov: 50 }} 
                                shadows
                                gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
                            >
                                <color attach="background" args={[isDark ? '#1a1a2e' : '#f5f5f5']} />
                                <fog attach="fog" args={[isDark ? '#1a1a2e' : '#f5f5f5', 40, 80]} />
                                
                                <DataCenterScene />
                                
                                <EffectComposer multisampling={0}>
                                    <SMAA />
                                </EffectComposer>

                                <OrbitControls 
                                    makeDefault 
                                    enabled={useDcimStore((s) => s.orbitEnabled)}
                                    minPolarAngle={0.1} 
                                    maxPolarAngle={Math.PI / 2 - 0.02}
                                    maxDistance={50}
                                    minDistance={3}
                                    target={[0, 0, 0]}
                                />
                            </Canvas>
                        </Suspense>

                        {/* Status Bar Overlay (top center) */}
                        <div style={{ 
                            position: 'absolute', 
                            top: 8, 
                            left: '50%', 
                            transform: 'translateX(-50%)', 
                            display: 'flex', 
                            gap: 24,
                            background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(12px)',
                            padding: '6px 20px',
                            borderRadius: 8,
                            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                            zIndex: 5,
                        }}>
                            <span style={{ fontSize: 12, color: textSecondary }}>Total Power: <strong style={{ color: accentColor }}>{(totalPower * 0.15).toFixed(1)} MW</strong></span>
                            <span style={{ fontSize: 12, color: textSecondary }}>Cooling Load: <strong style={{ color: '#52c41a' }}>65%</strong></span>
                            <span style={{ fontSize: 12, color: textSecondary }}>PUE: <strong style={{ color: '#faad14' }}>1.12</strong></span>
                        </div>

                        {/* View Cube (top right of viewport) */}
                        <div style={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(8px)',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                            fontSize: 11,
                            color: textSecondary,
                            zIndex: 5,
                            cursor: 'pointer',
                        }}>
                            <EyeOutlined /> View Cube
                        </div>

                        {/* Left-side tool controls */}
                        <div style={{ 
                            position: 'absolute', 
                            top: 8, 
                            left: 8, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 4,
                            zIndex: 5,
                        }}>
                            {/* Zoom controls */}
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 2,
                                background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: 6,
                                border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                                padding: 2,
                            }}>
                                <Button type="text" size="small" icon={<ZoomInOutlined />} style={{ width: 28, height: 28 }} />
                                <Button type="text" size="small" icon={<ZoomOutOutlined />} style={{ width: 28, height: 28 }} />
                                <div style={{ height: 1, background: borderColor, margin: '0 4px' }} />
                                <Button type="text" size="small" icon={<ExpandOutlined />} style={{ width: 28, height: 28 }} />
                            </div>
                            
                            {/* Transform tools */}
                            {editMode && (
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: 2,
                                    background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: 6,
                                    border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                                    padding: 2,
                                }}>
                                    <Tooltip title="Translate" placement="right">
                                        <Button 
                                            type={!measureMode && transformMode === 'translate' ? "primary" : "text"} 
                                            size="small" 
                                            icon={<DragOutlined />} 
                                            style={{ width: 28, height: 28 }}
                                            onClick={() => { setMeasureMode(false); setTransformMode('translate'); }}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Rotate" placement="right">
                                        <Button 
                                            type={!measureMode && transformMode === 'rotate' ? "primary" : "text"} 
                                            size="small" 
                                            icon={<SyncOutlined />} 
                                            style={{ width: 28, height: 28 }}
                                            onClick={() => { setMeasureMode(false); setTransformMode('rotate'); }}
                                        />
                                    </Tooltip>
                                    <div style={{ height: 1, background: borderColor, margin: '0 4px' }} />
                                    <Tooltip title="Measure" placement="right">
                                        <Button 
                                            type={measureMode ? "primary" : "text"} 
                                            size="small" 
                                            icon={<SlidersOutlined />} 
                                            style={{ width: 28, height: 28 }}
                                            onClick={() => {
                                                const store = useDcimStore.getState();
                                                store.setMeasureMode(!store.measureMode);
                                                if (!store.measureMode) message.info('Measurement tool activated. Click twice on the floor.');
                                            }}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Grid Snap" placement="right">
                                        <Button 
                                            type={useDcimStore.getState().snapToGrid ? "primary" : "text"} 
                                            size="small" 
                                            icon={<AppstoreOutlined />} 
                                            style={{ width: 28, height: 28 }}
                                            onClick={() => useDcimStore.getState().setSnapToGrid(!useDcimStore.getState().snapToGrid)}
                                        />
                                    </Tooltip>
                                </div>
                            )}
                        </div>

                        {/* Minimap overlay (bottom-left) */}
                        {showMinimap && (
                            <div style={{
                                position: 'absolute',
                                bottom: 8,
                                left: 8,
                                width: 180,
                                height: 180,
                                zIndex: 5,
                                borderRadius: 8,
                                overflow: 'hidden',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                                background: isDark ? '#111' : '#f0f0f0'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '2px 8px', background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', zIndex: 1, fontSize: 10, fontWeight: 600, backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Minimap</span>
                                    <span style={{ cursor: 'pointer', fontSize: 10, color: textSecondary }} onClick={() => setShowMinimap(false)}>✕</span>
                                </div>
                                <FloorPlanCanvas onRackClick={setSelectedRackId} />
                            </div>
                        )}

                        {/* Legend (bottom-right) */}
                        {viewMode !== 'Normal' && (
                            <div style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                zIndex: 5,
                                background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(12px)',
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                                color: textPrimary,
                                fontSize: 11,
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>{viewMode} Legend</div>
                                {viewMode === 'Thermal' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#ff4d4f', borderRadius: 3 }}/> &gt; 29°C (Critical)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#faad14', borderRadius: 3 }}/> 25-29°C (Warning)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 3 }}/> &lt; 25°C (Normal)</div>
                                    </>
                                )}
                                {viewMode === 'Utilization' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#ff4d4f', borderRadius: 3 }}/> &gt; 80% Used</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 3 }}/> 50-80% Used</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#d9d9d9', borderRadius: 3 }}/> &lt; 50% Used</div>
                                    </>
                                )}
                                {viewMode === 'Power' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#722ed1', borderRadius: 3 }}/> &gt; 7 kW</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><div style={{ width: 12, height: 12, background: '#108ee9', borderRadius: 3 }}/> 4-7 kW</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#87d068', borderRadius: 3 }}/> &lt; 4 kW</div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* === RIGHT PANEL: Properties & Inspector === */}
                    <div style={{
                        width: 280,
                        flexShrink: 0,
                        background: bgSidebar,
                        borderLeft: `1px solid ${borderColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                    }}>
                        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, fontWeight: 600, fontSize: 13, color: textPrimary }}>
                            Properties &amp; Inspector
                        </div>
                        
                        {selectedItem ? (
                            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Item Header */}
                                <div style={{ 
                                    background: isDark ? '#1a1a1a' : '#f0f5ff', 
                                    padding: '10px 12px', 
                                    borderRadius: 8,
                                    border: `1px solid ${isDark ? '#2a2a2a' : '#d6e4ff'}`
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: accentColor, marginBottom: 8 }}>
                                        {selectedRack?.name || selectedCrac?.name || selectedPdu?.name || selectedWorldObj?.type || 'Selected'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: textSecondary }}>ID</span>
                                            <span style={{ color: textPrimary, fontWeight: 500 }}>{selectedItem.id}</span>
                                        </div>
                                        {selectedRack && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: textSecondary }}>Model</span>
                                                    <span style={{ color: textPrimary }}>APC NetShelter SX</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: textSecondary }}>U-count</span>
                                                    <span style={{ color: textPrimary }}>{selectedRack.totalU}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Fields */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Dynamic Fields</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                                        {selectedRack && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${isDark ? '#1e1e1e' : '#f0f0f0'}` }}>
                                                    <span style={{ color: textSecondary }}>Power Usage</span>
                                                    <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedRack.power} kW</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${isDark ? '#1e1e1e' : '#f0f0f0'}` }}>
                                                    <span style={{ color: textSecondary }}>Temperature</span>
                                                    <span style={{ color: selectedRack.temp > 29 ? '#ff4d4f' : textPrimary, fontWeight: 600 }}>{selectedRack.temp}°C</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                    <span style={{ color: textSecondary }}>U-Space</span>
                                                    <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedRack.totalU - selectedRack.usedU} Available</span>
                                                </div>
                                            </>
                                        )}
                                        {selectedCrac && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                    <span style={{ color: textSecondary }}>Status</span>
                                                    <Badge status={selectedCrac.status === 'normal' ? 'success' : 'error'} text={selectedCrac.status.toUpperCase()} />
                                                </div>
                                            </>
                                        )}
                                        {selectedPdu && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                    <span style={{ color: textSecondary }}>Power Load</span>
                                                    <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedPdu.power} kW</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                                    <span style={{ color: textSecondary }}>Status</span>
                                                    <Badge status={selectedPdu.status === 'normal' ? 'success' : 'error'} text={selectedPdu.status.toUpperCase()} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                {editMode && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <Button size="small" style={{ flex: 1 }} onClick={() => {
                                            const store = useDcimStore.getState();
                                            if (selectedRackId?.startsWith('CRAC-')) {
                                                const crac = store.cracs.find(c => c.id === selectedRackId);
                                                if (crac) store.updateCracPosition(crac.id, crac.x, crac.z, (crac.rotationY || 0) + Math.PI / 2);
                                            } else if (selectedRackId?.startsWith('PDU-')) {
                                                const pdu = store.pdus.find(p => p.id === selectedRackId);
                                                if (pdu) store.updatePduPosition(pdu.id, pdu.x, pdu.z, (pdu.rotationY || 0) + Math.PI / 2);
                                            } else {
                                                const rack = store.racks.find(r => r.id === selectedRackId);
                                                if (rack) store.updateRackPosition(rack.id, rack.x, rack.z, (rack.rotationY || 0) + Math.PI / 2);
                                            }
                                        }}>
                                            Rotate 90°
                                        </Button>
                                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => {
                                            const store = useDcimStore.getState();
                                            if (selectedRackId?.startsWith('CRAC-')) store.removeCrac(selectedRackId);
                                            else if (selectedRackId?.startsWith('PDU-')) store.removePdu(selectedRackId);
                                            else if (selectedRackId) store.removeRack(selectedRackId);
                                            store.setSelectedRackId(null);
                                        }} />
                                    </div>
                                )}

                                {/* Open Detail */}
                                <Button type="default" size="small" block onClick={() => setDrawerVisible(true)}>
                                    Open Full Details →
                                </Button>
                            </div>
                        ) : (
                            <div style={{ padding: 16, color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 24 }}>
                                <EyeOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block', opacity: 0.3 }} />
                                Select an object in the 3D viewport to inspect its properties
                            </div>
                        )}

                        {/* Monitoring Graphs (always visible) */}
                        <div style={{ 
                            padding: 12, 
                            borderTop: `1px solid ${borderColor}`,
                            marginTop: 'auto',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Monitoring Graphs</div>
                            
                            {/* Power Graph */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: textPrimary, fontWeight: 500, marginBottom: 4 }}>Power</div>
                                <div style={{ height: 50, background: isDark ? '#0d0d0d' : '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={powerData}>
                                            <defs>
                                                <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="v" stroke={accentColor} fill="url(#powerGrad)" strokeWidth={1.5} dot={false} />
                                            <YAxis hide domain={['auto', 'auto']} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Temp Graph */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: textPrimary, fontWeight: 500, marginBottom: 4 }}>Temp</div>
                                <div style={{ height: 50, background: isDark ? '#0d0d0d' : '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={tempData}>
                                            <defs>
                                                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#faad14" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#faad14" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="v" stroke="#faad14" fill="url(#tempGrad)" strokeWidth={1.5} dot={false} />
                                            <YAxis hide domain={['auto', 'auto']} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Air Flow Graph */}
                            <div>
                                <div style={{ fontSize: 11, color: textPrimary, fontWeight: 500, marginBottom: 4 }}>Air Flow</div>
                                <div style={{ height: 50, background: isDark ? '#0d0d0d' : '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={airflowData}>
                                            <defs>
                                                <linearGradient id="airGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="v" stroke="#52c41a" fill="url(#airGrad)" strokeWidth={1.5} dot={false} />
                                            <YAxis hide domain={['auto', 'auto']} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === BOTTOM STATUS BAR === */}
                <div style={{ 
                    height: 24, 
                    background: bgHeader, 
                    borderTop: `1px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    gap: 16,
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 10, color: textSecondary }}>Projects</span>
                    <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>UX</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: textSecondary }}>Racks: {racks.length}</span>
                    <span style={{ fontSize: 10, color: textSecondary }}>Objects: {worldObjects.length}</span>
                    <span style={{ fontSize: 10, color: textSecondary }}>Mode: {editMode ? 'Edit' : 'View'}</span>
                </div>
            </div>

            {/* ===== DRAWERS (kept from original) ===== */}

            {/* Right Drawer for Rack Details */}
            <Drawer
                title={
                    selectedRack ? `Rack Details: ${selectedRack.name}` : 
                    selectedCrac ? `CRAC Unit: ${selectedCrac.name}` : 
                    selectedPdu ? `PDU Details: ${selectedPdu.name}` : 
                    'Details'
                }
                placement="right"
                onClose={() => { setDrawerVisible(false); setSelectedRackId(null); }}
                open={drawerVisible}
                size={450}
                styles={{ body: { paddingBottom: 80 } }}
                extra={
                    (selectedRack || selectedCrac || selectedPdu)?.status !== 'normal' && 
                    <Badge status={(selectedRack || selectedCrac || selectedPdu)?.status === 'critical' ? 'error' : 'warning'} text={(selectedRack || selectedCrac || selectedPdu)?.status?.toUpperCase()} />
                }
            >
                {selectedRack && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="ID">{selectedRack.id}</Descriptions.Item>
                            <Descriptions.Item label="Size">{selectedRack.totalU}U</Descriptions.Item>
                            <Descriptions.Item label="Power Feed A">PDU-A-01</Descriptions.Item>
                            <Descriptions.Item label="Power Feed B">PDU-B-01</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Live Telemetry" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={2} size="small">
                                <Descriptions.Item label="Temperature">
                                    <span style={{ color: selectedRack.temp > 29 ? '#ff4d4f' : 'inherit', fontWeight: 'bold' }}>{selectedRack.temp}°C</span>
                                </Descriptions.Item>
                                <Descriptions.Item label="Power Draw">
                                    <span style={{ fontWeight: 'bold' }}>{selectedRack.power} kW</span>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong>Server List (U-Slot Diagram)</strong>
                                <span>{selectedRack.usedU} U / {selectedRack.totalU} U</span>
                            </div>
                            <Progress 
                                percent={Math.round((selectedRack.usedU / selectedRack.totalU) * 100)} 
                                strokeColor={themeColor} 
                                status={selectedRack.usedU / selectedRack.totalU > 0.8 ? 'exception' : 'normal'}
                                style={{ marginBottom: 16 }}
                            />
                            
                            <div style={{ 
                                display: 'flex', flexDirection: 'column-reverse', 
                                border: `1px solid ${isDark ? '#333' : '#d9d9d9'}`, 
                                borderRadius: 8, overflow: 'hidden',
                                background: isDark ? '#141414' : '#fff'
                            }}>
                                {Array.from({ length: selectedRack.totalU }).map((_, i) => {
                                    const uSlot = i + 1;
                                    const server = selectedRack.servers.find(s => uSlot >= s.uSlot && uSlot < s.uSlot + s.uHeight);
                                    const isServerBase = server?.uSlot === uSlot;
                                    if (server && !isServerBase) return null;
                                    return (
                                        <div 
                                            key={uSlot}
                                            style={{
                                                height: server ? server.uHeight * 30 : 30,
                                                borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`,
                                                display: 'flex',
                                                alignItems: 'stretch',
                                                cursor: server ? 'pointer' : 'default',
                                                background: server ? (selectedServerId === server.id ? (isDark ? '#177ddc' : '#e6f7ff') : (isDark ? '#1f1f1f' : '#fafafa')) : 'transparent'
                                            }}
                                            onClick={() => server && setSelectedServerId(server.id)}
                                        >
                                            <div style={{ width: 40, borderRight: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>
                                                U{uSlot}
                                            </div>
                                            <div style={{ flex: 1, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {server ? (
                                                    <>
                                                        <span style={{ fontWeight: 600 }}>{server.name}</span>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: '#888' }}>{server.ip}</span>
                                                            <Badge status={server.status === 'critical' ? 'error' : server.status === 'warning' ? 'warning' : 'success'} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#aaa', fontSize: 12 }}>Empty Slot</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <Button type="primary" icon={<ToolOutlined />} onClick={() => router.push('/admin/pm')} block>View Maintenance Work Orders</Button>
                    </div>
                )}
                {selectedCrac && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="ID">{selectedCrac.id}</Descriptions.Item>
                            <Descriptions.Item label="Status">{selectedCrac.status.toUpperCase()}</Descriptions.Item>
                        </Descriptions>
                        <Card size="small" title="Cooling Telemetry" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Supply Temp">18.5°C</Descriptions.Item>
                                <Descriptions.Item label="Return Temp">26.2°C</Descriptions.Item>
                                <Descriptions.Item label="Fan Speed">85%</Descriptions.Item>
                            </Descriptions>
                        </Card>
                        <Button type="primary" icon={<ControlOutlined />} onClick={() => router.push('/admin/bms')} block>Open HVAC Controls in BMS</Button>
                    </div>
                )}
                {selectedPdu && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="ID">{selectedPdu.id}</Descriptions.Item>
                            <Descriptions.Item label="Status">{selectedPdu.status.toUpperCase()}</Descriptions.Item>
                        </Descriptions>
                        <Card size="small" title="Power Telemetry" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Total Load">{selectedPdu.power} kW</Descriptions.Item>
                                <Descriptions.Item label="Capacity">200 kW</Descriptions.Item>
                                <Descriptions.Item label="Phase">3-Phase</Descriptions.Item>
                            </Descriptions>
                            <Progress percent={Math.round((selectedPdu.power / 200) * 100)} status="active" />
                        </Card>
                        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => router.push('/admin/scada')} block>View Power Grid in SCADA</Button>
                    </div>
                )}
            </Drawer>

            {/* Server Remote Console Modal / Drawer */}
            <Drawer
                title={selectedServer ? `Remote Console: ${selectedServer.name}` : 'Remote Console'}
                placement="right"
                onClose={() => setSelectedServerId(null)}
                open={serverModalVisible}
                size={600}
                zIndex={2000}
            >
                {selectedServer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                                <div style={{ fontSize: 12, color: '#888' }}>CPU Usage</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: selectedServer.cpu > 85 ? '#ff4d4f' : 'inherit' }}>{selectedServer.cpu}%</div>
                                <Progress percent={selectedServer.cpu} showInfo={false} size="small" status={selectedServer.cpu > 85 ? 'exception' : 'active'} />
                            </Card>
                            <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                                <div style={{ fontSize: 12, color: '#888' }}>Memory (RAM)</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{selectedServer.ram}%</div>
                                <Progress percent={selectedServer.ram} showInfo={false} size="small" />
                            </Card>
                        </div>
                        
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="IP Address">{selectedServer.ip}</Descriptions.Item>
                            <Descriptions.Item label="Power">{selectedServer.power} W</Descriptions.Item>
                            <Descriptions.Item label="Temp">
                                <span style={{ color: selectedServer.temp > 35 ? '#ff4d4f' : 'inherit' }}>{selectedServer.temp}°C</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="U-Slot">U{selectedServer.uSlot} ({selectedServer.uHeight}U)</Descriptions.Item>
                        </Descriptions>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>SSH Terminal</div>
                            <div style={{ 
                                flex: 1, 
                                background: '#000', 
                                color: '#0f0', 
                                padding: 16, 
                                borderRadius: 8, 
                                fontFamily: 'monospace',
                                overflowY: 'auto'
                            }}>
                                <div>Connecting to {selectedServer.ip}...</div>
                                <div>Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-89-generic x86_64)</div>
                                <br/>
                                <div> * Documentation:  https://help.ubuntu.com</div>
                                <div> * Management:     https://landscape.canonical.com</div>
                                <div> * Support:        https://ubuntu.com/advantage</div>
                                <br/>
                                <div>System information as of {new Date().toUTCString()}</div>
                                <br/>
                                <div>System load:  {((selectedServer.cpu / 100) * 4).toFixed(2)}               Processes:             142</div>
                                <div>Usage of /:   42.1% of 100GB   Users logged in:       1</div>
                                <div>Memory usage: {selectedServer.ram}%              IPv4 address for eth0: {selectedServer.ip}</div>
                                <br/>
                                <div>root@{selectedServer.name.toLowerCase()}:~# <span style={{ animation: 'blink 1s step-end infinite' }}>_</span></div>
                                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
                            </div>
                        </div>
                        <Button type="primary" icon={<ExperimentOutlined />} onClick={() => router.push('/admin/ai-studio')} block style={{ marginTop: 'auto' }}>Launch AI Diagnostics</Button>
                    </div>
                )}
            </Drawer>

            {/* Location Drawer */}
            <Drawer
                title="Geographic Location"
                placement="bottom"
                size={500}
                onClose={() => setLocationModalVisible(false)}
                open={locationModalVisible}
            >
                <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                    <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: `1px solid ${isDark ? '#333' : '#e5e5e5'}` }}>
                        <iframe 
                            src="https://maps.google.com/maps?q=37.3860517,-122.0838511&z=15&output=embed" 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Card size="small" title="Facility Information" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Name">Nusantarasoft Silicon Valley</Descriptions.Item>
                                <Descriptions.Item label="Tier">Tier III Certified</Descriptions.Item>
                                <Descriptions.Item label="Power Capacity">15 MW</Descriptions.Item>
                                <Descriptions.Item label="Security">Biometric + 24/7 Guards</Descriptions.Item>
                                <Descriptions.Item label="Cooling">Chilled Water (N+1)</Descriptions.Item>
                            </Descriptions>
                        </Card>
                        <Card size="small" title="Address" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <div>1600 Amphitheatre Parkway</div>
                            <div>Mountain View, CA 94043</div>
                            <div>United States</div>
                        </Card>
                    </div>
                </div>
            </Drawer>
        </CMSLayout>
    );
}
