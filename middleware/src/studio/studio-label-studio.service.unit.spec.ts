import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioLabelStudioService } from './studio-label-studio.service';

describe('StudioLabelStudioService', () => {
    const getAdminClient = vi.fn();
    const configGet = vi.fn();
    const fetchMock = vi.fn();

    beforeEach(() => {
        getAdminClient.mockReset();
        configGet.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('returns unconfigured when token missing', async () => {
        configGet.mockImplementation((k: string) => (k === 'LABELSTUDIO_URL' ? 'http://ls:8080' : undefined));
        const svc = new StudioLabelStudioService({ get: configGet } as never, { getAdminClient } as never);
        const out = await svc.getDashboard('tenant-1');
        expect(out.configured).toBe(false);
        expect(out.projects).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps Label Studio projects from API', async () => {
        configGet.mockImplementation((k: string) => {
            if (k === 'LABELSTUDIO_URL') return 'http://ls:8080';
            if (k === 'LABELSTUDIO_API_TOKEN') return 'tok';
            if (k === 'LABELSTUDIO_BROWSER_URL') return 'http://localhost:8080';
            return undefined;
        });
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => [
                {
                    id: 7,
                    title: 'Doc Class',
                    task_number: 10,
                    num_tasks_with_annotations: 4,
                    total_annotations_number: 2,
                    label_config: '<View><Choices name="choice"><Choice value="invoice"/></Choices></View>',
                },
            ],
        });
        const from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
        getAdminClient.mockReturnValue({ from });

        const svc = new StudioLabelStudioService({ get: configGet } as never, { getAdminClient } as never);
        const out = await svc.getDashboard('00000000-0000-0000-0000-000000000010');
        expect(out.configured).toBe(true);
        expect(out.projects[0]).toMatchObject({
            id: 7,
            name: 'Doc Class',
            projectType: 'Text Classification',
            tasks: 10,
            completed: 4,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            'http://ls:8080/api/projects/',
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Token tok' }) }),
        );
    });
});
