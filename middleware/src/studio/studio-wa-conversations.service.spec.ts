import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { StudioWaConversationsService } from './studio-wa-conversations.service';
import { STUDIO_WA_HUMAN_REPLY_SUFFIX } from './studio-wa-human-reply.util';

describe('StudioWaConversationsService.sendHumanReply', () => {
    const hermes = { sendText: vi.fn(async () => ({ success: true })) };
    const umkm = {
        resolveUmkmContextByOwnerPhone: vi.fn(),
    };
    const config = { get: vi.fn(() => 'key') };

    const convRow = {
        id: 'conv-1',
        tenant_id: 'toko-a',
        owner_phone: '6281234567890',
        chat_jid: '6281234567890@s.whatsapp.net',
        takeover_active: true,
    };

    const chain = (row: unknown) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: row, error: null })),
        order: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn(async () => ({ data: { id: 'msg-1' }, error: null })),
        lt: vi.fn().mockReturnThis(),
    });

    let db: ReturnType<typeof chain>;
    const makeDbClient = () => ({
        from: vi.fn((table: string) => {
            if (table === 'studio_wa_conversations') return db;
            if (table === 'studio_wa_messages') {
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn(async () => ({ data: { id: 'msg-1' }, error: null })),
                        }),
                    }),
                };
            }
            if (table === 'audit_logs') {
                return { insert: vi.fn(async () => ({ error: null })) };
            }
            return chain(null);
        }),
    });
    const sb = {
        getAdminClient: vi.fn(makeDbClient),
        getClient: vi.fn(makeDbClient),
    };

    let svc: StudioWaConversationsService;

    beforeEach(() => {
        vi.clearAllMocks();
        db = chain(convRow);
        svc = new StudioWaConversationsService(sb as any, umkm as any, hermes as any, config as any);
        vi.spyOn(svc, 'expireStaleTakeovers').mockResolvedValue(undefined);
        vi.spyOn(svc as any, 'appendMessageForConversation').mockResolvedValue({ messageId: 'msg-1' });
    });

    it('sends and stores text with Admin Nusantarasoft suffix', async () => {
        await svc.sendHumanReply('conv-1', '  Balasan ops  ', {
            id: 'user-1',
            email: 'admin@nusantarasoft.local',
        });

        const expected = `Balasan ops${STUDIO_WA_HUMAN_REPLY_SUFFIX}`;
        expect(hermes.sendText).toHaveBeenCalledWith(
            '6281234567890@s.whatsapp.net',
            expected,
        );
        expect((svc as any).appendMessageForConversation).toHaveBeenCalledWith(
            expect.objectContaining({ owner_phone: '6281234567890' }),
            expect.objectContaining({
                authorKind: 'human',
                bodyText: expected,
            }),
        );
    });

    it('requires active takeover', async () => {
        db = chain({ ...convRow, takeover_active: false });
        await expect(
            svc.sendHumanReply('conv-1', 'hi', { id: 'u1' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(hermes.sendText).not.toHaveBeenCalled();
    });
});
