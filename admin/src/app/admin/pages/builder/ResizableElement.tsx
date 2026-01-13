"use client";

import React, { useState, useRef, useCallback } from "react";

interface ResizableElementProps {
    elementKey: string;
    children: React.ReactNode;
    isSelected: boolean;
    editMode: boolean;
    initialWidth?: number | string;
    initialHeight?: number | string;
    minWidth?: number;
    minHeight?: number;
    onResize?: (key: string, width: number, height: number) => void;
    onSelect?: (key: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const ResizableElement: React.FC<ResizableElementProps> = ({
    elementKey,
    children,
    isSelected,
    editMode,
    initialWidth = "auto",
    initialHeight = "auto",
    minWidth = 50,
    minHeight = 30,
    onResize,
    onSelect,
    style,
    className,
}) => {
    const [size, setSize] = useState({
        width: typeof initialWidth === "number" ? initialWidth : 0,
        height: typeof initialHeight === "number" ? initialHeight : 0,
    });
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
        if (!editMode) return;
        e.stopPropagation();
        e.preventDefault();

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        startPos.current = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
        };
        setIsResizing(true);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startPos.current.x;
            const deltaY = moveEvent.clientY - startPos.current.y;

            let newWidth = startPos.current.width;
            let newHeight = startPos.current.height;

            if (corner.includes("e")) newWidth = Math.max(minWidth, startPos.current.width + deltaX);
            if (corner.includes("w")) newWidth = Math.max(minWidth, startPos.current.width - deltaX);
            if (corner.includes("s")) newHeight = Math.max(minHeight, startPos.current.height + deltaY);
            if (corner.includes("n")) newHeight = Math.max(minHeight, startPos.current.height - deltaY);

            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            if (onResize && size.width > 0 && size.height > 0) {
                onResize(elementKey, size.width, size.height);
            }
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [editMode, elementKey, minWidth, minHeight, onResize, size]);

    const handleClick = (e: React.MouseEvent) => {
        if (editMode && onSelect) {
            e.stopPropagation();
            onSelect(elementKey);
        }
    };

    const resizeHandleStyle: React.CSSProperties = {
        position: "absolute",
        width: 8,
        height: 8,
        backgroundColor: "#1677ff",
        borderRadius: 2,
        zIndex: 20,
    };

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            className={className}
            style={{
                ...style,
                position: "relative",
                width: size.width > 0 ? size.width : initialWidth,
                height: size.height > 0 ? size.height : initialHeight,
                cursor: editMode ? "pointer" : "default",
                outline: isSelected ? "2px solid #1677ff" : "none",
                outlineOffset: 2,
                transition: isResizing ? "none" : "outline 0.15s ease",
            }}
        >
            {children}

            {/* Resize handles - only show in edit mode when selected */}
            {editMode && isSelected && (
                <>
                    {/* Label */}
                    <span style={{
                        position: "absolute",
                        top: -16,
                        left: 4,
                        background: "#1677ff",
                        color: "white",
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 3,
                        zIndex: 10,
                    }}>
                        {elementKey}
                    </span>

                    {/* Corner handles */}
                    <div
                        style={{ ...resizeHandleStyle, bottom: -4, right: -4, cursor: "se-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "se")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, bottom: -4, left: -4, cursor: "sw-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "sw")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, top: -4, right: -4, cursor: "ne-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "ne")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, top: -4, left: -4, cursor: "nw-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "nw")}
                    />

                    {/* Edge handles */}
                    <div
                        style={{ ...resizeHandleStyle, top: "50%", right: -4, marginTop: -4, cursor: "e-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "e")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, top: "50%", left: -4, marginTop: -4, cursor: "w-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "w")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, bottom: -4, left: "50%", marginLeft: -4, cursor: "s-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "s")}
                    />
                    <div
                        style={{ ...resizeHandleStyle, top: -4, left: "50%", marginLeft: -4, cursor: "n-resize" }}
                        onMouseDown={(e) => handleMouseDown(e, "n")}
                    />
                </>
            )}
        </div>
    );
};
