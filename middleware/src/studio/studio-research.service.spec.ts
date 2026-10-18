import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StudioResearchService } from './studio-research.service';

function buildService(overrides: Partial<Record<string, unknown>> = {}) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: { id: 'item-1' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
    };

    const admin = vi.fn(() => ({
        from: vi.fn(() => chain),
        rpc: vi.fn(),
    }));

    const config = {
        get: vi.fn((key: string) => {
            if (key === 'KASIR_CONSULT_NOTEBOOK_ID') return 'nb-kurikulum';
            return undefined;
        }),
    };

    const studioService = {
        addTextSource: vi.fn().mockResolvedValue({ id: 'src-merged' }),
        removeSource: vi.fn().mockResolvedValue(true),
    };

    const svc = new StudioResearchService(
        { getAdminClient: admin } as any,
        config as any,
        { generateText: vi.fn() } as any,
        { extractDocumentText: vi.fn() } as any,
        studioService as any,
        { semanticSearchNotebook: vi.fn().mockResolvedValue([]) } as any,
    );

    return { svc, chain, studioService, admin, ...overrides };
}

describe('StudioResearchService', () => {
    it('assertSuperAdmin rejects non super_admin', () => {
        const { svc } = buildService();
        expect(() => svc.assertSuperAdmin('admin')).toThrow(ForbiddenException);
        expect(() => svc.assertSuperAdmin('super_admin')).not.toThrow();
    });

    it('approveAndMerge calls addTextSource with target notebook', async () => {
        const { svc, chain, studioService } = buildService();
        chain.maybeSingle.mockResolvedValueOnce({
            data: {
                id: 'item-1',
                status: 'pending',
                title: 'PP 55',
                summary: 'Ringkasan cukup panjang untuk merge ke notebook kurikulum.',
                target_notebook_id: 'nb-kurikulum',
                sources: [
                    {
                        url: 'https://www.pajak.go.id/x',
                        quoted_snippet: 'teks kutipan yang valid',
                        fetched_at: '2026-01-01T00:00:00Z',
                        content_sha256: 'abc',
                    },
                ],
                validation_flags: { quote_validation_failed: false },
                effective_date: null,
            },
            error: null,
        });
        chain.single.mockResolvedValueOnce({
            data: { id: 'item-1', status: 'merged', merged_source_id: 'src-merged' },
            error: null,
        });

        await svc.approveAndMerge('item-1', 'reviewer-1');
        expect(studioService.addTextSource).toHaveBeenCalledWith(
            'nb-kurikulum',
            expect.stringContaining('PP 55'),
            expect.stringContaining('Riset Knowledge'),
        );
    });

    it('reject blocks non-pending items', async () => {
        const { svc, chain } = buildService();
        chain.maybeSingle.mockResolvedValueOnce({
            data: { id: 'item-1', status: 'merged' },
            error: null,
        });
        await expect(svc.reject('item-1', 'r1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('unmerge removes source and sets approved', async () => {
        const { svc, chain, studioService } = buildService();
        chain.maybeSingle.mockResolvedValueOnce({
            data: {
                id: 'item-1',
                status: 'merged',
                merged_source_id: 'src-1',
                target_notebook_id: 'nb-kurikulum',
            },
            error: null,
        });
        chain.single.mockResolvedValueOnce({
            data: { id: 'item-1', status: 'approved', merged_source_id: null },
            error: null,
        });
        await svc.unmerge('item-1', 'reviewer-1');
        expect(studioService.removeSource).toHaveBeenCalledWith('nb-kurikulum', 'src-1');
    });
});
