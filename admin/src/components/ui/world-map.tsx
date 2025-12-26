"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const WorldMap = ({
    dots = [],
    lineColor = "#0ea5e9",
    className,
}: {
    dots?: { start: { lat: number; lng: number }; end: { lat: number; lng: number } }[];
    lineColor?: string;
    className?: string;
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (svgRef.current) {
            const { width, height } = svgRef.current.getBoundingClientRect();
            setDimensions({ width, height });
        }
    }, []);

    // Convert lat/lng to x/y coordinates on the map
    const projectPoint = (lat: number, lng: number) => {
        const x = ((lng + 180) * (dimensions.width / 360));
        const latRad = (lat * Math.PI) / 180;
        const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        const y = dimensions.height / 2 - (dimensions.width * mercN) / (2 * Math.PI);
        return { x, y };
    };

    return (
        <div className={cn("w-full aspect-[2/1] relative", className)}>
            <svg
                ref={svgRef}
                viewBox="0 0 800 400"
                className="w-full h-full bg-neutral-950"
                style={{ background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)" }}
            >
                {/* World map outline - simplified */}
                <path
                    d="M100,200 Q200,150 300,180 T500,160 T700,200 M150,220 Q250,280 400,250 T600,260 M50,180 Q100,120 200,140 T350,130 M450,180 Q550,140 650,170 M80,240 Q180,300 280,270 M520,220 Q620,280 720,250"
                    fill="none"
                    stroke="#333"
                    strokeWidth="1"
                    opacity="0.5"
                />

                {/* Grid lines */}
                {[...Array(8)].map((_, i) => (
                    <line
                        key={`h-${i}`}
                        x1="0"
                        y1={50 * (i + 1)}
                        x2="800"
                        y2={50 * (i + 1)}
                        stroke="#222"
                        strokeWidth="0.5"
                    />
                ))}
                {[...Array(16)].map((_, i) => (
                    <line
                        key={`v-${i}`}
                        x1={50 * (i + 1)}
                        y1="0"
                        x2={50 * (i + 1)}
                        y2="400"
                        stroke="#222"
                        strokeWidth="0.5"
                    />
                ))}

                {/* Dots and lines */}
                {dots.map((connection, idx) => {
                    const start = projectPoint(connection.start.lat, connection.start.lng);
                    const end = projectPoint(connection.end.lat, connection.end.lng);

                    return (
                        <g key={idx}>
                            {/* Connection line */}
                            <motion.path
                                d={`M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 50} ${end.x} ${end.y}`}
                                fill="none"
                                stroke={lineColor}
                                strokeWidth="2"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.8 }}
                                transition={{
                                    duration: 1.5,
                                    delay: idx * 0.2,
                                    ease: "easeInOut",
                                }}
                            />

                            {/* Start dot */}
                            <motion.circle
                                cx={start.x}
                                cy={start.y}
                                r="4"
                                fill={lineColor}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.2 }}
                            />

                            {/* End dot */}
                            <motion.circle
                                cx={end.x}
                                cy={end.y}
                                r="4"
                                fill={lineColor}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.2 + 1 }}
                            />

                            {/* Pulse effect on dots */}
                            <motion.circle
                                cx={start.x}
                                cy={start.y}
                                r="4"
                                fill="none"
                                stroke={lineColor}
                                strokeWidth="2"
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: idx * 0.2,
                                }}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// Default demo data
export const worldMapDemoData = [
    { start: { lat: 40.7128, lng: -74.0060 }, end: { lat: 51.5074, lng: -0.1278 } }, // NYC to London
    { start: { lat: 51.5074, lng: -0.1278 }, end: { lat: 35.6762, lng: 139.6503 } }, // London to Tokyo
    { start: { lat: 35.6762, lng: 139.6503 }, end: { lat: -33.8688, lng: 151.2093 } }, // Tokyo to Sydney
    { start: { lat: 37.7749, lng: -122.4194 }, end: { lat: 22.3193, lng: 114.1694 } }, // SF to HK
];
