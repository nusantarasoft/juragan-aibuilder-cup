import { CronTime } from 'cron';

export const DEFAULT_CRON_TZ = 'Asia/Jakarta';

/**
 * Parses a cron expression in a timezone (cron v4 `CronTime`; 5 fields, or 6 with seconds).
 * Throws `Invalid cron: <reason>` for bad expressions or unknown timezones.
 */
export function parseCron(expr: string, timezone?: string | null): CronTime {
    const source = (expr ?? '').trim();
    if (!source) throw new Error('Invalid cron: expression is empty');
    try {
        return new CronTime(source, timezone || DEFAULT_CRON_TZ);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid cron: ${msg}`);
    }
}

/** Next `count` fire times strictly after `from`. */
export function cronNextDates(expr: string, timezone?: string | null, count = 1, from: Date = new Date()): Date[] {
    const tz = timezone || DEFAULT_CRON_TZ;
    const ct = parseCron(expr, tz);
    const out: Date[] = [];
    let cursor = from;
    for (let i = 0; i < Math.max(1, count); i++) {
        // getNextDateFrom ignores the CronTime's zone unless it is passed again
        // (it would otherwise use the process TZ — UTC inside Docker).
        const next = ct.getNextDateFrom(cursor, tz).toJSDate();
        out.push(next);
        cursor = next;
    }
    return out;
}

/** ISO of the next fire time after `from`, or null if the expression is invalid. */
export function cronNextIso(expr: string, timezone?: string | null, from: Date = new Date()): string | null {
    try {
        return cronNextDates(expr, timezone, 1, from)[0].toISOString();
    } catch {
        return null;
    }
}
