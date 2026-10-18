import {
    generateMarketingImageFromPrompt,
    type MarketingImageGenParams,
} from './studio-marketing-image-gen.util';

/**
 * AI hero visual for the Sharp showcase card when inventory has no upload.
 * Output is composited into the kartu promo (bukan foto katalog inventory).
 */
export async function tryGenerateMarketingProductImage(
    params: MarketingImageGenParams & {
        productName: string;
        categoryName?: string | null;
        storeLabel?: string | null;
    },
): Promise<Buffer | null> {
    const name = params.productName.trim().slice(0, 120) || 'produk warung';
    const category = params.categoryName?.trim().slice(0, 80);
    const store = params.storeLabel?.trim().slice(0, 60);

    const context = [
        category ? `Kategori: ${category}.` : '',
        store ? `Konteks warung UMKM Indonesia (${store}).` : 'Warung UMKM Indonesia.',
    ]
        .filter(Boolean)
        .join(' ');

    const prompt = `Stylized technical HUD illustration for Indonesian UMKM tenant showcase brochure.
Product theme: ${name}. ${context}
Dark charcoal background (#0b0e13), faint tech grid, single neon accent (orange or rose).
Centered circular badge with dashed neon ring; inside: flat vector / line-art of the product
(minimal geometry, soft neon glow) — cyberpunk brochure aesthetic like a digital share-card icon,
NOT a photoreal packshot and NOT a full UI chrome layout.
Strict rules: no text, no logos, no price tags, no watermarks, no people faces, no QR codes.`;

    return generateMarketingImageFromPrompt(params, prompt);
}
