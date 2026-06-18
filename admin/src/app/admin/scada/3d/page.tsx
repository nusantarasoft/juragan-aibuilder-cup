"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Typography, Space, Segmented, Divider } from "antd";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';
import { useHmiStore } from "@/store/useHmiStore";
import { useScada3dStore } from "@/store/useScada3dStore";
import { useScadaStore } from "@/store/useScadaStore";
import { useSimulation } from "@/store/useSimulation";
import ScadaPalette from "../hmi/ScadaPalette";
import ScadaCanvas from "../hmi/ScadaCanvas";
import ScadaProperties from "../hmi/ScadaProperties";
import ScadaToolbar from "./ScadaToolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const Scada3DScene = dynamic(() => import('./Scada3DScene'), { ssr: false });
const ScadaMap = dynamic(() => import('./ScadaMap'), { ssr: false });

const { Text, Title } = Typography;

export default function ScadaUnified() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    // 3D Scene States
    const [animateFlow, setAnimateFlow] = useState(true);
    const [thermalMode, setThermalMode] = useState(false);
    const [alarmActive, setAlarmActive] = useState(false);
    
    // HMI States
    const { isEditMode, setEditMode, clearSelection: clear2dSelection, selectedIds: selected2dIds } = useHmiStore();
    const [sceneEditMode, setSceneEditMode] = useState(false);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [showWireframe, setShowWireframe] = useState(false);
    
    // 3D Store
    const { elements: elements3d, addElement: add3dElement, duplicateElement, deleteElement, undo, redo } = useScada3dStore();
    const [selected3dId, setSelected3dId] = useState<string | null>(null);

    // Global Data Binding Store
    const { tags, sites, currentSiteId, setSelectedSource } = useScadaStore();
    const currentSite = sites.find(s => s.id === currentSiteId);
    
    // Run Simulation
    useSimulation(animateFlow);

    // View Mode
    const [activeView, setActiveView] = useState<string>('3d');

    // Synchronize selection
    useEffect(() => {
        if (selected3dId) {
            clear2dSelection();
            setSelectedSource(selected3dId);
        } else if (selected2dIds.length > 0) {
            setSelectedSource(selected2dIds[0]);
        } else {
            setSelectedSource(null);
        }
    }, [selected3dId, selected2dIds, elements3d, clear2dSelection, setSelectedSource]);

    const clearGlobalSelection = () => {
        clear2dSelection();
        setSelected3dId(null);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if focused on input
            if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
            
            if (e.key === 'Escape') { clearGlobalSelection(); return; }
            if (!sceneEditMode) return;
            
            if (e.key === 'g' || e.key === 'G') { setTransformMode('translate'); return; }
            if (e.key === 'r' && !e.ctrlKey) { setTransformMode('rotate'); return; }
            if (e.key === 's' && !e.ctrlKey) { setTransformMode('scale'); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') { if (selected3dId) deleteElement(selected3dId); return; }
            if (e.ctrlKey && e.key === 'd') { e.preventDefault(); if (selected3dId) duplicateElement(selected3dId); return; }
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo(); return; }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sceneEditMode, selected3dId, deleteElement, duplicateElement, undo, redo]);

    const glassStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}`,
        borderRadius: 12,
    };

    const statusColor = (s: string) => s === 'healthy' ? '#52c41a' : s === 'warning' ? '#faad14' : '#f5222d';

    return (
        <CMSLayout 
            title={<AuroraText>SCADA Command Center</AuroraText>}
            subTitle={<DecryptedText text={`Site: ${currentSite?.name || 'N/A'} — 3D CAD / HMI / GIS`} speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', gap: 0 }}>
                
                {/* CAD Toolbar */}
                <div style={{ marginBottom: 8 }}>
                    <ScadaToolbar
                        editMode={sceneEditMode}
                        setEditMode={setSceneEditMode}
                        transformMode={transformMode}
                        setTransformMode={setTransformMode}
                        selectedId={selected3dId}
                        animateFlow={animateFlow}
                        setAnimateFlow={setAnimateFlow}
                        thermalMode={thermalMode}
                        setThermalMode={setThermalMode}
                        alarmActive={alarmActive}
                        setAlarmActive={setAlarmActive}
                        snapToGrid={snapToGrid}
                        setSnapToGrid={setSnapToGrid}
                        showWireframe={showWireframe}
                        setShowWireframe={setShowWireframe}
                    />
                </div>

                {/* Main Resizable Layout */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ResizablePanelGroup direction="horizontal" style={{ height: '100%' }}>
                        
                        {/* Left: Library/Palette */}
                        <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                            <div style={{ ...glassStyle, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '10px 12px 6px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                                    <Text strong style={{ fontSize: 13 }}>📦 Component Library</Text>
                                </div>
                                <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
                                    <ScadaPalette />
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Center: View Panels */}
                        <ResizablePanel defaultSize={60} minSize={40}>
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                
                                {/* View Tabs */}
                                <div style={{ ...glassStyle, padding: '6px 12px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Segmented
                                        value={activeView}
                                        onChange={(val) => setActiveView(val as string)}
                                        options={[
                                            { label: '🗺️ Map', value: 'map' },
                                            { label: '🧊 3D Scene', value: '3d' },
                                            { label: '📐 HMI Canvas', value: 'hmi' },
                                        ]}
                                        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                                    />
                                    <Space>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(currentSite?.status || 'healthy') }} />
                                            <Text type="secondary" style={{ fontSize: 11 }}>{currentSite?.name} • {currentSite?.tier} • PUE {currentSite?.pue}</Text>
                                        </div>
                                    </Space>
                                </div>

                                {/* Active View Content */}
                                <ResizablePanelGroup direction="vertical" style={{ flex: 1 }}>
                                    <ResizablePanel defaultSize={activeView === 'hmi' ? 0 : (activeView === 'map' ? 100 : 65)} minSize={0}>
                                        <div style={{ ...glassStyle, height: '100%', borderRadius: '0', overflow: 'hidden', position: 'relative' }}>
                                            {activeView === 'map' && <ScadaMap />}
                                            {activeView === '3d' && (
                                                <div
                                                    style={{ width: '100%', height: '100%' }}
                                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const type = e.dataTransfer.getData('scada-3d-type');
                                                        if (type) {
                                                            add3dElement({
                                                                type: type as any,
                                                                position: [0, 0, 0],
                                                                rotation: [0, 0, 0],
                                                                scale: [1, 1, 1],
                                                                properties: { name: `New ${type}` }
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Scada3DScene 
                                                        onSelect={setSelected3dId} 
                                                        animateFlow={animateFlow} 
                                                        thermalMode={thermalMode}
                                                        alarmActive={alarmActive}
                                                        editMode={sceneEditMode}
                                                        transformMode={transformMode}
                                                        selectedId={selected3dId}
                                                        showWireframe={showWireframe}
                                                    />
                                                </div>
                                            )}
                                            {activeView === 'hmi' && <ScadaCanvas />}
                                        </div>
                                    </ResizablePanel>

                                    {activeView === '3d' && (
                                        <>
                                            <ResizableHandle withHandle />
                                            <ResizablePanel defaultSize={35} minSize={15}>
                                                <div style={{ ...glassStyle, height: '100%', borderRadius: '0 0 12px 12px', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{ padding: '6px 12px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Text strong style={{ fontSize: 12 }}>📐 HMI Canvas</Text>
                                                        <Space size="small">
                                                            <Segmented 
                                                                size="small"
                                                                options={[{label:'View', value:'view'},{label:'Edit', value:'edit'}]}
                                                                value={isEditMode ? 'edit' : 'view'}
                                                                onChange={(v) => setEditMode(v === 'edit')}
                                                            />
                                                        </Space>
                                                    </div>
                                                    <div style={{ height: 'calc(100% - 36px)' }}>
                                                        <ScadaCanvas />
                                                    </div>
                                                </div>
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Right: Properties & Telemetry */}
                        <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
                            <div style={{ ...glassStyle, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '10px 12px 6px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                                    <Text strong style={{ fontSize: 13 }}>📊 Properties & Telemetry</Text>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                                    {/* Live Tags */}
                                    <Text strong style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>Live SCADA Tags</Text>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                                        {Object.values(tags).map(tag => (
                                            <div key={tag.id} style={{ 
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '4px 8px', 
                                                background: tag.alarm ? 'rgba(245, 34, 45, 0.15)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'), 
                                                borderRadius: 6, 
                                                borderLeft: `3px solid ${tag.alarm ? '#f5222d' : themeColor}`,
                                                transition: 'all 0.3s'
                                            }}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{tag.name}</Text>
                                                <Text strong style={{ fontSize: 12, color: tag.alarm ? '#f5222d' : 'inherit', fontFamily: 'monospace' }}>
                                                    {typeof tag.value === 'boolean' ? (tag.value ? 'ON' : 'OFF') : tag.value} {tag.unit}
                                                </Text>
                                            </div>
                                        ))}
                                    </div>

                                    <Divider style={{ margin: '8px 0' }} />
                                    
                                    {/* Properties */}
                                    <Text strong style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>Selected Object</Text>
                                    <ScadaProperties selected3dId={selected3dId} />
                                </div>
                            </div>
                        </ResizablePanel>

                    </ResizablePanelGroup>
                </div>

                {/* Status Bar */}
                <div style={{ 
                    ...glassStyle, 
                    padding: '4px 16px', 
                    marginTop: 6, 
                    borderRadius: 8,
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: 11,
                }}>
                    <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />}>
                        <Text type="secondary">Grid Snap: <Text strong>{snapToGrid ? 'ON' : 'OFF'}</Text></Text>
                        <Text type="secondary">Mode: <Text strong>{sceneEditMode ? transformMode.toUpperCase() : 'VIEW'}</Text></Text>
                        <Text type="secondary">Objects: <Text strong>{elements3d.length}</Text></Text>
                    </Space>
                    <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />}>
                        <Text type="secondary">Selected: <Text strong style={{ color: selected3dId ? themeColor : 'inherit' }}>{selected3dId || 'None'}</Text></Text>
                        <Text type="secondary">Site: <Text strong style={{ color: statusColor(currentSite?.status || 'healthy') }}>{currentSite?.name}</Text></Text>
                        <Text type="secondary">Flow: <Text strong style={{ color: animateFlow ? '#52c41a' : '#aaa' }}>{animateFlow ? 'ACTIVE' : 'STOPPED'}</Text></Text>
                    </Space>
                </div>

            </motion.div>
        </CMSLayout>
    );
}
