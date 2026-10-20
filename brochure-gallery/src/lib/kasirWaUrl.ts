/**
 * Official UMKM Business Support System WhatsApp number (docs/aistudio/umkm-wa).
 * Override with NEXT_PUBLIC_KASIR_WA_URL (full wa.me base, optional ?text= ignored).
 * Do not invent alternate numbers — pitch/penawaran use +62 811-924-689.
 */
const DEFAULT_KASIR_WA_PHONE = "62811924689";

function resolveWaPhoneDigits(): string {
  const override = (process.env.NEXT_PUBLIC_KASIR_WA_URL || "").trim();
  if (override) {
    try {
      const u = new URL(override.startsWith("http") ? override : `https://${override}`);
      const fromPath = u.pathname.replace(/^\//, "").split(/[/?#]/)[0];
      const digits = fromPath.replace(/\D/g, "");
      if (digits.length >= 10) return digits;
    } catch {
      const digits = override.replace(/\D/g, "");
      if (digits.length >= 10) return digits;
    }
  }
  return DEFAULT_KASIR_WA_PHONE;
}

/** Deep-link to the shared business WhatsApp with a prefilled owner phrase. */
export function kasirWaLink(prefillText: string): string {
  const phone = resolveWaPhoneDigits();
  const text = encodeURIComponent(prefillText);
  return `https://wa.me/${phone}?text=${text}`;
}
