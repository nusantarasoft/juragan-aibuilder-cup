import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    WhatsAppChoice,
    WhatsAppMediaDownload,
    WhatsAppProviderId,
    WhatsAppSendResult,
    WhatsAppTransport,
} from './whatsapp-transport.types';

/**
 * Outbound WhatsApp via Hermes Baileys bridge (HTTP).
 *
 * Bridge listens on 127.0.0.1 inside the hermes container; kasir-pipe proxy
 * exposes it on the docker network (HERMES_BRIDGE_URL, default http://hermes:8765).
 *
 * Interactive buttons/lists: try /send-poll; caller falls back to sendText on failure.
 */
@Injectable()
export class HermesProvider implements WhatsAppTransport {
    private readonly logger = new Logger(HermesProvider.name);
    readonly providerId: WhatsAppProviderId = 'hermes';

    constructor(private readonly configService: ConfigService) {}

    get defaultSession(): string {
        return this.configService.get('KASIR_PIPE_SESSION') || 'hermes';
    }

    get bridgeUrl(): string {
        return (
            this.configService.get('HERMES_BRIDGE_URL') ||
            this.configService.get('HERMES_BASE_URL') ||
            'http://hermes:8765'
        ).replace(/\/$/, '');
    }

    phoneToChatId(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        if (phone.includes('@')) return phone;
        return `${digits}@s.whatsapp.net`;
    }

    private async postJson(
        path: string,
        body: Record<string, unknown>,
        timeoutMs = 30000,
    ): Promise<{ ok: boolean; status: number; text: string; json?: any }> {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetch(`${this.bridgeUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: ctrl.signal,
            });
            const text = await res.text();
            let json: any;
            try {
                json = JSON.parse(text);
            } catch {
                /* plain */
            }
            return { ok: res.ok, status: res.status, text, json };
        } finally {
            clearTimeout(t);
        }
    }

    async sendText(chatId: string, text: string, _session?: string): Promise<WhatsAppSendResult> {
        try {
            const res = await this.postJson('/send', {
                chatId: this.normalizeJid(chatId),
                message: text,
            });
            if (!res.ok) {
                throw new Error(`${res.status}: ${res.text}`);
            }
            return { success: true };
        } catch (e: any) {
            this.logger.warn(`sendText failed: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }

    /**
     * Map confirm buttons → native poll when bridge supports /send-poll.
     * Otherwise fail so StudioWhatsAppService falls back to sendList / sendText.
     */
    async sendButtons(
        chatId: string,
        body: string,
        buttons: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult> {
        return this.sendAsPoll(chatId, body, buttons, session);
    }

    async sendList(
        chatId: string,
        body: string,
        rows: WhatsAppChoice[],
        session?: string,
    ): Promise<WhatsAppSendResult> {
        return this.sendAsPoll(chatId, body, rows, session);
    }

    private async sendAsPoll(
        chatId: string,
        body: string,
        choices: WhatsAppChoice[],
        _session?: string,
    ): Promise<WhatsAppSendResult> {
        if (!choices.length) {
            return { success: false, error: 'no choices' };
        }
        try {
            const res = await this.postJson('/send-poll', {
                chatId: this.normalizeJid(chatId),
                name: body.slice(0, 200) || 'Konfirmasi',
                values: choices.map((c) => `${c.text}`),
                selectableCount: 1,
                // Preserve ids for inbound mapping if bridge echoes them
                optionIds: choices.map((c) => c.id),
            });
            if (res.ok) return { success: true };
            return { success: false, error: `${res.status}: ${res.text}` };
        } catch (e: any) {
            this.logger.warn(`send-poll failed: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }

    async downloadMedia(
        messageId: string,
        _session?: string,
    ): Promise<WhatsAppMediaDownload> {
        // Bridge may expose media under /media/:id — best-effort; null → text-only path.
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 15000);
            try {
                const res = await fetch(`${this.bridgeUrl}/media/${encodeURIComponent(messageId)}`, {
                    signal: ctrl.signal,
                });
                if (!res.ok) return null;
                const buffer = Buffer.from(await res.arrayBuffer());
                const mimetype =
                    res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
                return { buffer, mimetype, filename: `wa-media-${messageId}` };
            } finally {
                clearTimeout(t);
            }
        } catch {
            this.logger.warn(`downloadMedia failed for message ${messageId}`);
            return null;
        }
    }

    async ping(timeoutMs = 1500): Promise<{ ok: boolean; detail?: string }> {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            for (const path of ['/health', '/status']) {
                try {
                    const res = await fetch(`${this.bridgeUrl}${path}`, { signal: ctrl.signal });
                    if (res.ok) return { ok: true };
                } catch {
                    /* try next */
                }
            }
            return { ok: false, detail: 'unreachable' };
        } finally {
            clearTimeout(t);
        }
    }

    private async bridgeGet(path: string, timeoutMs = 8000): Promise<any> {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetch(`${this.bridgeUrl}${path}`, { signal: ctrl.signal });
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch {
                return { ok: res.ok, status: res.status, text };
            }
        } finally {
            clearTimeout(t);
        }
    }

    async getSessionStatus(): Promise<{
        name: string;
        status: string;
        connected: boolean;
        meId?: string;
        provider: string;
        credsPresent?: boolean;
        error?: string;
    } | null> {
        try {
            const data = await this.bridgeGet('/pair/status');
            if (!data || data.status === undefined) return null;
            return {
                name: data.name || 'hermes',
                status: String(data.status || 'UNKNOWN').toUpperCase(),
                connected: Boolean(data.connected),
                meId: data.meId || undefined,
                provider: 'hermes',
                credsPresent: data.credsPresent,
                error: data.error || undefined,
            };
        } catch (e: any) {
            this.logger.warn(`getSessionStatus: ${e?.message}`);
            return null;
        }
    }

    async getAuthQr(): Promise<{
        available: boolean;
        imageBase64: string | null;
        mimetype: string | null;
        qr?: string | null;
        error: string | null;
        connected?: boolean;
    }> {
        try {
            const data = await this.bridgeGet('/pair/qr');
            return {
                available: Boolean(data?.available),
                imageBase64: data?.imageBase64 || null,
                mimetype: data?.mimetype || null,
                qr: data?.qr || null,
                error: data?.error || null,
                connected: data?.connected,
            };
        } catch (e: any) {
            return {
                available: false,
                imageBase64: null,
                mimetype: null,
                qr: null,
                error: e?.message || 'Hermes pair API unreachable',
            };
        }
    }

    async startSession(force = false): Promise<{ status: string; connected: boolean; error?: string }> {
        try {
            const data = await this.postJson('/pair/start', force ? { force: true } : {});
            const body = data.json || {};
            if (body.connected) {
                await this.postJson('/pair/reload', {});
            }
            return {
                status: String(body.status || (data.ok ? 'STARTING' : 'ERROR')),
                connected: Boolean(body.connected),
                error: body.error,
            };
        } catch (e: any) {
            return { status: 'ERROR', connected: false, error: e?.message };
        }
    }

    /** Wipe old phone session and start a fresh QR for a different number. */
    async rebindSession(): Promise<{ status: string; connected: boolean; error?: string }> {
        try {
            const data = await this.postJson('/pair/rebind', {});
            const body = data.json || {};
            return {
                status: String(body.status || 'SCAN_QR_CODE'),
                connected: Boolean(body.connected),
                error: body.error,
            };
        } catch (e: any) {
            return { status: 'ERROR', connected: false, error: e?.message };
        }
    }

    async logoutSession(): Promise<{ status: string }> {
        try {
            const data = await this.postJson('/pair/logout', {});
            return { status: String(data.json?.status || 'SCAN_QR_CODE') };
        } catch (e: any) {
            return { status: 'ERROR' };
        }
    }

    async syncSession(): Promise<{ status: string; connected: boolean }> {
        const st = await this.getSessionStatus();
        if (st?.credsPresent && !st.connected) {
            await this.postJson('/pair/reload', {});
            await new Promise((r) => setTimeout(r, 3000));
            const again = await this.getSessionStatus();
            return {
                status: again?.status || 'STARTING',
                connected: again?.connected ?? false,
            };
        }
        return { status: st?.status || 'UNKNOWN', connected: st?.connected ?? false };
    }

    async restartSession(): Promise<{ status: string }> {
        await this.postJson('/pair/reload', {});
        return { status: 'STARTING' };
    }

    private normalizeJid(chatId: string): string {
        if (chatId.includes('@')) return chatId;
        return this.phoneToChatId(chatId);
    }
}
