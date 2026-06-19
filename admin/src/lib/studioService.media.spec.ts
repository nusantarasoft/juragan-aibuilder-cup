import { afterEach, describe, expect, it, vi } from 'vitest';

describe('studioService.addMediaToNotebook', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('calls GraphQL mutation and maps source response', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            json: async () => ({
                data: {
                    addMediaToNotebook: {
                        id: 'src-1',
                        notebook_id: 'nb-1',
                        media_id: 'media-1',
                        filename: 'report.docx',
                        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        file_size: 1234,
                        parse_status: 'pending',
                        parse_stage: 'queued',
                        parse_progress: 0,
                        chunk_count: 0,
                        created_at: '2026-06-19T00:00:00.000Z',
                    },
                },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { studioService } = await import('@/lib/studioService');
        const source = await studioService.addMediaToNotebook('nb-1', 'media-1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body.query).toContain('addMediaToNotebook');
        expect(body.variables).toEqual({
            notebookId: 'nb-1',
            mediaId: 'media-1',
        });
        expect(source.id).toBe('src-1');
        expect(source.media_id).toBe('media-1');
        expect(source.file_size).toBe(1234);
    });

    it('throws GraphQL error message to the UI layer', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                json: async () => ({
                    errors: [{ message: 'Media not found' }],
                }),
            }),
        );

        const { studioService } = await import('@/lib/studioService');

        await expect(studioService.addMediaToNotebook('nb-1', 'missing')).rejects.toThrow('Media not found');
    });
});
