import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, SoftShadows, Box, PerspectiveCamera, OrthographicCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Spin, Button, Input, InputNumber, Card, Space, Divider, Typography, Row, Col, Switch, Tooltip, Segmented, Collapse, Badge, Tag } from 'antd';
import {
    DeleteOutlined, SaveOutlined, ReloadOutlined, CameraOutlined, PlusOutlined, LinkOutlined,
    DragOutlined, RotateRightOutlined, ExpandOutlined, CopyOutlined, EyeOutlined, EyeInvisibleOutlined,
    AppstoreOutlined, BuildOutlined, ThunderboltOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import DraggableModel from '@/components/3d/DraggableModel';
import { LightingSystem, FireSafetySystem, SecurityDoor, HVACDuct } from '@/components/bms/BmsComponents';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BmsItemType =
    | 'wall' | 'glass_wall' | 'floor_slab' | 'column' | 'staircase' | 'elevator_shaft' | 'roof'
    | 'zone' | 'hvac' | 'ahu' | 'duct'
    | 'door' | 'cctv' | 'smoke_detector' | 'sprinkler'
    | 'lighting' | 'fire'
    | 'furniture_desk' | 'furniture_chair' | 'server_rack' | 'planter';

export interface BmsItem {
    id: string;
    type: BmsItemType;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    label?: string;
    temp?: number;
    color?: string;
    isOpen?: boolean;
    isLocked?: boolean;
    visible?: boolean;
}

// ─── Catalog Definition ──────────────────────────────────────────────────────

interface CatalogEntry {
    type: BmsItemType;
    label: string;
    category: 'architecture' | 'bms' | 'sensors' | 'furniture';
    defaultScale?: [number, number, number];
    defaultColor?: string;
}

const CATALOG: CatalogEntry[] = [
    // Architecture
    { type: 'wall', label: 'Solid Wall', category: 'architecture', defaultScale: [8, 4, 0.3], defaultColor: '#b0b0b0' },
    { type: 'glass_wall', label: 'Glass Wall', category: 'architecture', defaultScale: [8, 4, 0.15], defaultColor: '#b0d8f0' },
    { type: 'floor_slab', label: 'Floor Slab', category: 'architecture', defaultScale: [20, 0.25, 20], defaultColor: '#999' },
    { type: 'column', label: 'Column', category: 'architecture', defaultScale: [0.6, 4, 0.6], defaultColor: '#bbb' },
    { type: 'staircase', label: 'Staircase', category: 'architecture', defaultScale: [3, 4, 6], defaultColor: '#888' },
    { type: 'elevator_shaft', label: 'Elevator Shaft', category: 'architecture', defaultScale: [3, 4, 3], defaultColor: '#666' },
    { type: 'roof', label: 'Roof Panel', category: 'architecture', defaultScale: [20, 0.15, 20], defaultColor: '#555' },
    // BMS
    { type: 'zone', label: 'Smart Zone', category: 'bms', defaultScale: [1, 1, 1], defaultColor: '#52c41a' },
    { type: 'hvac', label: 'HVAC Unit', category: 'bms', defaultScale: [1, 1, 1] },
    { type: 'ahu', label: 'Air Handler (AHU)', category: 'bms', defaultScale: [4, 2, 2] },
    { type: 'duct', label: 'Duct Segment', category: 'bms', defaultScale: [0.5, 0.3, 6] },
    // Sensors & Access
    { type: 'door', label: 'Security Door', category: 'sensors' },
    { type: 'cctv', label: 'CCTV Camera', category: 'sensors' },
    { type: 'smoke_detector', label: 'Smoke Detector', category: 'sensors' },
    { type: 'sprinkler', label: 'Sprinkler Head', category: 'sensors' },
    { type: 'lighting', label: 'Lighting Fixture', category: 'sensors' },
    { type: 'fire', label: 'Fire Alarm Panel', category: 'sensors' },
    // Furniture & Equipment
    { type: 'furniture_desk', label: 'Office Desk', category: 'furniture', defaultScale: [1.5, 0.8, 0.8], defaultColor: '#a0774a' },
    { type: 'furniture_chair', label: 'Office Chair', category: 'furniture', defaultScale: [0.6, 1, 0.6], defaultColor: '#333' },
    { type: 'server_rack', label: 'Server Rack', category: 'furniture', defaultScale: [0.6, 2, 1], defaultColor: '#222' },
    { type: 'planter', label: 'Planter / Tree', category: 'furniture', defaultScale: [1, 1, 1], defaultColor: '#2d6a4f' },
];

// ─── Realistic Default Building ──────────────────────────────────────────────

const FLOOR_HEIGHT = 4;
const BUILDING_W = 30;
const BUILDING_D = 18;

function generateDefaultBuilding(): BmsItem[] {
    const items: BmsItem[] = [];
    let id = 0;
    const uid = (prefix: string) => `${prefix}-${++id}`;

    // Ground plane
    items.push({ id: uid('GROUND'), type: 'floor_slab', position: [0, -0.15, 0], scale: [50, 0.3, 50], color: '#666', label: 'Ground Plane' });

    // 4 floors (Ground, 1st, 2nd, 3rd)
    for (let f = 0; f < 4; f++) {
        const y = f * FLOOR_HEIGHT;
        const floorLabel = f === 0 ? 'Ground Floor' : `Floor ${f}`;

        // Floor slab
        items.push({ id: uid('FLOOR'), type: 'floor_slab', position: [0, y, 0], scale: [BUILDING_W, 0.25, BUILDING_D], color: '#c4c4c4', label: `${floorLabel} Slab` });

        // Columns (6x3 grid)
        for (const cx of [-12, -6, 0, 6, 12]) {
            for (const cz of [-7, 0, 7]) {
                items.push({ id: uid('COL'), type: 'column', position: [cx, y + FLOOR_HEIGHT/2, cz], scale: [0.5, FLOOR_HEIGHT, 0.5], color: '#d0d0d0' });
            }
        }

        // Back wall (solid concrete)
        items.push({ id: uid('WALL'), type: 'wall', position: [0, y + FLOOR_HEIGHT/2, -BUILDING_D/2], scale: [BUILDING_W, FLOOR_HEIGHT, 0.3], color: '#b8b8b8', label: `${floorLabel} Back Wall` });

        // Side walls (solid lower half, glass upper half on upper floors)
        items.push({ id: uid('WALL'), type: 'wall', position: [-BUILDING_W/2, y + FLOOR_HEIGHT/2, 0], scale: [0.3, FLOOR_HEIGHT, BUILDING_D], color: '#c0c0c0', label: `${floorLabel} Left Wall` });
        items.push({ id: uid('WALL'), type: 'wall', position: [BUILDING_W/2, y + FLOOR_HEIGHT/2, 0], scale: [0.3, FLOOR_HEIGHT, BUILDING_D], color: '#c0c0c0', label: `${floorLabel} Right Wall` });

        // Front glass curtain wall
        items.push({ id: uid('GLASS'), type: 'glass_wall', position: [0, y + FLOOR_HEIGHT/2, BUILDING_D/2], scale: [BUILDING_W, FLOOR_HEIGHT, 0.12], color: '#b8dff0', label: `${floorLabel} Front Glass` });

        // Staircase core (left side)
        items.push({ id: uid('STAIR'), type: 'staircase', position: [-12, y + FLOOR_HEIGHT/2, -5], scale: [3, FLOOR_HEIGHT, 4], label: `${floorLabel} Staircase` });

        // Elevator shaft (right of stairs)
        items.push({ id: uid('ELEV'), type: 'elevator_shaft', position: [-12, y + FLOOR_HEIGHT/2, 0], scale: [2.5, FLOOR_HEIGHT, 2.5], label: `${floorLabel} Elevator` });

        // Smart Zone
        const zoneColors = ['#52c41a', '#1890ff', '#faad14', '#ff4d4f'];
        const zoneNames = ['Lobby & Reception', 'Open Office', 'Data Center', 'Executive Suite'];
        items.push({ id: uid('ZONE'), type: 'zone', position: [3, y + 0.15, 0], label: `${floorLabel} - ${zoneNames[f]}`, temp: 20 + f * 1.5, color: zoneColors[f] });

        // Security door at entrance of each floor
        items.push({ id: uid('DOOR'), type: 'door', position: [0, y, BUILDING_D/2 + 0.1], rotation: [0, 0, 0], isOpen: f === 0, isLocked: false, label: `${floorLabel} Entrance` });

        // Lighting fixtures (evenly placed)
        for (const lx of [-6, 0, 6]) {
            for (const lz of [-4, 4]) {
                items.push({ id: uid('LIGHT'), type: 'lighting', position: [lx, y + 0.1, lz], label: `${floorLabel} Light` });
            }
        }

        // Smoke detectors
        for (const sx of [-8, 0, 8]) {
            items.push({ id: uid('SMOKE'), type: 'smoke_detector', position: [sx, y + 0.1, 0], label: `${floorLabel} Smoke Detector` });
        }

        // Sprinklers
        for (const sx of [-9, -3, 3, 9]) {
            items.push({ id: uid('SPRK'), type: 'sprinkler', position: [sx, y + 0.1, 0], label: `${floorLabel} Sprinkler` });
        }

        // CCTV (one per floor entrance, one in the back)
        items.push({ id: uid('CCTV'), type: 'cctv', position: [0, y + 3.5, BUILDING_D/2 - 1], label: `${floorLabel} Entrance Camera` });
        items.push({ id: uid('CCTV'), type: 'cctv', position: [0, y + 3.5, -BUILDING_D/2 + 1], label: `${floorLabel} Rear Camera` });
    }

    // Roof slab
    items.push({ id: uid('ROOF'), type: 'roof', position: [0, 4 * FLOOR_HEIGHT, 0], scale: [BUILDING_W + 1, 0.2, BUILDING_D + 1], color: '#555', label: 'Roof' });

    // HVAC units on roof
    items.push({ id: uid('HVAC'), type: 'hvac', position: [-6, 4 * FLOOR_HEIGHT + 0.2, -3], label: 'HVAC Unit A' });
    items.push({ id: uid('HVAC'), type: 'hvac', position: [6, 4 * FLOOR_HEIGHT + 0.2, 3], label: 'HVAC Unit B' });
    items.push({ id: uid('HVAC'), type: 'hvac', position: [0, 4 * FLOOR_HEIGHT + 0.2, 0], label: 'HVAC Unit C' });

    // AHU on roof
    items.push({ id: uid('AHU'), type: 'ahu', position: [10, 4 * FLOOR_HEIGHT + 1.2, -5], scale: [4, 2, 2], label: 'Air Handler Unit' });

    // Fire alarm panel (ground floor lobby)
    items.push({ id: uid('FIRE'), type: 'fire', position: [-3, 0.1, 7], label: 'Main Fire Alarm Panel' });

    // Furniture: Ground floor lobby
    for (let dx = -4; dx <= 4; dx += 4) {
        items.push({ id: uid('DESK'), type: 'furniture_desk', position: [dx, 0.4, 3], scale: [1.5, 0.8, 0.8], color: '#a0774a', label: 'Reception Desk' });
        items.push({ id: uid('CHAIR'), type: 'furniture_chair', position: [dx, 0.5, 4.5], scale: [0.6, 1, 0.6], color: '#333', label: 'Chair' });
    }

    // Planters at entrance
    items.push({ id: uid('PLANT'), type: 'planter', position: [-5, 0, BUILDING_D/2 + 2], label: 'Entrance Planter L' });
    items.push({ id: uid('PLANT'), type: 'planter', position: [5, 0, BUILDING_D/2 + 2], label: 'Entrance Planter R' });

    // Server racks on Floor 2 (Data Center)
    for (let sx = -6; sx <= 6; sx += 3) {
        items.push({ id: uid('RACK'), type: 'server_rack', position: [sx, 8 + 1, 0], scale: [0.6, 2, 1], color: '#1a1a1a', label: `Server Rack ${sx}` });
    }

    return items;
}

const DEFAULT_ITEMS = generateDefaultBuilding();

// ─── 3D Primitives ───────────────────────────────────────────────────────────

const ArchitecturalWall = ({ scale, color, isDark }: { scale: [number,number,number], color: string, isDark: boolean }) => (
    <mesh castShadow receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
);

const GlassWall = ({ scale, color, isDark }: { scale: [number,number,number], color: string, isDark: boolean }) => {
    const glassColor = isDark ? '#1a2a3a' : (color || '#b0d8f0');
    // Glass panels with mullions
    return (
        <group>
            <mesh castShadow>
                <boxGeometry args={scale} />
                <meshPhysicalMaterial color={glassColor} transmission={0.85} opacity={1} transparent roughness={0.05} metalness={0.1} thickness={0.3} />
            </mesh>
            {/* Horizontal mullion strips */}
            {scale[1] > 2 && (
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[scale[0], 0.04, scale[2] + 0.02]} />
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
                </mesh>
            )}
        </group>
    );
};

const FloorSlab = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh receiveShadow castShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
);

const ColumnPrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh castShadow>
        <cylinderGeometry args={[scale[0]/2, scale[0]/2, scale[1], 16]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.8} />
    </mesh>
);

const StaircasePrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => {
    const steps = 8;
    return (
        <group>
            {/* Stairwell enclosure */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={scale} />
                <meshStandardMaterial color={color || '#888'} roughness={0.9} transparent opacity={0.6} />
            </mesh>
            {/* Steps */}
            {Array.from({ length: steps }).map((_, i) => (
                <mesh key={i} position={[0, -scale[1]/2 + (i/steps) * scale[1], -scale[2]/2 + (i/steps) * scale[2]]} castShadow>
                    <boxGeometry args={[scale[0] * 0.8, 0.15, scale[2]/steps * 0.9]} />
                    <meshStandardMaterial color="#aaa" roughness={0.8} />
                </mesh>
            ))}
        </group>
    );
};

const ElevatorShaftPrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <group>
        <mesh castShadow receiveShadow>
            <boxGeometry args={scale} />
            <meshStandardMaterial color={color || '#666'} roughness={0.9} transparent opacity={0.5} />
        </mesh>
        {/* Elevator doors */}
        <mesh position={[0, 0, scale[2]/2 + 0.02]}>
            <boxGeometry args={[scale[0] * 0.6, scale[1] * 0.55, 0.05]} />
            <meshStandardMaterial color="#999" metalness={0.7} roughness={0.3} />
        </mesh>
    </group>
);

const RoofPanel = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh receiveShadow castShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color || '#555'} roughness={0.8} />
    </mesh>
);

const HVACFan = ({ position, rotation, isRunning, isDark }: { position: [number,number,number], rotation?: [number,number,number], isRunning: boolean, isDark: boolean }) => {
    const fanRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (isRunning && fanRef.current) {
            fanRef.current.rotation.z -= 0.15;
        }
    });
    return (
        <group position={position} rotation={rotation || [0,0,0]}>
            <mesh position={[0, -1, 0]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color={isDark ? "#555" : "#ccc"} /></mesh>
            <Box args={[1.2, 1.2, 0.4]} castShadow><meshStandardMaterial color="#444" roughness={0.7} /></Box>
            <group ref={fanRef} position={[0, 0, 0.25]}>
                <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[0, -0.35, 0]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
                <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}><boxGeometry args={[0.1, 0.7, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
            </group>
        </group>
    );
};

const AHUPrimitive = ({ scale, isDark }: { scale: [number,number,number], isDark: boolean }) => (
    <group>
        <mesh castShadow><boxGeometry args={scale} /><meshStandardMaterial color={isDark ? '#444' : '#aaa'} roughness={0.6} metalness={0.4} /></mesh>
        <mesh position={[scale[0]/2 - 0.3, scale[1]/4, 0]}><cylinderGeometry args={[0.4, 0.4, 0.3, 16]} /><meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} /></mesh>
    </group>
);

const DuctPrimitive = ({ scale }: { scale: [number,number,number] }) => (
    <mesh castShadow receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.6} />
    </mesh>
);

const SmartZone = ({ label, temp, color }: { label: string, temp: number, color: string }) => (
    <group>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
            <planeGeometry args={[16, 16]} />
            <meshStandardMaterial color={color} transparent opacity={0.25} />
        </mesh>
        <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
            <div style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', borderLeft: `3px solid ${color}`, backdropFilter: 'blur(6px)', fontSize: 12 }}>
                <div><strong>{label}</strong></div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{temp}°C</div>
            </div>
        </Html>
    </group>
);

const CCTVCamera = ({ isDark }: { isDark: boolean }) => (
    <group>
        <mesh castShadow><boxGeometry args={[0.3, 0.2, 0.4]} /><meshStandardMaterial color={isDark ? '#333' : '#777'} metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 0, 0.25]}><cylinderGeometry args={[0.08, 0.12, 0.3, 8]} rotation={[Math.PI/2, 0, 0]} /><meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.4]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#1890ff" emissive="#1890ff" emissiveIntensity={0.5} /></mesh>
    </group>
);

const SmokeDetectorPrimitive = () => (
    <group>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.2, 0.2, 0.1, 16]} /><meshStandardMaterial color="#eee" /></mesh>
        <mesh position={[0, 2.95, 0.15]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} /></mesh>
    </group>
);

const SprinklerPrimitive = () => (
    <group>
        <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.03, 0.03, 0.2, 8]} /><meshStandardMaterial color="#ccc" metalness={0.8} /></mesh>
        <mesh position={[0, 2.85, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.4} /></mesh>
    </group>
);

const FurnitureDesk = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <group>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[scale[0], 0.05, scale[2]]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
        {/* Legs */}
        {[[-scale[0]/2+0.05, -scale[1]/2+0.025, -scale[2]/2+0.05], [scale[0]/2-0.05, -scale[1]/2+0.025, -scale[2]/2+0.05], [-scale[0]/2+0.05, -scale[1]/2+0.025, scale[2]/2-0.05], [scale[0]/2-0.05, -scale[1]/2+0.025, scale[2]/2-0.05]].map((pos, i) => (
            <mesh key={i} position={pos as any}><boxGeometry args={[0.05, scale[1]-0.05, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
        ))}
    </group>
);

const FurnitureChair = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <group>
        <mesh position={[0, -0.15, 0]} castShadow><boxGeometry args={[scale[0], 0.06, scale[2]]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.2, -scale[2]/2+0.03]} castShadow><boxGeometry args={[scale[0], 0.5, 0.06]} /><meshStandardMaterial color={color} /></mesh>
    </group>
);

const ServerRack = ({ scale, color, isDark }: { scale: [number,number,number], color: string, isDark: boolean }) => {
    const blinkRef = useRef<THREE.MeshStandardMaterial>(null);
    useFrame(({ clock }) => {
        if (blinkRef.current) {
            blinkRef.current.emissiveIntensity = Math.sin(clock.elapsedTime * 4 + Math.random()) > 0 ? 0.8 : 0.1;
        }
    });
    return (
        <group>
            <mesh castShadow><boxGeometry args={scale} /><meshStandardMaterial color={color} roughness={0.6} metalness={0.3} /></mesh>
            {/* Front panel with blinking LED */}
            <mesh position={[0, 0, scale[2]/2 + 0.01]}>
                <boxGeometry args={[scale[0] * 0.9, scale[1] * 0.9, 0.02]} />
                <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[scale[0]/2 - 0.1, scale[1]/3, scale[2]/2 + 0.02]}>
                <sphereGeometry args={[0.03, 6, 6]} />
                <meshStandardMaterial ref={blinkRef} color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};

const PlanterPrimitive = ({ isDark }: { isDark: boolean }) => (
    <group>
        <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.5, 0.4, 0.6, 12]} /><meshStandardMaterial color="#8b7355" roughness={0.9} /></mesh>
        {/* Foliage */}
        <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.7, 8, 8]} /><meshStandardMaterial color="#2d6a4f" roughness={0.9} /></mesh>
        <mesh position={[0.3, 1, 0.2]}><sphereGeometry args={[0.5, 8, 8]} /><meshStandardMaterial color="#40916c" roughness={0.9} /></mesh>
    </group>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export type BmsLayer = 'All' | 'HVAC' | 'Fire' | 'Security' | 'Lighting';

export default function Bms3dView({ isDark, editMode = false, activeLayer = 'All' }: { isDark: boolean, editMode?: boolean, activeLayer?: BmsLayer }) {
    const router = useRouter();
    const [items, setItems] = useState<BmsItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isOrthographic, setIsOrthographic] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const [showGrid, setShowGrid] = useState(true);
    const [catalogOpen, setCatalogOpen] = useState<string[]>(['architecture']);

    // Simulations
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isLightingOn, setIsLightingOn] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('bms_cad_layout_v2');
        if (saved) {
            try { setItems(JSON.parse(saved)); } catch { setItems(DEFAULT_ITEMS); }
        } else {
            setItems(DEFAULT_ITEMS);
        }
    }, []);

    const saveLayout = () => {
        localStorage.setItem('bms_cad_layout_v2', JSON.stringify(items));
        alert('Layout saved!');
    };
    const resetLayout = () => {
        setItems(DEFAULT_ITEMS);
        localStorage.removeItem('bms_cad_layout_v2');
        setSelectedId(null);
    };
    const handleSelect = (id: string) => setSelectedId(id);

    const handleTransformChange = (id: string, type: 'position' | 'rotation' | 'scale', value: [number,number,number]) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [type]: value } : item));
    };

    const updateItem = (id: string, updates: Partial<BmsItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };
    const deleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedId === id) setSelectedId(null);
    };
    const duplicateItem = (id: string) => {
        const src = items.find(i => i.id === id);
        if (!src) return;
        const newItem: BmsItem = { ...src, id: `${src.type.toUpperCase()}-${Date.now()}`, position: [src.position[0]+2, src.position[1], src.position[2]+2] };
        setItems(prev => [...prev, newItem]);
        setSelectedId(newItem.id);
    };

    const spawnItem = (type: BmsItemType) => {
        const cat = CATALOG.find(c => c.type === type);
        const newItem: BmsItem = {
            id: `${type.toUpperCase()}-${Date.now()}`,
            type,
            position: [0, 16.2, 0],
            scale: cat?.defaultScale || [1,1,1],
            label: cat?.label || type,
            color: cat?.defaultColor || '#888',
            temp: type === 'zone' ? 22 : undefined,
        };
        setItems(prev => [...prev, newItem]);
        setSelectedId(newItem.id);
    };

    const getModuleRoute = (type: BmsItemType) => {
        if (type === 'hvac' || type === 'ahu' || type === 'duct' || type === 'zone') return '/admin/bms/hvac';
        if (type === 'door' || type === 'cctv') return '/admin/bms/access';
        if (type === 'lighting') return '/admin/bms/lighting';
        if (type === 'fire' || type === 'smoke_detector' || type === 'sprinkler') return '/admin/bms/fire';
        if (type === 'elevator_shaft') return '/admin/bms/elevator';
        return '/admin/bms';
    };
    const navigateToModule = (id: string) => {
        const item = items.find(i => i.id === id);
        if (item) router.push(getModuleRoute(item.type));
    };

    const selectedItem = items.find(i => i.id === selectedId);

    // Count by category for badges
    const countByCategory = (cat: string) => {
        const types = CATALOG.filter(c => c.category === cat).map(c => c.type);
        return items.filter(i => types.includes(i.type)).length;
    };

    const glassStyle = {
        background: isDark ? 'rgba(20,20,25,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
            
            {/* ─── CAD Editor Overlay ─── */}
            {editMode && (
                <>
                    {/* Top Toolbar */}
                    <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <Card size="small" style={{ ...glassStyle, borderRadius: 12, padding: '0 4px' }} bodyStyle={{ padding: '6px 8px' }}>
                            <Space split={<Divider type="vertical" style={{ margin: '0 4px' }} />}>
                                {/* Transform Mode */}
                                <Segmented
                                    size="small"
                                    value={transformMode}
                                    onChange={(v) => setTransformMode(v as any)}
                                    options={[
                                        { value: 'translate', icon: <Tooltip title="Move (W)"><DragOutlined /></Tooltip> },
                                        { value: 'rotate', icon: <Tooltip title="Rotate (E)"><RotateRightOutlined /></Tooltip> },
                                        { value: 'scale', icon: <Tooltip title="Scale (R)"><ExpandOutlined /></Tooltip> },
                                    ]}
                                />
                                {/* Snap */}
                                <Space size={4}>
                                    <Text style={{ fontSize: 12 }}>Snap</Text>
                                    <Switch checked={snapToGrid} onChange={setSnapToGrid} size="small" />
                                </Space>
                                {/* Grid */}
                                <Space size={4}>
                                    <Text style={{ fontSize: 12 }}>Grid</Text>
                                    <Switch checked={showGrid} onChange={setShowGrid} size="small" />
                                </Space>
                                {/* Camera */}
                                <Button size="small" icon={<CameraOutlined />} onClick={() => setIsOrthographic(!isOrthographic)}>
                                    {isOrthographic ? '3D' : 'Top'}
                                </Button>
                                {/* Actions */}
                                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveLayout}>Save</Button>
                                <Button size="small" icon={<ReloadOutlined />} onClick={resetLayout}>Reset</Button>
                            </Space>
                        </Card>
                    </div>

                    {/* Left Sidebar: Asset Catalog */}
                    <div style={{ position: 'absolute', top: 60, left: 12, zIndex: 10, width: 210, maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }}>
                        <Card size="small" title={<span><AppstoreOutlined /> Asset Catalog</span>} style={{ ...glassStyle, borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                            <Collapse
                                ghost
                                size="small"
                                activeKey={catalogOpen}
                                onChange={(keys) => setCatalogOpen(keys as string[])}
                                items={[
                                    {
                                        key: 'architecture',
                                        label: <span><BuildOutlined /> Architecture <Badge count={countByCategory('architecture')} size="small" style={{ marginLeft: 4 }} /></span>,
                                        children: (
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {CATALOG.filter(c => c.category === 'architecture').map(c => (
                                                    <Button key={c.type} block size="small" icon={<PlusOutlined />} onClick={() => spawnItem(c.type)}>{c.label}</Button>
                                                ))}
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: 'bms',
                                        label: <span><ThunderboltOutlined /> BMS Systems <Badge count={countByCategory('bms')} size="small" style={{ marginLeft: 4 }} /></span>,
                                        children: (
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {CATALOG.filter(c => c.category === 'bms').map(c => (
                                                    <Button key={c.type} block size="small" icon={<PlusOutlined />} onClick={() => spawnItem(c.type)}>{c.label}</Button>
                                                ))}
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: 'sensors',
                                        label: <span><SafetyCertificateOutlined /> Sensors & Access <Badge count={countByCategory('sensors')} size="small" style={{ marginLeft: 4 }} /></span>,
                                        children: (
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {CATALOG.filter(c => c.category === 'sensors').map(c => (
                                                    <Button key={c.type} block size="small" icon={<PlusOutlined />} onClick={() => spawnItem(c.type)}>{c.label}</Button>
                                                ))}
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: 'furniture',
                                        label: <span>🪑 Furniture & Equipment <Badge count={countByCategory('furniture')} size="small" style={{ marginLeft: 4 }} /></span>,
                                        children: (
                                            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                {CATALOG.filter(c => c.category === 'furniture').map(c => (
                                                    <Button key={c.type} block size="small" icon={<PlusOutlined />} onClick={() => spawnItem(c.type)}>{c.label}</Button>
                                                ))}
                                            </Space>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </div>

                    {/* Right Sidebar: Inspector */}
                    {selectedItem && (
                        <div style={{ position: 'absolute', top: 60, right: 12, zIndex: 10, width: 250, maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }}>
                            <Card size="small" title="Inspector" style={{ ...glassStyle, borderRadius: 12 }}>
                                <div style={{ marginBottom: 10 }}>
                                    <Tag color="blue" style={{ textTransform: 'capitalize' }}>{selectedItem.type.replace('_', ' ')}</Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{selectedItem.id}</Text>
                                </div>

                                {/* Label */}
                                <div style={{ marginBottom: 8 }}>
                                    <Text style={{ fontSize: 11 }}>Label</Text>
                                    <Input size="small" value={selectedItem.label || ''} onChange={e => updateItem(selectedItem.id, { label: e.target.value })} />
                                </div>

                                {/* Type-specific */}
                                {selectedItem.type === 'zone' && (
                                    <Row gutter={8} style={{ marginBottom: 8 }}>
                                        <Col span={12}>
                                            <Text style={{ fontSize: 11 }}>Temp (°C)</Text>
                                            <InputNumber size="small" style={{ width: '100%' }} value={selectedItem.temp} onChange={v => updateItem(selectedItem.id, { temp: v || 20 })} />
                                        </Col>
                                        <Col span={12}>
                                            <Text style={{ fontSize: 11 }}>Color</Text>
                                            <Input size="small" type="color" value={selectedItem.color || '#888'} onChange={e => updateItem(selectedItem.id, { color: e.target.value })} />
                                        </Col>
                                    </Row>
                                )}

                                {(selectedItem.type === 'wall' || selectedItem.type === 'glass_wall' || selectedItem.type === 'floor_slab' || selectedItem.type === 'roof') && (
                                    <div style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 11 }}>Color</Text>
                                        <Input size="small" type="color" value={selectedItem.color || '#888'} onChange={e => updateItem(selectedItem.id, { color: e.target.value })} />
                                    </div>
                                )}

                                {/* Position */}
                                <Divider style={{ margin: '8px 0', fontSize: 11 }}>Position</Divider>
                                <Row gutter={4} style={{ marginBottom: 6 }}>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round(selectedItem.position[0]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [v||0, selectedItem.position[1], selectedItem.position[2]] })} addonBefore={<span style={{ fontSize: 10 }}>X</span>} /></Col>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round(selectedItem.position[1]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [selectedItem.position[0], v||0, selectedItem.position[2]] })} addonBefore={<span style={{ fontSize: 10 }}>Y</span>} /></Col>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round(selectedItem.position[2]*10)/10} onChange={v => updateItem(selectedItem.id, { position: [selectedItem.position[0], selectedItem.position[1], v||0] })} addonBefore={<span style={{ fontSize: 10 }}>Z</span>} /></Col>
                                </Row>

                                {/* Scale */}
                                {selectedItem.scale && (
                                    <>
                                        <Divider style={{ margin: '8px 0', fontSize: 11 }}>Scale</Divider>
                                        <Row gutter={4} style={{ marginBottom: 6 }}>
                                            <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.scale?.[0] || 1)*10)/10} onChange={v => updateItem(selectedItem.id, { scale: [v||1, selectedItem.scale?.[1]||1, selectedItem.scale?.[2]||1] })} addonBefore={<span style={{ fontSize: 10 }}>W</span>} /></Col>
                                            <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.scale?.[1] || 1)*10)/10} onChange={v => updateItem(selectedItem.id, { scale: [selectedItem.scale?.[0]||1, v||1, selectedItem.scale?.[2]||1] })} addonBefore={<span style={{ fontSize: 10 }}>H</span>} /></Col>
                                            <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.scale?.[2] || 1)*10)/10} onChange={v => updateItem(selectedItem.id, { scale: [selectedItem.scale?.[0]||1, selectedItem.scale?.[1]||1, v||1] })} addonBefore={<span style={{ fontSize: 10 }}>D</span>} /></Col>
                                        </Row>
                                    </>
                                )}

                                {/* Actions */}
                                <Divider style={{ margin: '8px 0' }} />
                                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                    <Button size="small" block icon={<CopyOutlined />} onClick={() => duplicateItem(selectedItem.id)}>Duplicate</Button>
                                    <Button size="small" block icon={<LinkOutlined />} onClick={() => navigateToModule(selectedItem.id)}>Go to Module</Button>
                                    <Button size="small" danger block icon={<DeleteOutlined />} onClick={() => deleteItem(selectedItem.id)}>Delete</Button>
                                </Space>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {/* ─── 3D Canvas ─── */}
            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                <Canvas shadows onPointerMissed={() => setSelectedId(null)}>
                    {isOrthographic && editMode ? (
                        <OrthographicCamera makeDefault position={[0, 50, 0]} zoom={18} near={0.1} far={1000} />
                    ) : (
                        <PerspectiveCamera makeDefault position={[35, 25, 35]} fov={45} />
                    )}
                    <color attach="background" args={[isDark ? '#020205' : '#cce0ff']} />
                    <ambientLight intensity={isDark ? 0.3 : 0.6} />
                    <directionalLight position={[20, 30, 15]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={80} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
                    <directionalLight position={[-10, 15, -10]} intensity={0.3} />
                    <SoftShadows size={15} samples={16} focus={0.5} />

                    {/* Editor Grid */}
                    {editMode && showGrid && (
                        <Grid args={[100, 100]} cellSize={1} cellColor={isDark ? '#222' : '#ccc'} sectionSize={5} sectionColor={isDark ? '#444' : '#999'} fadeDistance={60} position={[0, 0.01, 0]} />
                    )}

                    {/* All Items */}
                    <group>
                        {items.map(item => {
                            if (item.visible === false) return null;

                            // Layer filtering for non-architecture items
                            if (activeLayer !== 'All' && !['wall','glass_wall','floor_slab','column','staircase','elevator_shaft','roof','furniture_desk','furniture_chair','server_rack','planter'].includes(item.type)) {
                                if (item.type === 'hvac' && activeLayer !== 'HVAC') return null;
                                if (item.type === 'ahu' && activeLayer !== 'HVAC') return null;
                                if (item.type === 'duct' && activeLayer !== 'HVAC') return null;
                                if (item.type === 'zone' && activeLayer !== 'HVAC') return null;
                                if (item.type === 'fire' && activeLayer !== 'Fire') return null;
                                if (item.type === 'smoke_detector' && activeLayer !== 'Fire') return null;
                                if (item.type === 'sprinkler' && activeLayer !== 'Fire') return null;
                                if (item.type === 'lighting' && activeLayer !== 'Lighting') return null;
                                if (item.type === 'door' && activeLayer !== 'Security') return null;
                                if (item.type === 'cctv' && activeLayer !== 'Security') return null;
                            }

                            const isSelected = selectedId === item.id;
                            const itemScale = item.scale || [1,1,1];

                            return (
                                <DraggableModel
                                    key={item.id}
                                    id={item.id}
                                    position={item.position}
                                    rotation={item.rotation}
                                    scale={item.scale}
                                    editMode={editMode}
                                    transformMode={transformMode}
                                    selectedId={selectedId}
                                    onSelect={handleSelect}
                                    onDoubleClick={navigateToModule}
                                    onTransformChange={handleTransformChange}
                                    snapToGrid={snapToGrid}
                                    gridSize={1.0}
                                >
                                    {/* Architecture */}
                                    {item.type === 'wall' && <ArchitecturalWall scale={itemScale as [number,number,number]} color={item.color || '#b0b0b0'} isDark={isDark} />}
                                    {item.type === 'glass_wall' && <GlassWall scale={itemScale as [number,number,number]} color={item.color || '#b0d8f0'} isDark={isDark} />}
                                    {item.type === 'floor_slab' && <FloorSlab scale={itemScale as [number,number,number]} color={item.color || '#c4c4c4'} />}
                                    {item.type === 'column' && <ColumnPrimitive scale={itemScale as [number,number,number]} color={item.color || '#d0d0d0'} />}
                                    {item.type === 'staircase' && <StaircasePrimitive scale={itemScale as [number,number,number]} color={item.color || '#888'} />}
                                    {item.type === 'elevator_shaft' && <ElevatorShaftPrimitive scale={itemScale as [number,number,number]} color={item.color || '#666'} />}
                                    {item.type === 'roof' && <RoofPanel scale={itemScale as [number,number,number]} color={item.color || '#555'} />}
                                    
                                    {/* BMS */}
                                    {item.type === 'zone' && <SmartZone label={item.label || ''} temp={item.temp || 20} color={item.color || '#888'} />}
                                    {item.type === 'hvac' && <HVACFan position={[0, 1, 0]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} isDark={isDark} />}
                                    {item.type === 'ahu' && <AHUPrimitive scale={itemScale as [number,number,number]} isDark={isDark} />}
                                    {item.type === 'duct' && <DuctPrimitive scale={itemScale as [number,number,number]} />}
                                    
                                    {/* Sensors & Access */}
                                    {item.type === 'door' && <SecurityDoor position={[0, 0, 0]} rotation={[0, 0, 0]} isOpen={item.isOpen || false} isLocked={isAlarmActive} />}
                                    {item.type === 'lighting' && <LightingSystem position={[0, 0, 0]} isOn={isLightingOn} />}
                                    {item.type === 'fire' && <FireSafetySystem position={[0, 0, 0]} isAlarmActive={isAlarmActive} />}
                                    {item.type === 'cctv' && <CCTVCamera isDark={isDark} />}
                                    {item.type === 'smoke_detector' && <SmokeDetectorPrimitive />}
                                    {item.type === 'sprinkler' && <SprinklerPrimitive />}
                                    
                                    {/* Furniture */}
                                    {item.type === 'furniture_desk' && <FurnitureDesk scale={itemScale as [number,number,number]} color={item.color || '#a0774a'} />}
                                    {item.type === 'furniture_chair' && <FurnitureChair scale={itemScale as [number,number,number]} color={item.color || '#333'} />}
                                    {item.type === 'server_rack' && <ServerRack scale={itemScale as [number,number,number]} color={item.color || '#222'} isDark={isDark} />}
                                    {item.type === 'planter' && <PlanterPrimitive isDark={isDark} />}

                                    {/* View-Mode Tooltip */}
                                    {!editMode && isSelected && (
                                        <Html position={[0, 3, 0]} center zIndexRange={[100, 0]}>
                                            <Card size="small" style={{ width: 210, ...glassStyle, borderRadius: 10 }}>
                                                <div style={{ marginBottom: 6 }}>
                                                    <Text strong>{item.label || item.id}</Text><br />
                                                    <Tag style={{ textTransform: 'capitalize', fontSize: 10 }}>{item.type.replace('_', ' ')}</Tag>
                                                </div>
                                                {item.type === 'zone' && <div><Text style={{ fontSize: 12 }}>🌡 {item.temp}°C</Text></div>}
                                                <Button size="small" type="primary" icon={<LinkOutlined />} block style={{ marginTop: 6 }} onClick={() => navigateToModule(item.id)}>
                                                    Manage in Module
                                                </Button>
                                            </Card>
                                        </Html>
                                    )}
                                </DraggableModel>
                            );
                        })}
                    </group>

                    {/* Simulation Controls */}
                    {!editMode && (
                        <Html position={[-25, 18, 0]} center zIndexRange={[100, 0]}>
                            <div style={{ background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)', padding: 14, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10, color: isDark ? '#fff' : '#000', backdropFilter: 'blur(10px)', border: `1px solid ${isDark ? '#333' : '#ddd'}`, minWidth: 170 }}>
                                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2, borderBottom: `1px solid ${isDark ? '#444' : '#ccc'}`, paddingBottom: 4 }}>🎮 Simulations</div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                                    <input type="checkbox" checked={isAlarmActive} onChange={(e) => setIsAlarmActive(e.target.checked)} />
                                    🔥 Fire Alarm
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                                    <input type="checkbox" checked={isLightingOn} onChange={(e) => setIsLightingOn(e.target.checked)} />
                                    💡 Master Lighting
                                </label>
                            </div>
                        </Html>
                    )}

                    <OrbitControls makeDefault maxPolarAngle={isOrthographic && editMode ? Math.PI : Math.PI/2 - 0.05} target={[0, 8, 0]} />
                    <Environment preset="city" />
                </Canvas>
            </Suspense>
        </div>
    );
}
