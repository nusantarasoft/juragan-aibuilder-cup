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
    defaultWidth = 320,
    minWidth = 240,
    maxWidth = 480,
    minHeight = 200,
    maxHeight = 600,
    showHeader = true,
}: FloatingPanelProps) {
    const { token } = theme.useToken();
    const [width, setWidth] = useState(defaultWidth);
    const [height, setHeight] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // Detect dark mode
    const isDarkMode = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';

    // Handle resize for docked mode
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !panelRef.current) return;
            const rect = panelRef.current.getBoundingClientRect();
            let newWidth: number;
            if (dockPosition === "right") {
                newWidth = rect.right - e.clientX;
            } else {
                newWidth = e.clientX - rect.left;
            }
            setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
        };

        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, dockPosition, minWidth, maxWidth]);

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

    // Header gradient (works in both modes)
    const headerGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

    // Get position styles based on dock mode
    const getPositionStyles = (): React.CSSProperties => {
        if (dockPosition === "left") {
            return {
                position: "fixed",
                left: 0,
                top: 64,
                bottom: 0,
                width: minimized ? 48 : width,
                zIndex: 1000,
            };
        }
        if (dockPosition === "right") {
            return {
                position: "fixed",
                right: 0,
                top: 64,
                bottom: 0,
                width: minimized ? 48 : width,
                zIndex: 1000,
            };
        }
        // Float mode
        return {
            position: "fixed",
            zIndex: 1001,
            width: minimized ? 48 : width,
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
                borderRadius: dockPosition === "float" ? 12 : 0,
                boxShadow: dockPosition === "float"
                    ? "0 8px 32px rgba(0,0,0,0.15)"
                    : isDarkMode ? "2px 0 12px rgba(0,0,0,0.3)" : "2px 0 8px rgba(0,0,0,0.06)",
                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: isResizing ? "none" : "width 0.2s ease, height 0.2s ease",
            }}
        >
            {/* Header - Always shows with glassmorphism */}
            {showHeader && (
                <div
                    style={{
                        padding: minimized ? "12px 8px" : "12px 16px",
                        background: headerGradient,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: minimized ? "center" : "space-between",
                        gap: 8,
                        cursor: dockPosition === "float" ? "move" : "default",
                        userSelect: "none",
                        flexShrink: 0,
                    }}
                    onPointerDown={(e) => dockPosition === "float" && dragControls.start(e)}
                >
                    {minimized ? (
                        <Tooltip title={`${title} (Click to expand)`} placement={dockPosition === "left" ? "right" : "left"}>
                            <Button
                                type="text"
                                size="small"
                                icon={icon}
                                onClick={handleMinimizeToggle}
                                style={{ color: "#fff", fontSize: 16 }}
                            />
                        </Tooltip>
                    ) : (
                        <>
                            <Space size={8}>
                                <span style={{ fontSize: 14 }}>{icon}</span>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
                            </Space>
                            <Space size={2}>
                                {/* Dock Left */}
                                <Tooltip title="Dock Left">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<VerticalRightOutlined />}
                                        onClick={() => onDockChange("left")}
                                        style={{
                                            color: dockPosition === "left" ? "#fff" : "rgba(255,255,255,0.6)",
                                            background: dockPosition === "left" ? "rgba(255,255,255,0.2)" : "transparent",
                                        }}
                                    />
                                </Tooltip>
                                {/* Float */}
                                <Tooltip title="Float">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<DragOutlined />}
                                        onClick={() => onDockChange("float")}
                                        style={{
                                            color: dockPosition === "float" ? "#fff" : "rgba(255,255,255,0.6)",
                                            background: dockPosition === "float" ? "rgba(255,255,255,0.2)" : "transparent",
                                        }}
                                    />
                                </Tooltip>
                                {/* Dock Right */}
                                <Tooltip title="Dock Right">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<VerticalLeftOutlined />}
                                        onClick={() => onDockChange("right")}
                                        style={{
                                            color: dockPosition === "right" ? "#fff" : "rgba(255,255,255,0.6)",
                                            background: dockPosition === "right" ? "rgba(255,255,255,0.2)" : "transparent",
                                        }}
                                    />
                                </Tooltip>
                                {/* Minimize/Expand */}
                                <Tooltip title={minimized ? "Expand" : "Minimize"}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={minimized ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                        onClick={handleMinimizeToggle}
                                        style={{ color: "#fff" }}
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

            {/* Resize Handle - only for docked mode */}
            {!minimized && dockPosition !== "float" && (
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: "col-resize",
                        background: isResizing ? "rgba(102, 126, 234, 0.3)" : "transparent",
                        ...(dockPosition === "left" ? { right: 0 } : { left: 0 }),
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(102, 126, 234, 0.2)")}
                    onMouseLeave={(e) => {
                        if (!isResizing) e.currentTarget.style.background = "transparent";
                    }}
                />
            )}
        </div>
    );

    // Float mode with drag constraints
    if (dockPosition === "float") {
        return (
            <motion.div
                drag
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={{
                    left: 20,
                    right: window.innerWidth - width - 20,
                    top: 80,
                    bottom: window.innerHeight - height - 20,
                }}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    position: "fixed",
                    bottom: id === "structure" ? 20 : undefined,
                    top: id === "library" ? 80 : undefined,
                    left: id === "library" ? 20 : undefined,
                    right: id === "structure" ? 20 : undefined,
                }}
            >
                {panelContent}
            </motion.div>
        );
    }

    return panelContent;
}

export default FloatingPanel;
