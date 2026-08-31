import { Injectable } from '@nestjs/common';
import { WahaClientService } from '../waha/waha-client.service';
import {
    WhatsAppChoice,
    WhatsAppMediaDownload,
    WhatsAppProviderId,
    WhatsAppSendResult,
    WhatsAppTransport,
} from './whatsapp-transport.types';

@Injectable()
export class WahaProvider implements WhatsAppTransport {
    readonly providerId: WhatsAppProviderId = 'waha';

    constructor(private readonly waha: WahaClientService) {}

    get defaultSession(): string {
        return this.waha.defaultSession;
    }

    phoneToChatId(phone: string): string {
        return this.waha.phoneToChatId(phone);
    }

    sendText(chatId: string, text: string, session?: string): Promise<WhatsAppSendResult> {
        return this.waha.sendText(chatId, text, session);
    }

    sendButtons(
        chatId: string,
        body: string,
        buttons: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult> {
        return this.waha.sendButtons(chatId, body, buttons, session);
    }

    sendList(
        chatId: string,
        body: string,
        rows: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult> {
        return this.waha.sendList(chatId, body, rows, session);
    }

    downloadMedia(messageId: string, session?: string): Promise<WhatsAppMediaDownload> {
        return this.waha.downloadMedia(messageId, session);
    }

    async ping(timeoutMs = 1500): Promise<{ ok: boolean; detail?: string }> {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const url = `${this.waha.baseUrl}/api/version`;
            const headers: Record<string, string> = {};
            if (this.waha.apiKey) headers['X-Api-Key'] = this.waha.apiKey;
            const res = await fetch(url, { headers, signal: ctrl.signal });
            if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
            return { ok: true };
        } catch (e: any) {
            return { ok: false, detail: e?.message || 'unreachable' };
        } finally {
            clearTimeout(t);
        }
    }
}
