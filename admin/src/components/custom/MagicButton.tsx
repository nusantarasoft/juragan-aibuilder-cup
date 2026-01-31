"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface MagicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
    size?: "default" | "large";
}

export const MagicButton: React.FC<MagicButtonProps> = ({
    children,
    className = "",
    icon,
    size = "default",
    disabled,
    ...props
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const contentWidth = size === "large" ? 130 : 76;
    const padding = size === "large" ? "px-5" : "px-4";
    // Button height is h-9 = 36px. Circle is 24px. 
    // To center vertically: (36 - 24) / 2 = 6px from top
    const circleTop = 6;
    const circleLeft = size === "large" ? 18 : 14;
    // Text offset: more for large size
    const textOffset = size === "large" ? 20 : 14;
    // Using same distance from right edge as left icon from left edge
    const circleRight = circleLeft;

    // Muted gradient for disabled state
    const borderGradient = disabled
        ? "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, #9ca3af 300deg, #6b7280 330deg, #4b5563 345deg, #9ca3af 360deg)"
        : "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, #00ffff 300deg, #ff00ff 330deg, #9333ea 345deg, #00ffff 360deg)";

    return (
        <div className={`relative inline-block ${disabled ? "opacity-60" : ""}`}>
            {/* Outer wrapper for beam effect - masked to show only border */}
            <span
                className="absolute inset-[-1.5px] rounded-full pointer-events-none overflow-hidden"
                style={{
                    zIndex: 0,
                    // Mask creates a ring by making center transparent
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: "1.5px", // This controls border thickness
                }}
            >
                <span
                    className="absolute inset-[-200%]"
                    style={{
                        background: borderGradient,
                        animation: "spin 3s linear infinite",
                    }}
                />
            </span>

            <motion.button
                whileTap={disabled ? {} : { scale: 0.98 }}
                onMouseEnter={() => !disabled && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={disabled}
                className={`
                    group relative inline-flex h-9 items-center justify-center 
                    rounded-full ${padding} text-xs font-medium
                    ${disabled ? "cursor-not-allowed" : "cursor-pointer"} overflow-hidden
                    bg-white dark:bg-[#1a1b23]
                    shadow-[0_4px_14px_rgba(147,51,234,0.15),0_2px_6px_rgba(0,0,0,0.08)]
                    dark:shadow-[0_4px_14px_rgba(147,51,234,0.4),0_2px_6px_rgba(0,0,0,0.2)]
                    ${className}
                `}
                {...props as any}
            >
                {/* Expanding circle - animates from icon size to fill button */}
                <motion.span
                    className="absolute rounded-full"
                    style={{
                        background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 30%, #6366f1 60%, #00ffff 100%)",
                        zIndex: 1,
                    }}
                    initial={{
                        left: circleLeft,
                        top: circleTop,
                        width: 24,
                        height: 24,
                    }}
                    animate={isHovered ? {
                        left: -50,
                        top: -50,
                        width: 300,
                        height: 300,
                    } : {
                        left: circleLeft,
                        top: circleTop,
                        width: 24,
                        height: 24,
                    }}
                    transition={{
                        duration: 0.4,
                        ease: "easeOut",
                    }}
                />

                {/* Shimmer effect */}
                <span
                    className="absolute inset-0 overflow-hidden rounded-full pointer-events-none transition-opacity duration-300"
                    style={{
                        zIndex: 2,
                        opacity: isHovered ? 1 : 0,
                    }}
                >
                    <span
                        className="absolute inset-0"
                        style={{
                            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 80%)",
                            animation: "shimmer-move 2s ease-in-out infinite",
                        }}
                    />
                </span>

                {/* Left Icon - Positioned exactly at circle center */}
                <motion.span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                        left: circleLeft,
                        top: circleTop,
                        width: 24,
                        height: 24,
                        zIndex: 20
                    }}
                    animate={isHovered ? { opacity: 0, scale: 0.75 } : { opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="text-white text-xs flex items-center justify-center">{icon}</span>
                </motion.span>

                {/* Right Icon - Same vertical position as left icon */}
                <motion.span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                        right: circleRight,
                        top: circleTop,
                        width: 24,
                        height: 24,
                        zIndex: 20
                    }}
                    animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <span className="text-white text-xs flex items-center justify-center">{icon}</span>
                </motion.span>

                {/* Content Text */}
                <span className="relative flex items-center justify-center" style={{ width: contentWidth, zIndex: 10 }}>
                    <motion.span
                        className="font-semibold whitespace-nowrap"
                        animate={isHovered ? { x: -8, color: "#ffffff" } : { x: textOffset, color: "#7c3aed" }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        {children}
                    </motion.span>
                </span>
            </motion.button>
        </div>
    );
};
