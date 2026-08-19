import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WahaSendResult = { success: boolean; error?: string };

@Injectable()
export class WahaClientService {
    private readonly logger = new Logger(WahaClientService.name);

    constructor(private readonly configService: ConfigService) {}

    get baseUrl(): string {
        return (this.configService.get('WAHA_BASE_URL') || 'http://waha:3000').replace(/\/$/, '');
    }

    get apiKey(): string {
        return this.configService.get('WAHA_API_KEY') || '';
    }

    get defaultSession(): string {
        return this.configService.get('WAHA_SESSION') || 'default';
    }

    /** E.164-ish digits only → WhatsApp chatId */
    phoneToChatId(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        return `${digits}@c.us`;
    }

    private headers(json = true): Record<string, string> {
        const h: Record<string, string> = {};
        if (json) h['Content-Type'] = 'application/json';
        if (this.apiKey) h['X-Api-Key'] = this.apiKey;
        return h;
    }

    async sendText(chatId: string, text: string, session?: string): Promise<WahaSendResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/sendText`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({
                    session: session || this.defaultSession,
                    chatId,
                    text,
                }),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`${response.status}: ${err}`);
            }
            return { success: true };
        } catch (e: any) {
            this.logger.warn(`sendText failed: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }

    /**
     * Reply buttons under a sale/purchase preview. Falls back to caller sendText if WAHA
     * rejects the endpoint (Core vs Plus, or engine without buttons).
     */
    async sendButtons(
        chatId: string,
        body: string,
        buttons: { id: string; text: string }[],
        session?: string,
    ): Promise<WahaSendResult> {
        const payload = {
            session: session || this.defaultSession,
            chatId,
            body,
            buttons: buttons.map((b) => ({ id: b.id, text: b.text })),
        };
        const urls = [`${this.baseUrl}/api/sendButtons`, `${this.baseUrl}/api/send/buttons`];
        let lastErr = 'sendButtons failed';
        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: this.headers(),
                    body: JSON.stringify(payload),
                });
                if (response.ok) return { success: true };
                lastErr = `${response.status}: ${await response.text()}`;
                if (response.status !== 404 && response.status !== 405) break;
            } catch (e: any) {
                lastErr = e?.message || lastErr;
            }
        }
        this.logger.warn(`sendButtons failed: ${lastErr}`);
        return { success: false, error: lastErr };
    }

    async sendImage(
        chatId: string,
        file: { url?: string; base64?: string; mimetype?: string; filename?: string },
        caption?: string,
        session?: string,
    ): Promise<WahaSendResult> {
        try {
            const body: Record<string, unknown> = {
                session: session || this.defaultSession,
                chatId,
                caption: caption || '',
            };
            if (file.url) {
                body.file = { url: file.url };
            } else if (file.base64) {
                body.file = {
                    data: file.base64,
                    mimetype: file.mimetype || 'image/jpeg',
                    filename: file.filename || 'image.jpg',
                };
            } else {
                return { success: false, error: 'No file url or base64' };
            }
            const response = await fetch(`${this.baseUrl}/api/sendImage`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`${response.status}: ${err}`);
            }
            return { success: true };
        } catch (e: any) {
            this.logger.warn(`sendImage failed: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }

    async sendFile(
        chatId: string,
        file: { url?: string; base64?: string; mimetype?: string; filename?: string },
        caption?: string,
        session?: string,
    ): Promise<WahaSendResult> {
        try {
            const body: Record<string, unknown> = {
                session: session || this.defaultSession,
                chatId,
                caption: caption || '',
            };
            if (file.url) {
                body.file = { url: file.url };
            } else if (file.base64) {
                body.file = {
                    data: file.base64,
                    mimetype: file.mimetype || 'application/octet-stream',
                    filename: file.filename || 'file.bin',
                };
            } else {
                return { success: false, error: 'No file url or base64' };
            }
            const response = await fetch(`${this.baseUrl}/api/sendFile`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`${response.status}: ${err}`);
            }
            return { success: true };
        } catch (e: any) {
            this.logger.warn(`sendFile failed: ${e?.message}`);
            return { success: false, error: e?.message };
        }
    }

    /** Download inbound media bytes (message id from webhook payload). */
    async downloadMedia(
        messageId: string,
        session?: string,
    ): Promise<{ buffer: Buffer; mimetype: string; filename: string } | null> {
        const sess = session || this.defaultSession;
        const paths = [
            `${this.baseUrl}/api/${sess}/messages/${messageId}/media`,
            `${this.baseUrl}/api/files/${sess}/${messageId}`,
        ];
        for (const url of paths) {
            try {
                const response = await fetch(url, { headers: this.headers(false) });
                if (!response.ok) continue;
                const buffer = Buffer.from(await response.arrayBuffer());
                const mimetype =
                    response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
                const filename =
                    response.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ||
                    `wa-media-${messageId}`;
                return { buffer, mimetype, filename };
            } catch {
                /* try next */
            }
        }
        this.logger.warn(`downloadMedia failed for message ${messageId}`);
        return null;
    }

    async getSessionStatus(session?: string): Promise<{
        name: string;
        status: string;
        connected: boolean;
        meId?: string;
        engineState?: string;
        pairedButStuck?: boolean;
    } | null> {
        const sess = session || this.defaultSession;
        try {
            const response = await fetch(`${this.baseUrl}/api/sessions/${sess}`, {
                headers: this.headers(false),
            });
            if (!response.ok) return null;
            const data = (await response.json()) as {
                name?: string;
                status?: string;
                me?: { id?: string };
                engine?: { state?: string };
            };
            const status = (data.status || 'UNKNOWN').toUpperCase();
            const engineState = (data.engine?.state || '').toUpperCase();
            const meId = data.me?.id;
            const connected = status === 'WORKING';
            return {
                name: data.name || sess,
                status,
                connected,
                meId,
                engineState: engineState || undefined,
                pairedButStuck:
                    Boolean(meId) &&
                    status !== 'WORKING' &&
                    (status === 'SCAN_QR_CODE' || status === 'STARTING'),
            };
        } catch (e: any) {
            this.logger.warn(`getSessionStatus: ${e?.message}`);
            return null;
        }
    }

    async getVersion(): Promise<{ version: string; engine: string } | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/version`, {
                headers: this.headers(false),
            });
            if (!response.ok) return null;
            const data = (await response.json()) as { version?: string; engine?: string };
            return { version: data.version || 'unknown', engine: data.engine || 'WEBJS' };
        } catch {
            return null;
        }
    }

    /** Restart session (keeps auth) — helps after QR scan on older WEBJS builds */
    async restartSession(session?: string): Promise<{ status: string }> {
        const sess = session || this.defaultSession;
        const h = this.headers();
        const restartRes = await fetch(`${this.baseUrl}/api/sessions/${sess}/restart`, {
            method: 'POST',
            headers: h,
        });
        if (!restartRes.ok) {
            const err = await restartRes.text();
            this.logger.warn(`restartSession: ${restartRes.status} ${err}`);
            return { status: 'ERROR' };
        }
        await new Promise((r) => setTimeout(r, 8000));
        const st = await this.getSessionStatus(sess);
        return { status: st?.status || 'STARTING' };
    }

    async syncStuckSession(session?: string): Promise<{ status: string; connected: boolean }> {
        const sess = session || this.defaultSession;
        let st = await this.getSessionStatus(sess);
        if (!st) return { status: 'ERROR', connected: false };
        if (st.connected) return { status: st.status, connected: true };
        if (st.pairedButStuck) {
            this.logger.log(`WAHA paired but status=${st.status}, restarting session...`);
            await this.restartSession(sess);
            st = await this.getSessionStatus(sess);
        }
        return { status: st?.status || 'UNKNOWN', connected: st?.connected ?? false };
    }

    async listSessions(): Promise<{ name: string; status: string }[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/sessions`, {
                headers: this.headers(false),
            });
            if (!response.ok) return [];
            const data = await response.json();
            if (!Array.isArray(data)) return [];
            return data.map((s: { name?: string; status?: string }) => ({
                name: s.name || 'default',
                status: (s.status || 'UNKNOWN').toUpperCase(),
            }));
        } catch {
            return [];
        }
    }

    /** Create session if missing and start it (idempotent). */
    async ensureSessionStarted(session?: string): Promise<{ status: string; connected: boolean }> {
        const sess = session || this.defaultSession;
        const h = this.headers();
        let st = await this.getSessionStatus(sess);

        if (st?.connected) {
            return { status: st.status, connected: true };
        }

        if (st?.status === 'STARTING' || st?.status === 'SCAN_QR_CODE') {
            return { status: st.status, connected: false };
        }

        if (st?.status === 'STOPPED') {
            const startRes = await fetch(`${this.baseUrl}/api/sessions/${sess}/start`, {
                method: 'POST',
                headers: h,
            });
            if (startRes.ok) {
                await new Promise((r) => setTimeout(r, 2000));
                st = await this.getSessionStatus(sess);
                return { status: st?.status || 'STARTING', connected: st?.connected ?? false };
            }
        }

        if (!st) {
            const createRes = await fetch(`${this.baseUrl}/api/sessions`, {
                method: 'POST',
                headers: h,
                body: JSON.stringify({ name: sess, start: true }),
            });
            if (createRes.ok) {
                await new Promise((r) => setTimeout(r, 2000));
                st = await this.getSessionStatus(sess);
                return { status: st?.status || 'STARTING', connected: st?.connected ?? false };
            }
            await fetch(`${this.baseUrl}/api/sessions/${sess}/start`, { method: 'POST', headers: h });
            await new Promise((r) => setTimeout(r, 2000));
            st = await this.getSessionStatus(sess);
            return { status: st?.status || 'STARTING', connected: st?.connected ?? false };
        }

        const startRes = await fetch(`${this.baseUrl}/api/sessions/${sess}/start`, {
            method: 'POST',
            headers: h,
        });
        if (startRes.ok) {
            await new Promise((r) => setTimeout(r, 2000));
            st = await this.getSessionStatus(sess);
        }
        return { status: st?.status || 'ERROR', connected: st?.connected ?? false };
    }

    /** QR code for pairing (base64 PNG via JSON accept header). */
    async getAuthQr(session?: string): Promise<{ data: string; mimetype: string } | null> {
        const sess = session || this.defaultSession;
        try {
            const h = this.headers(false);
            h['Accept'] = 'application/json';
            const response = await fetch(`${this.baseUrl}/api/${sess}/auth/qr`, { headers: h });
            if (!response.ok) return null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const json = (await response.json()) as {
                    data?: string;
                    mimetype?: string;
                    value?: string;
                };
                const data = json.data || json.value;
                if (!data) return null;
                return { data, mimetype: json.mimetype || 'image/png' };
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            return {
                data: buffer.toString('base64'),
                mimetype: contentType.split(';')[0] || 'image/png',
            };
        } catch (e: any) {
            this.logger.warn(`getAuthQr: ${e?.message}`);
            return null;
        }
    }

    /** Logout session and restart pairing from scratch. */
    async logoutSession(session?: string): Promise<{ status: string }> {
        const sess = session || this.defaultSession;
        const h = this.headers();
        const res = await fetch(`${this.baseUrl}/api/sessions/${sess}/logout`, {
            method: 'POST',
            headers: h,
        });
        if (!res.ok) {
            const err = await res.text();
            this.logger.warn(`logoutSession: ${res.status} ${err}`);
            return { status: 'ERROR' };
        }
        await new Promise((r) => setTimeout(r, 3000));
        const st = await this.getSessionStatus(sess);
        return { status: st?.status || 'SCAN_QR_CODE' };
    }
}
