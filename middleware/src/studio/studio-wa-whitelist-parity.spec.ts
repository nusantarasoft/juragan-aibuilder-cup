import { describe, expect, it, vi } from 'vitest';
import { StudioWaConversationsService } from './studio-wa-conversations.service';

describe('StudioWaConversationsService whitelist parity', () => {
    it('recordTurn resolves tenant from studio_whatsapp_config only (no tenant_wa_whitelist)', async () => {
        const umkm = {
            resolveUmkmContextByOwnerPhone: vi.fn(async () => ({
                tenantId: 'umkm-toko-a',
                notebookId: 'nb-1',
                contextConfig: { umkm_mode: true, tenant_id: 'umkm-toko-a' },
            })),
        };
        const convChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn(async () => ({ data: { id: 'conv-new' }, error: null })),
                }),
            }),
            update: vi.fn().mockReturnThis(),
        };
        const msgInsert = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn(async () => ({ data: { id: 'msg-1' }, error: null })),
            }),
        });
        const sb = {
            getAdminClient: vi.fn(() => ({
                from: vi.fn((table: string) => {
                    if (table === 'studio_wa_conversations') return convChain;
                    if (table === 'studio_wa_messages') return { insert: msgInsert };
                    return convChain;
                }),
            })),
        };
        const config = { get: vi.fn(() => 'key') };
        const svc = new StudioWaConversationsService(sb as any, umkm as any, {} as any, config as any);

        await svc.recordTurn({
            phone: '6281234567890',
            authorKind: 'owner',
            bodyText: 'Halo',
        });

        expect(umkm.resolveUmkmContextByOwnerPhone).toHaveBeenCalledWith('6281234567890');
        expect(msgInsert).toHaveBeenCalled();
    });
});
