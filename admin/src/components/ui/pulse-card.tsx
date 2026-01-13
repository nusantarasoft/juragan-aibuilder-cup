'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardHoverEffectProps {
    icon?: ReactNode;
    title?: string;
    description?: string;
    variant?: string;
    glowEffect?: boolean;
    size?: string;
    className?: string;
    items?: {
        title: string;
        description: string;
        link: string;
    }[];
}

export function CardHoverEffect({
    icon,
    title,
    description,
    variant = 'default',
    glowEffect = false,
    size = 'md',
    className,
    items = []
}: CardHoverEffectProps) {
    // If items array is provided, render grid of items
    if (items.length > 0) {
        return (
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
                {items.map((item, idx) => (
                    <motion.a
                        key={idx}
                        href={item.link}
                        className="relative group block p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
                        whileHover={{ scale: 1.02 }}
                    >
                        <h4 className="font-bold">{item.title}</h4>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                    </motion.a>
                ))}
            </div>
        );
    }

    // Single card mode
    return (
        <motion.div
            className={cn(
                'relative group p-6 rounded-xl border bg-card transition-all',
                glowEffect && 'hover:shadow-lg hover:shadow-purple-500/20',
                size === 'sm' && 'p-4',
                size === 'lg' && 'p-8',
                className
            )}
            whileHover={{ scale: 1.02 }}
        >
            {icon && <div className="mb-4">{icon}</div>}
            {title && <h4 className="font-bold text-lg">{title}</h4>}
            {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </motion.div>
    );
}

export default CardHoverEffect;
