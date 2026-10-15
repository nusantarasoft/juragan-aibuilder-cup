export type StudioWhatsAppConfigLookup = {
    tenant_id: string;
    session_name?: string | null;
    /** Nomor pemilik UMKM (pengirim ke inbox admin). */
    business_phone?: string | null;
    allowlist_phones?: string[] | null;
    enabled?: boolean;
    notebook_id?: string | null;
};

/** Extract WhatsApp admin account phone from webhook payload (`me`, etc.). */
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
    // Baileys meId looks like 6281…:7@s.whatsapp.net — drop device suffix after ':'
    const local = (input.split('@')[0] || input).split(':')[0] || input;
    const digits = local.replace(/\D/g, '');
    if (digits.length >= 8) return digits;
    return input.replace(/\D/g, '');
}

/**
 * True only when the webhook payload actually carries media.
 * Do NOT treat `payload._data` alone as media — text messages may also include `_data`.
 */
export function whatsappPayloadHasMedia(payload: Record<string, unknown>): boolean {
    if (payload.hasMedia === true) return true;
    if (typeof payload.mediaUrl === 'string' && payload.mediaUrl.trim()) return true;

    const data = payload._data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return false;

    if (data.mediaKey || data.directPath || data.fileSha256 || data.fileEncSha256) return true;
    if (typeof data.mimetype === 'string' && data.mimetype.trim()) return true;

    const type = String(data.type || payload.type || '').toLowerCase();
    return /^(image|video|audio|document|sticker|ptt|album)$/.test(type);
}

/** Remove synthetic media notes so menu digits / intents still match. */
export function stripWhatsAppMediaAnnotations(text: string): string {
    return text
        .split(/\r?\n/)
        .filter((line) => {
            const t = line.trim();
            if (!t) return true;
            if (/^\[User mengirim .+\]$/i.test(t)) return false;
            if (/^\(Catatan: konten visual belum di-OCR/i.test(t)) return false;
            return true;
        })
        .join('\n')
        .trim();
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

/**
 * P2-5: dedicated inbox routes by Hermes session + business phone; shared inbox by sender whitelist.
 */
export function resolveInboundWaConfig(
    configs: StudioWhatsAppConfigLookup[],
    sessionName: string,
    senderPhone: string,
    businessPhone?: string | null,
): StudioWhatsAppConfigLookup | null {
    const sessionKey = sessionName.trim().toLowerCase();
    const defaultSession = 'hermes';
    const isDedicatedSession =
        sessionKey.length > 0 && sessionKey !== 'default' && sessionKey !== defaultSession;

    if (isDedicatedSession) {
        const bySession = pickWhatsAppConfigForWebhook(configs, sessionName, businessPhone);
        if (bySession) return bySession;
        return null;
    }

    const bySender = pickTenantConfigBySenderPhone(configs, senderPhone);
    if (bySender) return bySender;

    const activeCount = configs.filter((c) => c.enabled !== false && c.notebook_id).length;
    if (activeCount <= 1) {
        return pickSingleTenantFallback(configs);
    }
    return null;
}

/** @deprecated Use pickTenantConfigBySenderPhone for shared inbox. */
export function pickWhatsAppConfigForWebhook(
    configs: StudioWhatsAppConfigLookup[],
    sessionName: string,
    businessPhone?: string | null,
): StudioWhatsAppConfigLookup | null {
    const sessionKey = sessionName.trim().toLowerCase();
    if (sessionKey) {
        const bySession = configs.filter(
            (c) => (c.session_name || 'default').trim().toLowerCase() === sessionKey,
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
