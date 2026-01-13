// @ts-nocheck
"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const SpotlightNew = ({
    className,
    fill = "white",
}: {
    className?: string;
    fill?: string;
}) => {
    return (
        <div className={cn("absolute inset-0 overflow-hidden", className)}>
            {/* Left spotlight */}
            <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute -left-40 -top-40 h-[500px] w-[500px]"
            >
                <div
                    className="h-full w-full rounded-full blur-3xl"
                    style={{
                        background: `radial-gradient(circle, ${fill}20 0%, transparent 70%)`,
                    }}
                />
            </motion.div>

            {/* Right spotlight */}
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className="absolute -right-40 -top-40 h-[500px] w-[500px]"
            >
                <div
                    className="h-full w-full rounded-full blur-3xl"
                    style={{
                        background: `radial-gradient(circle, ${fill}20 0%, transparent 70%)`,
                    }}
                />
            </motion.div>

            {/* Center spotlight */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2"
            >
                <div
                    className="h-full w-full rounded-full blur-3xl"
                    style={{
                        background: `radial-gradient(ellipse, ${fill}15 0%, transparent 60%)`,
                    }}
                />
            </motion.div>
        </div>
    );
};
