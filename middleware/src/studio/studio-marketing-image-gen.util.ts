import { Logger } from '@nestjs/common';
import { getVertexAccessToken } from '../ai/google-vertex-auth.util';

const logger = new Logger('StudioMarketingImageGen');

/** Nano Banana / Flash image models (legacy preview IDs return HTTP 404). */
const GEMINI_IMAGE_MODEL_FALLBACKS = [
    'gemini-nano-banana-2.1',
    'gemini-3.1-flash-lite-image',
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
        generationConfig: { responseModalities: ['IMAGE'] },
    });
    const key = encodeURIComponent(apiKey.trim());
    let quotaExhausted = false;

    for (const model of geminiImageModelCandidates()) {
        if (quotaExhausted) break;
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
                    const errText = await res.text();
                    if (res.status === 429 && /quota|RESOURCE_EXHAUSTED/i.test(errText)) {
                        quotaExhausted = true;
                        logger.warn(
                            `Gemini image quota exhausted (${version}/${model}) — enable billing or use Vertex Imagen`,
                        );
                        break;
                    }
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

/** Workers AI FLUX Schnell — free daily neuron quota; env on middleware only. */
async function generateCloudflareFluxImage(prompt: string): Promise<Buffer | null> {
    const accountId =
        process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
        process.env.CL_ACCOUNT_ID?.trim() ||
        '';
    const token =
        process.env.CLOUDFLARE_API_TOKEN?.trim() ||
        process.env.CL_API_KEY?.trim() ||
        '';
    if (!accountId || !token) return null;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, steps: 4 }),
        });
        const json = (await res.json()) as {
            success?: boolean;
            result?: { image?: string };
            errors?: Array<{ message?: string }>;
        };
        if (!res.ok || !json.success) {
            const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
            logger.warn(`Cloudflare FLUX failed: ${msg}`);
            return null;
        }
        const b64 = json.result?.image?.trim();
        if (!b64) return null;
        logger.log('Cloudflare FLUX schnell product image OK');
        return Buffer.from(b64, 'base64');
    } catch (e: any) {
        logger.warn(`Cloudflare FLUX failed: ${e?.message}`);
        return null;
    }
}

async function generateVertexImagenImage(
    params: MarketingImageGenParams,
    prompt: string,
): Promise<Buffer | null> {
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
                instances: [{ prompt }],
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
        logger.log('Vertex Imagen product image OK');
        return Buffer.from(b64, 'base64');
    } catch (e: any) {
        logger.warn(`Imagen failed: ${e?.message}`);
        return null;
    }
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
        const fromGemini = await generateGeminiApiKeyImage(params.apiKey, trimmed);
        if (fromGemini) return fromGemini;
    }

    const fromCloudflare = await generateCloudflareFluxImage(trimmed);
    if (fromCloudflare) return fromCloudflare;

    return generateVertexImagenImage(params, trimmed);
}
