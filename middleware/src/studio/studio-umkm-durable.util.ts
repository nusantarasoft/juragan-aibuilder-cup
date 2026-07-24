/**
 * Serialize/deserialize durable UMKM session wizards (hubs, slot-fill, soft-confirm).
 */
import type { SaleDraft } from './studio-umkm-confirm.util';
import type { PurchaseDraft } from './studio-umkm-purchase-slots.util';

export type UmkmWizardKind =
    | 'menu_hub'
    | 'purchase_hub'
    | 'report_hub'
    | 'await_add_product'
    | 'await_add_stock'
    | 'await_purchase'
    | 'await_sale_slots'
    | 'await_stock_scope'
    | 'await_report_period';

export type UmkmWizard =
    | { kind: 'menu_hub'; createdAt: number }
    | { kind: 'purchase_hub'; createdAt: number }
    | { kind: 'report_hub'; createdAt: number }
    | {
          kind: 'await_add_product';
          createdAt: number;
          draft?: { name: string; costPrice?: number };
      }
    | { kind: 'await_add_stock'; createdAt: number }
    | { kind: 'await_purchase'; createdAt: number; draft?: PurchaseDraft }
    | { kind: 'await_sale_slots'; draft: SaleDraft; createdAt: number }
    | { kind: 'await_stock_scope'; createdAt: number }
    | { kind: 'await_report_period'; createdAt: number };

const WIZARD_KINDS = new Set<string>([
    'menu_hub',
    'purchase_hub',
    'report_hub',
    'await_add_product',
    'await_add_stock',
    'await_purchase',
    'await_sale_slots',
    'await_stock_scope',
    'await_report_period',
]);

export function serializeWizardPayload(wizard: UmkmWizard): Record<string, unknown> {
    if (wizard.kind === 'await_sale_slots') {
        return { draft: wizard.draft };
    }
    if (wizard.kind === 'await_add_product' && wizard.draft) {
        return { draft: wizard.draft };
    }
    if (wizard.kind === 'await_purchase' && wizard.draft) {
        return { draft: wizard.draft };
    }
    return {};
}

export function deserializeWizard(
    kind: string,
    payload: unknown,
    createdAt: number,
): UmkmWizard | null {
    if (!WIZARD_KINDS.has(kind)) return null;
    if (kind === 'await_sale_slots') {
        const draft = (payload as { draft?: SaleDraft } | null)?.draft;
        if (!draft || !Array.isArray(draft.items)) {
            return { kind: 'await_sale_slots', draft: { items: [], totalAmount: 0 }, createdAt };
        }
        return { kind: 'await_sale_slots', draft, createdAt };
    }
    if (kind === 'await_add_product') {
        const draft = (payload as { draft?: { name: string; costPrice?: number } } | null)?.draft;
        if (draft?.name) {
            return {
                kind: 'await_add_product',
                createdAt,
                draft: { name: String(draft.name), costPrice: draft.costPrice },
            };
        }
        return { kind: 'await_add_product', createdAt };
    }
    if (kind === 'await_purchase') {
        const draft = (payload as { draft?: PurchaseDraft } | null)?.draft;
        if (draft && Array.isArray(draft.items)) {
            return { kind: 'await_purchase', createdAt, draft };
        }
        return { kind: 'await_purchase', createdAt };
    }
    return {
        kind: kind as Exclude<
            UmkmWizardKind,
            'await_sale_slots' | 'await_add_product' | 'await_purchase'
        >,
        createdAt,
    };
}

export function isConversationalWizard(kind: UmkmWizard['kind']): boolean {
    return (
        kind === 'await_sale_slots' ||
        kind === 'await_stock_scope' ||
        kind === 'await_report_period' ||
        kind === 'await_add_product' ||
        kind === 'await_purchase'
    );
}
