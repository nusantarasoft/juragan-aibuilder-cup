"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, createPortal, useThree } from '@react-three/fiber';
import { Float, useCursor, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

import { useGLTF, useAnimations } from '@react-three/drei';
import { GLTF, SkeletonUtils } from 'three-stdlib';
import { useGraph } from '@react-three/fiber';

type ActionName = 'Arm Stretching' | 'Golf Pre-Putt' | 'Hip Hop Dancing (1)' | 'Hip Hop Dancing' | 'Idle' | 'Kneeling Pointing' | 'Pointing Forward' | 'Salute' | 'Standing Clap' | 'Talking (1)' | 'Talking (2)' | 'Talking' | 'Using A Fax Machine' | 'Waving';

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Object_47001: THREE.SkinnedMesh;
    Object_47001_1: THREE.SkinnedMesh;
    Object_47001_2: THREE.SkinnedMesh;
    Object_47001_3: THREE.SkinnedMesh;
    Object_47001_4: THREE.SkinnedMesh;
    Object_47001_5: THREE.SkinnedMesh;
    Object_47001_6: THREE.SkinnedMesh;
    Object_47001_7: THREE.SkinnedMesh;
    Object_47001_8: THREE.SkinnedMesh;
    mixamorigHips: THREE.Bone;
  };
  materials: {
    Cabels: THREE.MeshStandardMaterial;
    Legs: THREE.MeshStandardMaterial;
    Talia: THREE.MeshStandardMaterial;
    Body: THREE.MeshStandardMaterial;
    Battery_Indicator: THREE.MeshStandardMaterial;
    Head: THREE.MeshStandardMaterial;
    Hands: THREE.MeshStandardMaterial;
    Eyes: THREE.MeshStandardMaterial;
    EyeScreen: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

export type EyeExpression = 'normal' | 'happy' | 'sleepy' | 'angry' | 'sad' | 'surprised' | 'dead' | 'love' | 'star' | 'money' | 'confused' | 'cool';

interface Props {
    state: string;
    eyeExpression?: EyeExpression;
    darkMode?: boolean;
}

export const TamagotchiModel: React.FC<Props> = ({ state, eyeExpression = 'normal', darkMode = false }) => {
    const group = useRef<THREE.Group>(null);
    const { scene: rootScene } = useThree();
    const { scene, animations } = useGLTF('/models/chappie_anim.glb');
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone) as any as GLTFResult;
    const { actions } = useAnimations(animations, group);

    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    useEffect(() => {
        let animationName: ActionName = 'Idle';
        switch (state) {
            case 'dancing': animationName = 'Hip Hop Dancing'; break;
            case 'dancing2': animationName = 'Hip Hop Dancing (1)'; break;
            case 'sleeping': animationName = 'Kneeling Pointing'; break;
            case 'surprised': animationName = 'Salute'; break;
            case 'waving': animationName = 'Waving'; break;
            case 'refusing': animationName = 'Arm Stretching'; break;
            case 'stretching': animationName = 'Arm Stretching'; break;
            case 'golfing': animationName = 'Golf Pre-Putt'; break;
            case 'pointing': animationName = 'Pointing Forward'; break;
            case 'salute': animationName = 'Salute'; break;
            case 'clapping': animationName = 'Standing Clap'; break;
            case 'talking': animationName = 'Talking'; break;
            case 'talking1': animationName = 'Talking (1)'; break;
            case 'talking2': animationName = 'Talking (2)'; break;
            case 'working': animationName = 'Using A Fax Machine'; break;
            default: animationName = 'Idle'; break;
        }

        // Stop all current animations
        Object.values(actions).forEach(action => action?.fadeOut(0.2));
        
        // Play the requested animation
        const actionToPlay = actions[animationName] || actions['Idle'];
        if (actionToPlay) {
            actionToPlay.reset().fadeIn(0.2).play();
        }
    }, [state, actions]);

    useEffect(() => {
        // Custom shader to restore textures but recolor them perfectly
        const colorizeTexturedMaterial = (material: THREE.MeshStandardMaterial, colorHex: string, boost: number = 5.0) => {
            material.color.set(colorHex);
            // Remove metalness because without an HDRI environment map, metal reflects the black void and looks dark gray!
            material.metalness = 0.0;
            material.roughness = 0.8;
            
            // We use onBeforeCompile to intercept the WebGL shader
            material.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <map_fragment>',
                    `
                    #ifdef USE_MAP
                        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
                        // Massively boost the brightness of the baked-in dark texture directly
                        sampledDiffuseColor.rgb = clamp(sampledDiffuseColor.rgb * ${boost.toFixed(1)}, 0.0, 1.0);
                        // Apply the target color (diffuse)
                        diffuseColor *= sampledDiffuseColor;
                    #endif
                    `
                );
            };
            material.needsUpdate = true;
        };

        // Main Armor (Matching the chest color)
        colorizeTexturedMaterial(materials.Body, '#ffffff', 6.0);
        colorizeTexturedMaterial(materials.Head, '#ffffff', 6.0);
        colorizeTexturedMaterial(materials.Hands, '#ffffff', 6.0);
        colorizeTexturedMaterial(materials.Talia, '#ffffff', 6.0);
        colorizeTexturedMaterial(materials.Legs, '#ffffff', 6.0);
        
        // Accents (A bit of red and blue)
        colorizeTexturedMaterial(materials.Cabels, '#ef4444', 8.0);
        colorizeTexturedMaterial(materials.Battery_Indicator, '#3b82f6', 4.0);
        
        // Blank black screen for the physical 3D overlay to sit on top of
        materials.EyeScreen.color.set('#000000');
        materials.EyeScreen.emissive = new THREE.Color('#000000');
        materials.EyeScreen.metalness = 0.5;
        materials.EyeScreen.roughness = 0.5;
        materials.EyeScreen.needsUpdate = true;
    }, [materials]);

    const getEyeColorHex = (exp: string) => {
        switch(exp) {
            case 'happy': return '#10b981';
            case 'sleepy': return '#8b5cf6';
            case 'angry': return '#ef4444';
            case 'love': return '#ec4899';
            case 'star': return '#eab308';
            case 'money': return '#10b981';
            case 'dead': return '#ef4444';
            default: return '#3b82f6';
        }
    };

    const renderEyes = (exp: string) => {
        switch(exp) {
            case 'happy': return <><span style={{transform: 'scale(1.2, 0.8)', display: 'inline-block'}}>^</span><span style={{transform: 'scale(1.2, 0.8)', display: 'inline-block'}}>^</span></>;
            case 'sleepy': return <><span>-</span><span>-</span></>;
            case 'angry': return <><span style={{transform: 'rotate(15deg)', display: 'inline-block'}}>&gt;</span><span style={{transform: 'rotate(-15deg)', display: 'inline-block'}}>&lt;</span></>;
            case 'sad': return <><span>T</span><span>T</span></>;
            case 'surprised': return <><span style={{transform: 'scale(1.5)', display: 'inline-block'}}>O</span><span style={{transform: 'scale(1.5)', display: 'inline-block'}}>O</span></>;
            case 'dead': return <><span>X</span><span>X</span></>;
            case 'love': return <><span>♥</span><span>♥</span></>;
            case 'star': return <><span>★</span><span>★</span></>;
            case 'money': return <><span>$</span><span>$</span></>;
            case 'confused': return <><span>@</span><span>@</span></>;
            case 'cool': return <><span>B</span><span>]</span></>;
            default: return <><span>O</span><span>O</span></>;
        }
    };

    const htmlOverlayRef = useRef<THREE.Group>(null);

    useFrame((stateObj) => {
        const head = group.current?.getObjectByName('mixamorigHead') || nodes.mixamorigHead || nodes.Object_47001_5;
        if (state === 'idle') {
            if (head) {
                head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, stateObj.pointer.x * 0.8, 0.1);
                head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -stateObj.pointer.y * 0.8, 0.1);
            }
        }
        
        // Sync HTML overlay position to the face
        if (head && htmlOverlayRef.current) {
            head.getWorldPosition(htmlOverlayRef.current.position);
            head.getWorldQuaternion(htmlOverlayRef.current.quaternion);
            
            // Move up from the neck bone to the center of the face screen
            // 1.15 was top lip, 0.9 was bottom lip, 1.05 is dead center
            htmlOverlayRef.current.translateY(1.45); 
            // Push slightly forward to float on the glass
            htmlOverlayRef.current.translateZ(0.85); 
        }
    });

    return (
        <>
            <group ref={group} position={[0, -9.5, 0]} scale={[5.5, 5.5, 5.5]} dispose={null} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
                <Float speed={state === 'sleeping' ? 1 : 2} rotationIntensity={0.1} floatIntensity={0.2}>
                    <group name="Scene">
                        <group name="TGT" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
                            <primitive object={nodes.mixamorigHips} />
                        </group>
                        <group name="Chappie" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
                            <skinnedMesh name="Object_47001" geometry={nodes.Object_47001.geometry} material={materials.Cabels} skeleton={nodes.Object_47001.skeleton} />
                            <skinnedMesh name="Object_47001_1" geometry={nodes.Object_47001_1.geometry} material={materials.Legs} skeleton={nodes.Object_47001_1.skeleton} />
                            <skinnedMesh name="Object_47001_2" geometry={nodes.Object_47001_2.geometry} material={materials.Talia} skeleton={nodes.Object_47001_2.skeleton} />
                            <skinnedMesh name="Object_47001_3" geometry={nodes.Object_47001_3.geometry} material={materials.Body} skeleton={nodes.Object_47001_3.skeleton} />
                            <skinnedMesh name="Object_47001_4" geometry={nodes.Object_47001_4.geometry} material={materials.Battery_Indicator} skeleton={nodes.Object_47001_4.skeleton} />
                            <skinnedMesh name="Object_47001_5" geometry={nodes.Object_47001_5.geometry} material={materials.Head} skeleton={nodes.Object_47001_5.skeleton} />
                            <skinnedMesh name="Object_47001_6" geometry={nodes.Object_47001_6.geometry} material={materials.Hands} skeleton={nodes.Object_47001_6.skeleton} />
                            <skinnedMesh name="Object_47001_8" geometry={nodes.Object_47001_8.geometry} material={materials.EyeScreen} skeleton={nodes.Object_47001_8.skeleton} />
                        </group>
                    </group>
                </Float>
            </group>
            
            {/* 3D mapped HTML HUD directly attached to face coordinates */}
            {createPortal(
                <group ref={htmlOverlayRef}>
                    <Html transform center scale={0.25} zIndexRange={[100, 0]} distanceFactor={8}>
                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            color: '#ffffff', // Set core text to white so the glow pops more
                            textShadow: `0 0 10px ${getEyeColorHex(eyeExpression)}, 0 0 20px ${getEyeColorHex(eyeExpression)}, 0 0 40px ${getEyeColorHex(eyeExpression)}, 0 0 80px ${getEyeColorHex(eyeExpression)}, 0 0 120px ${getEyeColorHex(eyeExpression)}`,
                            fontSize: '90px',
                            fontWeight: 'bold',
                            fontFamily: '"Segoe UI", Arial, sans-serif',
                            opacity: 0.95,
                        }}>
                            {renderEyes(eyeExpression)}
                        </div>
                    </Html>
                </group>,
                rootScene
            )}
        </>
    );
};
useGLTF.preload('/models/chappie_anim.glb');

// Global Container removed as it's no longer needed
export const TamagotchiGlobal = () => null;

const btnStyle: React.CSSProperties = {
    background: 'rgba(125, 125, 125, 0.2)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    transition: 'transform 0.1s',
};
