export type StudioWhatsAppConfigLookup = {
    tenant_id: string;
    waha_session?: string | null;
    /** Nomor pemilik UMKM (pengirim ke inbox admin). */
    business_phone?: string | null;
    allowlist_phones?: string[] | null;
    enabled?: boolean;
    notebook_id?: string | null;
};

/** Extract WAHA admin account phone from webhook payload (`me`, etc.). */
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

/** Normalize WhatsApp chat id / phone to digits-only for matching. */
export function normalizePhoneDigits(input: string): string {
    const local = input.split('@')[0] || input;
    const digits = local.replace(/\D/g, '');
    if (digits.length >= 8) return digits;
    return input.replace(/\D/g, '');
}

export function phonesMatch(phoneA: string, phoneB: string): boolean {
    const a = normalizePhoneDigits(phoneA);
    const b = normalizePhoneDigits(phoneB);
    if (!a || !b) return false;
    return a === b || a.endsWith(b) || b.endsWith(a);
}

/** Owner + staff phones registered for one UMKM tenant. */
export function collectUmkmOwnerPhones(config: StudioWhatsAppConfigLookup): string[] {
    const phones: string[] = [];
    if (config.business_phone) {
        phones.push(normalizePhoneDigits(config.business_phone));
    }
    for (const p of config.allowlist_phones || []) {
        const d = normalizePhoneDigits(p);
        if (d.length >= 8) phones.push(d);
    }
    return [...new Set(phones)];
}

/**
 * Shared inbox: route inbound message to UMKM by sender phone (pemilik/staff).
 * Returns null if ambiguous or no match.
 */
export function pickTenantConfigBySenderPhone(
    configs: StudioWhatsAppConfigLookup[],
    senderPhone: string,
): StudioWhatsAppConfigLookup | null {
    const sender = normalizePhoneDigits(senderPhone);
    if (sender.length < 8) return null;

    const candidates = configs.filter((c) => c.enabled !== false && c.notebook_id);
    const matches = candidates.filter((c) =>
        collectUmkmOwnerPhones(c).some((p) => phonesMatch(p, sender)),
    );

    if (matches.length === 1) return matches[0];
    return null;
}

/**
 * Dev/single-tenant fallback when no owner phone is registered yet.
 */
export function pickSingleTenantFallback(
    configs: StudioWhatsAppConfigLookup[],
): StudioWhatsAppConfigLookup | null {
    const active = configs.filter((c) => c.enabled !== false && c.notebook_id);
    if (active.length === 1) return active[0];
    return configs.find((c) => c.tenant_id === 'default' && c.notebook_id) ?? null;
}

/** @deprecated Use pickTenantConfigBySenderPhone for shared inbox. */
export function pickWhatsAppConfigForWebhook(
    configs: StudioWhatsAppConfigLookup[],
    wahaSession: string,
    businessPhone?: string | null,
): StudioWhatsAppConfigLookup | null {
    const sessionKey = wahaSession.trim().toLowerCase();
    if (sessionKey) {
        const bySession = configs.filter(
            (c) => (c.waha_session || 'default').trim().toLowerCase() === sessionKey,
        );
        if (bySession.length === 1) return bySession[0];
    }
    if (businessPhone) {
        const byPhone = configs.find((c) => phonesMatch(c.business_phone || '', businessPhone));
        if (byPhone) return byPhone;
    }
    return pickSingleTenantFallback(configs);
}

/** Match phone against allowlist entries (suffix/prefix tolerant). */
export function isPhoneInAllowlist(phone: string, allowlist: string[] | null | undefined): boolean {
    if (!allowlist?.length) return false;
    const normalized = normalizePhoneDigits(phone);
    return allowlist.some((entry) => phonesMatch(normalized, entry));
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
