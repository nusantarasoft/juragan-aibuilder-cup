/**
 * Presence cookie for Next.js middleware UI gate.
 * Not a JWT — API auth remains Bearer localStorage. See CEO plan 2026-08-07.
 */

export const NS_AUTH_COOKIE = "ns_auth";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export function setAuthPresenceCookie(): void {
    if (typeof document === "undefined") return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${NS_AUTH_COOKIE}=1; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function clearAuthPresenceCookie(): void {
    if (typeof document === "undefined") return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${NS_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
