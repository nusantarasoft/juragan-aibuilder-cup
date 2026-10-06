"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { ExternalLink, Eye, Hand, LoaderCircle, Pause, Play, RotateCcw, X } from "lucide-react";
import { STATUS_META } from "../lib/floorplan";
import { AGENT_SNAPSHOT_MESSAGE, AGENT_SNAPSHOT_REQUEST, MODULES, sessionUrl, stepIndex } from "../lib/modules";
import { useOfficeStore } from "../lib/store";
import type { Agent } from "../lib/types";
import { ActivityList } from "./AgentRoster";
import { AgentBadge, GLASS, ModuleChip, ProgressBar, StatusPill, StepList, cx, elapsed, useNow } from "./shared";

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

    // Stream the agent's live state into the module page so its overlay matches the office.
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
            <div style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }} className="relative overflow-hidden rounded-b-xl">
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

    // New page → show loader again.
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
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-stretch gap-4 bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-300 md:p-6">
            {/* Monitor */}
            <section className={cx(GLASS, "flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl")}>
                <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
                    <div className="flex gap-1.5">
                        <button type="button" onClick={closeScreen} className="h-3 w-3 rounded-full bg-red-500/80 hover:bg-red-500" aria-label="Close" />
                        <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                        <ModuleChip moduleId={moduleId} />
                        <span className="truncate font-mono text-[11px] text-slate-400">{route}</span>
                    </div>
                    <span
                        className={cx(
                            "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            running ? "bg-red-500/15 text-red-300" : "bg-white/5 text-slate-400",
                        )}
                    >
                        <span className={cx("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-red-400" : "bg-slate-500")} />
                        {running ? "Live" : STATUS_META[agent.status].label}
                    </span>
                </header>

                <div className="relative min-h-0 flex-1 bg-black/40">
                    <ScaledFrame src={src} agent={agent} onLoaded={() => setLoading(false)} />

                    {/* Watch mode shield: the page is the agent's — take control to interact */}
                    {!control && (
                        <div className="absolute inset-0 cursor-default">
                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-slate-950/85 px-3 py-1.5 text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
                                <Eye className="h-3.5 w-3.5 text-cyan-300" />
                                Watching {agent.name}
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80">
                            <LoaderCircle className="h-6 w-6 animate-spin text-indigo-300" />
                            <span className="text-xs text-slate-400">Connecting to {agent.name}&apos;s session in {mod.name}…</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Session panel */}
            <aside className={cx(GLASS, "hidden w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl lg:flex")}>
                <div className="flex items-start gap-3 border-b border-white/10 p-4">
                    <AgentBadge agent={agent} size={42} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{agent.name}&apos;s screen</div>
                        <div className="truncate text-[11px] text-slate-400">{agent.role}</div>
                        <div className="mt-1.5">
                            <StatusPill status={agent.status} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeScreen}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                        aria-label="Close screen"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 border-b border-white/10 p-4">
                    {agent.task ? (
                        <>
                            <div>
                                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                                    <span>Task in {mod.name}</span>
                                    <span className="normal-case tracking-normal tabular-nums">{elapsed(agent.task.startedAt, now)}</span>
                                </div>
                                <div className="text-[13px] font-medium leading-snug text-white">{agent.task.title}</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <ProgressBar value={agent.task.progress} color={mod.color} />
                                    <span className="w-9 text-right text-[11px] tabular-nums text-slate-300">{Math.round(agent.task.progress * 100)}%</span>
                                </div>
                            </div>
                            <StepList task={agent.task} status={agent.status} />
                        </>
                    ) : (
                        <div className="text-xs text-slate-400">
                            {agent.name} has no active task. Showing their home module, <span className="text-white">{mod.name}</span>.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            type="button"
                            onClick={openInModule}
                            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-400"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open {mod.name} &amp; follow {agent.name}
                        </button>
                        <button
                            type="button"
                            onClick={() => setControl((c) => !c)}
                            className={cx(
                                "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition",
                                control ? "border-amber-400/40 bg-amber-400/15 text-amber-200" : "border-white/10 text-slate-200 hover:bg-white/10",
                            )}
                        >
                            <Hand className="h-3.5 w-3.5" />
                            {control ? "Release control" : "Take control"}
                        </button>
                        {agent.status === "paused" ? (
                            <button type="button" onClick={() => command(agent.id, "resume")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10">
                                <Play className="h-3.5 w-3.5" /> Resume
                            </button>
                        ) : agent.status === "error" ? (
                            <button type="button" onClick={() => command(agent.id, "retry")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10">
                                <RotateCcw className="h-3.5 w-3.5" /> Approve & retry
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={!running}
                                onClick={() => command(agent.id, "pause")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-40"
                            >
                                <Pause className="h-3.5 w-3.5" /> Pause agent
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Session log</div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    <ActivityList entries={log} />
                </div>
            </aside>
        </div>
    );
}
