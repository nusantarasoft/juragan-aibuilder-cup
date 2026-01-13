// @ts-nocheck
"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const NoiseBackground = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-teal-900/50">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20"
                    animate={{
                        backgroundPosition: ["0% 0%", "100% 100%"],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        repeatType: "reverse",
                    }}
                />
            </div>

            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

export const DottedGlowBackground = ({
    className,
    children,
    glowColor = "#8b5cf6",
}: {
    className?: string;
    children?: React.ReactNode;
    glowColor?: string;
}) => {
    return (
        <div className={cn("relative overflow-hidden bg-neutral-950", className)}>
            {/* Dotted pattern */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at center, ${glowColor}40 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                }}
            />

            {/* Glow effect */}
            <motion.div
                className="absolute inset-0"
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ backgroundColor: `${glowColor}20` }}
                />
            </motion.div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
};
