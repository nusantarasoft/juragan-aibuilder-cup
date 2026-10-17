/** Outbound suffix for super-admin human replies (Akbar product lock). */
export const STUDIO_WA_HUMAN_REPLY_SUFFIX = '\n\n— Admin Nusantarasoft';

/** Text sent on WhatsApp and stored in studio_wa_messages for human replies. */
export function formatStudioWaHumanOutboundText(body: string): string {
    const trimmed = body.trim();
    if (!trimmed) return trimmed;
    if (trimmed.endsWith('— Admin Nusantarasoft')) {
        return trimmed;
    }
    return `${trimmed}${STUDIO_WA_HUMAN_REPLY_SUFFIX}`;
}
