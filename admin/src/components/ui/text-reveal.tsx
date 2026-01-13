'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface TextRevealProps {
    text?: string;
    children?: ReactNode;
    className?: string;
    from?: string;
    split?: string;
    blur?: number;
    delay?: number;
    duration?: number;
}

export function TextReveal({
    text,
    children,
    className,
    from = 'bottom',
    split = 'char',
    blur = 0,
    delay = 0,
    duration = 0.5
}: TextRevealProps) {
    const content = children || text || '';

    return (
        <motion.div
            className={cn('relative', className)}
            initial={{
                opacity: 0,
                y: from === 'bottom' ? 20 : from === 'top' ? -20 : 0,
                filter: blur > 0 ? `blur(${blur}px)` : 'none'
            }}
            whileInView={{
                opacity: 1,
                y: 0,
                filter: 'blur(0px)'
            }}
            viewport={{ once: true }}
            transition={{ duration, delay }}
        >
            <span>{content}</span>
        </motion.div>
    );
}

export default TextReveal;
