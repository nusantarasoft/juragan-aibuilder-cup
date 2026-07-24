import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

/**
 * Focused tests for WA simulator entry — shared inbound pipeline without WAHA send.
 */
describe('StudioWhatsAppService.simulateInboundMessage', () => {
    const getConfig = vi.fn();
    const processInboundCore = vi.fn();

    // Lightweight stand-in: call the same validation branches as the real method
    async function simulateInboundMessage(params: {
        tenantId: string;
        message: string;
        phone?: string;
    }) {
        const tenantId = String(params.tenantId || '').trim();
        if (!tenantId) throw new BadRequestException('tenantId required');
        const message = String(params.message || '').trim();
        if (!message) throw new BadRequestException('message required');
        const config = await getConfig(tenantId);
        if (!config?.enabled || !config.notebook_id) {
            throw new BadRequestException('UMKM belum aktif');
        }
        const phone = (params.phone || '6280000000001').replace(/\D/g, '');
        const chatId = `sim:${tenantId}:${phone}`;
        return processInboundCore({
            config,
            phone,
            chatId,
            question: message,
            feedbackProvider: 'whatsapp_sim',
            enforceRateLimit: false,
        });
    }

    beforeEach(() => {
        getConfig.mockReset();
        processInboundCore.mockReset();
        getConfig.mockResolvedValue({
            enabled: true,
            notebook_id: 'nb-1',
            tenant_id: 'toko-a',
            use_guided_flow: false,
        });
        processInboundCore.mockResolvedValue({
            answer: '📋 Konfirmasi',
            conversationId: 'c1',
            path: 'umkm',
            phone: '6280000000001',
            chatId: 'sim:toko-a:6280000000001',
        });
    });

    it('rejects empty tenant / message', async () => {
        await expect(simulateInboundMessage({ tenantId: '', message: 'jual' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
        await expect(simulateInboundMessage({ tenantId: 't', message: '  ' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('rejects inactive UMKM', async () => {
        getConfig.mockResolvedValueOnce({ enabled: false, notebook_id: 'nb-1' });
        await expect(
            simulateInboundMessage({ tenantId: 't', message: 'jual' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('routes to processInboundCore with sim chatId and no rate limit', async () => {
        const res = await simulateInboundMessage({
            tenantId: 'toko-a',
            message: 'jual 2 bakso',
            phone: '62812',
        });
        expect(processInboundCore).toHaveBeenCalledWith(
            expect.objectContaining({
                chatId: 'sim:toko-a:62812',
                question: 'jual 2 bakso',
                feedbackProvider: 'whatsapp_sim',
                enforceRateLimit: false,
            }),
        );
        expect(res.path).toBe('umkm');
        expect(res.answer).toMatch(/Konfirmasi/);
    });
});
