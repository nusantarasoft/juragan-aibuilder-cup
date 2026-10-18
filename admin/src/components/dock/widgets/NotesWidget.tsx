"use client";

import React, { useState, useEffect } from "react";
import { Input, theme, message } from "antd";

const MONO_FONT =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export default function NotesWidget({ storageKey = "dock-notes" }: { storageKey?: string }) {
    const { token } = theme.useToken();
    const [notes, setNotes] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) setNotes(saved);
    }, [storageKey]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        localStorage.setItem(storageKey, val);
    };

    const lineCount = notes ? notes.split("\n").length : 0;

    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "transparent",
                fontFamily: MONO_FONT,
                gap: 8,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 6,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    fontSize: 9.5,
                    color: token.colorTextSecondary,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                }}
            >
                <span>AUTO-SAVED SCRATCHPAD · {notes.length} CHARS · {lineCount} LINES</span>
                <div style={{ display: "flex", gap: 6 }}>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard?.writeText(notes);
                            message.success("Copied to clipboard");
                        }}
                        style={{
                            background: "transparent",
                            border: `1px solid ${token.colorBorderSecondary}`,
                            color: token.colorText,
                            fontSize: 9,
                            padding: "1px 6px",
                            cursor: "pointer",
                            fontFamily: MONO_FONT,
                        }}
                    >
                        COPY
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setNotes("");
                            localStorage.removeItem(storageKey);
                        }}
                        style={{
                            background: "transparent",
                            border: `1px solid ${token.colorBorderSecondary}`,
                            color: token.colorTextSecondary,
                            fontSize: 9,
                            padding: "1px 6px",
                            cursor: "pointer",
                            fontFamily: MONO_FONT,
                        }}
                    >
                        CLEAR
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, minHeight: 160 }}>
                <Input.TextArea
                    value={notes}
                    onChange={handleChange}
                    placeholder="// Enter tactical notes, snippets, or checklists..."
                    variant="borderless"
                    style={{
                        height: "100%",
                        minHeight: 160,
                        resize: "none",
                        background: "rgba(255, 255, 255, 0.015)",
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 0,
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: token.colorText,
                        padding: "8px 10px",
                        fontFamily: MONO_FONT,
                    }}
                />
            </div>
        </div>
    );
}

