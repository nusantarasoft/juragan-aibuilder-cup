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
    MousePointer2,
    Pause,
    Play,
    Power,
    RotateCcw,
    Send,
    SlidersHorizontal,
    Sparkles,
    Target,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { useOsUi } from "@/components/agentic-os/registry";
import { STATUS_META, ZONES, ZONE_BY_ID } from "../lib/floorplan";
import { MODULES, sessionUrl } from "../lib/modules";
import { useOfficeStore } from "../lib/store";
import type { Agent, AgentCommand } from "../lib/types";
import { ActivityList } from "./AgentRoster";
import { RosterKindBadge } from "@/components/agentic-os/ui/RosterKindBadge";
import { timeAgo } from "@/components/agentic-os/ui/kit";
import Link from "next/link";
import { AgentBadge, ModuleChip, ORANGE, OfficeSidePanel, ProgressBar, Section, StatusPill, StepList, cx, elapsed, formatTokens, useNow } from "./shared";
import { AgentSettingsPanel } from "@/components/tenant-agents/AgentSettingsPanel";
import { isKasirOfficeAgent } from "@/components/agentic-os/lib/firstEmployee";
import { useAuthStore } from "@/store/useAuthStore";

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
        <div className="border border-white/10 bg-white/[0.02] px-2.5 py-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-white">{value}</div>
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
        <div className="flex flex-col font-mono">
            <div className="max-h-56 space-y-2 overflow-y-auto py-1">
                {!list.length && (
                    <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                        <MessageSquare className="h-5 w-5 text-slate-500" />
                        <p className="text-[11px] text-slate-500">
                            Direct channel to {agent.name}.
                            <br />
                            Try &ldquo;what&apos;s your status?&rdquo;
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
                                    "max-w-[88%] border px-2.5 py-1.5 text-[11px] leading-snug",
                                    m.from === "user"
                                        ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                                        : "border-white/10 bg-white/[0.03] text-slate-200",
                                )}
                            >
                                {m.text}
                            </div>
                        </div>
                    ),
                )}
                {waiting && (
                    <div className="flex justify-start">
                        <div className="flex gap-1 border border-white/10 bg-white/[0.03] px-3 py-2">
                            {[0, 150, 300].map((d) => (
                                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>
            <form onSubmit={submit} className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={`message ${agent.name.toLowerCase()}…`}
                    className="flex-1 border border-white/15 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="flex h-7 w-7 items-center justify-center border border-orange-400/60 bg-orange-500/15 text-orange-200 transition hover:bg-orange-500/25 disabled:opacity-35"
                    aria-label="Send"
                >
                    <Send className="h-3 w-3" />
                </button>
            </form>
        </div>
    );
}

export function AgentInspector() {
    const router = useRouter();
    const { agents, agent, activity, dataMode, select, command, openScreen, focusOnZone } = useOfficeStore(
        useShallow((s) => ({
            agents: s.agents,
            agent: s.agents.find((a) => a.id === s.selectedId),
            activity: s.activity,
            dataMode: s.dataMode,
            select: s.select,
            command: s.command,
            openScreen: s.openScreen,
            focusOnZone: s.focusOnZone,
        })),
    );
    const launchOs = useOsUi((s) => s.launch);
    const userRole = useAuthStore((s) => s.user?.role);
    const isTenantOwner = userRole === "tenant_owner";
    const [tab, setTab] = useState<"chat" | "activity">("chat");
    const now = useNow(1000);
    const agentActivity = useMemo(() => (agent ? activity.filter((e) => e.agentId === agent.id).slice(0, 30) : []), [activity, agent]);

    if (!agent) {
        const activeTasks = agents.filter((a) => a.task && (a.status === "working" || a.status === "thinking"));
        return (
            <OfficeSidePanel
                id="right"
                title="Floor · Telemetry"
                summary={`${activeTasks.length} active tasks · ${ZONES.length} zones`}
                accent="#38bdf8"
                defaultSide="pinned-right"
                defaultW={300}
            >
                <Section
                    title="Floor zones"
                    right={
                        <button type="button" onClick={() => launchOs("overview")} className="text-[9px] uppercase tracking-wider text-slate-400 hover:text-white">
                            deck ▶
                        </button>
                    }
                >
                    <div className="space-y-1.5">
                        {ZONES.map((z) => {
                            const zAgents = agents.filter((a) => a.zone === z.id);
                            const zBusy = zAgents.filter((a) => a.status === "working" || a.status === "thinking").length;
                            return (
                                <button
                                    key={z.id}
                                    type="button"
                                    onClick={() => focusOnZone(z.id)}
                                    className="flex w-full items-center justify-between border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-left transition hover:border-white/25 hover:bg-white/[0.04]"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ background: z.color }} />
                                        <span className="text-[11px] font-semibold text-white">{z.name}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {zBusy}/{zAgents.length} active
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Section>

                <Section title={`Active floor tasks (${activeTasks.length})`}>
                    {activeTasks.length === 0 ? (
                        <div className="text-[11px] text-slate-500">No tasks currently running on the floor.</div>
                    ) : (
                        <div className="space-y-2">
                            {activeTasks.map((a) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => select(a.id)}
                                    className="block w-full border border-white/10 bg-white/[0.02] p-2 text-left transition hover:border-white/25"
                                >
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <span className="font-semibold text-white">{a.name}</span>
                                        <ModuleChip moduleId={a.task!.moduleId} />
                                    </div>
                                    <div className="mt-1 truncate text-[11px] text-slate-300">{a.task!.title}</div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <ProgressBar value={a.task!.progress} color={STATUS_META[a.status].color} />
                                        <span className="text-[9.5px] tabular-nums text-slate-400">{Math.round(a.task!.progress * 100)}%</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="3D navigation & keys" className="border-b-0">
                    <div className="space-y-1.5 text-[10.5px] leading-relaxed text-slate-400">
                        <div className="flex items-center gap-1.5 text-slate-200">
                            <MousePointer2 className="h-3 w-3" color={ORANGE} />
                            <span>Click any agent or desk monitor</span>
                        </div>
                        <div>· Drag to orbit · Right-drag to pan · Wheel zoom</div>
                        <div>· Keys: [1] Overview · [2] Top · [F] Follow</div>
                        <div>· Keys: [L] Labels · [N] Day/Night · [/] Delegate</div>
                    </div>
                </Section>
            </OfficeSidePanel>
        );
    }

    const isKasir = isKasirOfficeAgent(agent.id);
    const meta = STATUS_META[agent.status];
    const zone = ZONE_BY_ID[agent.zone];
    const where = agent.location === "meeting" ? "War Room" : agent.location === "lounge" ? "Lounge" : zone.name;

    return (
        <OfficeSidePanel
            id="right"
            title={`Agent · ${agent.name}`}
            summary={`${meta.label} · ${where}`}
            accent={agent.color}
            defaultSide="pinned-right"
            defaultW={320}
            onClose={() => select(null)}
        >
            <Section
                title="Identity & status"
                right={
                    <button type="button" onClick={() => select(null)} className="text-[9px] uppercase tracking-wider text-slate-400 hover:text-white">
                        all floor ▶
                    </button>
                }
            >
                <div className="flex items-start gap-3">
                    <AgentBadge agent={agent} size={42} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-white">{agent.name}</div>
                        <div className="truncate text-[11px] text-slate-400">{agent.role}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {agent.rosterKind && <RosterKindBadge kind={agent.rosterKind} />}
                            <StatusPill status={agent.status} />
                            <span className="inline-flex items-center gap-1 border border-white/15 px-1.5 py-0.5 text-[9.5px] text-slate-300">
                                <Cpu className="h-2.5 w-2.5" />
                                {agent.model}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-[10.5px] text-slate-400">
                    {meta.description} · <span className="text-slate-200">{where}</span>
                </div>
            </Section>

            <Section
                title="Current task"
                right={agent.task ? <span className="text-[9.5px] tabular-nums text-slate-400">{elapsed(agent.task.startedAt, now)}</span> : undefined}
            >
                {agent.task ? (
                    <>
                        <div className="mb-1.5 flex items-center gap-1.5">
                            <ModuleChip moduleId={agent.task.moduleId} />
                            <span className="truncate text-[10px] text-slate-500">{agent.task.route}</span>
                        </div>
                        <div className="mb-2 text-[12px] font-medium leading-snug text-white">{agent.task.title}</div>
                        <div className="mb-2 flex items-center gap-2">
                            <ProgressBar value={agent.task.progress} color={MODULES[agent.task.moduleId].color} />
                            <span className="w-9 text-right text-[10.5px] tabular-nums text-slate-300">{Math.round(agent.task.progress * 100)}%</span>
                        </div>
                        <StepList task={agent.task} status={agent.status} dense />
                    </>
                ) : (
                    <div className="text-[11px] text-slate-500">No active task — delegate one from the bottom command dock.</div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => openScreen(agent.id)}
                        className="inline-flex items-center justify-center gap-1.5 border border-orange-400/50 bg-orange-500/15 px-2 py-1 text-[10.5px] text-orange-100 transition hover:border-orange-300 hover:text-white"
                    >
                        <Monitor className="h-3 w-3" />
                        watch screen
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(sessionUrl(agent.task?.route ?? MODULES[agent.modules[0]].route, agent.id))}
                        className="inline-flex items-center justify-center gap-1.5 border border-white/15 px-2 py-1 text-[10.5px] text-slate-200 transition hover:border-white/35 hover:text-white"
                    >
                        <ExternalLink className="h-3 w-3" />
                        open module
                    </button>
                </div>
            </Section>

            {agent.dbId && (
                <Section title="Pengaturan toko">
                    <div className="mb-1.5 flex items-center justify-end">
                        <Link href="/admin/my-agents" className="text-[10px] font-semibold text-orange-200/90 hover:text-orange-100">
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
                </Section>
            )}

            {isKasir && agent.rosterKind === "live" && (
                <Section title="Metrik Kasir UMKM (read-only)">
                    {agent.liveUnavailable ? (
                        <p className="text-[11px] font-medium text-amber-200">{agent.liveUnavailable}</p>
                    ) : agent.liveMetrics ? (
                        <ul className="space-y-1 text-[11px] text-slate-200">
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
                                <li className="text-slate-400">Aktivitas terakhir {timeAgo(agent.liveMetrics.lastActivityAt, now)}</li>
                            )}
                        </ul>
                    ) : (
                        <p className="text-[11px] text-amber-200">data tidak tersedia</p>
                    )}
                    <Link href="/admin/connect-wa" className="mt-2 inline-block text-[10px] font-semibold text-orange-200/90 hover:text-orange-100">
                        Hubungkan / kelola WhatsApp →
                    </Link>
                </Section>
            )}

            <Section title="Agentic OS & metrics">
                <div className="mb-2 flex items-center justify-between gap-2 border border-white/10 bg-white/[0.02] p-2 text-[10.5px]">
                    <div className="min-w-0 flex-1 text-slate-300">
                        {isKasir && agent.rosterKind === "live" ? (
                            <span className="text-emerald-200/90">Kasir UMKM · metrik WA live (read-only)</span>
                        ) : agent.rosterKind === "live" || dataMode === "live" ? (
                            <>
                                <span className="text-white">{agent.queued ?? 0}</span> queued ·{" "}
                                <span className={cx("text-white", agent.review ? "text-purple-300" : undefined)}>{agent.review ?? 0}</span> to review
                            </>
                        ) : (
                            <span className="text-slate-400">Demo agent — simulated task progress</span>
                        )}
                    </div>
                    {!isTenantOwner && (
                        <button
                            type="button"
                            onClick={() => launchOs("studio", agent.dbId ? { agentId: agent.dbId } : {})}
                            className="inline-flex items-center gap-1 border border-orange-400/50 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-200 hover:border-orange-300 hover:text-white"
                        >
                            <SlidersHorizontal className="h-2.5 w-2.5" /> studio
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => launchOs("tasks", agent.dbId ? { agentId: agent.dbId } : {})}
                        className="inline-flex items-center gap-1 border border-white/15 px-2 py-0.5 text-[10px] text-slate-200 hover:border-white/35 hover:text-white"
                    >
                        <ListTodo className="h-2.5 w-2.5" /> tasks
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                    <StatTile icon={Zap} label="Tasks done" value={`${agent.stats.tasksCompleted}`} />
                    <StatTile icon={Sparkles} label="Success" value={`${Math.round(agent.stats.successRate * 100)}%`} />
                    <StatTile icon={Gauge} label="Latency" value={`${(agent.stats.avgLatencyMs / 1000).toFixed(1)}s`} />
                    <StatTile icon={Activity} label="Tokens" value={formatTokens(agent.stats.tokensToday)} />
                </div>

                <div className="mt-2.5">
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Modules & skills</div>
                    <div className="flex flex-wrap gap-1">
                        {agent.modules.map((m) => (
                            <ModuleChip key={m} moduleId={m} onClick={() => router.push(sessionUrl(MODULES[m].route, agent.id))} />
                        ))}
                        {agent.skills.map((s) => (
                            <span key={s} className="border border-white/10 bg-white/[0.02] px-1.5 py-0.5 text-[9.5px] text-slate-300">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                    {actionsFor(agent).map(({ cmd, label, icon: Icon, tone }) => (
                        <button
                            key={cmd}
                            type="button"
                            onClick={() => command(agent.id, cmd)}
                            className={cx(
                                "inline-flex items-center gap-1 border px-2 py-1 text-[10px] transition",
                                tone === "primary" && "border-orange-400/50 bg-orange-500/15 text-orange-200 hover:border-orange-300 hover:text-white",
                                tone === "danger" && "border-red-400/30 text-red-300 hover:bg-red-500/15",
                                !tone && "border-white/15 text-slate-200 hover:border-white/35 hover:text-white",
                            )}
                        >
                            <Icon className="h-3 w-3" />
                            {label}
                        </button>
                    ))}
                </div>
            </Section>

            <Section
                title={
                    <div className="flex items-center gap-3">
                        {(
                            [
                                { id: "chat", label: "CHAT" },
                                { id: "activity", label: `LOG (${agentActivity.length})` },
                            ] as const
                        ).map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={cx("transition", tab === t.id ? "text-white underline underline-offset-4" : "text-slate-500 hover:text-slate-300")}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                }
                className="flex-1 border-b-0"
            >
                {tab === "chat" ? <Chat agent={agent} /> : <ActivityList entries={agentActivity} />}
            </Section>
        </OfficeSidePanel>
    );
}
