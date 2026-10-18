import QRCode from "qrcode";
import type { TenantBrochure } from "./brochureTypes";

export function getOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_GALLERY_URL || "http://localhost:3004";
}

export function getBrochureShareUrl(slug: string): string {
  return `${getOrigin()}/b/${encodeURIComponent(slug)}`;
}

export function getBrochureEmbedUrl(slug: string): string {
  return `${getOrigin()}/embed/${encodeURIComponent(slug)}`;
}

export function getBrochureDirectImageUrl(brochure: TenantBrochure): string {
  if (brochure.image_url.startsWith("http://") || brochure.image_url.startsWith("https://") || brochure.image_url.startsWith("data:")) {
    return brochure.image_url;
  }
  return `${getOrigin()}${brochure.image_url.startsWith("/") ? "" : "/"}${brochure.image_url}`;
}

export function buildShareCaption(brochure: TenantBrochure): string {
  const promoText = brochure.promo_code ? ` · Promo Code: ${brochure.promo_code}` : "";
  return `${brochure.title} — Official Brochure by ${brochure.tenant_name}${promoText}. Inspect & order here:`;
}

export function getSocialShareLinks(brochure: TenantBrochure) {
  const url = getBrochureShareUrl(brochure.slug);
  const caption = buildShareCaption(brochure);
  const fullWa = `*${brochure.title}*\n🏢 Tenant: *${brochure.tenant_name}* (${brochure.tenant_plan})\n${
    brochure.subtitle ? `${brochure.subtitle}\n` : ""
  }${brochure.promo_code ? `🎟️ Kode Promo: *${brochure.promo_code}*\n` : ""}\n🔗 Lihat Brosur: ${url}`;

  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(fullWa)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(caption)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(caption)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(
      `[Brochure] ${brochure.title} — ${brochure.tenant_name}`
    )}&body=${encodeURIComponent(`${caption}\n\n${url}\n\nDirect Image: ${getBrochureDirectImageUrl(brochure)}`)}`,
  };
}

export async function generateQrDataUrl(
  text: string,
  accentColor = "#fb923c"
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 360,
    margin: 2,
    color: {
      dark: "#080a0f",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Renders the brochure image into a high-resolution PNG Blob on an HTML5 Canvas.
 * When `includeShareBanner` is true, appends a branded tenant share footer with QR code.
 */
export async function renderBrochureToPngBlob(
  brochure: TenantBrochure,
  includeShareBanner = false
): Promise<Blob> {
  const imageUrl = getBrochureDirectImageUrl(brochure);
  const shareUrl = getBrochureShareUrl(brochure.slug);
  const img = await loadImageElement(imageUrl);

  const baseWidth = 900;
  const baseHeight = 1200;
  const bannerHeight = includeShareBanner ? 180 : 0;

  const canvas = document.createElement("canvas");
  canvas.width = baseWidth;
  canvas.height = baseHeight + bannerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Background fill
  ctx.fillStyle = "#080a0f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw brochure image
  ctx.drawImage(img, 0, 0, baseWidth, baseHeight);

  if (includeShareBanner) {
    const y0 = baseHeight;
    const accent = brochure.tenant_accent_color || "#fb923c";

    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, y0, baseWidth, bannerHeight);

    ctx.fillStyle = accent;
    ctx.fillRect(0, y0, baseWidth, 4);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(brochure.tenant_name.toUpperCase(), 36, y0 + 50);

    ctx.fillStyle = accent;
    ctx.font = "bold 16px monospace";
    ctx.fillText(
      `PROMO: ${brochure.promo_code || "NUSANTARA26"}  ·  SCAN QR OR OPEN LINK`,
      36,
      y0 + 84
    );

    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px monospace";
    ctx.fillText(shareUrl, 36, y0 + 118);

    ctx.fillStyle = "#64748b";
    ctx.font = "13px monospace";
    ctx.fillText(
      "SHARED VIA NUSANTARASOFT AGENT-OS BROCHURE VAULT",
      36,
      y0 + 148
    );

    try {
      const qrDataUrl = await generateQrDataUrl(shareUrl, accent);
      const qrImg = await loadImageElement(qrDataUrl);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(baseWidth - 164, y0 + 22, 136, 136);
      ctx.drawImage(qrImg, baseWidth - 160, y0 + 26, 128, 128);
    } catch {
      // QR optional fallback
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/png",
      0.98
    );
  });
}

export async function copyBrochureImageToClipboard(
  brochure: TenantBrochure,
  withQrFooter = true
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
    return false;
  }
  const blob = await renderBrochureToPngBlob(brochure, withQrFooter);
  const item = new ClipboardItem({ "image/png": blob });
  await navigator.clipboard.write([item]);
  return true;
}

export async function downloadBrochurePng(
  brochure: TenantBrochure,
  withQrFooter = false
): Promise<void> {
  const blob = await renderBrochureToPngBlob(brochure, withQrFooter);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${brochure.slug}${withQrFooter ? "-share-card" : ""}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function nativeShareBrochure(
  brochure: TenantBrochure
): Promise<"shared" | "unsupported" | "cancelled"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }
  const shareUrl = getBrochureShareUrl(brochure.slug);
  const text = `${buildShareCaption(brochure)} ${shareUrl}`;

  try {
    const blob = await renderBrochureToPngBlob(brochure, true);
    const file = new File([blob], `${brochure.slug}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${brochure.title} — ${brochure.tenant_name}`,
        text,
        url: shareUrl,
        files: [file],
      });
      return "shared";
    }
  } catch {
    // Fallback to text/URL share below
  }

  try {
    await navigator.share({
      title: `${brochure.title} — ${brochure.tenant_name}`,
      text,
      url: shareUrl,
    });
    return "shared";
  } catch {
    return "cancelled";
  }
}

export async function recordBrochureMetric(
  slug: string,
  metric: "views" | "shares" | "downloads" | "likes"
): Promise<void> {
  try {
    await fetch(`/api/brochures/${encodeURIComponent(slug)}/metric`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric }),
    });
  } catch {
    // Non-blocking telemetry
  }
}
