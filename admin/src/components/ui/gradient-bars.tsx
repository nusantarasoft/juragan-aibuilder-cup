'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GradientBarsProps {
    className?: string;
    barCount?: number;
}

export function GradientBars({ className, barCount = 5 }: GradientBarsProps) {
    return (
        <div className={cn('flex gap-1', className)}>
            {Array.from({ length: barCount }).map((_, i) => (
                <motion.div
                    key={i}
                    className="w-2 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full"
                    initial={{ height: 10 }}
                    animate={{ height: [10, 40, 10] }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                    }}
                />
            ))}
        </div>
    );
}

export default GradientBars;
