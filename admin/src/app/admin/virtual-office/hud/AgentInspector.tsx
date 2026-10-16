"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import {
    Activity,
    Coffee,
    Cpu,
    ExternalLink,
    Gauge,
    House,
    ListTodo,
    MessageSquare,
    Monitor,
    Pause,
    Play,
    Power,
    RotateCcw,
    Send,
    SlidersHorizontal,
    Sparkles,
    Target,
    Users,
    X,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { useOsUi } from "@/components/agentic-os/registry";
import { STATUS_META, ZONE_BY_ID } from "../lib/floorplan";
import { MODULES, sessionUrl } from "../lib/modules";
import { useOfficeStore } from "../lib/store";
import type { Agent, AgentCommand } from "../lib/types";
import { ActivityList } from "./AgentRoster";
import { RosterKindBadge } from "@/components/agentic-os/ui/RosterKindBadge";
import { timeAgo } from "@/components/agentic-os/ui/kit";
import { AgentBadge, GLASS, ModuleChip, ProgressBar, StatusPill, StepList, cx, elapsed, formatTokens, useNow } from "./shared";
import { AgentSettingsPanel } from "@/components/tenant-agents/AgentSettingsPanel";
import { isKasirOfficeAgent } from "@/components/agentic-os/lib/firstEmployee";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

function actionsFor(agent: Agent): { cmd: AgentCommand; label: string; icon: LucideIcon; tone?: "danger" | "primary" }[] {
    const list: { cmd: AgentCommand; label: string; icon: LucideIcon; tone?: "danger" | "primary" }[] = [];
    switch (agent.status) {
        case "offline":
            return [{ cmd: "wake", label: "Wake up", icon: Power, tone: "primary" }];
        case "error":
            list.push({ cmd: "retry", label: "Approve & retry", icon: RotateCcw, tone: "primary" });
            break;
        case "paused":
            list.push({ cmd: "resume", label: "Resume", icon: Play, tone: "primary" });
            break;
        case "working":
        case "thinking":
            list.push({ cmd: "pause", label: "Pause", icon: Pause });
            break;
        default:
            break;
    }
    if (agent.location !== "desk") list.push({ cmd: "recall", label: "Back to desk", icon: House });
    if (agent.location !== "meeting") list.push({ cmd: "meeting", label: "Join War Room", icon: Users });
    if (agent.status === "idle" && agent.location === "desk") list.push({ cmd: "break", label: "Coffee break", icon: Coffee });
    list.push({ cmd: "shutdown", label: "Shut down", icon: Power, tone: "danger" });
    return list;
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-white">{value}</div>
        </div>
    );
}

function Chat({ agent }: { agent: Agent }) {
    const { messages, sendChat } = useOfficeStore(useShallow((s) => ({ messages: s.chats[agent.id], sendChat: s.sendChat })));
    const [text, setText] = useState("");
    const list = useMemo(() => messages ?? [], [messages]);
    const endRef = useRef<HTMLDivElement>(null);
    const waiting = list.length > 0 && list[list.length - 1].from === "user" && agent.status !== "offline";

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [list.length, waiting]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        sendChat(agent.id, t);
        setText("");
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
                {!list.length && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <MessageSquare className="h-6 w-6 text-slate-600" />
                        <p className="text-xs text-slate-500">
                            Talk to {agent.name} directly.
                            <br />
                            Try “what's your status?”
                        </p>
                    </div>
                )}
                {list.map((m) =>
                    m.from === "system" ? (
                        <div key={m.id} className="text-center text-[10px] text-slate-500">
                            {m.text}
                        </div>
                    ) : (
                        <div key={m.id} className={cx("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                            <div
                                className={cx(
                                    "max-w-[85%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug",
                                    m.from === "user" ? "rounded-br-md bg-indigo-500 text-white" : "rounded-bl-md border border-white/10 bg-white/5 text-slate-200",
                                )}
                            >
                                {m.text}
                            </div>
                        </div>
                    ),
                )}
                {waiting && (
                    <div className="flex justify-start">
                        <div className="flex gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3 py-2.5">
                            {[0, 150, 300].map((d) => (
                                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 p-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={`Message ${agent.name}…`}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:opacity-40"
                    aria-label="Send"
                >
                    <Send className="h-3.5 w-3.5" />
                </button>
            </form>
        </div>
    );
}

export function AgentInspector() {
    const router = useRouter();
    const { agent, activity, dataMode, select, command, openScreen } = useOfficeStore(
        useShallow((s) => ({
            agent: s.agents.find((a) => a.id === s.selectedId),
            activity: s.activity,
            dataMode: s.dataMode,
            select: s.select,
            command: s.command,
            openScreen: s.openScreen,
        })),
    );
    const launchOs = useOsUi((s) => s.launch);
    const userRole = useAuthStore((s) => s.user?.role);
    const isTenantOwner = userRole === "tenant_owner";
    const [tab, setTab] = useState<"chat" | "activity">("chat");
    const now = useNow(1000);
    const agentActivity = useMemo(() => (agent ? activity.filter((e) => e.agentId === agent.id).slice(0, 30) : []), [activity, agent]);

    if (!agent) return null;

    const isKasir = isKasirOfficeAgent(agent.id);
    const meta = STATUS_META[agent.status];
    const zone = ZONE_BY_ID[agent.zone];
    const where = agent.location === "meeting" ? "War Room" : agent.location === "lounge" ? "Lounge" : zone.name;

    return (
        <aside
            key={agent.id}
            className={cx(
                GLASS,
                "pointer-events-auto absolute bottom-4 right-4 top-24 flex w-[360px] flex-col overflow-hidden rounded-2xl animate-in fade-in slide-in-from-right-4 duration-300",
            )}
        >
            {/* Header */}
            <div className="relative border-b border-white/10 p-4">
                <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{ background: `radial-gradient(120% 80% at 0% 0%, ${agent.color}33, transparent 60%)` }}
                />
                <div className="relative flex items-start gap-3">
                    <AgentBadge agent={agent} size={48} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-white">{agent.name}</div>
                        <div className="truncate text-xs text-slate-400">{agent.role}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {agent.rosterKind && <RosterKindBadge kind={agent.rosterKind} />}
                            <StatusPill status={agent.status} />
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                                <Cpu className="h-3 w-3" />
                                {agent.model}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => select(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="relative mt-3 text-[11px] text-slate-400">
                    {meta.description} · <span className="text-slate-300">{where}</span>
                </div>
            </div>

            <div className="max-h-[58%] shrink-0 space-y-3 overflow-y-auto border-b border-white/10 p-4">
                {/* Current task */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <Target className="h-3 w-3" />
                            Current task
                        </span>
                        {agent.task && <span className="tabular-nums normal-case tracking-normal">{elapsed(agent.task.startedAt, now)}</span>}
                    </div>
                    {agent.task ? (
                        <>
                            <div className="mb-1.5 flex items-center gap-1.5">
                                <ModuleChip moduleId={agent.task.moduleId} />
                                <span className="truncate font-mono text-[10px] text-slate-500">{agent.task.route}</span>
                            </div>
                            <div className="mb-2 text-[13px] font-medium leading-snug text-white">{agent.task.title}</div>
                            <div className="mb-2.5 flex items-center gap-2">
                                <ProgressBar value={agent.task.progress} color={MODULES[agent.task.moduleId].color} />
                                <span className="w-9 text-right text-[11px] tabular-nums text-slate-300">{Math.round(agent.task.progress * 100)}%</span>
                            </div>
                            <StepList task={agent.task} status={agent.status} dense />
                        </>
                    ) : (
                        <div className="text-xs text-slate-500">No active task — delegate one from the command bar.</div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <button
                            type="button"
                            onClick={() => openScreen(agent.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-400"
                        >
                            <Monitor className="h-3.5 w-3.5" />
                            Watch screen
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push(sessionUrl(agent.task?.route ?? MODULES[agent.modules[0]].route, agent.id))}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open module
                        </button>
                    </div>
                </div>

                {agent.dbId && (
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">Pengaturan toko</span>
                            <Link href="/admin/my-agents" className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200">
                                Semua karyawan
                            </Link>
                        </div>
                        <AgentSettingsPanel
                            agentId={agent.dbId}
                            compact
                            onUpdated={(s) => {
                                if (s.status === "paused" || s.status === "active") {
                                    useOfficeStore.getState().applyEvent({
                                        type: "agent.patch",
                                        agentId: agent.id,
                                        patch: { status: s.status === "paused" ? "paused" : "idle" },
                                    });
                                }
                            }}
                        />
                    </div>
                )}

                {isKasir && agent.rosterKind === "live" && (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-3 text-[11px] text-slate-200">
                        {agent.liveUnavailable ? (
                            <p className="font-medium text-amber-200">{agent.liveUnavailable}</p>
                        ) : agent.liveMetrics ? (
                            <ul className="space-y-1">
                                <li>
                                    <span className="text-slate-400">Chat WA hari ini:</span>{" "}
                                    <span className="font-semibold text-white">{agent.liveMetrics.waChatsToday}</span>
                                </li>
                                <li>
                                    <span className="text-slate-400">Transaksi tercatat:</span>{" "}
                                    <span className="font-semibold text-white">{agent.liveMetrics.transactionsToday}</span>
                                </li>
                                <li>
                                    <span className="text-slate-400">Hermes WA:</span>{" "}
                                    <span className="font-semibold text-white">{agent.liveMetrics.waOnline ? "terhubung" : "offline"}</span>
                                </li>
                                {agent.liveMetrics.lastActivityAt && (
                                    <li className="text-slate-400">
                                        Aktivitas terakhir {timeAgo(agent.liveMetrics.lastActivityAt, now)}
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-amber-200">data tidak tersedia</p>
                        )}
                        <Link href="/admin/connect-wa" className="mt-2 inline-block text-[10px] font-semibold text-indigo-300 hover:text-indigo-200">
                            Hubungkan / kelola WhatsApp →
                        </Link>
                    </div>
                )}

                {/* Agentic OS */}
                <div className="flex items-center gap-1.5 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.07] p-2">
                    <div className="min-w-0 flex-1 text-[11px] leading-tight text-slate-300">
                        {isKasir && agent.rosterKind === "live" ? (
                            <span className="text-emerald-200/90">Kasir UMKM · metrik WA live (read-only)</span>
                        ) : agent.rosterKind === "live" || dataMode === "live" ? (
                            <>
                                <span className="font-semibold text-white">{agent.queued ?? 0}</span> queued ·{" "}
                                <span className={cx("font-semibold", agent.review ? "text-purple-300" : "text-white")}>{agent.review ?? 0}</span> to review
                            </>
                        ) : (
                            <span className="text-slate-400">Demo agent — simulated task progress</span>
                        )}
                    </div>
                    {!isTenantOwner && (
                        <button
                            type="button"
                            onClick={() => launchOs("studio", agent.dbId ? { agentId: agent.dbId } : {})}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/80 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500"
                        >
                            <SlidersHorizontal className="h-3 w-3" /> Customize
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => launchOs("tasks", agent.dbId ? { agentId: agent.dbId } : {})}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                    >
                        <ListTodo className="h-3 w-3" /> Tasks
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <StatTile icon={Zap} label="Tasks done" value={`${agent.stats.tasksCompleted}`} />
                    <StatTile icon={Sparkles} label="Success" value={`${Math.round(agent.stats.successRate * 100)}%`} />
                    <StatTile icon={Gauge} label="Avg latency" value={`${(agent.stats.avgLatencyMs / 1000).toFixed(1)}s`} />
                    <StatTile icon={Activity} label="Tokens today" value={formatTokens(agent.stats.tokensToday)} />
                </div>

                {/* Modules the agent operates in */}
                <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">Works in</div>
                    <div className="flex flex-wrap gap-1">
                        {agent.modules.map((m) => (
                            <ModuleChip key={m} moduleId={m} onClick={() => router.push(sessionUrl(MODULES[m].route, agent.id))} />
                        ))}
                    </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1">
                    {agent.skills.map((s) => (
                        <span key={s} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
                            {s}
                        </span>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                    {actionsFor(agent).map(({ cmd, label, icon: Icon, tone }) => (
                        <button
                            key={cmd}
                            type="button"
                            onClick={() => command(agent.id, cmd)}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                                tone === "primary" && "border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30",
                                tone === "danger" && "border-red-400/20 text-red-300 hover:bg-red-500/15",
                                !tone && "border-white/10 text-slate-200 hover:bg-white/10",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 pt-2">
                {(
                    [
                        { id: "chat", label: "Chat", icon: MessageSquare },
                        { id: "activity", label: "Activity", icon: Activity },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cx(
                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                            tab === t.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
                        )}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === "chat" ? (
                <Chat agent={agent} />
            ) : (
                <div className="flex-1 overflow-y-auto p-2">
                    <ActivityList entries={agentActivity} />
                </div>
            )}
        </aside>
    );
}
