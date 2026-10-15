/** Pause + quiet-hours checks for tenant agent auto work (F2-4). */

export type AgentQuietHoursConfig = {
    enabled?: boolean;
    timezone?: string;
    /** Local time HH:mm (24h). */
    start?: string;
    end?: string;
};

export type AgentAutoWorkBlockReason = 'paused' | 'quiet_hours';

export const KASIR_LIBUR_COPY =
    'Kasir sedang libur. Pesan Anda kami terima — balasan otomatis akan aktif lagi saat jam operasional.';
export const KASIR_QUIET_HOURS_COPY =
    'Di luar jam operasional toko. Kasir akan membalas saat jam buka berikutnya. Terima kasih sudah menunggu.';

const DEFAULT_TZ = 'Asia/Jakarta';

export function parseHm(raw: string | undefined | null): { h: number; m: number } | null {
    const s = String(raw ?? '').trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, m: min };
}

export function localMinutes(now: Date, timezone: string): number {
    const tz = timezone.trim() || DEFAULT_TZ;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const min = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + min;
}

/** True when local time is inside [start, end); supports overnight windows. */
export function isInsideQuietWindow(now: Date, quiet: AgentQuietHoursConfig): boolean {
    if (quiet.enabled === false) return true;
    const start = parseHm(quiet.start);
    const end = parseHm(quiet.end);
    if (!start || !end) return true;
    const tz = quiet.timezone?.trim() || DEFAULT_TZ;
    const cur = localMinutes(now, tz);
    const a = start.h * 60 + start.m;
    const b = end.h * 60 + end.m;
    if (a === b) return true;
    if (a < b) return cur >= a && cur < b;
    return cur >= a || cur < b;
}

export function agentAutoWorkBlocked(
    agentStatus: string | undefined | null,
    quiet: AgentQuietHoursConfig | null | undefined,
    now = new Date(),
): { blocked: boolean; reason?: AgentAutoWorkBlockReason } {
    if (agentStatus === 'paused' || agentStatus === 'offline') {
        return { blocked: true, reason: 'paused' };
    }
    if (quiet && quiet.enabled !== false && quiet.start && quiet.end && !isInsideQuietWindow(now, quiet)) {
        return { blocked: true, reason: 'quiet_hours' };
    }
    return { blocked: false };
}

export function autoWorkUserMessage(reason: AgentAutoWorkBlockReason): string {
    return reason === 'quiet_hours' ? KASIR_QUIET_HOURS_COPY : KASIR_LIBUR_COPY;
}

export type TenantSettingsAgentsMap = Record<string, { quietHours?: AgentQuietHoursConfig }>;

export function readAgentQuietHours(settings: unknown, agentSlug: string): AgentQuietHoursConfig | null {
    if (!settings || typeof settings !== 'object') return null;
    const agents = (settings as { agents?: TenantSettingsAgentsMap }).agents;
    if (!agents || typeof agents !== 'object') return null;
    const entry = agents[agentSlug];
    if (!entry?.quietHours || typeof entry.quietHours !== 'object') return null;
    return entry.quietHours as AgentQuietHoursConfig;
}
