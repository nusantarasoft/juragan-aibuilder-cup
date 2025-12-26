"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const ContainerTextFlip = ({
    words,
    className,
    textClassName,
}: {
    words: string[];
    className?: string;
    textClassName?: string;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % words.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={currentIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={cn("inline-block", textClassName)}
                >
                    {words[currentIndex]}
                </motion.span>
            </AnimatePresence>
        </div>
    );
};

export const LayoutTextFlip = ({
    words,
    className,
    prefix,
    suffix,
}: {
    words: string[];
    className?: string;
    prefix?: string;
    suffix?: string;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [width, setWidth] = useState<number | "auto">("auto");
    const measureRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % words.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [words.length]);

    useEffect(() => {
        if (measureRef.current) {
            setWidth(measureRef.current.offsetWidth);
        }
    }, [currentIndex, words]);

    return (
        <span className={cn("inline-flex items-baseline", className)}>
            {prefix && <span>{prefix}</span>}
            <motion.span
                animate={{ width }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="inline-block overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    <motion.span
                        key={currentIndex}
                        ref={measureRef}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="inline-block whitespace-nowrap"
                    >
                        {words[currentIndex]}
                    </motion.span>
                </AnimatePresence>
            </motion.span>
            {suffix && <span>{suffix}</span>}
        </span>
    );
};
