"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";

export const StickyBanner = ({
    children,
    className,
    dismissible = true,
}: {
    children: React.ReactNode;
    className?: string;
    dismissible?: boolean;
}) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                        "fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white py-3 px-4",
                        className
                    )}
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center relative">
                        <div className="text-center text-sm font-medium">{children}</div>
                        {dismissible && (
                            <button
                                onClick={() => setIsVisible(false)}
                                className="absolute right-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <IconX className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
