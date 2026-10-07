"use client";

/** Agentic OS — small dark UI kit (Tailwind), matches the Virtual Office glass style. */

import React from "react";
import { CircleCheck, Info, LoaderCircle, X, XCircle, type LucideIcon } from "lucide-react";
import { useAosStore } from "../lib/store";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnVariant = "primary" | "subtle" | "ghost" | "danger" | "success";

export function Button({
    children,
    onClick,
    variant = "subtle",
    size = "md",
    icon: Icon,
    disabled,
    loading,
    title,
    type = "button",
    className,
}: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: BtnVariant;
    size?: "sm" | "md";
    icon?: LucideIcon;
    disabled?: boolean;
    loading?: boolean;
    title?: string;
    type?: "button" | "submit";
    className?: string;
}) {
    const styles: Record<BtnVariant, string> = {
        primary: "bg-indigo-500 text-white hover:bg-indigo-400 border-transparent",
        subtle: "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10",
        ghost: "border-transparent text-slate-300 hover:bg-white/10 hover:text-white",
        danger: "border-red-400/25 text-red-300 hover:bg-red-500/15",
        success: "bg-emerald-500 text-white hover:bg-emerald-400 border-transparent",
    };
    return (
        <button
            type={type}
            title={title}
            disabled={disabled || loading}
            onClick={onClick}
            className={cx(
                "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]",
                styles[variant],
                className,
            )}
        >
            {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {children}
        </button>
    );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={cx("block space-y-1", className)}>
            <span className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                {hint && <span className="truncate text-[10px] text-slate-500">{hint}</span>}
            </span>
            {children}
        </label>
    );
}

const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} onKeyDown={(e) => { e.stopPropagation(); props.onKeyDown?.(e); }} className={cx(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} onKeyDown={(e) => { e.stopPropagation(); props.onKeyDown?.(e); }} className={cx(inputCls, "min-h-[72px] resize-y leading-relaxed", props.className)} />;
}

export function Select({
    value,
    onChange,
    options,
    className,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    disabled?: boolean;
}) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={cx(inputCls, "appearance-auto bg-slate-900", className)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left disabled:opacity-40"
        >
            {(label || hint) && (
                <span className="min-w-0">
                    {label && <span className="block text-[12px] font-medium text-slate-200">{label}</span>}
                    {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
                </span>
            )}
            <span className={cx("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-indigo-500" : "bg-white/15")}>
                <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
            </span>
        </button>
    );
}

export function Chip({
    children,
    color = "#94a3b8",
    active,
    onClick,
    className,
    title,
}: {
    children: React.ReactNode;
    color?: string;
    active?: boolean;
    onClick?: () => void;
    className?: string;
    title?: string;
}) {
    const Tag = onClick ? "button" : "span";
    return (
        <Tag
            {...(onClick ? { type: "button" as const, onClick } : {})}
            title={title}
            className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition",
                onClick && "cursor-pointer hover:brightness-125",
                className,
            )}
            style={
                active === false
                    ? { color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                    : { background: `${color}1f`, color, border: `1px solid ${color}40` }
            }
        >
            {children}
        </Tag>
    );
}

export function Tabs<T extends string>({
    tabs,
    value,
    onChange,
    className,
}: {
    tabs: { id: T; label: string; icon?: LucideIcon; badge?: number }[];
    value: T;
    onChange: (v: T) => void;
    className?: string;
}) {
    return (
        <div className={cx("flex items-center gap-1 overflow-x-auto", className)}>
            {tabs.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    className={cx(
                        "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                        value === t.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                >
                    {t.icon && <t.icon className="h-3.5 w-3.5" />}
                    {t.label}
                    {!!t.badge && <span className="rounded-full bg-indigo-500/30 px-1.5 text-[10px] text-indigo-100">{t.badge}</span>}
                </button>
            ))}
        </div>
    );
}

export function Section({ title, icon: Icon, actions, children, className }: { title: string; icon?: LucideIcon; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cx("rounded-xl border border-white/10 bg-white/[0.02] p-3", className)}>
            <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
                    {title}
                </h3>
                {actions}
            </div>
            {children}
        </section>
    );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="text-[13px] font-semibold text-slate-200">{title}</div>
            {hint && <div className="max-w-sm text-[12px] text-slate-500">{hint}</div>}
            {action}
        </div>
    );
}

export function Progress({ value, color }: { value: number; color: string }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }}
            />
        </div>
    );
}

export function AgentDot({ color, name, size = 26 }: { color: string; name: string; size?: number }) {
    return (
        <span
            className="inline-flex shrink-0 items-center justify-center rounded-lg font-bold"
            style={{ width: size, height: size, fontSize: size * 0.42, color, background: `${color}22`, border: `1px solid ${color}55` }}
        >
            {name.slice(0, 1).toUpperCase()}
        </span>
    );
}

/** Toast stack bound to the Agentic OS store. */
export function Toasts({ className }: { className?: string }) {
    const toasts = useAosStore((s) => s.toasts);
    const dismiss = useAosStore((s) => s.dismiss);
    if (!toasts.length) return null;
    return (
        <div className={cx("pointer-events-none fixed bottom-5 left-1/2 z-[2100] flex -translate-x-1/2 flex-col items-center gap-2", className)}>
            {toasts.map((t) => {
                const Icon = t.kind === "success" ? CircleCheck : t.kind === "error" ? XCircle : Info;
                const color = t.kind === "success" ? "#22c55e" : t.kind === "error" ? "#ef4444" : "#38bdf8";
                return (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-[12px] text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                        <span className="flex-1">{t.text}</span>
                        <button type="button" onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white" aria-label="Dismiss">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export function timeAgo(iso: string | null | undefined, now = Date.now()) {
    if (!iso) return "—";
    const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const mnt = Math.round(s / 60);
    if (mnt < 60) return `${mnt}m ago`;
    const h = Math.round(mnt / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
}
