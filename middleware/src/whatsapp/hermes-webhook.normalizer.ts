/**
 * Normalize inbound webhook bodies to the envelope StudioWhatsAppService expects
 * (`event` + `session` + `payload.from`).
 *
 * Used by Nest `POST /api/studio/whatsapp/webhook` (Simulasi / legacy only).
 * Production kasir inbound is Hermes kasir-pipe → agent/tools — pipe does NOT
 * forward WA to this webhook. See docs/hermes-architecture.md.
 */
export function normalizeWhatsAppWebhook(
    body: Record<string, unknown>,
): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
        return { event: 'message', session: 'default', payload: {} };
    }

    // Already enveloped: event + payload.from
    const payload = (body.payload || null) as Record<string, unknown> | null;
    if (
        payload &&
        typeof payload === 'object' &&
        (payload.from || payload.chatId || payload.author)
    ) {
        return {
            ...body,
            event: body.event || 'message',
            session: body.session || 'default',
            payload,
        };
    }

    // Flat Hermes MessageEvent-ish / bridge forward without envelope
    const from =
        body.from ||
        body.chatId ||
        body.chat_id ||
        body.user_id ||
        (body.source as any)?.chat_id ||
        (body.source as any)?.user_id;

    if (from) {
        const text =
            (typeof body.body === 'string' && body.body) ||
            (typeof body.text === 'string' && body.text) ||
            (typeof body.message === 'string' && body.message) ||
            '';
        const selectedButtonId =
            body.selectedButtonId ||
            body.selectedRowId ||
            (body.prompt_response as any)?.option_id ||
            (body.interactive as any)?.button_reply?.id ||
            (body.interactive as any)?.list_reply?.id;

        const normalizedPayload: Record<string, unknown> = {
            from: String(from),
            fromMe: body.fromMe === true,
            body: text,
            notifyName: body.notifyName || body.pushName || body.user_name || '',
            id: body.id || body.message_id || body.messageId || '',
            source: body.source || 'hermes-normalized',
        };
        if (selectedButtonId) {
            normalizedPayload.selectedButtonId = String(selectedButtonId);
            normalizedPayload.selectedRowId = String(selectedButtonId);
        }

        return {
            event: String(body.event || 'message'),
            session: String(body.session || 'hermes'),
            payload: normalizedPayload,
            engine: body.engine || 'HERMES',
        };
    }

    // Pass-through unknown shapes (handler will warn)
    return body;
}
