"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import { Button, Space, Tooltip, theme } from "antd";
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    VerticalLeftOutlined,
    VerticalRightOutlined,
    DragOutlined,
} from "@ant-design/icons";

export type DockPosition = "left" | "right" | "float";

interface FloatingPanelProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    dockPosition: DockPosition;
    onDockChange: (pos: DockPosition) => void;
    minimized: boolean;
    onMinimizedChange: (v: boolean) => void;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showHeader?: boolean;
    dragConstraintsRef?: any;
}

export function FloatingPanel({
    id,
    title,
    icon,
    children,
    dockPosition,
    onDockChange,
    minimized,
    onMinimizedChange,
    defaultWidth = 280,
    minWidth = 240,
    maxWidth = 480,
    minHeight = 200,
    maxHeight = 600,
    showHeader = true,
    dragConstraintsRef,
}: FloatingPanelProps) {
    const { token } = theme.useToken();
    const [height, setHeight] = useState(400);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // Detect dark mode
    const isDarkMode = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';

    const effectiveDockPosition = minimized ? "float" : dockPosition;

    // Handle drag end to detect dock zones
    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const point = info.point;
        const viewportWidth = window.innerWidth;
        const dockThreshold = 80; // pixels from edge to trigger dock

        if (point.x < dockThreshold) {
            onDockChange("left");
        } else if (point.x > viewportWidth - dockThreshold) {
            onDockChange("right");
        }
        // Update position for next time
        setPosition({ x: info.offset.x, y: info.offset.y });
    }, [onDockChange]);

    // Glassmorphism styles
    const glassStyle: React.CSSProperties = {
        background: isDarkMode
            ? "rgba(30, 30, 30, 0.85)"
            : "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
    };

    // Get position styles based on dock mode
    const getPositionStyles = (): React.CSSProperties => {
        if (effectiveDockPosition === "left") {
            return {
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: minimized ? 48 : defaultWidth,
                zIndex: 1000,
            };
        }
        if (effectiveDockPosition === "right") {
            return {
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: minimized ? 48 : defaultWidth,
                zIndex: 1000,
            };
        }
        // Float mode
        return {
            position: "absolute",
            zIndex: 1001,
            width: minimized ? 48 : defaultWidth,
            height: minimized ? 48 : height,
            maxHeight: maxHeight,
            minHeight: minHeight,
        };
    };

    // Toggle minimize - ensure it works both ways
    const handleMinimizeToggle = () => {
        onMinimizedChange(!minimized);
    };

    const panelContent = (
        <div
            ref={panelRef}
            style={{
                ...getPositionStyles(),
                ...glassStyle,
                borderRadius: effectiveDockPosition === "float" ? 12 : 8,
                boxShadow: effectiveDockPosition === "float"
                    ? "0 8px 32px rgba(0,0,0,0.15)"
                    : "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: "width 0.2s ease, height 0.2s ease",
            }}
        >
            {/* Header - Always shows with glassmorphism */}
            {showHeader && (
                <div
                    style={{
                        padding: minimized ? "0 8px" : "0 12px",
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                        height: 40,
                        minHeight: 40,
                        color: isDarkMode ? '#e5e7eb' : '#374151',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: minimized ? "center" : "space-between",
                        gap: 8,
                        cursor: effectiveDockPosition === "float" ? "move" : "default",
                        userSelect: "none",
                        flexShrink: 0,
                    }}
                    onPointerDown={(e) => effectiveDockPosition === "float" && dragControls.start(e)}
                >
                    {minimized ? (
                        <Tooltip title={`${title} (Click to expand)`} placement={effectiveDockPosition === "left" ? "right" : "left"}>
                            <Button
                                type="text"
                                size="small"
                                icon={icon}
                                onClick={handleMinimizeToggle}
                                className="text-gray-400 hover:text-violet-500 w-7 h-7 flex items-center justify-center p-0"
                            />
                        </Tooltip>
                    ) : (
                        <>
                            <Space size={8}>
                                <span style={{ fontSize: 14 }} className="text-violet-500">{icon}</span>
                                <span style={{
                                    background: 'linear-gradient(to right, var(--theme-color, #8b5cf6), #6366f1)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 600,
                                    fontSize: '14px'
                                }}>{title}</span>
                            </Space>
                            <Space size={2}>
                                {/* Dock Left */}
                                <Tooltip title="Dock Left">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<VerticalRightOutlined />}
                                        onClick={() => onDockChange("left")}
                                        className={dockPosition === "left" ? "text-violet-500 bg-violet-50 dark:bg-violet-900/20 w-6 h-6 flex items-center justify-center p-0" : "text-gray-400 hover:text-violet-500 w-6 h-6 flex items-center justify-center p-0"}
                                    />
                                </Tooltip>
                                {/* Float */}
                                <Tooltip title="Float">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<DragOutlined />}
                                        onClick={() => onDockChange("float")}
                                        className={dockPosition === "float" ? "text-violet-500 bg-violet-50 dark:bg-violet-900/20 w-6 h-6 flex items-center justify-center p-0" : "text-gray-400 hover:text-violet-500 w-6 h-6 flex items-center justify-center p-0"}
                                    />
                                </Tooltip>
                                {/* Dock Right */}
                                <Tooltip title="Dock Right">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<VerticalLeftOutlined />}
                                        onClick={() => onDockChange("right")}
                                        className={dockPosition === "right" ? "text-violet-500 bg-violet-50 dark:bg-violet-900/20 w-6 h-6 flex items-center justify-center p-0" : "text-gray-400 hover:text-violet-500 w-6 h-6 flex items-center justify-center p-0"}
                                    />
                                </Tooltip>
                                {/* Minimize/Expand */}
                                <Tooltip title={minimized ? "Expand" : "Minimize"}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={minimized ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                        onClick={handleMinimizeToggle}
                                        className="text-gray-400 hover:text-violet-500 w-6 h-6 flex items-center justify-center p-0"
                                    />
                                </Tooltip>
                            </Space>
                        </>
                    )}
                </div>
            )}

            {/* Body - with glassmorphism background */}
            {!minimized && (
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        background: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );

    // Float mode with drag constraints
    if (effectiveDockPosition === "float") {
        return (
            <motion.div
                drag
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={dragConstraintsRef || {
                    left: 0,
                    right: typeof window !== 'undefined' ? window.innerWidth - defaultWidth - 300 : 800,
                    top: 0,
                    bottom: typeof window !== 'undefined' ? window.innerHeight - height - 120 : 600,
                }}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    position: "absolute",
                    top: 20,
                    left: id === "library" ? 20 : 'calc(100% - 300px)',
                    right: undefined,
                }}
            >
                {panelContent}
            </motion.div>
        );
    }

    return panelContent;
}

export default FloatingPanel;
