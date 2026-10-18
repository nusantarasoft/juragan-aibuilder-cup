"use client";

import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { theme } from "antd";
import { Minus } from "lucide-react";
import { useDockStore } from "@/store/useDockStore";

interface DockWindowProps {
    id: string;
    title: string;
    width: number;
    height: number;
    zIndex: number;
    accentColor?: string;
    code?: string;
    isFocused?: boolean;
    children: React.ReactNode;
}

const MONO_FONT =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export default function DockWindow({
    id,
    title,
    width,
    height,
    zIndex,
    accentColor = "#fb923c",
    code,
    children,
}: DockWindowProps) {
    const { closeWindow, minimizeWindow, bringToFront, activeWindowId } = useDockStore();
    const { token } = theme.useToken();
    const [visible, setVisible] = useState(true);

    const isActive = activeWindowId === id;

    const handleHide = () => {
        setVisible(false);
        setTimeout(() => {
            closeWindow(id);
        }, 220);
    };

    const customHeader = (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                fontFamily: MONO_FONT,
            }}
        >
            <span
                style={{
                    width: 6,
                    height: 6,
                    background: isActive ? accentColor : token.colorTextQuaternary,
                    boxShadow: isActive ? `0 0 6px ${accentColor}` : "none",
                    flexShrink: 0,
                }}
            />
            {code && (
                <span
                    style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        padding: "0 4px",
                        border: `1px solid ${accentColor}66`,
                        background: `${accentColor}1a`,
                        color: accentColor,
                        letterSpacing: "0.08em",
                    }}
                >
                    {code}
                </span>
            )}
            <span
                style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: isActive ? token.colorText : token.colorTextSecondary,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {title}
            </span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    minimizeWindow(id);
                }}
                title="Minimize to Dock"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    background: "transparent",
                    border: `1px solid ${token.colorBorderSecondary}`,
                    color: token.colorTextSecondary,
                    cursor: "pointer",
                    marginRight: 4,
                    padding: 0,
                }}
            >
                <Minus style={{ width: 11, height: 11 }} />
            </button>
        </div>
    );

    return (
        <Dialog
            header={customHeader}
            visible={visible}
            style={{ width: `${width}px`, height: `${height}px`, zIndex }}
            onHide={handleHide}
            maximizable
            resizable
            modal={false}
            keepInViewport={true}
            focusOnShow={false}
            onClick={() => bringToFront(id)}
            contentStyle={{
                background: "transparent",
                color: token.colorText,
                padding: "12px",
                overflow: "auto",
                flex: 1,
                fontFamily: MONO_FONT,
            }}
            headerStyle={{
                background: "rgba(255, 255, 255, 0.025)",
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                color: isActive ? token.colorText : token.colorTextSecondary,
                padding: "6px 10px",
                borderRadius: 0,
                fontFamily: MONO_FONT,
            }}
            pt={{
                root: {
                    style: {
                        background: token.colorBgElevated,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderRadius: 0,
                        border: `1px solid ${isActive ? token.colorBorder : token.colorBorderSecondary}`,
                        borderTop: `2px solid ${isActive ? accentColor : token.colorBorder}`,
                        boxShadow: "0 28px 70px -15px rgba(0, 0, 0, 0.88)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    },
                },
                headerTitle: {
                    style: {
                        width: "100%",
                    },
                },
            }}
        >
            {children}
        </Dialog>
    );
}

