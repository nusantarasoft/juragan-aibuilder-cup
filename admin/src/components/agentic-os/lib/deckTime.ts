/**
 * Agentic OS — Command Deck time helpers: ISO weeks, `YYYY-MM-DD` date math,
 * time-zone wall clocks and a small cron expander for the 14-day agenda.
 * Pure functions, no dependencies.
 */

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Wall-clock parts of `at` in time zone `tz`. */
export function wallParts(at: Date, tz?: string) {
    const f = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
    });
    const p: Record<string, string> = {};
    for (const x of f.formatToParts(at)) p[x.type] = x.value;
    const y = Number(p.year);
    const m = Number(p.month);
    const d = Number(p.day);
    return { y, m, d, h: Number(p.hour) % 24, mi: Number(p.minute), s: Number(p.second), dow: DOW_SHORT.indexOf(p.weekday) };
}

/** Minutes east of UTC for `tz` at instant `at` (e.g. Asia/Jakarta → 420). */
export function tzOffsetMinutes(tz: string | undefined, at: Date): number {
    const w = wallParts(at, tz);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export function offsetLabel(min: number) {
    const sign = min >= 0 ? "+" : "-";
    const a = Math.abs(min);
    return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${pad(a % 60)}` : ""}`;
}

/** `YYYY-MM-DD` of `at` in `tz`. */
export function ymd(at: Date, tz?: string): string {
    const w = wallParts(at, tz);
    return `${w.y}-${pad(w.m)}-${pad(w.d)}`;
}

const toUtcMs = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
};

export function daysBetween(from: string, to: string): number {
    return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function addDays(s: string, n: number): string {
    const d = new Date(toUtcMs(s) + n * 86_400_000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dowOf(s: string): number {
    return new Date(toUtcMs(s)).getUTCDay();
}

/** Monday of the ISO week containing `s`. */
export function mondayOf(s: string): string {
    return addDays(s, -((dowOf(s) + 6) % 7));
}

export function isoWeek(s: string): number {
    const d = new Date(toUtcMs(s));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** "30.11" */
export const ddmm = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;
/** "Mon 30.11" */
export const dowDdmm = (s: string) => `${DOW_SHORT[dowOf(s)]} ${ddmm(s)}`;
/** "Wed 07 Oct 2026" */
export const longDate = (s: string) => `${DOW_SHORT[dowOf(s)]} ${s.slice(8, 10)} ${MONTH_SHORT[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;

/** "in 56 d", "today", "2 d ago" */
export function relDays(n: number) {
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n === -1) return "yesterday";
    return n > 0 ? `in ${n} d` : `${-n} d ago`;
}

/** "30 min", "2 h 10 min", "3 d 4 h" */
export function durationLabel(ms: number) {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
    const d = Math.floor(h / 24);
    return `${d} d${h % 24 ? ` ${h % 24} h` : ""}`;
}

/** Short age for backlog rows: "4h", "1d", "3w". */
export function ageLabel(iso: string | null | undefined, now = Date.now()) {
    if (!iso) return "—";
    const m = Math.max(0, (now - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.round(m)}m`;
    if (m < 1440) return `${Math.round(m / 60)}h`;
    if (m < 1440 * 14) return `${Math.round(m / 1440)}d`;
    return `${Math.round(m / 10080)}w`;
}

/* ------------------------------------------------------------------ */
/* Cron (5 fields) — expand occurrences in a time zone                 */
/* ------------------------------------------------------------------ */

const NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function parseField(src: string, min: number, max: number): Set<number> | null {
    const out = new Set<number>();
    for (const part of src.toLowerCase().split(",")) {
        const [range, stepS] = part.split("/");
        const step = stepS ? Number(stepS) : 1;
        if (!Number.isFinite(step) || step < 1) return null;
        let lo = min;
        let hi = max;
        if (range !== "*") {
            const [a, b] = range.split("-");
            const num = (v: string) => (v in NAMES ? NAMES[v] : Number(v));
            lo = num(a);
            hi = b !== undefined ? num(b) : stepS ? max : lo;
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) return null;
        for (let v = lo; v <= hi; v += step) out.add(v);
    }
    return out;
}

/** Up to `limit` cron fire times in [from, to), evaluated in `tz`. Returns [] for invalid crons. */
export function cronOccurrences(cron: string, tz: string, from: Date, to: Date, limit = 50): Date[] {
    const f = cron.trim().split(/\s+/);
    if (f.length !== 5) return [];
    const mins = parseField(f[0], 0, 59);
    const hours = parseField(f[1], 0, 23);
    const dom = parseField(f[2], 1, 31);
    const mon = parseField(f[3], 1, 12);
    const dowRaw = parseField(f[4], 0, 7);
    if (!mins || !hours || !dom || !mon || !dowRaw) return [];
    const dow = new Set([...dowRaw].map((d) => d % 7));
    const domAny = f[2] === "*";
    const dowAny = f[4] === "*";
    const out: Date[] = [];
    const startDay = ymd(from, tz);
    const spanDays = Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const hourList = [...hours].sort((a, b) => a - b);
    const minList = [...mins].sort((a, b) => a - b);
    for (let i = 0; i <= spanDays && out.length < limit; i++) {
        const day = addDays(startDay, i);
        const [y, m, d] = day.split("-").map(Number);
        const wd = dowOf(day);
        if (!mon.has(m)) continue;
        const domOk = dom.has(d);
        const dowOk = dow.has(wd);
        const dayOk = domAny && dowAny ? true : domAny ? dowOk : dowAny ? domOk : domOk || dowOk;
        if (!dayOk) continue;
        const off = tzOffsetMinutes(tz, new Date(Date.UTC(y, m - 1, d, 12)));
        for (const h of hourList) {
            for (const mi of minList) {
                const at = new Date(Date.UTC(y, m - 1, d, h, mi) - off * 60000);
                if (at < from || at >= to) continue;
                out.push(at);
                if (out.length >= limit) return out;
            }
        }
    }
    return out;
}
