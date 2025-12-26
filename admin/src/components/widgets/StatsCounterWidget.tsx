"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";

interface CounterItem {
    label: string;
    value: number;
    suffix?: string;
    prefix?: string;
}

interface StatsCounterProps {
    items?: CounterItem[];
    duration?: number;
}

const defaultItems: CounterItem[] = [
    { label: "Users", value: 10000, suffix: "+" },
    { label: "Projects", value: 500, suffix: "+" },
    { label: "Countries", value: 50, suffix: "" },
    { label: "Awards", value: 25, suffix: "" },
];

const AnimatedNumber = ({
    value,
    duration = 2,
    prefix = "",
    suffix = ""
}: {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
}) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView) return;

        let start = 0;
        const end = value;
        const incrementTime = (duration * 1000) / end;
        const step = Math.max(1, Math.floor(end / 100));

        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, incrementTime * step);

        return () => clearInterval(timer);
    }, [value, duration, isInView]);

    return (
        <span ref={ref}>
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
};

export default function StatsCounterWidget({
    items = defaultItems,
    duration = 2
}: StatsCounterProps) {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {items.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="text-center"
                        >
                            <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                                <AnimatedNumber
                                    value={item.value}
                                    duration={duration}
                                    prefix={item.prefix}
                                    suffix={item.suffix}
                                />
                            </div>
                            <div className="text-blue-100 text-lg">
                                {item.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
