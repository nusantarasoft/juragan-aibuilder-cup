/**
 * In-memory sliding-window counters (v1). Resets on middleware process restart;
 * use Redis for multi-replica production if strict continuity is required.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkOnboardingRateLimit(key: string, maxPerWindow: number, windowMs: number): boolean {
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

export function resetOnboardingRateLimitsForTests(): void {
    buckets.clear();
}
