'use client';
import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface VelocityScrollProps {
    text: string;
    className?: string;
    default_velocity?: number;
}

export function VelocityScroll({ text, className, default_velocity = 5 }: VelocityScrollProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref });
    const x = useTransform(scrollYProgress, [0, 1], [0, -1000]);

    return (
        <div ref={ref} className={cn('overflow-hidden', className)}>
            <motion.div style={{ x }} className="flex whitespace-nowrap">
                <span className="mr-4">{text}</span>
                <span className="mr-4">{text}</span>
                <span className="mr-4">{text}</span>
            </motion.div>
        </div>
    );
}

export default VelocityScroll;
