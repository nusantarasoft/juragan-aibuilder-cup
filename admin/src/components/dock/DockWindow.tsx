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
                padding: "16px",
                overflow: "auto",
                flex: 1
            }}
            headerStyle={{
                background: `linear-gradient(180deg, ${token.colorFillAlter} 0%, transparent 100%)`,
                borderBottom: `1px solid ${token.colorBorderSecondary}44`,
                color: isActive ? token.colorText : token.colorTextSecondary,
                padding: "12px 16px",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px"
            }}
            pt={{
                root: {
                    style: {
                        background: token.colorBgElevated,
                        backgroundColor: `${token.colorBgElevated}b3`, // 70% opacity for ultra glass
                        backdropFilter: "blur(50px) saturate(200%)",
                        WebkitBackdropFilter: "blur(50px) saturate(200%)",
                        borderRadius: "16px",
                        border: `1px solid ${token.colorBorderSecondary}`,
                        boxShadow: isActive 
                            ? `0 30px 60px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.2), 0 0 0 1px ${token.colorBorder}` 
                            : `0 15px 30px -10px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255,255,255,0.1), 0 0 0 1px ${token.colorBorderSecondary}`,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }
                },
                headerTitle: {
                    style: {
                        fontSize: "14px",
                        fontWeight: 600,
                        textAlign: "center",
                        width: "100%"
                    }
                }}}
        >
            {children}
        </Dialog>
    );
}
