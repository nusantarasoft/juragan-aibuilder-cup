"use client";

import React, { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ArrowUp, Terminal } from "lucide-react";
import { useOfficeStore } from "../lib/store";
import { LEVEL_ICON } from "./AgentRoster";
import { GLASS, ModuleChip, ORANGE, cx } from "./shared";

const SUGGESTIONS = [
    "Triage unanswered WhatsApp customer chats",
    "Evaluate system prompts for UMKM assistant",
    "Index new UMKM FAQ & product docs",
    "Draft weekly UMKM promo campaign",
    "Verify WhatsApp Gateway session & webhook",
];

/** Latest events floating above the command dock. */
function LiveTicker() {
    const activity = useOfficeStore((s) => s.activity);
    const select = useOfficeStore((s) => s.select);
    const latest = activity.slice(0, 2);
    return (
        <div className="mb-1.5 flex flex-col items-center gap-1 font-mono">
            {latest.map((e, i) => {
                const { icon: Icon, color } = LEVEL_ICON[e.level];
                return (
                    <button
                        key={e.id}
                        type="button"
                        onClick={() => e.agentId && select(e.agentId)}
                        className={cx(
                            GLASS,
                            "pointer-events-auto flex max-w-full items-center gap-2 px-2.5 py-1 text-[10.5px] transition animate-in fade-in slide-in-from-bottom-2 duration-300",
                        )}
                        style={{ opacity: 1 - i * 0.25 }}
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

    return (
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-30 w-full max-w-[620px] -translate-x-1/2 px-4 font-mono">
            <LiveTicker />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit(text);
                }}
                className={cx(
                    "aos-dock pointer-events-auto border border-white/15 bg-[#0b0e13]/95 p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-xl transition",
                    focused && "border-orange-400/60",
                )}
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-orange-400/50 bg-orange-500/15">
                        <Terminal className="h-3.5 w-3.5" color={ORANGE} />
                    </div>
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setTimeout(() => setFocused(false), 150)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="delegate a task to the office… (press / to focus)"
                        className="min-w-0 flex-1 bg-transparent text-[12px] text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <select
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="hidden max-w-[150px] border border-white/15 bg-[#0b0e13] px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none sm:block"
                        title="Assignee"
                    >
                        <option value="auto">auto-assign</option>
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center border border-orange-400/60 bg-orange-500/20 text-orange-100 transition hover:bg-orange-500/35 disabled:opacity-30"
                        aria-label="Dispatch task"
                    >
                        <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                </div>
                {focused && !text && (
                    <div className="mt-1.5 flex flex-wrap gap-1 border-t border-white/10 px-1 pt-1.5">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void submit(s)}
                                className="border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] text-slate-300 transition hover:border-orange-400/50 hover:text-white"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </form>
        </div>
    );
}
