"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Hexagon } from "lucide-react";
import { ensureOfficeRuntime } from "./lib/runtime";
import { useOfficeStore } from "./lib/store";
import { EmptyOfficeBanner } from "./hud/EmptyOfficeBanner";
import { isEmptyLiveOffice } from "./lib/officeRuntimeMode";
import { TopBar } from "./hud/TopBar";
import { AgentRoster } from "./hud/AgentRoster";
import { AgentInspector } from "./hud/AgentInspector";
import { AgentScreenView } from "./hud/AgentScreenView";
import { CommandBar } from "./hud/CommandBar";
import { ORANGE, cx, useVoLayout } from "./hud/shared";
import { AgenticOsOverlay } from "@/components/agentic-os/AgenticOsOverlay";
import { useAosTheme } from "@/components/agentic-os/lib/deckStore";

const OfficeScene = dynamic(() => import("./scene/OfficeScene"), { ssr: false });

function LoadingVeil() {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 850);
        return () => clearTimeout(t);
    }, []);
    return (
        <div
            className={cx(
                "pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0b0e13] font-mono transition-opacity duration-700",
                visible ? "opacity-100" : "opacity-0",
            )}
        >
            <Hexagon className="h-8 w-8 animate-pulse" color={ORANGE} strokeWidth={2} />
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">ENTERING VIRTUAL OFFICE · AGENTIC OS</div>
        </div>
    );
}

export default function VirtualOffice() {
    const { isDark, setTheme } = useAosTheme();
    const focus = useVoLayout((s) => s.focus);
    const dropEdge = useVoLayout((s) => s.dropEdge);
    const agents = useOfficeStore((s) => s.agents);
    const dataMode = useOfficeStore((s) => s.dataMode);
    const showEmptyLive = dataMode === "live" && isEmptyLiveOffice(agents);

    // Keep 3D scene lighting synchronized with Agentic OS / Nusantarasoft theme
    useEffect(() => {
        const target = isDark ? "night" : "day";
        if (useOfficeStore.getState().lighting !== target) {
            useOfficeStore.setState({ lighting: target });
        }
    }, [isDark]);

    // The runtime lives for the whole tab so agents keep working across module navigation.
    useEffect(() => {
        ensureOfficeRuntime();
        useOfficeStore.getState().resetView();
        return () => {
            useOfficeStore.getState().closeScreen();
            document.body.style.cursor = "";
        };
    }, []);

    // Keyboard shortcuts.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
            const s = useOfficeStore.getState();
            if (s.screenAgentId) {
                if (e.key === "Escape") s.closeScreen();
                return;
            }
            switch (e.key.toLowerCase()) {
                case "escape":
                    s.select(null);
                    break;
                case "1":
                    s.setCameraMode("overview");
                    break;
                case "2":
                    s.setCameraMode("top");
                    break;
                case "f":
                    if (s.selectedId) s.setCameraMode("follow");
                    break;
                case "l":
                    s.toggleLabels();
                    break;
                case "n":
                    setTheme(s.lighting !== "night");
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setTheme]);

    return (
        <div
            data-theme={isDark ? "dark" : "light"}
            className={cx(
                "aos-root fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-[#0b0e13] font-mono text-slate-100 antialiased",
                !isDark && "aos-light",
            )}
        >
            {/* Hide outer CMS floating dock while Virtual Office is mounted */}
            <style>{'div.md\\:flex[style*="translateX(-50%)"]{display:none!important}div:has(> .mac-dock-container){display:none!important}'}</style>
            <TopBar />
            {showEmptyLive && (
                <div className="pointer-events-none absolute inset-x-0 top-10 z-40 flex justify-center px-4">
                    <div className="pointer-events-auto max-w-lg">
                        <EmptyOfficeBanner />
                    </div>
                </div>
            )}
            <div data-vo-body className="relative flex min-h-0 flex-1 overflow-hidden">
                {!focus && <AgentRoster />}
                <main data-testid="vo-main" className="relative order-2 min-w-0 flex-1 overflow-hidden">
                    <OfficeScene />
                    <CommandBar />
                    <AgentScreenView />
                </main>
                {!focus && <AgentInspector />}
                {dropEdge && (
                    <div
                        data-testid={`vo-drop-${dropEdge}`}
                        className={cx(
                            "pointer-events-none absolute inset-y-0 z-[50] flex w-14 items-center justify-center border-orange-400/80 bg-orange-500/15 backdrop-blur-[1px] transition-opacity",
                            dropEdge === "left" ? "left-0 border-r-2" : "right-0 border-l-2",
                        )}
                    >
                        <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-200">
                            {dropEdge === "left" ? "Drop to pin left" : "Drop to pin right"}
                        </span>
                    </div>
                )}
            </div>
            <LoadingVeil />
            <AgenticOsOverlay />
        </div>
    );
}
