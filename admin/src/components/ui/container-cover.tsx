"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const ContainerCover = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-neutral-950 py-20",
                className
            )}
        >
            {/* Background beams */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px]">
                    <motion.div
                        animate={{
                            rotate: 360,
                        }}
                        transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        className="absolute inset-0"
                    >
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-1/2 left-1/2 h-0.5 w-1/2 origin-left bg-gradient-to-r from-purple-500/50 via-violet-500/20 to-transparent"
                                style={{
                                    transform: `rotate(${i * 30}deg)`,
                                }}
                            />
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/30 blur-[120px]" />
            </div>

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "50px 50px",
                }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

export const CoverTitle = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <h2
            className={cn(
                "text-4xl md:text-6xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400",
                className
            )}
        >
            {children}
        </h2>
    );
};

export const CoverDescription = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <p
            className={cn(
                "text-neutral-400 text-center max-w-2xl mx-auto mt-4",
                className
            )}
        >
            {children}
        </p>
    );
};
