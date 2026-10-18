import {
    generateMarketingImageFromPrompt,
    type MarketingImageGenParams,
} from './studio-marketing-image-gen.util';

/**
 * Optional abstract background via Gemini / Imagen (graceful null on failure).
 */
export async function tryGenerateMarketingBackground(
    params: MarketingImageGenParams,
): Promise<Buffer | null> {
    const prompt =
        'Abstract soft bokeh background for food retail marketing, warm colors, no text, no logos, no products, no people, subtle gradient';
    return generateMarketingImageFromPrompt(params, prompt);
}
