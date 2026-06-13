"use client";

import React, { useState, useEffect } from "react";
import PmCommandPalette from "./dashboard/components/PmCommandPalette";
import { useRouter } from "next/navigation";

export default function PmLayout({ children }: { children: React.ReactNode }) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                // If it's a generic Cmd+K, we might clash with Global Command Palette in CMSLayout.
                // We should ensure only one opens, or use a specific shortcut. 
                // However, capturing it at the window level is fine for now if they want it specifically in PM.
                e.preventDefault();
                setPaletteOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            {children}
            {paletteOpen && (
                <PmCommandPalette
                    onClose={() => setPaletteOpen(false)}
                    onSelectProject={(id) => {
                        router.push(`/admin/pm/dashboard?projectId=${id}`);
                    }}
                    onSelectTask={(projectId, taskId) => {
                        router.push(`/admin/pm/tasks/${taskId}`);
                    }}
                />
            )}
        </>
    );
}
