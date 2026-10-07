"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Bot, Box, Brain, CheckCircle2, ChevronDown, ChevronRight, CircleCheck, Clock, Crosshair, FileText, Layers, ListTodo, Maximize2, Network, Play, Settings2, ShieldAlert, Sparkles, Target, Timer, Workflow, Zap } from "lucide-react";
import { useAosStore } from "../../lib/store";
import { useShallow } from "zustand/react/shallow";
import { useDeckStore, useDeckUi, startDeckPolling } from "../../lib/deckStore";
import { usePulseStore, startPulsePolling } from "../../lib/pulseStore";
import { buildModel, layoutFor, visibleIds, TYPE_META, TYPE_KEYS } from "../../lib/deckGraph";
import { addDays } from "../../lib/deckTime";
import { AppId, AppParams } from "../../lib/osUi";
import { DeckGraphSvg } from "./DeckGraph";
import { DeckTimeline } from "./DeckTimeline";
import DeckOrbit from "./DeckOrbit";
import { GoalEditor, GoalReviewDialog } from "./DeckGoals";

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
}

export function CommandDeck({ onOpen }: { onOpen: (app: AppId, params?: AppParams) => void }) {
    // Stores
    const { agents, playbooks, tasks, areas, items, routines, workflows, workflowRuns, stats, lastSync } = useAosStore(
        useShallow((s: any) => ({
            agents: s.agents, playbooks: s.playbooks, tasks: s.tasks, areas: s.areas, items: s.items,
            routines: s.routines, workflows: s.workflows, workflowRuns: s.workflowRuns, stats: s.stats, lastSync: s.lastSync
        }))
    );
    const pulseStore = usePulseStore(useShallow((s: any) => ({ runs: s.runs, status: s.status, state: s.state, pulseSync: s.lastSync })));
    const deckStore = useDeckStore(useShallow((s: any) => ({ goals: s.goals, reviews: s.reviews, deckStats: s.stats })));
    const ui = useDeckUi();

    useEffect(() => {
        const u1 = startPulsePolling(10000);
        const u2 = startDeckPolling(30000);
        return () => { u1(); u2(); };
    }, []);

    // Time ticks
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const stale = lastSync ? now - lastSync > 15000 : true;

    // Graph model
    const { model, layout, visible } = useMemo(() => {
        const m = buildModel({
            agents, playbooks, tasks, areas, items, routines, workflows, workflowRuns,
            runs: pulseStore.runs, goals: deckStore.goals, now: Date.now()
        });
        const l = (ui.view === "timeline" || ui.view === "orbit") ? { nodes: [], links: [], labels: [], pts: [], size: 1000, pos: new Map(), guides: [] } : layoutFor(ui.view as any, m);
        const types = new Set(TYPE_KEYS); // mock filters for now
        const v = visibleIds(m, types, null);
        return { model: m, layout: l, visible: v };
    }, [agents, playbooks, tasks, areas, items, routines, workflows, workflowRuns, pulseStore.runs, deckStore.goals, ui.view]);

    const [fitNonce, setFitNonce] = useState(0);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Goal modals
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [reviewingGoal, setReviewingGoal] = useState<string | null>(null);

    const leftCol = ui.focus ? null : (
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2">TIME / TODAY</div>
                <div className="text-2xl font-mono text-slate-100">{new Date(now).toLocaleTimeString()}</div>
                <div className="text-xs text-slate-500 mt-1">Week {Math.ceil(new Date(now).getTime() / (1000 * 60 * 60 * 24 * 7))}</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2">CONNECTIONS</div>
                <div className="flex flex-col gap-2 font-mono text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-400">PULSE</span>
                        <span className={pulseStore.state === "running" ? "text-green-400" : "text-amber-400"}>{pulseStore.state.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">DATA</span>
                        <span className={stale ? "text-amber-400" : "text-green-400"}>{stale ? "STALE" : "SYNCED"}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2 flex justify-between items-center">
                    <span>GOALS & GATES</span>
                    <button onClick={() => setEditingGoal("new")} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-white">+</button>
                </div>
                <div className="flex flex-col gap-3">
                    {deckStore.goals.length === 0 ? <div className="text-xs text-slate-500 italic">No goals active</div> :
                        deckStore.goals.map((g: any) => (
                            <div key={g.id} className="border border-slate-800 rounded p-2 bg-slate-950/30">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-sm text-slate-200 font-medium truncate" style={{ color: g.color }}>{g.title}</div>
                                </div>
                                <div className="text-xs text-slate-400 truncate mb-2">{g.metric}: {g.currentValue ?? 0}/{g.targetValue ?? 0} {g.unit}</div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                    <div className="h-full" style={{ width: `${(g.progress || 0) * 100}%`, backgroundColor: g.color }} />
                                </div>
                                <div className="flex justify-between gap-2 mt-2">
                                    <button onClick={() => setEditingGoal(g.id)} className="text-[10px] text-slate-400 hover:text-white uppercase font-mono">Edit</button>
                                    <button onClick={() => setReviewingGoal(g.id)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded uppercase font-mono">Review</button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2">PIPELINE BACKLOG</div>
                <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Tasks Overdue</span><span className="text-red-400">{deckStore.deckStats?.week.overdueTasks ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Reviews Waiting</span><span className="text-amber-400">{deckStore.deckStats?.week.reviewsWaiting ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Pending Approvals</span><span className="text-amber-400">{(deckStore.deckStats?.week.approvalsTotal ?? 0) - (deckStore.deckStats?.week.approvalsDecided ?? 0)}</span></div>
                </div>
            </div>
        </div>
    );

    const rightCol = ui.focus ? null : (
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2">ACTIVITY (THIS WEEK)</div>
                <div className="flex flex-col gap-2 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Tasks Done</span><span className="text-slate-200">{deckStore.deckStats?.week.tasksDone ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Runs</span><span className="text-slate-200">{deckStore.deckStats?.week.runs ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Notes Added</span><span className="text-slate-200">{deckStore.deckStats?.week.notesAdded ?? 0}</span></div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-sm font-mono text-slate-400 mb-2">SKILLS DECK</div>
                <div className="grid grid-cols-2 gap-2">
                    {playbooks.slice(0, 6).map((pb: any) => (
                        <div key={pb.id} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded p-2 cursor-pointer flex flex-col justify-between" onClick={() => onOpen("playbooks")}>
                            <div className="text-[10px] font-mono text-slate-400 uppercase truncate">{pb.moduleId}</div>
                            <div className="text-xs text-slate-200 font-medium truncate mt-1">{pb.title}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex-1">
                <div className="text-sm font-mono text-slate-400 mb-2">ROUTINES</div>
                <div className="flex flex-col gap-2">
                    {routines.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded bg-slate-950/30 border border-slate-800/50 cursor-pointer hover:border-slate-600" onClick={() => onOpen("pulse", { routineId: r.id })}>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-slate-200 truncate">{r.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono truncate">{r.cron}</span>
                            </div>
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", r.enabled ? "bg-green-500" : "bg-slate-600")} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-black text-slate-300 font-sans overflow-hidden selection:bg-slate-700">
            {/* Top Bar */}
            <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-950 flex-shrink-0">
                <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">CORE:</span>
                        <span className={pulseStore.state === "running" ? "text-green-400" : "text-slate-300"}>{pulseStore.state.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">RUNNER:</span>
                        <span className="text-slate-200">{stats?.runningTasks ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">SYNC:</span>
                        <span className={stale ? "text-amber-400" : "text-green-400"}>{lastSync ? Math.floor((now - lastSync)/1000) + "s ago" : "WAITING"}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-900 rounded p-1 border border-slate-800">
                        {["rings", "circle", "areas", "links", "timeline", "orbit"].map(v => (
                            <button
                                key={v}
                                onClick={() => ui.patch({ view: v as any })}
                                className={cn("px-2 py-1 text-xs font-mono uppercase rounded", ui.view === v ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => ui.patch({ focus: !ui.focus })} className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                {leftCol}
                
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg relative overflow-hidden flex flex-col">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <button onClick={() => ui.patch({ names: !ui.names })} className={cn("px-2 py-1 text-xs font-mono border rounded", ui.names ? "bg-slate-800 border-slate-600 text-white" : "bg-slate-900/50 border-slate-800 text-slate-500")}>NAMES</button>
                        <button onClick={() => ui.patch({ motion: !ui.motion })} className={cn("px-2 py-1 text-xs font-mono border rounded", ui.motion ? "bg-slate-800 border-slate-600 text-white" : "bg-slate-900/50 border-slate-800 text-slate-500")}>MOTION</button>
                        <button onClick={() => setFitNonce(n => n + 1)} className="px-2 py-1 text-xs font-mono border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white rounded">FIT</button>
                    </div>

                    <div className="flex-1 relative">
                        {ui.view === "timeline" ? (
                            <DeckTimeline onOpen={onOpen} motion={ui.motion} />
                        ) : ui.view === "orbit" ? (
                            <DeckOrbit model={model} visible={visible} names={ui.names} motion={ui.motion} selected={selectedId} onSelect={(id) => setSelectedId(id)} />
                        ) : (
                            <DeckGraphSvg
                                model={model} layout={layout} visible={visible} names={ui.names} motion={ui.motion}
                                search={search} selected={selectedId} onSelect={setSelectedId} onIsolate={() => {}}
                                fitNonce={fitNonce} ringView={ui.view === "rings"}
                            />
                        )}
                    </div>
                </div>

                {rightCol}
            </div>

            {/* Modals */}
            {editingGoal && (
                <GoalEditor goal={editingGoal === "new" ? null : deckStore.goals.find((g: any) => g.id === editingGoal) ?? null} onClose={() => setEditingGoal(null)} onSaved={() => setEditingGoal(null)} />
            )}
            {reviewingGoal && deckStore.goals.find((g: any) => g.id === reviewingGoal) && (
                <GoalReviewDialog goal={deckStore.goals.find((g: any) => g.id === reviewingGoal)!} onClose={() => setReviewingGoal(null)} />
            )}
        </div>
    );
}
