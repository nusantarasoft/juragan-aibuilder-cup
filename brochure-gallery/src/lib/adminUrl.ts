/**
 * Public Cloud Run / local admin base URL baked at build time.
 * Header LOGIN (partner/admin CMS) uses this — never hardcode run.app hosts.
 * UMKM public onboarding is WhatsApp-first (`kasirWaUrl.ts`), not /register.
 */
export function getAdminBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3003").trim();
  return raw.replace(/\/+$/, "");
}

export function adminPath(path: string): string {
  const base = getAdminBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
