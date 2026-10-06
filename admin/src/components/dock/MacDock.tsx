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
    athan: { id: "athan", label: "Athan", icon: "🧭", width: 350, height: 450, gradient: "linear-gradient(145deg, #fef3c7 0%, #f59e0b 100%)" },
    calculator: { id: "calculator", label: "Calculator", icon: "🧮", width: 320, height: 480, gradient: "linear-gradient(145deg, #fee2e2 0%, #ef4444 100%)" },
    notes: { id: "notes", label: "Notes", icon: "📝", width: 400, height: 500, gradient: "linear-gradient(145deg, #fef3c7 0%, #eab308 100%)" },
    calendar: { id: "calendar", label: "Calendar", icon: "📅", width: 350, height: 400, gradient: "linear-gradient(145deg, #dbeafe 0%, #a78bfa 100%)" },
    snake: { id: "snake", label: "Snake", icon: "🐍", width: 450, height: 600, gradient: "linear-gradient(145deg, #d1fae5 0%, #34d399 100%)" },
    pong: { id: "pong", label: "Pong", icon: "🏓", width: 450, height: 500, gradient: "linear-gradient(145deg, #fce7f3 0%, #ec4899 100%)" },
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
                <div 
                    style={{ 
                        position: "relative", 
                        width: "4.2rem", 
                        height: "4.2rem", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        background: item.gradient || "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,240,245,0.8))",
                        borderRadius: "16px",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15) translateY(-6px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1) translateY(0)"}
                >
                    <span style={{
                        fontSize: "2.5rem",
                        lineHeight: 1,
                        filter: "drop-shadow(0px 3px 6px rgba(0,0,0,0.25))",
                        userSelect: "none"
                    }}>
                        {item.icon}
                    </span>
                    {isOpen && (
                        <div style={{ 
                            position: "absolute", 
                            bottom: -10, 
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 6, 
                            height: 6, 
                            borderRadius: "50%", 
                            background: "rgba(0,0,0,0.4)",
                            boxShadow: "0 0 6px rgba(0,0,0,0.2)"
                        }} />
                    )}
                </div>
            )
        };
    }).filter(i => i.label);

    // Add "+" button as last item
    const addItem: MenuItem = {
        label: "Add Widget",
        command: () => { /* Could open a widget picker */ },
        icon: () => (
            <div
                style={{
                    position: "relative",
                    width: "4.2rem",
                    height: "4.2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, rgba(240,240,250,0.9), rgba(230,230,240,0.8))",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,1)",
                    border: "2px dashed rgba(0,0,0,0.12)",
                    transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15) translateY(-6px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1) translateY(0)"}
            >
                <span style={{ fontSize: "1.8rem", color: "rgba(0,0,0,0.2)", fontWeight: 300, userSelect: "none" }}>+</span>
            </div>
        )
    };

    const allItems = [...items, addItem];

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

            {/* The PrimeReact Dock with frosted glass */}
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
                        <div style={{
                            pointerEvents: 'auto',
                            background: 'rgba(255, 255, 255, 0.72)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                            borderRadius: 20,
                            padding: '8px 16px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                            border: '1px solid rgba(255,255,255,0.5)',
                        }}>
                            <Dock 
                                model={allItems} 
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
