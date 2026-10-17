import type { Request } from 'express';

/**
 * Client IP after Express trust proxy (see main.ts TRUST_PROXY).
 * Do not read spoofable X-Forwarded-For directly — use req.ip only.
 */
export function getTrustedClientIp(req?: Request | null): string {
    if (!req) return 'unknown';
    const raw = req.ip || req.socket?.remoteAddress || 'unknown';
    return raw.replace(/^::ffff:/, '');
}
