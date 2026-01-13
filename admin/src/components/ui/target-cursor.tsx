'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TargetCursorProps {
    children?: React.ReactNode;
    className?: string;
    spinDuration?: number;
    hideDefaultCursor?: boolean;
    parallaxOn?: boolean;
}

export function TargetCursor({ children, className }: TargetCursorProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className={cn('relative', className)}>
            <motion.div
                className="pointer-events-none fixed z-50 w-8 h-8 border-2 border-purple-500 rounded-full"
                animate={{ x: position.x - 16, y: position.y - 16 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            />
            {children}
        </div>
    );
}

export default TargetCursor;
