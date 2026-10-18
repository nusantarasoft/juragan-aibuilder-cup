import { describe, expect, it } from 'vitest';
import {
    STUDIO_WA_HUMAN_REPLY_SUFFIX,
    formatStudioWaHumanOutboundText,
} from './studio-wa-human-reply.util';

describe('formatStudioWaHumanOutboundText', () => {
    it('appends Admin Nusantarasoft suffix', () => {
        expect(formatStudioWaHumanOutboundText('Halo Pak')).toBe(
            `Halo Pak${STUDIO_WA_HUMAN_REPLY_SUFFIX}`,
        );
    });

    it('does not double-append when suffix already present', () => {
        const once = formatStudioWaHumanOutboundText('Ok');
        expect(formatStudioWaHumanOutboundText(once)).toBe(once);
    });

    it('returns empty for whitespace-only input', () => {
        expect(formatStudioWaHumanOutboundText('   ')).toBe('');
    });
});
