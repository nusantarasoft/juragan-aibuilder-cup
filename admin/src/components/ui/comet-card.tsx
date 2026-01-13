// @ts-nocheck
"use client";
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export const CometCard = ({
    children,
    className,
    containerClassName,
}: {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xSpring = useSpring(x, { stiffness: 150, damping: 15 });
    const ySpring = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(ySpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const xPos = (e.clientX - rect.left) / rect.width - 0.5;
        const yPos = (e.clientY - rect.top) / rect.height - 0.5;
        x.set(xPos);
        y.set(yPos);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className={cn(
                "relative rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-px",
                containerClassName
            )}
        >
            {/* Comet trail effect */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute -inset-[100%] bg-gradient-conic from-purple-500 via-transparent to-transparent opacity-20 animate-spin-slow" />
            </div>

            <div
                className={cn(
                    "relative rounded-xl bg-neutral-950 p-6",
                    className
                )}
                style={{ transform: "translateZ(50px)" }}
            >
                {children}
            </div>
        </motion.div>
    );
};
