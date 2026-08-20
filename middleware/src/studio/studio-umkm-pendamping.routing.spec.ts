/**
 * Pendamping util + help + sticky regressions (complements scenario + service goldens).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import {
    detectUmkmIntent,
    formatUmkmHelp,
    isUmkmIntakeClearJob,
    isUmkmPendampingExactAlias,
    looksLikeUmkmOpenQuestion,
    normalizeUmkmPendampingAlias,
} from './studio-umkm.util';
import { makeUmkmService } from './studio-umkm-test-harness';

describe('isUmkmPendampingExactAlias', () => {
    it('normalizes trim/case/space/trailing punctuation', () => {
        expect(normalizeUmkmPendampingAlias('  Saran   Bisnis!! ')).toBe('saran bisnis');
        expect(isUmkmPendampingExactAlias('pendamping')).toBe(true);
        expect(isUmkmPendampingExactAlias('Saran Bisnis')).toBe(true);
        expect(isUmkmPendampingExactAlias('pendamping bisnis.')).toBe(true);
        expect(isUmkmPendampingExactAlias('tips naikin omzet')).toBe(false);
        expect(isUmkmPendampingExactAlias('saran bisnis dong')).toBe(false);
    });

    it('excludes aliases from open-question and clear-job', () => {
        expect(looksLikeUmkmOpenQuestion('saran bisnis')).toBe(false);
        expect(looksLikeUmkmOpenQuestion('tips tingkatkan omzet toko')).toBe(true);
        expect(isUmkmIntakeClearJob('saran bisnis')).toBe(false);
        expect(isUmkmIntakeClearJob('pendamping')).toBe(false);
        expect(isUmkmIntakeClearJob('jual 2 indomie')).toBe(true);
        expect(detectUmkmIntent('tips tingkatkan omzet toko')).toBe('ask');
        expect(detectUmkmIntent('saran bisnis')).not.toBe('ask');
    });
});

describe('pendamping help + sticky', () => {
    it('help includes one pendamping line', () => {
        const help = formatUmkmHelp();
        expect(help).toMatch(/ketik \*pendamping\* untuk saran bisnis/i);
        expect((help.match(/pendamping/gi) || []).length).toBe(1);
    });

    it('CRITICAL: pending sale × pendamping → sticky, not coach', async () => {
        const { svc, pendamping } = makeUmkmService();
        await svc.handleMessage('jual 1 bakso', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'st-pd',
        });
        pendamping.coach.mockClear();
        const sticky = await svc.handleMessage('pendamping', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'st-pd',
        });
        expect(sticky).toMatch(/draft penjualan|konfirmasi/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });
});
