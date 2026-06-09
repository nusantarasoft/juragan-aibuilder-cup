export type StudioWhatsAppConfigLookup = {
    tenant_id: string;
    waha_session?: string | null;
    business_phone?: string | null;
};

/** Extract business account phone from WAHA webhook payload (`me`, `to`, etc.). */
export function extractBusinessPhoneFromPayload(payload: Record<string, unknown>): string | null {
    const me = payload.me as Record<string, unknown> | undefined;
    const candidates = [
        me?.id,
        me?.user,
        payload.to,
        (payload._data as Record<string, unknown> | undefined)?.to,
    ];
    for (const raw of candidates) {
        const digits = normalizePhoneDigits(String(raw || ''));
        if (digits.length >= 8) return digits;
    }
    return null;
}

/** Pick WA config row for an inbound webhook (session name is primary key). */
export function pickWhatsAppConfigForWebhook(
    configs: StudioWhatsAppConfigLookup[],
    wahaSession: string,
    businessPhone?: string | null,
): StudioWhatsAppConfigLookup | null {
    const sessionKey = wahaSession.trim().toLowerCase();
    if (sessionKey) {
        const bySession = configs.find(
            (c) => (c.waha_session || '').trim().toLowerCase() === sessionKey,
        );
        if (bySession) return bySession;
    }
    if (businessPhone) {
        const byPhone = configs.find((c) => {
            const bp = normalizePhoneDigits(c.business_phone || '');
            return bp.length >= 8 && (bp === businessPhone || businessPhone.endsWith(bp) || bp.endsWith(businessPhone));
        });
        if (byPhone) return byPhone;
    }
    return configs.find((c) => c.tenant_id === 'default') ?? configs[0] ?? null;
}

/** Normalize WhatsApp chat id / phone to digits-only for matching. */
export function normalizePhoneDigits(input: string): string {
    const local = input.split('@')[0] || input;
    const digits = local.replace(/\D/g, '');
    if (digits.length >= 8) return digits;
    return input.replace(/\D/g, '');
}

/** Match phone against allowlist entries (suffix/prefix tolerant). */
export function isPhoneInAllowlist(phone: string, allowlist: string[] | null | undefined): boolean {
    if (!allowlist?.length) return false;
    const normalized = normalizePhoneDigits(phone);
    return allowlist.some((entry) => {
        const candidate = normalizePhoneDigits(entry);
        if (!candidate) return false;
        return (
            candidate === normalized ||
            normalized.endsWith(candidate) ||
            candidate.endsWith(normalized)
        );
    });
}

/**
 * In-memory sliding-window rate limiter (per key, e.g. phone).
 * Suitable for single middleware instance; use Redis for multi-replica deployments.
 */
export class StudioWhatsAppRateLimiter {
    private readonly buckets = new Map<string, number[]>();

    constructor(
        private readonly maxPerWindow: number,
        private readonly windowMs = 60_000,
    ) {}

    tryConsume(key: string): boolean {
        const now = Date.now();
        const cutoff = now - this.windowMs;
        const recent = (this.buckets.get(key) ?? []).filter((t) => t > cutoff);
        if (recent.length >= this.maxPerWindow) {
            this.buckets.set(key, recent);
            return false;
        }
        recent.push(now);
        this.buckets.set(key, recent);
        return true;
    }

    /** @internal test helper */
    reset(key?: string): void {
        if (key) this.buckets.delete(key);
        else this.buckets.clear();
    }
}
