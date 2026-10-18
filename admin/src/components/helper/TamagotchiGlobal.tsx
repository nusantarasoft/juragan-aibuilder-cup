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

// ─── 1. Procedural Multi-Layer Animal Fur Pelt Texture (threejs-textures skill) ──
function createFurBumpTexture(): THREE.CanvasTexture {
    const size = 1024;
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d')!;

    // Soft undercoat base
    bCtx.fillStyle = '#525252';
    bCtx.fillRect(0, 0, size, size);

    let seed = 1337;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    // Pass 0: Organic soft undercoat clumping blotches
    for (let i = 0; i < 1200; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 10 + rand() * 18;
        const v = Math.floor(55 + rand() * 50);
        bCtx.fillStyle = `rgba(${v},${v},${v},0.18)`;
        bCtx.beginPath();
        bCtx.arc(x, y, r, 0, Math.PI * 2);
        bCtx.fill();
    }

    bCtx.lineCap = 'round';

    // Helper to draw a curved short animal hair stroke with seamless tile wrapping
    const drawCurvedHair = (
        x: number,
        y: number,
        dx: number,
        dy: number,
        cxOff: number,
        width: number,
        style: string
    ) => {
        bCtx.strokeStyle = style;
        bCtx.lineWidth = width;
        const wrapX = [-size, 0, size];
        const wrapY = [-size, 0, size];
        for (let wx = 0; wx < 3; wx++) {
            const ox = wrapX[wx];
            if (x + ox < -40 || x + ox > size + 40) continue;
            for (let wy = 0; wy < 3; wy++) {
                const oy = wrapY[wy];
                if (y + oy < -40 || y + oy > size + 40) continue;
                bCtx.beginPath();
                bCtx.moveTo(x + ox, y + oy);
                bCtx.quadraticCurveTo(
                    x + ox + dx * 0.5 + cxOff,
                    y + oy + dy * 0.5,
                    x + ox + dx,
                    y + oy + dy
                );
                bCtx.stroke();
            }
        }
    };

    // Pass 1: Dense soft undercoat hairs (12,000 short curved fibers)
    for (let i = 0; i < 12000; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const angle = (rand() - 0.5) * 0.52;
        const len = 9 + rand() * 10;
        const dx = Math.sin(angle) * len;
        const dy = Math.cos(angle) * len;
        const cxOff = (rand() - 0.5) * 3.2;
        const val = Math.floor(72 + rand() * 68);
        drawCurvedHair(x, y, dx, dy, cxOff, 1.4 + rand() * 1.1, `rgba(${val},${val},${val},0.55)`);
    }

    // Pass 2: Mid-coat animal fur fibers (12,000 fine overlapping hairs)
    for (let i = 0; i < 12000; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const angle = (rand() - 0.5) * 0.38;
        const len = 12 + rand() * 13;
        const dx = Math.sin(angle) * len;
        const dy = Math.cos(angle) * len;
        const cxOff = (rand() - 0.5) * 2.8;
        const val = Math.floor(130 + rand() * 75);
        drawCurvedHair(x, y, dx, dy, cxOff, 0.85 + rand() * 0.75, `rgba(${val},${val},${val},0.72)`);
    }

    // Pass 3: Crisp Agouti Guard Hairs (8,000 bright-tipped raccoon/panda guard hairs)
    for (let i = 0; i < 8000; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const angle = (rand() - 0.5) * 0.28;
        const len = 14 + rand() * 15;
        const dx = Math.sin(angle) * len;
        const dy = Math.cos(angle) * len;
        const cxOff = (rand() - 0.5) * 2.2;
        const val = Math.floor(205 + rand() * 50);
        drawCurvedHair(x, y, dx, dy, cxOff, 0.55 + rand() * 0.55, `rgba(${val},${val},${val},0.85)`);
    }

    const furBumpMap = new THREE.CanvasTexture(bumpCanvas);
    furBumpMap.wrapS = THREE.RepeatWrapping;
    furBumpMap.wrapT = THREE.RepeatWrapping;
    furBumpMap.repeat.set(5, 4);
    furBumpMap.anisotropy = 4;
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
    const tailRef = useRef<THREE.Group>(null);
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

    // ─── Build Red Panda Head + Fat Raccoon Body + Mecha Beast Horn + Fox Tail Geometries ─────
    const {
        bodyGeo,
        furShellsGeo,
        redPandaEarOuterGeo,
        redPandaEarInnerGeo,
        hornGeo,
        hornCollarGeo,
        foxTailGeo,
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
        const n = new THREE.Vector3();

        // Helper: Shared anatomical deformation for Fatty Red Panda Head + Fat Oval Raccoon Body (NO vertical accordion ribs!)
        const deformFatPandaRaccoonBody = (pt: THREE.Vector3) => {
            const dir = pt.clone().normalize();
            const angle = Math.atan2(dir.x, dir.z);
            const absAng = Math.abs(angle);

            // Keep the full fat oval silhouette across the entire front & sides (|angle| < 1.18 rad),
            // only tapering slightly at the hidden rear back under the cloak so it never clips through the cape
            const underCloakRear = smoothstep(1.15, 1.72, absAng);

            // 1) FAT OVAL RACCOON BODY SHAPE (Smooth, wide, plump elliptical oval torso below the neck!)
            // Map the torso (dir.y from +0.10 down to -1.0) onto a plump mathematical Fat Oval
            // whose widest horizontal equator is at mid-lower belly (dir.y = -0.40, y ≈ -0.23)
            const torsoMask = smoothstep(0.11, -0.03, dir.y);
            const ovalCenterY = -0.40;
            const uOval =
                dir.y >= ovalCenterY
                    ? ((dir.y - ovalCenterY) / (0.10 - ovalCenterY)) * 0.72
                    : (dir.y - ovalCenterY) / (-1.0 - ovalCenterY);
            const clampedU = Math.max(-1.0, Math.min(0.95, uOval));
            // Plump fat-oval super-ellipse arc (stays full & round through the lower belly before rounding closed at the bottom)
            const ovalArc = Math.pow(Math.max(0.0, 1.0 - Math.pow(Math.abs(clampedU), 2.12)), 0.50);
            const sphereHoriz = Math.max(0.0001, Math.hypot(dir.x, dir.z));

            // Blend native sphere radius (0.49 * sphereHoriz) with the plump Fat Oval radius (Rx=0.70, Rz=0.60)
            const ovalRx = 0.49 * sphereHoriz * (1.0 - torsoMask) + (0.70 * ovalArc) * torsoMask;
            const ovalRz = 0.49 * sphereHoriz * (1.0 - torsoMask) + (0.60 * ovalArc) * torsoMask;

            // 2) FATTY RED PANDA HEAD SHAPE (broad, round, chubby head + big squishy cheek pouches!)
            const headBroadness =
                smoothstep(0.04, 0.24, dir.y) *
                (1.0 - smoothstep(0.56, 0.90, dir.y)) *
                (1.0 - underCloakRear * 0.55);
            const headTaper = smoothstep(0.32, 0.92, dir.y);
            const neckIn = smoothstep(-0.02, 0.10, dir.y) * (1.0 - smoothstep(0.10, 0.24, dir.y));

            const headScaleX =
                0.98 +
                headBroadness * 0.11 -
                headTaper * 0.04 -
                neckIn * 0.04 -
                underCloakRear * 0.08;
            const headScaleZ =
                0.95 +
                headBroadness * 0.05 -
                headTaper * 0.05 -
                neckIn * 0.03 -
                underCloakRear * 0.10;

            const rearBodyTaperX = 1.0 - torsoMask * underCloakRear * 0.18;
            const rearBodyTaperZ = 1.0 - torsoMask * underCloakRear * 0.22;

            if (sphereHoriz > 0.0001) {
                const nx = dir.x / sphereHoriz;
                const nz = dir.z / sphereHoriz;
                pt.x = nx * ovalRx * headScaleX * rearBodyTaperX;
                pt.z = nz * ovalRz * headScaleZ * rearBodyTaperZ;
            }
            pt.y = pt.y * (1.15 - torsoMask * 0.05);

            // Fatty Red Panda Cheek Pouches & Subtle Eye Sockets
            if (dir.z > 0.12 && dir.y > 0.06) {
                const dLeftEye = Math.hypot(dir.x + 0.34, dir.y - 0.42);
                const dRightEye = Math.hypot(dir.x - 0.34, dir.y - 0.42);
                const eyeSocket =
                    (1.0 - smoothstep(0.04, 0.20, dLeftEye)) +
                    (1.0 - smoothstep(0.04, 0.20, dRightEye));
                pt.z -= eyeSocket * 0.014;

                // Big, plump, round Fatty Red Panda cheek pouches bulging out on left & right sides
                const dCheek = Math.hypot((Math.abs(dir.x) - 0.46) * 0.95, (dir.y - 0.21) * 1.25);
                const cheekPouch = (1.0 - smoothstep(0.0, 0.38, dCheek)) * smoothstep(0.08, 0.62, dir.z);
                // Soft horizontal layered cheek ruff tiers (no vertical pleats!)
                const softRuffTier = 0.88 + 0.12 * Math.sin(dir.y * 26.0);
                pt.x += Math.sign(dir.x) * cheekPouch * softRuffTier * 0.094;
                pt.z += cheekPouch * softRuffTier * 0.046;
                pt.y -= cheekPouch * 0.012;
            }
        };

        // 1A. Fatty Red Panda Head + Fat Oval Raccoon Body Base Mesh
        const bGeo = new THREE.SphereGeometry(0.49, 144, 144);
        const pos = bGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            deformFatPandaRaccoonBody(v);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        bGeo.computeVertexNormals();

        // 1A-2. 6-Layer Volumetric 3D Short-Hair Fur Shell Coat (Soft fuzzy animal hair silhouette!)
        const shellBase = new THREE.SphereGeometry(0.49, 120, 96);
        const sbPos = shellBase.attributes.position;
        for (let i = 0; i < sbPos.count; i++) {
            v.fromBufferAttribute(sbPos, i);
            deformFatPandaRaccoonBody(v);
            sbPos.setXYZ(i, v.x, v.y, v.z);
        }
        shellBase.computeVertexNormals();

        const shellLayers: THREE.BufferGeometry[] = [];
        const numShells = 6;
        for (let sIdx = 1; sIdx <= numShells; sIdx++) {
            const layerFrac = sIdx / numShells;
            const sg = shellBase.clone();
            const sPos = sg.attributes.position;
            const sNorm = sg.attributes.normal;
            const layerAttr = new Float32Array(sPos.count);

            for (let i = 0; i < sPos.count; i++) {
                v.fromBufferAttribute(sPos, i);
                n.fromBufferAttribute(sNorm, i);
                const angle = Math.atan2(v.x, v.z);
                const absAng = Math.abs(angle);

                // Keep 3D fur shells across the full uncovered fat oval front & sides
                const lowerBodyMask =
                    smoothstep(0.01, -0.09, v.y) *
                    (1.0 - smoothstep(-0.48, -0.54, v.y)) *
                    (1.0 - smoothstep(0.94, 1.10, absAng));
                const cheekForeheadMask =
                    smoothstep(0.09, 0.17, v.y) *
                    (1.0 - smoothstep(0.74, 0.94, absAng)) *
                    (1.0 - smoothstep(0.46, 0.54, v.y));
                const dLEye = Math.hypot(v.x + 0.155, v.y - 0.245);
                const dREye = Math.hypot(v.x - 0.155, v.y - 0.245);
                const eyeClear = smoothstep(0.09, 0.15, dLEye) * smoothstep(0.09, 0.15, dREye);
                const dSnout = Math.hypot(v.x, v.y - 0.155);
                const snoutClear = smoothstep(0.06, 0.13, dSnout);

                const activeFur = Math.min(1.0, (lowerBodyMask + cheekForeheadMask * 0.90) * eyeClear * snoutClear);
                const furLen = 0.036 * activeFur * layerFrac;

                v.x += n.x * furLen;
                v.z += n.z * furLen;
                v.y += n.y * furLen * 0.55 - Math.pow(layerFrac, 1.35) * 0.014 * activeFur;

                sPos.setXYZ(i, v.x, v.y, v.z);
                layerAttr[i] = activeFur > 0.04 ? layerFrac : 2.0;
            }
            sg.setAttribute('aShellLayer', new THREE.BufferAttribute(layerAttr, 1));
            shellLayers.push(sg);
        }
        const fShellsGeo = mergeGeometries(shellLayers);

        // 1A-3. Fluffy Triangular Red Panda Ears (Wide & Furry with Rounded Tips)
        const earOutGeo = new THREE.ConeGeometry(0.098, 0.150, 32, 16);
        const eoPos = earOutGeo.attributes.position;
        for (let i = 0; i < eoPos.count; i++) {
            v.fromBufferAttribute(eoPos, i);
            const t = (v.y + 0.075) / 0.150;
            const roundTip = Math.sin(t * Math.PI * 0.86) * 0.28 + (1.0 - t) * 0.85;
            v.x = v.x * roundTip * 1.24;
            v.z = v.z * roundTip * 0.65 - (v.z > 0 ? Math.sin(t * Math.PI) * 0.018 : 0);
            eoPos.setXYZ(i, v.x, v.y, v.z);
        }
        earOutGeo.computeVertexNormals();

        const earInGeo = earOutGeo.clone();
        earInGeo.scale(0.82, 0.84, 0.75);
        earInGeo.translate(0, -0.005, 0.016);

        // 1B. Cone-Shaped Silver Metal Mecha Horn (Seamless Conical Silhouette + Subtle Machined Bevel Fluting & Seam Rings!)
        const hGeo = new THREE.CylinderGeometry(0.002, 0.098, 0.32, 48, 48);
        const hPos = hGeo.attributes.position;
        for (let i = 0; i < hPos.count; i++) {
            v.fromBufferAttribute(hPos, i);
            const t = Math.max(0, Math.min(1, (v.y + 0.16) / 0.32)); // 0 at wide cone base, 1 at sharp cone tip
            const angle = Math.atan2(v.x, v.z);
            const currentR = Math.hypot(v.x, v.z);

            if (currentR > 0.0001) {
                const nx = v.x / currentR;
                const nz = v.z / currentR;

                // Subtle 8-plane conical mecha bevel fluting & fine machined ring grooves while keeping a pure cone shape
                const coneFacet = Math.cos(angle * 8.0) * 0.015;
                const ringSeam1 = Math.exp(-Math.pow((t - 0.28) * 55.0, 2.0)) * 0.035;
                const ringSeam2 = Math.exp(-Math.pow((t - 0.58) * 55.0, 2.0)) * 0.035;
                const seamIndent = 1.0 - ringSeam1 - ringSeam2;

                // True linear-conical taper from wide base (0.098) straight to a sharp point (0.002)
                const coneTaper = Math.pow(Math.max(0, 1.0 - t * 0.98), 1.02);
                const rCone = 0.098 * coneTaper * (1.0 + coneFacet) * seamIndent;

                v.x = nx * rCone;
                v.z = nz * rCone;
            }

            v.y = t * 0.32;
            hPos.setXYZ(i, v.x, v.y, v.z);
        }
        hGeo.computeVertexNormals();

        // Seamless Conical Silver Metal Mounting Collar at Forehead Root
        const hCollarGeo = new THREE.CylinderGeometry(0.090, 0.104, 0.030, 48, 4);
        hCollarGeo.translate(0, 0.012, 0);
        hCollarGeo.computeVertexNormals();

        // 1B-2. Lush, Bushy S-Curved Fox-Shaped Tail with 3 Volumetric Fur Shell Layers (NO vertical pleats!)
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.0, 0.0, 0.0),
            new THREE.Vector3(0.14, -0.05, -0.24),
            new THREE.Vector3(0.30, 0.04, -0.50),
            new THREE.Vector3(0.40, 0.24, -0.72),
            new THREE.Vector3(0.35, 0.46, -0.85),
        ]);
        const tSegsU = 72;
        const tSegsV = 44;
        const tailBaseGeo = new THREE.TubeGeometry(tailCurve, tSegsU, 0.18, tSegsV, false);
        const ftPos = tailBaseGeo.attributes.position;
        const ftUv = tailBaseGeo.attributes.uv;
        const centerPt = new THREE.Vector3();

        for (let i = 0; i < ftPos.count; i++) {
            v.fromBufferAttribute(ftPos, i);
            const u = Math.max(0, Math.min(1, ftUv.getX(i)));
            tailCurve.getPointAt(u, centerPt);
            const radial = v.clone().sub(centerPt);
            const rLen = radial.length();

            if (rLen > 0.0001) {
                radial.normalize();
                // Smooth, ultra-plush bushy Fox Tail spindle profile (narrow at root, huge & round in middle, soft tapered tip)
                const foxProfile =
                    Math.pow(Math.sin(u * Math.PI), 0.68) * (0.32 + 0.86 * Math.sin(u * Math.PI * 0.85)) +
                    (1.0 - u) * 0.06;
                const targetR = 0.225 * foxProfile;
                v.copy(centerPt).addScaledVector(radial, targetR);
                v.y -= Math.max(0, -radial.y) * 0.020 * Math.sin(u * Math.PI);
            } else {
                v.copy(centerPt);
            }
            ftPos.setXYZ(i, v.x, v.y, v.z);
        }
        tailBaseGeo.computeVertexNormals();

        // Merge base tail + 3 concentric volumetric fur shells so the bushy tail has a soft 3D hair silhouette!
        const tailLayers: THREE.BufferGeometry[] = [];
        for (let tLayer = 0; tLayer <= 3; tLayer++) {
            const tg = tailBaseGeo.clone();
            const tPos = tg.attributes.position;
            const tNorm = tg.attributes.normal;
            const tUvAttr = tg.attributes.uv;
            const shellAttr = new Float32Array(tPos.count);
            const frac = tLayer / 3; // 0.0 (solid core), 0.33, 0.67, 1.0 (outer fur tips)

            for (let i = 0; i < tPos.count; i++) {
                v.fromBufferAttribute(tPos, i);
                n.fromBufferAttribute(tNorm, i);
                const u = tUvAttr.getX(i);
                const env = Math.sin(u * Math.PI);
                const outPush = frac * 0.032 * env;
                v.addScaledVector(n, outPush);
                tPos.setXYZ(i, v.x, v.y, v.z);
                shellAttr[i] = frac;
            }
            tg.setAttribute('aTailShell', new THREE.BufferAttribute(shellAttr, 1));
            tailLayers.push(tg);
        }
        const fTailGeo = mergeGeometries(tailLayers);

        // 1C. Parametric Hood Cowl (Widened around the cheeks for the Fatty Red Panda Head!)
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
                const phi = (u - 0.5) * Math.PI * 2;

                const peakY = 0.30;
                const peakZ = -0.74;

                const crownRx = 0.57;
                const crownRy = 0.49;

                const topArchClearance = Math.exp(-phi * phi * 12.0) * smoothstep(0.50, 1.0, s);
                const templeWidth = Math.sin(phi) * Math.sin(phi) * 0.088;

                const frontRx = 0.462 + templeWidth;
                const frontRy = 0.368;
                const frontCenterY = 0.215;

                const absPhi = Math.abs(phi);
                const nick1 = Math.exp(-Math.pow((absPhi - 0.85) * 16.0, 2)) * 0.038;
                const nick2 = Math.exp(-Math.pow((absPhi - 1.32) * 18.0, 2)) * 0.030;
                const rimNotch = (nick1 + nick2) * smoothstep(0.75, 1.0, s);

                const bell = Math.sin(s * Math.PI * 0.72);
                const archBlend = Math.pow(s, 1.35);

                const rx = THREE.MathUtils.lerp(crownRx * bell, frontRx, archBlend);
                const ry = THREE.MathUtils.lerp(crownRy * bell, frontRy, archBlend);
                const cy = THREE.MathUtils.lerp(peakY, frontCenterY, s) + (1 - s) * s * 0.16;

                let px = Math.sin(phi) * rx;
                let py = cy + Math.cos(phi) * ry + topArchClearance * 0.055;
                let pz = THREE.MathUtils.lerp(peakZ, 0.34, Math.pow(s, 0.86)) - rimNotch - topArchClearance * 0.095;

                const bottomWeight = smoothstep(1.40, 2.65, absPhi);
                py = THREE.MathUtils.lerp(py, 0.08, bottomWeight * smoothstep(0.3, 1.0, s));
                pz -= bottomWeight * 0.12 * s;

                const distFromHead = Math.hypot(px * 0.92, py - 0.22, pz);
                if (distFromHead < 0.502 && s < 0.92 && !isLip) {
                    const push = 0.502 / Math.max(0.001, distFromHead);
                    px *= push;
                    py = 0.22 + (py - 0.22) * push;
                    pz *= push;
                }

                const clothFold =
                    (Math.sin(phi * 4.0 + s * 8.0) * 0.011 +
                        Math.cos(phi * 7.0 - s * 5.0) * 0.008) *
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

        // Rolled 3D Arch Rim Tube framing the wider Fatty Red Panda face opening
        const rimCurvePts: THREE.Vector3[] = [];
        const numRimPts = 56;
        for (let i = 0; i <= numRimPts; i++) {
            const u = (i / numRimPts) * 2 - 1;
            const phi = u * 1.56;
            const topArchClearance = Math.exp(-phi * phi * 12.0);
            const rx = Math.sin(phi) * (0.452 + Math.sin(phi) * Math.sin(phi) * 0.088);
            const ry = 0.205 + Math.cos(phi) * 0.358 + topArchClearance * 0.055;
            const rz = 0.33 - Math.abs(u) * 0.04 - topArchClearance * 0.095;
            rimCurvePts.push(new THREE.Vector3(rx, ry, rz));
        }
        const rimCurve = new THREE.CatmullRomCurve3(rimCurvePts);
        const hRimGeo = new THREE.TubeGeometry(rimCurve, 64, 0.042, 16, false);

        // 1D. Compact Neck Scarf Folds (Widened for Fatty Raccoon neck/shoulders, leaving belly uncovered!)
        const createVDrapedScarfFold = (
            radius: number,
            tube: number,
            yOffset: number,
            frontVDip: number,
            tiltZ: number,
            seed: number
        ) => {
            const tGeo = new THREE.TorusGeometry(radius, tube, 24, 96);
            tGeo.rotateX(Math.PI / 2);
            tGeo.rotateZ(tiltZ);
            const tPos = tGeo.attributes.position;
            for (let i = 0; i < tPos.count; i++) {
                v.fromBufferAttribute(tPos, i);
                const angle = Math.atan2(v.x, v.z);
                const frontFactor = Math.max(0, Math.cos(angle));
                const backFactor = Math.max(0, -Math.cos(angle));

                const vDip = Math.pow(frontFactor, 1.45) * frontVDip;
                const bDip = Math.pow(backFactor, 1.5) * 0.025;
                const crease =
                    Math.sin(angle * 5 + seed) * 0.008 +
                    Math.cos(angle * 9 - seed) * 0.005;

                v.y += yOffset - vDip - bDip + crease;
                v.z += frontFactor * 0.032;
                tPos.setXYZ(i, v.x, v.y, v.z);
            }
            tGeo.computeVertexNormals();
            return tGeo;
        };

        const fold1 = createVDrapedScarfFold(0.462, 0.046, 0.105, 0.032, 0.02, 1.1);
        const fold2 = createVDrapedScarfFold(0.478, 0.048, 0.072, 0.045, -0.03, 2.7);
        const fold3 = createVDrapedScarfFold(0.484, 0.046, 0.038, 0.055, 0.02, 4.3);
        const sCoilsGeo = mergeGeometries([fold1, fold2, fold3]);

        // 1E. Compact Jagged V-Mantle Collar Under Chin
        const apronShape = new THREE.Shape();
        apronShape.moveTo(-0.30, 0.07);
        apronShape.lineTo(0.30, 0.07);
        apronShape.lineTo(0.26, -0.01);
        apronShape.lineTo(0.21, 0.01);
        apronShape.lineTo(0.16, -0.07);
        apronShape.lineTo(0.11, -0.04);
        apronShape.lineTo(0.06, -0.11);
        apronShape.lineTo(0.03, -0.08);
        apronShape.lineTo(0.00, -0.15);
        apronShape.lineTo(-0.04, -0.08);
        apronShape.lineTo(-0.08, -0.11);
        apronShape.lineTo(-0.12, -0.05);
        apronShape.lineTo(-0.17, -0.08);
        apronShape.lineTo(-0.22, -0.01);
        apronShape.lineTo(-0.27, -0.03);
        apronShape.closePath();

        const apronGeo = new THREE.ExtrudeGeometry(apronShape, {
            steps: 2,
            depth: 0.026,
            bevelEnabled: true,
            bevelThickness: 0.009,
            bevelSize: 0.008,
            bevelSegments: 3,
        });
        const aPos = apronGeo.attributes.position;
        for (let i = 0; i < aPos.count; i++) {
            v.fromBufferAttribute(aPos, i);
            const chestAng = v.x * 1.05;
            const rad = 0.525 + v.z;
            const ny = v.y;
            v.x = Math.sin(chestAng) * rad;
            v.z = Math.cos(chestAng) * rad + 0.026;
            v.y = ny;
            aPos.setXYZ(i, v.x, v.y, v.z);
        }
        apronGeo.computeVertexNormals();

        // 1F. Open-Front Sculpted Tattered Cloak (Leaves the wide Fatty Raccoon belly & flanks open in front!)
        const cSegsU = 140;
        const cSegsV = 56;
        const clkGeo = new THREE.BufferGeometry();
        const clkVerts: number[] = [];
        const clkUvs: number[] = [];
        const clkIndices: number[] = [];

        const startAng = 1.10;
        const endAng = Math.PI * 2 - 1.10;

        for (let iv = 0; iv <= cSegsV; iv++) {
            const t = iv / cSegsV;
            for (let iu = 0; iu <= cSegsU; iu++) {
                const u = iu / cSegsU;
                const edgeSweep = Math.pow(t, 1.15) * 0.10;
                const ang = THREE.MathUtils.lerp(startAng + edgeSweep, endAng - edgeSweep, u);

                const upperDrapeR = 0.555 + Math.sin(t * Math.PI * 0.65) * 0.155 + t * 0.16;
                const floorFlare = Math.pow(Math.max(0, (t - 0.56) / 0.44), 2.0) * 0.24;
                const sideWingSpread = Math.pow(Math.sin(ang), 2) * Math.pow(Math.max(0, (t - 0.25) / 0.75), 1.2) * 0.18;

                const distFromBack = Math.abs(ang - Math.PI);
                const tailArchMask = Math.exp(-Math.pow(distFromBack * 3.2, 2.0)) * smoothstep(0.45, 0.95, t);

                const pleats =
                    (Math.sin(ang * 7.0) * 0.025 +
                        Math.cos(ang * 13.0 + 0.4) * 0.014) *
                    Math.sin(t * Math.PI * 0.92);

                const numStrips = 12.0;
                const stripPhase = u * numStrips;
                const triWave = 1.0 - 2.0 * Math.abs(stripPhase - Math.floor(stripPhase) - 0.5);
                const hemMask = smoothstep(0.80, 1.0, t);

                const tatterTipExt = triWave * hemMask * 0.08;
                const tatterValleyCut = (1.0 - triWave) * hemMask * 0.075;

                const rad = upperDrapeR + floorFlare + sideWingSpread + pleats + tatterTipExt + tailArchMask * 0.08;
                const px = Math.sin(ang) * rad;
                const pz = Math.cos(ang) * rad;

                const baseHemY = 0.06 - t * 0.68;
                const py = Math.max(-0.62, baseHemY + tatterValleyCut + tailArchMask * 0.18);

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

        // 1G. Front-Facing Curved Eye Decal Geometry (Keep Current Eyes!)
        const eDecalGeo = createCurvedEyeGeometry(0.195, 0.195, 0.024);

        // 1H. Sculpted Fatty Raccoon Arms/Hands (pawGeo) & Fatty Raccoon Legs/Feet (footGeo)!
        const armParts: THREE.BufferGeometry[] = [];
        // Rounded shoulder joint that tucks smoothly into the side of the fat oval torso
        const shoulderBulb = new THREE.SphereGeometry(0.068, 24, 20);
        shoulderBulb.scale(1.04, 1.28, 1.02);
        shoulderBulb.translate(0, 0.056, -0.022);
        armParts.push(shoulderBulb);

        // Chubby furry raccoon forearm tapering toward the wrist
        const upperArm = new THREE.SphereGeometry(0.062, 24, 20);
        upperArm.scale(1.06, 1.18, 0.94);
        upperArm.translate(0, 0.002, 0.002);
        armParts.push(upperArm);

        // Flattened, rounded raccoon hand palm (ends at y ≈ -0.088 so the 5 fingers protrude clearly!)
        const handPalm = new THREE.SphereGeometry(0.054, 24, 20);
        handPalm.scale(1.18, 0.78, 0.68);
        handPalm.translate(0, -0.046, 0.018);
        armParts.push(handPalm);

        // 5 Distinct Sculpted Raccoon Fingers/Digits fanning out clearly beyond the palm (y down to -0.128)
        for (let f = -2; f <= 2; f++) {
            const finger = new THREE.CapsuleGeometry(0.013, 0.032, 8, 14);
            const fAng = f * 0.25;
            finger.rotateX(0.28);
            finger.rotateZ(-fAng * 0.55);
            finger.translate(
                Math.sin(fAng) * 0.054,
                -0.096 + Math.abs(f) * 0.006,
                0.028 + Math.cos(fAng) * 0.010
            );
            armParts.push(finger);
        }
        const pGeo = mergeGeometries(armParts);
        pGeo.computeVertexNormals();

        // Fatty Raccoon Legs & Feet (Thick drumstick thigh haunch + hind foot + 4 protruding raccoon toes!)
        const legParts: THREE.BufferGeometry[] = [];
        const thighHaunch = new THREE.SphereGeometry(0.118, 28, 24);
        thighHaunch.scale(1.14, 1.22, 1.08);
        thighHaunch.translate(0, 0.078, -0.012);
        legParts.push(thighHaunch);

        const hindFoot = new THREE.CapsuleGeometry(0.078, 0.048, 16, 24);
        hindFoot.rotateX(Math.PI / 2);
        hindFoot.scale(1.20, 0.78, 1.08);
        hindFoot.translate(0, -0.012, 0.028);
        legParts.push(hindFoot);

        for (let tIdx = -1.5; tIdx <= 1.5; tIdx += 1.0) {
            const toe = new THREE.SphereGeometry(0.028, 14, 14);
            toe.scale(0.95, 0.82, 1.45);
            const tAng = tIdx * 0.25;
            toe.rotateY(tAng * 0.5);
            toe.translate(
                Math.sin(tAng) * 0.076,
                -0.024,
                0.128 + Math.cos(tAng) * 0.018
            );
            legParts.push(toe);
        }
        const ftGeo = mergeGeometries(legParts);
        ftGeo.computeVertexNormals();

        // Cute Fatty Red Panda dark button nose & plump white snout
        const nGeo = new THREE.SphereGeometry(0.026, 24, 24);
        nGeo.scale(1.28, 0.92, 0.92);

        const mBridgeGeo = new THREE.SphereGeometry(0.060, 24, 24);
        mBridgeGeo.scale(1.52, 0.96, 0.72);

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
            furShellsGeo: fShellsGeo,
            redPandaEarOuterGeo: earOutGeo,
            redPandaEarInnerGeo: earInGeo,
            hornGeo: hGeo,
            hornCollarGeo: hCollarGeo,
            foxTailGeo: fTailGeo,
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
        furShellMaterial,
        redPandaEarOuterMaterial,
        redPandaEarInnerMaterial,
        muzzleFurMaterial,
        darkLimbFurMaterial,
        pawPadMaterial,
        hornMaterial,
        hornCollarMaterial,
        foxTailMaterial,
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

        // Shared GLSL Staggered Short-Hair Animal Fur Generator (Eliminates vertical stripes; draws thousands of short tapered animal hairs!)
        const furNoiseFunctionsGLSL = `
            float furHash21(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float furValueNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(furHash21(i + vec2(0.0, 0.0)), furHash21(i + vec2(1.0, 0.0)), u.x),
                    mix(furHash21(i + vec2(0.0, 1.0)), furHash21(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            // Generates staggered, overlapping short tapered animal hair fibers (root -> tip)
            float shortHairLayer(vec2 coord, float freqX, float freqY, float seed) {
                float colX = coord.x * freqX;
                float laneId = floor(colX);
                float laneU  = fract(colX);
                float hRand  = furHash21(vec2(laneId, seed));
                float yStagger = coord.y * freqY + hRand * 6.2 + (laneU - 0.5) * 0.35;
                float segId  = floor(yStagger);
                float segV   = fract(yStagger);
                float segRand = furHash21(vec2(laneId * 1.37 + seed, segId));
                float hairCenter = 0.24 + 0.52 * segRand;
                float halfWidth = mix(0.44, 0.13, segV);
                float radialProfile = 1.0 - smoothstep(0.0, halfWidth, abs(laneU - hairCenter));
                float lengthEnvelope = smoothstep(0.0, 0.16, segV) * (1.0 - smoothstep(0.76, 1.0, segV));
                float agoutiTip = mix(0.32, 1.0, smoothstep(0.12, 0.86, segV));
                return radialProfile * lengthEnvelope * agoutiTip * (0.62 + 0.38 * segRand);
            }

            vec2 computeAnimalFur(vec2 flowCoord) {
                float waveX = (furValueNoise(flowCoord * vec2(7.5, 6.0)) - 0.5) * 0.034
                            + (furValueNoise(flowCoord * vec2(18.0, 14.0)) - 0.5) * 0.015;
                vec2 warped = vec2(flowCoord.x + waveX, flowCoord.y);

                float undercoat = furValueNoise(warped * vec2(24.0, 10.0));
                float hCoarse   = shortHairLayer(warped, 68.0,  9.5,  1.1);
                float hMed      = shortHairLayer(warped + vec2(0.007, 0.04), 132.0, 15.0, 3.7);
                float hFine     = shortHairLayer(warped + vec2(0.003, 0.02), 210.0, 22.0, 7.3);

                float fiberVal  = clamp(undercoat * 0.26 + hCoarse * 0.34 + hMed * 0.42 + hFine * 0.36, 0.0, 1.0);
                float shellMask = clamp(max(hCoarse * 0.88, max(hMed * 0.96, hFine)) + undercoat * 0.20, 0.0, 1.0);
                return vec2(fiberVal, shellMask);
            }
        `;

        const sharedFurColorGLSL = `
            vec3 p = vBodyPos;
            float angle = (abs(p.x) + abs(p.z) > 0.0001) ? atan(p.x, p.z) : 0.0;
            float localR = max(0.22, length(p.xz));
            // Circumferential arc-length + vertical height so short hairs have uniform width & length everywhere!
            vec2 furCoord = vec2(angle * localR, -p.y);
            vec2 furData  = computeAnimalFur(furCoord);
            float furStrand = furData.x;
            float furShellDensity = furData.y;
            float furJitter = (furValueNoise(furCoord * vec2(32.0, 18.0)) - 0.5) * 0.032
                            + (furStrand - 0.5) * 0.024;

            // 1. EXTRA-FATTY RACCOON BODY TEXTURE (p.y <= 0.04):
            // Authentic grizzled salt-and-pepper Raccoon agouti fur (dark charcoal undercoat, warm taupe-grey mid, silver guard-hair tips!)
            vec3 raccoonRoot   = vec3(0.09, 0.08, 0.08);
            vec3 raccoonMid    = vec3(0.39, 0.36, 0.33);
            vec3 raccoonSilver = vec3(0.82, 0.79, 0.74);
            vec3 raccoonGrizzle = mix(raccoonRoot, raccoonMid, smoothstep(0.14, 0.54, furStrand));
            raccoonGrizzle      = mix(raccoonGrizzle, raccoonSilver, smoothstep(0.56, 0.88, furStrand));

            // Natural soft dark charcoal raccoon banding across the wide chubby flanks & haunches
            float flankWeight = smoothstep(0.12, 0.38, abs(p.x));
            float raccoonBandWave = sin(p.y * 24.0 + furValueNoise(furCoord * 8.0) * 1.4);
            float raccoonDarkBand = smoothstep(0.10, 0.78, raccoonBandWave) * smoothstep(-0.02, -0.16, p.y) * (0.45 + 0.55 * flankWeight);
            vec3 raccoonCoat = mix(raccoonGrizzle, raccoonRoot * 1.10, raccoonDarkBand * 0.52);

            // Plush Silver-Cream / Warm Buff Fatty Raccoon Center Belly Patch
            vec3 bellyBuffRoot = vec3(0.52, 0.49, 0.45);
            vec3 bellyBuffMid  = vec3(0.76, 0.73, 0.68);
            vec3 bellyBuffTip  = vec3(0.92, 0.89, 0.84);
            vec3 raccoonBelly  = mix(bellyBuffRoot, bellyBuffMid, smoothstep(0.15, 0.55, furStrand));
            raccoonBelly       = mix(raccoonBelly, bellyBuffTip, smoothstep(0.55, 0.88, furStrand));

            vec3 col = raccoonCoat;

            if (p.z > 0.08 && p.y < 0.03) {
                float bellyY = clamp((p.y + 0.56) / 0.56, 0.0001, 1.0);
                float maxBellyW = mix(0.18, 0.32, sin(bellyY * 2.8) * 0.48 + 0.52);
                float horizMask = 1.0 - smoothstep(maxBellyW - 0.08, maxBellyW + 0.06, abs(p.x) + furJitter * 1.2);
                float vertMask  = smoothstep(-0.55, -0.38, p.y + furJitter * 0.5) * (1.0 - smoothstep(-0.08, 0.01, p.y));
                float frontMask = smoothstep(0.14, 0.32, p.z + furJitter * 0.5);
                float bellyMask = clamp(horizMask * vertMask * frontMask, 0.0, 1.0);
                col = mix(col, raccoonBelly, bellyMask * 0.92);
            }

            // 2. FATTY RED PANDA HEAD WITH RACCOON COLORATION (p.y > 0.02):
            // Grizzled Raccoon grey-taupe crown, dark charcoal median bridge streak, snowy-white eyebrow arches & fatty cheek pouches, and charcoal-black Raccoon bandit mask!
            float headBlend = smoothstep(0.01, 0.09, p.y);
            if (headBlend > 0.001) {
                // Grizzled Raccoon Grey-Taupe Crown & Upper Head Coat
                vec3 headRoot   = vec3(0.11, 0.10, 0.09);
                vec3 headMid    = vec3(0.42, 0.39, 0.36);
                vec3 headSilver = vec3(0.84, 0.81, 0.76);
                vec3 raccoonHeadCoat = mix(headRoot, headMid, smoothstep(0.14, 0.54, furStrand));
                raccoonHeadCoat      = mix(raccoonHeadCoat, headSilver, smoothstep(0.56, 0.88, furStrand));

                // Snowy-White Raccoon/Panda Facial Fur (eyebrow band, fatty cheek pouches, snout)
                vec3 whiteRoot = vec3(0.68, 0.65, 0.61);
                vec3 whiteMid  = vec3(0.88, 0.86, 0.82);
                vec3 whiteTip  = vec3(0.99, 0.97, 0.94);
                vec3 raccoonWhite = mix(whiteRoot, whiteMid, smoothstep(0.12, 0.50, furStrand));
                raccoonWhite      = mix(raccoonWhite, whiteTip, smoothstep(0.50, 0.86, furStrand));

                // Deep Charcoal-Black Raccoon Bandit Mask & Tear-Track Fur
                vec3 banditRoot = vec3(0.04, 0.04, 0.04);
                vec3 banditMid  = vec3(0.12, 0.11, 0.11);
                vec3 banditTip  = vec3(0.25, 0.23, 0.22);
                vec3 raccoonBandit = mix(banditRoot, banditMid, smoothstep(0.15, 0.60, furStrand));
                raccoonBandit      = mix(raccoonBandit, banditTip, smoothstep(0.65, 0.92, furStrand));

                vec3 headCol = raccoonHeadCoat;

                if (p.z > 0.06) {
                    // A) Snowy-White Raccoon Eyebrow Arches & Red Panda Teardrop Brow Badges above the Bandit Mask
                    vec2 browL = p.xy - vec2(-0.135, 0.348 - pow(max(0.0, abs(p.x) - 0.10), 1.4) * 0.35);
                    vec2 browR = p.xy - vec2( 0.135, 0.348 - pow(max(0.0, abs(p.x) - 0.10), 1.4) * 0.35);
                    float dLBrow = length(browL / vec2(0.115, 0.052));
                    float dRBrow = length(browR / vec2(0.115, 0.052));
                    float browMask = (1.0 - smoothstep(0.55, 1.15, min(dLBrow, dRBrow) + furJitter * 0.8))
                                   * smoothstep(0.16, 0.30, p.z);

                    // B) Big Plump Snowy-White Fatty Red Panda Cheek Pouches
                    float dLCheek = length((p.xy - vec2(-0.285, 0.190)) / vec2(0.168, 0.115));
                    float dRCheek = length((p.xy - vec2( 0.285, 0.190)) / vec2(0.168, 0.115));
                    float cheekMask = (1.0 - smoothstep(0.55, 1.15, min(dLCheek, dRCheek) + furJitter))
                                    * smoothstep(0.08, 0.26, p.z);

                    // C) Snowy-White Snout / Muzzle Bridge
                    float dSnout = length((p.xy - vec2(0.0, 0.158)) / vec2(0.115, 0.078));
                    float snoutMask = (1.0 - smoothstep(0.55, 1.12, dSnout + furJitter * 0.7))
                                    * smoothstep(0.20, 0.35, p.z);

                    float allWhiteMask = clamp(max(browMask, max(cheekMask, snoutMask)), 0.0, 1.0);
                    headCol = mix(headCol, raccoonWhite, allWhiteMask * 0.96);

                    // D) Classic Raccoon Dark Charcoal Median Forehead/Nose-Bridge Streak (between the eyes/brows)
                    float dCenterStreak = length((p.xy - vec2(0.0, 0.31)) / vec2(0.036, 0.115));
                    float streakMask = (1.0 - smoothstep(0.45, 1.10, dCenterStreak + furJitter * 0.6))
                                     * smoothstep(0.20, 0.35, p.z);
                    headCol = mix(headCol, raccoonBandit, streakMask * 0.82);

                    // E) Iconic Raccoon Charcoal-Black Bandit Eye Mask + Red-Panda Tear-Track Sweep
                    vec2 maskL = p.xy - vec2(-0.165, 0.242);
                    vec2 maskR = p.xy - vec2( 0.165, 0.242);
                    maskL.y += (abs(p.x) - 0.155) * 0.18;
                    maskR.y += (abs(p.x) - 0.155) * 0.18;
                    float dLBandit = length(maskL / vec2(0.135, 0.088));
                    float dRBandit = length(maskR / vec2(0.135, 0.088));

                    vec2 tearL = p.xy - vec2(-0.152, 0.192);
                    vec2 tearR = p.xy - vec2( 0.152, 0.192);
                    tearL.x += (p.y - 0.192) * 0.28;
                    tearR.x -= (p.y - 0.192) * 0.28;
                    float dLTear = length(tearL / vec2(0.052, 0.086));
                    float dRTear = length(tearR / vec2(0.052, 0.086));

                    float banditMask = (1.0 - smoothstep(0.52, 1.12, min(min(dLBandit, dRBandit), min(dLTear, dRTear)) + furJitter * 0.7))
                                     * smoothstep(0.16, 0.32, p.z);
                    headCol = mix(headCol, raccoonBandit, banditMask * 0.95);
                }

                col = mix(col, headCol, headBlend);
            }
        `;

        // 1. Base Body Fur Material
        const furMat = new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            bumpMap: furBumpMap,
            bumpScale: 0.028,
            roughness: 0.84,
            metalness: 0.01,
            sheen: 0.94,
            sheenRoughness: 0.50,
            sheenColor: new THREE.Color('#e5e7eb'),
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
                varying vec3 vBodyNorm;
                ${furNoiseFunctionsGLSL}`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                ${sharedFurColorGLSL}
                diffuseColor.rgb = clamp(col * 0.96, 0.0, 1.0);`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_begin>',
                `#include <lights_fragment_begin>
                float rim = clamp(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 0.0001, 1.0);
                diffuseColor.rgb += vec3(0.16, 0.17, 0.19) * pow(rim, 2.5) * 0.48;`
            );
        };

        // 1B. 6-Layer Volumetric 3D Short-Hair Fur Shell Material
        const furShellMat = new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            bumpMap: furBumpMap,
            bumpScale: 0.024,
            roughness: 0.82,
            metalness: 0.01,
            sheen: 0.96,
            sheenRoughness: 0.46,
            sheenColor: new THREE.Color('#f3f4f6'),
            alphaTest: 0.35,
            side: THREE.DoubleSide,
        });
        furShellMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float aShellLayer;
                varying float vShellLayer;
                varying vec3 vBodyPos;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vShellLayer = aShellLayer;
                vBodyPos = position;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying float vShellLayer;
                varying vec3 vBodyPos;
                ${furNoiseFunctionsGLSL}`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                if (vShellLayer > 1.1) discard;
                ${sharedFurColorGLSL}
                if (furShellDensity < vShellLayer * 0.82) discard;
                float tipBright = mix(0.92, 1.14, vShellLayer);
                diffuseColor.rgb = clamp(col * tipBright, 0.0, 1.0);`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_begin>',
                `#include <lights_fragment_begin>
                float rim = clamp(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 0.0001, 1.0);
                diffuseColor.rgb += vec3(0.18, 0.19, 0.22) * pow(rim, 2.3) * 0.52;`
            );
        };

        // Raccoon-Colored Red Panda Ear Materials (Dark Charcoal-Grey Raccoon Back + Snowy-White/Silver Inner Ear Tuft)
        const earOuterMat = new THREE.MeshPhysicalMaterial({
            color: '#262321',
            bumpMap: furBumpMap,
            bumpScale: 0.022,
            roughness: 0.84,
            metalness: 0.01,
            sheen: 0.88,
            sheenRoughness: 0.52,
            sheenColor: new THREE.Color('#cbd5e1'),
        });

        const earInnerMat = new THREE.MeshPhysicalMaterial({
            color: '#f5f2eb',
            bumpMap: furBumpMap,
            bumpScale: 0.024,
            roughness: 0.78,
            metalness: 0.01,
            sheen: 0.94,
            sheenRoughness: 0.46,
            sheenColor: new THREE.Color('#ffffff'),
        });

        // Snowy-White Raccoon/Panda Snout Material
        const muzMat = new THREE.MeshPhysicalMaterial({
            color: '#f6f3ec',
            bumpMap: furBumpMap,
            bumpScale: 0.016,
            roughness: 0.82,
            metalness: 0.01,
            sheen: 0.88,
            sheenRoughness: 0.52,
            sheenColor: new THREE.Color('#ffffff'),
        });

        // Fatty Raccoon Hands & Raccoon Legs Fur Material (Grizzled Raccoon Upper Arm/Thigh -> Charcoal-Black Raccoon Hands/Digits & Feet!)
        const limbMat = new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            bumpMap: furBumpMap,
            bumpScale: 0.024,
            roughness: 0.84,
            metalness: 0.01,
            sheen: 0.88,
            sheenRoughness: 0.52,
            sheenColor: new THREE.Color('#a8a29e'),
        });
        limbMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vLimbPos;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vLimbPos = position;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vLimbPos;
                ${furNoiseFunctionsGLSL}`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float lAng = (abs(vLimbPos.x) + abs(vLimbPos.z) > 0.0001) ? atan(vLimbPos.x, vLimbPos.z) : 0.0;
                vec2 lFur = computeAnimalFur(vec2(lAng * 0.22, -vLimbPos.y * 1.4));
                float fStr = lFur.x;

                // Upper arm / thigh haunch: grizzled raccoon grey-taupe fur
                vec3 upperGrizzle = mix(vec3(0.10, 0.09, 0.09), vec3(0.40, 0.37, 0.34), smoothstep(0.15, 0.55, fStr));
                upperGrizzle      = mix(upperGrizzle, vec3(0.78, 0.75, 0.70), smoothstep(0.55, 0.88, fStr));

                // Raccoon hands, fingers, lower legs & toes: deep charcoal-black raccoon fur with subtle silver guard tips
                vec3 pawDark = mix(vec3(0.05, 0.05, 0.05), vec3(0.15, 0.14, 0.13), smoothstep(0.15, 0.65, fStr));
                pawDark      = mix(pawDark, vec3(0.28, 0.26, 0.25), smoothstep(0.72, 0.95, fStr));

                float upperBlend = smoothstep(-0.042, 0.015, vLimbPos.y);
                diffuseColor.rgb = mix(pawDark, upperGrizzle, upperBlend);`
            );
        };

        const padMat = new THREE.MeshStandardMaterial({
            color: '#2e2428',
            roughness: 0.65,
            metalness: 0.02,
        });

        // 2. Single-Color Silver Metal Mecha Beast Horn Material (1 Unified Silver Metal Color + Machined Mecha Texture & Bevels!)
        const hMat = new THREE.MeshPhysicalMaterial({
            color: '#f1f5f9',
            roughness: 0.22,
            metalness: 0.55,
            clearcoat: 0.90,
            clearcoatRoughness: 0.12,
        });
        hMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vHornPos;
                varying vec3 vHornNorm;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vHornPos = position;
                vHornNorm = normal;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vHornPos;
                varying vec3 vHornNorm;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float ht = clamp(vHornPos.y / 0.32, 0.0, 1.0);
                // 1 Unified Color: Brushed & Polished Silver Metal with Fine Anisotropic Machined Grain
                float brushedGrain = sin(vHornPos.y * 420.0 + vHornPos.x * 80.0) * 0.025
                                   + cos(vHornPos.y * 850.0) * 0.015;
                vec3 silverBase   = vec3(0.84, 0.87, 0.91) + brushedGrain;
                vec3 silverBevel  = vec3(0.98, 0.99, 1.00);
                vec3 silverGroove = vec3(0.50, 0.54, 0.59);

                // Keep the faceted mecha blade bevel texture & machined armor panel seam grooves (all in silver metal!)
                float edgeFactor = smoothstep(0.25, 0.78, abs(normalize(vHornNorm).z)) + smoothstep(0.65, 0.98, ht) * 0.55;
                vec3 silverCol = mix(silverBase, silverBevel, clamp(edgeFactor, 0.0, 1.0));

                float segGroove = abs(fract(ht * 3.5) - 0.5);
                float seamLine  = 1.0 - smoothstep(0.0, 0.052, segGroove);
                float centerChannel = (1.0 - smoothstep(0.004, 0.015, abs(vHornPos.x))) * step(0.08, ht) * step(ht, 0.85);
                float grooveMask = max(seamLine * step(ht, 0.82), centerChannel);

                diffuseColor.rgb = mix(silverCol, silverGroove, grooveMask * 0.85);`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                totalEmissiveRadiance += diffuseColor.rgb * 0.26;`
            );
        };

        const hCollarMat = new THREE.MeshPhysicalMaterial({
            color: '#e2e8f0',
            roughness: 0.24,
            metalness: 0.55,
            clearcoat: 0.82,
            clearcoatRoughness: 0.14,
            emissive: new THREE.Color('#334155'),
            emissiveIntensity: 0.25,
        });

        // 2B. Lush Bushy Fox-Shaped Tail with Authentic Ringed Raccoon Fur Coloration & 3D Volumetric Fur Shells!
        const fTailMat = new THREE.MeshPhysicalMaterial({
            color: '#ffffff',
            bumpMap: furBumpMap,
            bumpScale: 0.028,
            roughness: 0.82,
            metalness: 0.01,
            sheen: 0.94,
            sheenRoughness: 0.48,
            sheenColor: new THREE.Color('#e5e7eb'),
            alphaTest: 0.35,
            side: THREE.DoubleSide,
        });
        fTailMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float aTailShell;
                varying float vTailShell;
                varying vec2 vTailUv;
                varying vec3 vTailNorm;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vTailShell = aTailShell;
                vTailUv = uv;
                vTailNorm = normal;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying float vTailShell;
                varying vec2 vTailUv;
                varying vec3 vTailNorm;
                ${furNoiseFunctionsGLSL}`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float u = clamp(vTailUv.x, 0.0, 1.0); // 0 at base, 1 at tip
                float vAng = vTailUv.y * 6.2831853;

                // Staggered short animal hair fibers flowing toward the tail tip
                vec2 tFur = computeAnimalFur(vec2(vAng * 0.22, u * 1.35));
                float fStrand = tFur.x;
                float tShellMask = tFur.y;

                // Volumetric 3D fur shell discard for outer tail layers (vTailShell > 0.05)
                if (vTailShell > 0.05 && tShellMask < vTailShell * 0.80) discard;

                // Authentic Raccoon Ringed Tail Coloration (6 alternating grizzled silver-taupe & charcoal-black rings + black tip!)
                vec3 lightRingRoot   = vec3(0.14, 0.13, 0.12);
                vec3 lightRingMid    = vec3(0.48, 0.44, 0.40);
                vec3 lightRingSilver = vec3(0.86, 0.83, 0.78);
                vec3 raccoonLightRing = mix(lightRingRoot, lightRingMid, smoothstep(0.14, 0.54, fStrand));
                raccoonLightRing      = mix(raccoonLightRing, lightRingSilver, smoothstep(0.56, 0.88, fStrand));

                vec3 darkRingRoot = vec3(0.04, 0.04, 0.04);
                vec3 darkRingMid  = vec3(0.11, 0.10, 0.10);
                vec3 darkRingTip  = vec3(0.22, 0.20, 0.19);
                vec3 raccoonDarkRing = mix(darkRingRoot, darkRingMid, smoothstep(0.15, 0.60, fStrand));
                raccoonDarkRing      = mix(raccoonDarkRing, darkRingTip, smoothstep(0.65, 0.92, fStrand));

                // Feathered short-hair transitions between the 6 alternating raccoon tail rings + solid dark raccoon tail tip
                float ringJitter = (furValueNoise(vec2(vAng * 4.5, u * 22.0)) - 0.5) * 0.038 + (fStrand - 0.5) * 0.028;
                float ringWave   = sin((u + ringJitter) * 34.0);
                float darkRingMask = smoothstep(-0.12, 0.22, ringWave);
                float blackTipMask = smoothstep(0.78, 0.85, u + ringJitter);
                float finalDarkMask = clamp(max(darkRingMask, blackTipMask), 0.0, 1.0);

                vec3 tailCol = mix(raccoonLightRing, raccoonDarkRing, finalDarkMask);
                float shellTipBright = mix(0.95, 1.12, vTailShell);
                diffuseColor.rgb = clamp(tailCol * shellTipBright, 0.0, 1.0);`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_begin>',
                `#include <lights_fragment_begin>
                float rimT = clamp(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 0.0001, 1.0);
                diffuseColor.rgb += vec3(0.18, 0.19, 0.21) * pow(rimT, 2.4) * 0.50;`
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

        // 4. Open-Front Tattered Cloak Material with Gentle Drapery Motion
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
                float clothWeight = clamp(1.0 - smoothstep(-0.62, -0.12, position.y), 0.0, 1.0);
                if (clothWeight > 0.001) {
                    float cAng = (abs(position.x) + abs(position.z) > 0.0001) ? atan(position.x, position.z) : 0.0;
                    float windRipple = sin(uTime * 3.6 + cAng * 5.0 + position.y * 4.0) * 0.010 * clothWeight;
                    float radialScale = 1.0 + (uFlare * 0.12 + windRipple) * clothWeight;
                    transformed.x *= radialScale;
                    transformed.z *= radialScale;
                    transformed.y += (uFlare * 0.08 + abs(windRipple) * 0.20) * clothWeight;
                    if (position.z < 0.0) {
                        transformed.y += uLiftRear * pow(max(clothWeight, 0.0001), 1.4) * 0.35;
                    }
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
            furShellMaterial: furShellMat,
            redPandaEarOuterMaterial: earOuterMat,
            redPandaEarInnerMaterial: earInnerMat,
            muzzleFurMaterial: muzMat,
            darkLimbFurMaterial: limbMat,
            pawPadMaterial: padMat,
            hornMaterial: hMat,
            hornCollarMaterial: hCollarMat,
            foxTailMaterial: fTailMat,
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

        // Default fatty raccoon arm/hand & leg/foot positions anchored on the front-sides of the Fat Oval Body
        let lArmPos: [number, number, number] = [-0.52, -0.20, 0.37];
        let rArmPos: [number, number, number] = [0.52, -0.20, 0.37];
        let lArmRot: [number, number, number] = [-0.28, 0.52, -0.08];
        let rArmRot: [number, number, number] = [-0.28, -0.52, 0.08];

        let lFootPos: [number, number, number] = [-0.24, -0.55, 0.14];
        let rFootPos: [number, number, number] = [0.24, -0.55, 0.14];
        let lFootRot: [number, number, number] = [0, 0.10, 0];
        let rFootRot: [number, number, number] = [0, -0.10, 0];

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

                lArmPos = [-0.53, -0.10 + jumpPhase * 0.05, 0.38];
                rArmPos = [0.53, -0.08 + (1 - jumpPhase) * 0.05, 0.38];
                lArmRot = [-0.45, 0.25, -1.65 + sideSwing * 0.25];
                rArmRot = [-0.45, -0.25, 1.65 + sideSwing * 0.25];

                lFootPos = [-0.22, -0.54, 0.16];
                rFootPos = [0.24, -0.44 + jumpPhase * 0.06, 0.32];
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

                lArmPos = [-0.53, -0.11, 0.38];
                rArmPos = [0.53, -0.09, 0.38];
                lArmRot = [-0.40, 0.25, -1.45];
                rArmRot = [-0.40, -0.25, 1.55];

                lFootPos = [-0.22, -0.54, 0.14];
                rFootPos = [0.24, -0.45, 0.28];
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

                lArmPos = [-0.46, -0.25, 0.44];
                rArmPos = [0.46, -0.25, 0.44];
                lArmRot = [-0.35, 0.55, -0.06];
                rArmRot = [-0.35, -0.55, 0.06];

                lFootPos = [-0.22, -0.50, 0.36];
                rFootPos = [0.22, -0.50, 0.36];
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

                lArmPos = [-0.54, -0.10, 0.38];
                rArmPos = [0.54, -0.10, 0.38];
                lArmRot = [-0.30, 0.25, -1.35];
                rArmRot = [-0.30, -0.25, 1.35];

                lFootPos = [-0.24, -0.53, 0.16];
                rFootPos = [0.24, -0.50, 0.22];
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

                lArmPos = [-0.52, -0.20, 0.37];
                lArmRot = [-0.28, 0.52, -0.08];
                rArmPos = [0.53, -0.10, 0.39];
                rArmRot = [-0.35, -0.25, 1.95 + wave * 0.35];
                mouthOpen = 0.4;
                capeFlareTarget = 0.12;
                break;
            }

            case 'salute': {
                posY = 0.02;
                scaleY = 1.03;
                headRotX = -0.05;
                rArmPos = [0.46, 0.04, 0.42];
                rArmRot = [-0.55, -0.35, 2.15];
                lArmPos = [-0.52, -0.20, 0.37];
                lArmRot = [-0.28, 0.52, -0.08];
                capeFlareTarget = 0.08;
                break;
            }

            case 'refusing': {
                const shake = Math.sin(t * 15.0);
                posX = shake * 0.03;
                rotY = shake * 0.24;
                headRotY = shake * 0.30;

                lArmPos = [-0.52, -0.12, 0.40];
                rArmPos = [0.52, -0.12, 0.40];
                lArmRot = [-0.45, 0.30, -1.25 + shake * 0.22];
                rArmRot = [-0.45, -0.30, 1.25 + shake * 0.22];

                lFootPos = [-0.22, -0.56, 0.12];
                rFootPos = [0.24, -0.52 + Math.abs(shake) * 0.03, 0.18];

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

                lArmPos = [-0.34, -0.36, 0.54];
                rArmPos = [0.34, -0.36, 0.54];
                lArmRot = [-1.15, 0.22, -0.18];
                rArmRot = [-1.15, -0.22, 0.18];

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

                lArmPos = [-0.24, -0.18, 0.54];
                rArmPos = [0.26, -0.16, 0.54];
                lArmRot = [-0.75, -0.35, 0.35 + swing * 0.55];
                rArmRot = [-0.75, 0.35, -0.35 + swing * 0.55];

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
                rotY = 0.12;
                headRotY = -0.18;
                headRotZ = 0.05;

                lArmPos = [-0.52, -0.15, 0.40];
                lArmRot = [-0.62, 0.38, -0.42 + Math.sin(t * 5.0) * 0.06];
                rArmPos = [0.52, -0.20, 0.37];
                rArmRot = [-0.28, -0.52, 0.08];

                capeFlareTarget = 0.18;
                break;
            }

            case 'clapping': {
                showClapSparks = true;
                const clap = Math.abs(Math.sin(t * 10.0));
                posY = -0.08 + clap * 0.04;
                scaleY = 0.93 + clap * 0.04;
                scaleX = 1.05 - clap * 0.03;

                lArmPos = [-0.18 - clap * 0.12, -0.16, 0.58];
                rArmPos = [0.18 + clap * 0.12, -0.16, 0.58];
                lArmRot = [-0.85, 0.55, 0.55];
                rArmRot = [-0.85, -0.55, -0.55];

                lFootPos = [-0.24, -0.50, 0.36];
                rFootPos = [0.24, -0.50, 0.36];
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

                lArmPos = [-0.52, -0.18, 0.39];
                rArmPos = [0.52, -0.17, 0.40];
                lArmRot = [-0.36, 0.48, -0.14];
                rArmRot = [-0.40, -0.48, 0.18];
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

                lArmPos = [-0.46, -0.17 + Math.sin(t * 5.0) * 0.03, 0.45];
                rArmPos = [0.46, -0.17 + Math.cos(t * 5.0) * 0.03, 0.45];
                lArmRot = [-0.75, 0.35, -0.28];
                rArmRot = [-0.75, -0.35, 0.28];

                lFootPos = [-0.22, -0.50, 0.36];
                rFootPos = [0.22, -0.50, 0.36];
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

                lArmPos = [-0.52, -0.18 + rightLift * 0.04, 0.37 - stride * 0.07];
                rArmPos = [0.52, -0.18 + leftLift * 0.04, 0.37 + stride * 0.07];
                lArmRot = [-0.28 + stride * 0.45, 0.48, -0.10 - bounce * 0.06];
                rArmRot = [-0.28 - stride * 0.45, -0.48, 0.10 + bounce * 0.06];

                lFootPos = [-0.24, -0.56 + leftLift * 0.11, 0.12 + stride * 0.14];
                rFootPos = [0.24, -0.56 + rightLift * 0.11, 0.12 - stride * 0.14];
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
                lArmRot = [-0.28, 0.52, -0.08 - breath * 0.03];
                rArmRot = [-0.28, -0.52, 0.08 + breath * 0.03];
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

        // Keep fatty raccoon arms anchored on the front-sides of the fat oval body in front of the cloak
        const safeLArm: [number, number, number] = [lArmPos[0], lArmPos[1], Math.max(0.30, lArmPos[2])];
        const safeRArm: [number, number, number] = [rArmPos[0], rArmPos[1], Math.max(0.30, rArmPos[2])];

        leftArmRef.current.position.lerp(new THREE.Vector3(...safeLArm), damp);
        rightArmRef.current.position.lerp(new THREE.Vector3(...safeRArm), damp);
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

        if (tailRef.current) {
            const isFastWag =
                state === 'dancing' ||
                state === 'dancing2' ||
                state === 'running' ||
                state === 'waving' ||
                state === 'clapping';
            const isSleepTail = state === 'sleeping' || effectiveExpression === 'sleepy';
            const wagFreq = isFastWag ? 8.5 : isSleepTail ? 1.2 : 3.4;
            const wagAmpY = isFastWag ? 0.34 : isSleepTail ? 0.06 : 0.18;
            const wagAmpX = isFastWag ? 0.14 : isSleepTail ? 0.03 : 0.07;
            tailRef.current.rotation.y = Math.sin(t * wagFreq) * wagAmpY;
            tailRef.current.rotation.x = (isSleepTail ? -0.18 : 0.06) + Math.cos(t * wagFreq * 0.7) * wagAmpX;
            tailRef.current.rotation.z = Math.sin(t * wagFreq) * 0.10;
        }

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
        <group position={[0, ySign > 0 ? -0.048 : -0.044, 0.038]}>
            <mesh position={[0, -0.006 * ySign, 0]} scale={[0.46, 0.36, 0.24]} material={pawPadMaterial}>
                <sphereGeometry args={[0.036, 14, 14]} />
            </mesh>
            <mesh position={[-0.020, 0.014 * ySign, 0.004]} scale={[0.24, 0.28, 0.22]} material={pawPadMaterial}>
                <sphereGeometry args={[0.026, 12, 12]} />
            </mesh>
            <mesh position={[0, 0.020 * ySign, 0.006]} scale={[0.24, 0.28, 0.22]} material={pawPadMaterial}>
                <sphereGeometry args={[0.026, 12, 12]} />
            </mesh>
            <mesh position={[0.020, 0.014 * ySign, 0.004]} scale={[0.24, 0.28, 0.22]} material={pawPadMaterial}>
                <sphereGeometry args={[0.026, 12, 12]} />
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

                {/* 1. Red Panda Head + Fat Raccoon Body + 4-Layer Volumetric 3D Fur Shell Coat */}
                <group ref={bodyGroupRef}>
                    <mesh geometry={bodyGeo} material={furBodyMaterial} castShadow receiveShadow />
                    <mesh geometry={furShellsGeo} material={furShellMaterial} castShadow receiveShadow />

                    {/* Head / Face Feature Group */}
                    <group ref={headLookRef}>
                        {/* Left & Right Fluffy Triangular Red Panda Ears with Raccoon Coloration */}
                        <group position={[-0.33, 0.40, 0.25]} rotation={[0.16, 0.22, 0.48]}>
                            <mesh geometry={redPandaEarOuterGeo} material={redPandaEarOuterMaterial} castShadow />
                            <mesh geometry={redPandaEarInnerGeo} material={redPandaEarInnerMaterial} />
                        </group>
                        <group position={[0.33, 0.40, 0.25]} rotation={[0.16, -0.22, -0.48]}>
                            <mesh geometry={redPandaEarOuterGeo} material={redPandaEarOuterMaterial} castShadow />
                            <mesh geometry={redPandaEarInnerGeo} material={redPandaEarInnerMaterial} />
                        </group>

                        {/* Conical Silver Metal Mecha Beast Horn + Conical Socket Collar at Top of Forehead */}
                        <group position={[0, 0.425, 0.335]} rotation={[0.60, 0, 0]}>
                            <mesh geometry={hornCollarGeo} material={hornCollarMaterial} castShadow />
                            <mesh geometry={hornGeo} material={hornMaterial} castShadow />
                        </group>

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

                        {/* Cute Red Panda Snowy-White Snout, Nose & Gentle Upward Mouth (ω) */}
                        <group position={[0, 0.165, 0.448]}>
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
                            {/* Left & Right Upward-Curving Mouth (ω) */}
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

                    {/* 2. V-Draped Neck Scarf + Prominent Jagged Chest V-Mantle + Open-Front Sculpted Tattered Cloak */}
                    <group ref={scarfRef}>
                        <mesh geometry={scarfCoilsGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                        <mesh geometry={frontApronGeo} material={hoodScarfMaterial} castShadow receiveShadow />
                        <mesh geometry={cloakGeo} material={cloakTatterMaterial} castShadow receiveShadow />
                    </group>

                    {/* 2B. Lush Bushy Fox-Shaped Tail with Ringed Raccoon Coloration */}
                    <group ref={tailRef} position={[0, -0.38, -0.30]}>
                        <mesh geometry={foxTailGeo} material={foxTailMaterial} castShadow receiveShadow />
                    </group>
                </group>

                {/* 3. Fatty Raccoon Arms & Hands with 5 Sculpted Raccoon Digits */}
                <group ref={leftArmRef} position={[-0.52, -0.20, 0.37]} rotation={[-0.28, 0.52, -0.08]}>
                    <mesh geometry={pawGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(1)}
                    <mesh ref={leftPawRingRef} visible={false} position={[0, -0.06, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.13, 0.009, 10, 32]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.95} toneMapped={false} />
                    </mesh>
                </group>

                <group ref={rightArmRef} position={[0.52, -0.20, 0.37]} rotation={[-0.28, -0.52, 0.08]}>
                    <mesh geometry={pawGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(1)}
                    <mesh ref={rightPawRingRef} visible={false} position={[0, -0.06, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.13, 0.009, 10, 32]} />
                        <meshBasicMaterial color="#00e5ff" transparent opacity={0.95} toneMapped={false} />
                    </mesh>
                </group>

                {/* 4. Fatty Raccoon Legs & Feet with Drumstick Haunches & 4 Sculpted Raccoon Toes */}
                <group ref={leftFootRef} position={[-0.24, -0.55, 0.14]}>
                    <mesh geometry={footGeo} material={darkLimbFurMaterial} castShadow />
                    {renderPawPads(-1)}
                </group>

                <group ref={rightFootRef} position={[0.24, -0.55, 0.14]}>
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
