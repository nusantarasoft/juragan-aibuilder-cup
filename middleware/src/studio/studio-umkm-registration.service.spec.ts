import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StudioUmkmRegistrationService } from './studio-umkm-registration.service';

describe('StudioUmkmRegistrationService', () => {
    let fromMock: ReturnType<typeof vi.fn>;
    let svc: StudioUmkmRegistrationService;
    let studioService: any;
    let umkmService: any;
    let whatsAppService: any;
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
        expires_at: '2026-09-19T00:00:00Z',
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
            getConfig: vi.fn().mockResolvedValue(null),
            updateConfig: vi.fn().mockResolvedValue({ tenant_id: 'umkm-warung-bu-ani' }),
        };
        waTransport = {
            sendText: vi.fn().mockResolvedValue({ success: true }),
        };
        svc = new StudioUmkmRegistrationService(
            { getAdminClient: () => ({ from: fromMock }) } as any,
            studioService,
            umkmService,
            whatsAppService,
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

        const out = await svc.approve('reg-1', 'admin-1');
        expect(out.status).toBe('approved');
        expect(studioService.createNotebook).toHaveBeenCalled();
        expect(umkmService.setupUmkmNotebook).toHaveBeenCalledWith('nb-new', 'umkm-warung-bu-ani');
        expect(whatsAppService.updateConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                enabled: true,
                businessPhone: '6281234567890',
                allowlistPhones: ['6281234567890'],
                sessionName: 'default',
            }),
            'umkm-warung-bu-ani',
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
