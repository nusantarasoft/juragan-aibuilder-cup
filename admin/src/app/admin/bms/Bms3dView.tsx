import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, SoftShadows, Box, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Spin, Button, Input, InputNumber, Select, Card, Space, Divider, Typography, Row, Col } from 'antd';
import { DeleteOutlined, SaveOutlined, ReloadOutlined, CameraOutlined, PlusOutlined } from '@ant-design/icons';
import DraggableModel from '@/components/3d/DraggableModel';
import { LightingSystem, FireSafetySystem, SecurityDoor, HVACDuct } from '@/components/bms/BmsComponents';

const { Text, Title } = Typography;

export type BmsItemType = 'zone' | 'hvac' | 'door' | 'lighting' | 'fire';

export interface BmsItem {
    id: string;
    type: BmsItemType;
    position: [number, number, number];
    rotation?: [number, number, number];
    label?: string;
    temp?: number;
    color?: string;
    isOpen?: boolean;
    isLocked?: boolean;
}

const DEFAULT_ITEMS: BmsItem[] = [
    { id: 'ZONE-1', type: 'zone', position: [0, 0.1, 0], label: 'Ground Floor (HQ)', temp: 22.5, color: '#52c41a' },
    { id: 'ZONE-2', type: 'zone', position: [0, 4.1, 0], label: '2nd Floor (Data Center)', temp: 19.0, color: '#1890ff' },
    { id: 'ZONE-3', type: 'zone', position: [0, 8.1, 0], label: '3rd Floor (Cafeteria)', temp: 24.2, color: '#faad14' },
    { id: 'HVAC-1', type: 'hvac', position: [-4, 12, -4] },
    { id: 'HVAC-2', type: 'hvac', position: [4, 12, 4] },
    { id: 'DOOR-1', type: 'door', position: [0, 0, 10.1], rotation: [0, 0, 0], isOpen: false, isLocked: false },
    { id: 'DOOR-2', type: 'door', position: [0, 4.1, 0], rotation: [0, Math.PI/2, 0], isOpen: true, isLocked: false },
    { id: 'DOOR-3', type: 'door', position: [0, 8.1, 0], rotation: [0, Math.PI/2, 0], isOpen: true, isLocked: false },
    { id: 'LIGHT-1', type: 'lighting', position: [0, 3.8, 0] },
    { id: 'LIGHT-2', type: 'lighting', position: [0, 7.8, 0] },
    { id: 'LIGHT-3', type: 'lighting', position: [0, 11.8, 0] },
    { id: 'FIRE-1', type: 'fire', position: [0, 3.8, 0] },
    { id: 'FIRE-2', type: 'fire', position: [0, 7.8, 0] },
    { id: 'FIRE-3', type: 'fire', position: [0, 11.8, 0] }
];

const HVACFan = ({ position, rotation, isRunning, isDark }: { position: [number,number,number], rotation?: [number,number,number], isRunning: boolean, isDark: boolean }) => {
    const fanRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (isRunning && fanRef.current) {
            fanRef.current.rotation.z -= 0.15;
        }
    });

    return (
        <group position={position} rotation={rotation || [0,0,0]}>
            <mesh position={[0, -1, 0]} castShadow>
                <boxGeometry args={[3, 2, 3]} />
                <meshStandardMaterial color={isDark ? "#555" : "#ccc"} />
            </mesh>
            <Box args={[1.2, 1.2, 0.4]} castShadow>
                <meshStandardMaterial color="#444" roughness={0.7} />
            </Box>
            <group ref={fanRef} position={[0, 0, 0.25]}>
                <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[0, -0.35, 0]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
            </group>
        </group>
    );
};

const SmartZone = ({ position, size, label, temp, color }: { position: [number,number,number], size: [number,number], label: string, temp: number, color: string }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                <planeGeometry args={size} />
                <meshStandardMaterial color={color} transparent opacity={0.3} />
            </mesh>
            <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
                <div style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', borderLeft: `3px solid ${color}`, backdropFilter: 'blur(4px)' }}>
                    <div><strong>{label}</strong></div>
                    <div style={{ fontSize: 11 }}>{temp}°C</div>
                </div>
            </Html>
        </group>
    );
};

const BuildingStructure = ({ activeLayer, isDark }: { activeLayer: string, isDark: boolean }) => {
    const columns = [-9.5, 0, 9.5];
    const glassColor = isDark ? "#1a2a3a" : "#e0f0ff";
    
    return (
        <group>
            <mesh position={[0, -0.1, 0]} receiveShadow>
                <boxGeometry args={[40, 0.2, 40]} />
                <meshStandardMaterial color={isDark ? "#222" : "#999"} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.05, 0]} receiveShadow>
                <boxGeometry args={[22, 0.1, 22]} />
                <meshStandardMaterial color={isDark ? "#333" : "#bbb"} roughness={0.9} />
            </mesh>
            {[0, 4, 8, 12].map((y, i) => (
                <mesh key={`floor-${i}`} position={[0, y, 0]} receiveShadow castShadow>
                    <boxGeometry args={[20, 0.2, 20]} />
                    <meshStandardMaterial color={isDark ? "#333" : "#ccc"} roughness={0.9} />
                </mesh>
            ))}
            {columns.map((x) => 
                columns.map((z) => (
                    <mesh key={`col-${x}-${z}`} position={[x, 6, z]} castShadow>
                        <cylinderGeometry args={[0.3, 0.3, 12, 16]} />
                        <meshStandardMaterial color={isDark ? "#444" : "#ddd"} metalness={0.2} roughness={0.7} />
                    </mesh>
                ))
            )}
            {(activeLayer === 'All' || activeLayer === 'HVAC' || activeLayer === 'Lighting' || activeLayer === 'Fire' || activeLayer === 'Security') && (
                <group>
                    <mesh position={[0, 6, 10]} castShadow><boxGeometry args={[20, 12, 0.1]} /><meshPhysicalMaterial color={glassColor} transmission={0.95} opacity={1} transparent roughness={0.1} metalness={0.1} thickness={0.5} /></mesh>
                    <mesh position={[0, 6, -10]} castShadow><boxGeometry args={[20, 12, 0.1]} /><meshPhysicalMaterial color={glassColor} transmission={0.95} opacity={1} transparent roughness={0.1} metalness={0.1} thickness={0.5} /></mesh>
                    <mesh position={[10, 6, 0]} castShadow><boxGeometry args={[0.1, 12, 20]} /><meshPhysicalMaterial color={glassColor} transmission={0.95} opacity={1} transparent roughness={0.1} metalness={0.1} thickness={0.5} /></mesh>
                    <mesh position={[-10, 6, 0]} castShadow><boxGeometry args={[0.1, 12, 20]} /><meshPhysicalMaterial color={glassColor} transmission={0.95} opacity={1} transparent roughness={0.1} metalness={0.1} thickness={0.5} /></mesh>
                </group>
            )}
        </group>
    );
};

export type BmsLayer = 'All' | 'HVAC' | 'Fire' | 'Security' | 'Lighting';

export default function Bms3dView({ isDark, editMode = false, activeLayer = 'All' }: { isDark: boolean, editMode?: boolean, activeLayer?: BmsLayer }) {
    const [items, setItems] = useState<BmsItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isOrthographic, setIsOrthographic] = useState(false);
    
    // Simulations
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isLightingOn, setIsLightingOn] = useState(true);

    // Load from local storage or defaults
    useEffect(() => {
        const saved = localStorage.getItem('bms_cad_layout');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                setItems(DEFAULT_ITEMS);
            }
        } else {
            setItems(DEFAULT_ITEMS);
        }
    }, []);

    const saveLayout = () => {
        localStorage.setItem('bms_cad_layout', JSON.stringify(items));
        alert('Layout saved successfully!');
    };

    const resetLayout = () => {
        setItems(DEFAULT_ITEMS);
        localStorage.removeItem('bms_cad_layout');
    };

    const handleSelect = (id: string) => {
        if (editMode) setSelectedId(id);
    };

    const handlePositionChange = (id: string, pos: [number,number,number]) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, position: pos } : item));
    };

    const updateItem = (id: string, updates: Partial<BmsItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const deleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const spawnItem = (type: BmsItemType) => {
        const newItem: BmsItem = {
            id: `${type.toUpperCase()}-${Date.now()}`,
            type,
            position: [0, 12.1, 0], // Spawn on roof by default to be visible
            label: `New ${type}`,
            temp: 22.0,
            color: '#888'
        };
        setItems(prev => [...prev, newItem]);
        setSelectedId(newItem.id);
    };

    const selectedItem = items.find(i => i.id === selectedId);

    return (
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
            
            {/* --- CAD Editor UI Overlay --- */}
            {editMode && (
                <>
                    {/* Toolbar */}
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
                        <Button type="primary" icon={<SaveOutlined />} onClick={saveLayout}>Save Layout</Button>
                        <Button icon={<ReloadOutlined />} onClick={resetLayout}>Reset</Button>
                        <Button icon={<CameraOutlined />} onClick={() => setIsOrthographic(!isOrthographic)}>
                            {isOrthographic ? '3D View' : 'Blueprint'}
                        </Button>
                    </div>

                    {/* Catalog Panel */}
                    <Card size="small" title="Asset Catalog" style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, width: 220, background: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button block icon={<PlusOutlined />} onClick={() => spawnItem('zone')}>Smart Zone</Button>
                            <Button block icon={<PlusOutlined />} onClick={() => spawnItem('hvac')}>HVAC Unit</Button>
                            <Button block icon={<PlusOutlined />} onClick={() => spawnItem('door')}>Security Door</Button>
                            <Button block icon={<PlusOutlined />} onClick={() => spawnItem('lighting')}>Lighting Node</Button>
                            <Button block icon={<PlusOutlined />} onClick={() => spawnItem('fire')}>Fire Node</Button>
                        </Space>
                    </Card>

                    {/* Inspector Panel */}
                    {selectedItem && (
                        <Card size="small" title="Inspector" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, width: 260, background: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary">ID:</Text> <Text strong>{selectedItem.id}</Text>
                            </div>
                            
                            {selectedItem.type === 'zone' && (
                                <>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text>Label</Text>
                                        <Input size="small" value={selectedItem.label} onChange={e => updateItem(selectedItem.id, { label: e.target.value })} />
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text>Temperature</Text>
                                        <InputNumber size="small" style={{ width: '100%' }} value={selectedItem.temp} onChange={v => updateItem(selectedItem.id, { temp: v || 20 })} />
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text>Color</Text>
                                        <Input size="small" type="color" value={selectedItem.color} onChange={e => updateItem(selectedItem.id, { color: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {selectedItem.type === 'door' && (
                                <div style={{ marginBottom: 8 }}>
                                    <Text>Rotation Y (Deg)</Text>
                                    <InputNumber size="small" style={{ width: '100%' }} value={(selectedItem.rotation?.[1] || 0) * (180/Math.PI)} onChange={v => updateItem(selectedItem.id, { rotation: [0, (v || 0) * (Math.PI/180), 0] })} />
                                </div>
                            )}

                            <Divider style={{ margin: '12px 0' }} />
                            <Row gutter={8}>
                                <Col span={8}><InputNumber size="small" value={Math.round(selectedItem.position[0]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [v||0, selectedItem.position[1], selectedItem.position[2]] })} placeholder="X" /></Col>
                                <Col span={8}><InputNumber size="small" value={Math.round(selectedItem.position[1]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [selectedItem.position[0], v||0, selectedItem.position[2]] })} placeholder="Y" /></Col>
                                <Col span={8}><InputNumber size="small" value={Math.round(selectedItem.position[2]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [selectedItem.position[0], selectedItem.position[1], v||0] })} placeholder="Z" /></Col>
                            </Row>
                            
                            <Button danger block icon={<DeleteOutlined />} style={{ marginTop: 12 }} onClick={() => deleteItem(selectedItem.id)}>Delete</Button>
                        </Card>
                    )}
                </>
            )}

            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                <Canvas shadows onPointerMissed={() => editMode && setSelectedId(null)}>
                    {isOrthographic ? (
                        <OrthographicCamera makeDefault position={[0, 40, 0]} zoom={20} near={0.1} far={1000} />
                    ) : (
                        <PerspectiveCamera makeDefault position={[25, 20, 25]} fov={45} />
                    )}

                    <color attach="background" args={[isDark ? '#020205' : '#cce0ff']} />
                    
                    <ambientLight intensity={activeLayer === 'Lighting' || activeLayer === 'All' ? (isDark ? 0.2 : 0.5) : (isDark ? 0.6 : 1.0)} />
                    <directionalLight position={[15, 25, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={50} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} />
                    <SoftShadows size={15} samples={16} focus={0.5} />
                    
                    <BuildingStructure activeLayer={activeLayer} isDark={isDark} />
                    
                    <group>
                        {items.map(item => {
                            // Filter by active layer
                            if (activeLayer !== 'All') {
                                if (item.type === 'hvac' && activeLayer !== 'HVAC') return null;
                                if (item.type === 'fire' && activeLayer !== 'Fire') return null;
                                if (item.type === 'lighting' && activeLayer !== 'Lighting') return null;
                                if (item.type === 'door' && activeLayer !== 'Security') return null;
                            }

                            return (
                                <DraggableModel key={item.id} id={item.id} position={item.position} rotation={item.rotation} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                                    {item.type === 'zone' && <SmartZone position={[0, 0, 0]} size={[16, 16]} label={item.label || ''} temp={item.temp || 20} color={activeLayer === 'HVAC' ? "#52c41a" : (item.color || "#888")} />}
                                    {item.type === 'hvac' && <HVACFan position={[0, 1, 0]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} isDark={isDark} />}
                                    {item.type === 'door' && <SecurityDoor position={[0, 0, 0]} rotation={[0, 0, 0]} isOpen={item.isOpen || false} isLocked={isAlarmActive} />}
                                    {item.type === 'lighting' && <LightingSystem position={[0, 0, 0]} isOn={isLightingOn} />}
                                    {item.type === 'fire' && <FireSafetySystem position={[0, 0, 0]} isAlarmActive={isAlarmActive} />}
                                </DraggableModel>
                            );
                        })}
                    </group>

                    {/* Simulation Controls - only show when not in edit mode to avoid UI clutter */}
                    {!editMode && (
                        <Html position={[-20, 15, 0]} center zIndexRange={[100, 0]}>
                            <div style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, color: isDark ? '#fff' : '#000', backdropFilter: 'blur(8px)', border: `1px solid ${isDark ? '#333' : '#ddd'}`, minWidth: 160 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, borderBottom: `1px solid ${isDark ? '#444' : '#ccc'}`, paddingBottom: 4 }}>Simulations</div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isAlarmActive} onChange={(e) => setIsAlarmActive(e.target.checked)} />
                                    Trigger Fire Alarm
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isLightingOn} onChange={(e) => setIsLightingOn(e.target.checked)} />
                                    Master Lighting
                                </label>
                            </div>
                        </Html>
                    )}

                    <OrbitControls makeDefault maxPolarAngle={isOrthographic ? Math.PI : Math.PI/2 - 0.05} target={[0, 6, 0]} />
                    <Environment preset="city" />
                </Canvas>
            </Suspense>
        </div>
    );
}

