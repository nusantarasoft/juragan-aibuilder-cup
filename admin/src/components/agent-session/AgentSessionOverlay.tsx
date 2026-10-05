"use client";

/**
 * Agent session overlay — lets the user "look over an AI agent's shoulder"
 * inside a real module page (ITSM, Command Center, …).
 *
 * Activated by `?agentSession=<agentId>` on any CMS page:
 *  - live mode (normal tab): starts/keeps the office runtime alive and shows a
 *    floating session card + the agent's ghost cursor operating the page.
 *  - embed mode (`&embed=agent`, inside the Virtual Office PC screen iframe):
 *    mirrors the agent state streamed from the parent via postMessage.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Box, ChevronDown, ChevronUp, Pause, Play, X } from "lucide-react";
import { AGENT_SNAPSHOT_MESSAGE, AGENT_SNAPSHOT_REQUEST, MODULES, sessionUrl, stepIndex } from "@/app/admin/virtual-office/lib/modules";
import { ensureOfficeRuntime } from "@/app/admin/virtual-office/lib/runtime";
import { useOfficeStore } from "@/app/admin/virtual-office/lib/store";
import type { Agent } from "@/app/admin/virtual-office/lib/types";
import { AgentBadge, ModuleChip, ProgressBar, StatusPill, StepList, cx, relativeTime, useNow } from "@/app/admin/virtual-office/hud/shared";

const TARGETS =
    "button, a[href], input, .ant-table-row, .ant-card, .ant-list-item, .ant-tabs-tab, .ant-tag, .ant-statistic, [role=row]";

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

const isRunning = (a: Agent) => a.status === "working" || a.status === "thinking";

const currentStep = (a: Agent) => (a.task ? a.task.steps[stepIndex(a.task.progress, a.task.steps.length)] : undefined);

interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Simulated cursor of the agent moving across real UI elements of the page. */
function GhostCursor({ agent, step }: { agent: Agent; step?: string }) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [box, setBox] = useState<Rect | null>(null);
    const [pulse, setPulse] = useState(0);

    useEffect(() => {
        let alive = true;
        let clickTimer = 0;
        setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

        const pick = () => {
            const root = document.querySelector(".ant-pro-page-container") ?? document.querySelector("main") ?? document.body;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const nodes = Array.from(root.querySelectorAll<HTMLElement>(TARGETS)).filter((el) => {
                if (el.closest("[data-agent-overlay]")) return false;
                const r = el.getBoundingClientRect();
                return r.width > 8 && r.height > 8 && r.width < vw * 0.7 && r.height < vh * 0.5 && r.top >= 56 && r.bottom <= vh - 8 && r.left >= 0 && r.right <= vw;
            });
            setBox(null);
            if (!nodes.length) {
                setPos({ x: vw * (0.3 + Math.random() * 0.4), y: vh * (0.3 + Math.random() * 0.4) });
                return;
            }
            const el = nodes[Math.floor(Math.random() * nodes.length)];
            const r = el.getBoundingClientRect();
            setPos({ x: r.left + r.width * (0.3 + Math.random() * 0.4), y: r.top + r.height / 2 });
            clickTimer = window.setTimeout(() => {
                if (!alive) return;
                const b = el.getBoundingClientRect();
                setBox({ left: b.left, top: b.top, width: b.width, height: b.height });
                setPulse((p) => p + 1);
            }, 950);
        };

        const first = window.setTimeout(pick, 400);
        const id = window.setInterval(pick, 2800);
        return () => {
            alive = false;
            clearTimeout(first);
            clearTimeout(clickTimer);
            clearInterval(id);
        };
    }, []);

    return (
        <div data-agent-overlay className="pointer-events-none fixed inset-0 z-[1400]">
            {box && (
                <div
                    key={`box-${pulse}`}
                    className="absolute rounded-lg animate-in fade-in zoom-in-95 duration-300"
                    style={{
                        left: box.left - 4,
                        top: box.top - 4,
                        width: box.width + 8,
                        height: box.height + 8,
                        border: `2px solid ${agent.color}`,
                        background: `${agent.color}14`,
                        boxShadow: `0 0 0 4px ${agent.color}22, 0 0 24px ${agent.color}55`,
                    }}
                />
            )}
            {pos && (
                <div
                    className="absolute left-0 top-0"
                    style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.9s cubic-bezier(.4,0,.2,1)" }}
                >
                    {box && (
                        <span
                            key={`ping-${pulse}`}
                            className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full"
                            style={{ background: agent.color, opacity: 0.45 }}
                        />
                    )}
                    <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))" }}>
                        <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill={agent.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    <div
                        className="ml-4 -mt-1 inline-flex max-w-[320px] items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-lg"
                        style={{ background: agent.color, color: "#0b1020" }}
                    >
                        <span>{agent.name}</span>
                        {step && <span className="truncate font-medium opacity-80">· {step}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Inside the Virtual Office PC screen: mirror state sent by the parent window. */
function EmbedSession({ agentId }: { agentId: string }) {
    const [agent, setAgent] = useState<Agent | null>(null);

    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data as { type?: string; agent?: Agent } | null;
            if (data?.type === AGENT_SNAPSHOT_MESSAGE && data.agent?.id === agentId) setAgent(data.agent);
        };
        window.addEventListener("message", onMsg);
        if (window.parent !== window) window.parent.postMessage({ type: AGENT_SNAPSHOT_REQUEST }, window.location.origin);
        return () => window.removeEventListener("message", onMsg);
    }, [agentId]);

    if (!agent) return null;
    const step = currentStep(agent);
    const moduleId = agent.task?.moduleId ?? agent.modules[0];

    return (
        <>
            <div data-agent-overlay className="pointer-events-none fixed left-1/2 top-3 z-[1500] -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-[12px] text-slate-200 shadow-2xl backdrop-blur-md">
                    <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: agent.color }} />
                    <span className="font-semibold text-white">{agent.name}</span>
                    <span className="text-slate-400">is operating</span>
                    <ModuleChip moduleId={moduleId} />
                    {step && (
                        <>
                            <span className="text-slate-600">·</span>
                            <span className="max-w-[360px] truncate">{step}</span>
                        </>
                    )}
                </div>
            </div>
            {isRunning(agent) && <GhostCursor agent={agent} step={step} />}
        </>
    );
}

/** Normal tab: the runtime keeps running and a floating card follows the agent. */
function LiveSession({ agentId }: { agentId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const agent = useOfficeStore((s) => s.agents.find((a) => a.id === agentId));
    const activity = useOfficeStore((s) => s.activity);
    const command = useOfficeStore((s) => s.command);
    const [collapsed, setCollapsed] = useState(false);
    const [autoFollow, setAutoFollow] = useState(true);
    const now = useNow(5000);

    useEffect(() => {
        ensureOfficeRuntime();
    }, []);

    const recent = useMemo(() => activity.filter((e) => e.agentId === agentId).slice(0, 3), [activity, agentId]);

    // Auto-follow: when the agent picks up a task on another page, go there with it.
    const taskId = agent?.task?.id;
    const taskRoute = agent?.task?.route;
    const prevTask = useRef(taskId);
    useEffect(() => {
        if (taskId === prevTask.current) return;
        prevTask.current = taskId;
        if (autoFollow && taskRoute && normalize(taskRoute) !== normalize(pathname)) {
            const t = setTimeout(() => router.push(sessionUrl(taskRoute, agentId)), 1200);
            return () => clearTimeout(t);
        }
    }, [taskId, taskRoute, autoFollow, pathname, router, agentId]);

    if (!agent) return null;

    const task = agent.task;
    const here = !!task && normalize(task.route) === normalize(pathname);
    const step = currentStep(agent);
    const running = isRunning(agent);

    const endSession = () => {
        const q = new URLSearchParams(searchParams.toString());
        q.delete("agentSession");
        q.delete("embed");
        const s = q.toString();
        router.replace(s ? `${pathname}?${s}` : pathname);
    };

    if (collapsed) {
        return (
            <>
                <button
                    type="button"
                    data-agent-overlay
                    onClick={() => setCollapsed(false)}
                    className="fixed bottom-5 right-5 z-[1500] flex max-w-[360px] items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 py-1.5 pl-1.5 pr-3 text-[12px] text-slate-200 shadow-2xl backdrop-blur-xl transition hover:bg-slate-900"
                >
                    <AgentBadge agent={agent} size={26} />
                    <span className="font-semibold text-white">{agent.name}</span>
                    {step && <span className="truncate text-slate-400">{step}</span>}
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
                {here && running && <GhostCursor agent={agent} step={step} />}
            </>
        );
    }

    return (
        <>
            <aside
                data-agent-overlay
                className="fixed bottom-5 right-5 z-[1500] flex w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 font-sans text-slate-100 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                <div className="relative flex items-start gap-3 border-b border-white/10 p-3">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-60"
                        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${agent.color}33, transparent 60%)` }}
                    />
                    <AgentBadge agent={agent} size={38} />
                    <div className="relative min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-white">{agent.name}</span>
                            <span
                                className={cx(
                                    "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                    running ? "bg-red-500/15 text-red-300" : "bg-white/5 text-slate-400",
                                )}
                            >
                                <span className={cx("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-red-400" : "bg-slate-500")} />
                                {running ? "Live" : "Session"}
                            </span>
                        </div>
                        <div className="truncate text-[11px] text-slate-400">{agent.role}</div>
                        <div className="mt-1">
                            <StatusPill status={agent.status} />
                        </div>
                    </div>
                    <div className="relative flex gap-0.5">
                        <button
                            type="button"
                            onClick={() => setCollapsed(true)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                            aria-label="Collapse"
                            title="Collapse"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={endSession}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                            aria-label="End session"
                            title="Stop following"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[46vh] space-y-3 overflow-y-auto p-3">
                    {task ? (
                        here ? (
                            <div>
                                <div className="mb-1.5 flex items-center gap-1.5">
                                    <ModuleChip moduleId={task.moduleId} />
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400">on this page</span>
                                </div>
                                <div className="mb-2 text-[13px] font-medium leading-snug text-white">{task.title}</div>
                                <div className="mb-2.5 flex items-center gap-2">
                                    <ProgressBar value={task.progress} color={MODULES[task.moduleId].color} />
                                    <span className="w-9 text-right text-[11px] tabular-nums text-slate-300">{Math.round(task.progress * 100)}%</span>
                                </div>
                                <StepList task={task} status={agent.status} dense />
                            </div>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="mb-1 text-[11px] text-slate-400">{agent.name} is working in another module</div>
                                <div className="mb-2 flex items-center gap-1.5">
                                    <ModuleChip moduleId={task.moduleId} />
                                    <span className="truncate text-[12px] text-white">{task.title}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push(sessionUrl(task.route, agent.id))}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-400"
                                >
                                    Follow to {MODULES[task.moduleId].name}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="text-[12px] text-slate-400">
                            {agent.name} has no active task right now. You&apos;ll be taken along when they pick one up.
                        </div>
                    )}

                    {recent.length > 0 && (
                        <ol className="space-y-1 border-t border-white/10 pt-2">
                            {recent.map((e) => (
                                <li key={e.id} className="flex items-start gap-2 text-[11px] leading-snug">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.moduleId ? MODULES[e.moduleId].color : "#64748b" }} />
                                    <span className="flex-1 text-slate-300">{e.message}</span>
                                    <span className="shrink-0 tabular-nums text-slate-500">{relativeTime(e.ts, now)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <div className="flex items-center gap-1.5 border-t border-white/10 p-2">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/virtual-office")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                        <Box className="h-3.5 w-3.5" />
                        Virtual Office
                    </button>
                    {agent.status === "paused" ? (
                        <button
                            type="button"
                            onClick={() => command(agent.id, "resume")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                            <Play className="h-3.5 w-3.5" /> Resume
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={!running}
                            onClick={() => command(agent.id, "pause")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                        >
                            <Pause className="h-3.5 w-3.5" /> Pause
                        </button>
                    )}
                    <label className="flex cursor-pointer select-none items-center gap-1 px-1 text-[10px] text-slate-400" title="Navigate along when the agent switches module">
                        <input type="checkbox" checked={autoFollow} onChange={(e) => setAutoFollow(e.target.checked)} className="h-3 w-3 accent-indigo-500" />
                        Auto-follow
                    </label>
                </div>
            </aside>
            {here && running && <GhostCursor agent={agent} step={step} />}
        </>
    );
}

function Gate() {
    const params = useSearchParams();
    const agentId = params.get("agentSession");
    if (!agentId) return null;
    return params.get("embed") === "agent" ? <EmbedSession agentId={agentId} /> : <LiveSession agentId={agentId} />;
}

export default function AgentSessionOverlay() {
    return (
        <Suspense fallback={null}>
            <Gate />
        </Suspense>
    );
}
