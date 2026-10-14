"use client";

import React, { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { startAosPolling } from "./lib/store";
import { useOsUi } from "./registry";
import { AgenticOsDesktop } from "./AgenticOsDesktop";

/**
 * Full-screen Agentic OS over the Virtual Office. Mount once; open via
 * `useOsUi().launch()`. The overview deck is the home screen and every other
 * app opens as a window on top of it (see `AgenticOsDesktop`).
 */
export function AgenticOsOverlay({ exitLabel = "Back to office" }: { exitLabel?: string }) {
    const { isOpen, close } = useOsUi(useShallow((s) => ({ isOpen: s.open, close: s.close })));

    useEffect(() => (isOpen ? startAosPolling(4000) : undefined), [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1500] overflow-hidden animate-in fade-in duration-300">
            <AgenticOsDesktop exit={{ label: exitLabel, onClick: close }} />
        </div>
    );
}
