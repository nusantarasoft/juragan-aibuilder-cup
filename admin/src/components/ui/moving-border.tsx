// @ts-nocheck
"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const MovingBorder = ({
    children,
    duration = 2000,
    rx,
    ry,
    ...otherProps
}: {
    children: React.ReactNode;
    duration?: number;
    rx?: string;
    ry?: string;
    [key: string]: unknown;
}) => {
    return (
        <div
            {...otherProps}
            style={{
                position: "relative",
            }}
            className="relative overflow-hidden"
        >
            <div
                className="absolute inset-0"
                style={{ borderRadius: rx || "16px" }}
            >
                <MovingBorderCore duration={duration} rx={rx} ry={ry} />
            </div>
            {children}
        </div>
    );
};

const MovingBorderCore = ({
    duration = 2000,
    rx,
    ry,
}: {
    duration?: number;
    rx?: string;
    ry?: string;
}) => {
    const pathRef = React.useRef<SVGRectElement>(null);

    return (
        <svg
            className="absolute w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <rect
                ref={pathRef}
                x="0"
                y="0"
                width="100"
                height="100"
                rx={rx || "8"}
                ry={ry || "8"}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="2"
                strokeDasharray="30 70"
                className="animate-border-rotate"
            />
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="var(--theme-color, #8b5cf6)" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export const Button = ({
    borderRadius = "1.75rem",
    children,
    as: Component = "button",
    containerClassName,
    borderClassName,
    duration,
    className,
    ...otherProps
}: {
    borderRadius?: string;
    children: React.ReactNode;
    as?: React.ElementType;
    containerClassName?: string;
    borderClassName?: string;
    duration?: number;
    className?: string;
    [key: string]: unknown;
}) => {
    return (
        <Component
            className={cn(
                "bg-transparent relative text-xl h-16 w-40 p-[1px] overflow-hidden ",
                containerClassName
            )}
            style={{
                borderRadius: borderRadius,
            }}
            {...otherProps}
        >
            <div
                className="absolute inset-0"
                style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
            >
                <MovingBorder duration={duration} rx={borderRadius} ry={borderRadius}>
                    <div
                        className={cn(
                            "h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--sky-500)_40%,transparent_60%)]",
                            borderClassName
                        )}
                    />
                </MovingBorder>
            </div>

            <div
                className={cn(
                    "relative bg-slate-900/[0.8] border border-slate-800 backdrop-blur-xl text-white flex items-center justify-center w-full h-full text-sm antialiased",
                    className
                )}
                style={{
                    borderRadius: `calc(${borderRadius} * 0.96)`,
                }}
            >
                {children}
            </div>
        </Component>
    );
};
