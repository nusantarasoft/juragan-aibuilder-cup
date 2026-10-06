"use client";

import React, { useEffect, useState } from "react";
import { Bot, Check } from "lucide-react";
import { STATUS_META } from "../lib/floorplan";
import { MODULES, stepIndex, type ModuleId } from "../lib/modules";
import type { Agent, AgentStatus, AgentTask } from "../lib/types";

export function ModuleChip({ moduleId, onClick, className }: { moduleId: ModuleId; onClick?: () => void; className?: string }) {
    const m = MODULES[moduleId];
    const Tag = onClick ? "button" : "span";
    return (
        <Tag
            {...(onClick ? { type: "button" as const, onClick } : {})}
            className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                onClick && "cursor-pointer transition hover:brightness-125",
                className,
            )}
            style={{ background: `${m.color}1f`, color: m.color, border: `1px solid ${m.color}40` }}
            title={onClick ? `Open ${m.name}` : m.route}
        >
            <span className="h-1.5 w-1.5 rounded-sm" style={{ background: m.color }} />
            {m.name}
        </Tag>
    );
}

/** Checklist of the scripted steps an agent performs inside a module. */
export function StepList({ task, status, dense }: { task: AgentTask; status: AgentStatus; dense?: boolean }) {
    const current = stepIndex(task.progress, task.steps.length);
    const color = MODULES[task.moduleId].color;
    const running = status === "working" || status === "thinking";
    return (
        <ol className={cx("space-y-1", dense && "space-y-0.5")}>
            {task.steps.map((step, i) => {
                const done = i < current;
                const now = i === current;
                return (
                    <li key={step} className="flex items-center gap-2">
                        <span
                            className={cx(
                                "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px]",
                                done ? "border-transparent" : now ? "border-transparent" : "border-white/20",
                            )}
                            style={done ? { background: `${color}40` } : now ? { background: color } : undefined}
                        >
                            {done && <Check className="h-2.5 w-2.5" style={{ color }} />}
                            {now && running && <span className="absolute inset-0 animate-ping rounded-full opacity-50" style={{ background: color }} />}
                        </span>
                        <span
                            className={cx(
                                "text-[11px] leading-snug",
                                done ? "text-slate-500 line-through decoration-slate-600" : now ? "font-semibold text-white" : "text-slate-400",
                            )}
                        >
                            {step}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const GLASS =
    "border border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl";

export function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

export function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
}

export function relativeTime(ts: number, now: number) {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.round(m / 60)}h ago`;
}

export function elapsed(ts: number, now: number) {
    const s = Math.max(0, Math.round((now - ts) / 1000));
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function AgentBadge({ agent, size = 36 }: { agent: Agent; size?: number }) {
    const color = STATUS_META[agent.status].color;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <div
                className="flex h-full w-full items-center justify-center rounded-xl"
                style={{
                    background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}11)`,
                    border: `1px solid ${agent.color}66`,
                    boxShadow: agent.status === "offline" ? undefined : `0 0 18px -6px ${agent.color}`,
                }}
            >
                <Bot style={{ color: agent.status === "offline" ? "#64748b" : agent.color, width: size * 0.5, height: size * 0.5 }} />
            </div>
            <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950"
                style={{ background: color }}
            />
        </div>
    );
}

export function StatusPill({ status, className }: { status: AgentStatus; className?: string }) {
    const meta = STATUS_META[status];
    return (
        <span
            className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", className)}
            style={{ background: `${meta.color}1f`, color: meta.color, border: `1px solid ${meta.color}40` }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
        </span>
    );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(value * 100)}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }}
            />
        </div>
    );
}

export function IconButton({
    onClick,
    active,
    title,
    children,
    disabled,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={cx(
                "flex h-9 w-9 items-center justify-center rounded-xl transition",
                active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
                disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
        >
            {children}
        </button>
    );
}
