"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripHorizontal, GripVertical, Minus } from "lucide-react";
import { getVOTheme, type VOTheme } from "../layout/voTheme";

export interface DockItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    width: number;
    height: number;
    color?: string;
    code?: string;
    group?: string;
    badge?: number | string;
    hint?: string;
}

interface MacWaveDockProps {
    items: readonly DockItem[];
    direction?: "horizontal" | "vertical";
    darkMode?: boolean;
    title?: string;
    accentColor?: string;
    onItemClick: (id: string, label: string, width: number, height: number) => void;
    onMinimizeAll?: () => void;
    dockWindows: any[];
}

export const MacWaveDock: React.FC<MacWaveDockProps> = ({
    items,
    direction = "horizontal",
    darkMode = false,
    title,
    accentColor,
    onItemClick,
    onMinimizeAll,
    dockWindows,
}) => {
    const mousePos = useMotionValue(Infinity);
    const isHorizontal = direction === "horizontal";
    const vo = getVOTheme(darkMode);
    const primaryAccent = accentColor || vo.accent;
    const [collapsed, setCollapsed] = useState(false);

    // Count how many windows belonging to this dock's items are currently open
    const dockItemIds = new Set(items.map((i) => i.id));
    const matchingWindows = dockWindows.filter((w) => dockItemIds.has(w.widgetType));
    const openCount = matchingWindows.length;
    const activeCount = matchingWindows.filter((w) => !w.minimized).length;

    if (collapsed) {
        return (
            <button
                type="button"
                onClick={() => setCollapsed(false)}
                title={`Expand ${title || (isHorizontal ? "Command Dock" : "Quick Dock")}`}
                className="aos-dock font-mono transition-all duration-150"
                style={{
                    display: "flex",
                    flexDirection: isHorizontal ? "row" : "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: vo.glass,
                    backdropFilter: vo.blur,
                    WebkitBackdropFilter: vo.blur,
                    padding: isHorizontal ? "5px 12px" : "10px 5px",
                    borderRadius: 0,
                    border: `1px solid ${vo.borderStrong}`,
                    ...(isHorizontal
                        ? { borderTop: `2px solid ${primaryAccent}` }
                        : { borderLeft: `2px solid ${primaryAccent}` }),
                    boxShadow: vo.shadow,
                    color: vo.text,
                    cursor: "pointer",
                    zIndex: 50,
                }}
            >
                <span
                    style={{
                        width: 6,
                        height: 6,
                        background: openCount > 0 ? primaryAccent : "#22c55e",
                        boxShadow: `0 0 6px ${openCount > 0 ? primaryAccent : "#22c55e"}`,
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        writingMode: isHorizontal ? "horizontal-tb" : "vertical-rl",
                        color: vo.textMuted,
                    }}
                >
                    {title || (isHorizontal ? "DOCK" : "TOOLS")}
                    {openCount > 0 ? ` · ${openCount}` : ""}
                </span>
                {isHorizontal ? (
                    <ChevronUp style={{ width: 11, height: 11, color: primaryAccent }} />
                ) : (
                    <ChevronRight style={{ width: 11, height: 11, color: primaryAccent }} />
                )}
            </button>
        );
    }

    return (
        <motion.div
            onMouseMove={(e) => mousePos.set(isHorizontal ? e.clientX : e.clientY)}
            onMouseLeave={() => mousePos.set(Infinity)}
            className="aos-dock font-mono select-none"
            style={{
                display: "flex",
                flexDirection: isHorizontal ? "row" : "column",
                alignItems: "center",
                gap: isHorizontal ? 5 : 5,
                background: vo.glass,
                backdropFilter: vo.blur,
                WebkitBackdropFilter: vo.blur,
                padding: isHorizontal ? "5px 8px" : "7px 6px",
                borderRadius: 0,
                border: `1px solid ${vo.borderStrong}`,
                ...(isHorizontal
                    ? { borderTop: `2px solid ${primaryAccent}` }
                    : { borderLeft: `2px solid ${primaryAccent}` }),
                boxShadow: vo.shadow,
                zIndex: 50,
            }}
        >
            {/* Tactical Dock Grip & Status Header */}
            <div
                style={{
                    display: "flex",
                    flexDirection: isHorizontal ? "row" : "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: isHorizontal ? "0 4px 0 2px" : "2px 0 4px 0",
                    ...(isHorizontal
                        ? { borderRight: `1px solid ${vo.border}` }
                        : { borderBottom: `1px solid ${vo.border}`, width: "100%" }),
                }}
            >
                <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    title={`Collapse ${title || (isHorizontal ? "Command Dock" : "Productivity Dock")}`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        background: "transparent",
                        border: "none",
                        padding: 2,
                        cursor: "pointer",
                        color: vo.textDim,
                    }}
                >
                    <span
                        style={{
                            width: 5,
                            height: 5,
                            background: openCount > 0 ? primaryAccent : "#22c55e",
                            boxShadow: openCount > 0 ? `0 0 6px ${primaryAccent}` : "none",
                        }}
                    />
                    {isHorizontal ? (
                        <GripVertical style={{ width: 11, height: 11, color: vo.textDim }} />
                    ) : (
                        <GripHorizontal style={{ width: 11, height: 11, color: vo.textDim }} />
                    )}
                </button>

                {openCount > 0 && onMinimizeAll && activeCount > 0 && (
                    <button
                        type="button"
                        onClick={onMinimizeAll}
                        title="Minimize active dock windows"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 16,
                            height: 16,
                            background: vo.hoverBg,
                            border: `1px solid ${vo.border}`,
                            color: vo.textMuted,
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        <Minus style={{ width: 9, height: 9 }} />
                    </button>
                )}
            </div>

            {/* Dock Tiles with Automatic Group Dividers */}
            {items.map((item, idx) => {
                const prevGroup = idx > 0 ? items[idx - 1].group : item.group;
                const showDivider = idx > 0 && Boolean(item.group && prevGroup && item.group !== prevGroup);
                const win = dockWindows.find((w) => w.widgetType === item.id);
                const isOpen = Boolean(win);
                const isMinimized = Boolean(win?.minimized);

                return (
                    <React.Fragment key={item.id}>
                        {showDivider && (
                            <div
                                style={{
                                    width: isHorizontal ? 1 : 22,
                                    height: isHorizontal ? 24 : 1,
                                    background: vo.borderStrong,
                                    margin: isHorizontal ? "0 2px" : "2px 0",
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        <DockIcon
                            item={item}
                            mousePos={mousePos}
                            direction={direction}
                            isOpen={isOpen}
                            isMinimized={isMinimized}
                            onClick={() => onItemClick(item.id, item.label, item.width, item.height)}
                            vo={vo}
                            darkMode={darkMode}
                        />
                    </React.Fragment>
                );
            })}

            {/* Collapse Chevron Footer */}
            <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Minimize dock rail"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: isHorizontal ? 18 : 28,
                    height: isHorizontal ? 32 : 16,
                    background: "transparent",
                    border: `1px solid transparent`,
                    color: vo.textDim,
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = primaryAccent;
                    e.currentTarget.style.borderColor = vo.border;
                    e.currentTarget.style.background = vo.hoverBg;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = vo.textDim;
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "transparent";
                }}
            >
                {isHorizontal ? (
                    <ChevronDown style={{ width: 11, height: 11 }} />
                ) : (
                    <ChevronLeft style={{ width: 11, height: 11 }} />
                )}
            </button>
        </motion.div>
    );
};

function DockIcon({
    item,
    mousePos,
    direction,
    isOpen,
    isMinimized,
    onClick,
    vo,
    darkMode,
}: {
    item: DockItem;
    mousePos: any;
    direction: "horizontal" | "vertical";
    isOpen: boolean;
    isMinimized: boolean;
    onClick: () => void;
    vo: VOTheme;
    darkMode: boolean;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const isHorizontal = direction === "horizontal";
    const itemColor = item.color || vo.accent;

    const distance = useTransform(mousePos, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
        if (isHorizontal) {
            return val - bounds.x - bounds.width / 2;
        } else {
            return val - bounds.y - bounds.height / 2;
        }
    });

    // Crisp Agentic OS tile sizing with smooth wave magnification
    const baseSize = isHorizontal ? 36 : 34;
    const maxSize = isHorizontal ? 46 : 42;
    const sizeTransform = useTransform(distance, [-110, 0, 110], [baseSize, maxSize, baseSize]);
    const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 200, damping: 16 });

    const [isHovered, setIsHovered] = useState(false);

    const activeStateLabel = isOpen ? (isMinimized ? "MINIMIZED" : "ACTIVE") : null;

    return (
        <div className="relative flex items-center justify-center">
            <motion.button
                ref={ref}
                type="button"
                aria-label={item.label}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: 0,
                    border: `1px solid ${
                        isOpen && !isMinimized
                            ? `${itemColor}aa`
                            : isHovered
                              ? `${itemColor}88`
                              : isOpen
                                ? vo.borderStrong
                                : vo.border
                    }`,
                    background:
                        isOpen && !isMinimized
                            ? `${itemColor}22`
                            : isHovered
                              ? `${itemColor}15`
                              : isOpen
                                ? vo.hoverBg
                                : darkMode
                                  ? "rgba(255, 255, 255, 0.015)"
                                  : "rgba(15, 23, 42, 0.02)",
                    color: isOpen || isHovered ? itemColor : vo.text,
                    boxShadow:
                        isHovered || (isOpen && !isMinimized)
                            ? `inset 0 0 12px ${itemColor}18`
                            : "none",
                }}
                className="relative flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none"
            >
                {/* Top-Left Subtle Corner Tick on Hover/Active */}
                {(isHovered || isOpen) && (
                    <span
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: 4,
                            height: 4,
                            borderTop: `1.5px solid ${itemColor}`,
                            borderLeft: `1.5px solid ${itemColor}`,
                            pointerEvents: "none",
                        }}
                    />
                )}

                {/* Main Vector / Node Icon */}
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.color ? itemColor : isHovered || isOpen ? vo.accent : vo.text,
                        transform: isHovered ? "scale(1.1)" : "scale(1)",
                        transition: "transform 0.15s ease, color 0.15s ease",
                        zIndex: 10,
                    }}
                >
                    {item.icon}
                </span>

                {/* Sub-layer / Code Tag in Bottom-Right Corner (Agentic OS signature) */}
                {item.code && (
                    <span
                        style={{
                            position: "absolute",
                            bottom: 1,
                            right: 2,
                            fontSize: 6.5,
                            fontWeight: 700,
                            lineHeight: 1,
                            letterSpacing: "0.04em",
                            color: isHovered || (isOpen && !isMinimized) ? itemColor : vo.textDim,
                            opacity: isHovered || isOpen ? 0.95 : 0.65,
                            pointerEvents: "none",
                        }}
                    >
                        {item.code}
                    </span>
                )}

                {/* Notification Badge */}
                {item.badge !== undefined && (
                    <span
                        style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            minWidth: 14,
                            height: 14,
                            padding: "0 3px",
                            background: itemColor,
                            color: "#0b0e13",
                            fontSize: 8,
                            fontWeight: 800,
                            lineHeight: "14px",
                            textAlign: "center",
                            zIndex: 15,
                        }}
                    >
                        {item.badge}
                    </span>
                )}

                {/* Open / Minimized Window Edge Indicator Bar */}
                {isOpen && (
                    <div
                        style={{
                            position: "absolute",
                            ...(isHorizontal
                                ? {
                                      bottom: -5,
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      width: isMinimized ? 8 : 16,
                                      height: 2,
                                  }
                                : {
                                      right: -5,
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      width: 2,
                                      height: isMinimized ? 8 : 16,
                                  }),
                            background: isMinimized ? "#f59e0b" : itemColor,
                            boxShadow: isMinimized ? "none" : `0 0 8px ${itemColor}`,
                            transition: "all 0.15s ease",
                        }}
                    />
                )}
            </motion.button>

            {/* Agentic OS HUD Floating Tooltip */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            x: isHorizontal ? 0 : 6,
                            y: isHorizontal ? -4 : 0,
                        }}
                        animate={{
                            opacity: 1,
                            x: isHorizontal ? 0 : 10,
                            y: isHorizontal ? -8 : 0,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        style={{
                            position: "absolute",
                            ...(isHorizontal
                                ? { bottom: "100%", left: "50%", transform: "translateX(-50%)" }
                                : { left: "100%", top: "50%", transform: "translateY(-50%)" }),
                            pointerEvents: "none",
                            zIndex: 9999,
                            whiteSpace: "nowrap",
                            background: vo.surfaceStrong,
                            border: `1px solid ${vo.borderStrong}`,
                            borderLeft: `2px solid ${itemColor}`,
                            boxShadow: vo.shadow,
                            padding: "4px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        {item.code && (
                            <span
                                style={{
                                    fontSize: 8,
                                    fontWeight: 800,
                                    color: itemColor,
                                    padding: "0 3px",
                                    border: `1px solid ${itemColor}55`,
                                    background: `${itemColor}18`,
                                }}
                            >
                                {item.code}
                            </span>
                        )}
                        <span
                            style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: vo.text,
                            }}
                        >
                            {item.label}
                        </span>
                        {activeStateLabel && (
                            <span
                                style={{
                                    fontSize: 7.5,
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    color: isMinimized ? "#f59e0b" : "#22c55e",
                                }}
                            >
                                · {activeStateLabel}
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

