import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioWebCrawlerService } from './studio-web-crawler.service';
import { ForbiddenException } from '@nestjs/common';

describe('StudioWebCrawlerService', () => {
    let svc: StudioWebCrawlerService;
    let from: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        from = vi.fn();
        svc = new StudioWebCrawlerService({
            getAdminClient: () => ({ from }),
        } as never);
    });

    it('lists jobs for tenant', async () => {
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    order: async () => ({
                        data: [
                            {
                                id: 'j1',
                                tenant_id: 't1',
                                name: 'Test',
                                status: 'pending',
                                config: { seedUrls: ['https://example.com'] },
                                progress: 0,
                                pages_found: 0,
                                pages_scraped: 0,
                                errors: 0,
                                documents_generated: 0,
                            },
                        ],
                        error: null,
                    }),
                }),
            }),
        });
        const jobs = await svc.listJobs('t1');
        expect(jobs).toHaveLength(1);
        expect(jobs[0].name).toBe('Test');
        expect(jobs[0].config.seedUrls).toEqual(['https://example.com']);
    });

    it('stops running job for tenant', async () => {
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: { id: 'j1', tenant_id: 't1', status: 'running', name: 'X', config: {}, progress: 10 },
                        error: null,
                    }),
                }),
            }),
        });
        from.mockReturnValueOnce({
            update: () => ({
                eq: async () => ({ error: null }),
            }),
        });
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: {
                            id: 'j1',
                            tenant_id: 't1',
                            status: 'paused',
                            name: 'X',
                            config: {},
                            progress: 10,
                            pages_found: 0,
                            pages_scraped: 0,
                            errors: 0,
                            documents_generated: 0,
                        },
                        error: null,
                    }),
                }),
            }),
        });
        const job = await svc.stopJob('t1', 'j1');
        expect(job.status).toBe('paused');
    });

    it('rejects delete for wrong tenant', async () => {
        from.mockReturnValueOnce({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: { id: 'j1', tenant_id: 'other-tenant' },
                        error: null,
                    }),
                }),
            }),
        });
        await expect(svc.deleteJob('home-tenant', 'j1')).rejects.toBeInstanceOf(ForbiddenException);
    });
});
