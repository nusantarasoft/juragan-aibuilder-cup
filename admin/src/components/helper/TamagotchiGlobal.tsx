'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type EyeExpression =
    | 'normal'
    | 'happy'
    | 'sleepy'
    | 'angry'
    | 'sad'
    | 'surprised'
    | 'dead'
    | 'love'
    | 'star'
    | 'money'
    | 'confused'
    | 'cool';

interface Props {
    state?: string;
    eyeExpression?: EyeExpression;
    darkMode?: boolean;
    onPet?: () => void;
}

// ─── Spring Physics Class (from threejs-animation skill) ─────────────────────
class Spring {
    stiffness: number;
    damping: number;
    position: number;
    velocity = 0;
    target: number;

    constructor(initial = 0, stiffness = 170, damping = 18) {
        this.position = initial;
        this.target = initial;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    step(dt: number, nextTarget: number): number {
        const clampedDt = Math.min(dt, 0.05);
        this.target = nextTarget;
        const force = -this.stiffness * (this.position - this.target);
        const dampingForce = -this.damping * this.velocity;
        this.velocity += (force + dampingForce) * clampedDt;
        this.position += this.velocity * clampedDt;
        return this.position;
    }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// ─── 1. Procedural Feathered Fur Bump Map (threejs-textures skill) ───────────
function createFurBumpTexture(): THREE.CanvasTexture {
    const size = 512;
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d')!;

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    let seed = 1337;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    bCtx.lineCap = 'round';
    for (let i = 0; i < 9000; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const angle = (rand() - 0.5) * 0.45;
        const len = 5 + rand() * 8;
        const val = Math.floor(95 + rand() * 140);
        bCtx.strokeStyle = `rgb(${val},${val},${val})`;
        bCtx.lineWidth = 1.0 + rand() * 1.5;
        bCtx.beginPath();
        bCtx.moveTo(x, y);
        bCtx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len);
        bCtx.stroke();
    }

    const furBumpMap = new THREE.CanvasTexture(bumpCanvas);
    furBumpMap.wrapS = THREE.RepeatWrapping;
    furBumpMap.wrapT = THREE.RepeatWrapping;
    furBumpMap.repeat.set(3, 2);
    furBumpMap.needsUpdate = true;
    return furBumpMap;
}

// ─── 2. Procedural Woven Crimson Cloth Textures (threejs-textures skill) ─────
function createCrimsonClothTextures(): {
    clothColorMap: THREE.CanvasTexture;
    clothBumpMap: THREE.CanvasTexture;
} {
    const size = 512;
    const colCanv = document.createElement('canvas');
    colCanv.width = size;
    colCanv.height = size;
    const cCtx = colCanv.getContext('2d')!;

    const bumpCanv = document.createElement('canvas');
    bumpCanv.width = size;
    bumpCanv.height = size;
    const bCtx = bumpCanv.getContext('2d')!;

    const grad = cCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#aa3030');
    grad.addColorStop(0.55, '#942323');
    grad.addColorStop(0.85, '#7a1919');
    grad.addColorStop(1, '#581010');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    cCtx.strokeStyle = 'rgba(42, 8, 8, 0.12)';
    bCtx.strokeStyle = 'rgba(210, 210, 210, 0.22)';
    cCtx.lineWidth = 1;
    bCtx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
        cCtx.beginPath();
        cCtx.moveTo(0, i);
        cCtx.lineTo(size, i);
        cCtx.stroke();

        cCtx.beginPath();
        cCtx.moveTo(i, 0);
        cCtx.lineTo(i, size);
        cCtx.stroke();

        bCtx.beginPath();
        bCtx.moveTo(0, i);
        bCtx.lineTo(size, i);
        bCtx.stroke();
    }

    const clothColorMap = new THREE.CanvasTexture(colCanv);
    clothColorMap.colorSpace = THREE.SRGBColorSpace;
    clothColorMap.wrapS = THREE.RepeatWrapping;
    clothColorMap.wrapT = THREE.ClampToEdgeWrapping;
    clothColorMap.needsUpdate = true;

    const clothBumpMap = new THREE.CanvasTexture(bumpCanv);
    clothBumpMap.wrapS = THREE.RepeatWrapping;
    clothBumpMap.wrapT = THREE.ClampToEdgeWrapping;
    clothBumpMap.needsUpdate = true;

    return { clothColorMap, clothBumpMap };
}

// ─── 3. Soft Airbrushed Studio Contact Shadow Texture ────────────────────────
function createSoftShadowTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size * 0.5;
    const cy = size * 0.5;

    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(cx, cy, size * 0.04, cx, cy, size * 0.48);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.38)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.18)');
    grad.addColorStop(0.78, 'rgba(15, 23, 42, 0.05)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// ─── 4. Front-Facing Curved Eye Decal Geometry (threejs-geometry skill) ──────
function createCurvedEyeGeometry(width: number, height: number, curvature: number): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(width, height, 24, 24);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const nx = v.x / (width * 0.5);
        const ny = v.y / (height * 0.5);
        const r2 = nx * nx + ny * ny;
        v.z = Math.max(0, 1 - r2 * 0.65) * curvature;
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
}

// ─── 5. Dynamic 512x512 CanvasTexture Renderer for All 12 EyeExpression States ─
function drawEyeOnCanvas(
    ctx: CanvasRenderingContext2D,
    expression: EyeExpression,
    side: 'left' | 'right',
    time: number,
    blinkOpen: number,
    isRefusingSquint: boolean
) {
    const size = ctx.canvas.width; // 512x512
    const cx = size * 0.5;
    const cy = size * 0.5;
    const r = size * 0.31;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);

    // Subtle dark charcoal eye-socket AO ring so glowing cyan eyes pop crisply against the fur
    const socketGrad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 1.38);
    socketGrad.addColorStop(0, 'rgba(18, 22, 30, 0.85)');
    socketGrad.addColorStop(0.65, 'rgba(22, 27, 36, 0.48)');
    socketGrad.addColorStop(1, 'rgba(24, 30, 40, 0.0)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.38, 0, Math.PI * 2);
    ctx.fill();

    const blinksNaturally =
        expression === 'normal' ||
        expression === 'angry' ||
        expression === 'sad' ||
        expression === 'cool';
    const scaleY = blinksNaturally ? Math.max(0.08, blinkOpen) : 1.0;
    ctx.scale(1, scaleY);

    const drawWithBloom = (glowColor: string, blurRadius: number, drawFn: () => void) => {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = blurRadius * 1.35;
        drawFn();
        ctx.shadowBlur = blurRadius * 0.65;
        drawFn();
        ctx.restore();
    };

    if (isRefusingSquint) {
        drawWithBloom('#00f0ff', 42, () => {
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = size * 0.088;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-r * 0.85, 0);
            ctx.lineTo(r * 0.85, 0);
            ctx.stroke();
        });
        ctx.strokeStyle = '#e8ffff';
        ctx.lineWidth = size * 0.042;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.80, 0);
        ctx.lineTo(r * 0.80, 0);
        ctx.stroke();
        ctx.restore();
        return;
    }

    switch (expression) {
        case 'normal':
        case 'cool': {
            const outerHalo = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.34);
            outerHalo.addColorStop(0, 'rgba(80, 248, 255, 0.98)');
            outerHalo.addColorStop(0.52, 'rgba(0, 218, 255, 0.78)');
            outerHalo.addColorStop(0.80, 'rgba(0, 180, 245, 0.32)');
            outerHalo.addColorStop(1, 'rgba(0, 150, 235, 0.0)');
            ctx.fillStyle = outerHalo;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.34, 0, Math.PI * 2);
            ctx.fill();

            drawWithBloom('#00f0ff', 46, () => {
                const coreGrad = ctx.createRadialGradient(-r * 0.08, -r * 0.08, r * 0.04, 0, 0, r * 0.86);
                coreGrad.addColorStop(0, '#ffffff');
                coreGrad.addColorStop(0.42, '#94fcff');
                coreGrad.addColorStop(0.78, '#00e5ff');
                coreGrad.addColorStop(1, '#00a3e0');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.84, r * 0.88, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }

        case 'happy': {
            const drawHappyArc = (lineW: number, strokeCol: string) => {
                ctx.strokeStyle = strokeCol;
                ctx.lineWidth = lineW;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(-r * 0.82, r * 0.24);
                ctx.quadraticCurveTo(0, -r * 0.88, r * 0.82, r * 0.24);
                ctx.stroke();
            };
            drawWithBloom('#00f0ff', 46, () => {
                drawHappyArc(size * 0.105, '#00e5ff');
            });
            drawHappyArc(size * 0.046, '#e8ffff');
            break;
        }

        case 'sleepy': {
            drawWithBloom('#00e5ff', 38, () => {
                ctx.fillStyle = '#28f0ff';
                ctx.beginPath();
                ctx.arc(0, r * 0.06, r * 0.78, 0.08 * Math.PI, 0.92 * Math.PI, false);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#c8ffff';
                ctx.lineWidth = size * 0.055;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-r * 0.82, r * 0.06);
                ctx.quadraticCurveTo(0, r * 0.18, r * 0.82, r * 0.06);
                ctx.stroke();
            });
            break;
        }

        case 'angry': {
            const slant = side === 'left' ? 0.38 : -0.38;
            ctx.save();
            ctx.rotate(slant);
            drawWithBloom('#00f0ff', 44, () => {
                const grad = ctx.createRadialGradient(0, r * 0.15, r * 0.05, 0, r * 0.1, r * 0.85);
                grad.addColorStop(0, '#f0ffff');
                grad.addColorStop(0.50, '#4cf6ff');
                grad.addColorStop(1, '#00b4e0');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, r * 0.08, r * 0.80, 0.02 * Math.PI, 0.98 * Math.PI, false);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#e8ffff';
                ctx.lineWidth = size * 0.052;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-r * 0.84, r * 0.08);
                ctx.lineTo(r * 0.84, r * 0.08);
                ctx.stroke();
            });
            ctx.restore();
            break;
        }

        case 'sad': {
            const slant = side === 'left' ? -0.34 : 0.34;
            ctx.save();
            ctx.rotate(slant);
            drawWithBloom('#00e5ff', 40, () => {
                const grad = ctx.createRadialGradient(0, r * 0.15, r * 0.05, 0, r * 0.1, r * 0.82);
                grad.addColorStop(0, '#e8ffff');
                grad.addColorStop(0.55, '#42f0ff');
                grad.addColorStop(1, '#00a8d4');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, r * 0.10, r * 0.78, 0.02 * Math.PI, 0.98 * Math.PI, false);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#d8ffff';
                ctx.lineWidth = size * 0.048;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-r * 0.82, r * 0.10);
                ctx.lineTo(r * 0.82, r * 0.10);
                ctx.stroke();
            });
            ctx.restore();

            const tearX = side === 'left' ? -r * 0.66 : r * 0.66;
            const tearBounce = Math.sin(time * 5.2) * (size * 0.018);
            drawWithBloom('#00f0ff', 26, () => {
                ctx.fillStyle = '#9efbff';
                ctx.beginPath();
                ctx.arc(tearX, r * 0.56 + tearBounce, r * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(
                    tearX + (side === 'left' ? -r * 0.15 : r * 0.15),
                    r * 0.84 + tearBounce * 1.2,
                    r * 0.09,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });
            break;
        }

        case 'surprised': {
            drawWithBloom('#00f0ff', 46, () => {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = size * 0.095;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.80, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.strokeStyle = '#e8ffff';
            ctx.lineWidth = size * 0.040;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.80, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }

        case 'dead': {
            const drawX = (width: number, color: string) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-r * 0.64, -r * 0.64);
                ctx.lineTo(r * 0.64, r * 0.64);
                ctx.moveTo(r * 0.64, -r * 0.64);
                ctx.lineTo(-r * 0.64, r * 0.64);
                ctx.stroke();
            };
            drawWithBloom('#00f0ff', 42, () => {
                drawX(size * 0.105, '#00e5ff');
            });
            drawX(size * 0.044, '#e8ffff');
            break;
        }

        case 'love': {
            const drawHeart = () => {
                ctx.save();
                ctx.translate(0, -r * 0.06);
                const hs = r * 0.88;
                ctx.beginPath();
                ctx.moveTo(0, hs * 0.82);
                ctx.bezierCurveTo(-hs * 1.18, hs * 0.18, -hs * 1.05, -hs * 0.78, 0, -hs * 0.25);
                ctx.bezierCurveTo(hs * 1.05, -hs * 0.78, hs * 1.18, hs * 0.18, 0, hs * 0.82);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            };
            drawWithBloom('#ff4db8', 46, () => {
                const hGrad = ctx.createLinearGradient(0, -r * 0.85, 0, r * 0.85);
                hGrad.addColorStop(0, '#78faff');
                hGrad.addColorStop(0.42, '#ff75c6');
                hGrad.addColorStop(1, '#ff2a95');
                ctx.fillStyle = hGrad;
                drawHeart();
            });
            break;
        }

        case 'star': {
            const drawStar = (outerR: number, innerR: number) => {
                ctx.beginPath();
                const spikes = 5;
                for (let i = 0; i < spikes * 2; i++) {
                    const rad = i % 2 === 0 ? outerR : innerR;
                    const ang = (i * Math.PI) / spikes - Math.PI / 2;
                    const x = Math.cos(ang) * rad;
                    const y = Math.sin(ang) * rad;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
            };
            drawWithBloom('#00f0ff', 46, () => {
                const sGrad = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r * 1.05);
                sGrad.addColorStop(0, '#fff7a8');
                sGrad.addColorStop(0.50, '#70f8ff');
                sGrad.addColorStop(1, '#00c8ff');
                ctx.fillStyle = sGrad;
                drawStar(r * 1.02, r * 0.44);
                ctx.fill();
            });
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = size * 0.020;
            drawStar(r * 1.02, r * 0.44);
            ctx.stroke();
            break;
        }

        case 'money': {
            drawWithBloom('#10b981', 44, () => {
                ctx.font = `900 ${Math.round(size * 0.56)}px "Segoe UI", Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = size * 0.04;
                ctx.strokeStyle = '#10b981';
                ctx.strokeText('$', 0, size * 0.025);
                ctx.fillStyle = '#a7f3d0';
                ctx.fillText('$', 0, size * 0.025);
            });
            break;
        }

        case 'confused': {
            const drawConfusedPath = (lineW: number, color: string) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineW;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (side === 'left') {
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.72, -r * 0.22);
                    ctx.bezierCurveTo(-r * 0.25, -r * 0.85, r * 0.55, -r * 0.42, 0, 0);
                    ctx.bezierCurveTo(-r * 0.55, r * 0.42, r * 0.25, r * 0.85, r * 0.72, r * 0.18);
                    ctx.stroke();
                } else {
                    ctx.save();
                    ctx.rotate(time * 2.5);
                    ctx.beginPath();
                    const turns = 2.65;
                    const steps = 64;
                    for (let i = 0; i <= steps; i++) {
                        const u = i / steps;
                        const ang = u * turns * Math.PI * 2;
                        const rad = u * r * 0.86;
                        const x = Math.cos(ang) * rad;
                        const y = Math.sin(ang) * rad;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            };
            drawWithBloom('#00f0ff', 40, () => {
                drawConfusedPath(size * 0.072, '#00e5ff');
            });
            drawConfusedPath(size * 0.030, '#e8ffff');
            break;
        }
    }

    ctx.restore();
}

// ─── 6. Procedural Arcane Rune Floor Texture (for 13 WORKING) ────────────────
function createArcaneRuneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const cx = 256;
    const cy = 256;

    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#38f2ff';
    ctx.fillStyle = '#38f2ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;

    const radii = [232, 212, 174, 96];
    radii.forEach((rad, idx) => {
        ctx.lineWidth = idx === 1 ? 6 : 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.lineWidth = 4;
    for (let t = 0; t < 2; t++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const ang = (i * Math.PI * 2) / 3 + (t * Math.PI) / 3 - Math.PI / 2;
            const x = cx + Math.cos(ang) * 172;
            const y = cy + Math.sin(ang) * 172;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    const numRunes = 24;
    ctx.lineWidth = 3;
    for (let i = 0; i < numRunes; i++) {
        const ang = (i / numRunes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 182, cy + Math.sin(ang) * 182);
        ctx.lineTo(cx + Math.cos(ang) * 208, cy + Math.sin(ang) * 208);
        ctx.stroke();
        if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * 195, cy + Math.sin(ang) * 195, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function createBadgeSpriteTexture(text: string, color: string, glowColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.font = '900 76px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

export const TamagotchiModel: React.FC<Props> = ({
    state = 'idle',
    eyeExpression = 'normal',
    onPet,
}) => {
    const rootRef = useRef<THREE.Group>(null);
    const characterRef = useRef<THREE.Group>(null);
    const bodyGroupRef = useRef<THREE.Group>(null);
    const headLookRef = useRef<THREE.Group>(null);
    const hoodRef = useRef<THREE.Group>(null);
    const scarfRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const leftFootRef = useRef<THREE.Group>(null);
    const rightFootRef = useRef<THREE.Group>(null);
    const mouthOpenRef = useRef<THREE.Mesh>(null);

    // VFX & Prop Refs
    const sunglassesRef = useRef<THREE.Group>(null);
    const golfGroupRef = useRef<THREE.Group>(null);
    const golfClubRef = useRef<THREE.Group>(null);
    const golfOrbRef = useRef<THREE.Group>(null);
    const workConjureRef = useRef<THREE.Group>(null);
    const leftPawRingRef = useRef<THREE.Mesh>(null);
    const rightPawRingRef = useRef<THREE.Mesh>(null);
    const danceSwirlRef = useRef<THREE.Group>(null);
    const clapSparksRef = useRef<THREE.Group>(null);
    const talkBubblesRef = useRef<THREE.Group>(null);
    const zzzGroupRef = useRef<THREE.Group>(null);
    const confusedGroupRef = useRef<THREE.Group>(null);
    const refuseXSpriteRef = useRef<THREE.Sprite>(null);
    const embersRef = useRef<THREE.InstancedMesh>(null);

    const [hovered, setHovered] = useState(false);
    const [manualExpIndex, setManualExpIndex] = useState<number | null>(null);
    useCursor(hovered);

    const ALL_EXPRESSIONS: EyeExpression[] = [
        'normal', 'happy', 'sleepy', 'angry', 'sad', 'surprised',
        'dead', 'love', 'star', 'money', 'confused', 'cool',
    ];

    useEffect(() => {
        setManualExpIndex(null);
    }, [eyeExpression, state]);

    useEffect(() => {
        if (manualExpIndex === null) return;
        const timer = setTimeout(() => setManualExpIndex(null), 4500);
        return () => clearTimeout(timer);
    }, [manualExpIndex]);

    const effectiveExpression: EyeExpression = useMemo(() => {
        if (manualExpIndex !== null) {
            return ALL_EXPRESSIONS[manualExpIndex % ALL_EXPRESSIONS.length];
        }
        if (eyeExpression) {
            return eyeExpression;
        }
        return 'normal';
    }, [eyeExpression, manualExpIndex]);

    // ─── Build Exact Reference-Matched Geometries (threejs-geometry skill) ─────
    const {
        bodyGeo,
        hornGeo,
        hoodCowlGeo,
        hoodRimGeo,
        scarfCoilsGeo,
        frontApronGeo,
        cloakGeo,
        eyeDecalGeo,
        pawGeo,
        footGeo,
        noseGeo,
        muzzleBridgeGeo,
        golfTrailGeo,
        swirlRibbonGeo1,
        swirlRibbonGeo2,
    } = useMemo(() => {
        const v = new THREE.Vector3();

        // 1A. Plump Pear-Ovoid Body (Matching FRONT & SIDE VIEW Silhouette)
        // Upper head: rx ≈ 0.44, rz ≈ 0.43 (top at y = +0.54)
        // Neck (y ≈ +0.08): rx ≈ 0.43, rz ≈ 0.42 (so the V-draped scarf at r = 0.46..0.51 fits snugly without bulging!)
        // Lower belly (y = -0.05 to -0.58): swells to rx ≈ 0.53, rz ≈ 0.50 (giving a full, prominent chubby pear belly!)
        const bGeo = new THREE.SphereGeometry(0.48, 128, 128);
        const pos = bGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const dir = v.clone().normalize();

            // Pear silhouette: narrower upper head, snug neck at y ≈ +0.08, plump lower belly at y ≈ -0.30
            const bellyFullness = smoothstep(-0.85, -0.25, dir.y) * (1 - smoothstep(-0.18, 0.28, dir.y));
            const headTaper = smoothstep(0.05, 0.85, dir.y);
            const neckIn = smoothstep(-0.08, 0.14, dir.y) * (1 - smoothstep(0.14, 0.36, dir.y));

            const scaleX = 0.96 + bellyFullness * 0.18 - headTaper * 0.10 - neckIn * 0.05;
            const scaleZ = 0.93 + bellyFullness * 0.15 - headTaper * 0.08 - neckIn * 0.04;
            v.x *= scaleX;
            v.z *= scaleZ;
            v.y *= 1.18; // Extends from y = -0.56 to y = +0.56

            if (dir.y < -0.72) {
                v.y *= 0.94;
            }

            // Subtle eye sockets & chubby lower cheeks on upper face (dir.y > 0.15)
            if (dir.z > 0.30 && dir.y > 0.12) {
                const dLeftEye = Math.hypot(dir.x + 0.34, dir.y - 0.42);
                const dRightEye = Math.hypot(dir.x - 0.34, dir.y - 0.42);
                const eyeSocket =
                    (1 - smoothstep(0.04, 0.20, dLeftEye)) +
                    (1 - smoothstep(0.04, 0.20, dRightEye));
                v.z -= eyeSocket * 0.015;

                const dCheek = Math.hypot(Math.abs(dir.x) - 0.44, dir.y - 0.26);
                const cheekPuff = (1 - smoothstep(0.0, 0.25, dCheek)) * smoothstep(0.2, 0.7, dir.z);
                v.x += Math.sign(dir.x) * cheekPuff * 0.025;
                v.z += cheekPuff * 0.016;
            }

            // Feathered fur silhouette tufts along the chubby lower belly & flanks (matching FRONT VIEW)
            if (dir.y < -0.05) {
                const angle = Math.atan2(dir.x, dir.z);
                const tuft =
                    Math.sin(angle * 26.0 + dir.y * 8.0) * 0.009 +
                    Math.cos(angle * 42.0 - dir.y * 16.0) * 0.007;
                v.addScaledVector(dir, tuft * smoothstep(-0.05, -0.35, dir.y));
            }

            pos.setXYZ(i, v.x, v.y, v.z);
        }
        bGeo.computeVertexNormals();

        // 1B. Curved, Ridged Metallic-Bone Forehead Horn (Protruding ABOVE the top of the hood!)
        // Height 0.30: when placed at [0, 0.53, 0.28] with rotation [0.06, 0, 0],
        // base sits in the top brow notch (y = 0.44) and tip rises to y = 0.70 (well above the 0.58 hood arch!)
        const hGeo = new THREE.CylinderGeometry(0.006, 0.072, 0.30, 48, 32);
        const hPos = hGeo.attributes.position;
        for (let i = 0; i < hPos.count; i++) {
            v.fromBufferAttribute(hPos, i);
            const t = (v.y + 0.15) / 0.30; // 0 at base, 1 at tip
            const radiusScale = Math.pow(1 - t * 0.92, 0.76);
            const currentR = Math.hypot(v.x, v.z);
            const angle = Math.atan2(v.x, v.z);
            if (currentR > 0.0001) {
                const flutes = Math.sin(angle * 10.0) * 0.048 * (1 - t * 0.45);
                const rings = Math.sin(t * 24.0) * 0.025 * (1 - t * 0.8);
                const targetR = 0.072 * radiusScale * (1 + flutes + rings);
                v.x = (v.x / currentR) * targetR;
                v.z = (v.z / currentR) * targetR;
            }
            // Subtle forward-then-upward horn curve (matching SIDE VIEW)
            v.z += Math.sin(t * Math.PI * 0.6) * 0.024 - Math.pow(t, 2.1) * 0.032;
            hPos.setXYZ(i, v.x, v.y, v.z);
        }
        hGeo.computeVertexNormals();

        // 1C. Parametric Hood Cowl (Sits from y = +0.06 up to y = +0.58, with a deep V-notch at top center
        // so the upper half of the bone horn protrudes cleanly ABOVE the hood silhouette!)
        const uSegs = 96;
        const vSegs = 64;
        const hdGeo = new THREE.BufferGeometry();
        const hdVerts: number[] = [];
        const hdUvs: number[] = [];
        const hdIndices: number[] = [];

        for (let iv = 0; iv <= vSegs; iv++) {
            const sRaw = iv / vSegs;
            const isLip = sRaw > 0.85;
            const lipFrac = isLip ? (sRaw - 0.85) / 0.15 : 0;
            const s = isLip ? 1.0 - lipFrac * 0.03 : sRaw / 0.85;

            for (let iu = 0; iu <= uSegs; iu++) {
                const u = iu / uSegs;
                const phi = (u - 0.5) * Math.PI * 2; // 0 is top crown, ±PI is bottom back

                // Rear pointed hood peak (matching SIDE VIEW & BACK VIEW)
                const peakY = 0.30;
                const peakZ = -0.74;

                const crownRx = 0.54;
                const crownRy = 0.48;

                // Deep V-notch at phi ≈ 0 on the front rim so the horn pierces/protrudes through the top!
                const hornNotch = Math.exp(-phi * phi * 24.0) * smoothstep(0.68, 1.0, s);
                const templeWidth = Math.sin(phi) * Math.sin(phi) * 0.05;

                const frontRx = 0.42 + templeWidth;
                const frontRy = 0.36;
                const frontCenterY = 0.21;

                // Small weathered nicks on left & right hood rim edges
                const absPhi = Math.abs(phi);
                const nick1 = Math.exp(-Math.pow((absPhi - 0.85) * 16.0, 2)) * 0.035;
                const nick2 = Math.exp(-Math.pow((absPhi - 1.32) * 18.0, 2)) * 0.028;
                const rimNotch = (nick1 + nick2) * smoothstep(0.75, 1.0, s);

                const bell = Math.sin(s * Math.PI * 0.72);
                const archBlend = Math.pow(s, 1.35);

                const rx = THREE.MathUtils.lerp(crownRx * bell, frontRx, archBlend);
                const ry = THREE.MathUtils.lerp(crownRy * bell, frontRy, archBlend);
                const cy = THREE.MathUtils.lerp(peakY, frontCenterY, s) + (1 - s) * s * 0.16;

                let px = Math.sin(phi) * rx;
                let py = cy + Math.cos(phi) * ry - hornNotch * 0.065;
                let pz = THREE.MathUtils.lerp(peakZ, 0.36, Math.pow(s, 0.86)) - rimNotch - hornNotch * 0.11;

                // Tuck the bottom of the hood (|phi| > 1.45) into the neck scarf at y = +0.06
                const bottomWeight = smoothstep(1.40, 2.65, absPhi);
                py = THREE.MathUtils.lerp(py, 0.06, bottomWeight * smoothstep(0.3, 1.0, s));
                pz -= bottomWeight * 0.12 * s;

                // Ensure hood stays strictly outside the upper head sphere (center [0, 0.22, 0], radius 0.465)
                const distFromHead = Math.hypot(px, py - 0.22, pz);
                if (distFromHead < 0.468 && s < 0.92 && !isLip) {
                    const push = 0.468 / Math.max(0.001, distFromHead);
                    px *= push;
                    py = 0.22 + (py - 0.22) * push;
                    pz *= push;
                }

                const clothFold =
                    (Math.sin(phi * 4.0 + s * 8.0) * 0.010 +
                        Math.cos(phi * 7.0 - s * 5.0) * 0.007) *
                    Math.sin(s * Math.PI);
                px += Math.sin(phi) * clothFold;
                py += Math.cos(phi) * clothFold;

                if (isLip) {
                    const lipInset = Math.sin(lipFrac * Math.PI * 0.5) * 0.052;
                    const lipBack = lipFrac * 0.045;
                    px *= 1.0 - lipInset * 0.75;
                    py -= Math.cos(phi) * lipInset * 0.65;
                    pz -= lipBack;
                }

                hdVerts.push(px, py, pz);
                hdUvs.push(u * 2.0, sRaw);
            }
        }

        for (let iv = 0; iv < vSegs; iv++) {
            for (let iu = 0; iu < uSegs; iu++) {
                const a = iv * (uSegs + 1) + iu;
                const b = a + 1;
                const c = a + (uSegs + 1);
                const d = c + 1;
                hdIndices.push(a, b, c);
                hdIndices.push(b, d, c);
            }
        }
        hdGeo.setAttribute('position', new THREE.Float32BufferAttribute(hdVerts, 3));
        hdGeo.setAttribute('uv', new THREE.Float32BufferAttribute(hdUvs, 2));
        hdGeo.setIndex(hdIndices);
        hdGeo.computeVertexNormals();

        // Rolled 3D Arch Rim Tube framing the face opening (dipping into a V-notch under the horn)
        const rimCurvePts: THREE.Vector3[] = [];
        const numRimPts = 56;
        for (let i = 0; i <= numRimPts; i++) {
            const u = (i / numRimPts) * 2 - 1;
            const phi = u * 1.56;
            const hornNotch = Math.exp(-phi * phi * 24.0);
            const rx = Math.sin(phi) * (0.41 + Math.sin(phi) * Math.sin(phi) * 0.05);
            const ry = 0.20 + Math.cos(phi) * 0.35 - hornNotch * 0.065;
            const rz = 0.35 - Math.abs(u) * 0.04 - hornNotch * 0.105;
            rimCurvePts.push(new THREE.Vector3(rx, ry, rz));
        }
        const rimCurve = new THREE.CatmullRomCurve3(rimCurvePts);
        const hRimGeo = new THREE.TubeGeometry(rimCurve, 64, 0.042, 16, false);

        // 1D. Snug V-Draped Neck Scarf Folds (Matching FRONT VIEW: snug width rx ≈ 0.48,
        // dipping diagonally into a V in the front, sitting HIGH at y = +0.08 to -0.08 so the plump belly is exposed!)
        const createVDrapedScarfFold = (
            radius: number,
            tube: number,
            yOffset: number,
            frontVDip: number,
            tiltZ: number,
            seed: number
        ) => {
            const tGeo = new THREE.TorusGeometry(radius, tube, 28, 96);
            tGeo.rotateX(Math.PI / 2);
            tGeo.rotateZ(tiltZ);
            const tPos = tGeo.attributes.position;
            for (let i = 0; i < tPos.count; i++) {
                v.fromBufferAttribute(tPos, i);
                const angle = Math.atan2(v.x, v.z); // 0 is front center (+Z)
                const frontFactor = Math.max(0, Math.cos(angle));
                const backFactor = Math.max(0, -Math.cos(angle));

                // Diagonal V-dip toward the front chest center (matching FRONT VIEW!)
                const vDip = Math.pow(frontFactor, 1.35) * frontVDip;
                const bDip = Math.pow(backFactor, 1.5) * 0.035;
                const crease =
                    Math.sin(angle * 5 + seed) * 0.010 +
                    Math.cos(angle * 9 - seed) * 0.007;

                v.y += yOffset - vDip - bDip + crease;
                // Keep horizontal X width snug (0.98) and push front Z slightly forward for layered V-folds
                v.x *= 0.99;
                v.z += frontFactor * 0.035;
                tPos.setXYZ(i, v.x, v.y, v.z);
            }
            tGeo.computeVertexNormals();
            return tGeo;
        };

        const fold1 = createVDrapedScarfFold(0.44, 0.056, 0.095, 0.065, 0.03, 1.1);
        const fold2 = createVDrapedScarfFold(0.46, 0.060, 0.045, 0.095, -0.04, 2.7);
        const fold3 = createVDrapedScarfFold(0.47, 0.058, -0.005, 0.125, 0.03, 4.3);
        const fold4 = createVDrapedScarfFold(0.45, 0.052, -0.050, 0.145, -0.02, 5.9);
        const sCoilsGeo = mergeGeometries([fold1, fold2, fold3, fold4]);

        // 1E. Prominent Triangular Jagged V-Mantle Over Upper Chest (Matching FRONT VIEW!)
        // Extends from under the scarf folds (y = +0.02) down to a central V-point at y = -0.25,
        // leaving the entire lower belly (y = -0.25 to -0.58) clearly visible!
        const apronShape = new THREE.Shape();
        apronShape.moveTo(-0.36, 0.06);
        apronShape.lineTo(0.36, 0.06);
        // Right diagonal edge with crisp torn notches
        apronShape.lineTo(0.32, -0.05);
        apronShape.lineTo(0.27, -0.02);
        apronShape.lineTo(0.20, -0.13);
        apronShape.lineTo(0.15, -0.09);
        apronShape.lineTo(0.08, -0.20);
        apronShape.lineTo(0.04, -0.16);
        apronShape.lineTo(0.00, -0.25); // Central V-tip over upper chest
        // Left diagonal edge with crisp torn notches
        apronShape.lineTo(-0.05, -0.17);
        apronShape.lineTo(-0.10, -0.22);
        apronShape.lineTo(-0.16, -0.12);
        apronShape.lineTo(-0.22, -0.16);
        apronShape.lineTo(-0.27, -0.05);
        apronShape.lineTo(-0.33, -0.08);
        apronShape.closePath();

        const apronGeo = new THREE.ExtrudeGeometry(apronShape, {
            steps: 2,
            depth: 0.030,
            bevelEnabled: true,
            bevelThickness: 0.010,
            bevelSize: 0.008,
            bevelSegments: 3,
        });
        const aPos = apronGeo.attributes.position;
        for (let i = 0; i < aPos.count; i++) {
            v.fromBufferAttribute(aPos, i);
            const chestAng = v.x * 1.05;
            const rad = 0.495 + v.z;
            const ny = v.y - 0.02;
            v.x = Math.sin(chestAng) * rad;
            v.z = Math.cos(chestAng) * rad + 0.025;
            v.y = ny;
            aPos.setXYZ(i, v.x, v.y, v.z);
        }
        apronGeo.computeVertexNormals();

        // 1F. Sculpted 3D Tattered Cloak (Drapes closely along shoulders & arms, flaring ONLY at the floor
        // into 14 sharp, deep V-shaped tattered cloth strips matching FRONT, SIDE & BACK views!)
        const cSegsU = 140;
        const cSegsV = 52;
        const clkGeo = new THREE.BufferGeometry();
        const clkVerts: number[] = [];
        const clkUvs: number[] = [];
        const clkIndices: number[] = [];

        // Open in front (angle from +0.58 around sides/back to 2*PI - 0.58) so the plump belly is 100% visible!
        const startAng = 0.58;
        const endAng = Math.PI * 2 - 0.58;
        const spanAng = endAng - startAng;

        for (let iv = 0; iv <= cSegsV; iv++) {
            const t = iv / cSegsV; // 0 at neck/scarf, 1 at floor hem
            for (let iu = 0; iu <= cSegsU; iu++) {
                const u = iu / cSegsU;
                const ang = startAng + u * spanAng;

                const edgeDist = Math.min(u, 1 - u);
                const frontTaper = smoothstep(0.0, 0.10, edgeDist);

                // Hugs shoulders & flanks closely (r = 0.47 -> 0.58), then flares out on the floor (t > 0.65) to r = 0.82!
                const upperDrapeR = 0.47 + t * 0.14;
                const floorFlare = Math.pow(Math.max(0, (t - 0.45) / 0.55), 2.1) * 0.24 * frontTaper;

                // Vertical drapery folds
                const pleats =
                    (Math.sin(u * Math.PI * 12.0) * 0.028 +
                        Math.cos(u * Math.PI * 20.0 + 0.4) * 0.016) *
                    Math.sin(t * Math.PI * 0.9);

                // 14 sharp triangular tattered cloth strips along the bottom hem!
                // Using triangle wave (1 - 2*abs(fract(...) - 0.5)) for crisp pointed cloth tips & V-notches!
                const numStrips = 14.0;
                const stripPhase = u * numStrips;
                const triWave = 1.0 - 2.0 * Math.abs(stripPhase - Math.floor(stripPhase) - 0.5); // 0 at valley, 1 at tip
                const stripMod = 0.75 + 0.25 * Math.sin(Math.floor(stripPhase) * 2.3);

                const tatterTipExt = triWave * stripMod * Math.pow(t, 2.8) * 0.14;
                const tatterValleyCut = (1.0 - triWave) * Math.pow(t, 2.4) * 0.16;

                const rad = upperDrapeR + floorFlare + pleats + tatterTipExt;
                const px = Math.sin(ang) * rad;
                const pz = Math.cos(ang) * rad;

                // Drapes from y = +0.02 under the scarf down to the floor at y = -0.64,
                // with sharp V-notches cut upward (+tatterValleyCut) between the pointed strips!
                const baseHemY = 0.02 - t * 0.66;
                const py = Math.max(-0.64, baseHemY + tatterValleyCut);

                clkVerts.push(px, py, pz);
                clkUvs.push(u * 2.0, t);
            }
        }

        for (let iv = 0; iv < cSegsV; iv++) {
            for (let iu = 0; iu < cSegsU; iu++) {
                const a = iv * (cSegsU + 1) + iu;
                const b = a + 1;
                const c = a + (cSegsU + 1);
                const d = c + 1;
                clkIndices.push(a, b, c);
                clkIndices.push(b, d, c);
            }
        }
        clkGeo.setAttribute('position', new THREE.Float32BufferAttribute(clkVerts, 3));
        clkGeo.setAttribute('uv', new THREE.Float32BufferAttribute(clkUvs, 2));
        clkGeo.setIndex(clkIndices);
        clkGeo.computeVertexNormals();

        // 1G. Front-Facing Curved Eye Decal Geometry
        const eDecalGeo = createCurvedEyeGeometry(0.195, 0.195, 0.024);

        // 1H. Stubby Limbs Using CapsuleGeometry (from threejs-geometry skill)
        const pGeo = new THREE.CapsuleGeometry(0.078, 0.060, 12, 24);
        pGeo.scale(0.95, 1.0, 0.85);

        const ftGeo = new THREE.CapsuleGeometry(0.095, 0.045, 12, 24);
        ftGeo.rotateX(Math.PI / 2);
        ftGeo.scale(1.02, 0.80, 1.05);

        // Cute triangular feline nose (slight inverted-triangle puff)
        const nGeo = new THREE.SphereGeometry(0.022, 24, 24);
        nGeo.scale(1.25, 0.85, 0.85);

        // Soft integrated muzzle bridge
        const mBridgeGeo = new THREE.SphereGeometry(0.052, 24, 24);
        mBridgeGeo.scale(1.35, 0.82, 0.55);

        const golfCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.26, -0.50, 0.52),
            new THREE.Vector3(0.06, -0.35, 0.60),
            new THREE.Vector3(0.35, -0.06, 0.58),
            new THREE.Vector3(0.54, 0.32, 0.44),
        ]);
        const gTrailGeo = new THREE.TubeGeometry(golfCurve, 36, 0.028, 12, false);

        const swirlCurve1 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.60, -0.34, 0.20),
            new THREE.Vector3(-0.70, -0.04, -0.20),
            new THREE.Vector3(0.0, 0.16, -0.62),
            new THREE.Vector3(0.70, 0.04, 0.14),
            new THREE.Vector3(0.44, -0.28, 0.52),
        ]);
        const sRibbon1 = new THREE.TubeGeometry(swirlCurve1, 48, 0.018, 10, false);

        const swirlCurve2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.58, -0.40, 0.22),
            new THREE.Vector3(0.68, -0.08, -0.24),
            new THREE.Vector3(-0.62, 0.12, 0.20),
        ]);
        const sRibbon2 = new THREE.TubeGeometry(swirlCurve2, 36, 0.015, 10, false);

        return {
            bodyGeo: bGeo,
            hornGeo: hGeo,
            hoodCowlGeo: hdGeo,
            hoodRimGeo: hRimGeo,
            scarfCoilsGeo: sCoilsGeo,
            frontApronGeo: apronGeo,
            cloakGeo: clkGeo,
            eyeDecalGeo: eDecalGeo,
            pawGeo: pGeo,
            footGeo: ftGeo,
            noseGeo: nGeo,
            muzzleBridgeGeo: mBridgeGeo,
            golfTrailGeo: gTrailGeo,
            swirlRibbonGeo1: sRibbon1,
            swirlRibbonGeo2: sRibbon2,
        };
    }, []);

    // ─── Build Materials Using threejs-materials, threejs-textures & threejs-shaders ─
    const clothUniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uFlare: { value: 0.03 },
            uLiftRear: { value: 0.0 },
        }),
        []
    );

    const {
        leftEyeCanvas,
        rightEyeCanvas,
        leftEyeTex,
        rightEyeTex,
        softShadowTex,
        arcaneRuneTex,
        zSmallTex,
        zLargeTex,
        questionTex,
        refuseXTex,
    } = useMemo(() => {
        const lCanv = document.createElement('canvas');
        lCanv.width = 512;
        lCanv.height = 512;
        const rCanv = document.createElement('canvas');
        rCanv.width = 512;
        rCanv.height = 512;

        const lTex = new THREE.CanvasTexture(lCanv);
        const rTex = new THREE.CanvasTexture(rCanv);
        lTex.colorSpace = THREE.SRGBColorSpace;
        rTex.colorSpace = THREE.SRGBColorSpace;
        lTex.anisotropy = 4;
        rTex.anisotropy = 4;

        return {
            leftEyeCanvas: lCanv,
            rightEyeCanvas: rCanv,
            leftEyeTex: lTex,
            rightEyeTex: rTex,
            softShadowTex: createSoftShadowTexture(),
            arcaneRuneTex: createArcaneRuneTexture(),
            zSmallTex: createBadgeSpriteTexture('z', '#70f8ff', '#00d9ff'),
            zLargeTex: createBadgeSpriteTexture('Z', '#9efbff', '#00f0ff'),
            questionTex: createBadgeSpriteTexture('?', '#70f8ff', '#00e5ff'),
            refuseXTex: createBadgeSpriteTexture('✖', '#ef4444', '#dc2626'),
        };
    }, []);

    const {
        furBodyMaterial,
        muzzleFurMaterial,
        darkLimbFurMaterial,
        pawPadMaterial,
        hornMaterial,
        hoodScarfMaterial,
        cloakTatterMaterial,
        leftEyeMat,
        rightEyeMat,
        noseMaterial,
        mouthMaterial,
        neonCyanMaterial,
        sunglassLensMaterial,
    } = useMemo(() => {
        const furBumpMap = createFurBumpTexture();
        const { clothColorMap, clothBumpMap } = createCrimsonClothTextures();

        // 1. 3D Object-Space Feathered Fur Shader + Physical Sheen (threejs-materials + threejs-shaders skills)
        // Uses short staggered 3D fur tufts (no vertical pin-stripes!) to paint the dark charcoal coat,
        // prominent fluffy ash-white V-shaped belly patch, silver-grey eye mask, and dark forehead bridge.
        const furMat = new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            bumpMap: furBumpMap,
            bumpScale: 0.020,
            roughness: 0.86,
            metalness: 0.02,
            sheen: 0.85,
            sheenRoughness: 0.58,
            sheenColor: new THREE.Color('#94a3b8'),
        });
        furMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vBodyPos;
                varying vec3 vBodyNorm;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vBodyPos = position;
                vBodyNorm = normal;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vBodyPos;
                varying vec3 vBodyNorm;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                vec3 p = vBodyPos;
                float angle = (abs(p.x) + abs(p.z) > 0.0001) ? atan(p.x, p.z) : 0.0;

                // Short, staggered feathery fur tufts (avoids continuous vertical lines!)
                float tuftLayer1 = sin(angle * 48.0 + sin(p.y * 36.0) * 1.8) * cos(p.y * 54.0 + angle * 12.0);
                float tuftLayer2 = cos(angle * 78.0 - sin(p.y * 52.0) * 2.1) * sin(p.y * 82.0 - angle * 18.0);
                float furTuft = tuftLayer1 * 0.55 + tuftLayer2 * 0.45;

                // Base dark charcoal-grey coat (#1f242d to #2c3340)
                vec3 darkCharcoal = vec3(0.13, 0.15, 0.19) + furTuft * 0.024;
                vec3 midSlate     = vec3(0.22, 0.26, 0.32) + furTuft * 0.028;
                vec3 ashWhite     = vec3(0.84, 0.87, 0.91) + furTuft * 0.036;
                vec3 faceSilver   = vec3(0.70, 0.75, 0.81) + furTuft * 0.030;

                vec3 col = mix(darkCharcoal, midSlate, smoothstep(-0.52, 0.28, p.y) * 0.42);

                // A) Prominent Ash-White Fluffy V-Belly Patch (from under the V-mantle y = -0.10 down to y = -0.50)
                if (p.z > 0.05 && p.y < -0.02) {
                    float bellyY = clamp((p.y + 0.50) / 0.44, 0.0001, 1.0); // 0 at bottom, 1 under scarf
                    float maxBellyW = mix(0.10, 0.31, pow(bellyY, 0.60));
                    // Feathered fur-tuft border around the ash-white belly patch
                    float tuftEdge = furTuft * 0.042 + sin(angle * 28.0) * 0.018;
                    float horizMask = 1.0 - smoothstep(maxBellyW - 0.07, maxBellyW + 0.04, abs(p.x) + tuftEdge);
                    float vertMask  = smoothstep(-0.52, -0.38, p.y + tuftEdge * 0.5) * (1.0 - smoothstep(-0.08, 0.0, p.y));
                    float frontMask = smoothstep(0.14, 0.34, p.z);
                    float bellyMask = horizMask * vertMask * frontMask;
                    col = mix(col, ashWhite, bellyMask);
                }

                // B) Facial Mask (upper face: p.z > 0.15, p.y > +0.06)
                if (p.z > 0.12 && p.y > 0.05) {
                    float dLeftPatch  = length((p.xy - vec2(-0.145, 0.25)) / vec2(0.15, 0.13));
                    float dRightPatch = length((p.xy - vec2( 0.145, 0.25)) / vec2(0.15, 0.13));
                    float dMuzzle     = length((p.xy - vec2( 0.000, 0.16)) / vec2(0.15, 0.09));
                    float patchDist   = min(min(dLeftPatch, dRightPatch), dMuzzle);
                    float faceMask    = (1.0 - smoothstep(0.55, 1.15, patchDist + furTuft * 0.08))
                                      * smoothstep(0.18, 0.35, p.z);
                    col = mix(col, faceSilver, faceMask * 0.90);

                    // Dark charcoal V-bridge streak down the center of the forehead below the horn
                    float dBridge = abs(p.x) / (0.040 + clamp((p.y - 0.23) * 0.32, 0.0, 0.10));
                    float bridgeMask = (1.0 - smoothstep(0.5, 1.2, dBridge + furTuft * 0.10))
                                     * smoothstep(0.22, 0.32, p.y)
                                     * (1.0 - smoothstep(0.46, 0.54, p.y));
                    col = mix(col, darkCharcoal * 0.92, bridgeMask * 0.85);
                }

                diffuseColor.rgb = clamp(col, 0.0, 1.0);`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_begin>',
                `#include <lights_fragment_begin>
                float rim = clamp(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 0.0001, 1.0);
                diffuseColor.rgb += vec3(0.10, 0.16, 0.22) * pow(rim, 3.2) * 0.42;`
            );
        };

        const muzMat = new THREE.MeshPhysicalMaterial({
            color: '#b4bcc8',
            bumpMap: furBumpMap,
            bumpScale: 0.010,
            roughness: 0.85,
            metalness: 0.01,
            sheen: 0.75,
            sheenRoughness: 0.6,
            sheenColor: new THREE.Color('#dce2ea'),
        });

        const limbMat = new THREE.MeshPhysicalMaterial({
            color: '#1e232c',
            bumpMap: furBumpMap,
            bumpScale: 0.016,
            roughness: 0.85,
            metalness: 0.02,
            sheen: 0.75,
            sheenRoughness: 0.6,
            sheenColor: new THREE.Color('#64748b'),
        });

        const padMat = new THREE.MeshStandardMaterial({
            color: '#523d47',
            roughness: 0.68,
            metalness: 0.02,
        });

        // 2. Warm Ridged Metallic-Bone Horn Material
        const hMat = new THREE.MeshPhysicalMaterial({
            color: '#dfd3bc',
            roughness: 0.40,
            metalness: 0.12,
            clearcoat: 0.28,
            clearcoatRoughness: 0.30,
        });
        hMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vHornPos;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vHornPos = position;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vHornPos;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float ht = clamp((vHornPos.y + 0.15) / 0.30, 0.0, 1.0);
                vec3 baseBone = vec3(0.32, 0.27, 0.21);
                vec3 midBone  = vec3(0.74, 0.67, 0.55);
                vec3 tipIvory = vec3(0.94, 0.89, 0.79);
                vec3 hornCol  = mix(baseBone, midBone, smoothstep(0.0, 0.42, ht));
                hornCol       = mix(hornCol, tipIvory, smoothstep(0.42, 1.0, ht));
                float hAng    = (abs(vHornPos.x) + abs(vHornPos.z) > 0.0001) ? atan(vHornPos.x, vHornPos.z) : 0.0;
                float flutes  = sin(hAng * 10.0) * 0.055;
                float rings   = sin(ht * 34.0) * 0.032;
                diffuseColor.rgb = clamp(hornCol + flutes + rings, 0.0, 1.0);`
            );
        };

        // 3. Matte Crimson Fabric Material with Fabric Sheen & Weave Bump Map (for Hood & Scarf)
        const hsMat = new THREE.MeshPhysicalMaterial({
            map: clothColorMap,
            bumpMap: clothBumpMap,
            bumpScale: 0.015,
            roughness: 0.88,
            metalness: 0.02,
            sheen: 0.68,
            sheenRoughness: 0.75,
            sheenColor: new THREE.Color('#f87171'),
            side: THREE.DoubleSide,
        });

        // 4. Tattered Lower Cloak Material with Procedural Tear Holes & Subtle GPU Vertex Wind Ripples
        const cMat = new THREE.MeshPhysicalMaterial({
            map: clothColorMap,
            bumpMap: clothBumpMap,
            bumpScale: 0.016,
            roughness: 0.88,
            metalness: 0.02,
            sheen: 0.68,
            sheenRoughness: 0.75,
            sheenColor: new THREE.Color('#f87171'),
            side: THREE.DoubleSide,
            alphaTest: 0.5,
        });
        cMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = clothUniforms.uTime;
            shader.uniforms.uFlare = clothUniforms.uFlare;
            shader.uniforms.uLiftRear = clothUniforms.uLiftRear;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uTime;
                uniform float uFlare;
                uniform float uLiftRear;
                varying vec3 vCloakPos;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vCloakPos = position;
                float clothWeight = clamp(1.0 - smoothstep(-0.60, -0.08, position.y), 0.0, 1.0);
                if (clothWeight > 0.001) {
                    float cAng = (abs(position.x) + abs(position.z) > 0.0001) ? atan(position.x, position.z) : 0.0;
                    float windRipple = sin(uTime * 4.0 + cAng * 5.0 + position.y * 6.0) * 0.016 * clothWeight
                                     + cos(uTime * 6.4 - cAng * 8.0) * 0.010 * clothWeight;
                    float radialScale = 1.0 + (uFlare * 0.32 + windRipple) * clothWeight;
                    transformed.x *= radialScale;
                    transformed.z *= radialScale;
                    transformed.y += (uFlare * 0.22 + abs(windRipple) * 0.35) * clothWeight;
                    if (position.z < 0.0) {
                        transformed.y += uLiftRear * pow(max(clothWeight, 0.0001), 1.3) * 0.88;
                    }
                }`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vCloakPos;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                // Weathered teardrop fabric holes near the lower cloak hem (matching BACK & SIDE views)
                float cAng = (abs(vCloakPos.x) + abs(vCloakPos.z) > 0.0001) ? atan(vCloakPos.x, vCloakPos.z) : 0.0;
                float holeY = vCloakPos.y;
                float dH1 = length(vec2((cAng - 1.55) * 4.5, (holeY + 0.48) * 6.0));
                float dH2 = length(vec2((cAng + 1.65) * 4.5, (holeY + 0.46) * 6.0));
                float dH3 = length(vec2((cAng - 2.45) * 4.8, (holeY + 0.50) * 5.5));
                float dH4 = length(vec2((cAng + 2.55) * 4.8, (holeY + 0.49) * 5.5));
                float dH5 = length(vec2((abs(cAng) - 2.90) * 4.2, (holeY + 0.42) * 6.2));
                if (min(min(min(dH1, dH2), min(dH3, dH4)), dH5) < 0.22) {
                    discard;
                }`
            );
        };

        // 5. Custom ShaderMaterial for Radiant Emissive Eye Decals (threejs-shaders skill)
        const createEyeShaderMaterial = (tex: THREE.CanvasTexture) =>
            new THREE.ShaderMaterial({
                uniforms: {
                    map: { value: tex },
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D map;
                    varying vec2 vUv;
                    void main() {
                        vec4 texColor = texture2D(map, vUv);
                        if (texColor.a < 0.02) discard;
                        gl_FragColor = texColor;
                    }
                `,
                transparent: true,
                depthWrite: false,
                toneMapped: false,
            });

        const lEyeMat = createEyeShaderMaterial(leftEyeTex);
        const rEyeMat = createEyeShaderMaterial(rightEyeTex);

        const nMat = new THREE.MeshStandardMaterial({
            color: '#1b1f28',
            roughness: 0.40,
            metalness: 0.05,
        });

        const mMat = new THREE.MeshStandardMaterial({
            color: '#282e3a',
            roughness: 0.65,
            metalness: 0.0,
        });

        const neonMat = new THREE.MeshBasicMaterial({ color: '#22f2ff', toneMapped: false });
        const lensMat = new THREE.MeshPhysicalMaterial({
            color: '#070b12',
            roughness: 0.12,
            metalness: 0.90,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
        });

        return {
            furBodyMaterial: furMat,
            muzzleFurMaterial: muzMat,
            darkLimbFurMaterial: limbMat,
            pawPadMaterial: padMat,
            hornMaterial: hMat,
            hoodScarfMaterial: hsMat,
            cloakTatterMaterial: cMat,
            leftEyeMat: lEyeMat,
            rightEyeMat: rEyeMat,
            noseMaterial: nMat,
            mouthMaterial: mMat,
            neonCyanMaterial: neonMat,
            sunglassLensMaterial: lensMat,
        };
    }, [leftEyeTex, rightEyeTex, clothUniforms]);

    // ─── 60fps Procedural Animation Controller (threejs-animation skill) ─────────
    const springs = useRef({
        posX: new Spring(0, 170, 18),
        posY: new Spring(0, 170, 18),
        posZ: new Spring(0, 170, 18),
        rotX: new Spring(0, 170, 18),
        rotY: new Spring(0, 170, 18),
        rotZ: new Spring(0, 170, 18),
        scaleX: new Spring(1, 170, 18),
        scaleY: new Spring(1, 170, 18),
        scaleZ: new Spring(1, 170, 18),
        headX: new Spring(0, 170, 18),
        headY: new Spring(0, 170, 18),
        headZ: new Spring(0, 170, 18),
        flare: new Spring(0.03, 140, 16),
        liftRear: new Spring(0.0, 140, 16),
    });

    const blinkState = useRef({ nextBlink: 2.2, blinkProgress: 0, isBlinking: false });
    const prevCanvasState = useRef<{ exp: string; bucket: number }>({ exp: '', bucket: -1 });

    // InstancedMesh for Rising Cyan Cinder Particles (placed around outer halo, NEVER blocking the face!)
    const emberCount = 14;
    const emberDummy = useMemo(() => new THREE.Object3D(), []);
    const emberSeeds = useMemo(
        () =>
            Array.from({ length: emberCount }, (_, i) => {
                // Keep particles to the left/right sides or behind the head so they never cross in front of the eyes!
                const side = i % 2 === 0 ? -1 : 1;
                const baseAngle = side * (0.85 + (i % 5) * 0.35);
                return {
                    angle: baseAngle,
                    radius: 0.58 + (i % 3) * 0.11,
                    speed: 0.42 + (i % 4) * 0.12,
                    yOffset: (i / emberCount) * 1.3,
                    size: 0.013 + (i % 3) * 0.005,
                };
            }),
        []
    );

    useFrame((stateObj, delta) => {
        const t = stateObj.clock.elapsedTime;
        clothUniforms.uTime.value = t;

        // 1. Periodic Natural Eye Blinking
        const b = blinkState.current;
        let blinkOpen = 1.0;
        if (!b.isBlinking && t > b.nextBlink) {
            b.isBlinking = true;
            b.blinkProgress = 0;
        }
        if (b.isBlinking) {
            b.blinkProgress += delta * 10.0;
            if (b.blinkProgress >= Math.PI) {
                b.isBlinking = false;
                b.nextBlink = t + 2.4 + Math.random() * 2.8;
                blinkOpen = 1.0;
            } else {
                blinkOpen = 1.0 - Math.sin(b.blinkProgress) * 0.94;
            }
        }

        // 2. Redraw Dynamic 512x512 Eye CanvasTextures at 60fps
        const isAnimatedEye =
            effectiveExpression === 'sad' ||
            effectiveExpression === 'confused' ||
            b.isBlinking ||
            state === 'refusing';
        const timeBucket = isAnimatedEye ? Math.floor(t * 30) : 0;
        const expKey = `${effectiveExpression}_${state === 'refusing' ? 'ref' : 'std'}`;

        if (
            prevCanvasState.current.exp !== expKey ||
            prevCanvasState.current.bucket !== timeBucket
        ) {
            prevCanvasState.current = { exp: expKey, bucket: timeBucket };
            const lCtx = leftEyeCanvas.getContext('2d');
            const rCtx = rightEyeCanvas.getContext('2d');
            const isRefuseSquint = state === 'refusing' && effectiveExpression === 'angry';
            if (lCtx && rCtx) {
                drawEyeOnCanvas(lCtx, effectiveExpression, 'left', t, blinkOpen, isRefuseSquint);
                drawEyeOnCanvas(rCtx, effectiveExpression, 'right', t, blinkOpen, isRefuseSquint);
                leftEyeTex.needsUpdate = true;
                rightEyeTex.needsUpdate = true;
            }
        }

        if (
            !characterRef.current ||
            !bodyGroupRef.current ||
            !headLookRef.current ||
            !hoodRef.current ||
            !scarfRef.current ||
            !leftArmRef.current ||
            !rightArmRef.current ||
            !leftFootRef.current ||
            !rightFootRef.current
        ) {
            return;
        }

        // 3. Target Pose Keyframes for All 14 Procedural Animation States
        let posX = 0;
        let posY = 0;
        let posZ = 0;
        let rotX = 0;
        let rotY = 0;
        let rotZ = 0;
        let scaleX = 1;
        let scaleY = 1;
        let scaleZ = 1;
        let headRotX = 0;
        let headRotY = 0;
        let headRotZ = 0;

        // Default stubby arm & foot positions (resting clearly on the upper sides of the plump belly!)
        let lArmPos: [number, number, number] = [-0.47, -0.16, 0.22];
        let rArmPos: [number, number, number] = [0.47, -0.16, 0.22];
        let lArmRot: [number, number, number] = [0.12, 0.12, 0.36];
        let rArmRot: [number, number, number] = [0.12, -0.12, -0.36];

        let lFootPos: [number, number, number] = [-0.20, -0.56, 0.10];
        let rFootPos: [number, number, number] = [0.20, -0.56, 0.10];
        let lFootRot: [number, number, number] = [0, 0.08, 0];
        let rFootRot: [number, number, number] = [0, -0.08, 0];

        let capeFlareTarget = 0.02;
        let capeLiftRearTarget = 0.0;
        let mouthOpen = 0.0;

        let showGolf = false;
        let showWorkConjure = false;
        let showDanceSwirl = false;
        let showClapSparks = false;
        let showTalkBubbles = false;

        const ptrX = stateObj.pointer.x;
        const ptrY = stateObj.pointer.y;

        switch (state) {
            case 'dancing': {
                showDanceSwirl = true;
                const jumpPhase = Math.abs(Math.sin(t * 5.2));
                const sideSwing = Math.sin(t * 5.2);
                posY = 0.14 + jumpPhase * 0.20;
                posX = sideSwing * 0.06;
                rotZ = sideSwing * 0.14;
                rotY = sideSwing * 0.25;
                scaleY = 1.0 + jumpPhase * 0.05;
                scaleX = 1.0 - jumpPhase * 0.03;

                lArmPos = [-0.48, 0.04 + jumpPhase * 0.06, 0.26];
                rArmPos = [0.48, 0.06 + (1 - jumpPhase) * 0.06, 0.26];
                lArmRot = [-0.65, 0.25, 1.85 + sideSwing * 0.25];
                rArmRot = [-0.65, -0.25, -1.85 + sideSwing * 0.25];

                lFootPos = [-0.20, -0.54, 0.16];
                rFootPos = [0.22, -0.44 + jumpPhase * 0.06, 0.32];
                lFootRot = [0.35, 0.1, -0.12];
                rFootRot = [-1.15, -0.2, 0.25];

                mouthOpen = 0.65;
                capeFlareTarget = 0.45 + jumpPhase * 0.20;
                break;
            }

            case 'dancing2': {
                showDanceSwirl = true;
                const bounce = Math.abs(Math.sin(t * 6.0));
                posY = 0.08 + bounce * 0.15;
                rotY = t * 5.2;
                rotZ = Math.sin(t * 6.0) * 0.14;

                lArmPos = [-0.50, -0.02, 0.24];
                rArmPos = [0.50, 0.04, 0.24];
                lArmRot = [-0.45, 0.2, 1.45];
                rArmRot = [-0.45, -0.2, -1.55];

                lFootPos = [-0.20, -0.54, 0.14];
                rFootPos = [0.22, -0.45, 0.28];
                rFootRot = [-0.95, -0.15, 0.2];

                mouthOpen = 0.5;
                capeFlareTarget = 0.55;
                break;
            }

            case 'sleeping': {
                const breath = Math.sin(t * 1.6);
                posY = -0.08;
                scaleY = 0.91 + breath * 0.022;
                scaleX = 1.05 - breath * 0.015;
                scaleZ = 1.04 - breath * 0.015;
                headRotX = 0.18 + breath * 0.04;

                lArmPos = [-0.36, -0.28, 0.34];
                rArmPos = [0.36, -0.28, 0.34];
                lArmRot = [0.55, 0.35, 0.15];
                rArmRot = [0.55, -0.35, -0.15];

                lFootPos = [-0.21, -0.50, 0.36];
                rFootPos = [0.21, -0.50, 0.36];
                lFootRot = [-1.35, 0.22, 0.12];
                rFootRot = [-1.35, -0.22, -0.12];

                capeFlareTarget = 0.12;
                break;
            }

            case 'surprised': {
                const tremble = Math.sin(t * 28.0) * 0.012;
                posY = 0.15 + Math.abs(Math.sin(t * 6.5)) * 0.06;
                posZ = -0.06;
                posX = tremble;
                scaleY = 1.05;
                scaleX = 0.96;

                lArmPos = [-0.52, -0.02, 0.22];
                rArmPos = [0.52, -0.02, 0.22];
                lArmRot = [0, 0.2, 1.38];
                rArmRot = [0, -0.2, -1.38];

                lFootPos = [-0.22, -0.53, 0.16];
                rFootPos = [0.22, -0.50, 0.22];
                lFootRot = [0.35, 0, -0.15];
                rFootRot = [-0.35, 0, 0.15];

                mouthOpen = 0.55;
                capeFlareTarget = 0.58;
                break;
            }

            case 'waving': {
                const wave = Math.sin(t * 9.0);
                posY = Math.abs(Math.sin(t * 3.5)) * 0.03;
                rotZ = -0.06;
                headRotZ = -0.08 + wave * 0.04;

                rArmPos = [0.48, 0.10, 0.28];
                rArmRot = [-0.75, -0.25, -2.05 + wave * 0.38];
                mouthOpen = 0.4;
                capeFlareTarget = 0.12;
                break;
            }

            case 'salute': {
                posY = 0.02;
                scaleY = 1.03;
                headRotX = -0.05;
                rArmPos = [0.35, 0.24, 0.40];
                rArmRot = [-1.15, -0.45, -2.35];
                lArmPos = [-0.47, -0.18, 0.20];
                lArmRot = [0.05, 0.05, 0.18];
                capeFlareTarget = 0.08;
                break;
            }

            case 'refusing': {
                const shake = Math.sin(t * 15.0);
                posX = shake * 0.03;
                rotY = shake * 0.24;
                headRotY = shake * 0.30;

                lArmPos = [-0.48, -0.02, 0.28];
                rArmPos = [0.48, -0.02, 0.28];
                lArmRot = [-0.70, 0.25, 1.35 + shake * 0.22];
                rArmRot = [-0.70, -0.25, -1.35 + shake * 0.22];

                lFootPos = [-0.20, -0.56, 0.10];
                rFootPos = [0.22, -0.52 + Math.abs(shake) * 0.03, 0.18];

                capeFlareTarget = 0.22;
                break;
            }

            case 'stretching': {
                const stretchPulse = Math.sin(t * 2.4) * 0.03;
                posY = -0.10;
                posZ = 0.10;
                rotX = 0.36 + stretchPulse;
                rotY = -0.26;
                headRotX = -0.32;
                headRotY = 0.16;

                lArmPos = [-0.22, -0.42, 0.52];
                rArmPos = [0.22, -0.42, 0.52];
                lArmRot = [-1.25, 0.12, 0.18];
                rArmRot = [-1.25, -0.12, -0.18];

                lFootPos = [-0.24, -0.46, -0.26];
                rFootPos = [0.24, -0.46, -0.26];
                lFootRot = [0.45, 0, 0];
                rFootRot = [0.45, 0, 0];

                mouthOpen = 0.95;
                capeFlareTarget = 0.55;
                capeLiftRearTarget = 0.80;
                break;
            }

            case 'golfing': {
                showGolf = true;
                const swing = Math.sin(t * 4.2);
                rotY = swing * 0.32;
                rotZ = -0.10 + swing * 0.08;
                headRotZ = -0.12;
                headRotY = swing * 0.22;

                lArmPos = [-0.15, -0.16, 0.44];
                rArmPos = [0.18, -0.14, 0.44];
                lArmRot = [-0.75, -0.35, -0.45 + swing * 0.55];
                rArmRot = [-0.75, 0.35, 0.45 + swing * 0.55];

                if (golfClubRef.current && golfOrbRef.current) {
                    golfClubRef.current.rotation.z = -0.42 + swing * 0.85;
                    const orbT = (Math.sin(t * 4.2 - 0.5) + 1) * 0.5;
                    golfOrbRef.current.position.set(
                        THREE.MathUtils.lerp(-0.26, 0.54, orbT),
                        THREE.MathUtils.lerp(-0.48, 0.32, Math.pow(orbT, 0.85)) + Math.sin(orbT * Math.PI) * 0.15,
                        THREE.MathUtils.lerp(0.52, 0.44, orbT)
                    );
                }

                capeFlareTarget = 0.28;
                break;
            }

            case 'pointing': {
                posY = Math.sin(t * 3.0) * 0.015;
                rotY = 0.18;
                headRotY = -0.24;
                headRotZ = 0.06;

                lArmPos = [-0.52, 0.04, 0.28];
                lArmRot = [-0.45, 0.3, 1.52 + Math.sin(t * 5.0) * 0.06];
                rArmPos = [0.47, -0.18, 0.20];
                rArmRot = [0.15, -0.1, -0.28];

                capeFlareTarget = 0.18;
                break;
            }

            case 'clapping': {
                showClapSparks = true;
                const clap = Math.abs(Math.sin(t * 10.0));
                posY = -0.08 + clap * 0.04;
                scaleY = 0.93 + clap * 0.04;
                scaleX = 1.05 - clap * 0.03;

                lArmPos = [-0.11 - clap * 0.11, -0.12, 0.50];
                rArmPos = [0.11 + clap * 0.11, -0.12, 0.50];
                lArmRot = [-0.95, 0.55, 0.65];
                rArmRot = [-0.95, -0.55, -0.65];

                lFootPos = [-0.22, -0.50, 0.36];
                rFootPos = [0.22, -0.50, 0.36];
                lFootRot = [-1.35, 0.22, 0.12];
                rFootRot = [-1.35, -0.22, -0.12];

                mouthOpen = 0.55;
                capeFlareTarget = 0.16;
                break;
            }

            case 'talking':
            case 'talking1':
            case 'talking2': {
                showTalkBubbles = true;
                const talkWave = Math.abs(Math.sin(t * 11.0));
                posY = Math.abs(Math.sin(t * 4.0)) * 0.03;
                rotY = 0.22;
                headRotZ = Math.sin(t * 3.5) * 0.08;

                lArmPos = [-0.47, -0.15, 0.22];
                rArmPos = [0.46, -0.14, 0.24];
                mouthOpen = 0.45 + talkWave * 0.55;
                capeFlareTarget = 0.08;
                break;
            }

            case 'working': {
                showWorkConjure = true;
                const hover = Math.sin(t * 3.2);
                posY = -0.02 + hover * 0.04;
                scaleY = 0.94;
                scaleX = 1.04;

                lArmPos = [-0.42, -0.16 + Math.sin(t * 5.0) * 0.03, 0.38];
                rArmPos = [0.42, -0.16 + Math.cos(t * 5.0) * 0.03, 0.38];
                lArmRot = [-0.85, 0.3, 0.55];
                rArmRot = [-0.85, -0.3, -0.55];

                lFootPos = [-0.20, -0.50, 0.36];
                rFootPos = [0.20, -0.50, 0.36];
                lFootRot = [-1.35, 0.18, 0.1];
                rFootRot = [-1.35, -0.18, -0.1];

                capeFlareTarget = 0.16;
                break;
            }

            case 'walking':
            case 'running': {
                const isRun = state === 'running';
                const freq = isRun ? 11.5 : 8.2;
                const stride = Math.sin(t * freq);
                const bounce = Math.abs(Math.cos(t * freq));
                const leftLift = Math.max(0, stride);
                const rightLift = Math.max(0, -stride);

                posY = bounce * (isRun ? 0.13 : 0.075);
                posX = stride * 0.025;
                rotX = isRun ? 0.16 : 0.09;
                rotZ = -stride * (isRun ? 0.11 : 0.07);
                rotY = stride * 0.08;
                scaleY = 1.0 + bounce * 0.035;
                scaleX = 1.0 - bounce * 0.02;

                headRotX = -0.06 + bounce * 0.04;
                headRotZ = stride * 0.05;

                lArmPos = [-0.48, -0.13 + rightLift * 0.04, 0.22 - stride * 0.08];
                rArmPos = [0.48, -0.13 + leftLift * 0.04, 0.22 + stride * 0.08];
                lArmRot = [stride * 0.55, 0.15, 0.52 + bounce * 0.12];
                rArmRot = [-stride * 0.55, -0.15, -0.52 - bounce * 0.12];

                lFootPos = [-0.20, -0.56 + leftLift * 0.11, 0.10 + stride * 0.14];
                rFootPos = [0.20, -0.56 + rightLift * 0.11, 0.10 - stride * 0.14];
                lFootRot = [-stride * 0.45, 0.08, 0];
                rFootRot = [stride * 0.45, -0.08, 0];

                mouthOpen = isRun ? 0.45 : 0.2;
                capeFlareTarget = isRun ? 0.48 : 0.30;
                capeLiftRearTarget = isRun ? 0.42 : 0.24;
                break;
            }

            default: {
                const breath = Math.sin(t * 2.4);
                posY = breath * 0.018;
                scaleY = 1.0 + breath * 0.015;
                scaleX = 1.0 - breath * 0.008;
                scaleZ = 1.0 - breath * 0.008;
                rotZ = Math.sin(t * 1.2) * 0.015;
                rotY = ptrX * 0.24;

                headRotY = ptrX * 0.22;
                headRotX = -ptrY * 0.14;
                lArmRot = [0.12, 0.12, 0.36 + breath * 0.04];
                rArmRot = [0.12, -0.12, -0.36 - breath * 0.04];
                capeFlareTarget = 0.02 + (breath * 0.5 + 0.5) * 0.02;
                break;
            }
        }

        // Step 60fps Damped Spring Physics
        const s = springs.current;
        characterRef.current.position.set(
            s.posX.step(delta, posX),
            s.posY.step(delta, posY),
            s.posZ.step(delta, posZ)
        );
        characterRef.current.rotation.set(
            s.rotX.step(delta, rotX),
            s.rotY.step(delta, rotY),
            s.rotZ.step(delta, rotZ)
        );
        bodyGroupRef.current.scale.set(
            s.scaleX.step(delta, scaleX),
            s.scaleY.step(delta, scaleY),
            s.scaleZ.step(delta, scaleZ)
        );
        headLookRef.current.rotation.set(
            s.headX.step(delta, headRotX),
            s.headY.step(delta, headRotY),
            s.headZ.step(delta, headRotZ)
        );

        clothUniforms.uFlare.value = s.flare.step(delta, capeFlareTarget);
        clothUniforms.uLiftRear.value = s.liftRear.step(delta, capeLiftRearTarget);

        const damp = Math.min(1, delta * 12);
        hoodRef.current.rotation.x = THREE.MathUtils.lerp(
            hoodRef.current.rotation.x,
            headRotX * 0.45 - characterRef.current.position.y * 0.12,
            damp * 0.7
        );
        scarfRef.current.position.y = THREE.MathUtils.lerp(
            scarfRef.current.position.y,
            -characterRef.current.position.y * 0.04 + Math.sin(t * 3.0) * 0.004,
            damp * 0.8
        );

        leftArmRef.current.position.lerp(new THREE.Vector3(...lArmPos), damp);
        rightArmRef.current.position.lerp(new THREE.Vector3(...rArmPos), damp);
        leftArmRef.current.rotation.set(
            THREE.MathUtils.lerp(leftArmRef.current.rotation.x, lArmRot[0], damp),
            THREE.MathUtils.lerp(leftArmRef.current.rotation.y, lArmRot[1], damp),
            THREE.MathUtils.lerp(leftArmRef.current.rotation.z, lArmRot[2], damp)
        );
        rightArmRef.current.rotation.set(
            THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rArmRot[0], damp),
            THREE.MathUtils.lerp(rightArmRef.current.rotation.y, rArmRot[1], damp),
            THREE.MathUtils.lerp(rightArmRef.current.rotation.z, rArmRot[2], damp)
        );

        leftFootRef.current.position.lerp(new THREE.Vector3(...lFootPos), damp);
        rightFootRef.current.position.lerp(new THREE.Vector3(...rFootPos), damp);
        leftFootRef.current.rotation.set(
            THREE.MathUtils.lerp(leftFootRef.current.rotation.x, lFootRot[0], damp),
            THREE.MathUtils.lerp(leftFootRef.current.rotation.y, lFootRot[1], damp),
            THREE.MathUtils.lerp(leftFootRef.current.rotation.z, lFootRot[2], damp)
        );
        rightFootRef.current.rotation.set(
            THREE.MathUtils.lerp(rightFootRef.current.rotation.x, rFootRot[0], damp),
            THREE.MathUtils.lerp(rightFootRef.current.rotation.y, rFootRot[1], damp),
            THREE.MathUtils.lerp(rightFootRef.current.rotation.z, rFootRot[2], damp)
        );

        if (mouthOpenRef.current) {
            const smileBonus = effectiveExpression === 'happy' ? 0.55 : 0;
            const targetMouth = Math.max(mouthOpen, smileBonus);
            mouthOpenRef.current.scale.y = THREE.MathUtils.lerp(
                mouthOpenRef.current.scale.y,
                0.15 + targetMouth * 1.35,
                damp * 1.4
            );
            mouthOpenRef.current.visible = targetMouth > 0.1;
        }

        if (sunglassesRef.current) {
            sunglassesRef.current.visible = effectiveExpression === 'cool';
        }
        if (golfGroupRef.current) {
            golfGroupRef.current.visible = showGolf;
        }
        if (workConjureRef.current) {
            workConjureRef.current.visible = showWorkConjure;
            workConjureRef.current.rotation.z = t * 1.25;
        }
        if (leftPawRingRef.current && rightPawRingRef.current) {
            leftPawRingRef.current.visible = showWorkConjure;
            rightPawRingRef.current.visible = showWorkConjure;
            leftPawRingRef.current.rotation.z = t * 3.0;
            rightPawRingRef.current.rotation.z = -t * 3.0;
        }
        if (danceSwirlRef.current) {
            danceSwirlRef.current.visible = showDanceSwirl;
            danceSwirlRef.current.rotation.y = t * 3.2;
        }
        if (clapSparksRef.current) {
            clapSparksRef.current.visible = showClapSparks;
            const sparkPulse = 0.8 + Math.abs(Math.sin(t * 12.0)) * 0.45;
            clapSparksRef.current.scale.set(sparkPulse, sparkPulse, sparkPulse);
        }
        if (talkBubblesRef.current) {
            talkBubblesRef.current.visible = showTalkBubbles;
            talkBubblesRef.current.children.forEach((child, i) => {
                const phase = (t * 1.5 + i * 0.35) % 1.0;
                child.position.set(0.26 + phase * 0.32, 0.12 + phase * 0.22, 0.52);
                const sVal = Math.sin(phase * Math.PI) * (0.65 + i * 0.25);
                child.scale.set(sVal, sVal, sVal);
            });
        }

        const showZzz = state === 'sleeping' || effectiveExpression === 'sleepy';
        if (zzzGroupRef.current) {
            zzzGroupRef.current.visible = showZzz;
            if (showZzz) {
                zzzGroupRef.current.children.forEach((sp, i) => {
                    const phase = (t * 0.65 + i * 0.33) % 1.0;
                    sp.position.set(
                        0.32 + phase * 0.26 + Math.sin(phase * Math.PI * 2) * 0.04,
                        0.38 + phase * 0.45,
                        0.28
                    );
                    const sVal = Math.sin(phase * Math.PI) * (0.14 + i * 0.05);
                    sp.scale.set(sVal, sVal, 1);
                });
            }
        }

        const showConfused = effectiveExpression === 'confused';
        if (confusedGroupRef.current) {
            confusedGroupRef.current.visible = showConfused;
            if (showConfused) {
                confusedGroupRef.current.children.forEach((sp, i) => {
                    const sideSign = i === 0 ? -1 : 1;
                    const bob = Math.sin(t * 4.5 + i * 2.0) * 0.04;
                    sp.position.set(sideSign * 0.40, 0.52 + bob, 0.28);
                });
            }
        }

        if (refuseXSpriteRef.current) {
            refuseXSpriteRef.current.visible = state === 'refusing';
            if (state === 'refusing') {
                const pulse = 0.22 + Math.abs(Math.sin(t * 10.0)) * 0.05;
                refuseXSpriteRef.current.scale.set(pulse, pulse, 1);
            }
        }

        // Update InstancedMesh Cinder Particles (strictly on the outer halo, never crossing in front of face)
        if (embersRef.current) {
            for (let i = 0; i < emberCount; i++) {
                const seed = emberSeeds[i];
                const yCycle = ((t * seed.speed * 0.26 + seed.yOffset + 0.65) % 1.4) - 0.65;
                const sway = Math.sin(t * 1.4 + i) * 0.12;
                const ang = seed.angle + sway;
                const rad = seed.radius + Math.cos(t * 1.6 + i) * 0.05;
                const ex = Math.sin(ang) * rad;
                const ez = Math.cos(ang) * rad * 0.55 - 0.12; // Biased slightly behind the front face plane
                emberDummy.position.set(ex, yCycle, ez);
                const fade = Math.sin(((yCycle + 0.65) / 1.4) * Math.PI);
                const sVal = seed.size * Math.max(0.01, fade);
                emberDummy.scale.set(sVal, sVal, sVal);
                emberDummy.updateMatrix();
                embersRef.current.setMatrixAt(i, emberDummy.matrix);
            }
            embersRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    const renderPawPads = (ySign: number = 1) => (
        <group position={[0, -0.014 * ySign, 0.064]}>
            <mesh position={[0, -0.010 * ySign, 0]} scale={[0.50, 0.40, 0.28]} material={pawPadMaterial}>
                <sphereGeometry args={[0.052, 14, 14]} />
            </mesh>
            <mesh position={[-0.028, 0.022 * ySign, 0.004]} scale={[0.26, 0.32, 0.24]} material={pawPadMaterial}>
                <sphereGeometry args={[0.040, 12, 12]} />
            </mesh>
            <mesh position={[0, 0.030 * ySign, 0.006]} scale={[0.26, 0.32, 0.24]} material={pawPadMaterial}>
                <sphereGeometry args={[0.040, 12, 12]} />
            </mesh>
            <mesh position={[0.028, 0.022 * ySign, 0.004]} scale={[0.26, 0.32, 0.24]} material={pawPadMaterial}>
                <sphereGeometry args={[0.040, 12, 12]} />
            </mesh>
        </group>
    );

    return (
        <group
            ref={rootRef}
            position={[0.0, -0.02, 0]}
            scale={1.06}
            dispose={null}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                if (onPet) {
                    onPet();
                } else {
                    setManualExpIndex((prev) => (prev === null ? 1 : (prev + 1) % ALL_EXPRESSIONS.length));
                }
            }}
        >
            {/* Soft Airbrushed Studio Contact Shadow Plane */}
            <mesh position={[0, -0.665, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.95, 1.55]} />
                <meshBasicMaterial map={softShadowTex} transparent depthWrite={false} />
            </mesh>

            {/* 13 WORKING (Conjuring): Rotating Emissive Arcane Rune Circle on Floor */}
            <mesh
                ref={workConjureRef}
                visible={false}
                position={[0, -0.655, 0.12]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[1.38, 1.38]} />
                <meshBasicMaterial
                    map={arcaneRuneTex}
                    transparent
                    opacity={0.95}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* Rising Cyan Cinder Particles (InstancedMesh) */}
            <instancedMesh ref={embersRef} args={[undefined, undefined, emberCount]}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial color="#00e5ff" transparent opacity={0.82} toneMapped={false} />
            </instancedMesh>

            {/* Animated Character Root */}
            <group ref={characterRef}>
                {/* Swirling Cyan Motion Trails (02 DANCING & 14 DANCING 2) */}
                <group ref={danceSwirlRef} visible={false}>
                    <mesh geometry={swirlRibbonGeo1}>
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.78} toneMapped={false} />
                    </mesh>
                    <mesh geometry={swirlRibbonGeo2}>
                        <meshBasicMaterial color="#60f8ff" transparent opacity={0.70} toneMapped={false} />
                    </mesh>
                </group>

                {/* 1. Pear-Ovoid Body with 3D Feathered Fur Shader & Physical Sheen */}
                <group ref={bodyGroupRef}>
                    <mesh geometry={bodyGeo} material={furBodyMaterial} castShadow receiveShadow />

                    {/* Head / Face Feature Group */}
                    <group ref={headLookRef}>
                        {/* Curved, Ridged Metallic-Bone Forehead Horn (Protruding ABOVE the top of the hood!) */}
                        <mesh
                            geometry={hornGeo}
                            material={hornMaterial}
                            position={[0, 0.55, 0.27]}
                            rotation={[0.06, 0, 0]}
                            castShadow
                        />

                        {/* Left Dynamic 512x512 CanvasTexture Eye */}
                        <mesh
                            geometry={eyeDecalGeo}
                            material={leftEyeMat}
                            position={[-0.155, 0.245, 0.402]}
                            rotation={[-0.12, -0.32, 0]}
                        />

                        {/* Right Dynamic 512x512 CanvasTexture Eye */}
                        <mesh
                            geometry={eyeDecalGeo}
                            material={rightEyeMat}
                            position={[0.155, 0.245, 0.402]}
                            rotation={[-0.12, 0.32, 0]}
                        />

                        {/* 12 COOL: Neon-Rimmed Dark Visor Sunglasses */}
                        <group ref={sunglassesRef} visible={false} position={[0, 0.245, 0.435]}>
                            <group position={[-0.155, 0, 0]} rotation={[0, -0.22, -0.05]}>
                                <mesh scale={[1.20, 0.78, 0.15]} material={sunglassLensMaterial}>
                                    <sphereGeometry args={[0.098, 24, 24]} />
                                </mesh>
                                <mesh scale={[1.24, 0.82, 0.20]} material={neonCyanMaterial}>
                                    <torusGeometry args={[0.098, 0.012, 12, 32]} />
                                </mesh>
                            </group>
                            <group position={[0.155, 0, 0]} rotation={[0, 0.22, 0.05]}>
                                <mesh scale={[1.20, 0.78, 0.15]} material={sunglassLensMaterial}>
                                    <sphereGeometry args={[0.098, 24, 24]} />
                                </mesh>
                                <mesh scale={[1.24, 0.82, 0.20]} material={neonCyanMaterial}>
                                    <torusGeometry args={[0.098, 0.012, 12, 32]} />
                                </mesh>
                            </group>
                            <mesh position={[0, 0.045, 0.015]} rotation={[0, 0, Math.PI / 2]} material={neonCyanMaterial}>
                                <cylinderGeometry args={[0.010, 0.010, 0.46, 12]} />
                            </mesh>
                        </group>

                        {/* Cute Feline Muzzle, Nose & Gentle Upward Cat Mouth (ω) */}
                        <group position={[0, 0.165, 0.422]}>
                            <mesh
                                geometry={muzzleBridgeGeo}
                                material={muzzleFurMaterial}
                                position={[0, -0.005, 0.0]}
                            />
                            <mesh
                                geometry={noseGeo}
                                material={noseMaterial}
                                position={[0, 0.014, 0.030]}
                                rotation={[0.12, 0, 0]}
                            />
                            {/* Left & Right Upward-Curving Cat Mouth (ω) */}
                            <mesh position={[-0.016, -0.006, 0.028]} rotation={[0, 0, Math.PI + 0.15]} material={mouthMaterial}>
                                <torusGeometry args={[0.015, 0.0038, 10, 20, Math.PI * 0.85]} />
                            </mesh>
                            <mesh position={[0.016, -0.006, 0.028]} rotation={[0, 0, Math.PI - 0.15]} material={mouthMaterial}>
                                <torusGeometry args={[0.015, 0.0038, 10, 20, Math.PI * 0.85]} />
                            </mesh>
                            <mesh ref={mouthOpenRef} position={[0, -0.022, 0.018]} scale={[1.0, 0.25, 0.8]}>
                                <sphereGeometry args={[0.024, 16, 16]} />
                                <meshBasicMaterial color="#9e3b52" />
                            </mesh>
                        </group>

                        {/* 12 TALKING: Expanding Cyan Concentric Ring Particles */}
                        <group ref={talkBubblesRef} visible={false}>
                            <mesh>
                                <torusGeometry args={[0.035, 0.007, 10, 24]} />
                                <meshBasicMaterial color="#00e5ff" transparent opacity={0.85} toneMapped={false} />
                            </mesh>
                            <mesh>
                                <torusGeometry args={[0.052, 0.008, 10, 24]} />
                                <meshBasicMaterial color="#38f2ff" transparent opacity={0.75} toneMapped={false} />
                            </mesh>
                        </group>

                        {/* 03 SLEEPY / SLEEPING: Rising 3D "Zzz" Sprites */}
                        <group ref={zzzGroupRef} visible={false}>
                            <sprite>
                                <spriteMaterial map={zSmallTex} transparent />
                            </sprite>
                            <sprite>
                                <spriteMaterial map={zLargeTex} transparent />
                            </sprite>
                            <sprite>
                                <spriteMaterial map={zLargeTex} transparent />
                            </sprite>
                        </group>

                        {/* 11 CONFUSED: Floating "?" Sprites */}
                        <group ref={confusedGroupRef} visible={false}>
                            <sprite scale={[0.20, 0.20, 1]}>
                                <spriteMaterial map={questionTex} transparent />
                            </sprite>
                            <sprite scale={[0.20, 0.20, 1]}>
                                <spriteMaterial map={questionTex} transparent />
                            </sprite>
                        </group>

                        {/* 06 REFUSING: Floating Red "X" Indicator Sprite */}
                        <sprite ref={refuseXSpriteRef} visible={false} position={[0.40, 0.40, 0.34]}>
                            <spriteMaterial map={refuseXTex} transparent />
                        </sprite>

                        {/* Parametric Thick-Lipped Matte Crimson Hood Cowl + Rolled Arch Rim Tube */}
                        <group ref={hoodRef}>
                            <mesh geometry={hoodCowlGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                            <mesh geometry={hoodRimGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                        </group>
                    </group>

                    {/* 2. V-Draped Neck Scarf + Prominent Jagged Chest V-Mantle + Sculpted Tattered Cloak */}
                    <group ref={scarfRef}>
                        <mesh geometry={scarfCoilsGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                        <mesh geometry={frontApronGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                        <mesh geometry={cloakGeo} material={cloakTatterMaterial} castShadow receiveShadow />
                    </group>
                </group>

                {/* 3. Stubby CapsuleGeometry Paws + Glowing Cyan Wrist Rings (13 WORKING) */}
                <group ref={leftArmRef} position={[-0.47, -0.16, 0.22]}>
                    <mesh geometry={pawGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(1)}
                    <mesh ref={leftPawRingRef} visible={false} position={[0, -0.04, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.13, 0.009, 10, 32]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.95} toneMapped={false} />
                    </mesh>
                </group>

                <group ref={rightArmRef} position={[0.47, -0.16, 0.22]}>
                    <mesh geometry={pawGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(1)}
                    <mesh ref={rightPawRingRef} visible={false} position={[0, -0.04, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.13, 0.009, 10, 32]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.95} toneMapped={false} />
                    </mesh>
                </group>

                {/* 4. Stubby CapsuleGeometry Feet with Dark Paw Pads */}
                <group ref={leftFootRef} position={[-0.20, -0.56, 0.10]}>
                    <mesh geometry={footGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(-1)}
                </group>

                <group ref={rightFootRef} position={[0.20, -0.56, 0.10]}>
                    <mesh geometry={footGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(-1)}
                </group>

                {/* 5. 08 GOLFING: Tiny Wooden Club + Glowing Cyan Energy Orb + Arc Trajectory */}
                <group ref={golfGroupRef} visible={false}>
                    <group ref={golfClubRef} position={[0.02, -0.15, 0.48]} rotation={[0.25, 0, -0.45]}>
                        <mesh position={[0, -0.16, 0]}>
                            <cylinderGeometry args={[0.012, 0.016, 0.40, 12]} />
                            <meshStandardMaterial color="#6e472b" roughness={0.85} />
                        </mesh>
                        <mesh position={[-0.032, -0.34, 0.016]} rotation={[0, 0, 1.15]}>
                            <cylinderGeometry args={[0.018, 0.014, 0.09, 12]} />
                            <meshStandardMaterial color="#593820" roughness={0.85} />
                        </mesh>
                    </group>
                    <mesh geometry={golfTrailGeo}>
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.72} toneMapped={false} />
                    </mesh>
                    <group ref={golfOrbRef} position={[-0.22, -0.46, 0.54]}>
                        <mesh>
                            <sphereGeometry args={[0.068, 24, 24]} />
                            <meshBasicMaterial color="#e0ffff" toneMapped={false} />
                        </mesh>
                        <mesh scale={1.55}>
                            <sphereGeometry args={[0.068, 24, 24]} />
                            <meshBasicMaterial color="#00e5ff" transparent opacity={0.48} toneMapped={false} />
                        </mesh>
                    </group>
                </group>

                {/* 6. 11 CLAPPING: Happy Star Sparks Between Paws */}
                <group ref={clapSparksRef} visible={false} position={[0, -0.10, 0.56]}>
                    <mesh position={[-0.12, 0.04, 0]} rotation={[0, 0, 0.4]}>
                        <octahedronGeometry args={[0.042, 0]} />
                        <meshBasicMaterial color="#70f8ff" toneMapped={false} />
                    </mesh>
                    <mesh position={[0.12, 0.04, 0]} rotation={[0, 0, -0.4]}>
                        <octahedronGeometry args={[0.042, 0]} />
                        <meshBasicMaterial color="#70f8ff" toneMapped={false} />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

// Global container placeholder for CMSLayoutImpl (mounted outside R3F Canvas)
export const TamagotchiGlobal: React.FC = () => null;
export default TamagotchiGlobal;
