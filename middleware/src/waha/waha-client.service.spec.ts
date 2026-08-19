import { afterEach, describe, expect, it, vi } from 'vitest';
import { WahaClientService } from './waha-client.service';

describe('WahaClientService.sendButtons', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function makeClient() {
        return new WahaClientService({
            get: (key: string) => {
                if (key === 'WAHA_BASE_URL') return 'http://waha:3000';
                if (key === 'WAHA_API_KEY') return 'k';
                if (key === 'WAHA_SESSION') return 'default';
                return undefined;
            },
        } as any);
    }

    it('posts /api/sendButtons and succeeds', async () => {
        const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const client = makeClient();
        const res = await client.sendButtons('6281@c.us', 'preview', [
            { id: 'umkm_ya', text: 'Ya, simpan' },
        ]);
        expect(res.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/api/sendButtons');
    });

    it('tries /api/send/buttons after 404 then succeeds', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (String(url).endsWith('/api/sendButtons')) {
                return new Response('nope', { status: 404 });
            }
            return new Response('{}', { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);
        const client = makeClient();
        const res = await client.sendButtons('6281@c.us', 'preview', [
            { id: 'umkm_batal', text: 'Batal' },
        ]);
        expect(res.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns failure so caller can fall back to sendText', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 501 })));
        const client = makeClient();
        const res = await client.sendButtons('6281@c.us', 'preview', []);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/501/);
    });
});

describe('WahaClientService.sendList', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function makeClient() {
        return new WahaClientService({
            get: (key: string) => {
                if (key === 'WAHA_BASE_URL') return 'http://waha:3000';
                if (key === 'WAHA_API_KEY') return 'k';
                if (key === 'WAHA_SESSION') return 'default';
                return undefined;
            },
        } as any);
    }

    it('posts /api/sendList with rowIds', async () => {
        const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const client = makeClient();
        const res = await client.sendList('6281@c.us', 'preview', [
            { id: 'umkm_ya', text: 'Ya, simpan' },
            { id: 'umkm_batal', text: 'Batal' },
        ]);
        expect(res.success).toBe(true);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/api/sendList');
        const body = JSON.parse(String(init.body));
        expect(body.message.sections[0].rows.map((r: { rowId: string }) => r.rowId)).toEqual([
            'umkm_ya',
            'umkm_batal',
        ]);
    });

    it('returns failure so caller can fall back to sendText', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 501 })));
        const client = makeClient();
        const res = await client.sendList('6281@c.us', 'preview', []);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/501/);
    });
});
