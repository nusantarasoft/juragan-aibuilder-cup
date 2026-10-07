"use client";

import React from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { TextInput } from "./kit";

/** Ordered list editor for playbook / task steps. */
export function StepsEditor({ steps, onChange, color = "#818cf8" }: { steps: string[]; onChange: (s: string[]) => void; color?: string }) {
    const update = (i: number, v: string) => onChange(steps.map((s, j) => (j === i ? v : s)));
    const move = (i: number, d: -1 | 1) => {
        const j = i + d;
        if (j < 0 || j >= steps.length) return;
        const next = [...steps];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    return (
        <div className="space-y-1.5">
            {steps.map((s, i) => (
                <div key={i} className="group flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: `${color}26`, color }}>
                        {i + 1}
                    </span>
                    <TextInput value={s} onChange={(e) => update(i, e.target.value)} placeholder={`Step ${i + 1}`} className="py-1" />
                    <div className="flex shrink-0 opacity-40 transition group-hover:opacity-100">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => onChange(steps.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-300" aria-label="Remove step">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...steps, ""])} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/10">
                <Plus className="h-3 w-3" /> Add step
            </button>
        </div>
    );
}
