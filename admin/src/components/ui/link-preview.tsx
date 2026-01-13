// @ts-nocheck
"use client";
import Image from "next/image";
import React from "react";
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
} from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LinkPreviewProps = {
    children: React.ReactNode;
    url: string;
    className?: string;
    width?: number;
    height?: number;
    imageSrc?: string;
};

export const LinkPreview = ({
    children,
    url,
    className,
    width = 200,
    height = 125,
    imageSrc,
}: LinkPreviewProps) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const springConfig = { stiffness: 100, damping: 15 };
    const x = useMotionValue(0);

    const translateX = useSpring(x, springConfig);

    const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
        const targetRect = event.currentTarget.getBoundingClientRect();
        const eventOffsetX = event.clientX - targetRect.left;
        const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;
        x.set(offsetFromCenter);
    };

    return (
        <div className="relative inline-block">
            <Link
                href={url}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onMouseMove={handleMouseMove}
                className={cn("text-blue-500 hover:text-blue-600 underline", className)}
            >
                {children}
            </Link>

            <AnimatePresence>
                {isOpen && imageSrc && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.6 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                            },
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.6 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 shadow-xl rounded-xl z-50"
                        style={{
                            x: translateX,
                        }}
                    >
                        <div className="block p-1 bg-white border-2 border-transparent shadow rounded-xl hover:border-neutral-200 dark:hover:border-neutral-800">
                            <Image
                                src={imageSrc}
                                width={width}
                                height={height}
                                className="rounded-lg"
                                alt="preview image"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
