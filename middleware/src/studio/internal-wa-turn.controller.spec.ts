import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import { InternalWaTurnController } from './internal-wa-turn.controller';

describe('InternalWaTurnController', () => {
    const wa = {
        assertInternalKey: vi.fn(),
        recordTurnBestEffort: vi.fn(async () => undefined),
        handoffForPhone: vi.fn(async () => ({ active: true, until: '2099-01-01T00:00:00Z' })),
    };
    let ctrl: InternalWaTurnController;

    beforeEach(() => {
        vi.clearAllMocks();
        wa.assertInternalKey.mockImplementation((key?: string) => {
            if (key !== 'secret') throw new Error('bad');
        });
        ctrl = new InternalWaTurnController(wa as any);
    });

    it('wa-turn rejects missing key', async () => {
        await expect(
            ctrl.recordTurn({ phone: '6281', author_kind: 'owner', body_text: 'hi' }),
        ).rejects.toBeInstanceOf(HttpException);
    });

    it('wa-turn accepts valid payload', async () => {
        await ctrl.recordTurn(
            { phone: '6281234567890', author_kind: 'owner', body_text: 'Halo' },
            'secret',
        );
        expect(wa.recordTurnBestEffort).toHaveBeenCalledWith(
            expect.objectContaining({ authorKind: 'owner', bodyText: 'Halo' }),
        );
    });

    it('wa-handoff returns active flag', async () => {
        const res = await ctrl.handoff('6281234567890', 'secret');
        expect(res.active).toBe(true);
    });
});
