import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StudioShareController } from './studio-share.controller';

describe('StudioShareController', () => {
    const studioService = {
        getSharedNotebook: vi.fn(),
    };
    let ctrl: StudioShareController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctrl = new StudioShareController(studioService as any);
    });

    it('mengembalikan proyeksi notebook yang dibagikan', async () => {
        const payload = {
            notebook: { id: 'nb-1', name: 'Shared' },
            sources: [],
            outputs: [],
        };
        studioService.getSharedNotebook.mockResolvedValueOnce(payload);
        await expect(ctrl.getShared('tok-abc')).resolves.toEqual(payload);
        expect(studioService.getSharedNotebook).toHaveBeenCalledWith('tok-abc');
    });

    it('meneruskan NotFoundException dari service', async () => {
        studioService.getSharedNotebook.mockRejectedValueOnce(
            new NotFoundException('Shared notebook not found'),
        );
        await expect(ctrl.getShared('bad')).rejects.toBeInstanceOf(NotFoundException);
    });
});
