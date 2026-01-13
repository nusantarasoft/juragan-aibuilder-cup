// @ts-nocheck
"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export const ImageCarousel = ({
    items,
    className,
    autoPlay = false,
    autoPlayInterval = 5000,
}: {
    items: { src: string; alt: string; title?: string; description?: string }[];
    className?: string;
    autoPlay?: boolean;
    autoPlayInterval?: number;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!autoPlay) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, autoPlayInterval);
        return () => clearInterval(interval);
    }, [autoPlay, autoPlayInterval, items.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    return (
        <div className={cn("relative overflow-hidden rounded-xl", className)}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="relative aspect-video"
                >
                    <Image
                        src={items[currentIndex].src}
                        alt={items[currentIndex].alt}
                        fill
                        className="object-cover"
                    />
                    {(items[currentIndex].title || items[currentIndex].description) && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            {items[currentIndex].title && (
                                <h3 className="text-white font-bold text-lg">
                                    {items[currentIndex].title}
                                </h3>
                            )}
                            {items[currentIndex].description && (
                                <p className="text-white/80 text-sm">
                                    {items[currentIndex].description}
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
                <IconChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
                <IconChevronRight className="w-5 h-5" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {items.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            idx === currentIndex
                                ? "bg-white w-4"
                                : "bg-white/50 hover:bg-white/70"
                        )}
                    />
                ))}
            </div>
        </div>
    );
};
