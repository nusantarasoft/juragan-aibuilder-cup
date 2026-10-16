export type WhatsAppSendResult = { success: boolean; error?: string };

export type WhatsAppChoice = { id: string; text: string };

export type WhatsAppMediaDownload = {
    buffer: Buffer;
    mimetype: string;
    filename: string;
} | null;

export type WhatsAppProviderId = 'hermes';

export const WHATSAPP_TRANSPORT = Symbol('WHATSAPP_TRANSPORT');

export interface WhatsAppTransport {
    readonly providerId: WhatsAppProviderId;

    /** Default session name for pipe (Hermes kasir-pipe session). */
    readonly defaultSession: string;

    phoneToChatId(phone: string): string;

    sendText(chatId: string, text: string, session?: string): Promise<WhatsAppSendResult>;

    sendButtons(
        chatId: string,
        body: string,
        buttons: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult>;

    sendList(
        chatId: string,
        body: string,
        rows: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult>;

    downloadMedia(messageId: string, session?: string): Promise<WhatsAppMediaDownload>;

    /** Cheap reachability check for health / preflight (~timeout caller-owned). */
    ping(timeoutMs?: number): Promise<{ ok: boolean; detail?: string }>;
}
