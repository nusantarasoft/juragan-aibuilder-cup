"use client";

import React, { useState, useEffect } from "react";
import { Input, Typography, theme } from "antd";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title } = Typography;

export default function NotesWidget() {
    const { token } = theme.useToken();
    const { themeColor } = usePreferencesStore();
    const [notes, setNotes] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem("dock-notes");
        if (saved) setNotes(saved);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        localStorage.setItem("dock-notes", val);
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "transparent" }}>
            <div style={{ padding: "16px 20px 8px" }}>
                <Title level={4} style={{ margin: 0, color: themeColor }}>Notes</Title>
            </div>
            <div style={{ flex: 1, padding: "0 20px 20px" }}>
                <Input.TextArea
                    value={notes}
                    onChange={handleChange}
                    placeholder="Type your notes here... (saved automatically)"
                    bordered={false}
                    style={{ 
                        height: "100%", 
                        resize: "none", 
                        background: "transparent",
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: token.colorText,
                        padding: 0
                    }}
                />
            </div>
        </div>
    );
}
