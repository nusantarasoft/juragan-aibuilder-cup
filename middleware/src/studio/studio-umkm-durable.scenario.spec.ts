/**
 * Durable session: purchase pending + wizards survive memory clear (restart simulation).
 */
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { StudioUmkmService } from './studio-umkm.service';
import { emptySaleDraft } from './studio-umkm-confirm.util';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

function makeDurableHarness() {
    const purchaseRows: any[] = [];
    const wizardRows: any[] = [];
    const saleRows: any[] = [];

    const chainFor = (store: any[], table: string) => {
        const state: any = { filters: {} as Record<string, unknown>, op: 'select' };
        const api: any = {
            select: vi.fn(() => api),
            insert: vi.fn((row: any) => {
                const id = `${table}-${store.length + 1}`;
                const full = {
                    id,
                    ...row,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                store.push(full);
                state.lastInsert = full;
                return api;
            }),
            update: vi.fn((patch: any) => {
                state.patch = patch;
                state.op = 'update';
                return api;
            }),
            eq: vi.fn((k: string, v: unknown) => {
                state.filters[k] = v;
                return api;
            }),
            gt: vi.fn(() => api),
            lt: vi.fn(() => api),
            order: vi.fn(() => api),
            limit: vi.fn(() => api),
            single: vi.fn(async () => ({ data: state.lastInsert || store[0] || null, error: null })),
            then: (resolve: (v: unknown) => unknown) => {
                if (state.op === 'update') {
                    for (const row of store) {
                        let ok = true;
                        for (const [k, v] of Object.entries(state.filters)) {
                            if (row[k] !== v && !(k === 'status' && row.status === v)) {
                                // status filter for active/pending
                            }
                            if (row[k] !== v) ok = false;
                        }
                        if (ok || Object.keys(state.filters).length) {
                            // apply patch to matching pending/active
                            const statusFilter = state.filters.status;
                            if (!statusFilter || row.status === statusFilter) {
                                if (
                                    (!state.filters.conversation_id ||
                                        row.conversation_id === state.filters.conversation_id) &&
                                    (!state.filters.phone || row.phone === state.filters.phone) &&
                                    (!state.filters.tenant_id || row.tenant_id === state.filters.tenant_id)
                                ) {
                                    Object.assign(row, state.patch);
                                }
                            }
                        }
                    }
                    return resolve({ data: null, error: null, count: 1 });
                }
                const status = state.filters.status;
                const matches = store.filter((r) => {
                    if (status && r.status !== status) return false;
                    if (state.filters.conversation_id && r.conversation_id !== state.filters.conversation_id)
                        return false;
                    if (state.filters.phone && r.phone !== state.filters.phone) return false;
                    if (state.filters.tenant_id && r.tenant_id !== state.filters.tenant_id) return false;
                    return true;
                });
                return resolve({ data: matches, error: null });
            },
        };
        return api;
    };

    const supabase = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (table === 'studio_umkm_pending_purchases') return chainFor(purchaseRows, 'pur');
                if (table === 'studio_umkm_session_wizards') return chainFor(wizardRows, 'wiz');
                if (table === 'studio_umkm_pending_sales') return chainFor(saleRows, 'sale');
                // minimal stubs for other tables
                const b: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    insert: vi.fn().mockReturnThis(),
                    update: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }),
                    then: (r: (v: unknown) => unknown) => r({ data: [], error: null }),
                };
                for (const k of ['select', 'eq', 'order', 'gte', 'lte', 'limit', 'gt', 'in']) {
                    b[k] = vi.fn().mockReturnValue(b);
                }
                return b;
            },
        }),
    };
    const ai = { generateText: vi.fn(async () => '') };
    const inventory = {
        createItem: vi.fn(),
        createStockMovement: vi.fn(),
    };
    const svc = new StudioUmkmService(supabase as any, ai as any, inventory as any, {
        coach: vi.fn(async () => 'Pendamping stub'),
    } as any);
    return { svc, purchaseRows, wizardRows, saleRows };
}

describe('Durable UMKM session', () => {
    it('wizard survives memory clear (restart)', async () => {
        const { svc, wizardRows } = makeDurableHarness();
        svc.openMenuHub('t', '6281', 'conv-1');
        await new Promise((r) => setTimeout(r, 20));
        expect(wizardRows.some((w) => w.kind === 'menu_hub' && w.status === 'active')).toBe(true);

        // simulate process restart
        (svc as any).wizardByChat.clear();
        const loaded = await svc.resolveWizard('t', '6281', 'conv-1');
        expect(loaded?.kind).toBe('menu_hub');
    });

    it('sale slot wizard draft survives restart', async () => {
        const { svc, wizardRows } = makeDurableHarness();
        svc.startSaleSlotFill(
            't',
            { ...emptySaleDraft(), items: [{ name: 'Bakso', quantity: 0, unitPrice: 0 }] },
            '6281',
            'conv-2',
        );
        await new Promise((r) => setTimeout(r, 20));
        expect(wizardRows.some((w) => w.kind === 'await_sale_slots')).toBe(true);

        (svc as any).wizardByChat.clear();
        const loaded = await svc.resolveWizard('t', '6281', 'conv-2');
        expect(loaded?.kind).toBe('await_sale_slots');
        if (loaded?.kind === 'await_sale_slots') {
            expect(loaded.draft.items[0].name).toBe('Bakso');
        }
    });

    it('purchase pending survives memory clear', async () => {
        const { svc, purchaseRows } = makeDurableHarness();
        const pending = {
            purchase: {
                items: [{ name: 'Mie', quantity: 2, unitCost: 5000 }],
                totalCost: 10000,
                purchaseDate: '2026-07-24',
            },
            resolved: [
                {
                    name: 'Mie',
                    quantity: 2,
                    unitCost: 5000,
                    itemId: 'p1',
                    catalogMatched: true,
                },
            ],
            createdAt: Date.now(),
        };
        (svc as any).setPendingPurchase('t', pending, '6281', 'conv-3');
        await new Promise((r) => setTimeout(r, 30));
        expect(purchaseRows.length).toBeGreaterThan(0);

        (svc as any).pendingPurchaseByChat.clear();
        const loaded = await svc.resolvePendingPurchase({
            tenantId: 't',
            phone: '6281',
            conversationId: 'conv-3',
        });
        expect(loaded?.purchase.totalCost).toBe(10000);
        expect(loaded?.pendingId).toBeTruthy();
    });

    it('continueWizard works after memory wipe via durable load', async () => {
        const { svc } = makeDurableHarness();
        svc.openReportHub('t', undefined, 'conv-4');
        await new Promise((r) => setTimeout(r, 20));
        (svc as any).wizardByChat.clear();
        const reply = await svc.continueWizard('hari ini', 't', undefined, 'conv-4', cfg);
        expect(reply).toMatch(/Laporan/i);
    });
});
