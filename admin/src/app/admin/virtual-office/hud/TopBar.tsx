"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, Box, Cpu, Crosshair, Eye, EyeOff, LayoutGrid, Maximize2, Minimize2, Moon, Sun } from "lucide-react";
import { useOsUi } from "@/components/agentic-os/registry";
import { useAosStore } from "@/components/agentic-os/lib/store";
import { useOfficeStore } from "../lib/store";
import { GLASS, IconButton, cx, formatTokens } from "./shared";

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <div className="flex flex-col items-center px-3">
            <span className="text-sm font-semibold tabular-nums" style={{ color }}>
                {value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
        </div>
    );
}

export function TopBar() {
    const router = useRouter();
    const { agents, dataMode, cameraMode, selectedId, lighting, showLabels, setCameraMode, toggleLighting, toggleLabels } = useOfficeStore(
        useShallow((s) => ({
            agents: s.agents,
            dataMode: s.dataMode,
            cameraMode: s.cameraMode,
            selectedId: s.selectedId,
            lighting: s.lighting,
            showLabels: s.showLabels,
            setCameraMode: s.setCameraMode,
            toggleLighting: s.toggleLighting,
            toggleLabels: s.toggleLabels,
        })),
    );
    const launchOs = useOsUi((s) => s.launch);
    const pendingApprovals = useAosStore((s) => s.stats?.pendingApprovals ?? 0);
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const online = agents.filter((a) => a.status !== "offline").length;
    const working = agents.filter((a) => a.status === "working").length;
    const thinking = agents.filter((a) => a.status === "thinking").length;
    const meeting = agents.filter((a) => a.status === "meeting").length;
    const issues = agents.filter((a) => a.status === "error").length;
    const review = agents.reduce((sum, a) => sum + (a.review ?? 0), 0);
    const tokens = agents.reduce((sum, a) => sum + a.stats.tokensToday, 0);
    const done = agents.reduce((sum, a) => sum + a.stats.tasksCompleted, 0);

    const goBack = () => {
        if (window.history.length > 1) router.back();
        else router.push("/admin/dashboard");
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
    };

    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            {/* Identity */}
            <div className={cx(GLASS, "pointer-events-auto flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4")}>
                <IconButton title="Back" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                </IconButton>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
                    <Box className="h-5 w-5 text-white" />
                </div>
                <div className="leading-tight">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        Virtual Office
                        {dataMode === "live" ? (
                            <span className="flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                            </span>
                        ) : (
                            <span
                                className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300"
                                title={
                                    dataMode === "demo"
                                        ? "UI demo mode — simulated agents for training and demos"
                                        : "Connecting to the Agentic OS…"
                                }
                            >
                                {dataMode === "demo" ? "Demo" : "Connecting"}
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                        {dataMode === "live"
                            ? "AI Agent HQ · Live roster & task queue (Agentic OS)"
                            : dataMode === "demo"
                              ? "AI Agent HQ · Demo simulation + Live Kasir (AI Studio)"
                              : "Connecting to Agentic OS…"}
                    </div>
                </div>
            </div>

            {/* Live stats */}
            <div className={cx(GLASS, "pointer-events-auto hidden items-center divide-x divide-white/10 rounded-2xl px-1 py-2 xl:flex")}>
                <Stat label="Online" value={`${online}/${agents.length}`} />
                <Stat label="Working" value={working} color="#22c55e" />
                <Stat label="Thinking" value={thinking} color="#a855f7" />
                <Stat label="Meeting" value={meeting} color="#f59e0b" />
                <Stat label="Attention" value={issues} color={issues ? "#ef4444" : undefined} />
                {dataMode === "live" && <Stat label="Review" value={review} color={review ? "#c084fc" : undefined} />}
                <Stat label="Tasks done" value={done} />
                <Stat label="Tokens today" value={formatTokens(tokens)} />
            </div>

            {/* View controls */}
            <div className={cx(GLASS, "pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5")}>
                <button
                    type="button"
                    onClick={() => launchOs(pendingApprovals ? "governance" : "overview")}
                    title="Open the Agentic OS — customize agents, tasks and playbooks"
                    className="relative mr-1 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                >
                    <Cpu className="h-4 w-4" /> Agentic OS
                    {pendingApprovals > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold text-black">{pendingApprovals}</span>
                    )}
                </button>
                <div className="flex items-center gap-1 rounded-xl bg-white/5 p-0.5">
                    <IconButton title="Overview (1)" active={cameraMode === "overview"} onClick={() => setCameraMode("overview")}>
                        <Box className="h-4 w-4" />
                    </IconButton>
                    <IconButton title="Top-down (2)" active={cameraMode === "top"} onClick={() => setCameraMode("top")}>
                        <LayoutGrid className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                        title="Follow selected agent (F)"
                        active={cameraMode === "follow"}
                        disabled={!selectedId}
                        onClick={() => setCameraMode("follow")}
                    >
                        <Crosshair className="h-4 w-4" />
                    </IconButton>
                </div>
                <div className="mx-1 h-6 w-px bg-white/10" />
                <IconButton title={showLabels ? "Hide name tags (L)" : "Show name tags (L)"} active={showLabels} onClick={toggleLabels}>
                    {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </IconButton>
                <IconButton title={lighting === "night" ? "Day mode (N)" : "Night mode (N)"} onClick={toggleLighting}>
                    {lighting === "night" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </IconButton>
                <IconButton title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </IconButton>
            </div>
        </div>
    );
}
