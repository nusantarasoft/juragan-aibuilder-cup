/**
 * Normalize inbound webhook bodies to the WAHA-shaped contract StudioWhatsAppService expects.
 *
 * Always runs (D2): if already WAHA-shaped, pass through.
 * Hermes kasir-pipe already emits WAHA-shaped JSON; this covers drift + future bridge formats.
 */
export function normalizeWhatsAppWebhook(
    body: Record<string, unknown>,
): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
        return { event: 'message', session: 'default', payload: {} };
    }

    // Already WAHA-shaped: event + payload.from
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

    // Hermes MessageEvent-ish / bridge forward without WAHA envelope
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
