import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HermesProvider } from './hermes.provider';
import {
    createWhatsAppTransportForTests,
    resolveWhatsAppProviderId,
} from './whatsapp-provider.module';

function mockFetchOk(body: unknown = {}, status = 200, headers: Record<string, string> = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
        arrayBuffer: async () => new TextEncoder().encode('media-bytes').buffer,
        headers: { get: (k: string) => headers[k.toLowerCase()] || headers[k] || null },
    };
}

describe('resolveWhatsAppProviderId / createWhatsAppTransportForTests', () => {
    it('always resolves hermes', () => {
        expect(resolveWhatsAppProviderId(undefined)).toBe('hermes');
        expect(resolveWhatsAppProviderId('')).toBe('hermes');
        expect(resolveWhatsAppProviderId('anything')).toBe('hermes');
    });

    it('builds HermesProvider for tests', () => {
        const t = createWhatsAppTransportForTests('hermes', {
            config: { get: () => 'http://hermes:8765' } as any,
        });
        expect(t.providerId).toBe('hermes');
    });
});

describe('HermesProvider', () => {
    const originalFetch = global.fetch;
    let p: HermesProvider;

    beforeEach(() => {
        global.fetch = vi.fn();
        p = new HermesProvider({
            get: (k: string) => {
                if (k === 'HERMES_BRIDGE_URL') return 'http://hermes:8765/';
                if (k === 'KASIR_PIPE_SESSION') return 'pipe-sess';
                return undefined;
            },
        } as any);
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('exposes defaults and normalizes jids', () => {
        expect(p.providerId).toBe('hermes');
        expect(p.defaultSession).toBe('pipe-sess');
        expect(p.bridgeUrl).toBe('http://hermes:8765');
        expect(p.phoneToChatId('62812')).toBe('62812@s.whatsapp.net');
        expect(p.phoneToChatId('62812@s.whatsapp.net')).toBe('62812@s.whatsapp.net');
    });

    it('falls back bridge URL from HERMES_BASE_URL then default', () => {
        const a = new HermesProvider({
            get: (k: string) => (k === 'HERMES_BASE_URL' ? 'http://base:1' : undefined),
        } as any);
        expect(a.bridgeUrl).toBe('http://base:1');
        const b = new HermesProvider({ get: () => undefined } as any);
        expect(b.bridgeUrl).toBe('http://hermes:8765');
        expect(b.defaultSession).toBe('hermes');
    });

    it('sendText success and failure', async () => {
        (global.fetch as any).mockResolvedValueOnce(mockFetchOk({ messageId: '1' }));
        expect((await p.sendText('6281', 'hi')).success).toBe(true);

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk('err', 500));
        const fail = await p.sendText('6281@s.whatsapp.net', 'x');
        expect(fail.success).toBe(false);
        expect(fail.error).toContain('500');

        (global.fetch as any).mockRejectedValueOnce(new Error('network'));
        expect((await p.sendText('6281', 'x')).error).toBe('network');
    });

    it('sendButtons/sendList via poll; empty choices fail', async () => {
        expect((await p.sendButtons('6281', 'b', [])).success).toBe(false);

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk({ ok: true }));
        expect(
            (await p.sendButtons('6281', 'Konfirmasi', [{ id: 'ya', text: 'Ya' }])).success,
        ).toBe(true);
        expect((global.fetch as any).mock.calls.at(-1)[0]).toContain('/send-poll');

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk('nope', 404));
        expect((await p.sendList('6281', 'list', [{ id: '1', text: 'A' }])).success).toBe(false);

        (global.fetch as any).mockRejectedValueOnce(new Error('poll down'));
        expect((await p.sendList('6281', 'list', [{ id: '1', text: 'A' }])).error).toBe('poll down');
    });

    it('downloadMedia success and null paths', async () => {
        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({}, 200, { 'content-type': 'image/png; charset=utf-8' }),
        );
        const ok = await p.downloadMedia('mid-1');
        expect(ok?.mimetype).toBe('image/png');
        expect(ok?.filename).toContain('mid-1');

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk('missing', 404));
        expect(await p.downloadMedia('x')).toBeNull();

        (global.fetch as any).mockRejectedValueOnce(new Error('abort'));
        expect(await p.downloadMedia('y')).toBeNull();
    });

    it('ping health/status paths', async () => {
        (global.fetch as any)
            .mockRejectedValueOnce(new Error('fail health'))
            .mockResolvedValueOnce(mockFetchOk({}, 200));
        expect((await p.ping(500)).ok).toBe(true);

        (global.fetch as any)
            .mockResolvedValueOnce(mockFetchOk({}, 503))
            .mockResolvedValueOnce(mockFetchOk({}, 503));
        expect((await p.ping(200)).ok).toBe(false);

        (global.fetch as any).mockRejectedValue(new Error('down'));
        const bad = await p.ping(200);
        expect(bad.ok).toBe(false);

        const boom = new HermesProvider({
            get: () => {
                throw new Error('cfg boom');
            },
        } as any);
        // bridgeUrl getter throws → outer ping catch
        expect((await boom.ping(50)).detail).toMatch(/cfg boom|unreachable/);
    });

    it('getSessionStatus / getAuthQr', async () => {
        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({
                name: 'hermes',
                status: 'working',
                connected: true,
                meId: '6281:1@s.whatsapp.net',
                credsPresent: true,
            }),
        );
        const st = await p.getSessionStatus();
        expect(st?.status).toBe('WORKING');
        expect(st?.connected).toBe(true);

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk({}));
        expect(await p.getSessionStatus()).toBeNull();

        (global.fetch as any).mockRejectedValueOnce(new Error('pair down'));
        expect(await p.getSessionStatus()).toBeNull();

        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({ available: true, imageBase64: 'abc', mimetype: 'image/png' }),
        );
        expect((await p.getAuthQr()).available).toBe(true);

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => 'not-json-body',
            arrayBuffer: async () => new ArrayBuffer(0),
            headers: { get: () => null },
        });
        expect((await p.getAuthQr()).available).toBe(false);

        (global.fetch as any).mockRejectedValueOnce(new Error('qr down'));
        expect((await p.getAuthQr()).error).toContain('qr down');
    });

    it('aborts hung fetch via timeouts', async () => {
        // Exercise abort listeners without wall-clock waits (fake timers + AbortController).
        vi.useFakeTimers();
        try {
            (global.fetch as any).mockImplementation(
                (_url: string, init?: { signal?: AbortSignal }) =>
                    new Promise((_resolve, reject) => {
                        const onAbort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
                        if (init?.signal?.aborted) onAbort();
                        else init?.signal?.addEventListener('abort', onAbort, { once: true });
                    }),
            );

            const sendP = p.sendText('6281', 'hi');
            await vi.advanceTimersByTimeAsync(31000);
            await Promise.resolve();
            expect((await sendP).success).toBe(false);

            const mediaP = p.downloadMedia('m1');
            await vi.advanceTimersByTimeAsync(16000);
            await Promise.resolve();
            expect(await mediaP).toBeNull();

            const statusP = p.getSessionStatus();
            await vi.advanceTimersByTimeAsync(9000);
            await Promise.resolve();
            expect(await statusP).toBeNull();
        } finally {
            vi.useRealTimers();
            (global.fetch as any).mockReset();
            (global.fetch as any).mockResolvedValue(mockFetchOk({}));
        }
    });

    it('startSession / rebind / logout / sync / restart', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce(mockFetchOk({ status: 'WORKING', connected: true }))
            .mockResolvedValueOnce(mockFetchOk({ ok: true }));
        const started = await p.startSession();
        expect(started.connected).toBe(true);
        expect((global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes('/pair/reload'))).toBe(
            true,
        );

        (global.fetch as any).mockRejectedValueOnce(new Error('start fail'));
        expect((await p.startSession(true)).status).toBe('ERROR');

        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({ status: 'SCAN_QR_CODE', connected: false }),
        );
        expect((await p.rebindSession()).status).toBe('SCAN_QR_CODE');
        (global.fetch as any).mockRejectedValueOnce(new Error('rebind fail'));
        expect((await p.rebindSession()).status).toBe('ERROR');

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk({ status: 'LOGGED_OUT' }));
        expect((await p.logoutSession()).status).toBe('LOGGED_OUT');
        (global.fetch as any).mockRejectedValueOnce(new Error('logout fail'));
        expect((await p.logoutSession()).status).toBe('ERROR');

        (global.fetch as any)
            .mockResolvedValueOnce(
                mockFetchOk({ status: 'WORKING', connected: false, credsPresent: true }),
            )
            .mockResolvedValueOnce(mockFetchOk({}))
            .mockResolvedValueOnce(
                mockFetchOk({ status: 'WORKING', connected: true, credsPresent: true }),
            );
        vi.useFakeTimers();
        const syncedP = p.syncSession();
        await vi.advanceTimersByTimeAsync(3000);
        const synced = await syncedP;
        vi.useRealTimers();
        expect(synced.connected).toBe(true);

        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({ status: 'WORKING', connected: true, credsPresent: true }),
        );
        expect((await p.syncSession()).connected).toBe(true);

        (global.fetch as any).mockResolvedValueOnce(mockFetchOk({}));
        expect((await p.restartSession()).status).toBe('STARTING');
    });

    it('startSession without connected skips reload; logout defaults', async () => {
        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({ status: 'SCAN_QR_CODE', connected: false }),
        );
        const started = await p.startSession();
        expect(started.connected).toBe(false);
        expect((global.fetch as any).mock.calls.every((c: any[]) => !String(c[0]).includes('/pair/reload'))).toBe(
            true,
        );

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => 'plain',
            arrayBuffer: async () => new ArrayBuffer(0),
            headers: { get: () => null },
        });
        expect((await p.logoutSession()).status).toBe('SCAN_QR_CODE');

        (global.fetch as any).mockResolvedValueOnce(
            mockFetchOk({ status: 'unknown', connected: true, error: 'x', meId: null, credsPresent: false }),
        );
        const st = await p.getSessionStatus();
        expect(st?.status).toBe('UNKNOWN');
        expect(st?.error).toBe('x');
    });
});
