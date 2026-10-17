/**
 * Fase 2 — POST /internal/kasir-consult auth + flag gate.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import { InternalKasirConsultController } from './internal-kasir-consult.controller';
import { CONSULT_OFF_COPY } from './studio-umkm-pendamping.prompts';

describe('InternalKasirConsultController', () => {
    const pendamping = {
        consultFromNotebook: vi.fn(async () => ({
            status: 'hit' as const,
            text: 'Jawaban dari buku.',
            latencyMs: 12,
        })),
        coachFromOwnerPhone: vi.fn(async () => ({
            status: 'hit' as const,
            text: 'Coach gabungan.',
        })),
    };
    const kasirTasks = {
        begin: vi.fn(() => ({
            complete: vi.fn(),
        })),
    };
    const umkm = {
        resolveUmkmContextByOwnerPhone: vi.fn(async () => null),
    };
    const tenantAgentSettings = {
        findRecruitedAgentForAutoGate: vi.fn(async () => null),
        assertAutoWorkAllowed: vi.fn(async () => ({ allowed: true as const })),
    };
    const config = {
        get: vi.fn((key: string) => {
            if (key === 'KASIR_CONSULT_KEY') return 'secret-test';
            if (key === 'KASIR_CONSULT') return '1';
            return undefined;
        }),
    };
    let ctrl: InternalKasirConsultController;

    const makeCtrl = () =>
        new InternalKasirConsultController(
            pendamping as any,
            config as any,
            kasirTasks as any,
            umkm as any,
            tenantAgentSettings as any,
        );

    beforeEach(() => {
        vi.clearAllMocks();
        config.get.mockImplementation((key: string) => {
            if (key === 'KASIR_CONSULT_KEY') return 'secret-test';
            if (key === 'KASIR_CONSULT') return '1';
            return undefined;
        });
        umkm.resolveUmkmContextByOwnerPhone.mockResolvedValue(null);
        tenantAgentSettings.findRecruitedAgentForAutoGate.mockResolvedValue(null);
        tenantAgentSettings.assertAutoWorkAllowed.mockResolvedValue({ allowed: true });
        ctrl = makeCtrl();
        vi.spyOn(ctrl['logger'], 'log').mockImplementation(() => undefined);
        vi.spyOn(ctrl['logger'], 'warn').mockImplementation(() => undefined);
    });

    it('missing key → 401; service not called', async () => {
        await expect(ctrl.kasirConsult({ question: 'tanya modal' })).rejects.toBeInstanceOf(
            HttpException,
        );
        await expect(ctrl.kasirConsult({ question: 'tanya modal' })).rejects.toMatchObject({
            status: 401,
        });
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
    });

    it('wrong key → 401', async () => {
        await expect(
            ctrl.kasirConsult({ question: 'tanya' }, 'wrong'),
        ).rejects.toMatchObject({ status: 401 });
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
    });

    it('secret unset → 401 fail-closed', async () => {
        config.get.mockImplementation((key: string) => {
            if (key === 'KASIR_CONSULT') return '1';
            return undefined;
        });
        ctrl = makeCtrl();
        vi.spyOn(ctrl['logger'], 'warn').mockImplementation(() => undefined);
        await expect(
            ctrl.kasirConsult({ question: 'tanya' }, 'secret-test'),
        ).rejects.toMatchObject({ status: 401 });
    });

    it('KASIR_CONSULT=0 → off copy; service not called', async () => {
        config.get.mockImplementation((key: string) => {
            if (key === 'KASIR_CONSULT_KEY') return 'secret-test';
            if (key === 'KASIR_CONSULT') return '0';
            return undefined;
        });
        ctrl = makeCtrl();
        vi.spyOn(ctrl['logger'], 'log').mockImplementation(() => undefined);
        const res = await ctrl.kasirConsult({ question: 'tanya modal' }, 'secret-test');
        expect(res).toEqual({ status: 'off', text: CONSULT_OFF_COPY });
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
    });

    it('flag on + valid key → consultFromNotebook', async () => {
        const res = await ctrl.kasirConsult(
            { question: 'gimana atur modal' },
            'secret-test',
        );
        expect(pendamping.consultFromNotebook).toHaveBeenCalledWith(
            'gimana atur modal',
            undefined,
            { phone: undefined },
        );
        expect(res).toEqual({ status: 'hit', text: 'Jawaban dari buku.' });
    });

    it('forwards optional phone for metrics inject', async () => {
        umkm.resolveUmkmContextByOwnerPhone.mockResolvedValue({ tenantId: 'tenant-1' });
        await ctrl.kasirConsult(
            { question: 'tanya modal', phone: '6281111111111' },
            'secret-test',
        );
        expect(pendamping.consultFromNotebook).toHaveBeenCalledWith(
            'tanya modal',
            undefined,
            { phone: '6281111111111' },
        );
    });

    it('empty question → 400', async () => {
        await expect(
            ctrl.kasirConsult({ question: '   ' }, 'secret-test'),
        ).rejects.toMatchObject({ status: 400 });
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
    });

    it('missing question body → 400', async () => {
        await expect(ctrl.kasirConsult({}, 'secret-test')).rejects.toMatchObject({
            status: 400,
        });
    });

    it('mode=coach without phone → 400', async () => {
        await expect(
            ctrl.kasirConsult({ question: 'pendamping', mode: 'coach' }, 'secret-test'),
        ).rejects.toMatchObject({ status: 400 });
        expect(pendamping.coachFromOwnerPhone).not.toHaveBeenCalled();
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
    });

    it('mode=coach → coachFromOwnerPhone', async () => {
        umkm.resolveUmkmContextByOwnerPhone.mockResolvedValue({ tenantId: 'tenant-1' });
        const res = await ctrl.kasirConsult(
            { question: 'pendamping', mode: 'coach', phone: '6281111111111' },
            'secret-test',
        );
        expect(pendamping.coachFromOwnerPhone).toHaveBeenCalledWith({
            phone: '6281111111111',
            aliasText: 'pendamping',
        });
        expect(pendamping.consultFromNotebook).not.toHaveBeenCalled();
        expect(res).toEqual({ status: 'hit', text: 'Coach gabungan.' });
    });

    it('kasir queue mirror failure does not break consult response', async () => {
        kasirTasks.begin.mockImplementation(() => {
            throw new Error('queue unavailable');
        });
        const resOffQueue = await ctrl.kasirConsult({ question: 'tanya modal' }, 'secret-test');
        expect(resOffQueue).toEqual({ status: 'hit', text: 'Jawaban dari buku.' });

        kasirTasks.begin.mockImplementation(() => ({
            complete: vi.fn(() => {
                throw new Error('persist failed');
            }),
        }));
        const res = await ctrl.kasirConsult({ question: 'tanya modal' }, 'secret-test');
        expect(res).toEqual({ status: 'hit', text: 'Jawaban dari buku.' });
    });

    it('records AOS mirror on successful consult', async () => {
        const complete = vi.fn();
        kasirTasks.begin.mockReturnValue({ complete });
        await ctrl.kasirConsult({ question: 'tanya modal' }, 'secret-test');
        expect(kasirTasks.begin).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'consult', questionChars: 11 }),
        );
        expect(complete).toHaveBeenCalledWith('hit');
    });

    it('KASIR_CONSULT=0 still blocks coach mode', async () => {
        config.get.mockImplementation((key: string) => {
            if (key === 'KASIR_CONSULT_KEY') return 'secret-test';
            if (key === 'KASIR_CONSULT') return '0';
            return undefined;
        });
        ctrl = makeCtrl();
        umkm.resolveUmkmContextByOwnerPhone.mockResolvedValue({ tenantId: 'tenant-1' });
        vi.spyOn(ctrl['logger'], 'log').mockImplementation(() => undefined);
        const res = await ctrl.kasirConsult(
            { question: 'pendamping', mode: 'coach', phone: '6281' },
            'secret-test',
        );
        expect(res).toEqual({ status: 'off', text: CONSULT_OFF_COPY });
        expect(pendamping.coachFromOwnerPhone).not.toHaveBeenCalled();
    });
});
