"use client";

import React, { useState, useEffect } from "react";
import { theme, Typography, Space, Segmented, Divider, Button, ConfigProvider } from "antd";
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
import ScadaOutliner from "./ScadaOutliner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeftOutlined, WindowsOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const Scada3DScene = dynamic(() => import('./Scada3DScene'), { ssr: false });
const ScadaMap = dynamic(() => import('./ScadaMap'), { ssr: false });

const { Text } = Typography;

export default function ScadaUnified() {
    const router = useRouter();
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

    // --- UE5 / Revit Styles ---
    const bgColor = '#1e1e1e';
    const panelBg = '#252526';
    const borderColor = '#3e3e42';
    const headerBg = '#2d2d30';
    const textColor = '#cccccc';
    const accentColor = '#007acc';

    const panelStyle: React.CSSProperties = {
        background: panelBg,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        background: headerBg,
        borderBottom: `1px solid ${borderColor}`,
        padding: '4px 12px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none'
    };

    const statusColor = (s: string) => s === 'healthy' ? '#52c41a' : s === 'warning' ? '#faad14' : '#f5222d';

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorBgBase: '#1e1e1e', colorBgContainer: '#252526', colorBorder: '#3e3e42', borderRadius: 2 } }}>
        <div style={{ width: '100vw', height: '100vh', background: bgColor, color: textColor, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Top Menu Ribbon */}
            <div style={{ height: 28, background: '#1e1e1e', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/scada')} style={{ color: '#aaa', padding: 0 }} />
                    <Divider type="vertical" style={{ borderColor: '#333' }} />
                    <WindowsOutlined style={{ color: accentColor, marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Nusantarasoft Engine 5</Text>
                    <Divider type="vertical" style={{ borderColor: '#333' }} />
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">File</Text>
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">Edit</Text>
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">Window</Text>
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">Tools</Text>
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">Build</Text>
                    <Text style={{ fontSize: 12, cursor: 'pointer', color: '#ccc' }} className="menu-item">Help</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(currentSite?.status || 'healthy') }} />
                    <Text style={{ fontSize: 11, color: '#aaa' }}>{currentSite?.name} • PUE {currentSite?.pue}</Text>
                </div>
                <style>{`.menu-item:hover { color: #fff !important; background: rgba(255,255,255,0.1); border-radius: 4px; }`}</style>
            </div>

            {/* Main Toolbar */}
            <div style={{ background: panelBg, borderBottom: `1px solid ${borderColor}`, padding: '4px 8px' }}>
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

            {/* Main Editor Layout */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {/* @ts-ignore */}
                <ResizablePanelGroup direction="horizontal">
                    
                    {/* Left: Place Actors / Library */}
                    <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                        <div style={{ ...panelStyle, height: '100%', borderRight: 'none' }}>
                            <div style={headerStyle}>
                                <span>Place Actors</span>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
                                <ScadaPalette />
                            </div>
                        </div>
                    </ResizablePanel>

                    {/* @ts-ignore */}
                    <ResizableHandle style={{ width: 4, background: borderColor }} />

                    {/* Center: Viewports */}
                    <ResizablePanel defaultSize={65} minSize={40}>
                        {/* @ts-ignore */}
                        <ResizablePanelGroup direction="vertical">
                            {/* Top Viewport: 3D Scene */}
                            <ResizablePanel defaultSize={70} minSize={20}>
                                <div style={{ ...panelStyle, height: '100%', borderRight: 'none', borderLeft: 'none' }}>
                                    <div style={{ ...headerStyle, background: '#1e1e1e', borderBottom: 'none', position: 'absolute', zIndex: 10, opacity: 0.8, borderRadius: '0 0 4px 0' }}>
                                        <span>Perspective</span>
                                    </div>
                                    <div
                                        style={{ width: '100%', height: '100%', background: '#000' }}
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
                                </div>
                            </ResizablePanel>

                            {/* @ts-ignore */}
                            <ResizableHandle style={{ height: 4, background: borderColor }} />

                            {/* Bottom Viewport: Map & HMI */}
                            <ResizablePanel defaultSize={30} minSize={15}>
                                {/* @ts-ignore */}
                                <ResizablePanelGroup direction="horizontal">
                                    <ResizablePanel defaultSize={25} minSize={15}>
                                        <div style={{ ...panelStyle, height: '100%', borderRight: 'none', borderLeft: 'none', borderBottom: 'none' }}>
                                            <div style={headerStyle}>
                                                <span>Location Map</span>
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <ScadaMap />
                                            </div>
                                        </div>
                                    </ResizablePanel>

                                    {/* @ts-ignore */}
                                    <ResizableHandle style={{ width: 4, background: borderColor }} />

                                    <ResizablePanel defaultSize={75} minSize={30}>
                                        <div style={{ ...panelStyle, height: '100%', borderRight: 'none', borderBottom: 'none' }}>
                                            <div style={headerStyle}>
                                                <span>HMI Logic Canvas</span>
                                                <Segmented 
                                                    size="small"
                                                    options={[{label:'View', value:'view'},{label:'Edit', value:'edit'}]}
                                                    value={isEditMode ? 'edit' : 'view'}
                                                    onChange={(v) => setEditMode(v === 'edit')}
                                                    style={{ background: '#1e1e1e' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1, position: 'relative', background: '#111' }}>
                                                <ScadaCanvas />
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>

                    {/* @ts-ignore */}
                    <ResizableHandle style={{ width: 4, background: borderColor }} />

                    {/* Right: Outliner & Details */}
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                        {/* @ts-ignore */}
                        <ResizablePanelGroup direction="vertical">
                            {/* Top Half: Outliner */}
                            <ResizablePanel defaultSize={40} minSize={20}>
                                <div style={{ ...panelStyle, height: '100%', borderLeft: 'none' }}>
                                    <div style={headerStyle}>
                                        <span>Outliner</span>
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden', background: '#1e1e1e' }}>
                                        <ScadaOutliner selectedId={selected3dId} onSelect={setSelected3dId} />
                                    </div>
                                </div>
                            </ResizablePanel>

                            {/* @ts-ignore */}
                            <ResizableHandle style={{ height: 4, background: borderColor }} />

                            {/* Bottom Half: Details */}
                            <ResizablePanel defaultSize={60} minSize={20}>
                                <div style={{ ...panelStyle, height: '100%', borderLeft: 'none', borderBottom: 'none' }}>
                                    <div style={headerStyle}>
                                        <span>Details</span>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px', background: '#1e1e1e' }}>
                                        <ScadaProperties selected3dId={selected3dId} />
                                    </div>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>

            {/* Status Bar / Output Log footer */}
            <div style={{ height: 24, background: headerBg, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', fontSize: 11, color: '#888' }}>
                <Space split={<Divider type="vertical" style={{ margin: '0 4px', borderColor: '#444' }} />}>
                    <span>Grid Snap: <strong style={{ color: '#ccc' }}>{snapToGrid ? 'ON' : 'OFF'}</strong></span>
                    <span>Transform: <strong style={{ color: '#ccc' }}>{sceneEditMode ? transformMode.toUpperCase() : 'VIEW'}</strong></span>
                    <span>Objects: <strong style={{ color: '#ccc' }}>{elements3d.length}</strong></span>
                </Space>
                <Space split={<Divider type="vertical" style={{ margin: '0 4px', borderColor: '#444' }} />}>
                    <span>Selected: <strong style={{ color: selected3dId ? accentColor : '#ccc' }}>{selected3dId || 'None'}</strong></span>
                    <span>Simulation: <strong style={{ color: animateFlow ? '#52c41a' : '#888' }}>{animateFlow ? 'RUNNING' : 'STOPPED'}</strong></span>
                </Space>
            </div>

        </div>
        </ConfigProvider>
    );
}
