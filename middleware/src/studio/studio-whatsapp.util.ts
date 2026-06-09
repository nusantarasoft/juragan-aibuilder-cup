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
