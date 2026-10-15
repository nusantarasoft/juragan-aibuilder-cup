"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MousePointer2 } from "lucide-react";
import { ensureOfficeRuntime } from "./lib/runtime";
import { useOfficeStore } from "./lib/store";
import { EmptyOfficeBanner } from "./hud/EmptyOfficeBanner";
import { TopBar } from "./hud/TopBar";
import { isEmptyLiveOffice } from "./lib/officeRuntimeMode";
import { AgentRoster } from "./hud/AgentRoster";
import { AgentInspector } from "./hud/AgentInspector";
import { AgentScreenView } from "./hud/AgentScreenView";
import { CommandBar } from "./hud/CommandBar";
import { GLASS, cx } from "./hud/shared";
import { AgenticOsOverlay } from "@/components/agentic-os/AgenticOsOverlay";

const OfficeScene = dynamic(() => import("./scene/OfficeScene"), { ssr: false });

function ControlsHint() {
    const selectedId = useOfficeStore((s) => s.selectedId);
    if (selectedId) return null;
    return (
        <div className={cx(GLASS, "pointer-events-none absolute bottom-4 right-4 hidden rounded-xl px-3 py-2 text-[10px] leading-relaxed text-slate-400 2xl:block")}>
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-slate-300">
                <MousePointer2 className="h-3 w-3" /> Controls
            </div>
            <div>Drag · orbit &nbsp;|&nbsp; Right-drag · pan &nbsp;|&nbsp; Scroll · zoom</div>
            <div>Click agent · inspect &nbsp;|&nbsp; Click PC monitor · watch screen &nbsp;|&nbsp; Esc · back</div>
            <div>1 overview · 2 top · F follow · L labels · N day/night</div>
        </div>
    );
}

function LoadingVeil() {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 900);
        return () => clearTimeout(t);
    }, []);
    return (
        <div
            className={cx(
                "pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#05070d] transition-opacity duration-700",
                visible ? "opacity-100" : "opacity-0",
            )}
        >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            <div className="text-xs tracking-[0.2em] text-slate-400">ENTERING VIRTUAL OFFICE</div>
        </div>
    );
}

export default function VirtualOffice() {
    const lighting = useOfficeStore(s => s.lighting);
    const agents = useOfficeStore((s) => s.agents);
    const dataMode = useOfficeStore((s) => s.dataMode);
    const showEmptyLive = dataMode === "live" && isEmptyLiveOffice(agents);

    // Initial load from localstorage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem("cms-dark-mode");
        const isDark = savedDarkMode !== null ? savedDarkMode === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isDark && useOfficeStore.getState().lighting === "day") {
            useOfficeStore.setState({ lighting: "night" });
        } else if (!isDark && useOfficeStore.getState().lighting === "night") {
            useOfficeStore.setState({ lighting: "day" });
        }
    }, []);

    // Sync state changes to global and tailwind
    useEffect(() => {
        const isDark = lighting === "night";
        localStorage.setItem("cms-dark-mode", String(isDark));
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [lighting]);

    // Runtime (live Agentic OS or explicit demo mode — see lib/runtime.ts) lives for the whole tab,
    // so agents keep working while the user follows them into module pages.
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
                // While watching a screen only Esc is active.
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
                    s.toggleLighting();
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div className="fixed inset-0 z-[1000] overflow-hidden bg-[#05070d] font-sans text-slate-100 antialiased">
            <div className="absolute inset-0">
                <OfficeScene />
            </div>
            <div className="pointer-events-none absolute inset-0 z-20">
                {showEmptyLive && <EmptyOfficeBanner />}
                <TopBar />
                <AgentRoster />
                <AgentInspector />
                <CommandBar />
                <ControlsHint />
                <AgentScreenView />
            </div>
            <LoadingVeil />
            <AgenticOsOverlay />
        </div>
    );
}
