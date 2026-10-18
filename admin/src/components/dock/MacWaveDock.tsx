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
            className="aos-dock font-mono"
            style={{
                display: 'flex',
                flexDirection: isHorizontal ? 'row' : 'column',
                alignItems: isHorizontal ? 'center' : 'center',
                gap: 4,
                background: vo.glassFaint,
                backdropFilter: vo.blur,
                WebkitBackdropFilter: vo.blur,
                height: isHorizontal ? 48 : undefined,
                width: isHorizontal ? undefined : 42,
                padding: isHorizontal ? '6px 8px' : '8px 6px',
                borderRadius: 0,
                border: `1px solid ${vo.borderStrong}`,
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

    // Crisp Agentic OS tile sizing
    const baseSize = direction === "horizontal" ? 36 : 30;
    const maxSize = direction === "horizontal" ? 50 : 42;
    const iconBaseSize = direction === "horizontal" ? 17 : 14;
    const iconMaxSize = direction === "horizontal" ? 24 : 20;

    const sizeTransform = useTransform(distance, [-120, 0, 120], [baseSize, maxSize, baseSize]);
    const iconSizeTransform = useTransform(distance, [-120, 0, 120], [iconBaseSize, iconMaxSize, iconBaseSize]);

    const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 180, damping: 14 });
    const iconSize = useSpring(iconSizeTransform, { mass: 0.1, stiffness: 180, damping: 14 });

    const [isHovered, setIsHovered] = useState(false);

    return (
        <Tooltip title={<span className="font-mono text-[10px] uppercase tracking-[0.16em]">{item.label}</span>} placement={direction === "vertical" ? "right" : "top"}>
            <motion.div
                ref={ref}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    width: size,
                    height: size,
                    border: `1px solid ${isOpen ? vo.selectedBorder : isHovered ? vo.borderStrong : vo.border}`,
                    background: isOpen ? vo.selectedBg : isHovered ? vo.hoverBg : 'transparent',
                }}
                className="relative flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
                <motion.span
                    style={{
                        fontSize: iconSize,
                        lineHeight: 1,
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
                            ? { bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 2 }
                            : { right: -4, top: '50%', transform: 'translateY(-50%)', width: 2, height: 12 }),
                        background: vo.accent,
                    }} />
                )}
            </motion.div>
        </Tooltip>
    );
}
