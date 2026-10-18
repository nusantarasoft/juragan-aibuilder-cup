import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { renderMarketingTemplatePng } from './studio-marketing-template.util';

describe('renderMarketingTemplatePng', () => {
    it('produces a non-empty PNG buffer (smoke)', async () => {
        const productPhoto = await sharp({
            create: {
                width: 400,
                height: 400,
                channels: 3,
                background: { r: 200, g: 120, b: 80 },
            },
        })
            .jpeg()
            .toBuffer();

        const png = await renderMarketingTemplatePng({
            productName: 'Kerupuk Udang',
            priceIdr: 15000,
            storeLabel: 'Warung Makmur',
            productPhoto,
        });

        expect(png.length).toBeGreaterThan(500);
        const meta = await sharp(png).metadata();
        expect(meta.format).toBe('png');
        expect(meta.width).toBe(1080);
    });
});
