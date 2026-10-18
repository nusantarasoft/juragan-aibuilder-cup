/**
 * In-memory sliding-window rate limit for public marketing gallery (v1).
 * Resets on process restart; use Redis for multi-replica if needed.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkMarketingPublicRateLimit(
    key: string,
    maxPerWindow: number,
    windowMs: number,
): boolean {
    const now = Date.now();
    const row = buckets.get(key);
    if (!row || row.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (row.count >= maxPerWindow) return false;
    row.count += 1;
    return true;
}

export function resetMarketingPublicRateLimitsForTests(): void {
    buckets.clear();
}
