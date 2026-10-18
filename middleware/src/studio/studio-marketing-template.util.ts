import { createRequire } from 'node:module';
import type { Sharp } from 'sharp';
import { escapeXml, formatPriceIdr, wrapOverlayLines } from './studio-marketing.util';

const nodeRequire = createRequire(__filename);
const sharp = nodeRequire('sharp') as typeof import('sharp');

export type MarketingTemplateInput = {
    productName: string;
    priceIdr: number | null;
    storeLabel: string;
    productPhoto: Buffer;
    background?: Buffer | null;
};

const CANVAS = 1080;

/**
 * Branded NS-style square showcase card: foto inventory atau hero AI + teks dari DB (bukan teks AI).
 */
export async function renderMarketingTemplatePng(input: MarketingTemplateInput): Promise<Buffer> {
    const priceText = formatPriceIdr(input.priceIdr);
    const nameLines = wrapOverlayLines(input.productName, 26, 2);
    const storeLine = input.storeLabel.trim().slice(0, 48) || 'Warung UMKM';

    let base: Sharp;
    if (input.background?.length) {
        base = sharp(input.background).resize(CANVAS, CANVAS, { fit: 'cover' }).blur(2);
    } else {
        const gradientSvg = `<svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f2744"/>
      <stop offset="100%" stop-color="#1e4d8c"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;
        base = sharp(Buffer.from(gradientSvg)).png();
    }

    const photoArea = await sharp(input.productPhoto)
        .resize(920, 620, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();

    const photoRounded = await sharp(photoArea)
        .composite([
            {
                input: Buffer.from(
                    `<svg width="920" height="620"><rect x="0" y="0" width="920" height="620" rx="32" ry="32" fill="white"/></svg>`,
                ),
                blend: 'dest-in',
            },
        ])
        .png()
        .toBuffer();

    const nameSvgLines = nameLines
        .map(
            (line, i) =>
                `<tspan x="540" dy="${i === 0 ? 0 : 42}">${escapeXml(line)}</tspan>`,
        )
        .join('');

    const overlaySvg = `<svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${CANVAS}" height="180" fill="rgba(15,39,68,0.92)"/>
  <text x="540" y="72" text-anchor="middle" fill="#ffffff" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="700">Nusantarasoft UMKM</text>
  <text x="540" y="118" text-anchor="middle" fill="#a8c4e8" font-family="DejaVu Sans, Arial, sans-serif" font-size="22">${escapeXml(storeLine)}</text>
  <text x="540" y="880" text-anchor="middle" fill="#ffffff" font-family="DejaVu Sans, Arial, sans-serif" font-size="38" font-weight="700">${nameSvgLines}</text>
  <text x="540" y="960" text-anchor="middle" fill="#f6d365" font-family="DejaVu Sans, Arial, sans-serif" font-size="44" font-weight="700">${escapeXml(priceText)}</text>
  <text x="540" y="1020" text-anchor="middle" fill="#cbd5e1" font-family="DejaVu Sans, Arial, sans-serif" font-size="20">Kunjungi warung — beli langsung di toko</text>
</svg>`;

    const overlayPng = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

    return base
        .composite([
            { input: photoRounded, top: 200, left: 80 },
            { input: overlayPng, top: 0, left: 0 },
        ])
        .png()
        .toBuffer();
}
