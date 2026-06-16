'use client';

import React, { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import CMSLayout from '@/components/layout/CMSLayout';
import { AuroraText } from '@/components/magicui/aurora-text';
import { Card, Button, Space, Select, Typography, message, Tooltip } from 'antd';
import { 
    SaveOutlined, 
    DownloadOutlined, 
    UploadOutlined,
    DragOutlined,
    DeleteOutlined,
    BuildOutlined,
    AppstoreAddOutlined
} from '@ant-design/icons';

const { Text } = Typography;

type BlockType = 'wall' | 'floor' | 'column' | 'window' | 'door';

interface Block {
    id: string;
    type: BlockType;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
}

const defaultArgs: Record<BlockType, [number, number, number]> = {
    wall: [4, 3, 0.2],
    floor: [4, 0.2, 4],
    column: [0.5, 3, 0.5],
    window: [1.5, 1.5, 0.3],
    door: [1, 2.1, 0.3],
};

const defaultColors: Record<BlockType, string> = {
    wall: '#e6f7ff',
    floor: '#bae7ff',
    column: '#91d5ff',
    window: '#69c0ff',
    door: '#40a9ff',
};

function BlockMesh({ 
    block, 
    isSelected, 
    onSelect, 
    transformMode,
    onChange
}: { 
    block: Block, 
    isSelected: boolean, 
    onSelect: () => void, 
    transformMode: 'translate' | 'rotate' | 'scale',
    onChange: (b: Block) => void
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    const updateBlockFromMesh = () => {
        if (meshRef.current) {
            const pos = meshRef.current.position;
            const rot = meshRef.current.rotation;
            const scl = meshRef.current.scale;
            onChange({
                ...block,
                position: [pos.x, pos.y, pos.z],
                rotation: [rot.x, rot.y, rot.z],
                scale: [scl.x, scl.y, scl.z]
            });
        }
    };

    const mesh = (
        <mesh 
            ref={meshRef}
            position={block.position} 
            rotation={block.rotation} 
            scale={block.scale}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            castShadow
            receiveShadow
        >
            <boxGeometry args={defaultArgs[block.type]} />
            <meshStandardMaterial 
                color={defaultColors[block.type]} 
                transparent={block.type === 'window'}
                opacity={block.type === 'window' ? 0.4 : 1}
                emissive={isSelected ? '#1890ff' : '#000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
            />
        </mesh>
    );

    if (isSelected) {
        return (
            <TransformControls 
                object={meshRef} 
                mode={transformMode} 
                onMouseUp={updateBlockFromMesh}
            >
                {mesh}
            </TransformControls>
        );
    }

    return mesh;
}

export default function BimStudioPage() {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const [activeTool, setActiveTool] = useState<BlockType>('wall');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddBlock = () => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            type: activeTool,
            position: [0, defaultArgs[activeTool][1] / 2, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        };
        setBlocks([...blocks, newBlock]);
        setSelectedId(newBlock.id);
    };

    const handleDelete = () => {
        if (selectedId) {
            setBlocks(blocks.filter(b => b.id !== selectedId));
            setSelectedId(null);
        }
    };

    const handleUpdateBlock = (updatedBlock: Block) => {
        setBlocks(blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blocks, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "bim-scene.json");
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        message.success('Scene exported as JSON');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                setBlocks(imported);
                setSelectedId(null);
                message.success('Scene imported successfully');
            } catch (err) {
                message.error('Failed to parse JSON file');
            }
        };
        reader.readAsText(file);
    };

    return (
        <CMSLayout title={<AuroraText>BIM Studio</AuroraText>} subTitle="In-Browser Architectural Modeling">
            <div style={{ height: 'calc(100vh - 180px)', position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#111' }}>
                
                {/* Toolbar */}
                <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card size="small" style={{ background: 'rgba(20,20,20,0.8)', borderColor: '#333' }}>
                        <Space direction="vertical">
                            <Text style={{ color: '#fff' }}><BuildOutlined /> Add Element</Text>
                            <Space>
                                <Select value={activeTool} onChange={setActiveTool} style={{ width: 120 }}>
                                    <Select.Option value="wall">Wall</Select.Option>
                                    <Select.Option value="floor">Floor</Select.Option>
                                    <Select.Option value="column">Column</Select.Option>
                                    <Select.Option value="window">Window</Select.Option>
                                    <Select.Option value="door">Door</Select.Option>
                                </Select>
                                <Button type="primary" icon={<AppstoreAddOutlined />} onClick={handleAddBlock}>Add</Button>
                            </Space>
                        </Space>
                    </Card>

                    {selectedId && (
                        <Card size="small" style={{ background: 'rgba(20,20,20,0.8)', borderColor: '#333' }}>
                            <Space direction="vertical">
                                <Text style={{ color: '#fff' }}><DragOutlined /> Transform</Text>
                                <Space>
                                    <Button type={transformMode === 'translate' ? 'primary' : 'default'} onClick={() => setTransformMode('translate')}>Move</Button>
                                    <Button type={transformMode === 'rotate' ? 'primary' : 'default'} onClick={() => setTransformMode('rotate')}>Rotate</Button>
                                    <Button type={transformMode === 'scale' ? 'primary' : 'default'} onClick={() => setTransformMode('scale')}>Scale</Button>
                                </Space>
                                <Button danger icon={<DeleteOutlined />} onClick={handleDelete} block style={{ marginTop: 8 }}>Delete Selected</Button>
                            </Space>
                        </Card>
                    )}

                    <Card size="small" style={{ background: 'rgba(20,20,20,0.8)', borderColor: '#333' }}>
                        <Space direction="vertical">
                            <Text style={{ color: '#fff' }}><SaveOutlined /> File</Text>
                            <Space>
                                <Button icon={<DownloadOutlined />} onClick={handleExport}>Export JSON</Button>
                                <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
                            </Space>
                        </Space>
                    </Card>
                </div>

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleImport} />

                {/* 3D Canvas */}
                <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }} onPointerMissed={() => setSelectedId(null)}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                    
                    <Grid args={[40, 40]} sectionSize={1} sectionColor="#444" cellColor="#222" />
                    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                        <planeGeometry args={[40, 40]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>

                    {blocks.map(block => (
                        <BlockMesh 
                            key={block.id}
                            block={block}
                            isSelected={selectedId === block.id}
                            onSelect={() => setSelectedId(block.id)}
                            transformMode={transformMode}
                            onChange={handleUpdateBlock}
                        />
                    ))}

                    <OrbitControls makeDefault />
                    <Environment preset="city" />
                </Canvas>
            </div>
        </CMSLayout>
    );
}
