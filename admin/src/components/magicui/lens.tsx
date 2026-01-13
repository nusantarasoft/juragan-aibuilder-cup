// @ts-nocheck
"use client";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const Lens = ({
    children,
    zoomFactor = 2,
    lensSize = 150,
    className,
}: {
    children: React.ReactNode;
    zoomFactor?: number;
    lensSize?: number;
    className?: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden cursor-none", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            {children}

            {isHovered && (
                <motion.div
                    className="absolute pointer-events-none rounded-full border-2 border-white/50 shadow-lg overflow-hidden"
                    style={{
                        width: lensSize,
                        height: lensSize,
                        left: position.x - lensSize / 2,
                        top: position.y - lensSize / 2,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                >
                    <div
                        className="absolute"
                        style={{
                            transform: `scale(${zoomFactor})`,
                            transformOrigin: `${position.x}px ${position.y}px`,
                            left: -position.x + lensSize / 2,
                            top: -position.y + lensSize / 2,
                        }}
                    >
                        {children}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export const LensImage = ({
    src,
    alt,
    zoomFactor = 2,
    lensSize = 150,
    className,
}: {
    src: string;
    alt: string;
    zoomFactor?: number;
    lensSize?: number;
    className?: string;
}) => {
    return (
        <Lens zoomFactor={zoomFactor} lensSize={lensSize} className={className}>
            <Image src={src} alt={alt} fill className="object-cover" />
        </Lens>
    );
};

export const PointerHighlight = ({
    children,
    className,
    highlightColor = "#8b5cf6",
}: {
    children: React.ReactNode;
    className?: string;
    highlightColor?: string;
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={ref}
            className={cn("relative", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            {isHovered && (
                <motion.div
                    className="absolute pointer-events-none"
                    style={{
                        left: position.x,
                        top: position.y,
                        transform: "translate(-50%, -50%)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <div
                        className="w-8 h-8 rounded-full blur-xl"
                        style={{ backgroundColor: highlightColor }}
                    />
                </motion.div>
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
};
