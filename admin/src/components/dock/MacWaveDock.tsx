"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Tooltip } from "antd";
import { getVOTheme } from '../layout/voTheme';

interface DockItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    width: number;
    height: number;
}

interface MacWaveDockProps {
    items: readonly DockItem[];
    direction?: "horizontal" | "vertical";
    darkMode?: boolean;
    onItemClick: (id: string, label: string, width: number, height: number) => void;
    dockWindows: any[];
}

export const MacWaveDock: React.FC<MacWaveDockProps> = ({
    items,
    direction = "horizontal",
    darkMode = false,
    onItemClick,
    dockWindows,
}) => {
    const mousePos = useMotionValue(Infinity);
    const isHorizontal = direction === "horizontal";
    const vo = getVOTheme(darkMode);

    return (
        <motion.div
            onMouseMove={(e) => mousePos.set(isHorizontal ? e.pageX : e.pageY)}
            onMouseLeave={() => mousePos.set(Infinity)}
            style={{
                display: 'flex',
                flexDirection: isHorizontal ? 'row' : 'column',
                alignItems: isHorizontal ? 'flex-end' : 'flex-start',
                gap: 4,
                background: vo.glassFaint,
                backdropFilter: vo.blur,
                WebkitBackdropFilter: vo.blur,
                // Fix the cross-axis size so the container doesn't "wave", only the icons do
                height: isHorizontal ? 60 : undefined,
                width: isHorizontal ? undefined : 48,
                padding: isHorizontal ? '0 12px 8px 12px' : '16px 6px 16px 6px',
                borderRadius: isHorizontal ? '24px 24px 0 0' : 24,
                border: `1px solid ${vo.border}`,
                boxShadow: vo.shadow,
                zIndex: 50,
            }}
        >
            {items.map((item) => (
                <DockIcon
                    key={item.id}
                    item={item}
                    mousePos={mousePos}
                    direction={direction}
                    isOpen={dockWindows.some(w => w.widgetType === item.id)}
                    onClick={() => onItemClick(item.id, item.label, item.width, item.height)}
                    darkMode={darkMode}
                />
            ))}
        </motion.div>
    );
};

function DockIcon({
    item,
    mousePos,
    direction,
    isOpen,
    onClick,
    darkMode = false,
}: {
    item: DockItem;
    mousePos: any;
    direction: "horizontal" | "vertical";
    isOpen: boolean;
    onClick: () => void;
    darkMode?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const vo = getVOTheme(darkMode);

    const distance = useTransform(mousePos, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
        if (direction === "horizontal") {
            return val - bounds.x - bounds.width / 2;
        } else {
            return val - bounds.y - bounds.height / 2;
        }
    });

    // Define sizing based on direction (left dock is smaller)
    const baseSize = direction === "horizontal" ? 44 : 36;
    const maxSize = direction === "horizontal" ? 80 : 64;
    const iconBaseSize = direction === "horizontal" ? 24 : 18;
    const iconMaxSize = direction === "horizontal" ? 48 : 36;

    const sizeTransform = useTransform(distance, [-150, 0, 150], [baseSize, maxSize, baseSize]);
    const iconSizeTransform = useTransform(distance, [-150, 0, 150], [iconBaseSize, iconMaxSize, iconBaseSize]);

    const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });
    const iconSize = useSpring(iconSizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });

    const [isHovered, setIsHovered] = useState(false);

    return (
        <Tooltip title={item.label} placement={direction === "vertical" ? "right" : "top"}>
            <motion.div
                ref={ref}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    width: size,
                    height: size,
                }}
                className="relative flex items-center justify-center rounded-2xl cursor-pointer transition-colors duration-200"
            >
                {/* Background hover effect */}
                {isHovered && (
                    <motion.div
                        layoutId={`dock-hover-${direction}`}
                        style={{ background: vo.hoverBg }}
                        className="absolute inset-0 rounded-2xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
                
                <motion.span
                    style={{
                        fontSize: iconSize,
                        lineHeight: 1,
                        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.25))',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}
                >
                    {item.icon}
                </motion.span>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        ...(direction === "horizontal" 
                            ? { bottom: -6, left: '50%', transform: 'translateX(-50%)' }
                            : { right: -6, top: '50%', transform: 'translateY(-50%)' }),
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: vo.accent,
                        boxShadow: `0 0 8px ${vo.accent}`,
                    }} />
                )}
            </motion.div>
        </Tooltip>
    );
}
