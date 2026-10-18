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

    const prompt = `Hero visual for a square social-media showcase card (UMKM warung Indonesia).
Product theme: ${name}. ${context}
Appetizing, inviting promo still-life or lifestyle food/retail scene — feels like a brochure hero image, not a sterile packshot.
Warm natural lighting, shallow depth of field, clean uncluttered composition suitable for overlay text below.
Strict rules: no text, no logos, no price tags, no watermarks, no people faces, no invented brand packaging labels.`;

    return generateMarketingImageFromPrompt(params, prompt);
}
