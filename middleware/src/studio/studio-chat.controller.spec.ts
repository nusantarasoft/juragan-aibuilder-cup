import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { StudioChatController } from './studio-chat.controller';

function mockRes() {
    const writes: string[] = [];
    return {
        writes,
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((chunk: string) => {
            writes.push(chunk);
        }),
        end: vi.fn(),
    };
}

describe('StudioChatController', () => {
    const studioService = {
        assertNotebookOwner: vi.fn(async () => undefined),
        assertConversationOwner: vi.fn(async () => undefined),
        chatStream: vi.fn(async () => undefined),
    };
    const authService = {
        getUser: vi.fn(async () => ({ id: 'user-1' })),
    };
    let ctrl: StudioChatController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctrl = new StudioChatController(studioService as any, authService as any);
    });

    it('menolak tanpa Authorization header', async () => {
        const res = mockRes();
        await expect(
            ctrl.stream({ headers: {} } as any, res as any, {
                notebookId: 'nb-1',
                question: 'halo',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('menolak token invalid', async () => {
        authService.getUser.mockRejectedValueOnce(new Error('bad token'));
        const res = mockRes();
        await expect(
            ctrl.stream(
                { headers: { authorization: 'Bearer bad' } } as any,
                res as any,
                { notebookId: 'nb-1', question: 'halo' },
            ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('menolak notebookId/question kosong', async () => {
        const res = mockRes();
        await expect(
            ctrl.stream(
                { headers: { authorization: 'Bearer tok' } } as any,
                res as any,
                { notebookId: '  ', question: 'q' },
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            ctrl.stream(
                { headers: { authorization: 'Bearer tok' } } as any,
                res as any,
                { notebookId: 'nb-1', question: '' },
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menjalankan chatStream dan emit SSE meta/delta/done', async () => {
        studioService.chatStream.mockImplementationOnce(
            (async (
                _nb: string,
                _q: string,
                _c: string | undefined,
                _u: string | undefined,
                _opts: unknown,
                emit: (event: 'meta' | 'delta' | 'done', data: Record<string, unknown>) => void,
            ) => {
                emit('meta', { conversationId: 'c-1' });
                emit('delta', { text: 'Hel' });
                emit('done', { conversationId: 'c-1', answer: 'Hello' });
            }) as any,
        );
        const res = mockRes();
        await ctrl.stream(
            { headers: { authorization: 'Bearer tok' } } as any,
            res as any,
            {
                notebookId: 'nb-1',
                question: 'halo',
                conversationId: 'c-1',
                sourceIds: ['s1'],
                language: 'en',
            },
        );

        expect(studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', 'user-1');
        expect(studioService.assertConversationOwner).toHaveBeenCalledWith('c-1', 'user-1');
        expect(studioService.chatStream).toHaveBeenCalledWith(
            'nb-1',
            'halo',
            'c-1',
            'user-1',
            { sourceIds: ['s1'], language: 'en' },
            expect.any(Function),
        );
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
        expect(res.writes.some((w) => w.includes('event: meta'))).toBe(true);
        expect(res.writes.some((w) => w.includes('event: delta'))).toBe(true);
        expect(res.writes.some((w) => w.includes('event: done'))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });

    it('menulis event error lalu end jika chatStream gagal', async () => {
        studioService.chatStream.mockRejectedValueOnce(new Error('boom'));
        const res = mockRes();
        await ctrl.stream(
            { headers: { authorization: 'Bearer tok' } } as any,
            res as any,
            { notebookId: 'nb-1', question: 'halo' },
        );
        expect(res.writes.some((w) => w.includes('event: error') && w.includes('boom'))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });
});
