import { describe, expect, it } from 'vitest';
import {
    deserializeWizard,
    isConversationalWizard,
    serializeWizardPayload,
} from './studio-umkm-durable.util';

describe('studio-umkm-durable.util', () => {
    it('round-trips hub wizard', () => {
        const w = { kind: 'menu_hub' as const, createdAt: 100 };
        expect(serializeWizardPayload(w)).toEqual({});
        expect(deserializeWizard('menu_hub', {}, 100)).toEqual(w);
    });

    it('round-trips sale slot draft', () => {
        const w = {
            kind: 'await_sale_slots' as const,
            draft: { items: [{ name: 'Bakso', quantity: 2, unitPrice: 0 }], totalAmount: 0 },
            createdAt: 200,
        };
        const payload = serializeWizardPayload(w);
        expect(payload.draft).toEqual(w.draft);
        expect(deserializeWizard('await_sale_slots', payload, 200)).toEqual(w);
    });

    it('rejects unknown kind; empty draft fallback', () => {
        expect(deserializeWizard('nope', {}, 1)).toBeNull();
        const empty = deserializeWizard('await_sale_slots', {}, 1);
        expect(empty?.kind).toBe('await_sale_slots');
        if (empty?.kind === 'await_sale_slots') expect(empty.draft.items).toEqual([]);
    });

    it('conversational wizard kinds', () => {
        expect(isConversationalWizard('await_sale_slots')).toBe(true);
        expect(isConversationalWizard('await_add_product')).toBe(true);
        expect(isConversationalWizard('await_purchase')).toBe(true);
        expect(isConversationalWizard('menu_hub')).toBe(false);
    });

    it('round-trips add-product draft (name awaiting price)', () => {
        const w = {
            kind: 'await_add_product' as const,
            createdAt: 300,
            draft: { name: 'Bakso', costPrice: 10000 },
        };
        const payload = serializeWizardPayload(w);
        expect(payload.draft).toEqual(w.draft);
        expect(deserializeWizard('await_add_product', payload, 300)).toEqual(w);
        expect(deserializeWizard('await_add_product', {}, 300)).toEqual({
            kind: 'await_add_product',
            createdAt: 300,
        });
    });
});
