import React, { Suspense, useState, useRef, useMemo } from 'react';
import { Modal, Slider, Switch, Space, Typography, Card, Descriptions } from 'antd';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stage, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

const { Text } = Typography;

function ModelRenderer({ url, explodeOffset, xrayMode, onMeshClick, measureMode, addMeasurementPoint }: any) {
    const { scene } = useGLTF(url);
    const ref = useRef<THREE.Group>(null);
    
    // Calculate bounding box center to explode outwards
    const center = useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const c = new THREE.Vector3();
        box.getCenter(c);
        return c;
    }, [scene]);

    // Apply materials and explode offset
    useFrame(() => {
        if (!ref.current) return;
        ref.current.children.forEach((child: any) => {
            if (child.isMesh) {
                // X-Ray Mode
                if (child.material) {
                    if (xrayMode) {
                        child.material.transparent = true;
                        child.material.opacity = 0.3;
                        child.material.wireframe = true;
                    } else {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                        child.material.wireframe = false;
                    }
                    child.material.needsUpdate = true;
                }

                // Exploded View
                if (!child.userData.originalPosition) {
                    child.userData.originalPosition = child.position.clone();
                }
                const dir = child.position.clone().sub(center).normalize();
                // If it's precisely at center, push it up
                if (dir.length() === 0) dir.set(0, 1, 0);
                
                const targetPos = child.userData.originalPosition.clone().add(dir.multiplyScalar(explodeOffset));
                child.position.lerp(targetPos, 0.1);
            }
        });
    });

    return (
        <group ref={ref} onPointerDown={(e) => {
            e.stopPropagation();
            if (measureMode) {
                addMeasurementPoint(e.point);
            } else {
                if (e.object) onMeshClick(e.object);
            }
        }}>
            <primitive object={scene} />
        </group>
    );
}

export default function BimViewerModal({ visible, onClose, modelUrl, modelName }: any) {
    const [explodeOffset, setExplodeOffset] = useState(0);
    const [xrayMode, setXrayMode] = useState(false);
    const [measureMode, setMeasureMode] = useState(false);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [selectedMesh, setSelectedMesh] = useState<any>(null);

    const handleMeshClick = (mesh: any) => {
        setSelectedMesh({
            name: mesh.name || 'Unnamed Object',
            uuid: mesh.uuid,
            vertices: mesh.geometry?.attributes?.position?.count || 0,
            material: mesh.material?.name || 'Default Material'
        });
    };

    const addMeasurementPoint = (point: THREE.Vector3) => {
        if (points.length >= 2) {
            setPoints([point]); // Reset if 2 points already exist
        } else {
            setPoints([...points, point]);
        }
    };

    const distance = points.length === 2 ? points[0].distanceTo(points[1]).toFixed(2) : null;

    return (
        <Modal
            title={`Advanced BIM Viewer - ${modelName}`}
            open={visible}
            onCancel={() => {
                setExplodeOffset(0);
                setPoints([]);
                setSelectedMesh(null);
                onClose();
            }}
            footer={null}
            width={1200}
            bodyStyle={{ height: 700, padding: 0, background: '#141414', position: 'relative' }}
            destroyOnClose
        >
            {/* UI Overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card size="small" style={{ background: 'rgba(20,20,20,0.8)', borderColor: '#333', color: '#fff' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                            <Text style={{ color: '#fff' }}>Exploded View Offset</Text>
                            <Slider min={0} max={10} step={0.1} value={explodeOffset} onChange={setExplodeOffset} />
                        </div>
                        <Space>
                            <Switch checked={xrayMode} onChange={setXrayMode} />
                            <Text style={{ color: '#fff' }}>X-Ray Wireframe Mode</Text>
                        </Space>
                        <Space>
                            <Switch checked={measureMode} onChange={(v) => { setMeasureMode(v); setPoints([]); }} />
                            <Text style={{ color: '#fff' }}>Measurement Tool</Text>
                        </Space>
                    </Space>
                </Card>

                {selectedMesh && !measureMode && (
                    <Card size="small" title={<span style={{ color: '#fff' }}>Object Metadata</span>} style={{ background: 'rgba(20,20,20,0.8)', borderColor: '#333' }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label={<span style={{ color: '#aaa' }}>Name</span>}><span style={{ color: '#fff' }}>{selectedMesh.name}</span></Descriptions.Item>
                            <Descriptions.Item label={<span style={{ color: '#aaa' }}>UUID</span>}><span style={{ color: '#fff', fontSize: 10 }}>{selectedMesh.uuid}</span></Descriptions.Item>
                            <Descriptions.Item label={<span style={{ color: '#aaa' }}>Vertices</span>}><span style={{ color: '#fff' }}>{selectedMesh.vertices}</span></Descriptions.Item>
                            <Descriptions.Item label={<span style={{ color: '#aaa' }}>Material</span>}><span style={{ color: '#fff' }}>{selectedMesh.material}</span></Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}
            </div>

            {modelUrl ? (
                <Canvas shadows dpr={[1, 2]} camera={{ position: [10, 10, 10], fov: 50 }}>
                    <Suspense fallback={<Html center><div style={{ color: '#fff' }}>Loading Model...</div></Html>}>
                        <Stage environment="city" intensity={0.5}>
                            <ModelRenderer 
                                url={modelUrl} 
                                explodeOffset={explodeOffset} 
                                xrayMode={xrayMode}
                                onMeshClick={handleMeshClick}
                                measureMode={measureMode}
                                addMeasurementPoint={addMeasurementPoint}
                            />
                        </Stage>
                        
                        {/* Measurement Line */}
                        {points.length > 0 && (
                            <group>
                                {points.map((p, i) => (
                                    <mesh key={i} position={p}>
                                        <sphereGeometry args={[0.1, 16, 16]} />
                                        <meshBasicMaterial color="#ff4d4f" />
                                    </mesh>
                                ))}
                                {points.length === 2 && (
                                    <>
                                        <Line points={[points[0], points[1]]} color="#ff4d4f" lineWidth={3} />
                                        <Html position={points[0].clone().lerp(points[1], 0.5)}>
                                            <div style={{ background: '#ff4d4f', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>
                                                {distance}m
                                            </div>
                                        </Html>
                                    </>
                                )}
                            </group>
                        )}
                    </Suspense>
                    <OrbitControls makeDefault autoRotate={!measureMode && explodeOffset === 0} />
                </Canvas>
            ) : (
                <div style={{ color: '#fff', textAlign: 'center', paddingTop: 300 }}>No model loaded</div>
            )}
        </Modal>
    );
}
