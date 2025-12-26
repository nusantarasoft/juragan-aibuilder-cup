"use client";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Simplified GitHub Globe without Three.js dependency
// Uses CSS 3D transforms to create a globe-like effect

export const GitHubGlobe = ({
    className,
    arcsData = [],
}: {
    className?: string;
    arcsData?: { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[];
}) => {
    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
                {/* Globe container */}
                <div
                    className="absolute inset-0 rounded-full animate-spin-slow"
                    style={{
                        animationDuration: "30s",
                        background: "radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a15 50%, #050510 100%)",
                        boxShadow: "inset -20px -20px 60px rgba(0,0,0,0.8), inset 20px 20px 60px rgba(50,50,100,0.3)",
                    }}
                >
                    {/* Grid lines */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        {/* Latitude lines */}
                        {[20, 40, 60, 80].map((y, i) => (
                            <ellipse
                                key={`lat-${i}`}
                                cx="50"
                                cy="50"
                                rx={40 - Math.abs(y - 50) * 0.3}
                                ry={(y - 50) * 0.5 + 5}
                                fill="none"
                                stroke="rgba(100, 100, 255, 0.15)"
                                strokeWidth="0.3"
                                transform={`translate(0, ${(y - 50) * 0.6})`}
                            />
                        ))}
                        {/* Longitude lines */}
                        {[0, 30, 60, 90, 120, 150].map((angle, i) => (
                            <ellipse
                                key={`lon-${i}`}
                                cx="50"
                                cy="50"
                                rx="40"
                                ry="15"
                                fill="none"
                                stroke="rgba(100, 100, 255, 0.15)"
                                strokeWidth="0.3"
                                transform={`rotate(${angle} 50 50)`}
                            />
                        ))}
                    </svg>

                    {/* Dots representing cities/connections */}
                    <div className="absolute inset-0">
                        {[
                            { x: "30%", y: "40%", size: 3 },
                            { x: "60%", y: "35%", size: 4 },
                            { x: "45%", y: "55%", size: 3 },
                            { x: "70%", y: "45%", size: 2 },
                            { x: "25%", y: "60%", size: 3 },
                            { x: "55%", y: "65%", size: 2 },
                        ].map((dot, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-cyan-400 animate-pulse"
                                style={{
                                    left: dot.x,
                                    top: dot.y,
                                    width: dot.size,
                                    height: dot.size,
                                    animationDelay: `${i * 0.3}s`,
                                    boxShadow: "0 0 8px rgba(34, 211, 238, 0.8)",
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Glow effect */}
                <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background: "radial-gradient(circle at 50% 50%, rgba(100, 100, 255, 0.1) 0%, transparent 70%)",
                    }}
                />

                {/* Arcs (simplified as curved lines) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                    {arcsData.slice(0, 5).map((arc, i) => (
                        <path
                            key={i}
                            d={`M ${30 + i * 10} ${40 + i * 5} Q ${50} ${20 + i * 10} ${70 - i * 5} ${45 + i * 3}`}
                            fill="none"
                            stroke={arc.color || "#22d3ee"}
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            opacity="0.6"
                        >
                            <animate
                                attributeName="stroke-dashoffset"
                                from="100"
                                to="0"
                                dur={`${2 + i * 0.5}s`}
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="stroke-dasharray"
                                values="0 100;50 50;0 100"
                                dur={`${2 + i * 0.5}s`}
                                repeatCount="indefinite"
                            />
                        </path>
                    ))}
                </svg>
            </div>
        </div>
    );
};

export const globeConfig = {
    pointSize: 4,
    globeColor: "#1d072e",
    showAtmosphere: true,
    atmosphereColor: "#ffffff",
    atmosphereAltitude: 0.1,
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    polygonColor: "rgba(255,255,255,0.7)",
    arcTime: 1000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
};

// Demo data for arcs
export const sampleArcs = [
    { startLat: 40.7128, startLng: -74.006, endLat: 51.5074, endLng: -0.1278, color: "#06b6d4" },
    { startLat: 35.6762, startLng: 139.6503, endLat: -33.8688, endLng: 151.2093, color: "#8b5cf6" },
    { startLat: 37.7749, startLng: -122.4194, endLat: 22.3193, endLng: 114.1694, color: "#22c55e" },
];
