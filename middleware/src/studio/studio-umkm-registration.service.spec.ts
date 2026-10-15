import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StudioUmkmRegistrationService } from './studio-umkm-registration.service';

describe('StudioUmkmRegistrationService', () => {
    let fromMock: ReturnType<typeof vi.fn>;
    let svc: StudioUmkmRegistrationService;
    let studioService: any;
    let umkmService: any;
    let whatsAppService: any;
    let tenantProvisioning: any;
    let waTransport: any;

    const pendingRow = {
        id: 'reg-1',
        phone: '6281234567890',
        store_name: 'Warung Bu Ani',
        owner_name: null,
        status: 'pending',
        tenant_id: null,
        notebook_id: null,
        reject_reason: null,
        wizard_step: 'done',
        session_name: 'hermes',
        created_at: '2026-09-12T00:00:00Z',
        updated_at: '2026-09-12T00:00:00Z',
        expires_at: '2099-01-01T00:00:00Z',
        approved_at: null,
        approved_by: null,
    };

    beforeEach(() => {
        fromMock = vi.fn();
        studioService = {
            createNotebook: vi.fn().mockResolvedValue({ id: 'nb-new' }),
        };
        umkmService = {
            setupUmkmNotebook: vi.fn().mockResolvedValue({ setup: true }),
        };
        whatsAppService = {
            getConfig: vi.fn().mockResolvedValue({ notebook_id: 'nb-new', tenant_id: 'umkm-warung-bu-ani' }),
            updateConfig: vi.fn().mockResolvedValue({ tenant_id: 'umkm-warung-bu-ani' }),
        };
        tenantProvisioning = {
            provisionStore: vi.fn().mockResolvedValue({
                tenantId: '00000000-0000-0000-0000-000000000201',
                studioSlug: 'umkm-warung-bu-ani',
                storeId: 'store-1',
            }),
        };
        const configService = {
            get: vi.fn((key: string) => {
                if (key === 'ONBOARDING_WA_PROVISION_MAX_PER_PHONE_DAY') return 10;
                return undefined;
            }),
        };
        waTransport = {
            sendText: vi.fn().mockResolvedValue({ success: true }),
        };
        svc = new StudioUmkmRegistrationService(
            { getAdminClient: () => ({ from: fromMock }) } as any,
            studioService,
            umkmService,
            whatsAppService,
            tenantProvisioning,
            configService,
            waTransport,
        );
    });

    it('approve creates notebook + config and notifies WA', async () => {
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) {
                    return { data: pendingRow, error: null };
                }
                return {
                    data: {
                        ...pendingRow,
                        status: 'approved',
                        tenant_id: 'umkm-warung-bu-ani',
                        notebook_id: 'nb-new',
                    },
                    error: null,
                };
            }),
        }));

        whatsAppService.getConfig.mockResolvedValueOnce(null).mockResolvedValueOnce({ notebook_id: 'nb-new' });

        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
        expect(tenantProvisioning.provisionStore).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'wa_daftar',
                storeDisplayName: 'Warung Bu Ani',
                ownerPhone: '6281234567890',
            }),
        );
        expect(waTransport.sendText).toHaveBeenCalled();
    });

    it('approve rejects non-pending', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { ...pendingRow, status: 'draft' },
                error: null,
            }),
        });
        await expect(svc.approve('reg-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approve rejects expired pending', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { ...pendingRow, expires_at: '2020-01-01T00:00:00Z' },
                error: null,
            }),
        });
        await expect(svc.approve('reg-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
        expect(tenantProvisioning.provisionStore).not.toHaveBeenCalled();
    });

    it('approve rejects invalid phone', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { ...pendingRow, phone: '12' },
                error: null,
            }),
        });
        await expect(svc.approve('reg-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approve suffixes tenant when slug already exists', async () => {
        whatsAppService.getConfig.mockResolvedValue({ tenant_id: 'umkm-warung-bu-ani' });
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) {
                    return { data: pendingRow, error: null };
                }
                return {
                    data: {
                        ...pendingRow,
                        status: 'approved',
                        tenant_id: 'umkm-warung-bu-ani-7890',
                        notebook_id: 'nb-new',
                    },
                    error: null,
                };
            }),
        }));
        tenantProvisioning.provisionStore.mockResolvedValueOnce({
            tenantId: '00000000-0000-0000-0000-000000000201',
            studioSlug: 'umkm-warung-bu-ani-7890',
            storeId: 'store-1',
        });
        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
        expect(tenantProvisioning.provisionStore).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'wa_daftar',
                preferredSlug: 'umkm-warung-bu-ani-7890',
            }),
        );
    });

    it('listRegistrations filters by status', async () => {
        const chain: any = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: undefined as any,
        };
        chain.then = undefined;
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // await q resolves via thenable
            then(resolve: (v: any) => void) {
                resolve({ data: [pendingRow], error: null });
            },
        });
        const rows = await svc.listRegistrations('pending');
        expect(rows).toHaveLength(1);
    });

    it('listRegistrations all skips eq filter', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then(resolve: (v: any) => void) {
                resolve({ data: [], error: null });
            },
        });
        const rows = await svc.listRegistrations('all');
        expect(rows).toEqual([]);
    });

    it('approve allows invalid expires_at date string', async () => {
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) {
                    return {
                        data: { ...pendingRow, expires_at: 'not-a-date' },
                        error: null,
                    };
                }
                return {
                    data: { ...pendingRow, status: 'approved', tenant_id: 'umkm-warung-bu-ani' },
                    error: null,
                };
            }),
        }));
        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
    });

    it('approve throws when update races', async () => {
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) return { data: pendingRow, error: null };
                return { data: null, error: null };
            }),
        }));
        await expect(svc.approve('reg-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approve continues when WA notify fails', async () => {
        waTransport.sendText.mockRejectedValue(new Error('wa down'));
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) return { data: pendingRow, error: null };
                return {
                    data: { ...pendingRow, status: 'approved', tenant_id: 't' },
                    error: null,
                };
            }),
        }));
        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
    });

    it('reject rejects non-open status', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { ...pendingRow, status: 'approved' },
                error: null,
            }),
        });
        await expect(svc.reject('reg-1', 'x')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reject without reason and race', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi
                .fn()
                .mockResolvedValueOnce({ data: pendingRow, error: null })
                .mockResolvedValueOnce({ data: null, error: null }),
        });
        await expect(svc.reject('reg-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reject without reason notifies default copy', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi
                .fn()
                .mockResolvedValueOnce({ data: pendingRow, error: null })
                .mockResolvedValueOnce({
                    data: { ...pendingRow, status: 'rejected', reject_reason: null },
                    error: null,
                }),
        });
        waTransport.sendText.mockResolvedValue({ success: false, error: 'fail' });
        const out = await svc.reject('reg-1', '  ', 'admin-1');
        expect(out.status).toBe('rejected');
        expect(waTransport.sendText).toHaveBeenCalledWith(
            '6281234567890',
            expect.stringContaining('DAFTAR'),
        );
    });

    it('listRegistrations returns empty when data null', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then(resolve: (v: any) => void) {
                resolve({ data: null, error: null });
            },
        });
        const rows = await svc.listRegistrations('pending');
        expect(rows).toEqual([]);
    });

    it('approve with empty store and no expires_at', async () => {
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) {
                    return {
                        data: {
                            ...pendingRow,
                            store_name: null,
                            expires_at: null as any,
                        },
                        error: null,
                    };
                }
                return {
                    data: {
                        ...pendingRow,
                        status: 'approved',
                        tenant_id: 'umkm-toko',
                        store_name: 'Toko UMKM',
                    },
                    error: null,
                };
            }),
        }));
        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
        expect(tenantProvisioning.provisionStore).toHaveBeenCalledWith(
            expect.objectContaining({
                storeDisplayName: 'Toko UMKM',
                source: 'wa_daftar',
            }),
        );
    });

    it('approve slugifies punctuation-only store to umkm-toko', async () => {
        whatsAppService.getConfig.mockResolvedValue(null);
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) {
                    return {
                        data: { ...pendingRow, store_name: '@@@!!!' },
                        error: null,
                    };
                }
                return {
                    data: {
                        ...pendingRow,
                        status: 'approved',
                        tenant_id: 'umkm-toko',
                    },
                    error: null,
                };
            }),
        }));
        await svc.approve('reg-1', 'admin-1');
        expect(tenantProvisioning.provisionStore).toHaveBeenCalledWith(
            expect.objectContaining({ preferredSlug: 'umkm-toko' }),
        );
    });

    it('reject skips WA for short phone', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi
                .fn()
                .mockResolvedValueOnce({
                    data: { ...pendingRow, phone: '12', status: 'draft' },
                    error: null,
                })
                .mockResolvedValueOnce({
                    data: { ...pendingRow, phone: '12', status: 'rejected' },
                    error: null,
                }),
        });
        const out = await svc.reject('reg-1', 'x');
        expect(out.status).toBe('rejected');
        expect(waTransport.sendText).not.toHaveBeenCalled();
    });

    it('notifyOwner uses stringified error when no message', async () => {
        waTransport.sendText.mockRejectedValue('plain-fail');
        let phase = 0;
        fromMock.mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => {
                phase += 1;
                if (phase === 1) return { data: pendingRow, error: null };
                return {
                    data: { ...pendingRow, status: 'approved', tenant_id: 't' },
                    error: null,
                };
            }),
        }));
        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
    });

    it('getById throws NotFound', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        await expect(svc.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reject notifies with reason', async () => {
        fromMock.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            maybeSingle: vi
                .fn()
                .mockResolvedValueOnce({ data: pendingRow, error: null })
                .mockResolvedValueOnce({
                    data: { ...pendingRow, status: 'rejected', reject_reason: 'dup' },
                    error: null,
                }),
        });
        const out = await svc.reject('reg-1', 'dup', 'admin-1');
        expect(out.status).toBe('rejected');
        expect(waTransport.sendText).toHaveBeenCalledWith(
            '6281234567890',
            expect.stringContaining('dup'),
        );
    });
});
