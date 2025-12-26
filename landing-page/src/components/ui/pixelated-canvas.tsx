"use client";
import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const PixelatedCanvas = ({
    src,
    alt = "Pixelated image",
    pixelSize = 10,
    className,
}: {
    src: string;
    alt?: string;
    pixelSize?: number;
    className?: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Original image (shown on hover area) */}
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                onLoad={() => setImageLoaded(true)}
            />

            {/* Pixelated overlay */}
            {imageLoaded && (
                <div
                    className="absolute inset-0 transition-opacity duration-300"
                    style={{
                        opacity: isHovered ? 0.9 : 1,
                        backgroundImage: `url(${src})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        imageRendering: "pixelated",
                        filter: `blur(0px)`,
                    }}
                >
                    {/* Grid pattern overlay for pixelated effect */}
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
                            backgroundSize: `${pixelSize}px ${pixelSize}px`,
                        }}
                    />
                </div>
            )}

            {/* Hover reveal circle */}
            {isHovered && (
                <div
                    className="absolute pointer-events-none rounded-full overflow-hidden"
                    style={{
                        width: 150,
                        height: 150,
                        left: mousePos.x - 75,
                        top: mousePos.y - 75,
                        boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                    }}
                >
                    <div
                        className="absolute w-full h-full"
                        style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: `${containerRef.current?.offsetWidth || 400}px ${containerRef.current?.offsetHeight || 300}px`,
                            backgroundPosition: `-${mousePos.x - 75}px -${mousePos.y - 75}px`,
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export const PixelGrid = ({
    rows = 20,
    cols = 20,
    className,
}: {
    rows?: number;
    cols?: number;
    className?: string;
}) => {
    const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

    return (
        <div
            className={cn("grid gap-0.5", className)}
            style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
        >
            {Array.from({ length: rows * cols }).map((_, idx) => {
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                const distance = hoveredCell
                    ? Math.sqrt(Math.pow(row - hoveredCell.row, 2) + Math.pow(col - hoveredCell.col, 2))
                    : Infinity;
                const opacity = hoveredCell ? Math.max(0.1, 1 - distance / 8) : 0.3;

                return (
                    <div
                        key={idx}
                        className="aspect-square transition-all duration-150"
                        style={{
                            backgroundColor: `rgba(139, 92, 246, ${opacity})`,
                        }}
                        onMouseEnter={() => setHoveredCell({ row, col })}
                        onMouseLeave={() => setHoveredCell(null)}
                    />
                );
            })}
        </div>
    );
};
