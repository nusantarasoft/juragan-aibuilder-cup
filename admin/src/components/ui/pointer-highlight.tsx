'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PointerHighlightProps {
    children: React.ReactNode;
    className?: string;
}

export function PointerHighlight({ children, className }: PointerHighlightProps) {
    return (
        <motion.div
            className={cn('relative', className)}
            whileHover={{ scale: 1.02 }}
        >
            {children}
        </motion.div>
    );
}

export default PointerHighlight;
