"use client";

/**
 * Agentic OS — per-agent Pulse views used inside the Agent editor:
 *  - Playground: ask the agent something through the real LLM path (same gate,
 *    caps and run log as routines; output is a draft).
 *  - Routines: the agent's scheduled routines + recent runs.
 */

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CalendarClock, Clock, FlaskConical, Play, Send } from "lucide-react";
import { pulseApi } from "../lib/api";
import { describeCron, timeUntil } from "../lib/cron";
import { runPulse, startPulsePolling, usePulseStore } from "../lib/pulseStore";
import { useOsUi } from "../lib/osUi";
import type { OsAgent, OsRun } from "../lib/types";
import { Button, Chip, EmptyState, Section, TextArea, Toggle } from "../ui/kit";
import { RunDetail, RunStatusChip, RunTable } from "./Pulse";

const STARTERS = [
    "Introduce yourself in two sentences and list what you can help with.",
    "What should I look at first today in your modules?",
    "Summarise the current task backlog and suggest priorities.",
    "Draft a short status update for the team lead.",
];

export function AgentPlayground({ agent }: { agent: OsAgent }) {
    useEffect(() => startPulsePolling(8000), []);
    const { status, runs } = usePulseStore(useShallow((s) => ({ status: s.status, runs: s.runs })));
    const [prompt, setPrompt] = useState("");
    const [busy, setBusy] = useState(false);
    const [last, setLast] = useState<OsRun | null>(null);
    const history = runs.filter((r) => r.agentId === agent.id && r.kind === "test").slice(0, 6);

    const ask = async () => {
        if (!prompt.trim()) return;
        setBusy(true);
        const out = await runPulse("Agent answered", () => pulseApi.testAgent(agent.id, prompt.trim()), { silent: true });
        setBusy(false);
        if (out) setLast(out);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-400">
                <FlaskConical className="h-3.5 w-3.5 text-fuchsia-300" />
                Runs through the same gate as routines (kill switch, caps, budget) and is logged.
                <span className="ml-auto flex items-center gap-1.5">
                    <Chip color={status?.llmMode === "live" ? "#a855f7" : "#38bdf8"}>{status?.llmMode === "dry_run" ? "Dry run — no tokens" : "Live LLM"}</Chip>
                    <Chip color={status?.providerReady ? "#22c55e" : "#f59e0b"}>{status?.provider ?? "provider ?"}</Chip>
                </span>
            </div>
            {agent.status !== "active" && (
                <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">{agent.name} is {agent.status} — the gate will block the run.</div>
            )}
            <div className="flex flex-wrap gap-1">
                {STARTERS.map((s) => (
                    <Chip key={s} color="#818cf8" onClick={() => setPrompt(s)}>
                        {s}
                    </Chip>
                ))}
            </div>
            <TextArea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void ask();
                }}
                placeholder={`Ask ${agent.name} something… (Ctrl+Enter)`}
            />
            <div className="flex justify-end">
                <Button variant="primary" icon={Send} loading={busy} disabled={!prompt.trim()} onClick={ask}>
                    Ask {agent.name}
                </Button>
            </div>
            {last && (
                <Section title="Answer" icon={FlaskConical}>
                    <RunDetail run={last} />
                </Section>
            )}
            {history.length > 0 && (
                <Section title="Previous tests" icon={Clock}>
                    <RunTable runs={history} compact onSelect={setLast} selectedId={last?.id} />
                </Section>
            )}
        </div>
    );
}

export function AgentRoutines({ agent }: { agent: OsAgent }) {
    useEffect(() => startPulsePolling(8000), []);
    const { routines, runs } = usePulseStore(useShallow((s) => ({ routines: s.routines, runs: s.runs })));
    const launch = useOsUi((s) => s.launch);
    const mine = routines.filter((r) => r.agentId === agent.id && !r.archivedAt);
    const myRuns = runs.filter((r) => r.agentId === agent.id).slice(0, 10);
    const now = Date.now();

    return (
        <div className="space-y-3">
            <Section
                title={`Routines · ${mine.length}`}
                icon={CalendarClock}
                actions={
                    <Button size="sm" onClick={() => launch("pulse", { tab: "routines" })}>
                        Open Pulse
                    </Button>
                }
            >
                {mine.length ? (
                    <div className="space-y-1">
                        {mine.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] font-semibold text-white">{r.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                        {describeCron(r.cron)} · {r.enabled ? `next ${timeUntil(r.nextRunAt, now)}` : "paused"}
                                    </div>
                                </div>
                                <RunStatusChip status={r.lastStatus} />
                                <span className="w-9">
                                    <Toggle checked={r.enabled} onChange={(v) => void runPulse(v ? "Routine enabled" : "Routine paused", () => pulseApi.setRoutineEnabled(r.id, v))} />
                                </span>
                                <Button size="sm" icon={Play} variant="success" onClick={() => void runPulse(`Ran "${r.name}"`, () => pulseApi.runRoutineNow(r.id))}>
                                    Run
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => launch("pulse", { tab: "routines", routineId: r.id })}>
                                    Edit
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={CalendarClock}
                        title={`${agent.name} has no routines`}
                        hint="Routines let this agent work on a schedule — briefings, checks, playbooks."
                        action={
                            <Button size="sm" variant="primary" onClick={() => launch("pulse", { tab: "routines" })}>
                                Create in Pulse
                            </Button>
                        }
                    />
                )}
            </Section>
            <Section title="Recent runs" icon={Clock}>
                {myRuns.length ? <RunTable runs={myRuns} compact /> : <div className="py-4 text-center text-[12px] text-slate-500">No runs yet.</div>}
            </Section>
        </div>
    );
}
