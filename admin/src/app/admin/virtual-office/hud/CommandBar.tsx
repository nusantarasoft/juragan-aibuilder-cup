"use client";

import React, { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ArrowUp, Sparkles } from "lucide-react";
import { useOfficeStore } from "../lib/store";
import { LEVEL_ICON } from "./AgentRoster";
import { GLASS, ModuleChip, cx } from "./shared";

const SUGGESTIONS = [
    "Triage new ITSM tickets",
    "Morning Command Center briefing",
    "Investigate the 5xx spike on Kong",
    "Reconcile this week's invoices",
    "Groom the sprint backlog",
];

/** Latest events floating above the command bar. */
function LiveTicker() {
    const activity = useOfficeStore((s) => s.activity);
    const select = useOfficeStore((s) => s.select);
    const latest = activity.slice(0, 3);
    return (
        <div className="mb-2 flex flex-col items-center gap-1">
            {latest.map((e, i) => {
                const { icon: Icon, color } = LEVEL_ICON[e.level];
                return (
                    <button
                        key={e.id}
                        type="button"
                        onClick={() => e.agentId && select(e.agentId)}
                        className={cx(
                            GLASS,
                            "pointer-events-auto flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-[11px] transition animate-in fade-in slide-in-from-bottom-2 duration-500",
                        )}
                        style={{ opacity: 1 - i * 0.3 }}
                    >
                        <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                        {e.moduleId && <ModuleChip moduleId={e.moduleId} />}
                        <span className="truncate text-slate-200">{e.message}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function CommandBar() {
    const { agents, dispatchTask, select } = useOfficeStore(
        useShallow((s) => ({ agents: s.agents, dispatchTask: s.dispatchTask, select: s.select })),
    );
    const [text, setText] = useState("");
    const [assignee, setAssignee] = useState<string>("auto");
    const [busy, setBusy] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // "/" focuses the command bar.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (useOfficeStore.getState().screenAgentId) return;
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const submit = async (title: string) => {
        const t = title.trim();
        if (!t || busy) return;
        setBusy(true);
        const id = await dispatchTask(t, assignee === "auto" ? undefined : assignee);
        setBusy(false);
        setText("");
        inputRef.current?.blur();
        if (id) select(id);
    };

    const inspectorOpen = useOfficeStore((s) => s.selectedId !== null);

    return (
        <div
            className={cx(
                "pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center px-4 lg:left-[316px]",
                inspectorOpen && "lg:right-[376px]",
            )}
        >
            <div className="w-full max-w-[640px]">
                <LiveTicker />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit(text);
                    }}
                    className={cx(
                        GLASS,
                        "pointer-events-auto rounded-2xl p-2 transition",
                        focused && "border-indigo-400/40 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]",
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setTimeout(() => setFocused(false), 150)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Delegate a task to the office…  (press / to focus)"
                            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                        />
                        <select
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                            className="hidden max-w-[150px] rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:outline-none sm:block"
                            title="Assignee"
                        >
                            <option value="auto">✨ Auto-assign</option>
                            {agents
                                .filter((a) => a.status !== "offline")
                                .map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} · {a.role}
                                    </option>
                                ))}
                        </select>
                        <button
                            type="submit"
                            disabled={!text.trim() || busy}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 transition hover:bg-indigo-100 disabled:opacity-30"
                            aria-label="Dispatch task"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                    </div>
                    {focused && !text && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 px-1 pt-2">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => void submit(s)}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-indigo-400/40 hover:text-white"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
