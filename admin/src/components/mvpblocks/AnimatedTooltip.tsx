'use client';

import React, { ReactNode } from 'react';
import { Tooltip } from 'antd';

interface TooltipWrapperProps {
    content: ReactNode;
    children: ReactNode;
    className?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Preserved for backward compatibility; Ant Tooltip renders via portal automatically */
    usePortal?: boolean;
}

/**
 * TooltipWrapper (AnimatedTooltip) — Tactical HUD Tooltip
 * Uses Ant Design's collision-aware portal positioning (`rc-tooltip`) styled
 * globally via CMSLayoutGlobalStyles to match the Agentic OS / Virtual Office HUD.
 */
export function TooltipWrapper({
    content,
    children,
    className = '',
    position = 'bottom',
}: TooltipWrapperProps) {
    if (!content) {
        return <>{children}</>;
    }

    return (
        <Tooltip
            title={content}
            placement={position}
            mouseEnterDelay={0.12}
            mouseLeaveDelay={0.05}
            destroyOnHidden
        >
            <span className={`inline-flex items-center ${className}`.trim()}>
                {children}
            </span>
        </Tooltip>
    );
}

export default TooltipWrapper;
