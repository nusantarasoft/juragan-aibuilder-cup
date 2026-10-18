"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, Box, Cpu, Crosshair, Eye, EyeOff, Hexagon, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { useOsUi } from "@/components/agentic-os/registry";
import { useAosStore } from "@/components/agentic-os/lib/store";
import { useAosTheme } from "@/components/agentic-os/lib/deckStore";
import { MASCOT_ID } from "../lib/mascotStore";
import { useOfficeStore } from "../lib/store";
import { IconButton, ORANGE, cx, formatTokens, useVoLayout } from "./shared";

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
    return <span className={cx("inline-block h-1.5 w-1.5 rounded-full", pulse && "animate-pulse")} style={{ background: color }} />;
}

export function TopBar() {
    const router = useRouter();
    const { isDark, setTheme } = useAosTheme();
    const focus = useVoLayout((s) => s.focus);
    const toggleFocus = useVoLayout((s) => s.toggleFocus);
    const resetLayout = useVoLayout((s) => s.resetLayout);
    const { agents, dataMode, cameraMode, selectedId, showLabels, select, setCameraMode, toggleLabels } = useOfficeStore(
        useShallow((s) => ({
            agents: s.agents,
            dataMode: s.dataMode,
            cameraMode: s.cameraMode,
            selectedId: s.selectedId,
            showLabels: s.showLabels,
            select: s.select,
            setCameraMode: s.setCameraMode,
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

    const handleThemeToggle = (nextDark: boolean) => {
        setTheme(nextDark);
        useOfficeStore.setState({ lighting: nextDark ? "night" : "day" });
    };

    return (
        <header
            data-testid="vo-topbar"
            className="pointer-events-auto relative z-30 flex h-9 shrink-0 items-center justify-between gap-3 whitespace-nowrap border-b border-white/[0.08] bg-[#0b0e13]/95 px-3 font-mono text-[10px] tracking-[0.14em] backdrop-blur-md"
        >
            {/* Left: Back + Identity + Live Status Metrics */}
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                <IconButton title="Back to Admin" onClick={goBack}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                </IconButton>

                <div className="flex items-center gap-1.5">
                    <Hexagon className="h-3.5 w-3.5 shrink-0" color={ORANGE} strokeWidth={2.2} />
                    <span className="font-semibold tracking-[0.22em] text-white">VIRTUAL OFFICE</span>
                    <span className="hidden text-[9.5px] tracking-normal sm:inline" style={{ color: ORANGE }}>
                        · 3D HQ
                    </span>
                </div>

                <span className="h-3.5 w-px bg-white/10" />

                <span className="flex items-center gap-1.5">
                    <Dot color={dataMode === "live" ? "#22c55e" : "#f59e0b"} pulse={dataMode === "live"} />
                    <span className="text-slate-500">FEED</span>·
                    <span className="text-slate-100">{dataMode === "live" ? "LIVE" : dataMode === "demo" ? "DEMO" : "SYNC"}</span>
                </span>

                <span className="hidden items-center gap-1.5 md:flex">
                    <Dot color="#38bdf8" />
                    <span className="text-slate-500">ONLINE</span>·
                    <span className="tabular-nums text-slate-100">
                        {online}/{agents.length}
                    </span>
                </span>

                <span className="hidden items-center gap-1.5 lg:flex">
                    <Dot color="#22c55e" pulse={working > 0} />
                    <span className="text-slate-500">WORKING</span>·<span className="tabular-nums text-slate-100">{working}</span>
                </span>

                <span className="hidden items-center gap-1.5 xl:flex">
                    <Dot color="#a855f7" pulse={thinking > 0} />
                    <span className="text-slate-500">THINKING</span>·<span className="tabular-nums text-slate-100">{thinking}</span>
                </span>

                <span className="hidden items-center gap-1.5 xl:flex">
                    <Dot color="#f59e0b" />
                    <span className="text-slate-500">MEETING</span>·<span className="tabular-nums text-slate-100">{meeting}</span>
                </span>

                {issues > 0 && (
                    <span className="hidden items-center gap-1.5 xl:flex">
                        <Dot color="#ef4444" pulse />
                        <span className="text-red-400">ALERT·{issues}</span>
                    </span>
                )}

                {review > 0 && (
                    <span className="hidden items-center gap-1.5 2xl:flex">
                        <Dot color="#c084fc" />
                        <span className="text-slate-500">REVIEW</span>·<span className="tabular-nums text-slate-100">{review}</span>
                    </span>
                )}

                <span className="hidden items-center gap-1.5 2xl:flex">
                    <span className="text-slate-500">DONE</span>·<span className="tabular-nums text-slate-100">{done}</span>
                    <span className="text-slate-500">· TOKENS</span>·<span className="tabular-nums text-slate-100">{formatTokens(tokens)}</span>
                </span>
            </div>

            {/* Right: Camera modes + Icon buttons + Layout controls + Agentic OS launch */}
            <div className="flex shrink-0 items-center gap-1.5">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        title="Overview camera (1)"
                        onClick={() => setCameraMode("overview")}
                        className={cx(
                            "flex h-[22px] items-center gap-1 border px-2 text-[9.5px] tracking-wider transition",
                            cameraMode === "overview"
                                ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                                : "border-white/15 text-slate-300 hover:border-white/35 hover:text-white",
                        )}
                    >
                        <Box className="h-3 w-3" />
                        <span className="hidden sm:inline">OVERVIEW</span>
                    </button>
                    <button
                        type="button"
                        title="Top-down floorplan camera (2)"
                        onClick={() => setCameraMode("top")}
                        className={cx(
                            "flex h-[22px] items-center gap-1 border px-2 text-[9.5px] tracking-wider transition",
                            cameraMode === "top"
                                ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                                : "border-white/15 text-slate-300 hover:border-white/35 hover:text-white",
                        )}
                    >
                        <LayoutGrid className="h-3 w-3" />
                        <span className="hidden sm:inline">TOP</span>
                    </button>
                    <button
                        type="button"
                        title="Follow selected agent (F)"
                        disabled={!selectedId}
                        onClick={() => setCameraMode("follow")}
                        className={cx(
                            "flex h-[22px] items-center gap-1 border px-2 text-[9.5px] tracking-wider transition",
                            cameraMode === "follow"
                                ? "border-orange-400/70 bg-orange-500/15 text-orange-200"
                                : "border-white/15 text-slate-300 hover:border-white/35 hover:text-white",
                            !selectedId && "cursor-not-allowed opacity-35 hover:border-white/15",
                        )}
                    >
                        <Crosshair className="h-3 w-3" />
                        <span className="hidden sm:inline">FOLLOW</span>
                    </button>
                    <button
                        type="button"
                        data-testid="vo-topbar-mascot"
                        title="Select & follow Cinder-Puff Office Mascot"
                        onClick={() => select(MASCOT_ID)}
                        className={cx(
                            "flex h-[22px] items-center gap-1 border px-2 text-[9.5px] tracking-wider transition",
                            selectedId === MASCOT_ID
                                ? "border-orange-400/80 bg-orange-500/20 text-orange-200"
                                : "border-orange-400/35 bg-orange-500/5 text-orange-200/90 hover:border-orange-400/70 hover:text-white",
                        )}
                    >
                        <span>🐾</span>
                        <span className="hidden sm:inline">MASCOT</span>
                    </button>
                </div>

                <span className="h-3.5 w-px bg-white/10" />

                <IconButton title={showLabels ? "Hide name tags (L)" : "Show name tags (L)"} active={showLabels} onClick={toggleLabels}>
                    {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </IconButton>

                <span data-testid="vo-theme-toggle" title={isDark ? "Switch to Light Mode (N)" : "Switch to Dark Mode (N)"} className="inline-flex">
                    <AnimatedThemeToggler
                        isDark={isDark}
                        onThemeChange={handleThemeToggle}
                        size={13}
                        className="!p-0 flex h-[22px] w-[22px] items-center justify-center !rounded-none border border-white/15 text-slate-300 transition hover:border-white/35 hover:text-white"
                    />
                </span>

                <IconButton title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                    {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </IconButton>

                <button
                    type="button"
                    onClick={resetLayout}
                    title="Reset panel positions"
                    className="hidden h-[22px] items-center border border-white/15 px-2 text-[10px] tracking-normal text-slate-300 transition hover:border-white/35 hover:text-white lg:flex"
                >
                    reset layout
                </button>

                <button
                    type="button"
                    onClick={toggleFocus}
                    title="Hide or show side panels"
                    className={cx(
                        "hidden h-[22px] items-center border px-2 text-[10px] tracking-normal transition hover:text-white lg:flex",
                        focus ? "border-orange-400/70 bg-orange-500/15 text-orange-200" : "border-white/15 text-slate-300 hover:border-white/35",
                    )}
                >
                    focus
                </button>

                <button
                    type="button"
                    onClick={() => launchOs(pendingApprovals ? "governance" : "overview")}
                    title="Open Agentic OS — customize agents, tasks and playbooks"
                    className="relative flex h-[22px] items-center gap-1.5 border border-orange-400/50 bg-orange-500/10 px-2.5 text-[10px] tracking-normal text-orange-100 transition hover:border-orange-300 hover:text-white"
                >
                    <Cpu className="h-3 w-3" color={ORANGE} />
                    <span>agentic os</span>
                    {pendingApprovals > 0 && (
                        <span className="ml-0.5 bg-amber-500 px-1 text-[8.5px] font-bold leading-[14px] text-black">{pendingApprovals}</span>
                    )}
                </button>
            </div>
        </header>
    );
}
