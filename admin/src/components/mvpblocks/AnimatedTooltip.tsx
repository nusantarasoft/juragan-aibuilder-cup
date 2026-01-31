'use client';
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from 'framer-motion';
import { useState, ReactNode, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipWrapperProps {
    content: ReactNode;
    children: ReactNode;
    className?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Use portal to render tooltip at document body level (for fixed-position parents) */
    usePortal?: boolean;
}

// Position classes for tooltip placement (relative mode)
const positionClasses = {
    top: '-top-12 left-1/2 -translate-x-1/2',
    bottom: '-bottom-12 left-1/2 -translate-x-1/2',
    left: 'top-1/2 -translate-y-1/2 right-full mr-2',
    right: 'top-1/2 -translate-y-1/2 left-full ml-2',
};

/**
 * TooltipWrapper - Based on MVP Blocks interactive-tooltip
 * Uses spring physics for smooth, interactive animations
 * Supports portal mode for fixed-position parent elements
 */
export default function TooltipWrapper({
    content,
    children,
    className = '',
    position = 'top',
    usePortal = false,
}: TooltipWrapperProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [portalPosition, setPortalPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const springConfig = { stiffness: 100, damping: 5 };
    const x = useMotionValue(0);

    // Rotate the tooltip based on mouse position
    const rotate = useSpring(
        useTransform(x, [-100, 100], [-45, 45]),
        springConfig,
    );
    // Translate the tooltip
    const translateX = useSpring(
        useTransform(x, [-100, 100], [-50, 50]),
        springConfig,
    );

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        const halfWidth = target.offsetWidth / 2;
        x.set(event.nativeEvent.offsetX - halfWidth);
    };

    // Calculate portal position when hovering and using portal mode
    useEffect(() => {
        if (usePortal && isHovered && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let posX = 0, posY = 0;

            switch (position) {
                case 'top':
                    posX = rect.left + rect.width / 2;
                    posY = rect.top - 12;
                    break;
                case 'bottom':
                    posX = rect.left + rect.width / 2;
                    posY = rect.bottom + 12;
                    break;
                case 'left':
                    posX = rect.left - 8;
                    posY = rect.top + rect.height / 2;
                    break;
                case 'right':
                    posX = rect.right + 8;
                    posY = rect.top + rect.height / 2;
                    break;
            }

            setPortalPosition({ x: posX, y: posY });
        }
    }, [isHovered, usePortal, position]);

    // Common tooltip content
    const tooltipContent = (
        <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 20 : position === 'bottom' ? -20 : 0, scale: 0.6 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                    type: 'spring',
                    stiffness: 260,
                    damping: 10,
                },
            }}
            exit={{ opacity: 0, y: position === 'top' ? 20 : position === 'bottom' ? -20 : 0, scale: 0.6 }}
            style={usePortal ? {
                position: 'fixed',
                left: portalPosition.x,
                top: portalPosition.y,
                transform: position === 'top' ? 'translate(-50%, -100%)' :
                    position === 'bottom' ? 'translate(-50%, 0)' :
                        position === 'left' ? 'translate(-100%, -50%)' :
                            'translate(0, -50%)',
                whiteSpace: 'nowrap',
                zIndex: 99999,
            } : {
                translateX: position === 'top' || position === 'bottom' ? translateX : undefined,
                rotate: rotate,
                whiteSpace: 'nowrap',
            }}
            className={usePortal
                ? `bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center rounded-lg px-4 py-2 text-xs shadow-xl backdrop-blur-sm pointer-events-none`
                : `bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 absolute ${positionClasses[position]} z-[9999] flex flex-col items-center justify-center rounded-lg px-4 py-2 text-xs shadow-xl backdrop-blur-sm pointer-events-none`
            }
        >
            {/* Gradient overlay */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-purple-500/5 via-transparent to-purple-500/5" />

            {/* Bottom accent lines - purple gradient */}
            <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
            <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

            {/* Content */}
            <div className="relative z-30 text-zinc-800 dark:text-zinc-100 text-sm font-medium">
                {content}
            </div>
        </motion.div>
    );

    return (
        <div
            ref={triggerRef}
            className={`group relative inline-block ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            <AnimatePresence mode="popLayout">
                {isHovered && (
                    usePortal && typeof document !== 'undefined'
                        ? createPortal(tooltipContent, document.body)
                        : tooltipContent
                )}
            </AnimatePresence>
            {children}
        </div>
    );
}

export { TooltipWrapper };
