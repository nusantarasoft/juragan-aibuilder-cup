"use client";

/**
 * Command Deck — Goals: editor + 90-day gate review dialogs. Goals are
 * archived, never deleted; gate reviews are append-only history.
 */

import React, { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Archive, ArchiveRestore, Flag, Link2, Target, Unlink, X } from "lucide-react";
import { goalsApi } from "../../lib/api";
import { addDays, daysBetween, ddmm, ymd } from "../../lib/deckTime";
import { runDeck, useDeckStore } from "../../lib/deckStore";
import { usePhase3Store } from "../../lib/phase3Store";
import { useAosStore } from "../../lib/store";
import type { GoalStatus, GoalVerdict, OsGoal, OsGoalInput } from "../../lib/types";
import { Button, Chip, Field, Select, TextArea, TextInput, cx, timeAgo } from "../../ui/kit";

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; color: string }> = {
    active: { label: "On track", color: "#22c55e" },
    at_risk: { label: "At risk", color: "#f59e0b" },
    paused: { label: "Paused", color: "#64748b" },
    achieved: { label: "Achieved", color: "#38bdf8" },
    missed: { label: "Missed", color: "#ef4444" },
};

export const VERDICT_META: Record<GoalVerdict, { label: string; color: string }> = {
    on_track: { label: "On track", color: "#22c55e" },
    at_risk: { label: "At risk", color: "#f59e0b" },
    off_track: { label: "Off track", color: "#f97316" },
    achieved: { label: "Achieved", color: "#38bdf8" },
    missed: { label: "Missed", color: "#ef4444" },
};

const SWATCHES = ["#f97316", "#f59e0b", "#22c55e", "#38bdf8", "#818cf8", "#a855f7", "#e879f9", "#f43f5e"];

function Dialog({ title, icon: Icon, color, onClose, children, footer, wide }: { title: string; icon: typeof Target; color: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className={cx("flex max-h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-950 shadow-2xl", wide ? "max-w-2xl" : "max-w-lg")} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <div className="flex-1 truncate text-[14px] font-semibold text-white">{title}</div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{children}</div>
                <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">{footer}</div>
            </div>
        </div>
    );
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function GoalEditor({ goal, onClose, onSaved }: { goal: OsGoal | null; onClose: () => void; onSaved?: (g: OsGoal) => void }) {
    const { agents, tasks } = useAosStore(useShallow((s) => ({ agents: s.agents, tasks: s.tasks })));
    const areas = usePhase3Store((s) => s.areas);
    const taskGoals = useDeckStore((s) => s.taskGoals);
    const today = ymd(new Date());
    const [d, setD] = useState<OsGoalInput>(() =>
        goal
            ? { ...goal }
            : { title: "", description: "", areaId: null, ownerAgentId: null, metric: "", targetValue: null, currentValue: null, unit: "", windowDays: 90, startsOn: today, gateOn: addDays(today, 90), status: "active", progress: 0, nextAction: "", nextActionDue: null, color: "#f97316" },
    );
    const [gateTouched, setGateTouched] = useState(!!goal);
    const [saving, setSaving] = useState(false);
    const [linkPick, setLinkPick] = useState("");
    const set = <K extends keyof OsGoalInput>(k: K, v: OsGoalInput[K]) => setD((x) => ({ ...x, [k]: v }));

    const setWindow = (start: string, days: number) => {
        setD((x) => ({ ...x, startsOn: start, windowDays: days, ...(gateTouched ? {} : { gateOn: addDays(start, days) }) }));
    };

    const linked = goal ? tasks.filter((t) => taskGoals[t.id] === goal.id) : [];
    const linkable = goal ? tasks.filter((t) => !taskGoals[t.id] && !t.archivedAt && t.status !== "cancelled").slice(0, 200) : [];
    const problems = useMemo(() => {
        const p: string[] = [];
        if (!d.title?.trim()) p.push("Give the goal a title.");
        if (d.startsOn && d.gateOn && daysBetween(d.startsOn, d.gateOn) < 0) p.push("Gate date must be after the start date.");
        return p;
    }, [d]);

    const save = async () => {
        if (problems.length) return;
        setSaving(true);
        const input: OsGoalInput = {
            title: d.title?.trim(),
            description: d.description ?? "",
            areaId: d.areaId || null,
            ownerAgentId: d.ownerAgentId || null,
            metric: d.metric ?? "",
            targetValue: d.targetValue ?? null,
            currentValue: d.currentValue ?? null,
            unit: d.unit ?? "",
            windowDays: d.windowDays ?? 90,
            startsOn: d.startsOn,
            gateOn: d.gateOn,
            status: d.status,
            progress: Math.max(0, Math.min(1, d.progress ?? 0)),
            nextAction: d.nextAction ?? "",
            nextActionDue: d.nextActionDue || null,
            color: d.color,
        };
        const out = goal ? await runDeck("Goal saved", () => goalsApi.updateGoal(goal.id, input)) : await runDeck("Goal created", () => goalsApi.createGoal(input));
        setSaving(false);
        if (out) {
            onSaved?.(out);
            onClose();
        }
    };

    return (
        <Dialog
            title={goal ? `Edit goal “${goal.title}”` : "New goal"}
            icon={Target}
            color={d.color ?? "#f97316"}
            onClose={onClose}
            wide
            footer={
                <>
                    {goal && !goal.archivedAt && (
                        <Button variant="danger" icon={Archive} className="mr-auto" onClick={async () => (await runDeck("Goal archived", () => goalsApi.archiveGoal(goal.id))) && onClose()}>
                            Archive
                        </Button>
                    )}
                    {goal?.archivedAt && (
                        <Button icon={ArchiveRestore} className="mr-auto" onClick={async () => (await runDeck("Goal restored", () => goalsApi.restoreGoal(goal.id))) && onClose()}>
                            Restore
                        </Button>
                    )}
                    {problems[0] && <span className="text-[11px] text-amber-300">{problems[0]}</span>}
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" loading={saving} disabled={!!problems.length} onClick={save}>
                        {goal ? "Save goal" : "Create goal"}
                    </Button>
                </>
            }
        >
            <Field label="Title">
                <TextInput autoFocus value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Cut ITSM resolution time below 4h" />
            </Field>
            <Field label="Why it matters" hint="optional">
                <TextArea value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Context agents and reviewers should know" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Memory area">
                    <Select value={d.areaId ?? ""} onChange={(v) => set("areaId", v || null)} options={[{ value: "", label: "— none —" }, ...areas.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]} />
                </Field>
                <Field label="Owner agent">
                    <Select value={d.ownerAgentId ?? ""} onChange={(v) => set("ownerAgentId", v || null)} options={[{ value: "", label: "— none —" }, ...agents.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: `${a.name} · ${a.role}` }))]} />
                </Field>
            </div>
            <div className="grid grid-cols-4 gap-3">
                <Field label="Metric" className="col-span-2">
                    <TextInput value={d.metric ?? ""} onChange={(e) => set("metric", e.target.value)} placeholder="Mean time to resolve" />
                </Field>
                <Field label="Current">
                    <TextInput type="number" value={d.currentValue ?? ""} onChange={(e) => set("currentValue", num(e.target.value))} />
                </Field>
                <Field label="Target">
                    <TextInput type="number" value={d.targetValue ?? ""} onChange={(e) => set("targetValue", num(e.target.value))} />
                </Field>
            </div>
            <div className="grid grid-cols-4 gap-3">
                <Field label="Unit">
                    <TextInput value={d.unit ?? ""} onChange={(e) => set("unit", e.target.value)} placeholder="h, %, modules" />
                </Field>
                <Field label="Window (days)">
                    <TextInput type="number" min={7} max={366} value={d.windowDays ?? 90} onChange={(e) => setWindow(d.startsOn ?? today, Math.max(7, Math.min(366, Number(e.target.value) || 90)))} />
                </Field>
                <Field label="Starts on">
                    <TextInput type="date" value={d.startsOn ?? today} onChange={(e) => setWindow(e.target.value, d.windowDays ?? 90)} />
                </Field>
                <Field label="Gate review">
                    <TextInput
                        type="date"
                        value={d.gateOn ?? ""}
                        onChange={(e) => {
                            setGateTouched(true);
                            set("gateOn", e.target.value);
                        }}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                    <Select value={d.status ?? "active"} onChange={(v) => set("status", v as GoalStatus)} options={Object.entries(GOAL_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
                </Field>
                <Field label={`Progress · ${Math.round((d.progress ?? 0) * 100)}%`}>
                    <input type="range" min={0} max={100} value={Math.round((d.progress ?? 0) * 100)} onChange={(e) => set("progress", Number(e.target.value) / 100)} className="mt-2 w-full accent-indigo-400" />
                </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <Field label="Next action" className="col-span-2">
                    <TextInput value={d.nextAction ?? ""} onChange={(e) => set("nextAction", e.target.value)} placeholder="The single next step" />
                </Field>
                <Field label="Due">
                    <TextInput type="date" value={d.nextActionDue ?? ""} onChange={(e) => set("nextActionDue", e.target.value || null)} />
                </Field>
            </div>
            <Field label="Colour">
                <div className="flex gap-1.5">
                    {SWATCHES.map((c) => (
                        <button key={c} type="button" onClick={() => set("color", c)} className={cx("h-6 w-6 rounded-md border-2", d.color === c ? "border-white" : "border-transparent")} style={{ background: c }} aria-label={c} />
                    ))}
                </div>
            </Field>
            {goal && (
                <Field label={`Linked tasks · ${linked.length}`} hint="tasks that move this goal">
                    <div className="space-y-1">
                        {linked.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1 text-[12px]">
                                <span className="min-w-0 flex-1 truncate text-slate-200">{t.title}</span>
                                <Chip color={t.status === "done" ? "#22c55e" : "#94a3b8"}>{t.status}</Chip>
                                <button type="button" title="Unlink" onClick={() => runDeck("Task unlinked", () => goalsApi.linkTask(t.id, null))} className="text-slate-500 hover:text-red-300">
                                    <Unlink className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Select value={linkPick} onChange={setLinkPick} options={[{ value: "", label: "Link an existing task…" }, ...linkable.map((t) => ({ value: t.id, label: `${t.title} (${t.status})` }))]} />
                            <Button
                                icon={Link2}
                                disabled={!linkPick}
                                onClick={async () => {
                                    await runDeck("Task linked", () => goalsApi.linkTask(linkPick, goal.id));
                                    setLinkPick("");
                                }}
                            >
                                Link
                            </Button>
                        </div>
                    </div>
                </Field>
            )}
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/* Gate review                                                         */
/* ------------------------------------------------------------------ */

export function GoalReviewDialog({ goal, onClose }: { goal: OsGoal; onClose: () => void }) {
    const allReviews = useDeckStore((s) => s.reviews);
    const reviews = useMemo(() => allReviews.filter((r) => r.goalId === goal.id), [allReviews, goal.id]);
    const [verdict, setVerdict] = useState<GoalVerdict>(goal.status === "at_risk" ? "at_risk" : "on_track");
    const [progress, setProgress] = useState(goal.progress);
    const [current, setCurrent] = useState<string>(goal.currentValue === null ? "" : String(goal.currentValue));
    const [note, setNote] = useState("");
    const [nextAction, setNextAction] = useState(goal.nextAction);
    const [roll, setRoll] = useState(false);
    const [nextGate, setNextGate] = useState(addDays(goal.gateOn, goal.windowDays));
    const [saving, setSaving] = useState(false);
    const daysLeft = daysBetween(ymd(new Date()), goal.gateOn);

    const submit = async () => {
        setSaving(true);
        const out = await runDeck("Gate review recorded", () =>
            goalsApi.reviewGoal({ goalId: goal.id, verdict, progress, currentValue: num(current), note: note.trim(), nextAction: nextAction.trim() || null, nextGateOn: roll ? nextGate : null }),
        );
        setSaving(false);
        if (out) onClose();
    };

    return (
        <Dialog
            title={`Gate review · ${goal.title}`}
            icon={Flag}
            color={goal.color}
            onClose={onClose}
            footer={
                <>
                    <span className="mr-auto text-[11px] text-slate-500">Reviews are permanent history (append-only).</span>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" loading={saving} onClick={submit}>
                        Record review
                    </Button>
                </>
            }
        >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-slate-300">
                <Target className="h-4 w-4" style={{ color: goal.color }} />
                <span className="min-w-0 flex-1 truncate">
                    {goal.metric || "Goal"} · {goal.currentValue ?? "—"} → {goal.targetValue ?? "—"} {goal.unit}
                </span>
                <Chip color={daysLeft < 0 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#94a3b8"}>
                    gate {ddmm(goal.gateOn)} · {daysLeft < 0 ? `${-daysLeft} d overdue` : `in ${daysLeft} d`}
                </Chip>
            </div>
            <Field label="Verdict">
                <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(VERDICT_META) as GoalVerdict[]).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setVerdict(v)}
                            className={cx("rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition", verdict === v ? "text-white" : "border-white/10 text-slate-400 hover:text-white")}
                            style={verdict === v ? { background: `${VERDICT_META[v].color}33`, borderColor: VERDICT_META[v].color } : undefined}
                        >
                            {VERDICT_META[v].label}
                        </button>
                    ))}
                </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label={`Progress · ${Math.round(progress * 100)}%`}>
                    <input type="range" min={0} max={100} value={Math.round(progress * 100)} onChange={(e) => setProgress(Number(e.target.value) / 100)} className="mt-2 w-full accent-indigo-400" />
                </Field>
                <Field label={`Current value${goal.unit ? ` (${goal.unit})` : ""}`}>
                    <TextInput type="number" value={current} onChange={(e) => setCurrent(e.target.value)} />
                </Field>
            </div>
            <Field label="What happened" hint="evidence, blockers, decisions">
                <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Backlog spike after the outage; mitigation playbook shipped." />
            </Field>
            <Field label="Next action">
                <TextInput value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[12px] text-slate-300">
                <input type="checkbox" checked={roll} onChange={(e) => setRoll(e.target.checked)} className="accent-indigo-400" />
                Roll into the next window — new gate on
                <TextInput type="date" value={nextGate} disabled={!roll} onChange={(e) => setNextGate(e.target.value)} className="!w-40" />
            </label>
            {reviews.length > 0 && (
                <Field label={`History · ${reviews.length}`}>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                        {reviews.map((r) => (
                            <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <Chip color={VERDICT_META[r.verdict]?.color}>{VERDICT_META[r.verdict]?.label ?? r.verdict}</Chip>
                                    {r.progress !== null && <span className="text-slate-400">{Math.round(r.progress * 100)}%</span>}
                                    {r.nextGateOn && <span className="text-slate-500">→ gate {ddmm(r.nextGateOn)}</span>}
                                    <span className="ml-auto text-slate-500">{timeAgo(r.createdAt)}</span>
                                </div>
                                {r.note && <div className="mt-1 text-slate-300">{r.note}</div>}
                            </div>
                        ))}
                    </div>
                </Field>
            )}
        </Dialog>
    );
}
