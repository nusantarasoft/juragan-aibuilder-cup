"use client";

import React, { useState, useEffect } from "react";
import { Dock } from "primereact/dock";
import { MenuItem } from "primereact/menuitem";
import { Tooltip, Button } from "antd";
import { 
    PushpinOutlined, 
    PushpinFilled, 
    EyeOutlined, 
    EyeInvisibleOutlined 
} from "@ant-design/icons";
import { useDockStore } from "@/store/useDockStore";
import DockWindow from "./DockWindow";
import AthanWidget from "./widgets/AthanWidget";
import CalculatorWidget from "./widgets/CalculatorWidget";
import NotesWidget from "./widgets/NotesWidget";
import CalendarWidget from "./widgets/CalendarWidget";
import SnakeWidget from "./widgets/SnakeWidget";
import PongWidget from "./widgets/PongWidget";
import { AnimatePresence, motion } from "framer-motion";

const DOCK_ITEMS_DATA: Record<string, any> = {
    athan: { id: "athan", label: "Athan", icon: "🧭", width: 350, height: 450 },
    calculator: { id: "calculator", label: "Calculator", icon: "🧮", width: 320, height: 480 },
    notes: { id: "notes", label: "Notes", icon: "📝", width: 400, height: 500 },
    calendar: { id: "calendar", label: "Calendar", icon: "📅", width: 350, height: 400 },
    snake: { id: "snake", label: "Snake", icon: "🐍", width: 450, height: 600 },
    pong: { id: "pong", label: "Pong", icon: "🏓", width: 450, height: 500 },
};

export default function MacDock() {
    const { windows, openWindow, dockMode, setDockMode, dockItemsOrder } = useDockStore();
    const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const showDock = dockMode === 'always' || (dockMode === 'auto' && isHoveringTrigger);

    const renderWidget = (type: string) => {
        switch (type) {
            case "athan": return <AthanWidget />;
            case "calculator": return <CalculatorWidget />;
            case "notes": return <NotesWidget />;
            case "calendar": return <CalendarWidget />;
            case "snake": return <SnakeWidget />;
            case "pong": return <PongWidget />;
            default: return null;
        }
    };

    const items: MenuItem[] = dockItemsOrder.map((itemId) => {
        const item = DOCK_ITEMS_DATA[itemId];
        if (!item) return {} as MenuItem;
        
        const isOpen = windows.some(w => w.widgetType === item.id);
        
        return {
            label: item.label,
            command: () => openWindow(item.id as any, item.label, item.width, item.height),
            icon: () => (
                <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{
                        fontSize: "3rem",
                        lineHeight: 1,
                        filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.3))",
                        userSelect: "none"
                    }}>
                        {item.icon}
                    </span>
                    {isOpen && (
                        <div style={{ 
                            position: "absolute", 
                            bottom: -8, 
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 6, 
                            height: 6, 
                            borderRadius: "50%", 
                            background: "rgba(255,255,255,0.9)",
                            boxShadow: "0 0 6px rgba(255,255,255,0.8)"
                        }} />
                    )}
                </div>
            )
        };
    }).filter(i => i.label);

    return (
        <>

            {/* Render Windows */}
            {windows.map(win => !win.minimized && (
                <DockWindow 
                    key={win.id} 
                    id={win.id} 
                    title={win.title} 
                    width={win.width} 
                    height={win.height} 
                    zIndex={win.zIndex}
                    isFocused={windows[windows.length - 1]?.id === win.id}
                >
                    {renderWidget(win.widgetType)}
                </DockWindow>
            ))}

            {/* The PrimeReact Dock */}
            <AnimatePresence>
                {dockMode !== 'hidden' && (
                    <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 150, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        style={{
                            position: "fixed",
                            bottom: 16,
                            left: 0,
                            right: 0,
                            zIndex: 9999,
                            display: 'flex',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                        }}
                    >
                        <div style={{ pointerEvents: 'auto' }}>
                            <Dock 
                                model={items} 
                                position="bottom" 
                                className="mac-dock-container"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </>
    );
}
