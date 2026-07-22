import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, SoftShadows, Box, PerspectiveCamera, OrthographicCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Spin, Button, Input, InputNumber, Card, Space, Divider, Typography, Row, Col, Switch, Tooltip, Segmented, Collapse, Badge, Tag, Upload, Popover } from 'antd';
import {
    DeleteOutlined, SaveOutlined, ReloadOutlined, CameraOutlined, PlusOutlined, LinkOutlined,
    DragOutlined, RotateRightOutlined, ExpandOutlined, CopyOutlined, EyeOutlined, EyeInvisibleOutlined,
    AppstoreOutlined, BuildOutlined, ThunderboltOutlined, SafetyCertificateOutlined,
    UploadOutlined, DownloadOutlined, ClearOutlined, UndoOutlined, RedoOutlined
} from '@ant-design/icons';
import DraggableModel from '@/components/3d/DraggableModel';
import { LightingSystem, FireSafetySystem, SecurityDoor, HVACDuct } from '@/components/bms/BmsComponents';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BmsItemType =
    | 'wall' | 'glass_wall' | 'floor_slab' | 'column' | 'staircase' | 'elevator_shaft' | 'roof' | 'window' | 'solar_panel'
    | 'zone' | 'hvac' | 'ahu' | 'duct'
    | 'door' | 'cctv' | 'smoke_detector' | 'sprinkler'
    | 'lighting' | 'fire'
    | 'furniture_desk' | 'furniture_chair' | 'server_rack' | 'planter' | 'sofa' | 'indoor_plant'
    | 'grass_block' | 'water_block' | 'road_block' | 'fence' | 'tree_pine' | 'car' | 'generic_building';

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
    category: 'architecture' | 'bms' | 'sensors' | 'furniture' | 'landscape';
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
    { type: 'window', label: 'Window', category: 'architecture', defaultScale: [2, 2, 0.2] },
    { type: 'solar_panel', label: 'Solar Panel', category: 'architecture', defaultScale: [2, 0.5, 2] },
    // Landscape
    { type: 'grass_block', label: 'Grass Block', category: 'landscape', defaultScale: [10, 0.5, 10], defaultColor: '#5b8c5a' },
    { type: 'water_block', label: 'Water Block', category: 'landscape', defaultScale: [10, 0.4, 10], defaultColor: '#4b88a2' },
    { type: 'road_block', label: 'Road Block', category: 'landscape', defaultScale: [10, 0.1, 10], defaultColor: '#333333' },
    { type: 'fence', label: 'Fence', category: 'landscape', defaultScale: [5, 1.5, 0.2], defaultColor: '#b08d6a' },
    { type: 'tree_pine', label: 'Pine Tree', category: 'landscape', defaultScale: [1, 1, 1] },
    { type: 'car', label: 'Car', category: 'landscape', defaultScale: [1, 1, 1] },
    { type: 'generic_building', label: 'Generic Building', category: 'landscape', defaultScale: [5, 10, 5], defaultColor: '#cccccc' },
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
    { type: 'sofa', label: 'Sofa', category: 'furniture', defaultScale: [2, 1, 1], defaultColor: '#885533' },
    { type: 'indoor_plant', label: 'Indoor Plant', category: 'furniture', defaultScale: [1, 1, 1] },
];

// ─── Realistic Default Building ──────────────────────────────────────────────

const FLOOR_HEIGHT = 4;

function generateDefaultBuilding(): BmsItem[] {
    const items: BmsItem[] = [];
    let idCounter = 0;
    const uid = (prefix: string) => `${prefix}-${++idCounter}`;

    // ─── Landscape ───
    items.push({ id: uid('GRASS'), type: 'grass_block', position: [15, -0.2, 5], scale: [120, 0.4, 100], color: '#4a7c49', label: 'Campus Ground' });
    
    // Parking Lot
    items.push({ id: uid('ROAD'), type: 'road_block', position: [15, -0.05, 30], scale: [60, 0.1, 20], color: '#333333', label: 'Parking Lot' });
    
    // Cars
    for (let cx = -10; cx <= 40; cx += 5) {
        if (Math.random() > 0.3) {
            items.push({ id: uid('CAR'), type: 'car', position: [cx, 0, 28], rotation: [0, Math.PI, 0], scale: [1,1,1], color: ['#aa0000', '#0000aa', '#aaaaaa', '#222222'][Math.floor(Math.random()*4)], label: `Car ${cx}` });
        }
        if (Math.random() > 0.3) {
            items.push({ id: uid('CAR'), type: 'car', position: [cx, 0, 32], rotation: [0, 0, 0], scale: [1,1,1], color: ['#aa0000', '#0000aa', '#aaaaaa', '#222222'][Math.floor(Math.random()*4)], label: `Car ${cx}` });
        }
    }

    // Water fountain in plaza
    items.push({ id: uid('WATER'), type: 'water_block', position: [15, 0.1, 15], scale: [8, 0.2, 8], color: '#4b88a2', label: 'Plaza Fountain' });
    items.push({ id: uid('WALL'), type: 'wall', position: [15, 0.2, 15], scale: [8.5, 0.4, 8.5], color: '#dcdcdc', label: 'Fountain Base' });
    
    items.push({ id: uid('PLANT'), type: 'planter', position: [10, 0, 15], scale: [1, 1, 1] });
    items.push({ id: uid('PLANT'), type: 'planter', position: [20, 0, 15], scale: [1, 1, 1] });

    // Pine trees
    for (const tx of [-20, -10, 40, 50]) {
        for (const tz of [-20, 0, 20, 40]) {
            items.push({ id: uid('TREE'), type: 'tree_pine', position: [tx, 0, tz], scale: [1.5, 1.5, 1.5], label: 'Pine Tree' });
        }
    }

    // Generic buildings for city backdrop
    const backdropPositions = [ [-40, -30], [-20, -40], [10, -40], [30, -35], [50, -30], [60, -10], [60, 10], [60, 30] ];
    backdropPositions.forEach((pos, idx) => {
        const height = 15 + Math.random() * 20;
        items.push({ id: uid('CITY'), type: 'generic_building', position: [pos[0], height/2, pos[1]], scale: [10 + Math.random()*5, height, 10 + Math.random()*5], color: '#888888', label: `City Bldg ${idx}` });
    });

    // ─── Main Tower (8 stories) ───
    const M_W = 30;
    const M_D = 18;
    const M_X = 0;
    const M_Z = 0;

    for (let f = 0; f < 8; f++) {
        const y = f * FLOOR_HEIGHT;
        const label = f === 0 ? 'Main Ground' : `Main F${f}`;
        
        items.push({ id: uid('FLOOR'), type: 'floor_slab', position: [M_X, y, M_Z], scale: [M_W, 0.25, M_D], color: '#c4c4c4', label: `${label} Slab` });
        
        // Walls
        items.push({ id: uid('WALL'), type: 'wall', position: [M_X, y + FLOOR_HEIGHT/2, M_Z - M_D/2], scale: [M_W, FLOOR_HEIGHT, 0.3], color: '#b8b8b8' });
        items.push({ id: uid('WALL'), type: 'wall', position: [M_X - M_W/2, y + FLOOR_HEIGHT/2, M_Z], scale: [0.3, FLOOR_HEIGHT, M_D], color: '#c0c0c0' });
        items.push({ id: uid('WALL'), type: 'wall', position: [M_X + M_W/2, y + FLOOR_HEIGHT/2, M_Z], scale: [0.3, FLOOR_HEIGHT, M_D], color: '#c0c0c0' });
        items.push({ id: uid('GLASS'), type: 'glass_wall', position: [M_X, y + FLOOR_HEIGHT/2, M_Z + M_D/2], scale: [M_W, FLOOR_HEIGHT, 0.12], color: '#b8dff0' });
        
        // Columns
        for (const cx of [-12, 0, 12]) {
            items.push({ id: uid('COL'), type: 'column', position: [M_X + cx, y + FLOOR_HEIGHT/2, M_Z], scale: [0.6, FLOOR_HEIGHT, 0.6], color: '#d0d0d0' });
        }

        // Details
        if (f === 0) {
            items.push({ id: uid('DESK'), type: 'furniture_desk', position: [M_X, 0.4, M_Z + 3], scale: [2, 0.8, 1], color: '#553311', label: 'Reception' });
            items.push({ id: uid('SOFA'), type: 'sofa', position: [M_X - 5, 0, M_Z + 5], rotation: [0, Math.PI/2, 0], scale: [2, 1, 1], color: '#883333', label: 'Lobby Sofa' });
            items.push({ id: uid('PLANT'), type: 'indoor_plant', position: [M_X - 3, 0, M_Z + 5], scale: [1, 1, 1], label: 'Lobby Plant' });
            items.push({ id: uid('PLANT'), type: 'indoor_plant', position: [M_X + 5, 0, M_Z + 5], scale: [1, 1, 1], label: 'Lobby Plant' });
            items.push({ id: uid('WALL'), type: 'wall', position: [M_X - 8, y + FLOOR_HEIGHT/2, M_Z], scale: [0.2, FLOOR_HEIGHT, 6], color: '#eeeeee', label: 'Partition' });
            items.push({ id: uid('DOOR'), type: 'door', position: [M_X, y, M_Z + M_D/2 + 0.1], isOpen: true });
        } else {
            items.push({ id: uid('DESK'), type: 'furniture_desk', position: [M_X - 5, y + 0.4, M_Z], scale: [1.5, 0.8, 0.8], color: '#a0774a' });
            items.push({ id: uid('CHAIR'), type: 'furniture_chair', position: [M_X - 5, y + 0.5, M_Z + 1], scale: [0.6, 1, 0.6], color: '#333' });
        }
    }
    // Main Roof
    items.push({ id: uid('ROOF'), type: 'roof', position: [M_X, 8 * FLOOR_HEIGHT, M_Z], scale: [M_W + 1, 0.2, M_D + 1], color: '#555' });
    items.push({ id: uid('HVAC'), type: 'hvac', position: [M_X - 5, 8 * FLOOR_HEIGHT + 0.2, M_Z - 3], label: 'Main HVAC' });
    // Solar panels
    for (let sx = -10; sx <= 10; sx += 5) {
        items.push({ id: uid('SOLAR'), type: 'solar_panel', position: [M_X + sx, 8 * FLOOR_HEIGHT + 0.2, M_Z + 3], scale: [3, 0.5, 2], label: 'Solar Panel' });
    }

    // ─── Secondary Tower (5 stories) ───
    const S_W = 20;
    const S_D = 20;
    const S_X = 35;
    const S_Z = 5;

    for (let f = 0; f < 5; f++) {
        const y = f * FLOOR_HEIGHT;
        const label = f === 0 ? 'Sec Ground' : `Sec F${f}`;
        
        items.push({ id: uid('FLOOR'), type: 'floor_slab', position: [S_X, y, S_Z], scale: [S_W, 0.25, S_D], color: '#c4c4c4', label: `${label} Slab` });
        
        items.push({ id: uid('WALL'), type: 'wall', position: [S_X, y + FLOOR_HEIGHT/2, S_Z - S_D/2], scale: [S_W, FLOOR_HEIGHT, 0.3], color: '#b8b8b8' });
        items.push({ id: uid('WALL'), type: 'wall', position: [S_X + S_W/2, y + FLOOR_HEIGHT/2, S_Z], scale: [0.3, FLOOR_HEIGHT, S_D], color: '#c0c0c0' });
        items.push({ id: uid('GLASS'), type: 'glass_wall', position: [S_X, y + FLOOR_HEIGHT/2, S_Z + S_D/2], scale: [S_W, FLOOR_HEIGHT, 0.12], color: '#b8dff0' });
        items.push({ id: uid('GLASS'), type: 'glass_wall', position: [S_X - S_W/2, y + FLOOR_HEIGHT/2, S_Z], scale: [0.3, FLOOR_HEIGHT, S_D], color: '#b8dff0' });
        
        if (f === 0) {
            items.push({ id: uid('DOOR'), type: 'door', position: [S_X, y, S_Z + S_D/2 + 0.1], isOpen: false });
            items.push({ id: uid('SOFA'), type: 'sofa', position: [S_X + 4, 0, S_Z], rotation: [0, -Math.PI/2, 0], scale: [2, 1, 1], color: '#334488' });
            items.push({ id: uid('PLANT'), type: 'indoor_plant', position: [S_X + 6, 0, S_Z], scale: [1, 1, 1] });
        }
    }
    // Secondary Roof
    items.push({ id: uid('ROOF'), type: 'roof', position: [S_X, 5 * FLOOR_HEIGHT, S_Z], scale: [S_W + 1, 0.2, S_D + 1], color: '#555' });
    items.push({ id: uid('AHU'), type: 'ahu', position: [S_X, 5 * FLOOR_HEIGHT + 1.2, S_Z], scale: [4, 2, 2] });
    for (let sx = -5; sx <= 5; sx += 5) {
        items.push({ id: uid('SOLAR'), type: 'solar_panel', position: [S_X + sx, 5 * FLOOR_HEIGHT + 0.2, S_Z - 5], scale: [3, 0.5, 2] });
    }

    // ─── Skybridge (Floor 3) ───
    const B_Y = 3 * FLOOR_HEIGHT; // y=12
    const B_X = 20;
    const B_Z = 0; 
    items.push({ id: uid('FLOOR'), type: 'floor_slab', position: [B_X, B_Y, B_Z], scale: [10, 0.25, 6], color: '#aaaaaa', label: 'Bridge Floor' });
    items.push({ id: uid('ROOF'), type: 'roof', position: [B_X, B_Y + FLOOR_HEIGHT, B_Z], scale: [10, 0.2, 6.2], color: '#888888', label: 'Bridge Roof' });
    items.push({ id: uid('GLASS'), type: 'glass_wall', position: [B_X, B_Y + FLOOR_HEIGHT/2, B_Z + 3], scale: [10, FLOOR_HEIGHT, 0.1], color: '#b8dff0', label: 'Bridge Glass F' });
    items.push({ id: uid('GLASS'), type: 'glass_wall', position: [B_X, B_Y + FLOOR_HEIGHT/2, B_Z - 3], scale: [10, FLOOR_HEIGHT, 0.1], color: '#b8dff0', label: 'Bridge Glass B' });

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
    return (
        <group>
            <mesh castShadow>
                <boxGeometry args={scale} />
                <meshPhysicalMaterial color={glassColor} transmission={0.85} opacity={1} transparent roughness={0.05} metalness={0.1} thickness={0.3} />
            </mesh>
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
            <mesh castShadow receiveShadow>
                <boxGeometry args={scale} />
                <meshStandardMaterial color={color || '#888'} roughness={0.9} transparent opacity={0.6} />
            </mesh>
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

const WindowPrimitive = ({ scale }: { scale: [number,number,number] }) => (
    <group>
        <mesh castShadow>
            <boxGeometry args={[scale[0], scale[1], 0.1]} />
            <meshStandardMaterial color="#555555" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.02]} castShadow>
            <boxGeometry args={[scale[0]*0.9, scale[1]*0.9, 0.05]} />
            <meshPhysicalMaterial color="#aaddff" transmission={0.9} opacity={1} transparent roughness={0.1} />
        </mesh>
    </group>
);

const SolarPanelPrimitive = ({ scale }: { scale: [number,number,number] }) => (
    <group>
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI/6, 0, 0]} castShadow>
            <boxGeometry args={[scale[0], 0.05, scale[2]]} />
            <meshStandardMaterial color="#112244" roughness={0.1} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.1, 0.2]} castShadow>
            <boxGeometry args={[0.05, 0.2, 0.05]} />
            <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0, 0.1, -0.2]} castShadow>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#555" />
        </mesh>
    </group>
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

const SofaPrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <group>
        <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[scale[0], 0.4, scale[2]]} />
            <meshStandardMaterial color={color || '#885533'} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.6, -scale[2]/2 + 0.1]} castShadow>
            <boxGeometry args={[scale[0], 0.6, 0.2]} />
            <meshStandardMaterial color={color || '#885533'} roughness={0.8} />
        </mesh>
        <mesh position={[-scale[0]/2 + 0.1, 0.5, 0]} castShadow>
            <boxGeometry args={[0.2, 0.4, scale[2]]} />
            <meshStandardMaterial color={color || '#885533'} roughness={0.8} />
        </mesh>
        <mesh position={[scale[0]/2 - 0.1, 0.5, 0]} castShadow>
            <boxGeometry args={[0.2, 0.4, scale[2]]} />
            <meshStandardMaterial color={color || '#885533'} roughness={0.8} />
        </mesh>
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
        <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.7, 8, 8]} /><meshStandardMaterial color="#2d6a4f" roughness={0.9} /></mesh>
        <mesh position={[0.3, 1, 0.2]}><sphereGeometry args={[0.5, 8, 8]} /><meshStandardMaterial color="#40916c" roughness={0.9} /></mesh>
    </group>
);

const IndoorPlantPrimitive = () => (
    <group>
        <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.2, 0.5, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#228b22" roughness={0.8} />
        </mesh>
        <mesh position={[0.2, 0.6, 0.2]} castShadow>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#2e8b57" roughness={0.8} />
        </mesh>
        <mesh position={[-0.2, 0.7, -0.1]} castShadow>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#3cb371" roughness={0.8} />
        </mesh>
    </group>
);

// --- Landscape Primitives ---

const GrassBlock = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh receiveShadow castShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color || '#5b8c5a'} roughness={1} metalness={0} />
    </mesh>
);

const WaterBlock = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh receiveShadow>
        <boxGeometry args={scale} />
        <meshPhysicalMaterial color={color || '#4b88a2'} transmission={0.6} opacity={1} transparent roughness={0.1} metalness={0.1} />
    </mesh>
);

const RoadBlock = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh receiveShadow castShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color || '#333333'} roughness={0.8} />
    </mesh>
);

const FencePrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => {
    return (
        <group>
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
                <boxGeometry args={[scale[0], scale[1] * 0.1, scale[2]]} />
                <meshStandardMaterial color={color || '#b08d6a'} roughness={0.9} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -scale[1]*0.25, 0]}>
                <boxGeometry args={[scale[0], scale[1] * 0.1, scale[2]]} />
                <meshStandardMaterial color={color || '#b08d6a'} roughness={0.9} />
            </mesh>
            {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
                <mesh key={i} castShadow receiveShadow position={[scale[0]*x, 0, 0]}>
                    <boxGeometry args={[scale[0]*0.05, scale[1], scale[2]*1.5]} />
                    <meshStandardMaterial color={color || '#b08d6a'} roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
};

const TreePine = ({ scale }: { scale: [number,number,number] }) => (
    <group scale={scale}>
        <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[1, 1.5, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
            <coneGeometry args={[0.8, 1.2, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[0.5, 0.8, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
        </mesh>
    </group>
);

const CarPrimitive = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <group scale={scale}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, 0.5, 4]} />
            <meshStandardMaterial color={color || '#aa0000'} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.8, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.5, 2]} />
            <meshStandardMaterial color={color || '#aa0000'} roughness={0.4} metalness={0.6} />
        </mesh>
        {[[-1, 0.2, -1.2], [1, 0.2, -1.2], [-1, 0.2, 1.2], [1, 0.2, 1.2]].map((pos, i) => (
            <mesh key={i} position={pos as [number,number,number]} rotation={[0, 0, Math.PI/2]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color="#222" roughness={0.9} />
            </mesh>
        ))}
    </group>
);

const GenericBuilding = ({ scale, color }: { scale: [number,number,number], color: string }) => (
    <mesh castShadow receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color || '#cccccc'} roughness={0.7} />
    </mesh>
);


// ─── Main Component ──────────────────────────────────────────────────────────

export type BmsLayer = 'All' | 'HVAC' | 'Fire' | 'Security' | 'Lighting';

export default function Bms3dView({ isDark, editMode = false, activeLayer = 'All' }: { isDark: boolean, editMode?: boolean, activeLayer?: BmsLayer }) {
    const router = useRouter();
    const [items, setItems] = useState<BmsItem[]>([]);
    const [past, setPast] = useState<BmsItem[][]>([]);
    const [future, setFuture] = useState<BmsItem[][]>([]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isOrthographic, setIsOrthographic] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const [showGrid, setShowGrid] = useState(true);
    const [uiVisible, setUiVisible] = useState(true);
    const [catalogOpen, setCatalogOpen] = useState<string[]>(['architecture']);

    // Duplicate Floor Tool State
    const [dupSourceY, setDupSourceY] = useState<number>(0);
    const [dupHeight, setDupHeight] = useState<number>(4);

    // Simulations
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isLightingOn, setIsLightingOn] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('bms_cad_layout_v3');
        if (saved) {
            try { setItems(JSON.parse(saved)); } catch { setItems(DEFAULT_ITEMS); }
        } else {
            setItems(DEFAULT_ITEMS);
        }
    }, []);

    const pushHistory = useCallback((newItems: BmsItem[]) => {
        setPast(prev => [...prev, items]);
        setFuture([]);
        setItems(newItems);
    }, [items]);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        setPast(prev => prev.slice(0, prev.length - 1));
        setFuture(prev => [items, ...prev]);
        setItems(previous);
    }, [past, items]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        setFuture(prev => prev.slice(1));
        setPast(prev => [...prev, items]);
        setItems(next);
    }, [future, items]);

    const deleteItem = useCallback((id: string) => {
        const newItems = items.filter(item => item.id !== id);
        pushHistory(newItems);
        if (selectedId === id) setSelectedId(null);
    }, [items, pushHistory, selectedId]);

    // Keyboard Shortcuts
    useEffect(() => {
        if (!editMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
            if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
            if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
            if (e.key === 'Escape') setSelectedId(null);
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) deleteItem(selectedId);
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                }
                if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editMode, selectedId, undo, redo, deleteItem]);

    const saveLayout = () => {
        localStorage.setItem('bms_cad_layout_v3', JSON.stringify(items));
        alert('Layout saved!');
    };
    const resetLayout = () => {
        pushHistory(DEFAULT_ITEMS);
        localStorage.removeItem('bms_cad_layout_v3');
        setSelectedId(null);
    };
    const handleSelect = (id: string) => setSelectedId(id);

    const handleTransformChange = (id: string, type: 'position' | 'rotation' | 'scale', value: [number,number,number]) => {
        pushHistory(items.map(item => item.id === id ? { ...item, [type]: value } : item));
    };

    const updateItem = (id: string, updates: Partial<BmsItem>) => {
        pushHistory(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const duplicateItem = (id: string) => {
        const src = items.find(i => i.id === id);
        if (!src) return;
        const newItem: BmsItem = { ...src, id: `${src.type.toUpperCase()}-${Date.now()}`, position: [src.position[0]+2, src.position[1], src.position[2]+2] };
        pushHistory([...items, newItem]);
        setSelectedId(newItem.id);
    };

    const spawnItem = (type: BmsItemType) => {
        const cat = CATALOG.find(c => c.type === type);
        const yPos = cat?.category === 'landscape' ? 0 : 16.2;
        const newItem: BmsItem = {
            id: `${type.toUpperCase()}-${Date.now()}`,
            type,
            position: [0, yPos, 0],
            scale: cat?.defaultScale || [1,1,1],
            label: cat?.label || type,
            color: cat?.defaultColor || '#888',
            temp: type === 'zone' ? 22 : undefined,
        };
        pushHistory([...items, newItem]);
        setSelectedId(newItem.id);
    };

    const clearAll = () => {
        pushHistory([{
            id: `GRASS-${Date.now()}`,
            type: 'grass_block',
            position: [0, -0.25, 0],
            scale: [50, 0.5, 50],
            color: '#5b8c5a',
            label: 'Ground'
        }]);
        setSelectedId(null);
    };

    const exportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "bms_layout.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importJson = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = JSON.parse(e.target?.result as string);
                if (Array.isArray(result)) {
                    pushHistory(result);
                }
            } catch (err) {
                alert('Failed to parse JSON file');
            }
        };
        reader.readAsText(file);
        return false;
    };

    const handleDuplicateFloor = () => {
        const itemsToDuplicate = items.filter(item => Math.abs(item.position[1] - dupSourceY) <= 1.0);
        if (itemsToDuplicate.length === 0) {
            alert('No items found around Y=' + dupSourceY);
            return;
        }
        const newItems = itemsToDuplicate.map(item => ({
            ...item,
            id: `${item.type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            position: [item.position[0], item.position[1] + dupHeight, item.position[2]] as [number, number, number]
        }));
        pushHistory([...items, ...newItems]);
        alert(`Duplicated ${newItems.length} items to Y=${dupSourceY + dupHeight}`);
    };

    const duplicateFloorContent = (
        <div style={{ padding: 8 }}>
            <Space direction="vertical">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ marginRight: 8 }}>Source Y:</Text>
                    <InputNumber size="small" value={dupSourceY} onChange={(v) => setDupSourceY(v || 0)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ marginRight: 8 }}>Height:</Text>
                    <InputNumber size="small" value={dupHeight} onChange={(v) => setDupHeight(v || 0)} />
                </div>
                <Button type="primary" size="small" block onClick={handleDuplicateFloor}>Duplicate Up</Button>
            </Space>
        </div>
    );

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
                            <Space split={<Divider orientation="vertical" style={{ margin: '0 4px' }} />}>
                                {/* Hide UI */}
                                <Button size="small" type="text" icon={uiVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setUiVisible(!uiVisible)}>
                                    {uiVisible ? 'Hide UI' : 'Show UI'}
                                </Button>
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
                                {/* Undo / Redo */}
                                <Space size={4}>
                                    <Tooltip title="Undo (Ctrl+Z)"><Button size="small" icon={<UndoOutlined />} disabled={past.length === 0} onClick={undo} /></Tooltip>
                                    <Tooltip title="Redo (Ctrl+Y)"><Button size="small" icon={<RedoOutlined />} disabled={future.length === 0} onClick={redo} /></Tooltip>
                                </Space>
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
                                {/* Import / Export */}
                                <Space size={4}>
                                    <Upload accept=".json" showUploadList={false} beforeUpload={importJson}>
                                        <Button size="small" icon={<UploadOutlined />}>Import</Button>
                                    </Upload>
                                    <Button size="small" icon={<DownloadOutlined />} onClick={exportJson}>Export</Button>
                                </Space>
                                {/* Duplicate Floor */}
                                <Popover content={duplicateFloorContent} title="Duplicate Floor" trigger="click">
                                    <Button size="small" icon={<CopyOutlined />}>Dup Floor</Button>
                                </Popover>
                                {/* Actions */}
                                <Button size="small" danger icon={<ClearOutlined />} onClick={clearAll}>Clear All</Button>
                                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveLayout}>Save</Button>
                                <Button size="small" icon={<ReloadOutlined />} onClick={resetLayout}>Reset</Button>
                            </Space>
                        </Card>
                    </div>

                    {/* Left Sidebar: Asset Catalog */}
                    {uiVisible && (
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
                                            key: 'landscape',
                                            label: <span>🌳 Landscape <Badge count={countByCategory('landscape')} size="small" style={{ marginLeft: 4 }} /></span>,
                                            children: (
                                                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                                                    {CATALOG.filter(c => c.category === 'landscape').map(c => (
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
                    )}

                    {/* Right Sidebar: Inspector */}
                    {uiVisible && selectedItem && (
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

                                {('color' in selectedItem || selectedItem.type === 'wall' || selectedItem.type === 'glass_wall' || selectedItem.type === 'floor_slab' || selectedItem.type === 'roof' || selectedItem.type === 'grass_block' || selectedItem.type === 'water_block' || selectedItem.type === 'road_block' || selectedItem.type === 'fence' || selectedItem.type === 'car' || selectedItem.type === 'generic_building' || selectedItem.type === 'sofa') && (
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

                                {/* Rotation */}
                                <Divider style={{ margin: '8px 0', fontSize: 11 }}>Rotation</Divider>
                                <Row gutter={4} style={{ marginBottom: 6 }}>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.rotation?.[0] || 0) * 180 / Math.PI)} onChange={v => updateItem(selectedItem.id, { rotation: [(v||0) * Math.PI / 180, selectedItem.rotation?.[1]||0, selectedItem.rotation?.[2]||0] })} addonBefore={<span style={{ fontSize: 10 }}>RX</span>} /></Col>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.rotation?.[1] || 0) * 180 / Math.PI)} onChange={v => updateItem(selectedItem.id, { rotation: [selectedItem.rotation?.[0]||0, (v||0) * Math.PI / 180, selectedItem.rotation?.[2]||0] })} addonBefore={<span style={{ fontSize: 10 }}>RY</span>} /></Col>
                                    <Col span={8}><InputNumber size="small" style={{ width: '100%' }} value={Math.round((selectedItem.rotation?.[2] || 0) * 180 / Math.PI)} onChange={v => updateItem(selectedItem.id, { rotation: [selectedItem.rotation?.[0]||0, selectedItem.rotation?.[1]||0, (v||0) * Math.PI / 180] })} addonBefore={<span style={{ fontSize: 10 }}>RZ</span>} /></Col>
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
                            if (activeLayer !== 'All' && !['wall','glass_wall','floor_slab','column','staircase','elevator_shaft','roof','window','solar_panel','furniture_desk','furniture_chair','server_rack','planter','sofa','indoor_plant','grass_block','water_block','road_block','fence','tree_pine','car','generic_building'].includes(item.type)) {
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
                                    {item.type === 'window' && <WindowPrimitive scale={itemScale as [number,number,number]} />}
                                    {item.type === 'solar_panel' && <SolarPanelPrimitive scale={itemScale as [number,number,number]} />}
                                    
                                    {/* Landscape */}
                                    {item.type === 'grass_block' && <GrassBlock scale={itemScale as [number,number,number]} color={item.color || '#5b8c5a'} />}
                                    {item.type === 'water_block' && <WaterBlock scale={itemScale as [number,number,number]} color={item.color || '#4b88a2'} />}
                                    {item.type === 'road_block' && <RoadBlock scale={itemScale as [number,number,number]} color={item.color || '#333333'} />}
                                    {item.type === 'fence' && <FencePrimitive scale={itemScale as [number,number,number]} color={item.color || '#b08d6a'} />}
                                    {item.type === 'tree_pine' && <TreePine scale={itemScale as [number,number,number]} />}
                                    {item.type === 'car' && <CarPrimitive scale={itemScale as [number,number,number]} color={item.color || '#aa0000'} />}
                                    {item.type === 'generic_building' && <GenericBuilding scale={itemScale as [number,number,number]} color={item.color || '#cccccc'} />}
                                    
                                    {/* BMS */}
                                    {item.type === 'zone' && <SmartZone label={item.label || ''} temp={item.temp || 20} color={item.color || '#888'} />}
                                    {item.type === 'hvac' && <HVACFan position={[0, 1, 0]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} isDark={isDark} />}
                                    {item.type === 'ahu' && <AHUPrimitive scale={itemScale as [number,number,number]} isDark={isDark} />}
                                    {item.type === 'duct' && <DuctPrimitive scale={itemScale as [number,number,number]} />}
                                    
                                    {/* Sensors */}
                                    {item.type === 'cctv' && <CCTVCamera isDark={isDark} />}
                                    {item.type === 'smoke_detector' && <SmokeDetectorPrimitive />}
                                    {item.type === 'sprinkler' && <SprinklerPrimitive />}
                                    {item.type === 'door' && (
                                        <mesh position={[0, 1.5, 0]}>
                                            <boxGeometry args={[1.2, 3, 0.1]} />
                                            <meshStandardMaterial color={item.isOpen ? '#52c41a' : '#ff4d4f'} roughness={0.5} />
                                        </mesh>
                                    )}
                                    {item.type === 'lighting' && (
                                        <mesh position={[0, 3.9, 0]}>
                                            <boxGeometry args={[1.2, 0.1, 1.2]} />
                                            <meshStandardMaterial color={isLightingOn ? '#ffffcc' : '#555'} emissive={isLightingOn ? '#ffffcc' : '#000'} emissiveIntensity={0.8} />
                                        </mesh>
                                    )}
                                    {item.type === 'fire' && (
                                        <mesh position={[0, 1.5, 0.15]}>
                                            <boxGeometry args={[0.6, 0.8, 0.1]} />
                                            <meshStandardMaterial color={isAlarmActive ? '#ff0000' : '#880000'} emissive={isAlarmActive ? '#ff0000' : '#000'} />
                                        </mesh>
                                    )}

                                    {/* Furniture */}
                                    {item.type === 'furniture_desk' && <FurnitureDesk scale={itemScale as [number,number,number]} color={item.color || '#a0774a'} />}
                                    {item.type === 'furniture_chair' && <FurnitureChair scale={itemScale as [number,number,number]} color={item.color || '#333'} />}
                                    {item.type === 'server_rack' && <ServerRack scale={itemScale as [number,number,number]} color={item.color || '#222'} isDark={isDark} />}
                                    {item.type === 'planter' && <PlanterPrimitive isDark={isDark} />}
                                    {item.type === 'sofa' && <SofaPrimitive scale={itemScale as [number,number,number]} color={item.color || '#885533'} />}
                                    {item.type === 'indoor_plant' && <IndoorPlantPrimitive />}
                                    
                                    {/* Name tag in view mode */}
                                    {!editMode && item.label && (
                                        <Html position={[0, itemScale[1] || 2, 0]} center zIndexRange={[100, 0]} distanceFactor={30}>
                                            <div style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', color: isDark ? '#fff' : '#000', padding: '2px 6px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
                                                {item.label}
                                            </div>
                                        </Html>
                                    )}
                                </DraggableModel>
                            );
                        })}
                    </group>
                    <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
                </Canvas>
            </Suspense>
        </div>
    );
}
