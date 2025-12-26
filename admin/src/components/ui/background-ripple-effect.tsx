"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
    className,
    gridSize = 20,
    rippleColor = "#6366f1",
}: {
    className?: string;
    gridSize?: number;
    rippleColor?: string;
}) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 1000);
    };

    const rows = gridSize;
    const cols = gridSize;

    return (
        <div
            className={cn("relative w-full h-full overflow-hidden", className)}
            onClick={handleClick}
        >
            <div
                className="grid gap-1"
                style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
            >
                {Array.from({ length: rows * cols }).map((_, idx) => (
                    <div
                        key={idx}
                        className="aspect-square bg-neutral-800/20 rounded-sm transition-all duration-300 hover:bg-neutral-700/30"
                    />
                ))}
            </div>

            {ripples.map((ripple) => (
                <motion.div
                    key={ripple.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        backgroundColor: rippleColor,
                    }}
                    initial={{ width: 0, height: 0, opacity: 0.5, x: 0, y: 0 }}
                    animate={{
                        width: 400,
                        height: 400,
                        opacity: 0,
                        x: -200,
                        y: -200,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            ))}
        </div>
    );
};
