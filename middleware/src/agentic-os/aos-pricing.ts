/**
 * Rough USD price table for Agentic OS run accounting (per 1M tokens, input/output).
 * Matched by case-insensitive substring of the model name (first match wins, so keep
 * the more specific names first). Unknown models fall back to DEFAULT_PRICE; local
 * providers (ollama) are free. Estimates only — used for the daily cost ceiling.
 */
export interface AosPrice {
    inPerM: number;
    outPerM: number;
}

export const DEFAULT_PRICE: AosPrice = { inPerM: 0.5, outPerM: 1.5 };

const PRICE_TABLE: ReadonlyArray<readonly [string, AosPrice]> = [
    // Google
    ['gemini-2.5-pro', { inPerM: 1.25, outPerM: 10 }],
    ['gemini-2.5-flash-lite', { inPerM: 0.1, outPerM: 0.4 }],
    ['gemini-2.5-flash', { inPerM: 0.3, outPerM: 2.5 }],
    ['gemini-2.0-flash-lite', { inPerM: 0.075, outPerM: 0.3 }],
    ['gemini-2.0-flash', { inPerM: 0.1, outPerM: 0.4 }],
    ['gemini-1.5-pro', { inPerM: 1.25, outPerM: 5 }],
    ['gemini-1.5-flash', { inPerM: 0.075, outPerM: 0.3 }],
    // Anthropic
    ['claude-opus', { inPerM: 15, outPerM: 75 }],
    ['claude-3-opus', { inPerM: 15, outPerM: 75 }],
    ['claude-sonnet', { inPerM: 3, outPerM: 15 }],
    ['claude-3-5-sonnet', { inPerM: 3, outPerM: 15 }],
    ['claude-3-7-sonnet', { inPerM: 3, outPerM: 15 }],
    ['claude-3-5-haiku', { inPerM: 0.8, outPerM: 4 }],
    ['claude-haiku', { inPerM: 1, outPerM: 5 }],
    ['claude-3-haiku', { inPerM: 0.25, outPerM: 1.25 }],
    // OpenAI
    ['gpt-4o-mini', { inPerM: 0.15, outPerM: 0.6 }],
    ['gpt-4o', { inPerM: 2.5, outPerM: 10 }],
    ['gpt-4.1-nano', { inPerM: 0.1, outPerM: 0.4 }],
    ['gpt-4.1-mini', { inPerM: 0.4, outPerM: 1.6 }],
    ['gpt-4.1', { inPerM: 2, outPerM: 8 }],
    ['o4-mini', { inPerM: 1.1, outPerM: 4.4 }],
    ['o3-mini', { inPerM: 1.1, outPerM: 4.4 }],
    ['gpt-3.5', { inPerM: 0.5, outPerM: 1.5 }],
    // Groq-hosted open models
    ['llama-3.1-8b', { inPerM: 0.05, outPerM: 0.08 }],
    ['llama-3.3-70b', { inPerM: 0.59, outPerM: 0.79 }],
    ['llama', { inPerM: 0.2, outPerM: 0.2 }],
    ['mixtral', { inPerM: 0.24, outPerM: 0.24 }],
    ['gemma', { inPerM: 0.2, outPerM: 0.2 }],
];

const FREE_PROVIDERS = new Set(['ollama', 'fallback']);

export function priceFor(provider: string | null | undefined, model: string | null | undefined): AosPrice {
    if (provider && FREE_PROVIDERS.has(provider.toLowerCase())) return { inPerM: 0, outPerM: 0 };
    const m = (model || '').toLowerCase();
    if (m) {
        for (const [needle, price] of PRICE_TABLE) {
            if (m.includes(needle)) return price;
        }
    }
    return DEFAULT_PRICE;
}

/** Estimated USD cost of one call, rounded to 4 decimals (aos_runs.cost_usd precision). */
export function estimateCostUsd(
    provider: string | null | undefined,
    model: string | null | undefined,
    tokensIn: number,
    tokensOut: number,
): number {
    const p = priceFor(provider, model);
    const cost = (Math.max(0, tokensIn) * p.inPerM + Math.max(0, tokensOut) * p.outPerM) / 1_000_000;
    return Math.round(cost * 10000) / 10000;
}
