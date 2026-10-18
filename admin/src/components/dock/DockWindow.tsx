"use client";

import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { theme } from "antd";
import { useDockStore } from "@/store/useDockStore";

interface DockWindowProps {
    id: string;
    title: string;
    width: number;
    height: number;
    zIndex: number;
    isFocused?: boolean;
    children: React.ReactNode;
}

export default function DockWindow({ id, title, width, height, zIndex, children }: DockWindowProps) {
    const { closeWindow, minimizeWindow, bringToFront, activeWindowId } = useDockStore();
    const { token } = theme.useToken();
    const [visible, setVisible] = useState(true);

    const isActive = activeWindowId === id;

    const handleHide = () => {
        setVisible(false);
        // Delay the store removal to allow PrimeReact's hide animation to play
        setTimeout(() => {
            closeWindow(id);
        }, 300);
    };

    return (
        <Dialog
            header={title}
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
                padding: "14px",
                overflow: "auto",
                flex: 1,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
            headerStyle={{
                background: "rgba(255, 255, 255, 0.02)",
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                color: isActive ? token.colorText : token.colorTextSecondary,
                padding: "6px 12px",
                borderRadius: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
            pt={{
                root: {
                    style: {
                        background: token.colorBgElevated,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderRadius: 0,
                        border: `1px solid ${isActive ? token.colorBorder : token.colorBorderSecondary}`,
                        borderTop: `2px solid ${isActive ? "#fb923c" : token.colorBorder}`,
                        boxShadow: "0 28px 70px -15px rgba(0, 0, 0, 0.85)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }
                },
                headerTitle: {
                    style: {
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        textAlign: "left",
                        width: "100%",
                    }
                }}}
        >
            {children}
        </Dialog>
    );
}
