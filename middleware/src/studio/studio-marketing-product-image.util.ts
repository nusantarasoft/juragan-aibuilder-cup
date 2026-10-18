import {
    generateMarketingImageFromPrompt,
    type MarketingImageGenParams,
} from './studio-marketing-image-gen.util';

/** AI product photo when inventory has no upload (Gemini image / Imagen). */
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

    const prompt = `Professional appetizing product photograph for Indonesian small-shop marketing.
Product: ${name}. ${context}
Single product centered, realistic food or retail photography, soft natural lighting, clean background, shallow depth of field.
Strict rules: no text, no logos, no price tags, no watermarks, no people, no brand names other than generic presentation.`;

    return generateMarketingImageFromPrompt(params, prompt);
}
