import { createRequire } from 'node:module';
import { escapeXml, formatPriceIdr, wrapOverlayLines } from './studio-marketing.util';

const nodeRequire = createRequire(__filename);
const sharp = nodeRequire('sharp') as typeof import('sharp');

export type MarketingTemplateInput = {
    productName: string;
    priceIdr: number | null;
    storeLabel: string;
    productPhoto: Buffer;
    /** Caption headline from LLM (optional; falls back to product name). */
    headline?: string | null;
    categoryName?: string | null;
    /** Ignored for HUD template — chrome uses fixed tech grid (brochure-gallery DNA). */
    background?: Buffer | null;
};

const CANVAS = 1080;

const ACCENT_PALETTES = [
    { primary: '#fb923c', secondary: '#facc15' },
    { primary: '#f43f5e', secondary: '#fda4af' },
    { primary: '#38bdf8', secondary: '#67e8f9' },
    { primary: '#a78bfa', secondary: '#c4b5fd' },
    { primary: '#34d399', secondary: '#6ee7b7' },
] as const;

function storeInitials(label: string): string {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NS';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function accentForStore(storeLabel: string) {
    let h = 0;
    for (let i = 0; i < storeLabel.length; i += 1) h = (h * 31 + storeLabel.charCodeAt(i)) >>> 0;
    return ACCENT_PALETTES[h % ACCENT_PALETTES.length];
}

function tagChips(productName: string, categoryName?: string | null): string[] {
    const tags: string[] = [];
    if (categoryName?.trim()) tags.push(categoryName.trim().slice(0, 18));
    for (const w of productName.trim().split(/\s+/)) {
        if (w.length < 3) continue;
        if (tags.length >= 3) break;
        if (!tags.some((t) => t.toLowerCase() === w.toLowerCase())) tags.push(w.slice(0, 16));
    }
    if (tags.length === 0) tags.push('UMKM');
    return tags.slice(0, 3);
}

async function circularProductPhoto(photo: Buffer, size: number): Promise<Buffer> {
    const resized = await sharp(photo)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
    const mask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
    );
    return sharp(resized)
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
}

/**
 * HUD / tenant-showcase share-card DNA (brochure-gallery), square for UMKM marketing.
 * All copy (store, product, price, headline) is truthy DB/LLM text — never AI-drawn on canvas.
 */
export async function renderMarketingTemplatePng(input: MarketingTemplateInput): Promise<Buffer> {
    const priceText = formatPriceIdr(input.priceIdr);
    const storeLine = input.storeLabel.trim().slice(0, 48) || 'Warung UMKM';
    const productLine = input.productName.trim().slice(0, 64) || 'Produk';
    const headlineSrc = (input.headline?.trim() || productLine).slice(0, 80);
    const titleLines = wrapOverlayLines(headlineSrc, 22, 3);
    const { primary, secondary } = accentForStore(storeLine);
    const initials = storeInitials(storeLine);
    const tags = tagChips(productLine, input.categoryName);
    const editionYear = new Date().getUTCFullYear();

    const heroSize = 340;
    const heroPhoto = await circularProductPhoto(input.productPhoto, heroSize);

    const titleSvg = titleLines
        .map(
            (line, i) =>
                `<text x="56" y="${210 + i * 48}" fill="#ffffff" font-family="DejaVu Sans, Arial, sans-serif" font-size="40" font-weight="900">${escapeXml(line)}</text>`,
        )
        .join('\n');

    const tagsSvg = tags
        .map((tag, i) => {
            const x = 56 + i * 168;
            return `<g transform="translate(${x}, 380)">
  <rect x="0" y="0" width="156" height="32" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
  <text x="78" y="21" text-anchor="middle" fill="#e2e8f0" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="600">#${escapeXml(tag.toUpperCase())}</text>
</g>`;
        })
        .join('\n');

    const chromeSvg = `<svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080a0f"/>
      <stop offset="55%" stop-color="#0b0e13"/>
      <stop offset="100%" stop-color="#05070b"/>
    </linearGradient>
    <radialGradient id="glowPrimary" cx="78%" cy="28%" r="50%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="techGrid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
  <rect width="100%" height="100%" fill="url(#glowPrimary)"/>
  <rect width="100%" height="100%" fill="url(#techGrid)"/>

  <rect x="0" y="0" width="${CANVAS}" height="8" fill="${primary}"/>
  <rect x="28" y="28" width="1024" height="1024" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
  <path d="M 28 52 L 28 28 L 52 28" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 1028 28 L 1052 28 L 1052 52" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 28 1028 L 28 1052 L 52 1052" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 1028 1052 L 1052 1052 L 1052 1028" fill="none" stroke="${primary}" stroke-width="3"/>

  <!-- Header -->
  <rect x="56" y="56" width="968" height="76" fill="#0b0e13" fill-opacity="0.9" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
  <rect x="56" y="56" width="76" height="76" fill="${primary}"/>
  <text x="94" y="104" text-anchor="middle" fill="#080a0f" font-family="DejaVu Sans Mono, monospace" font-size="26" font-weight="900">${escapeXml(initials)}</text>
  <text x="152" y="88" fill="#f8fafc" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="800">${escapeXml(storeLine.toUpperCase())}</text>
  <text x="152" y="112" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="600">UMKM · KONTEN MARKETING // SHOWCASE</text>
  <rect x="848" y="72" width="156" height="44" fill="rgba(255,255,255,0.04)" stroke="${primary}" stroke-width="1.2"/>
  <text x="926" y="92" text-anchor="middle" fill="#94a3b8" font-family="DejaVu Sans Mono, monospace" font-size="10">EDITION</text>
  <text x="926" y="108" text-anchor="middle" fill="#f8fafc" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700">${editionYear}</text>

  <rect x="56" y="156" width="195" height="28" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1"/>
  <text x="153" y="175" text-anchor="middle" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700">OFFICIAL BROCHURE</text>
  ${titleSvg}
  <text x="56" y="360" fill="#cbd5e1" font-family="DejaVu Sans, Arial, sans-serif" font-size="18">${escapeXml(productLine)} · ${escapeXml(priceText)}</text>

  <!-- Hero ring (photo composited separately) -->
  <circle cx="820" cy="300" r="178" fill="${primary}" fill-opacity="0.1" stroke="${primary}" stroke-width="2"/>
  <circle cx="820" cy="300" r="162" fill="none" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="6 4"/>

  ${tagsSvg}

  <line x1="56" y1="448" x2="1024" y2="448" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="56" y="440" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700" letter-spacing="2">FEATURED HIGHLIGHT &amp; PRICING</text>

  <!-- Single highlight row -->
  <g transform="translate(56, 468)">
    <rect x="0" y="0" width="968" height="96" fill="#0b0e13" fill-opacity="0.86" stroke="${primary}" stroke-width="2"/>
    <rect x="0" y="0" width="6" height="96" fill="${primary}"/>
    <circle cx="38" cy="48" r="16" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="1.5"/>
    <text x="38" y="53" text-anchor="middle" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="14" font-weight="700">01</text>
    <text x="72" y="40" fill="#f8fafc" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="800">${escapeXml(productLine.slice(0, 36))}</text>
    <text x="72" y="68" fill="#94a3b8" font-family="DejaVu Sans, Arial, sans-serif" font-size="14">Harga jujur dari katalog warung — mampir beli di toko</text>
    <rect x="730" y="23" width="210" height="50" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1.5"/>
    <text x="835" y="54" text-anchor="middle" fill="#ffffff" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="800">${escapeXml(priceText)}</text>
  </g>

  <!-- Footer CTA (no invented voucher / QR) -->
  <g transform="translate(56, 600)">
    <rect x="0" y="0" width="968" height="220" fill="#080a0f" stroke="${primary}" stroke-width="2" stroke-dasharray="10 6"/>
    <rect x="0" y="0" width="968" height="36" fill="${primary}" fill-opacity="0.16"/>
    <text x="20" y="24" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="700">SHAREABLE UMKM SHOWCASE // HUMAN REVIEWED</text>
    <text x="24" y="78" fill="#94a3b8" font-family="DejaVu Sans Mono, monospace" font-size="12">CTA</text>
    <rect x="24" y="88" width="280" height="46" fill="${primary}"/>
    <text x="164" y="118" text-anchor="middle" fill="#080a0f" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="900">MAMPIR KE WARUNG</text>
    <text x="332" y="100" fill="#f8fafc" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="800">${escapeXml(storeLine)}</text>
    <text x="332" y="130" fill="${secondary}" font-family="DejaVu Sans Mono, monospace" font-size="15" font-weight="700">${escapeXml(priceText)} · ${escapeXml(productLine.slice(0, 28))}</text>
    <text x="332" y="158" fill="#94a3b8" font-family="DejaVu Sans Mono, monospace" font-size="13">Beli langsung di toko — harga dari katalog</text>
    <text x="24" y="198" fill="#64748b" font-family="DejaVu Sans Mono, monospace" font-size="11">NUSANTARASOFT · KONTEN MARKETING UMKM · APPROVE GATE</text>
    <g transform="translate(820, 60)">
      <rect x="0" y="0" width="112" height="112" fill="#0b0e13" stroke="${primary}" stroke-width="1.5"/>
      <rect x="10" y="10" width="26" height="26" fill="${primary}"/>
      <rect x="76" y="10" width="26" height="26" fill="${primary}"/>
      <rect x="10" y="76" width="26" height="26" fill="${primary}"/>
      <rect x="44" y="44" width="24" height="24" fill="${secondary}"/>
      <rect x="76" y="76" width="12" height="12" fill="#ffffff"/>
      <rect x="90" y="90" width="12" height="12" fill="${primary}"/>
    </g>
  </g>

  <!-- Bottom bar -->
  <rect x="56" y="860" width="968" height="160" fill="#000000"/>
  <text x="80" y="920" fill="#ffffff" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="800">${escapeXml(storeLine)}</text>
  <text x="80" y="955" fill="${primary}" font-family="DejaVu Sans Mono, monospace" font-size="14">Kunjungi warung · belanja langsung</text>
  <text x="80" y="990" fill="#64748b" font-family="DejaVu Sans Mono, monospace" font-size="12">nusantarasoft.com · brochure-gallery</text>
</svg>`;

    const chrome = await sharp(Buffer.from(chromeSvg)).png().toBuffer();

    // Hero photo centered in ring at (820, 300)
    const heroLeft = Math.round(820 - heroSize / 2);
    const heroTop = Math.round(300 - heroSize / 2);

    return sharp(chrome)
        .composite([{ input: heroPhoto, top: heroTop, left: heroLeft }])
        .png()
        .toBuffer();
}
