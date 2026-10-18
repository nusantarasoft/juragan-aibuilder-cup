import { isLlmProviderErrorOutput } from './studio-research.util';

export type MarketingContentStatus =
    | 'draft'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'unpublished';

export type EligibleProductRow = {
    tenant_id: string;
    item_id: string;
    product_name: string;
    selling_price: number | null;
    media_id: string | null;
    store_label: string;
    category_name: string | null;
    marketing_consent: boolean;
};

/** Rupiah formatting for overlay text (truthful DB price). */
export function formatPriceIdr(amount: number | null | undefined): string {
    if (amount == null || Number.isNaN(Number(amount))) return 'Harga hubungi warung';
    const n = Math.round(Number(amount));
    return `Rp ${n.toLocaleString('id-ID')}`;
}

export function productHasRealPhoto(mediaIds: unknown): boolean {
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) return false;
    const first = mediaIds[0];
    return typeof first === 'string' && first.trim().length > 0;
}

/** Filter catalog rows to consenting stores; photo optional when AI product image is enabled. */
export function filterEligibleProducts(
    rows: EligibleProductRow[],
    opts?: { allowAiProductImage?: boolean },
): EligibleProductRow[] {
    const allowAi = opts?.allowAiProductImage === true;
    return rows.filter((r) => {
        if (r.marketing_consent !== true) return false;
        if (r.media_id?.trim()) return true;
        return allowAi;
    });
}

export type MarketingCaptionPayload = {
    caption: string;
    headline: string;
};

export function parseMarketingCaptionJson(raw: string): MarketingCaptionPayload | null {
    const trimmed = raw.trim();
    const jsonBlock = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    const candidate = jsonBlock?.[1]?.trim() ?? trimmed;
    try {
        const parsed = JSON.parse(candidate) as MarketingCaptionPayload;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(candidate.slice(start, end + 1)) as MarketingCaptionPayload;
            } catch {
                return null;
            }
        }
        return null;
    }
}

/** Treat LLM provider failures as hard errors (no silent fallback caption). */
export function finalizeMarketingCaptionLlm(raw: string): MarketingCaptionPayload {
    if (isLlmProviderErrorOutput(raw)) {
        throw new Error(`LLM provider error: ${raw.trim().slice(0, 240)}`);
    }
    const parsed = parseMarketingCaptionJson(raw);
    if (!parsed) {
        throw new Error('LLM tidak mengembalikan JSON valid untuk caption marketing');
    }
    const caption = (parsed.caption ?? '').trim();
    const headline = (parsed.headline ?? '').trim();
    if (caption.length < 12) {
        throw new Error('Caption marketing terlalu pendek');
    }
    if (headline.length < 3) {
        throw new Error('Headline marketing terlalu pendek');
    }
    return { caption: caption.slice(0, 2200), headline: headline.slice(0, 200) };
}

export function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Wrap long product names for SVG overlay (max chars per line). */
export function wrapOverlayLines(text: string, maxLen = 28, maxLines = 2): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (next.length <= maxLen) {
            current = next;
        } else {
            if (current) lines.push(current);
            current = w;
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length === 0) lines.push(text.slice(0, maxLen));
    if (words.join(' ').length > lines.join(' ').length && lines.length > 0) {
        const last = lines[lines.length - 1];
        if (!last.endsWith('…') && last.length >= maxLen - 1) {
            lines[lines.length - 1] = `${last.slice(0, maxLen - 1)}…`;
        }
    }
    return lines;
}

export type PublicGalleryItem = {
    id: string;
    imageUrl: string;
    caption: string;
    headline: string;
    productName: string;
    price: string;
    storeLabel: string;
    category: string | null;
    publishedAt: string | null;
};

/** Only approved rows from consented tenants should be exposed publicly. */
export function isPublicGalleryRow(row: {
    status: string;
    marketing_consent?: boolean | null;
}): boolean {
    return row.status === 'approved' && row.marketing_consent === true;
}
