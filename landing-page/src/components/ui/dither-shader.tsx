"use client";
import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Dither patterns for different styles
const ditherPatterns = {
    bayer2x2: [
        [0, 2],
        [3, 1],
    ],
    bayer4x4: [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ],
    ordered: [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ],
};

export const DitherShader = ({
    src,
    alt = "Dithered image",
    pattern = "bayer4x4",
    colorCount = 4,
    className,
}: {
    src: string;
    alt?: string;
    pattern?: keyof typeof ditherPatterns;
    colorCount?: number;
    className?: string;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
    const [isProcessed, setIsProcessed] = useState(false);

    useEffect(() => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            setDimensions({ width: img.width, height: img.height });
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            const matrix = ditherPatterns[pattern];
            const matrixSize = matrix.length;

            // Apply ordered dithering
            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const idx = (y * img.width + x) * 4;

                    // Get grayscale value
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

                    // Get threshold from dither matrix
                    const threshold = (matrix[y % matrixSize][x % matrixSize] / 16) * 255;

                    // Quantize based on color count
                    const quantized = gray > threshold ? 255 : 0;

                    // Apply with slight color tinting for retro effect
                    data[idx] = quantized * 0.9; // R - slight purple tint
                    data[idx + 1] = quantized * 0.85; // G
                    data[idx + 2] = quantized; // B
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setIsProcessed(true);
        };

        img.src = src;
    }, [src, pattern, colorCount]);

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{
                    imageRendering: "pixelated",
                    opacity: isProcessed ? 1 : 0,
                    transition: "opacity 0.3s",
                }}
            />
            {!isProcessed && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                    <div className="animate-pulse text-neutral-400">Processing...</div>
                </div>
            )}
        </div>
    );
};

// CSS-only dither effect (no canvas required)
export const CssDither = ({
    children,
    intensity = 0.5,
    className,
}: {
    children: React.ReactNode;
    intensity?: number;
    className?: string;
}) => {
    return (
        <div className={cn("relative", className)}>
            {children}
            {/* Noise overlay for dither effect */}
            <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                style={{
                    opacity: intensity,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
            {/* Scanlines for retro effect */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: intensity * 0.3,
                    backgroundImage: "linear-gradient(transparent 50%, rgba(0,0,0,0.1) 50%)",
                    backgroundSize: "100% 4px",
                }}
            />
        </div>
    );
};
