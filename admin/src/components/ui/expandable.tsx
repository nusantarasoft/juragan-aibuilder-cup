'use client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ExpandableContextType {
    isExpanded: boolean;
    toggle: () => void;
}

const ExpandableContext = createContext<ExpandableContextType | null>(null);

function useExpandable() {
    const context = useContext(ExpandableContext);
    if (!context) throw new Error('useExpandable must be used within Expandable');
    return context;
}

interface ExpandableProps {
    children: ReactNode | ((props: { isExpanded: boolean }) => ReactNode);
    className?: string;
    defaultExpanded?: boolean;
    initialDelay?: number;
    expandDirection?: 'vertical' | 'horizontal' | 'both';
    expandBehavior?: 'push' | 'replace';
}

export function Expandable({ children, className, defaultExpanded = false, initialDelay = 0, expandDirection = 'vertical', expandBehavior = 'push' }: ExpandableProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const toggle = () => setIsExpanded(!isExpanded);

    const renderChildren = () => {
        if (typeof children === 'function') {
            return children({ isExpanded });
        }
        return children;
    };

    return (
        <ExpandableContext.Provider value={{ isExpanded, toggle }}>
            <div className={cn('relative', className)}>{renderChildren()}</div>
        </ExpandableContext.Provider>
    );
}

interface ExpandableTriggerProps {
    children: ReactNode;
    className?: string;
}

export function ExpandableTrigger({ children, className }: ExpandableTriggerProps) {
    const { toggle } = useExpandable();
    return (
        <div onClick={toggle} className={cn('cursor-pointer', className)}>
            {children}
        </div>
    );
}

interface AnimationConfig {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    transition?: Record<string, unknown>;
}

interface ExpandableContentProps {
    children: ReactNode;
    className?: string;
    preset?: string;
    stagger?: boolean;
    staggerChildren?: number;
    keepMounted?: boolean;
    animateIn?: AnimationConfig;
    animateOut?: AnimationConfig;
}

export function ExpandableContent({
    children,
    className,
    preset,
    stagger,
    staggerChildren,
    keepMounted = false,
    animateIn,
    animateOut
}: ExpandableContentProps) {
    const { isExpanded } = useExpandable();

    return (
        <AnimatePresence>
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={cn('overflow-hidden', className)}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface ExpandableCardProps extends ExpandableProps {
    collapsedSize?: { width: number; height: number };
    expandedSize?: { width: number; height: number };
    hoverToExpand?: boolean;
    expandDelay?: number;
    collapseDelay?: number;
}

export function ExpandableCard({
    children,
    className,
    defaultExpanded,
    collapsedSize,
    expandedSize,
    hoverToExpand = false,
    expandDelay = 0,
    collapseDelay = 0,
    ...rest
}: ExpandableCardProps) {
    return (
        <Expandable defaultExpanded={defaultExpanded} className={cn('rounded-lg border p-4', className)} {...rest}>
            {children}
        </Expandable>
    );
}

interface ExpandableCardSectionProps {
    children: ReactNode;
    className?: string;
}

export function ExpandableCardHeader({ children, className }: ExpandableCardSectionProps) {
    return <div className={cn('font-semibold', className)}>{children}</div>;
}

export function ExpandableCardContent({ children, className }: ExpandableCardSectionProps) {
    return <div className={cn('py-2', className)}>{children}</div>;
}

export function ExpandableCardFooter({ children, className }: ExpandableCardSectionProps) {
    return <div className={cn('pt-2 border-t', className)}>{children}</div>;
}

export default Expandable;
