/**
 * Public Cloud Run / local admin base URL baked at build time.
 * Showcase CTAs (register, login, studio) must use this — never hardcode run.app hosts.
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
