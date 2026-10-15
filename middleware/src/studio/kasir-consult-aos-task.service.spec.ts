import { describe, expect, it, vi, beforeEach } from 'vitest';
import { KasirConsultAosTaskService } from './kasir-consult-aos-task.service';
import { KASIR_WA_TASK_SOURCE } from './kasir-consult-aos-task.util';

describe('KasirConsultAosTaskService', () => {
    const chain = () => {
        const api: Record<string, ReturnType<typeof vi.fn>> = {};
        api.select = vi.fn(() => api);
        api.eq = vi.fn(() => api);
        api.maybeSingle = vi.fn(async () => ({ data: { id: 'agent-kasir' }, error: null }));
        api.single = vi.fn(async () => ({ data: { id: 'task-1', tenant_id: 't1' }, error: null }));
        api.insert = vi.fn(() => api);
        api.update = vi.fn(() => api);
        return api;
    };

    let tableApi: ReturnType<typeof chain>;
    const aos = {
        db: {
            from: vi.fn(() => tableApi),
        },
        nextQueueSortOrder: vi.fn(async () => 0),
        notifyTaskQueue: vi.fn(async () => undefined),
        audit: vi.fn(async () => undefined),
    };
    const umkm = {
        resolveUmkmContextByOwnerPhone: vi.fn(async () => ({ tenantId: '00000000-0000-0000-0000-000000000010' })),
    };
    let svc: KasirConsultAosTaskService;

    beforeEach(() => {
        vi.clearAllMocks();
        tableApi = chain();
        svc = new KasirConsultAosTaskService(aos as any, umkm as any);
    });

    it('writes queued → running → done with kasir_wa source and redacted description', async () => {
        const handle = svc.begin({ kind: 'consult', questionChars: 42, phone: '6281111111111' });
        await new Promise((r) => setTimeout(r, 20));
        handle.complete('hit');
        await new Promise((r) => setTimeout(r, 30));

        expect(aos.db.from).toHaveBeenCalledWith('aos_tasks');
        const insertCall = tableApi.insert.mock.calls[0]?.[0];
        expect(insertCall?.source).toBe(KASIR_WA_TASK_SOURCE);
        expect(insertCall?.description).toMatch(/disembunyikan, 42 karakter/);
        expect(insertCall?.description).not.toMatch(/6281/);
        expect(aos.notifyTaskQueue).toHaveBeenCalled();
    });

    it('queue bootstrap failure does not throw from begin/complete', async () => {
        tableApi.single = vi.fn(async () => ({ data: null, error: { message: 'db down' } }));
        const handle = svc.begin({ kind: 'consult', questionChars: 5 });
        expect(() => handle.complete('hit')).not.toThrow();
        await new Promise((r) => setTimeout(r, 30));
    });
});
