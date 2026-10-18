/**
 * Contract: Hermes-shaped POST /internal/wa-turn + GET /internal/wa-handoff
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InternalWaTurnController } from './internal-wa-turn.controller';

describe('InternalWaTurnController contract', () => {
    const wa = {
        assertInternalKey: vi.fn(),
        recordTurnBestEffort: vi.fn(async () => undefined),
        handoffForPhone: vi.fn(async () => ({ active: false })),
    };
    let ctrl: InternalWaTurnController;

    beforeEach(() => {
        vi.clearAllMocks();
        wa.assertInternalKey.mockImplementation((k?: string) => {
            if (k !== 'contract-key') throw new Error('unauthorized');
        });
        ctrl = new InternalWaTurnController(wa as any);
    });

    it('Hermes wa-turn payload shape', async () => {
        await ctrl.recordTurn(
            {
                phone: '6289990000001',
                chat_id: '6289990000001@s.whatsapp.net',
                author_kind: 'owner',
                body_text: 'Halo',
            },
            'contract-key',
        );
        expect(wa.recordTurnBestEffort).toHaveBeenCalledWith({
            phone: '6289990000001',
            chatId: '6289990000001@s.whatsapp.net',
            authorKind: 'owner',
            bodyText: 'Halo',
        });
    });

    it('Hermes handoff probe', async () => {
        wa.handoffForPhone.mockResolvedValue({ active: true, until: '2099-01-01T00:00:00Z' });
        const res = await ctrl.handoff('6289990000001', 'contract-key');
        expect(res).toEqual({ active: true, until: '2099-01-01T00:00:00Z' });
    });
});
