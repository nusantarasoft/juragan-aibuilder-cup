/**
 * Agentic OS — cron helpers for the Pulse visual builder.
 * Standard 5-field cron: minute hour day-of-month month day-of-week.
 * The server (`aosCronPreview`) is the source of truth for validation / next runs;
 * these helpers only build expressions and describe them in plain language.
 */

export interface CronPreset {
    id: string;
    label: string;
    cron: string;
}

export const CRON_PRESETS: CronPreset[] = [
    { id: "15m", label: "Every 15 minutes", cron: "*/15 * * * *" },
    { id: "30m", label: "Every 30 minutes", cron: "*/30 * * * *" },
    { id: "hourly", label: "Every hour", cron: "0 * * * *" },
    { id: "weekday7", label: "Weekdays at 07:00", cron: "0 7 * * 1-5" },
    { id: "daily8", label: "Every day at 08:00", cron: "0 8 * * *" },
    { id: "nightly2", label: "Every night at 02:00", cron: "0 2 * * *" },
    { id: "mon9", label: "Mondays at 09:00", cron: "0 9 * * 1" },
    { id: "fri16", label: "Fridays at 16:00", cron: "0 16 * * 5" },
    { id: "monthly", label: "1st of the month at 06:00", cron: "0 6 1 * *" },
];

export type BuilderMode = "minutes" | "hourly" | "daily" | "weekly" | "monthly";

export interface CronBuilder {
    mode: BuilderMode;
    everyMinutes: number; // minutes mode
    minute: number; // hourly/daily/weekly/monthly
    hour: number; // daily/weekly/monthly
    days: number[]; // weekly: 0=Sun..6=Sat
    dayOfMonth: number; // monthly
}

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEFAULT_BUILDER: CronBuilder = { mode: "weekly", everyMinutes: 30, minute: 0, hour: 7, days: [1, 2, 3, 4, 5], dayOfMonth: 1 };

const pad = (n: number) => String(n).padStart(2, "0");

/** Compress [1,2,3,4,5] → "1-5", [1,3,5] → "1,3,5". */
function compressDays(days: number[]): string {
    const d = [...new Set(days)].sort((a, b) => a - b);
    if (!d.length) return "*";
    const parts: string[] = [];
    let start = d[0];
    let prev = d[0];
    for (let i = 1; i <= d.length; i++) {
        const cur = d[i];
        if (cur === prev + 1) {
            prev = cur;
            continue;
        }
        parts.push(start === prev ? `${start}` : prev - start === 1 ? `${start},${prev}` : `${start}-${prev}`);
        start = cur;
        prev = cur;
    }
    return parts.join(",");
}

export function buildCron(b: CronBuilder): string {
    switch (b.mode) {
        case "minutes":
            return `*/${Math.max(1, Math.min(59, b.everyMinutes))} * * * *`;
        case "hourly":
            return `${b.minute} * * * *`;
        case "daily":
            return `${b.minute} ${b.hour} * * *`;
        case "weekly":
            return `${b.minute} ${b.hour} * * ${compressDays(b.days.length ? b.days : [1])}`;
        case "monthly":
            return `${b.minute} ${b.hour} ${Math.max(1, Math.min(28, b.dayOfMonth))} * *`;
    }
}

function expandField(f: string, min: number, max: number): number[] | null {
    if (f === "*") return null;
    const out = new Set<number>();
    for (const part of f.split(",")) {
        const [range, stepStr] = part.split("/");
        const step = stepStr ? Number(stepStr) : 1;
        let lo = min;
        let hi = max;
        if (range !== "*") {
            const [a, b] = range.split("-").map(Number);
            if (Number.isNaN(a)) return null;
            lo = a;
            hi = b === undefined || Number.isNaN(b) ? (stepStr ? max : a) : b;
        }
        for (let v = lo; v <= hi; v += step) out.add(v === 7 && max === 6 ? 0 : v);
    }
    return [...out].sort((x, y) => x - y);
}

/** Try to load an expression back into the builder; null when it's too custom. */
export function parseToBuilder(cron: string): CronBuilder | null {
    const f = cron.trim().split(/\s+/);
    if (f.length !== 5) return null;
    const [mi, h, dom, mon, dow] = f;
    if (mon !== "*") return null;
    const every = mi.match(/^\*\/(\d+)$/);
    if (every && h === "*" && dom === "*" && dow === "*") return { ...DEFAULT_BUILDER, mode: "minutes", everyMinutes: Number(every[1]) };
    if (!/^\d+$/.test(mi)) return null;
    const minute = Number(mi);
    if (h === "*" && dom === "*" && dow === "*") return { ...DEFAULT_BUILDER, mode: "hourly", minute };
    if (!/^\d+$/.test(h)) return null;
    const hour = Number(h);
    if (dom === "*" && dow === "*") return { ...DEFAULT_BUILDER, mode: "daily", minute, hour };
    if (dom === "*") {
        const days = expandField(dow, 0, 6);
        return days ? { ...DEFAULT_BUILDER, mode: "weekly", minute, hour, days } : null;
    }
    if (/^\d+$/.test(dom) && dow === "*") return { ...DEFAULT_BUILDER, mode: "monthly", minute, hour, dayOfMonth: Number(dom) };
    return null;
}

/** Plain-language description, e.g. "Every weekday at 07:00". */
export function describeCron(cron: string): string {
    const preset = CRON_PRESETS.find((p) => p.cron === cron.trim());
    if (preset) return preset.label;
    const b = parseToBuilder(cron);
    if (!b) return `Custom schedule (${cron})`;
    const at = `${pad(b.hour)}:${pad(b.minute)}`;
    switch (b.mode) {
        case "minutes":
            return b.everyMinutes === 1 ? "Every minute" : `Every ${b.everyMinutes} minutes`;
        case "hourly":
            return b.minute === 0 ? "Every hour, on the hour" : `Every hour at :${pad(b.minute)}`;
        case "daily":
            return `Every day at ${at}`;
        case "weekly": {
            const d = [...b.days].sort();
            if (d.join() === "1,2,3,4,5") return `Every weekday at ${at}`;
            if (d.join() === "0,6") return `Weekends at ${at}`;
            if (d.length === 7) return `Every day at ${at}`;
            if (d.length === 1) return `Every ${DAY_LONG[d[0]]} at ${at}`;
            return `${d.map((x) => DAY_SHORT[x]).join(", ")} at ${at}`;
        }
        case "monthly":
            return `Day ${b.dayOfMonth} of every month at ${at}`;
    }
}

export function formatWhen(iso: string | null | undefined, timeZone = "Asia/Jakarta"): string {
    if (!iso) return "—";
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch {
        return new Date(iso).toLocaleString();
    }
}

/** "in 5m" / "in 2h" / "overdue". */
export function timeUntil(iso: string | null | undefined, now = Date.now()): string {
    if (!iso) return "—";
    const s = Math.round((new Date(iso).getTime() - now) / 1000);
    if (s <= 0) return "due now";
    if (s < 60) return `in ${s}s`;
    const m = Math.round(s / 60);
    if (m < 60) return `in ${m}m`;
    const h = Math.round(m / 60);
    if (h < 48) return `in ${h}h`;
    return `in ${Math.round(h / 24)}d`;
}

export const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "UTC", "Europe/London", "America/New_York"];
