import { Logger } from '@nestjs/common';
import { getVertexAccessToken } from '../ai/google-vertex-auth.util';

const logger = new Logger('StudioMarketingImageGen');

/** Nano Banana / Flash image models (legacy preview IDs return HTTP 404). */
const GEMINI_IMAGE_MODEL_FALLBACKS = [
    'gemini-nano-banana-2.1',
    'gemini-3.1-flash-image',
    'gemini-2.5-flash-image',
] as const;

function geminiImageModelCandidates(): string[] {
    const preferred = process.env.STUDIO_MARKETING_GEMINI_IMAGE_MODEL?.trim();
    const list = preferred
        ? [preferred, ...GEMINI_IMAGE_MODEL_FALLBACKS]
        : [...GEMINI_IMAGE_MODEL_FALLBACKS];
    return [...new Set(list.filter((m) => m.length > 0))];
}

function extractInlineImageB64(json: {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
}): string | null {
    const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
        ?.data;
    return b64?.trim() ? b64 : null;
}

async function generateGeminiApiKeyImage(apiKey: string, prompt: string): Promise<Buffer | null> {
    const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    const key = encodeURIComponent(apiKey.trim());

    for (const model of geminiImageModelCandidates()) {
        for (const version of ['v1', 'v1beta'] as const) {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                });
                if (!res.ok) {
                    if (res.status === 404) continue;
                    logger.warn(`Gemini image API HTTP ${res.status} (${version}/${model})`);
                    continue;
                }
                const json = (await res.json()) as Parameters<typeof extractInlineImageB64>[0];
                const b64 = extractInlineImageB64(json);
                if (b64) {
                    logger.log(`Gemini image OK (${version}/${model})`);
                    return Buffer.from(b64, 'base64');
                }
            } catch (e: any) {
                logger.warn(`Gemini image failed (${version}/${model}): ${e?.message}`);
            }
        }
    }
    return null;
}

export type MarketingImageGenParams = {
    projectId: string;
    location: string;
    serviceAccountJson?: string | null;
    apiKey?: string | null;
};

/** Gemini (API key) or Vertex Imagen — returns PNG bytes or null on failure. */
export async function generateMarketingImageFromPrompt(
    params: MarketingImageGenParams,
    prompt: string,
): Promise<Buffer | null> {
    const trimmed = prompt.trim();
    if (!trimmed) return null;

    if (params.apiKey?.trim()) {
        return generateGeminiApiKeyImage(params.apiKey, trimmed);
    }

    const token = await getVertexAccessToken({
        serviceAccountJson: params.serviceAccountJson,
        projectId: params.projectId,
    });
    if (!token || !params.projectId?.trim()) return null;

    const loc = params.location?.trim() || 'us-central1';
    const endpoint = `https://${loc}-aiplatform.googleapis.com/v1/projects/${params.projectId}/locations/${loc}/publishers/google/models/imagen-3.0-generate-001:predict`;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: [{ prompt: trimmed }],
                parameters: { sampleCount: 1, aspectRatio: '1:1' },
            }),
        });
        if (!res.ok) {
            logger.warn(`Imagen predict HTTP ${res.status}`);
            return null;
        }
        const json = (await res.json()) as {
            predictions?: Array<{ bytesBase64Encoded?: string }>;
        };
        const b64 = json.predictions?.[0]?.bytesBase64Encoded;
        if (!b64) return null;
        return Buffer.from(b64, 'base64');
    } catch (e: any) {
        logger.warn(`Imagen failed: ${e?.message}`);
        return null;
    }
}
