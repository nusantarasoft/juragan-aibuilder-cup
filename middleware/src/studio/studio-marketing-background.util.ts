import { Logger } from '@nestjs/common';
import { getVertexAccessToken } from '../ai/google-vertex-auth.util';

const logger = new Logger('StudioMarketingBackground');

/**
 * Optional abstract background via Vertex Imagen (graceful null on failure).
 */
export async function tryGenerateMarketingBackground(params: {
    projectId: string;
    location: string;
    serviceAccountJson?: string | null;
    apiKey?: string | null;
}): Promise<Buffer | null> {
    const prompt =
        'Abstract soft bokeh background for food retail marketing, warm colors, no text, no logos, no products, no people, subtle gradient';

    if (params.apiKey?.trim()) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${encodeURIComponent(params.apiKey.trim())}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
                }),
            });
            if (!res.ok) {
                logger.warn(`Gemini image API HTTP ${res.status}`);
                return null;
            }
            const json = (await res.json()) as {
                candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
            };
            const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
                ?.data;
            if (!b64) return null;
            return Buffer.from(b64, 'base64');
        } catch (e: any) {
            logger.warn(`Gemini background failed: ${e?.message}`);
            return null;
        }
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
        return Buffer.from(b64, 'base64');
    } catch (e: any) {
        logger.warn(`Imagen background failed: ${e?.message}`);
        return null;
    }
}
