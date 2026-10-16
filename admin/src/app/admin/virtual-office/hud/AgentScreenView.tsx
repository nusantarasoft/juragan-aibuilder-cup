"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { ExternalLink, Eye, Hand, LoaderCircle, Monitor, Pause, Play, RotateCcw, X } from "lucide-react";
import { STATUS_META } from "../lib/floorplan";
import { AGENT_SNAPSHOT_MESSAGE, AGENT_SNAPSHOT_REQUEST, MODULES, sessionUrl, stepIndex } from "../lib/modules";
import { useOfficeStore } from "../lib/store";
import type { Agent } from "../lib/types";
import { ActivityList } from "./AgentRoster";
import { AgentBadge, GLASS, ModuleChip, ProgressBar, Section, StatusPill, StepList, cx, elapsed, useNow } from "./shared";

/** Virtual desktop resolution the module page is rendered at, then scaled to fit. */
const SCREEN_W = 1440;
const SCREEN_H = 900;

function ScaledFrame({ src, agent, onLoaded }: { src: string; agent: Agent; onLoaded: () => void }) {
    const wrap = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const [scale, setScale] = useState(0.5);
    const agentRef = useRef(agent);
    agentRef.current = agent;

    useLayoutEffect(() => {
        const el = wrap.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setScale(Math.min(width / SCREEN_W, height / SCREEN_H));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const post = () => {
        try {
            frame.current?.contentWindow?.postMessage({ type: AGENT_SNAPSHOT_MESSAGE, agent: agentRef.current }, window.location.origin);
        } catch {
            /* frame navigating */
        }
    };
    useEffect(post);
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === AGENT_SNAPSHOT_REQUEST) post();
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div ref={wrap} className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }} className="relative overflow-hidden">
                <iframe
                    ref={frame}
                    key={src}
                    src={src}
                    title={`${agent.name}'s screen`}
                    onLoad={() => {
                        post();
                        onLoaded();
                    }}
                    className="absolute left-0 top-0 origin-top-left border-0 bg-white"
                    style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}
                />
            </div>
        </div>
    );
}

export function AgentScreenView() {
    const router = useRouter();
    const { agent, activity, closeScreen, command } = useOfficeStore(
        useShallow((s) => ({
            agent: s.agents.find((a) => a.id === s.screenAgentId),
            activity: s.activity,
            closeScreen: s.closeScreen,
            command: s.command,
        })),
    );
    const [control, setControl] = useState(false);
    const [loading, setLoading] = useState(true);
    const now = useNow(1000);

    const moduleId = agent ? agent.task?.moduleId ?? agent.modules[0] : undefined;
    const route = agent ? agent.task?.route ?? MODULES[agent.modules[0]].route : "";
    const src = agent ? sessionUrl(route, agent.id, true) : "";

    useEffect(() => setLoading(true), [src]);
    useEffect(() => setControl(false), [agent?.id]);

    const log = useMemo(() => (agent ? activity.filter((e) => e.agentId === agent.id).slice(0, 20) : []), [activity, agent]);

    if (!agent || !moduleId) return null;
    const mod = MODULES[moduleId];
    const running = agent.status === "working" || agent.status === "thinking";
    const step = agent.task ? agent.task.steps[stepIndex(agent.task.progress, agent.task.steps.length)] : null;

    const openInModule = () => {
        closeScreen();
        router.push(sessionUrl(route, agent.id));
    };

    return (
        <div className="pointer-events-auto absolute inset-0 top-9 z-40 flex items-stretch gap-3 bg-black/55 p-3 font-mono backdrop-blur-sm animate-in fade-in duration-200 md:p-5">
            {/* Monitor window */}
            <section
                className={cx(GLASS, "flex min-w-0 flex-1 flex-col overflow-hidden border-white/25")}
                style={{ borderTopColor: mod.color, borderTopWidth: 2 }}
            >
                <header className="flex h-8 shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3">
                    <Monitor className="h-3.5 w-3.5 shrink-0" style={{ color: mod.color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{agent.name} · SCREEN</span>
                    <ModuleChip moduleId={moduleId} />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">· {route}</span>
                    <span
                        className={cx(
                            "flex items-center gap-1.5 border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                            running ? "border-red-400/50 bg-red-500/15 text-red-200" : "border-white/15 bg-white/[0.03] text-slate-400",
                        )}
                    >
                        <span className={cx("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-red-400" : "bg-slate-500")} />
                        {running ? "LIVE" : STATUS_META[agent.status].label}
                    </span>
                    <button
                        type="button"
                        onClick={closeScreen}
                        className="flex h-[18px] w-[18px] items-center justify-center border border-white/15 text-slate-400 transition hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-200"
                        aria-label="Close"
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                </header>

                <div className="relative min-h-0 flex-1 bg-black/40">
                    <ScaledFrame src={src} agent={agent} onLoaded={() => setLoading(false)} />

                    {!control && (
                        <div className="absolute inset-0 cursor-default">
                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-white/20 bg-[#0b0e13]/95 px-3 py-1.5 text-[10.5px] text-slate-300 shadow-xl backdrop-blur-md">
                                <Eye className="h-3 w-3 text-sky-400" />
                                <span>WATCHING {agent.name.toUpperCase()}</span>
                                {step && (
                                    <>
                                        <span className="text-slate-600">·</span>
                                        <span className="max-w-[320px] truncate text-white">{step}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0b0e13]/85">
                            <LoaderCircle className="h-5 w-5 animate-spin text-orange-400" />
                            <span className="text-[11px] uppercase tracking-widest text-slate-400">
                                Connecting to {agent.name}&apos;s session in {mod.name}…
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* Session telemetry sidebar */}
            <aside
                className={cx(GLASS, "hidden w-[330px] shrink-0 flex-col overflow-hidden border-white/20 lg:flex")}
                style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
            >
                <div className="flex items-start gap-3 border-b border-white/10 p-3.5">
                    <AgentBadge agent={agent} size={38} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-white">{agent.name}&apos;s session</div>
                        <div className="truncate text-[10.5px] text-slate-400">{agent.role}</div>
                        <div className="mt-1">
                            <StatusPill status={agent.status} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeScreen}
                        className="flex h-[18px] w-[18px] items-center justify-center border border-white/15 text-slate-400 hover:border-white/40 hover:text-white"
                        aria-label="Close screen"
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>

                <Section
                    title={`Task in ${mod.name}`}
                    right={agent.task ? <span className="text-[9.5px] tabular-nums text-slate-400">{elapsed(agent.task.startedAt, now)}</span> : undefined}
                >
                    {agent.task ? (
                        <>
                            <div className="text-[12px] font-medium leading-snug text-white">{agent.task.title}</div>
                            <div className="my-2 flex items-center gap-2">
                                <ProgressBar value={agent.task.progress} color={mod.color} />
                                <span className="w-9 text-right text-[10.5px] tabular-nums text-slate-300">{Math.round(agent.task.progress * 100)}%</span>
                            </div>
                            <StepList task={agent.task} status={agent.status} />
                        </>
                    ) : (
                        <div className="text-[11px] text-slate-400">
                            {agent.name} has no active task. Showing home module <span className="text-white">{mod.name}</span>.
                        </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <button
                            type="button"
                            onClick={openInModule}
                            className="col-span-2 inline-flex items-center justify-center gap-1.5 border border-orange-400/50 bg-orange-500/15 px-3 py-1.5 text-[11px] text-orange-100 transition hover:border-orange-300 hover:text-white"
                        >
                            <ExternalLink className="h-3 w-3" />
                            open {mod.name.toLowerCase()} &amp; follow
                        </button>
                        <button
                            type="button"
                            onClick={() => setControl((c) => !c)}
                            className={cx(
                                "inline-flex items-center justify-center gap-1 border px-2 py-1 text-[10.5px] transition",
                                control ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/15 text-slate-200 hover:border-white/35 hover:text-white",
                            )}
                        >
                            <Hand className="h-3 w-3" />
                            {control ? "release control" : "take control"}
                        </button>
                        {agent.status === "paused" ? (
                            <button type="button" onClick={() => command(agent.id, "resume")} className="inline-flex items-center justify-center gap-1 border border-white/15 px-2 py-1 text-[10.5px] text-slate-200 hover:border-white/35 hover:text-white">
                                <Play className="h-3 w-3" /> resume
                            </button>
                        ) : agent.status === "error" ? (
                            <button type="button" onClick={() => command(agent.id, "retry")} className="inline-flex items-center justify-center gap-1 border border-white/15 px-2 py-1 text-[10.5px] text-slate-200 hover:border-white/35 hover:text-white">
                                <RotateCcw className="h-3 w-3" /> retry
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={!running}
                                onClick={() => command(agent.id, "pause")}
                                className="inline-flex items-center justify-center gap-1 border border-white/15 px-2 py-1 text-[10.5px] text-slate-200 hover:border-white/35 hover:text-white disabled:opacity-40"
                            >
                                <Pause className="h-3 w-3" /> pause
                            </button>
                        )}
                    </div>
                </Section>

                <Section title="Session log" className="flex-1 border-b-0">
                    <ActivityList entries={log} />
                </Section>
            </aside>
        </div>
    );
}
