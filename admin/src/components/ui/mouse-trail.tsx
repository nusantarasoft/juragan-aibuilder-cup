'use client';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, RefObject } from 'react';

interface MagicTrailProps {
    containerRef?: RefObject<HTMLDivElement | null>;
    className?: string;
    trailLength?: number;
    trailColor?: string;
    colors?: string[];
    particleCount?: number;
    decay?: number;
    smoothing?: number;
}

export function MagicTrail({
    containerRef,
    className,
    trailLength = 10,
    trailColor = '#8b5cf6',
    colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'],
    particleCount = 50,
    decay = 0.03,
    smoothing = 0.65
}: MagicTrailProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 500, damping: 28 });
    const springY = useSpring(mouseY, { stiffness: 500, damping: 28 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const container = containerRef?.current;
            if (container) {
                const rect = container.getBoundingClientRect();
                mouseX.set(e.clientX - rect.left);
                mouseY.set(e.clientY - rect.top);
            } else {
                mouseX.set(e.clientX);
                mouseY.set(e.clientY);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [containerRef, mouseX, mouseY]);

    const primaryColor = colors[0] || trailColor;

    return (
        <motion.div
            className={cn('pointer-events-none fixed z-50', className)}
            style={{
                x: springX,
                y: springY,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: primaryColor,
                opacity: 0.6,
            }}
        />
    );
}

export default MagicTrail;
